import { Router } from 'express';
import { getUserFromJwt, getOwnProfile } from '../lib/supabase.js';
import { createBasket, addPackageToBasket, getBasketAuthLinks, getBasket } from '../lib/tebex.js';

export const tebexRouter = Router();

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function normalizeOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || '';
}

function truncateText(value, maxLength = 450) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function safeJsonStringify(value, maxLength = 450) {
  if (value === null || value === undefined) return '';
  try {
    return truncateText(JSON.stringify(value), maxLength);
  } catch {
    return truncateText(String(value), maxLength);
  }
}

function getClientIPv4(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const candidate = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.ip || '').split(',')[0].trim();
  const cleaned = candidate.replace('::ffff:', '');

  if (/^\d+\.\d+\.\d+\.\d+$/.test(cleaned)) return cleaned;
  if (cleaned === '::1' || cleaned === '127.0.0.1' || cleaned === '') return '127.0.0.1';
  return '127.0.0.1';
}

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) {
    const error = new Error('Warenkorb leer.');
    error.statusCode = 400;
    error.publicMessage = 'Warenkorb leer.';
    throw error;
  }

  return items.map((item) => {
    const packageId = String(item?.packageId || '').trim();
    const name = String(item?.name || '').trim();
    const quantity = Number.parseInt(String(item?.quantity || '1'), 10);

    if (!packageId || !name || !Number.isFinite(quantity) || quantity < 1) {
      const error = new Error('Ungültiger Warenkorb-Eintrag.');
      error.statusCode = 400;
      error.publicMessage = 'Ungültiger Warenkorb-Eintrag.';
      throw error;
    }

    return {
      packageId,
      name,
      quantity,
    };
  });
}

function extractDiscordUserId(authUser) {
  const directCandidates = [
    authUser?.user_metadata?.discord_id,
    authUser?.user_metadata?.provider_id,
    authUser?.app_metadata?.discord_id,
    authUser?.app_metadata?.provider_id,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeOptionalString(candidate);
    if (normalized) return normalized;
  }

  const identities = Array.isArray(authUser?.identities) ? authUser.identities : [];
  for (const identity of identities) {
    const provider = normalizeOptionalString(identity?.provider).toLowerCase();
    if (provider !== 'discord') continue;

    const identityCandidates = [
      identity?.provider_id,
      identity?.identity_data?.provider_id,
      identity?.identity_data?.user_id,
      identity?.identity_data?.sub,
      identity?.user_id,
      identity?.id,
    ];

    for (const candidate of identityCandidates) {
      const normalized = normalizeOptionalString(candidate);
      if (normalized) return normalized;
    }
  }

  return '';
}

async function resolveCheckoutContext(req, { requireItems = true, requireBasketIdent = false } = {}) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    const error = new Error('Fehlender Login-Token.');
    error.statusCode = 401;
    error.publicMessage = 'Bitte zuerst einloggen.';
    throw error;
  }

  const authUser = await getUserFromJwt(jwt);
  const profile = await getOwnProfile(jwt, authUser.id);
  const completeUrl = String(req.body?.completeUrl || process.env.APP_COMPLETE_URL || '').trim();
  const cancelUrl = String(req.body?.cancelUrl || process.env.APP_CANCEL_URL || '').trim();

  if (!completeUrl || !cancelUrl) {
    const error = new Error('Fehlende Redirect-URLs.');
    error.statusCode = 500;
    error.publicMessage = 'Checkout-URLs sind nicht gesetzt.';
    throw error;
  }

  const basketIdent = String(req.body?.basketIdent || '').trim();
  if (requireBasketIdent && !basketIdent) {
    const error = new Error('Basket-ID fehlt.');
    error.statusCode = 400;
    error.publicMessage = 'Basket-ID fehlt.';
    throw error;
  }

  const items = requireItems ? normalizeItems(req.body?.items) : [];
  const role = String(profile?.role || 'customer').trim().toLowerCase();
  const discordUserId = extractDiscordUserId(authUser);
  const custom = {
    supabase_user_id: authUser.id,
    email: profile?.email || authUser?.email || '',
    username: profile?.username || authUser?.email?.split('@')[0] || 'User',
    discord_name: profile?.discord_name || authUser?.user_metadata?.discord_name || '',
    discord_id: discordUserId,
    cfx_identifier: profile?.cfx_identifier || '',
    app_role: role,
    source: 'hammer-modding-website',
  };

  return {
    authUser,
    profile,
    items,
    basketIdent,
    completeUrl,
    cancelUrl,
    custom,
    discordUserId,
    ipAddress: getClientIPv4(req),
  };
}

