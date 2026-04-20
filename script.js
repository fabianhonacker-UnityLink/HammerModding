const navItems = document.querySelectorAll('.nav-item');
const homeSections = document.querySelectorAll('.section-home');
const scriptsSection = document.getElementById('scriptsSection');
const clothingSection = document.getElementById('clothingSection');
const freeSection = document.getElementById('freeSection');
const contactSection = document.getElementById('contactSection');
const accountSection = document.getElementById('accountSection');
const systemSection = document.getElementById('systemSection');
const detailSections = {
  blitzer: document.getElementById('scriptDetailSection'),
  gps: document.getElementById('gpsDetailSection'),
  carplay: document.getElementById('carplayDetailSection'),
  'mechaniker-ki': document.getElementById('mechanikerKiDetailSection'),
  afk: document.getElementById('afkDetailSection'),
  outfit: document.getElementById('outfitDetailSection'),
  taxi: document.getElementById('taxiDetailSection'),
  'zoll-uniform': document.getElementById('zollUniformDetailSection'),
  'serverteam-uniform': document.getElementById('serverteamUniformDetailSection'),
  'rettungsdienst-uniform': document.getElementById('rettungsdienstUniformDetailSection'),
  'polizei-uniform': document.getElementById('polizeiUniformDetailSection'),
};
const searchInput = document.getElementById('searchInput');
const searchables = document.querySelectorAll('.searchable');
let lastSectionBeforeDetail = 'scripts';

const viewportVisibility = new WeakMap();
let viewportObserver = null;
let introBooting = false;

const cartStorageKey = 'hm_store_cart';
const cartDraftStorageKey = 'hm_cart_draft';
const storeCatalog = {
  blitzer: { id: 'blitzer-script', slug: 'blitzer', name: 'Blitzer Script', price: '15.00', priceLabel: '15,00 €', type: 'paid-script' },
  gps: { id: 'gps-system', slug: 'gps', name: 'GPS System', price: '10.00', priceLabel: '10,00 €', type: 'paid-script' },
  carplay: { id: 'carplay-system', slug: 'carplay', name: 'CarPlay System', price: '10.00', priceLabel: '10,00 €', type: 'paid-script' },
  'mechaniker-ki': { id: 'ki-mechaniker', slug: 'mechaniker-ki', name: 'KI Mechaniker', price: '10.00', priceLabel: '10,00 €', type: 'paid-script' },
  outfit: { id: 'outfit-auswahl', slug: 'outfit', name: 'Outfit-Auswahl', price: '5.00', priceLabel: '5,00 €', type: 'paid-script' },
  'zoll-uniform': { id: 'zoll-uniform', slug: 'zoll-uniform', name: 'Zoll-Uniform', price: '20.00', priceLabel: '20,00 €', type: 'clothing' },
  'serverteam-uniform': { id: 'serverteam-uniform', slug: 'serverteam-uniform', name: 'Serverteam-Uniform', price: '12.00', priceLabel: '12,00 €', type: 'clothing' },
  'rettungsdienst-uniform': { id: 'rettungsdienst-uniform', slug: 'rettungsdienst-uniform', name: 'Rettungsdienst-Uniform-Set', price: '20.00', priceLabel: '20,00 €', type: 'clothing' },
  'polizei-uniform': { id: 'polizei-uniform', slug: 'polizei-uniform', name: 'Polizei-Uniform', price: '25.00', priceLabel: '25,00 €', type: 'clothing' },
};

const hmStoreBridge = (window.hmStoreBridge = window.hmStoreBridge || {
  version: 'phase-6c-live-supabase-auth',
  catalog: storeCatalog,
  lastPreparedItem: null,
});

const SUPABASE_PROJECT_REF = 'gvyglxlxvnvpykbwaqnx';
const SUPABASE_PROJECT_URL = 'https://gvyglxlxvnvpykbwaqnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1QiVV_QTfZL8H3Uh-Bdaqw_FpjCZqzv';
const detectedSiteUrl = window.location.origin && !window.location.origin.startsWith('file') ? window.location.origin : '';
const detectedRedirectUrl = detectedSiteUrl ? `${detectedSiteUrl}/account/callback` : '';
let supabaseClient = null;
let supabaseClientSignature = '';
let liveAccountSnapshot = {
  user: null,
  profile: null,
  session: null,
  connectionReady: false,
};
const accountActivityStorageKey = 'hm_account_activity';
let currentAuthModalMode = 'login';
let isAccountDropdownOpen = false;


function formatRelativeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function loadAccountActivityStore() {
  try {
    const raw = localStorage.getItem(accountActivityStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function persistAccountActivityStore(store) {
  try {
    localStorage.setItem(accountActivityStorageKey, JSON.stringify(store || {}));
  } catch (error) {
    // ignore
  }
}

function getAccountActivity(userId) {
  if (!userId) return null;
  const store = loadAccountActivityStore();
  return store[userId] || null;
}

function updateAccountActivity(userId, patch = {}) {
  if (!userId) return null;
  const store = loadAccountActivityStore();
  const next = {
    lastSeenAt: '',
    lastLoginAt: '',
    lastPurchaseName: '',
    lastPurchasePrice: '',
    ...(store[userId] || {}),
    ...patch,
  };
  store[userId] = next;
  persistAccountActivityStore(store);
  return next;
}

function getDisplayInitial(name, fallback = 'HM') {
  const value = String(name || '').trim();
  if (!value) return fallback;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function closeAccountDropdown() {
  const dropdown = document.getElementById('accountDropdown');
  if (!dropdown) return;
  isAccountDropdownOpen = false;
  dropdown.classList.add('hidden-section');
}

function openAccountDropdown() {
  const dropdown = document.getElementById('accountDropdown');
  if (!dropdown) return;
  isAccountDropdownOpen = true;
  dropdown.classList.remove('hidden-section');
}

function toggleAccountDropdown() {
  if (isAccountDropdownOpen) {
    closeAccountDropdown();
  } else {
    openAccountDropdown();
  }
}

function setAuthModalTab(mode = 'login') {
  currentAuthModalMode = mode === 'register' ? 'register' : 'login';
  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.authTab === currentAuthModalMode);
  });
  const loginPanel = document.getElementById('authLoginPanel');
  const registerPanel = document.getElementById('authRegisterPanel');
  if (loginPanel) loginPanel.classList.toggle('hidden-section', currentAuthModalMode !== 'login');
  if (registerPanel) registerPanel.classList.toggle('hidden-section', currentAuthModalMode !== 'register');
}

function openAuthModal(mode = 'login') {
  const overlay = document.getElementById('authModalOverlay');
  if (!overlay) return;
  setAuthModalTab(mode);
  overlay.classList.remove('hidden-section');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  const overlay = document.getElementById('authModalOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden-section');
  document.body.style.overflow = '';
}

function setAccountShellUi(user, profile) {
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Nicht eingeloggt';
  const displayRole = profile?.role || (user ? 'kunde' : 'gast');
  const displayMail = user?.email || 'Keine aktive Sitzung';
  const initial = getDisplayInitial(displayName);
  const activity = user?.id ? getAccountActivity(user.id) : null;
  const onlineNow = Boolean(user);

  const mapText = [
    ['accountProfileAvatarInitial', initial],
    ['accountProfileName', displayName],
    ['accountProfileSubline', user ? 'Konto aktiv · direkt mit Supabase verbunden' : 'Website-Konto · Bitte oben rechts einloggen'],
    ['accountProfileRolePill', displayRole],
    ['accountProfileMailPill', displayMail],
    ['accountProfileHint', user ? 'Dein Konto ist live verbunden. Später ergänzen sich hier Bestellungen, Downloads und Rechte automatisch.' : 'Login und Registrierung laufen jetzt kompakt oben rechts über das Konto-Menü.'],
    ['accountOnlineNowValue', onlineNow ? 'Ja' : 'Nein'],
    ['accountOnlineNowMeta', onlineNow ? 'Deine Sitzung ist gerade aktiv' : 'Momentan keine aktive Sitzung'],
    ['accountLastOnlineValue', activity?.lastSeenAt ? formatRelativeDate(activity.lastSeenAt) : '-'],
    ['accountLastLoginValue', activity?.lastLoginAt ? formatRelativeDate(activity.lastLoginAt) : '-'],
    ['accountLastPurchaseValue', activity?.lastPurchaseName || 'Noch offen'],
    ['accountLastPurchaseMeta', activity?.lastPurchaseName ? activity.lastPurchasePrice || '' : 'Sobald Bestellungen echt gespeichert werden'],
  ];

  mapText.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const statusDotIds = ['accountProfileStatusDot', 'accountDockStatusDot', 'accountDropdownStatusDot'];
  statusDotIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('account-status-online', onlineNow);
    el.classList.toggle('account-status-offline', !onlineNow);
  });

  const logoutButton = document.getElementById('accountInlineLogoutButton');
  if (logoutButton) logoutButton.classList.toggle('hidden-section', !user);
}

function updateAccountDock(user, profile) {
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Login / Registrieren';
  const initial = getDisplayInitial(displayName);
  const meta = user ? `${profile?.role || 'kunde'} · online` : 'Website-Konto';
  const map = [
    ['accountDockAvatarInitial', initial],
    ['accountDockEyebrow', user ? meta : 'Website-Konto'],
    ['accountDockName', displayName],
    ['accountDropdownAvatarInitial', initial],
    ['accountDropdownName', user ? displayName : 'Nicht eingeloggt'],
    ['accountDropdownMeta', user ? (user.email || meta) : 'Website-Konto'],
  ];
  map.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
  const loggedOut = document.getElementById('accountDropdownLoggedOut');
  const loggedIn = document.getElementById('accountDropdownLoggedIn');
  if (loggedOut) loggedOut.classList.toggle('hidden-section', Boolean(user));
  if (loggedIn) loggedIn.classList.toggle('hidden-section', !user);
}

function getCatalogItem(entryLike) {
  if (!entryLike) return null;

  if (typeof entryLike === 'string') {
    return storeCatalog[entryLike] || Object.values(storeCatalog).find((item) => item.id === entryLike) || null;
  }

  return (
    storeCatalog[entryLike.slug] ||
    Object.values(storeCatalog).find((item) => item.id === entryLike.id || item.slug === entryLike.slug) ||
    null
  );
}

