import { Router } from 'express';
import { getUserFromJwt, getOwnProfile } from '../lib/supabase.js';
import { createBasket, addPackageToBasket, getBasketAuthLinks, getBasket, getPackage } from '../lib/tebex.js';
import { extractDiscordIdentityFromUser, getDiscordFeatureConfig, getGuildMembershipStatus } from '../lib/discord.js';

export const tebexRouter = Router();

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
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

function normalizeOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || '';
}

function buildDiscordRequirementError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.publicMessage = message;
  return error;
}

function buildDiscordDisplayName({ profile, identity }) {
  return normalizeOptionalString(
    profile?.discord_name
      || identity?.globalName
      || identity?.username,
  );
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
  const discordConfig = getDiscordFeatureConfig();
  const discordIdentity = extractDiscordIdentityFromUser(authUser);
  const discordDisplayName = buildDiscordDisplayName({ profile, identity: discordIdentity });
  const discordUserId = normalizeOptionalString(discordIdentity?.discordUserId);

  let discordMembership = {
    configured: discordConfig.configured,
    checked: false,
    inGuild: false,
    guildId: discordConfig.guildId,
    guildName: discordConfig.guildName,
    inviteUrl: discordConfig.inviteUrl,
  };

  if (discordConfig.configured && discordUserId) {
    discordMembership = await getGuildMembershipStatus({ discordUserId });
  }

  if (discordConfig.requiredForCheckout) {
    if (!discordUserId) {
      throw buildDiscordRequirementError('Bitte verbinde zuerst dein Discord-Konto, bevor du den Checkout startest.');
    }

    if (!discordMembership?.inGuild) {
      throw buildDiscordRequirementError(`Bitte tritt zuerst dem ${discordConfig.guildName} Discord bei, bevor du einkaufst.`);
    }
  }

  const custom = {
    supabase_user_id: authUser.id,
    email: profile?.email || authUser?.email || '',
    username: profile?.username || authUser?.email?.split('@')[0] || 'User',
    discord_name: discordDisplayName,
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
    discordConfig,
    discordMembership,
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

function tryCollectServerId(value, bucket) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return;
  bucket.add(normalized);
}

function buildPayCheckoutUrl(basketIdent) {
  const ident = normalizeOptionalString(basketIdent);
  return ident ? `https://pay.tebex.io/${encodeURIComponent(ident)}` : '';
}

function extractCheckoutLinks(source, basketIdent = '') {
  const root = source?.data || source || {};
  const links = root?.links || source?.links || {};
  const checkoutUrl = (
    normalizeOptionalString(links?.checkout)
    || normalizeOptionalString(root?.checkout_url)
    || normalizeOptionalString(root?.checkoutUrl)
    || buildPayCheckoutUrl(root?.ident || basketIdent)
  );
  const paymentUrl = (
    normalizeOptionalString(links?.payment)
    || normalizeOptionalString(root?.payment_url)
    || normalizeOptionalString(root?.paymentUrl)
  );

  return {
    checkoutUrl,
    paymentUrl,
  };
}

function inferServerIdFromPackage(packageData) {
  const envServerId = normalizeOptionalString(process.env.TEBEX_DEFAULT_SERVER_ID);
  if (envServerId) return envServerId;
  if (!packageData || typeof packageData !== 'object') return '';

  const serverIds = new Set();
  const seen = new WeakSet();

  function visit(node, parentKey = '') {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry, parentKey));
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const lowerParent = String(parentKey || '').toLowerCase();

      if (lowerKey === 'server_id' || (lowerKey === 'id' && lowerParent.includes('server'))) {
        tryCollectServerId(value, serverIds);
      }

      if (lowerKey.includes('server')) {
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (entry && typeof entry === 'object') {
              tryCollectServerId(entry.server_id, serverIds);
              tryCollectServerId(entry.id, serverIds);
            }
            visit(entry, key);
          });
          return;
        }

        if (value && typeof value === 'object') {
          tryCollectServerId(value.server_id, serverIds);
          tryCollectServerId(value.id, serverIds);
        }
      }

      visit(value, key);
    });
  }

  visit(packageData);

  if (serverIds.size === 1) {
    return Array.from(serverIds)[0];
  }

  return '';
}