function buildAuthReturnUrl(baseUrl, basketIdent) {
  const url = new URL(baseUrl);
  url.hash = '';
  url.searchParams.set('hm_tebex_auth', '1');
  url.searchParams.set('basket', basketIdent);
  return url.toString();
}

function pickPreferredAuthLink(authLinks = []) {
  if (!Array.isArray(authLinks) || !authLinks.length) return null;
  return authLinks.find((entry) => /fivem/i.test(String(entry?.name || ''))) || authLinks[0] || null;
}

function getBasketUsernameId(basketData) {
  return basketData?.username_id || basketData?.data?.username_id || null;
}

function buildVariableDataCandidates({ basketUsernameId, discordUserId }) {
  const username = normalizeOptionalString(basketUsernameId);
  const discordId = normalizeOptionalString(discordUserId);

  const candidates = [
    discordId ? { discord_id: discordId } : null,
    discordId && username ? { discord_id: discordId, username_id: username } : null,
    username ? { username_id: username } : null,
    null,
  ];

  const seen = new Set();
  return candidates.filter((candidate) => {
    const signature = candidate ? JSON.stringify(candidate) : 'null';
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function isPackageRetryWorthyError(error) {
  const detail = `${error?.message || ''} ${error?.publicMessage || ''} ${safeJsonStringify(error?.tebexJson || '')}`.toLowerCase();
  return (
    detail.includes('invalid options')
    || detail.includes('invalid option')
    || detail.includes('username_id')
    || detail.includes('discord_id')
    || detail.includes('option')
    || detail.includes('quantity cannot be greater than 1')
    || detail.includes('while processing your request')
    || detail.includes('error while processing your request')
  );
}

function isQuantityLimitError(error) {
  const detail = `${error?.message || ''} ${error?.publicMessage || ''}`.toLowerCase();
  return detail.includes('quantity cannot be greater than 1');
}

function addPackageQuantity(bucket, packageId, quantity = 1) {
  const normalizedPackageId = normalizeOptionalString(packageId);
  if (!normalizedPackageId) return;
  const normalizedQuantity = Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : 1;
  bucket.set(normalizedPackageId, (bucket.get(normalizedPackageId) || 0) + normalizedQuantity);
}

function extractBasketPackageQuantities(basketData) {
  const quantities = new Map();
  const seen = new WeakSet();

  function visit(node, parentKey = '') {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry, parentKey));
      return;
    }

    const directPackageId = normalizeOptionalString(node.package_id || node.packageId);
    const nestedPackageId = normalizeOptionalString(
      node.package?.id
      || node.package?.package_id
      || node.package?.packageId,
    );
    const parentLooksPackageLike = String(parentKey || '').toLowerCase().includes('package');
    const fallbackPackageId = parentLooksPackageLike ? normalizeOptionalString(node.id) : '';
    const quantity = Number.isFinite(Number(node.quantity)) && Number(node.quantity) > 0 ? Number(node.quantity) : 1;

    addPackageQuantity(quantities, directPackageId, quantity);
    addPackageQuantity(quantities, nestedPackageId, quantity);
    addPackageQuantity(quantities, fallbackPackageId, quantity);

    Object.entries(node).forEach(([key, value]) => {
      visit(value, key);
    });
  }

  visit(basketData);
  return quantities;
}