function getViewportObserver() {
  if (viewportObserver) return viewportObserver;

  viewportObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        viewportVisibility.set(entry.target, entry.isIntersecting && entry.intersectionRatio > 0.05);
      });
      syncVideoPlayback();
    },
    {
      threshold: [0, 0.05, 0.15, 0.35],
      rootMargin: '120px 0px 120px 0px',
    },
  );

  return viewportObserver;
}

function watchViewport(el) {
  if (!el) return;
  if (!viewportVisibility.has(el)) viewportVisibility.set(el, true);
  getViewportObserver().observe(el);
}

function isInViewport(el) {
  if (!el) return false;
  return viewportVisibility.get(el) ?? true;
}

function isActuallyVisible(el) {
  if (!el) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function syncVideoPlayback() {
  const videos = document.querySelectorAll('video[autoplay]');
  videos.forEach((video) => {
    watchViewport(video);
    const introPending = video.dataset.introPending === 'true';
    const visible = !document.hidden && isActuallyVisible(video) && isInViewport(video);

    if (introPending) {
      if (!video.paused) video.pause();
      return;
    }

    if (!visible) {
      if (!video.paused) video.pause();
      return;
    }

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  });
}

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden-section', !visible);
  el.style.display = visible ? '' : 'none';
}

function hideAllDetails() {
  Object.values(detailSections).forEach((el) => setVisible(el, false));
}

function activateNav(section) {
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.section === section));
}

function showSection(section) {
  homeSections.forEach((el) => {
    el.style.display = section === 'home' ? '' : 'none';
  });
  setVisible(scriptsSection, section === 'scripts');
  setVisible(clothingSection, section === 'clothing');
  setVisible(freeSection, section === 'free');
  setVisible(accountSection, section === 'account');
  setVisible(systemSection, section === 'system');
  setVisible(contactSection, section === 'contact');
  hideAllDetails();
  syncVideoPlayback();
}

function openScriptDetail(scriptName, originSection = 'scripts') {
  lastSectionBeforeDetail = originSection;
  homeSections.forEach((el) => (el.style.display = 'none'));
  setVisible(scriptsSection, false);
  setVisible(clothingSection, false);
  setVisible(freeSection, false);
  setVisible(accountSection, false);
  setVisible(systemSection, false);
  setVisible(contactSection, false);
  hideAllDetails();
  setVisible(detailSections[scriptName], true);
  activateNav(originSection === 'home' ? 'home' : originSection === 'free' ? 'free' : originSection === 'clothing' ? 'clothing' : 'scripts');
  syncVideoPlayback();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackFromDetail() {
  const target = lastSectionBeforeDetail || 'scripts';
  activateNav(target);
  showSection(target);
}

function parseCartPriceToCents(value) {
  const normalized = String(value || '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatCartPrice(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function buildPreparedCartItem(button) {
  if (!button) return null;

  const slug = button.dataset.productSlug || '';
  const catalogItem = getCatalogItem(slug);
  const name = button.dataset.productName || catalogItem?.name || '';
  const id = button.dataset.productId || catalogItem?.id || '';
  const price = button.dataset.productPrice || catalogItem?.price || '0';
  const priceLabel = button.dataset.productPriceLabel || catalogItem?.priceLabel || '';
  const type = button.dataset.productType || catalogItem?.type || 'paid-script';

  if (!slug || !name || !id) return null;

  return {
    id,
    slug,
    name,
    type,
    price,
    priceLabel,
    priceCents: parseCartPriceToCents(price),
    quantity: 1,
    source: 'detail-page',
  };
}

function loadVisibleCart() {
  let cart = [];

  try {
    const raw = localStorage.getItem(cartStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) cart = parsed;
    }
  } catch (error) {
    cart = [];
  }

  if (!cart.length) {
    try {
      const draftRaw = sessionStorage.getItem(cartDraftStorageKey);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (Array.isArray(draft) && draft.length) {
          cart = draft;
          sessionStorage.removeItem(cartDraftStorageKey);
        }
      }
    } catch (error) {
      // ignore draft migration failures
    }
  }

  return cart
    .map((entry) => {
      const catalogItem = getCatalogItem(entry);
      if (!catalogItem) return null;

      return {
        id: catalogItem.id,
        slug: catalogItem.slug,
        name: catalogItem.name,
        type: catalogItem.type,
        price: catalogItem.price,
        priceLabel: catalogItem.priceLabel,
        priceCents: parseCartPriceToCents(catalogItem.price),
        quantity: 1,
        source: entry?.source || 'detail-page',
      };
    })
    .filter(Boolean)
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index);
}

function persistVisibleCart(cart) {
  const normalized = Array.isArray(cart) ? cart : [];

  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(normalized));
  } catch (error) {
    // localStorage may be blocked
  }

  hmStoreBridge.cart = normalized.map((entry) => ({ ...entry }));
  hmStoreBridge.getCart = () => normalized.map((entry) => ({ ...entry }));
  hmStoreBridge.lastPreparedItem = normalized[normalized.length - 1] || null;
}

function getVisibleCartTotals(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const count = items.length;
  const totalCents = items.reduce((sum, entry) => sum + (entry?.priceCents || 0), 0);
  return {
    count,
    totalCents,
    totalLabel: formatCartPrice(totalCents),
  };
}


function getCartItemTypeLabel(item) {
  if (!item) return 'Produkt';
  if (item.type === 'clothing') return 'Kleidung';
  if (item.type === 'paid-script') return 'Script';
  return 'Produkt';
}

function buildCartRequestText(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const totals = getVisibleCartTotals(items);
  const user = liveAccountSnapshot.user;
  const profile = liveAccountSnapshot.profile || {};
  const meta = user?.user_metadata || {};
  const accountEmail = user?.email || '[bitte ergänzen]';
  const username = profile.username || meta.username || '[bitte ergänzen]';
  const discordName = profile.discord_name || meta.discord_name || '[bitte ergänzen]';
  const cfxIdentifier = profile.cfx_identifier || meta.cfx_identifier || '[bitte ergänzen]';
  const role = profile.role || 'kunde';

  if (!items.length) {
    return 'Wähle zuerst Produkte aus deinem Warenkorb aus.';
  }

  const lines = [
    'Hammer Modding Bestellanfrage',
    '',
    'Gewünschte Produkte:',
    ...items.map((item) => `- ${item.name} | ${item.priceLabel} | ${getCartItemTypeLabel(item)}`),
    '',
    `Gesamtsumme: ${totals.totalLabel}`,
    '',
    'Kontodaten:',
    `Benutzerkonto: ${username}`,
    `E-Mail: ${accountEmail}`,
    `Discord-Name: ${discordName}`,
    `CFX-Account / Tebex-Konto: ${cfxIdentifier}`,
    `Rolle: ${role}`,
    '',
    'Bitte später über Tebex / saubere Freischaltung abwickeln.',
    'Zusätzliche Hinweise: [optional]',
  ];

  return lines.join('\n');
}


function updateRequestDraftFields(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const requestText = buildCartRequestText(items);
  const requestButton = document.getElementById('cartRequestButton');
  const contactText = document.getElementById('contactRequestText');
  const modalText = document.getElementById('requestModalText');
  const copyButtons = document.querySelectorAll('[data-copy-request="true"]');

  if (requestButton) {
    requestButton.disabled = !items.length;
  }

  if (contactText) {
    contactText.value = requestText;
  }

  if (modalText) {
    modalText.value = requestText;
  }

  copyButtons.forEach((button) => {
    button.disabled = !items.length;
  });

  hmStoreBridge.requestText = requestText;
  hmStoreBridge.getRequestText = () => buildCartRequestText(loadVisibleCart());
}

function openRequestModal() {
  const cart = loadVisibleCart();
  if (!cart.length) return;

  const overlay = document.getElementById('requestModalOverlay');
  if (!overlay) return;

  updateRequestDraftFields(cart);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('request-modal-open');
}

function closeRequestModal() {
  const overlay = document.getElementById('requestModalOverlay');
  if (!overlay) return;

  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('request-modal-open');
}

async function copyPreparedRequestText() {
  const requestText = buildCartRequestText(loadVisibleCart());
  if (!requestText || requestText === 'Wähle zuerst Produkte aus deinem Warenkorb aus.') return false;
  return copyTextToClipboard(requestText);
}

function openContactRequestFlow() {
  closeRequestModal();
  activateNav('contact');
  showSection('contact');
  const requestText = document.getElementById('contactRequestText');
  if (requestText) requestText.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateCartButtonsState(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const cartIds = new Set(items.map((entry) => entry.id));
  const buttons = document.querySelectorAll('[data-cart-add="true"]');

  buttons.forEach((button) => {
    const item = buildPreparedCartItem(button);
    const inCart = item ? cartIds.has(item.id) : false;
    button.dataset.cartReady = item ? 'true' : 'false';
    button.dataset.inCart = inCart ? 'true' : 'false';
    button.classList.toggle('is-in-cart', inCart);
    button.textContent = inCart ? 'Im Warenkorb' : 'Warenkorb hinzufügen';
    if (item) {
      button.setAttribute('aria-label', `${item.name} zum Warenkorb hinzufügen`);
    }
  });
}

function updateCartStatusCard(cart) {
  const card = document.getElementById('cartStatusCard');
  if (!card) return;

  const countEl = document.getElementById('cartCountBadge');
  const copyEl = document.getElementById('cartStatusText');
  const subtotalEl = document.getElementById('cartSubtotalLabel');
  const items = Array.isArray(cart) ? cart : [];
  const totals = getVisibleCartTotals(items);

  card.dataset.empty = items.length ? 'false' : 'true';

  if (countEl) countEl.textContent = String(totals.count);
  if (subtotalEl) subtotalEl.textContent = totals.totalLabel;

  if (copyEl) {
    if (!items.length) {
      copyEl.textContent = 'Noch keine Produkte im Warenkorb.';
    } else if (items.length === 1) {
      copyEl.textContent = `${items[0].name} liegt aktuell im Warenkorb.`;
    } else {
      copyEl.textContent = `${items.length} Produkte liegen aktuell im Warenkorb.`;
    }
  }
}

function renderCartPanelItems(cart) {
  const panel = document.getElementById('cartPanelCard');
  const list = document.getElementById('cartPanelList');
  const totalEl = document.getElementById('cartPanelTotal');
  const clearBtn = document.getElementById('cartClearButton');
  if (!panel || !list || !totalEl || !clearBtn) return;

  const items = Array.isArray(cart) ? cart : [];
  const totals = getVisibleCartTotals(items);

  panel.dataset.empty = items.length ? 'false' : 'true';
  list.innerHTML = '';

  items.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'cart-panel-item';
    row.innerHTML = `
      <div class="cart-panel-item-copy">
        <strong>${item.name}</strong>
        <div class="cart-panel-item-meta">
          <span>${item.priceLabel}</span>
          <span class="cart-panel-dot" aria-hidden="true"></span>
          <span>${getCartItemTypeLabel(item)}</span>
        </div>
      </div>
      <button class="cart-remove-button" data-cart-remove-id="${item.id}" type="button">Entfernen</button>
    `;
    list.appendChild(row);
  });

  clearBtn.disabled = !items.length;
  totalEl.textContent = totals.totalLabel;
}