function buildVariableDataCandidates({ basketUsernameId, packageServerId, discordUserId }) {
  const username = normalizeOptionalString(basketUsernameId);
  const serverId = normalizeOptionalString(packageServerId);
  const discordId = normalizeOptionalString(discordUserId);

  const candidates = [
    null,
    discordId ? { discord_id: discordId } : null,
    username ? { username_id: username } : null,
    username && serverId ? { username_id: username, server_id: serverId } : null,
    serverId ? { server_id: serverId } : null,
    discordId && username ? { discord_id: discordId, username_id: username } : null,
    discordId && serverId ? { discord_id: discordId, server_id: serverId } : null,
    discordId && username && serverId
      ? { discord_id: discordId, username_id: username, server_id: serverId }
      : null,
  ];

  const seen = new Set();
  return candidates.filter((candidate) => {
    const signature = candidate ? JSON.stringify(candidate) : 'null';
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function isRecoverablePackageOptionsError(error) {
  const detail = `${error?.message || ''} ${error?.publicMessage || ''}`.toLowerCase();
  return (
    detail.includes('invalid options')
    || detail.includes('invalid option')
    || detail.includes('username_id')
    || detail.includes('server_id')
    || detail.includes('discord_id')
    || detail.includes('option')
  );
}

function createPackageFinalizeError(error, { item, packageServerId, discordUserId, triedCandidates }) {
  const detail = String(error?.message || error?.publicMessage || 'Tebex-Paket konnte nicht hinzugefügt werden.').trim();
  const hintParts = [];

  if (packageServerId) {
    hintParts.push(`Server-ID ${packageServerId} wurde getestet`);
  }

  if (discordUserId) {
    hintParts.push(`Discord-ID ${discordUserId} wurde getestet`);
  }

  if (!hintParts.length) {
    hintParts.push('Bitte die Deliverables und Variablen des Tebex-Pakets prüfen');
  }

  const wrapped = new Error(detail);
  wrapped.statusCode = error?.statusCode || 502;
  wrapped.publicMessage = `Checkout für "${item?.name || 'Paket'}" (#${item?.packageId || '-'}) fehlgeschlagen: ${detail}. ${hintParts.join(' · ')}. Versucht: ${triedCandidates}.`;
  return wrapped;
}

async function getPackageForCheckout(packageId) {
  try {
    const response = await getPackage({ packageId });
    return response?.data || response || null;
  } catch (_error) {
    return null;
  }
}

async function addPackageToBasketWithSmartRetry({ basketIdent, item, context, basketUsernameId }) {
  const packageData = await getPackageForCheckout(item.packageId);
  const packageServerId = inferServerIdFromPackage(packageData);
  const variableCandidates = buildVariableDataCandidates({
    basketUsernameId,
    packageServerId,
    discordUserId: context.discordUserId,
  });

  let lastError = null;

  for (const variableData of variableCandidates) {
    try {
      return await addPackageToBasket({
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
    } catch (error) {
      lastError = error;
      if (!isRecoverablePackageOptionsError(error)) {
        throw createPackageFinalizeError(error, {
          item,
          packageServerId,
          discordUserId: context.discordUserId,
          triedCandidates: variableCandidates.length,
        });
      }
    }
  }

  throw createPackageFinalizeError(lastError, {
    item,
    packageServerId,
    discordUserId: context.discordUserId,
    triedCandidates: variableCandidates.length,
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
    const basketLinks = extractCheckoutLinks(basket, basket.ident);

    res.json({
      ok: true,
      basketIdent: basket.ident,
      checkoutUrl: basketLinks.checkoutUrl || null,
      paymentUrl: basketLinks.paymentUrl || null,
      authUrl: preferredAuthLink?.url || null,
      authName: preferredAuthLink?.name || null,
      authReturnUrl,
      requiresAuth: Boolean(preferredAuthLink?.url),
      discordRequired: Boolean(context.discordConfig.requiredForCheckout),
      discordConnected: Boolean(context.discordUserId),
      discordInGuild: Boolean(context.discordMembership?.inGuild),
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

    let lastPackageResponse = null;

    for (const item of context.items) {
      lastPackageResponse = await addPackageToBasketWithSmartRetry({
        basketIdent: context.basketIdent,
        item,
        context,
        basketUsernameId,
      });
    }

    let refreshedBasket = null;
    try {
      const refreshedBasketResponse = await getBasket({ basketIdent: context.basketIdent });
      refreshedBasket = refreshedBasketResponse?.data || refreshedBasketResponse || null;
    } catch (_error) {
      refreshedBasket = null;
    }

    const refreshedLinks = extractCheckoutLinks(refreshedBasket, context.basketIdent);
    const lastPackageLinks = extractCheckoutLinks(lastPackageResponse, context.basketIdent);
    const requestCheckoutUrl = normalizeOptionalString(req.body?.checkoutUrl);
    const requestPaymentUrl = normalizeOptionalString(req.body?.paymentUrl);

    res.json({
      ok: true,
      basketIdent: context.basketIdent,
      checkoutUrl: refreshedLinks.checkoutUrl || lastPackageLinks.checkoutUrl || requestCheckoutUrl || buildPayCheckoutUrl(context.basketIdent) || null,
      paymentUrl: refreshedLinks.paymentUrl || lastPackageLinks.paymentUrl || requestPaymentUrl || null,
      usernameId: basketUsernameId,
      discordUserId: context.discordUserId || null,
      message: 'Pakete wurden dem Tebex-Basket hinzugefügt.',
    });
  } catch (error) {
    next(error);
  }
});