function basketHasRequiredPackageQuantity(packageQuantities, item) {
  if (!(packageQuantities instanceof Map)) return false;
  const packageId = normalizeOptionalString(item?.packageId);
  if (!packageId) return false;
  const requiredQuantity = Number.isFinite(Number(item?.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1;
  return (packageQuantities.get(packageId) || 0) >= requiredQuantity;
}

async function refreshBasketPackageQuantities(basketIdent) {
  try {
    const refreshedBasketResponse = await getBasket({ basketIdent });
    const refreshedBasket = refreshedBasketResponse?.data || refreshedBasketResponse || null;
    return {
      basket: refreshedBasket,
      packageQuantities: extractBasketPackageQuantities(refreshedBasket),
    };
  } catch (_error) {
    return {
      basket: null,
      packageQuantities: new Map(),
    };
  }
}

function formatVariableCandidate(candidate) {
  return candidate ? safeJsonStringify(candidate, 180) : 'ohne variable_data';
}

function formatTebexAttemptError(error) {
  const status = normalizeOptionalString(error?.tebexStatus || error?.statusCode || '');
  const detail = truncateText(error?.tebexDetail || error?.message || error?.publicMessage || 'Unbekannter Tebex-Fehler', 260);
  const tebexBody = error?.tebexJson ? safeJsonStringify(error.tebexJson, 420) : truncateText(error?.tebexRawText || '', 420);

  if (status && tebexBody && tebexBody !== detail) {
    return `HTTP ${status}: ${detail} | Tebex: ${tebexBody}`;
  }

  if (status) {
    return `HTTP ${status}: ${detail}`;
  }

  if (tebexBody && tebexBody !== detail) {
    return `${detail} | Tebex: ${tebexBody}`;
  }

  return detail;
}

function createPackageFinalizeError(error, { item, discordUserId, attemptedResults, actualAttempts }) {
  const detail = String(error?.message || error?.publicMessage || 'Tebex-Paket konnte nicht hinzugefügt werden.').trim();
  const infoLines = [];

  if (discordUserId) {
    infoLines.push(`Discord-ID ${discordUserId} wurde geprüft.`);
  }

  if (attemptedResults.length) {
    const tests = attemptedResults.map((result) => `${formatVariableCandidate(result.candidate)} => ${result.summary}`);
    infoLines.push(`Tests:\n- ${tests.join('\n- ')}`);
  }

  const wrapped = new Error(detail);
  wrapped.statusCode = error?.statusCode || 502;
  wrapped.publicMessage = `Checkout für "${item?.name || 'Paket'}" (Paket-ID ${item?.packageId || '-'}) fehlgeschlagen: ${detail}. ${infoLines.join(' ')}`.trim();
  wrapped.debug = {
    packageId: item?.packageId || '',
    discordUserId,
    actualAttempts,
    attemptedResults,
  };
  return wrapped;
}

async function addPackageToBasketWithSmartRetry({ basketIdent, item, context, basketUsernameId, knownPackageQuantities = new Map() }) {
  const variableCandidates = buildVariableDataCandidates({
    basketUsernameId,
    discordUserId: context.discordUserId,
  });

  if (basketHasRequiredPackageQuantity(knownPackageQuantities, item)) {
    return {
      ok: true,
      skipped: true,
      reason: 'already-in-basket',
      packageId: item.packageId,
    };
  }

  let lastError = null;
  let actualAttempts = 0;
  const attemptedResults = [];

  for (const variableData of variableCandidates) {
    actualAttempts += 1;
    try {
      const response = await addPackageToBasket({
        basketIdent,
        packageId: item.packageId,
        quantity: item.quantity,
        variableData,
        custom: {
          ...context.custom,
          product_name: item.name,
          package_id: item.packageId,
        },
      });
      addPackageQuantity(knownPackageQuantities, item.packageId, item.quantity);
      return response;
    } catch (error) {
      lastError = error;
      attemptedResults.push({
        candidate: variableData || null,
        summary: formatTebexAttemptError(error),
      });

      if (isQuantityLimitError(error)) {
        const refreshed = await refreshBasketPackageQuantities(basketIdent);
        if (basketHasRequiredPackageQuantity(refreshed.packageQuantities, item)) {
          addPackageQuantity(knownPackageQuantities, item.packageId, item.quantity);
          return {
            ok: true,
            skipped: true,
            reason: 'quantity-already-satisfied',
            packageId: item.packageId,
          };
        }
      }

      if (!isPackageRetryWorthyError(error)) {
        throw createPackageFinalizeError(error, {
          item,
          discordUserId: context.discordUserId,
          attemptedResults,
          actualAttempts,
        });
      }
    }
  }

  throw createPackageFinalizeError(lastError, {
    item,
    discordUserId: context.discordUserId,
    attemptedResults,
    actualAttempts,
  });
}

tebexRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tebex-route' });
});