function refreshVisibleCartUi(cart) {
  updateCartStatusCard(cart);
  renderCartPanelItems(cart);
  updateCartButtonsState(cart);
  updateRequestDraftFields(cart);
}

function pulsePreparedCartButton(button) {
  if (!button) return;
  button.classList.remove('is-cart-prepared');
  window.setTimeout(() => {
    button.classList.add('is-cart-prepared');
    window.setTimeout(() => button.classList.remove('is-cart-prepared'), 1100);
  }, 0);
}

function addPreparedItemToCart(item) {
  if (!item) return [];
  const cart = loadVisibleCart();
  const existing = cart.find((entry) => entry.id === item.id);
  if (!existing) cart.push(item);
  persistVisibleCart(cart);
  refreshVisibleCartUi(cart);
  return cart;
}

function removeVisibleCartItem(itemId) {
  if (!itemId) return [];
  const cart = loadVisibleCart().filter((entry) => entry.id !== itemId);
  persistVisibleCart(cart);
  refreshVisibleCartUi(cart);
  return cart;
}

function clearVisibleCart() {
  const cart = [];
  persistVisibleCart(cart);
  refreshVisibleCartUi(cart);
  return cart;
}



const foundationStorageKey = 'hm_phase6c_foundation';
const defaultFoundationState = {
  provider: 'supabase',
  authProvider: 'email-password',
  projectRef: SUPABASE_PROJECT_REF,
  projectUrl: SUPABASE_PROJECT_URL,
  anonKey: SUPABASE_PUBLISHABLE_KEY,
  siteUrl: detectedSiteUrl,
  redirectUrl: detectedRedirectUrl,
  publicSchema: 'public',
  storageBucket: 'product-assets',
  productsTable: 'products',
  adminRole: 'admin',
  managerRole: 'product_manager',
  bindingMode: 'cfx-license',
  backendBaseUrl: '',
  webhookUrl: '',
  lastConnectionStatus: 'idle',
  lastConnectionMessage: '',
  lastConnectionCheckedAt: '',
};

function loadFoundationState() {
  try {
    const raw = localStorage.getItem(foundationStorageKey) || localStorage.getItem('hm_phase6b_foundation');
    if (!raw) return { ...defaultFoundationState };
    const parsed = JSON.parse(raw);
    const merged = { ...defaultFoundationState, ...(parsed || {}) };
    if (!merged.projectRef) merged.projectRef = defaultFoundationState.projectRef;
    if (!merged.projectUrl) merged.projectUrl = defaultFoundationState.projectUrl;
    if (!merged.anonKey) merged.anonKey = defaultFoundationState.anonKey;
    if (!merged.siteUrl) merged.siteUrl = defaultFoundationState.siteUrl;
    if (!merged.redirectUrl) merged.redirectUrl = defaultFoundationState.redirectUrl;
    return merged;
  } catch (error) {
    return { ...defaultFoundationState };
  }
}

function persistFoundationState(state) {
  const normalized = { ...defaultFoundationState, ...(state || {}) };
  try {
    localStorage.setItem(foundationStorageKey, JSON.stringify(normalized));
  } catch (error) {
    // ignore storage issues for the draft config
  }
  return normalized;
}

function getFoundationElements() {
  return {
    providerSelect: document.getElementById('dbProviderSelect'),
    authProviderSelect: document.getElementById('authProviderSelect'),
    projectRefInput: document.getElementById('dbProjectRefInput'),
    projectUrlInput: document.getElementById('dbProjectUrlInput'),
    anonKeyInput: document.getElementById('dbAnonKeyInput'),
    siteUrlInput: document.getElementById('dbSiteUrlInput'),
    redirectUrlInput: document.getElementById('dbRedirectUrlInput'),
    schemaInput: document.getElementById('dbSchemaInput'),
    storageBucketInput: document.getElementById('dbStorageBucketInput'),
    productsTableInput: document.getElementById('dbProductsTableInput'),
    adminRoleInput: document.getElementById('dbAdminRoleInput'),
    managerRoleInput: document.getElementById('dbManagerRoleInput'),
    bindingModeSelect: document.getElementById('bindingModeSelect'),
    backendBaseUrlInput: document.getElementById('backendBaseUrlInput'),
    webhookUrlInput: document.getElementById('webhookUrlInput'),
    summaryText: document.getElementById('foundationSummaryText'),
    sqlText: document.getElementById('foundationSqlText'),
    connectionMessage: document.getElementById('foundationConnectionMessage'),
  };
}

function collectFoundationStateFromUi() {
  const elements = getFoundationElements();
  const previous = loadFoundationState();
  return {
    provider: elements.providerSelect?.value || defaultFoundationState.provider,
    authProvider: elements.authProviderSelect?.value || defaultFoundationState.authProvider,
    projectRef: elements.projectRefInput?.value.trim() || '',
    projectUrl: elements.projectUrlInput?.value.trim() || '',
    anonKey: elements.anonKeyInput?.value.trim() || '',
    siteUrl: elements.siteUrlInput?.value.trim() || '',
    redirectUrl: elements.redirectUrlInput?.value.trim() || '',
    publicSchema: elements.schemaInput?.value.trim() || defaultFoundationState.publicSchema,
    storageBucket: elements.storageBucketInput?.value.trim() || defaultFoundationState.storageBucket,
    productsTable: elements.productsTableInput?.value.trim() || defaultFoundationState.productsTable,
    adminRole: elements.adminRoleInput?.value.trim() || defaultFoundationState.adminRole,
    managerRole: elements.managerRoleInput?.value.trim() || defaultFoundationState.managerRole,
    bindingMode: elements.bindingModeSelect?.value || defaultFoundationState.bindingMode,
    backendBaseUrl: elements.backendBaseUrlInput?.value.trim() || '',
    webhookUrl: elements.webhookUrlInput?.value.trim() || '',
    lastConnectionStatus: previous.lastConnectionStatus || defaultFoundationState.lastConnectionStatus,
    lastConnectionMessage: previous.lastConnectionMessage || '',
    lastConnectionCheckedAt: previous.lastConnectionCheckedAt || '',
  };
}

function hydrateFoundationUi(state) {
  const elements = getFoundationElements();
  if (elements.providerSelect) elements.providerSelect.value = state.provider || defaultFoundationState.provider;
  if (elements.authProviderSelect) elements.authProviderSelect.value = state.authProvider || defaultFoundationState.authProvider;
  if (elements.projectRefInput) elements.projectRefInput.value = state.projectRef || '';
  if (elements.projectUrlInput) elements.projectUrlInput.value = state.projectUrl || '';
  if (elements.anonKeyInput) elements.anonKeyInput.value = state.anonKey || '';
  if (elements.siteUrlInput) elements.siteUrlInput.value = state.siteUrl || '';
  if (elements.redirectUrlInput) elements.redirectUrlInput.value = state.redirectUrl || '';
  if (elements.schemaInput) elements.schemaInput.value = state.publicSchema || defaultFoundationState.publicSchema;
  if (elements.storageBucketInput) elements.storageBucketInput.value = state.storageBucket || defaultFoundationState.storageBucket;
  if (elements.productsTableInput) elements.productsTableInput.value = state.productsTable || defaultFoundationState.productsTable;
  if (elements.adminRoleInput) elements.adminRoleInput.value = state.adminRole || defaultFoundationState.adminRole;
  if (elements.managerRoleInput) elements.managerRoleInput.value = state.managerRole || defaultFoundationState.managerRole;
  if (elements.bindingModeSelect) elements.bindingModeSelect.value = state.bindingMode || defaultFoundationState.bindingMode;
  if (elements.backendBaseUrlInput) elements.backendBaseUrlInput.value = state.backendBaseUrl || '';
  if (elements.webhookUrlInput) elements.webhookUrlInput.value = state.webhookUrl || '';
}

function getStatusVariant(type) {
  if (type === 'ready') return 'status-badge-ready';
  if (type === 'draft') return 'status-badge-neutral';
  return 'status-badge-warn';
}

function setBadgeState(id, label, type) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = label;
  badge.classList.remove('status-badge-ready', 'status-badge-warn', 'status-badge-neutral');
  badge.classList.add(getStatusVariant(type));
}

function prettifyFoundationValue(value, fallback = 'noch offen') {
  return value ? value : fallback;
}

function formatAuthProvider(value) {
  if (value === 'email-discord') return 'E-Mail + Discord später';
  return 'E-Mail + Passwort';
}

function formatBindingMode(value) {
  if (value === 'cfx-account') return 'CFX-Account';
  if (value === 'discord-cfx') return 'Discord + CFX kombiniert';
  return 'CFX Identifier / License';
}

function formatConnectionTimestamp(value) {
  if (!value) return 'noch nie';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE');
}

