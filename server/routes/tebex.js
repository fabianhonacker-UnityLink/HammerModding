import { Router } from 'express';
import { getUserFromJwt, getOwnProfile } from '../lib/supabase.js';
import { createBasket, addPackageToBasket, getBasketAuthLinks } from '../lib/tebex.js';

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
  const custom = {
    supabase_user_id: authUser.id,
    email: profile?.email || authUser?.email || '',
    username: profile?.username || authUser?.email?.split('@')[0] || 'User',
    discord_name: profile?.discord_name || '',
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

    for (const item of context.items) {
      await addPackageToBasket({
        basketIdent: context.basketIdent,
        packageId: item.packageId,
        quantity: item.quantity,
        custom: {
          ...context.custom,
          product_name: item.name,
          package_id: item.packageId,
        },
      });
    }

    res.json({
      ok: true,
      basketIdent: context.basketIdent,
      checkoutUrl: String(req.body?.checkoutUrl || '').trim() || null,
      paymentUrl: String(req.body?.paymentUrl || '').trim() || null,
      message: 'Pakete wurden dem Tebex-Basket hinzugefügt.',
    });
  } catch (error) {
    next(error);
  }
});