tebexRouter.post('/checkout/start', async (req, res, next) => {
  try {
    const context = await resolveCheckoutContext(req, { requireItems: true, requireBasketIdent: false });

    const basketResponse = await createBasket({
      completeUrl: context.completeUrl,
      cancelUrl: context.cancelUrl,
      custom: context.custom,
      ipAddress: context.ipAddress,
    });

    const basket = basketResponse?.data;
    if (!basket?.ident) {
      const error = new Error('Basket konnte nicht erstellt werden.');
      error.statusCode = 502;
      error.publicMessage = 'Tebex-Basket konnte nicht erstellt werden.';
      throw error;
    }

    const authReturnUrl = buildAuthReturnUrl(context.completeUrl, basket.ident);
    let authLinks = [];
    try {
      const authResponse = await getBasketAuthLinks({
        basketIdent: basket.ident,
        returnUrl: authReturnUrl,
      });
      authLinks = Array.isArray(authResponse) ? authResponse : authResponse?.data || [];
    } catch (_error) {
      authLinks = [];
    }

    const preferredAuthLink = pickPreferredAuthLink(authLinks);

    res.json({
      ok: true,
      basketIdent: basket.ident,
      checkoutUrl: basket.links?.checkout || null,
      paymentUrl: basket.links?.payment || null,
      authUrl: preferredAuthLink?.url || null,
      authName: preferredAuthLink?.name || null,
      authReturnUrl,
      requiresAuth: Boolean(preferredAuthLink?.url),
      message: preferredAuthLink?.url
        ? 'Tebex-Authentifizierung erforderlich.'
        : 'Tebex-Basket wurde erfolgreich erstellt.',
    });
  } catch (error) {
    next(error);
  }
});

tebexRouter.post('/checkout/finalize', async (req, res, next) => {
  try {
    const context = await resolveCheckoutContext(req, { requireItems: true, requireBasketIdent: true });

    const basketResponse = await getBasket({ basketIdent: context.basketIdent });
    const basket = basketResponse?.data || basketResponse;
    const basketUsernameId = getBasketUsernameId(basket);

    if (!basketUsernameId) {
      const error = new Error('Tebex-Benutzer ist noch nicht mit dem Basket verknüpft.');
      error.statusCode = 409;
      error.publicMessage = 'Tebex-Login noch nicht abgeschlossen. Bitte den Checkout erneut starten.';
      throw error;
    }

    const knownPackageQuantities = extractBasketPackageQuantities(basket);

    for (const item of context.items) {
      await addPackageToBasketWithSmartRetry({
        basketIdent: context.basketIdent,
        item,
        context,
        basketUsernameId,
        knownPackageQuantities,
      });
    }

    res.json({
      ok: true,
      basketIdent: context.basketIdent,
      checkoutUrl: String(req.body?.checkoutUrl || '').trim() || null,
      paymentUrl: String(req.body?.paymentUrl || '').trim() || null,
      usernameId: basketUsernameId,
      message: 'Pakete wurden dem Tebex-Basket hinzugefügt.',
    });
  } catch (error) {
    next(error);
  }
});