function sanitizeSqlIdentifier(value, fallback) {
  const cleaned = String(value || fallback || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function buildFoundationSummary(state) {
  const dbReady = Boolean(state.projectUrl && state.anonKey);
  const redirectReady = Boolean(state.siteUrl && state.redirectUrl);
  const storageReady = Boolean(state.storageBucket && state.productsTable);
  const webhookReady = Boolean(state.webhookUrl);
  const protectedReady = Boolean(state.adminRole && state.managerRole);
  const lines = [
    'Hammer Modding – Phase 6C Supabase Live-Anbindung',
    '',
    `Provider: ${state.provider === 'custom' ? 'Custom Backend' : 'Supabase'}`,
    `Auth: ${formatAuthProvider(state.authProvider)}`,
    `Project Ref: ${prettifyFoundationValue(state.projectRef)}`,
    `Project URL / API Base: ${prettifyFoundationValue(state.projectUrl)}`,
    `Public Anon Key: ${state.anonKey ? 'gesetzt' : 'noch offen'}`,
    `Site URL: ${prettifyFoundationValue(state.siteUrl)}`,
    `Redirect URL: ${prettifyFoundationValue(state.redirectUrl)}`,
    `Schema: ${prettifyFoundationValue(state.publicSchema, 'public')}`,
    `Products Tabelle: ${prettifyFoundationValue(state.productsTable, 'products')}`,
    `Storage Bucket: ${prettifyFoundationValue(state.storageBucket, 'product-assets')}`,
    `Admin Rolle: ${prettifyFoundationValue(state.adminRole, 'admin')}`,
    `Manager Rolle: ${prettifyFoundationValue(state.managerRole, 'product_manager')}`,
    `Bindungsmodus: ${formatBindingMode(state.bindingMode)}`,
    `Backend URL: ${prettifyFoundationValue(state.backendBaseUrl)}`,
    `Webhook URL: ${prettifyFoundationValue(state.webhookUrl)}`,
    '',
    'Readiness:',
    `- Datenbank: ${dbReady ? 'bereit für Live-Test' : 'noch offen'}`,
    `- Redirects: ${redirectReady ? 'festgelegt' : 'noch offen'}`,
    `- Storage / Produkte: ${storageReady ? 'festgelegt' : 'noch offen'}`,
    `- Protected Areas: ${protectedReady ? 'Rollen definiert' : 'noch offen'}`,
    `- Webhook: ${webhookReady ? 'vorbereitet' : 'noch offen'}`,
    `- Letzter Live-Test: ${state.lastConnectionStatus === 'success' ? 'erfolgreich' : state.lastConnectionStatus === 'error' ? 'fehlgeschlagen' : 'noch nicht gelaufen'}`,
    `- Zuletzt geprüft: ${formatConnectionTimestamp(state.lastConnectionCheckedAt)}`,
    '',
    'Nächste Schritte:',
    '- SQL Blueprint in Supabase anlegen',
    '- Redirects und Site URL in Supabase prüfen',
    '- Auth + Rollen später serverseitig absichern',
    '- Tebex Store-Daten danach anbinden',
  ];

  return lines.join('\n');
}

function buildFoundationSqlBlueprint(state) {
  if (state.provider === 'custom') {
    return [
      '-- Custom Backend gewählt.',
      '-- Phase 6C: SQL-Basis für echte Konten, Profile und spätere Rollenlogik.',
      '-- Für einen Custom Stack bitte Tabellen, Rollen und Policies auf euren Backend-Standard übertragen.',
    ].join('\n');
  }

  const schema = sanitizeSqlIdentifier(state.publicSchema, 'public');
  const productsTable = sanitizeSqlIdentifier(state.productsTable, 'products');
  const bucket = sanitizeSqlIdentifier(state.storageBucket, 'product_assets');
  const adminRole = sanitizeSqlIdentifier(state.adminRole, 'admin');
  const managerRole = sanitizeSqlIdentifier(state.managerRole, 'product_manager');

  return [
    '-- Hammer Modding · Phase 6B SQL Blueprint',
    '-- Für Supabase SQL Editor gedacht. Vor Live-Einsatz bitte sauber prüfen.',
    '',
    `create schema if not exists ${schema};`,
    '',
    `create extension if not exists "pgcrypto";`,
    '',
    `create or replace function ${schema}.touch_updated_at()`,
    'returns trigger',
    'language plpgsql',
    'as $$',
    'begin',
    '  new.updated_at = now();',
    '  return new;',
    'end;',
    '$$;',
    '',
    `create table if not exists ${schema}.profiles (`,
    '  id uuid primary key references auth.users(id) on delete cascade,',
    '  username text unique not null,',
    '  email text,',
    '  discord_name text,',
    '  discord_id text,',
    '  cfx_identifier text,',
    `  role text not null default 'customer' check (role in ('customer', '${adminRole}', '${managerRole}')),`,
    '  is_active boolean not null default true,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `create table if not exists ${schema}.${productsTable} (`,
    '  id uuid primary key default gen_random_uuid(),',
    '  slug text unique not null,',
    '  title text not null,',
    '  category text not null,',
    '  price_cents integer not null default 0,',
    '  description text not null,',
    '  image_path text,',
    "  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),",
    '  tebex_package_id text,',
    '  created_by uuid references auth.users(id),',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `create table if not exists ${schema}.orders (`,
    '  id uuid primary key default gen_random_uuid(),',
    '  profile_id uuid references auth.users(id) on delete set null,',
    "  status text not null default 'draft' check (status in ('draft', 'pending', 'paid', 'refunded', 'cancelled')),",
    "  currency text not null default 'EUR',",
    '  total_cents integer not null default 0,',
    '  tebex_basket_id text,',
    '  tebex_transaction_id text,',
    "  custom_data jsonb not null default '{}'::jsonb,",
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `create table if not exists ${schema}.order_items (`,
    '  id uuid primary key default gen_random_uuid(),',
    '  order_id uuid not null references ' + schema + '.orders(id) on delete cascade,',
    '  product_id uuid references ' + schema + '.' + productsTable + '(id) on delete set null,',
    '  title_snapshot text not null,',
    '  unit_price_cents integer not null default 0,',
    '  quantity integer not null default 1 check (quantity > 0),',
    '  tebex_package_id text,',
    '  created_at timestamptz not null default now()',
    ');',
    '',
    `create table if not exists ${schema}.account_bindings (`,
    '  id uuid primary key default gen_random_uuid(),',
    '  profile_id uuid not null references auth.users(id) on delete cascade,',
    `  binding_mode text not null default '${state.bindingMode}',`,
    '  cfx_identifier text,',
    '  tebex_account text,',
    '  discord_id text,',
    '  is_verified boolean not null default false,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `create table if not exists ${schema}.product_submissions (`,
    '  id uuid primary key default gen_random_uuid(),',
    '  submitted_by uuid not null references auth.users(id) on delete cascade,',
    '  title text not null,',
    '  category text not null,',
    '  price_cents integer not null default 0,',
    '  description text not null,',
    '  image_path text,',
    "  review_status text not null default 'draft' check (review_status in ('draft', 'submitted', 'approved', 'rejected')),",
    '  linked_product_id uuid references ' + schema + '.' + productsTable + '(id) on delete set null,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `create table if not exists ${schema}.webhook_events (`,
    '  id uuid primary key default gen_random_uuid(),',
    '  event_type text not null,',
    "  source text not null default 'tebex',",
    "  payload jsonb not null default '{}'::jsonb,",
    '  processed boolean not null default false,',
    '  processed_at timestamptz,',
    '  created_at timestamptz not null default now()',
    ');',
    '',
    `create or replace function ${schema}.current_app_role()`,
    'returns text',
    'language sql',
    'stable',
    'as $$',
    `  select coalesce((select role from ${schema}.profiles where id = auth.uid()), 'guest');`,
    '$$;',
    '',
    `alter table ${schema}.profiles enable row level security;`,
    `alter table ${schema}.${productsTable} enable row level security;`,
    `alter table ${schema}.orders enable row level security;`,
    `alter table ${schema}.order_items enable row level security;`,
    `alter table ${schema}.account_bindings enable row level security;`,
    `alter table ${schema}.product_submissions enable row level security;`,
    `alter table ${schema}.webhook_events enable row level security;`,
    '',
    `create policy "profiles_self_select" on ${schema}.profiles for select using (auth.uid() = id or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "profiles_self_update" on ${schema}.profiles for update using (auth.uid() = id or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "products_public_read" on ${schema}.${productsTable} for select using (status = 'published' or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "products_manager_write" on ${schema}.${productsTable} for all using (${schema}.current_app_role() in ('${adminRole}', '${managerRole}')) with check (${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "orders_owner_read" on ${schema}.orders for select using (profile_id = auth.uid() or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "bindings_owner_read" on ${schema}.account_bindings for select using (profile_id = auth.uid() or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "submissions_owner_read" on ${schema}.product_submissions for select using (submitted_by = auth.uid() or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "submissions_owner_write" on ${schema}.product_submissions for insert with check (auth.uid() = submitted_by or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    `create policy "webhooks_admin_only" on ${schema}.webhook_events for select using (${schema}.current_app_role() = '${adminRole}');`,
    '',
    `create or replace trigger profiles_touch_updated_at before update on ${schema}.profiles for each row execute function ${schema}.touch_updated_at();`,
    `create or replace trigger ${productsTable}_touch_updated_at before update on ${schema}.${productsTable} for each row execute function ${schema}.touch_updated_at();`,
    `create or replace trigger account_bindings_touch_updated_at before update on ${schema}.account_bindings for each row execute function ${schema}.touch_updated_at();`,
    `create or replace trigger product_submissions_touch_updated_at before update on ${schema}.product_submissions for each row execute function ${schema}.touch_updated_at();`,
    '',
    `-- Storage Bucket Vorschlag: ${bucket}`,
    '-- Storage Policies später passend zu Rollen + Freigaben ergänzen.',
  ].join('\n');
}

function updateFoundationStatus(state) {
  const providerLabel = state.provider === 'custom' ? 'Custom' : 'Supabase';
  const dbReady = Boolean(state.projectUrl && state.anonKey);
  const dbPartial = Boolean(state.projectUrl || state.anonKey || state.projectRef);
  const authReady = Boolean(state.authProvider);
  const redirectReady = Boolean(state.siteUrl && state.redirectUrl);
  const redirectPartial = Boolean(state.siteUrl || state.redirectUrl);
  const storageReady = Boolean(state.storageBucket && state.productsTable);
  const storagePartial = Boolean(state.storageBucket || state.productsTable);
  const protectedReady = Boolean(state.adminRole && state.managerRole);
  const webhookReady = Boolean(state.webhookUrl);
  const bridgeWaiting = webhookReady && dbReady ? 'Vorbereitet' : 'Wartet';
  const connectionStatus = state.lastConnectionStatus || 'idle';
  const connectionMessage = state.lastConnectionMessage || 'Noch kein Live-Test gelaufen. Sobald Project URL und Public Anon Key eingetragen sind, kannst du die Verbindung hier prüfen.';

  setBadgeState('foundationProviderBadge', providerLabel, 'draft');
  setBadgeState('foundationDbBadge', dbReady ? 'Bereit' : dbPartial ? 'Entwurf' : 'Offen', dbReady ? 'ready' : dbPartial ? 'draft' : 'warn');
  setBadgeState('foundationRedirectBadge', redirectReady ? 'Bereit' : redirectPartial ? 'Entwurf' : 'Offen', redirectReady ? 'ready' : redirectPartial ? 'draft' : 'warn');
  setBadgeState('foundationStorageBadge', storageReady ? 'Bereit' : storagePartial ? 'Entwurf' : 'Offen', storageReady ? 'ready' : storagePartial ? 'draft' : 'warn');
  setBadgeState('foundationSqlBadge', 'Bereit', 'ready');
  setBadgeState('foundationConnectionBadge', connectionStatus === 'success' ? 'Verbunden' : connectionStatus === 'error' ? 'Fehler' : 'Nicht geprüft', connectionStatus === 'success' ? 'ready' : connectionStatus === 'error' ? 'warn' : 'draft');
  setBadgeState('foundationWebhookBadge', webhookReady ? 'Bereit' : 'Offen', webhookReady ? 'ready' : 'warn');

  setBadgeState('accountDbStatusBadge', dbReady ? 'Bereit' : dbPartial ? 'Entwurf' : 'Offen', dbReady ? 'ready' : dbPartial ? 'draft' : 'warn');
  setBadgeState('accountAuthStatusBadge', authReady ? 'Festgelegt' : 'Offen', authReady ? 'ready' : 'warn');
  setBadgeState('accountAccessStatusBadge', protectedReady ? 'Geplant' : 'Offen', protectedReady ? 'ready' : 'warn');
  setBadgeState('accountBridgeStatusBadge', bridgeWaiting, bridgeWaiting === 'Vorbereitet' ? 'ready' : 'warn');

  const summaryText = document.getElementById('foundationSummaryText');
  if (summaryText) {
    summaryText.value = buildFoundationSummary(state);
  }

  const sqlText = document.getElementById('foundationSqlText');
  if (sqlText) {
    sqlText.value = buildFoundationSqlBlueprint(state);
  }

  const connectionMessageEl = document.getElementById('foundationConnectionMessage');
  if (connectionMessageEl) {
    connectionMessageEl.textContent = connectionMessage;
    connectionMessageEl.classList.remove('foundation-helper-note-success', 'foundation-helper-note-warn');
    connectionMessageEl.classList.add(connectionStatus === 'success' ? 'foundation-helper-note-success' : connectionStatus === 'error' ? 'foundation-helper-note-warn' : 'foundation-helper-note');
  }

  hmStoreBridge.foundation = { ...state };
  hmStoreBridge.getFoundationSummary = () => buildFoundationSummary(state);
  hmStoreBridge.getFoundationSql = () => buildFoundationSqlBlueprint(state);
}

async function testFoundationConnection() {
  const current = collectFoundationStateFromUi();

  if (current.provider !== 'supabase') {
    const next = persistFoundationState({
      ...current,
      lastConnectionStatus: 'error',
      lastConnectionMessage: 'Live-Test ist aktuell nur für Supabase vorbereitet.',
      lastConnectionCheckedAt: new Date().toISOString(),
    });
    updateFoundationStatus(next);
    return { ok: false, message: next.lastConnectionMessage };
  }

  if (!current.projectUrl || !current.anonKey) {
    const next = persistFoundationState({
      ...current,
      lastConnectionStatus: 'error',
      lastConnectionMessage: 'Für den Live-Test fehlen Project URL oder Public Anon Key.',
      lastConnectionCheckedAt: new Date().toISOString(),
    });
    updateFoundationStatus(next);
    return { ok: false, message: next.lastConnectionMessage };
  }

  const cleanUrl = current.projectUrl.replace(/\/$/, '');

  try {
    const response = await fetch(`${cleanUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: current.anonKey,
        Authorization: `Bearer ${current.anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const next = persistFoundationState({
      ...current,
      lastConnectionStatus: 'success',
      lastConnectionMessage: 'Supabase antwortet. Project URL und Public Anon Key wirken erreichbar.',
      lastConnectionCheckedAt: new Date().toISOString(),
    });
    updateFoundationStatus(next);
    return { ok: true, message: next.lastConnectionMessage };
  } catch (error) {
    const next = persistFoundationState({
      ...current,
      lastConnectionStatus: 'error',
      lastConnectionMessage: `Live-Test fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`,
      lastConnectionCheckedAt: new Date().toISOString(),
    });
    updateFoundationStatus(next);
    return { ok: false, message: next.lastConnectionMessage };
  }
}

function setupFoundationPlanner() {
  const state = loadFoundationState();
  hydrateFoundationUi(state);
  updateFoundationStatus(state);

  const inputs = [
    'dbProviderSelect',
    'authProviderSelect',
    'dbProjectRefInput',
    'dbProjectUrlInput',
    'dbAnonKeyInput',
    'dbSiteUrlInput',
    'dbRedirectUrlInput',
    'dbSchemaInput',
    'dbStorageBucketInput',
    'dbProductsTableInput',
    'dbAdminRoleInput',
    'dbManagerRoleInput',
    'bindingModeSelect',
    'backendBaseUrlInput',
    'webhookUrlInput',
  ]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      const persisted = loadFoundationState();
      const live = {
        ...collectFoundationStateFromUi(),
        lastConnectionStatus: persisted.lastConnectionStatus || defaultFoundationState.lastConnectionStatus,
        lastConnectionMessage: persisted.lastConnectionMessage || '',
        lastConnectionCheckedAt: persisted.lastConnectionCheckedAt || '',
      };
      updateFoundationStatus(live);
    });
    input.addEventListener('change', () => {
      const persisted = loadFoundationState();
      const live = {
        ...collectFoundationStateFromUi(),
        lastConnectionStatus: persisted.lastConnectionStatus || defaultFoundationState.lastConnectionStatus,
        lastConnectionMessage: persisted.lastConnectionMessage || '',
        lastConnectionCheckedAt: persisted.lastConnectionCheckedAt || '',
      };
      updateFoundationStatus(live);
    });
  });
}


function getAuthElements() {
  return {
    registerForm: document.getElementById('authRegisterForm'),
    loginForm: document.getElementById('authLoginForm'),
    registerMessage: document.getElementById('authRegisterMessage'),
    loginMessage: document.getElementById('authLoginMessage'),
    sessionMessage: document.getElementById('authSessionMessage'),
    sessionEmpty: document.getElementById('authSessionEmpty'),
    sessionLive: document.getElementById('authSessionLive'),
    emailValue: document.getElementById('authUserEmailValue'),
    usernameValue: document.getElementById('authUsernameValue'),
    discordValue: document.getElementById('authDiscordValue'),
    cfxValue: document.getElementById('authCfxValue'),
    roleValue: document.getElementById('authRoleValue'),
    userIdValue: document.getElementById('authUserIdValue'),
    emailConfirmedValue: document.getElementById('authEmailConfirmedValue'),
    registerSubmitButton: document.getElementById('registerSubmitButton'),
    loginSubmitButton: document.getElementById('loginSubmitButton'),
  };
}

function setAuthMessage(element, text, type = 'neutral') {
  if (!element) return;
  element.textContent = text;
  element.classList.remove('auth-message-success', 'auth-message-warn');
  if (type === 'success') element.classList.add('auth-message-success');
  if (type === 'warn') element.classList.add('auth-message-warn');
}

function getSupabaseClient() {
  const foundation = loadFoundationState();
  const signature = `${foundation.projectUrl}|${foundation.anonKey}`;
  if (supabaseClient && supabaseClientSignature === signature) return supabaseClient;
  if (!window.supabase || !foundation.projectUrl || !foundation.anonKey) return null;

  supabaseClient = window.supabase.createClient(foundation.projectUrl, foundation.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  supabaseClientSignature = signature;
  hmStoreBridge.supabaseFoundation = { projectUrl: foundation.projectUrl, keyPresent: Boolean(foundation.anonKey) };
  return supabaseClient;
}

async function fetchLiveProfile(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) return null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, username, discord_name, cfx_identifier, role, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('schema cache')) {
        return null;
      }
      return null;
    }

    return data || null;
  } catch (error) {
    return null;
  }
}

async function upsertLiveProfile(user, profileDraft = {}) {
  const client = getSupabaseClient();
  if (!client || !user?.id) return null;

  const payload = {
    id: user.id,
    username: profileDraft.username || user.user_metadata?.username || user.email?.split('@')[0] || '',
    discord_name: profileDraft.discord_name || user.user_metadata?.discord_name || '',
    cfx_identifier: profileDraft.cfx_identifier || user.user_metadata?.cfx_identifier || '',
  };

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, username, discord_name, cfx_identifier, role, is_active')
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('schema cache')) {
        return null;
      }
      return null;
    }

    return data || null;
  } catch (error) {
    return null;
  }
}

function updateAccountStatusBadges(user, profile) {
  const foundation = loadFoundationState();
  const connectionReady = Boolean(foundation.projectUrl && foundation.anonKey);
  const roleLabel = profile?.role || (user ? 'kunde' : 'offen');

  setBadgeState('accountDbStatusBadge', connectionReady ? 'Verbunden' : 'Offen', connectionReady ? 'ready' : 'warn');
  setBadgeState('accountAuthStatusBadge', user ? 'Live' : connectionReady ? 'Bereit' : 'Offen', user ? 'ready' : connectionReady ? 'draft' : 'warn');
  setBadgeState('accountAccessStatusBadge', user ? roleLabel : 'Offen', user ? 'ready' : 'warn');
  setBadgeState('accountBridgeStatusBadge', foundation.webhookUrl ? 'Vorbereitet' : 'Wartet', foundation.webhookUrl ? 'ready' : 'warn');
}

async function refreshLiveAuthUi() {
  const elements = getAuthElements();
  const client = getSupabaseClient();

  if (!client) {
    liveAccountSnapshot = { user: null, profile: null, session: null, connectionReady: false };
    setAuthMessage(elements.sessionMessage, 'Supabase ist noch nicht vollständig konfiguriert. Trag Project URL und Public Key im Systembereich ein.', 'warn');
    updateAccountStatusBadges(null, null);
    setAccountShellUi(null, null);
    updateAccountDock(null, null);
    updateRequestDraftFields(loadVisibleCart());
    return;
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    setAuthMessage(elements.sessionMessage, `Sitzung konnte nicht geladen werden: ${error.message}`, 'warn');
  }

  const session = data?.session || null;
  const user = session?.user || null;
  if (user?.id) updateAccountActivity(user.id, { lastSeenAt: new Date().toISOString() });
  const profile = user ? await fetchLiveProfile(user.id) : null;
  liveAccountSnapshot = {
    user,
    profile,
    session,
    connectionReady: true,
  };

  const displayUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || '-';
  const displayDiscord = profile?.discord_name || user?.user_metadata?.discord_name || '-';
  const displayCfx = profile?.cfx_identifier || user?.user_metadata?.cfx_identifier || '-';
  const displayRole = profile?.role || 'kunde';
  const isConfirmed = Boolean(user?.email_confirmed_at);

  if (elements.sessionEmpty) elements.sessionEmpty.classList.toggle('hidden-section', Boolean(user));
  if (elements.sessionLive) elements.sessionLive.classList.toggle('hidden-section', !user);
  if (elements.emailValue) elements.emailValue.textContent = user?.email || '-';
  if (elements.usernameValue) elements.usernameValue.textContent = displayUsername;
  if (elements.discordValue) elements.discordValue.textContent = displayDiscord;
  if (elements.cfxValue) elements.cfxValue.textContent = displayCfx;
  if (elements.roleValue) elements.roleValue.textContent = displayRole;
  if (elements.userIdValue) elements.userIdValue.textContent = user?.id || '-';
  if (elements.emailConfirmedValue) elements.emailConfirmedValue.textContent = isConfirmed ? 'Ja' : 'Noch offen';

  if (user) {
    setAuthMessage(elements.sessionMessage, isConfirmed ? 'Sitzung aktiv. Konto ist live verbunden.' : 'Sitzung aktiv. Falls Mail-Bestätigung aktiv ist, bitte Postfach prüfen.', isConfirmed ? 'success' : 'warn');
  } else {
    setAuthMessage(elements.sessionMessage, 'Noch kein Live-Login aktiv. Registriere oder logge dich ein, um echte Konten direkt zu testen.', 'neutral');
  }

  updateAccountStatusBadges(user, profile);
  setAccountShellUi(user, profile);
  updateAccountDock(user, profile);
  updateRequestDraftFields(loadVisibleCart());
}

async function handleLiveRegister(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  const elements = getAuthElements();
  if (!client) {
    setAuthMessage(elements.registerMessage, 'Supabase ist noch nicht verbunden.', 'warn');
    return;
  }

  const username = document.getElementById('registerUsernameInput')?.value.trim() || '';
  const email = document.getElementById('registerEmailInput')?.value.trim() || '';
  const discordName = document.getElementById('registerDiscordInput')?.value.trim() || '';
  const cfxIdentifier = document.getElementById('registerCfxInput')?.value.trim() || '';
  const password = document.getElementById('registerPasswordInput')?.value || '';

  if (!username || !email || !password) {
    setAuthMessage(elements.registerMessage, 'Bitte Benutzername, E-Mail und Passwort ausfüllen.', 'warn');
    return;
  }

  if (elements.registerSubmitButton) {
    elements.registerSubmitButton.disabled = true;
    elements.registerSubmitButton.textContent = 'Erstelle Konto ...';
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          discord_name: discordName,
          cfx_identifier: cfxIdentifier,
        },
        emailRedirectTo: loadFoundationState().redirectUrl || undefined,
      },
    });

    if (error) throw error;

    if (data?.session?.user) {
      await upsertLiveProfile(data.session.user, {
        username,
        discord_name: discordName,
        cfx_identifier: cfxIdentifier,
      });
    }

    const registerForm = elements.registerForm;
    if (registerForm) registerForm.reset();
    setAuthMessage(
      elements.registerMessage,
      data?.session
        ? 'Konto erstellt und direkt live eingeloggt.'
        : 'Konto erstellt. Falls Supabase Mail-Bestätigung verlangt, bitte zuerst die E-Mail bestätigen.',
      'success',
    );
    if (data?.session?.user?.id) updateAccountActivity(data.session.user.id, { lastLoginAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() });
    await refreshLiveAuthUi();
    if (data?.session) closeAuthModal();
  } catch (error) {
    setAuthMessage(elements.registerMessage, `Registrierung fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, 'warn');
  } finally {
    if (elements.registerSubmitButton) {
      elements.registerSubmitButton.disabled = false;
      elements.registerSubmitButton.textContent = 'Konto erstellen';
    }
  }
}

async function handleLiveLogin(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  const elements = getAuthElements();
  if (!client) {
    setAuthMessage(elements.loginMessage, 'Supabase ist noch nicht verbunden.', 'warn');
    return;
  }

  const email = document.getElementById('loginEmailInput')?.value.trim() || '';
  const password = document.getElementById('loginPasswordInput')?.value || '';

  if (!email || !password) {
    setAuthMessage(elements.loginMessage, 'Bitte E-Mail und Passwort ausfüllen.', 'warn');
    return;
  }

  if (elements.loginSubmitButton) {
    elements.loginSubmitButton.disabled = true;
    elements.loginSubmitButton.textContent = 'Logge ein ...';
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user) {
      await upsertLiveProfile(data.user);
    }

    if (elements.loginForm) elements.loginForm.reset();
    setAuthMessage(elements.loginMessage, 'Login erfolgreich. Die Live-Sitzung ist aktiv.', 'success');
    if (data?.user?.id) updateAccountActivity(data.user.id, { lastLoginAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() });
    await refreshLiveAuthUi();
    closeAuthModal();
    closeAccountDropdown();
  } catch (error) {
    setAuthMessage(elements.loginMessage, `Login fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, 'warn');
  } finally {
    if (elements.loginSubmitButton) {
      elements.loginSubmitButton.disabled = false;
      elements.loginSubmitButton.textContent = 'Jetzt einloggen';
    }
  }
}

async function handleLiveLogout() {
  const client = getSupabaseClient();
  const elements = getAuthElements();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) {
    setAuthMessage(elements.sessionMessage, `Logout fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, 'warn');
    return;
  }
  setAuthMessage(elements.sessionMessage, 'Logout erfolgreich. Keine Live-Sitzung mehr aktiv.', 'success');
  closeAccountDropdown();
  await refreshLiveAuthUi();
}

function setupLiveSupabaseAuth() {
  const elements = getAuthElements();
  if (!elements.registerForm || !elements.loginForm) return;

  elements.registerForm.addEventListener('submit', handleLiveRegister);
  elements.loginForm.addEventListener('submit', handleLiveLogin);

  const client = getSupabaseClient();
  if (client) {
    client.auth.onAuthStateChange(async () => {
      await refreshLiveAuthUi();
    });
  }

  setAuthModalTab('login');
  refreshLiveAuthUi();
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
    helper.focus();
    helper.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (execError) {
      copied = false;
    }

    document.body.removeChild(helper);
    return copied;
  }
}

function setupPreparedCartButtons() {

  const buttons = document.querySelectorAll('[data-cart-add="true"]');

  buttons.forEach((button) => {
    const preparedItem = buildPreparedCartItem(button);

    if (!preparedItem) {
      button.dataset.cartReady = 'false';
      return;
    }

    button.dataset.cartReady = 'true';
    button.setAttribute('aria-label', `${preparedItem.name} zum Warenkorb hinzufügen`);

    button.addEventListener('click', () => {
      const item = buildPreparedCartItem(button);
      if (!item) return;
      addPreparedItemToCart(item);
      pulsePreparedCartButton(button);
    });
  });

  const initialCart = loadVisibleCart();
  persistVisibleCart(initialCart);
  refreshVisibleCartUi(initialCart);
}


navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    activateNav(btn.dataset.section);
    showSection(btn.dataset.section);
  });
});

document.addEventListener('click', async (e) => {
  const accountDockButton = e.target.closest('#accountDockButton');
  if (accountDockButton) {
    e.preventDefault();
    if (liveAccountSnapshot.user) {
      toggleAccountDropdown();
    } else {
      openAuthModal('login');
    }
    return;
  }

  const authOpen = e.target.closest('[data-auth-open]');
  if (authOpen) {
    e.preventDefault();
    openAuthModal(authOpen.dataset.authOpen || 'login');
    closeAccountDropdown();
    return;
  }

  const authClose = e.target.closest('[data-auth-close="true"]');
  if (authClose) {
    e.preventDefault();
    closeAuthModal();
    return;
  }

  const authTab = e.target.closest('[data-auth-tab]');
  if (authTab) {
    e.preventDefault();
    setAuthModalTab(authTab.dataset.authTab || 'login');
    return;
  }

  const accountDirect = e.target.closest('[data-account-direct]');
  if (accountDirect) {
    e.preventDefault();
    const section = accountDirect.dataset.accountDirect || 'system';
    showSection(section);
    activateNav(section);
    closeAccountDropdown();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const accountNav = e.target.closest('[data-account-nav]');
  if (accountNav) {
    e.preventDefault();
    const section = accountNav.dataset.accountNav || 'account';
    showSection(section);
    activateNav(section);
    closeAccountDropdown();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const authOverlay = e.target.closest('#authModalOverlay');
  if (authOverlay && e.target === authOverlay) {
    closeAuthModal();
    return;
  }

  const accountDropdown = document.getElementById('accountDropdown');
  const accountDock = document.getElementById('accountDock');
  if (isAccountDropdownOpen && accountDropdown && accountDock && !accountDock.contains(e.target)) {
    closeAccountDropdown();
  }

  const removeBtn = e.target.closest('[data-cart-remove-id]');
  if (removeBtn) {
    e.preventDefault();
    removeVisibleCartItem(removeBtn.dataset.cartRemoveId || '');
    return;
  }

  const clearBtn = e.target.closest('[data-cart-clear="true"]');
  if (clearBtn) {
    e.preventDefault();
    clearVisibleCart();
    return;
  }

  const requestBtn = e.target.closest('[data-cart-request="true"]');
  if (requestBtn) {
    e.preventDefault();
    openRequestModal();
    return;
  }

  const copyRequestBtn = e.target.closest('[data-copy-request="true"]');
  if (copyRequestBtn) {
    e.preventDefault();
    const copied = await copyPreparedRequestText();
    if (copied) {
      const originalText = copyRequestBtn.textContent;
      copyRequestBtn.textContent = 'Text kopiert';
      window.setTimeout(() => {
        copyRequestBtn.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const foundationSaveBtn = e.target.closest('[data-foundation-save="true"]');
  if (foundationSaveBtn) {
    e.preventDefault();
    const state = persistFoundationState(collectFoundationStateFromUi());
    updateFoundationStatus(state);
    const originalText = foundationSaveBtn.textContent;
    foundationSaveBtn.textContent = 'Entwurf gespeichert';
    window.setTimeout(() => {
      foundationSaveBtn.textContent = originalText;
    }, 1400);
    return;
  }

  const foundationCopyBtn = e.target.closest('[data-foundation-copy="true"]');
  if (foundationCopyBtn) {
    e.preventDefault();
    const summaryText = document.getElementById('foundationSummaryText')?.value || '';
    const copied = await copyTextToClipboard(summaryText);
    if (copied) {
      const originalText = foundationCopyBtn.textContent;
      foundationCopyBtn.textContent = 'Setup kopiert';
      window.setTimeout(() => {
        foundationCopyBtn.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const foundationCopySqlBtn = e.target.closest('[data-foundation-copy-sql="true"]');
  if (foundationCopySqlBtn) {
    e.preventDefault();
    const sqlText = document.getElementById('foundationSqlText')?.value || '';
    const copied = await copyTextToClipboard(sqlText);
    if (copied) {
      const originalText = foundationCopySqlBtn.textContent;
      foundationCopySqlBtn.textContent = 'SQL kopiert';
      window.setTimeout(() => {
        foundationCopySqlBtn.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const foundationTestBtn = e.target.closest('[data-foundation-test="true"]');
  if (foundationTestBtn) {
    e.preventDefault();
    const originalText = foundationTestBtn.textContent;
    foundationTestBtn.textContent = 'Prüfe Verbindung ...';
    foundationTestBtn.disabled = true;
    await testFoundationConnection();
    foundationTestBtn.textContent = 'Live-Verbindung geprüft';
    window.setTimeout(() => {
      foundationTestBtn.textContent = originalText;
      foundationTestBtn.disabled = false;
    }, 1600);
    return;
  }

  const authRefreshBtn = e.target.closest('[data-auth-refresh="true"]');
  if (authRefreshBtn) {
    e.preventDefault();
    await refreshLiveAuthUi();
    return;
  }

  const authLogoutBtn = e.target.closest('[data-auth-logout="true"]');
  if (authLogoutBtn) {
    e.preventDefault();
    await handleLiveLogout();
    return;
  }

  const openContactBtn = e.target.closest('[data-open-contact-request="true"]');
  if (openContactBtn) {
    e.preventDefault();
    openContactRequestFlow();
    return;
  }

  const closeRequestBtn = e.target.closest('[data-request-close="true"]');
  if (closeRequestBtn) {
    e.preventDefault();
    closeRequestModal();
    return;
  }

  const overlay = e.target.closest('#requestModalOverlay');
  if (overlay && e.target === overlay) {
    closeRequestModal();
    return;
  }

  const openBtn = e.target.closest('[data-open-script]');
  if (openBtn) {
    e.preventDefault();
    const originSection = openBtn.closest('#freeSection')
      ? 'free'
      : openBtn.closest('#clothingSection')
        ? 'clothing'
        : openBtn.closest('.section-home')
          ? 'home'
          : openBtn.closest('#scriptsSection')
            ? 'scripts'
            : 'scripts';
    openScriptDetail(openBtn.dataset.openScript, originSection);
    return;
  }

  const navOpen = e.target.closest('[data-nav-open]');
  if (navOpen) {
    e.preventDefault();
    const section = navOpen.dataset.navOpen;
    activateNav(section);
    showSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const backBtn = e.target.closest('[data-back]');
  if (backBtn) {
    e.preventDefault();
    goBackFromDetail();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeRequestModal();
    closeAuthModal();
    closeAccountDropdown();
  }
});

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    searchables.forEach((card) => {
      const haystack = (card.innerText + ' ' + (card.dataset.type || '')).toLowerCase();
      card.style.display = haystack.includes(q) ? '' : 'none';
    });
  });
}


setupPreparedCartButtons();
setupFoundationPlanner();
setupLiveSupabaseAuth();

showSection('home');

function setupSmoothHomeIntro() {
  const introVideo = document.querySelector('.home-hero-video[data-smooth-intro="true"]');
  const introWrap = introVideo?.closest('.hero-video-wrap');
  if (!introVideo || !introWrap) return;

  introBooting = true;
  document.body.classList.add('intro-booting');
  introWrap.classList.add('intro-booting');
  introVideo.dataset.introPending = 'true';

  let released = false;
  let revealTimer = null;

  const releaseIntro = () => {
    if (released) return;
    released = true;

    window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => {
      introVideo.dataset.introPending = 'false';
      introWrap.classList.remove('intro-booting');
      introWrap.classList.add('intro-ready');
      document.body.classList.remove('intro-booting');
      introBooting = false;
      syncVideoPlayback();
    }, 220);
  };

  const armPlayback = () => {
    if (document.hidden) return;
    if (introVideo.readyState >= 2) {
      releaseIntro();
    }
  };

  introVideo.pause();
  introVideo.currentTime = 0;

  introVideo.addEventListener('loadeddata', armPlayback, { once: true });
  introVideo.addEventListener('canplay', armPlayback, { once: true });

  if (introVideo.readyState >= 2) {
    armPlayback();
  } else {
    introVideo.load();
  }

  document.addEventListener('visibilitychange', () => {
    if (!released && !document.hidden) armPlayback();
  });
}

setupSmoothHomeIntro();

function setupMarquees() {
  const configs = [
    { selector: '.slider-track-paid', speed: 52 },
    { selector: '.slider-track-clothing', speed: 42, direction: 'reverse' },
    { selector: '.slider-track-coming', speed: 34 },
  ];

  configs.forEach((cfg) => {
    const track = document.querySelector(cfg.selector);
    if (!track) return;

    const groups = Array.from(track.querySelectorAll('.slider-group'));
    const firstGroup = groups[0];
    if (!firstGroup) return;

    const viewport = track.closest('.marquee-viewport');
    if (!viewport) return;
    watchViewport(viewport);

    const originalMarkup = groups.map((group) => group.innerHTML);
    let paused = false;
    let groupWidth = 0;
    let x = 0;
    let lastTs = 0;

    const refillGroups = () => {
      const targetWidth = Math.max(viewport.offsetWidth + 320, 1180);

      groups.forEach((group, index) => {
        group.innerHTML = originalMarkup[index];
        let safety = 0;
        while (group.scrollWidth < targetWidth && safety < 8) {
          group.insertAdjacentHTML('beforeend', originalMarkup[index]);
          safety += 1;
        }
      });
    };

    const recalc = () => {
      refillGroups();
      groupWidth = firstGroup.scrollWidth;
      x = cfg.direction === 'reverse' ? 0 : -groupWidth;
      track.style.transform = `translateX(${x}px)`;
    };

    recalc();
    window.addEventListener('resize', recalc);

    viewport.addEventListener('mouseenter', () => { paused = true; });
    viewport.addEventListener('mouseleave', () => { paused = false; });
    viewport.addEventListener('focusin', () => { paused = true; });
    viewport.addEventListener('focusout', () => { paused = false; });

    const step = (ts) => {
      if (!lastTs) lastTs = ts;

      const systemPaused = document.hidden || !isActuallyVisible(viewport) || !isInViewport(viewport);
      if (systemPaused) {
        lastTs = ts;
        requestAnimationFrame(step);
        return;
      }

      const delta = (ts - lastTs) / 1000;
      lastTs = ts;

      if (!paused && groupWidth > 0) {
        if (cfg.direction === 'reverse') {
          x -= cfg.speed * delta;
          if (x <= -groupWidth) x = 0;
        } else {
          x += cfg.speed * delta;
          if (x >= 0) x = -groupWidth;
        }
        track.style.transform = `translateX(${x}px)`;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

setupMarquees();

function setupCinematicBackground() {
  const bg = document.querySelector('.bg-cinematic');
  const debrisLayer = document.getElementById('bgDebris');
  const imageLayer = document.querySelector('.bg-image');
  const canvas = document.getElementById('lightningCanvas');
  if (!bg || !debrisLayer || !imageLayer || !canvas) return;

  const lowPowerMode =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  let w = 0;
  let h = 0;
  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.25 : 1.6));
  let activeStrikes = [];
  let flashTimer;
  let lightningRaf = null;
  let strikeBurstTimer = null;
  let mouseFrame = null;
  let targetX = 0;
  let targetY = 0;

  const resizeCanvas = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.25 : 1.6));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const weightedStartX = () => {
    const r = Math.random();
    if (r < 0.22) return w * (0.05 + Math.random() * 0.16);
    if (r < 0.44) return w * (0.22 + Math.random() * 0.12);
    if (r < 0.70) return w * (0.70 + Math.random() * 0.12);
    return w * (0.84 + Math.random() * 0.10);
  };

  const buildStrike = () => {
    let x = weightedStartX();
    let y = -40;
    const points = [{ x, y }];
    while (y < h + 40) {
      y += 48 + Math.random() * 78;
      x += (Math.random() - 0.5) * (80 + Math.random() * 90);
      x = Math.max(12, Math.min(w - 12, x));
      points.push({ x, y });
    }
    const branchStart = 1 + Math.floor(Math.random() * Math.max(2, points.length - 4));
    const branchPoints = [];
    let bx = points[branchStart].x;
    let by = points[branchStart].y;
    branchPoints.push({ x: bx, y: by });
    const branchDir = Math.random() < 0.5 ? -1 : 1;
    const branchSteps = lowPowerMode ? 2 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchSteps; i += 1) {
      by += 28 + Math.random() * 54;
      bx += branchDir * (28 + Math.random() * 58);
      branchPoints.push({ x: bx, y: by });
    }
    return {
      points,
      branchPoints,
      start: performance.now(),
      drawMs: (lowPowerMode ? 160 : 180) + Math.random() * 70,
      holdMs: (lowPowerMode ? 80 : 110) + Math.random() * 90,
      fadeMs: (lowPowerMode ? 120 : 160) + Math.random() * 90,
      width: (lowPowerMode ? 1.45 : 1.8) + Math.random() * 1.7,
      branchWidth: (lowPowerMode ? 0.9 : 1.1) + Math.random() * 1.0,
    };
  };

  const pathLength = (pts) => {
    let total = 0;
    for (let i = 1; i < pts.length; i += 1) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return total;
  };

  const drawPartialPath = (pts, progress, width, alpha, branch = false) => {
    if (progress <= 0 || pts.length < 2) return;
    const total = pathLength(pts);
    const target = total * Math.min(progress, 1);
    let travelled = 0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const seg = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      if (travelled + seg >= target) {
        const left = Math.max(0, target - travelled);
        const t = seg === 0 ? 0 : left / seg;
        ctx.lineTo(prev.x + (curr.x - prev.x) * t, prev.y + (curr.y - prev.y) * t);
        break;
      }
      ctx.lineTo(curr.x, curr.y);
      travelled += seg;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = branch ? `rgba(255,225,210,${alpha * 0.9})` : `rgba(255,248,240,${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowBlur = branch ? 14 : 22;
    ctx.shadowColor = branch ? `rgba(255,120,90,${alpha * 0.9})` : `rgba(255,80,55,${alpha})`;
    ctx.stroke();
    ctx.shadowBlur = branch ? 28 : 44;
    ctx.lineWidth = Math.max(1, width * 0.34);
    ctx.strokeStyle = branch ? `rgba(255,160,140,${alpha * 0.85})` : `rgba(255,110,90,${alpha * 0.95})`;
    ctx.stroke();
    ctx.restore();
  };

  const ensureLightningLoop = () => {
    if (lightningRaf !== null) return;
    lightningRaf = requestAnimationFrame(renderLightning);
  };

  const renderLightning = () => {
    lightningRaf = null;
    ctx.clearRect(0, 0, w, h);

    if (document.hidden) {
      activeStrikes = [];
      return;
    }

    const now = performance.now();
    activeStrikes = activeStrikes.filter((strike) => {
      const elapsed = now - strike.start;
      const total = strike.drawMs + strike.holdMs + strike.fadeMs;
      if (elapsed > total) return false;

      const drawProgress = Math.min(1, elapsed / strike.drawMs);
      let alpha = 1;
      if (elapsed > strike.drawMs + strike.holdMs) {
        const fadeT = (elapsed - strike.drawMs - strike.holdMs) / strike.fadeMs;
        alpha = 1 - Math.min(1, fadeT);
      } else if (elapsed > strike.drawMs) {
        alpha = 0.84 + Math.sin((elapsed - strike.drawMs) / 22) * 0.16;
      }

      drawPartialPath(strike.points, drawProgress, strike.width, alpha, false);
      const branchProgress = Math.max(0, (elapsed - strike.drawMs * 0.35) / (strike.drawMs * 0.75));
      drawPartialPath(strike.branchPoints, Math.min(1, branchProgress), strike.branchWidth, alpha * 0.85, true);
      return true;
    });

    if (activeStrikes.length > 0) {
      ensureLightningLoop();
    }
  };

  const triggerFlash = () => {
    bg.classList.remove('flash-active');
    void bg.offsetWidth;
    bg.classList.add('flash-active');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => bg.classList.remove('flash-active'), lowPowerMode ? 360 : 520);
  };

  const scheduleNextBurst = (delay) => {
    clearTimeout(strikeBurstTimer);
    strikeBurstTimer = setTimeout(launchStrikeBurst, delay);
  };

  const launchStrikeBurst = () => {
    if (document.hidden) {
      scheduleNextBurst(3000);
      return;
    }

    activeStrikes.push(buildStrike());
    if (!lowPowerMode && Math.random() > 0.56) {
      setTimeout(() => {
        activeStrikes.push(buildStrike());
        ensureLightningLoop();
      }, 120 + Math.random() * 140);
    }

    triggerFlash();
    ensureLightningLoop();
    const next = lowPowerMode ? 3400 + Math.random() * 2800 : 2400 + Math.random() * 3000;
    scheduleNextBurst(next);
  };

  const weightedEdgeX = () => {
    const r = Math.random();
    if (r < 0.40) return -8 + Math.random() * 22;
    if (r < 0.80) return 86 + Math.random() * 22;
    if (r < 0.90) return 12 + Math.random() * 16;
    if (r < 0.98) return 72 + Math.random() * 16;
    return 38 + Math.random() * 24;
  };

  const weightedEdgeY = () => {
    const r = Math.random();
    if (r < 0.32) return -8 + Math.random() * 22;
    if (r < 0.64) return 78 + Math.random() * 22;
    if (r < 0.82) return 10 + Math.random() * 18;
    if (r < 0.96) return 64 + Math.random() * 18;
    return 38 + Math.random() * 20;
  };

  const spawnDebris = () => {
    const count = lowPowerMode ? 24 : 46;
    debrisLayer.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('span');
      const startX = weightedEdgeX();
      const startY = weightedEdgeY();
      const centerPiece = startX > 32 && startX < 68 && startY > 28 && startY < 72;
      const frontBias = !centerPiece && Math.random() < (lowPowerMode ? 0.26 : 0.34);
      const size = centerPiece
        ? 8 + Math.random() * (lowPowerMode ? 18 : 24)
        : frontBias
          ? 16 + Math.random() * (lowPowerMode ? 44 : 66)
          : 8 + Math.random() * (lowPowerMode ? 26 : 38);
      const driftX = startX < 50 ? -18 + Math.random() * 38 : -38 + Math.random() * 18;
      const driftY = startY < 50 ? -(18 + Math.random() * 38) : -(10 + Math.random() * 28);
      const opacity = centerPiece
        ? 0.10 + Math.random() * 0.10
        : frontBias
          ? 0.20 + Math.random() * 0.28
          : 0.10 + Math.random() * 0.18;
      const duration = centerPiece
        ? 15 + Math.random() * 10
        : frontBias
          ? 12 + Math.random() * 10
          : 16 + Math.random() * 12;
      const delay = -Math.random() * duration;
      const radius = 2 + Math.random() * 8;
      const depth = centerPiece
        ? -20 + Math.random() * 30
        : frontBias
          ? 20 + Math.random() * 86
          : -26 + Math.random() * 62;

      piece.className = `debris ${Math.random() > 0.5 ? 'slow' : 'fast'} ${frontBias ? 'front' : ''}`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (0.54 + Math.random() * 0.92)}px`;
      piece.style.left = `${startX}%`;
      piece.style.top = `${startY}%`;
      piece.style.borderRadius = `${radius}px`;
      piece.style.setProperty('--sx', `${-10 + Math.random() * 20}px`);
      piece.style.setProperty('--sy', `${-8 + Math.random() * 16}px`);
      piece.style.setProperty('--ex', `${driftX * 10}px`);
      piece.style.setProperty('--ey', `${driftY * 10}px`);
      piece.style.setProperty('--r0', `${Math.random() * 180}deg`);
      piece.style.setProperty('--r1', `${180 + Math.random() * 460}deg`);
      piece.style.setProperty('--sc0', `${0.72 + Math.random() * 0.42}`);
      piece.style.setProperty('--sc1', `${0.96 + Math.random() * 0.56}`);
      piece.style.setProperty('--o', opacity.toFixed(2));
      piece.style.transform = `translateZ(${depth}px)`;
      piece.style.animation = `debrisDrift ${duration.toFixed(2)}s linear ${delay.toFixed(2)}s infinite`;
      debrisLayer.appendChild(piece);
    }
  };

  const applyPointerParallax = () => {
    mouseFrame = null;
    imageLayer.style.transform = `scale(1.12) translate3d(${targetX}px, ${targetY}px, 0)`;
    debrisLayer.style.transform = `translate3d(${targetX * 1.24}px, ${targetY * 1.24}px, 0)`;
    canvas.style.transform = `translate3d(${targetX * 0.56}px, ${targetY * 0.56}px, 0)`;
  };

  resizeCanvas();
  spawnDebris();
  scheduleNextBurst(introBooting ? 1650 : 1000);

  window.addEventListener('resize', () => {
    resizeCanvas();
    spawnDebris();
  });

  window.addEventListener('mousemove', (e) => {
    if (lowPowerMode || document.hidden || introBooting) return;
    targetX = (e.clientX / window.innerWidth - 0.5) * 10;
    targetY = (e.clientY / window.innerHeight - 0.5) * 7;
    if (mouseFrame === null) {
      mouseFrame = requestAnimationFrame(applyPointerParallax);
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      activeStrikes = [];
      ctx.clearRect(0, 0, w, h);
      bg.classList.remove('flash-active');
      syncVideoPlayback();
      return;
    }

    syncVideoPlayback();
    scheduleNextBurst(introBooting ? 1650 : 1000);
  });
}

setupCinematicBackground();
syncVideoPlayback();
