const navItems = document.querySelectorAll('.nav-item');
const homeSections = document.querySelectorAll('.section-home');
const scriptsSection = document.getElementById('scriptsSection');
const clothingSection = document.getElementById('clothingSection');
const freeSection = document.getElementById('freeSection');
const contactSection = document.getElementById('contactSection');
const accountSection = document.getElementById('accountSection');
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
const authUsersStorageKey = 'hm_store_auth_users';
const authSessionStorageKey = 'hm_store_auth_session';
const authRequestHistoryStorageKey = 'hm_store_auth_requests';
const authBridgeHistoryStorageKey = 'hm_store_auth_bridge';
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
  version: 'phase-5c-tebex-bridge',
  catalog: storeCatalog,
  lastPreparedItem: null,
});

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


function generateLocalId(prefix = 'hm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function loadAuthUsers() {
  const raw = localStorage.getItem(authUsersStorageKey);
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function persistAuthUsers(users) {
  const normalized = Array.isArray(users) ? users : [];
  try {
    localStorage.setItem(authUsersStorageKey, JSON.stringify(normalized));
  } catch (error) {
    // ignore blocked storage
  }
}

function loadAuthSessionUserId() {
  return localStorage.getItem(authSessionStorageKey) || '';
}

function persistAuthSessionUserId(userId) {
  if (!userId) {
    localStorage.removeItem(authSessionStorageKey);
    return;
  }
  localStorage.setItem(authSessionStorageKey, userId);
}

function loadAuthRequestHistory() {
  const raw = localStorage.getItem(authRequestHistoryStorageKey);
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function persistAuthRequestHistory(entries) {
  const normalized = Array.isArray(entries) ? entries : [];
  try {
    localStorage.setItem(authRequestHistoryStorageKey, JSON.stringify(normalized));
  } catch (error) {
    // ignore blocked storage
  }
}

function loadAuthBridgeHistory() {
  const raw = localStorage.getItem(authBridgeHistoryStorageKey);
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function persistAuthBridgeHistory(entries) {
  const normalized = Array.isArray(entries) ? entries : [];
  try {
    localStorage.setItem(authBridgeHistoryStorageKey, JSON.stringify(normalized));
  } catch (error) {
    // ignore blocked storage
  }
}

function getCurrentAccount() {
  const userId = loadAuthSessionUserId();
  if (!userId) return null;
  return loadAuthUsers().find((user) => user.id === userId) || null;
}

async function hashAuthPassword(value) {
  const normalized = String(value || '');

  if (window.crypto?.subtle && window.TextEncoder) {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((part) => part.toString(16).padStart(2, '0'))
      .join('');
  }

  return btoa(unescape(encodeURIComponent(normalized)));
}

function formatAuthDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getUserRequestEntries(userId) {
  if (!userId) return [];
  return loadAuthRequestHistory()
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function getUserBridgeEntries(userId) {
  if (!userId) return [];
  return loadAuthBridgeHistory()
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function setAccountFeedback(message, type = 'info') {
  const feedback = document.getElementById('accountFeedback');
  if (!feedback) return;

  if (!message) {
    feedback.textContent = '';
    feedback.classList.add('hidden');
    feedback.classList.remove('is-success', 'is-error', 'is-info');
    return;
  }

  feedback.textContent = message;
  feedback.classList.remove('hidden', 'is-success', 'is-error', 'is-info');
  feedback.classList.add(type === 'success' ? 'is-success' : type === 'error' ? 'is-error' : 'is-info');
}

function getCurrentAuthTab() {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const dashboardPanel = document.getElementById('dashboardPanel');

  if (dashboardPanel && !dashboardPanel.classList.contains('hidden-section')) return 'dashboard';
  if (registerPanel && !registerPanel.classList.contains('hidden-section')) return 'register';
  if (loginPanel && !loginPanel.classList.contains('hidden-section')) return 'login';
  return 'login';
}

function setAuthTab(tab) {
  const currentUser = getCurrentAccount();
  const resolvedTab = tab === 'dashboard' && !currentUser ? 'login' : tab;
  const panels = {
    login: document.getElementById('loginPanel'),
    register: document.getElementById('registerPanel'),
    dashboard: document.getElementById('dashboardPanel'),
  };

  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    const isActive = button.dataset.authTab === resolvedTab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  Object.entries(panels).forEach(([name, panel]) => {
    setVisible(panel, name === resolvedTab);
  });
}

function updateAccountSideCard(user) {
  const card = document.getElementById('accountSideCard');
  const badge = document.getElementById('accountSideBadge');
  const copy = document.getElementById('accountSideCopy');
  const name = document.getElementById('accountSideName');
  const requests = document.getElementById('accountSideRequests');
  const primaryButton = document.getElementById('accountSidePrimaryButton');
  const secondaryButton = document.getElementById('accountSideSecondaryButton');
  if (!card || !badge || !copy || !name || !requests || !primaryButton || !secondaryButton) return;

  if (!user) {
    card.dataset.authState = 'guest';
    badge.textContent = 'Nicht eingeloggt';
    copy.textContent = 'Melde dich an oder registriere dich, damit Anfragen direkt mit deinem Konto verknüpft werden.';
    name.textContent = 'Gast';
    requests.textContent = '0 Anfragen';
    secondaryButton.textContent = 'Anmelden';
    secondaryButton.dataset.accountOpen = 'login';
    secondaryButton.removeAttribute('data-account-logout');
    primaryButton.textContent = 'Registrieren';
    primaryButton.dataset.accountOpen = 'register';
    primaryButton.removeAttribute('data-account-logout');
    return;
  }

  const requestCount = getUserRequestEntries(user.id).length;
  const bridgeCount = getUserBridgeEntries(user.id).length;
  card.dataset.authState = 'active';
  badge.textContent = 'Eingeloggt';
  copy.textContent = 'Dein Konto ist aktiv. Anfrage-Text, E-Mail, Discord und CFX-/Tebex-Bindung werden automatisch mit übernommen.';
  name.textContent = user.displayName;
  requests.textContent = `${requestCount} ${requestCount === 1 ? 'Anfrage' : 'Anfragen'} · ${bridgeCount} ${bridgeCount === 1 ? 'Bridge' : 'Bridges'}`;
  secondaryButton.textContent = 'Konto öffnen';
  secondaryButton.dataset.accountOpen = 'dashboard';
  secondaryButton.removeAttribute('data-account-logout');
  primaryButton.textContent = 'Abmelden';
  primaryButton.dataset.accountOpen = '';
  primaryButton.setAttribute('data-account-logout', 'true');
}

function renderAccountHistoryEntry(entry) {
  const itemCount = Array.isArray(entry.items) ? entry.items.length : 0;
  return `
    <article class="account-history-item">
      <div class="account-history-top">
        <div>
          <strong>${itemCount} ${itemCount === 1 ? 'Produkt' : 'Produkte'}</strong>
          <div class="account-history-meta">
            <span>${entry.totalLabel}</span>
            <span><span class="account-history-dot" aria-hidden="true"></span>${formatAuthDate(entry.updatedAt || entry.createdAt)}</span>
          </div>
        </div>
        <small>${entry.kindLabel}</small>
      </div>
      <div class="account-history-actions">
        <button class="account-history-button" data-history-copy-id="${entry.id}" type="button">Text kopieren</button>
        <button class="account-history-button" data-history-load-id="${entry.id}" type="button">In Kontakt laden</button>
      </div>
    </article>
  `;
}

function renderAccountHistory(user) {
  const mainList = document.getElementById('accountHistoryList');
  const sideList = document.getElementById('accountSideHistoryList');
  if (!mainList || !sideList) return;

  if (!user) {
    mainList.innerHTML = '<p class="account-history-empty">Noch kein Konto aktiv.</p>';
    sideList.innerHTML = '<p class="account-history-empty">Melde dich an, damit vorbereitete Anfragen deinem Konto zugeordnet werden.</p>';
    return;
  }

  const entries = getUserRequestEntries(user.id);
  if (!entries.length) {
    mainList.innerHTML = '<p class="account-history-empty">Noch keine vorbereiteten Anfragen gespeichert.</p>';
    sideList.innerHTML = '<p class="account-history-empty">Sobald du eine Anfrage vorbereitest, erscheint sie hier.</p>';
    return;
  }

  mainList.innerHTML = entries.slice(0, 6).map(renderAccountHistoryEntry).join('');
  sideList.innerHTML = entries.slice(0, 3).map(renderAccountHistoryEntry).join('');
}

function renderBridgeHistoryEntry(entry) {
  const itemCount = Array.isArray(entry.items) ? entry.items.length : 0;
  return `
    <article class="bridge-history-item">
      <div class="bridge-history-top">
        <div>
          <strong>${entry.reference || 'HM-BRIDGE'}</strong>
          <div class="bridge-history-meta">
            <span>${itemCount} ${itemCount === 1 ? 'Produkt' : 'Produkte'}</span>
            <span><span class="account-history-dot" aria-hidden="true"></span>${entry.totalLabel}</span>
            <span><span class="account-history-dot" aria-hidden="true"></span>${formatAuthDate(entry.updatedAt || entry.createdAt)}</span>
          </div>
        </div>
        <small>${entry.stateLabel || 'Entwurf'}</small>
      </div>
    </article>
  `;
}

function renderBridgeHistory(user) {
  const mainList = document.getElementById('accountBridgeHistoryList');
  const sideList = document.getElementById('accountSideBridgeHistoryList');
  if (!mainList || !sideList) return;

  if (!user) {
    mainList.innerHTML = '<p class="account-history-empty">Noch kein Konto aktiv.</p>';
    sideList.innerHTML = '<p class="account-history-empty">Melde dich an, damit Bridge-Entwürfe deinem Konto zugeordnet werden.</p>';
    return;
  }

  const entries = getUserBridgeEntries(user.id);
  if (!entries.length) {
    mainList.innerHTML = '<p class="account-history-empty">Noch keine Tebex-Bridge Entwürfe gespeichert.</p>';
    sideList.innerHTML = '<p class="account-history-empty">Sobald du die Bridge öffnest, erscheint hier dein letzter Entwurf.</p>';
    return;
  }

  mainList.innerHTML = entries.slice(0, 6).map(renderBridgeHistoryEntry).join('');
  sideList.innerHTML = entries.slice(0, 3).map(renderBridgeHistoryEntry).join('');
}

function renderAccountDashboard(user) {
  const status = document.getElementById('accountDashboardStatus');
  const empty = document.getElementById('accountDashboardEmpty');
  const body = document.getElementById('accountDashboardBody');
  if (!status || !empty || !body) return;

  if (!user) {
    status.textContent = 'Nicht eingeloggt';
    setVisible(empty, true);
    setVisible(body, false);
    renderAccountHistory(null);
    renderBridgeHistory(null);
    return;
  }

  const requests = getUserRequestEntries(user.id);
  status.textContent = 'Lokal aktiv';
  setVisible(empty, false);
  setVisible(body, true);

  const fields = {
    accountDisplayName: user.displayName || '-',
    accountDisplayEmail: user.email || '-',
    accountDisplayDiscord: user.discord || 'Noch nicht hinterlegt',
    accountDisplayCfx: user.cfxAccount || 'Noch nicht hinterlegt',
    accountDisplayCreated: formatAuthDate(user.createdAt),
    accountDisplayLastLogin: formatAuthDate(user.lastLoginAt || user.createdAt),
    accountDisplayRequestCount: String(requests.length),
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  renderAccountHistory(user);
  renderBridgeHistory(user);
}

function getBridgeProfileState(user) {
  if (!user) {
    return {
      isReady: false,
      statusClass: 'is-locked',
      badge: 'Bridge gesperrt',
      copy: 'Melde dich an oder registriere dich, damit Tebex und CFX später sauber zugeordnet werden können.',
      missing: ['Konto'],
    };
  }

  const missing = [];
  if (!user.discord) missing.push('Discord');
  if (!user.cfxAccount) missing.push('CFX / Tebex Konto');
  if (!user.cfxIdentifier) missing.push('CFX Identifier / Lizenz');

  if (!missing.length) {
    return {
      isReady: true,
      statusClass: 'is-ready',
      badge: 'Bridge bereit',
      copy: 'Konto und Bindungsdaten sind vollständig genug für den späteren Tebex-Abschluss vorbereitet.',
      missing,
    };
  }

  return {
    isReady: false,
    statusClass: 'is-warning',
    badge: 'Daten fehlen',
    copy: `Bitte noch ergänzen: ${missing.join(', ')}.`,
    missing,
  };
}

function getCheckoutBridgeState(cart = loadVisibleCart(), user = getCurrentAccount()) {
  const items = Array.isArray(cart) ? cart : [];
  const profileState = getBridgeProfileState(user);
  const missing = [...profileState.missing];
  if (!items.length) missing.unshift('Produkte im Warenkorb');

  if (!user) {
    return {
      isReady: false,
      statusClass: 'is-locked',
      badge: 'Nicht bereit',
      copy: 'Für die Bridge brauchst du mindestens ein Produkt im Warenkorb und ein Konto mit Bindungsdaten.',
      missing,
    };
  }

  if (!items.length) {
    return {
      isReady: false,
      statusClass: 'is-warning',
      badge: 'Warenkorb fehlt',
      copy: 'Lege zuerst Produkte in den Warenkorb, damit ein Checkout-Entwurf erzeugt werden kann.',
      missing,
    };
  }

  if (!profileState.isReady) {
    return {
      isReady: false,
      statusClass: 'is-warning',
      badge: 'Bindung unvollständig',
      copy: profileState.copy,
      missing,
    };
  }

  return {
    isReady: true,
    statusClass: 'is-ready',
    badge: 'Checkout bereit',
    copy: 'Warenkorb, Konto und Bindungsdaten sind vorbereitet. Die Bridge kann später sauber an einen echten Tebex-/Backend-Flow angeschlossen werden.',
    missing: [],
  };
}

function setBridgeBadgeState(element, state) {
  if (!element || !state) return;
  element.textContent = state.badge;
  element.classList.remove('is-ready', 'is-warning', 'is-locked');
  element.classList.add(state.statusClass || 'is-locked');
}

function populateBridgeProfileForm(user) {
  const fields = {
    bridgeDiscord: user?.discord || '',
    bridgeCfx: user?.cfxAccount || '',
    bridgeIdentifier: user?.cfxIdentifier || '',
    bridgeNote: user?.bridgeNote || '',
  };

  Object.entries(fields).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (field) field.value = value;
  });
}

function updateBridgeUi(user = getCurrentAccount(), cart = loadVisibleCart()) {
  const profileState = getBridgeProfileState(user);
  const checkoutState = getCheckoutBridgeState(cart, user);

  const accountSideBridgeBadge = document.getElementById('accountSideBridgeBadge');
  const accountSideBridgeCopy = document.getElementById('accountSideBridgeCopy');
  const accountBridgeBadge = document.getElementById('accountBridgeBadge');
  const accountBridgeMissing = document.getElementById('accountBridgeMissing');
  const accountBridgeInfoBadge = document.getElementById('accountBridgeInfoBadge');
  const accountBridgeInfoCopy = document.getElementById('accountBridgeInfoCopy');
  const contactTebexBadge = document.getElementById('contactTebexBadge');
  const contactTebexCopy = document.getElementById('contactTebexCopy');
  const tebexBridgeStatusBadge = document.getElementById('tebexBridgeStatusBadge');
  const tebexBridgeStatusCopy = document.getElementById('tebexBridgeStatusCopy');

  setBridgeBadgeState(accountSideBridgeBadge, profileState);
  if (accountSideBridgeCopy) accountSideBridgeCopy.textContent = profileState.copy;

  setBridgeBadgeState(accountBridgeBadge, profileState);
  if (accountBridgeMissing) accountBridgeMissing.textContent = profileState.copy;

  setBridgeBadgeState(accountBridgeInfoBadge, checkoutState);
  if (accountBridgeInfoCopy) accountBridgeInfoCopy.textContent = checkoutState.copy;

  setBridgeBadgeState(contactTebexBadge, checkoutState);
  if (contactTebexCopy) contactTebexCopy.textContent = checkoutState.copy;

  setBridgeBadgeState(tebexBridgeStatusBadge, checkoutState);
  if (tebexBridgeStatusCopy) tebexBridgeStatusCopy.textContent = checkoutState.copy;

  populateBridgeProfileForm(user);
}

function buildTebexBridgeText(cart = loadVisibleCart(), user = getCurrentAccount(), reference = '') {
  const items = Array.isArray(cart) ? cart : [];
  const totals = getVisibleCartTotals(items);
  const checkoutState = getCheckoutBridgeState(items, user);

  const lines = [
    'Hammer Modding Tebex-Bridge',
    `Status: ${checkoutState.badge}`,
  ];

  if (reference) {
    lines.push(`Referenz: ${reference}`);
  }

  lines.push('');

  if (!items.length) {
    lines.push('Produkte:');
    lines.push('- Noch keine Produkte im Warenkorb');
  } else {
    lines.push('Produkte:');
    lines.push(...items.map((item) => `- ${item.name} | ${item.priceLabel} | ${getCartItemTypeLabel(item)}`));
  }

  lines.push('');
  lines.push(`Gesamtsumme: ${totals.totalLabel}`);
  lines.push('');
  lines.push(`Konto: ${user?.displayName || '[nicht eingeloggt]'}`);
  lines.push(`E-Mail: ${user?.email || '[bitte ergänzen]'}`);
  lines.push(`Discord: ${user?.discord || '[bitte ergänzen]'}`);
  lines.push(`CFX / Tebex Konto: ${user?.cfxAccount || '[bitte ergänzen]'}`);
  lines.push(`CFX Identifier / Lizenz: ${user?.cfxIdentifier || '[bitte ergänzen]'}`);
  lines.push(`Freischaltungs-Hinweis: ${user?.bridgeNote || '[optional]'}`);
  lines.push('');

  if (checkoutState.missing.length) {
    lines.push(`Fehlende Punkte: ${checkoutState.missing.join(', ')}`);
    lines.push('');
  }

  lines.push('Wichtiger Hinweis:');
  lines.push('Diese Bridge ist nur ein lokaler Checkout-Entwurf und noch keine Zahlung oder automatische Freischaltung.');
  lines.push('Bei echtem Ausbau soll die Freischaltung nur an genau dieses CFX-Profil / diesen Identifier gebunden werden.');

  return lines.join('\n');
}

function buildCurrentUserBridgeFingerprint(items, totalCents, user) {
  return `${items.map((item) => item.id).sort().join('|')}::${totalCents}::${user?.cfxAccount || ''}::${user?.cfxIdentifier || ''}`;
}

function saveCurrentUserBridgeDraft(cart) {
  const currentUser = getCurrentAccount();
  const items = Array.isArray(cart) ? cart : [];
  if (!currentUser || !items.length) return null;

  const totals = getVisibleCartTotals(items);
  const history = loadAuthBridgeHistory();
  const fingerprint = buildCurrentUserBridgeFingerprint(items, totals.totalCents, currentUser);
  const existing = history.find((entry) => entry.userId === currentUser.id && entry.fingerprint === fingerprint);
  const reference = existing?.reference || `HM-BRIDGE-${Date.now().toString().slice(-6)}`;
  const checkoutState = getCheckoutBridgeState(items, currentUser);
  const payloadText = buildTebexBridgeText(items, currentUser, reference);
  const payload = {
    userId: currentUser.id,
    items: items.map((item) => ({ id: item.id, name: item.name, priceLabel: item.priceLabel, type: item.type })),
    totalLabel: totals.totalLabel,
    totalCents: totals.totalCents,
    reference,
    payloadText,
    stateLabel: checkoutState.badge,
    stateClass: checkoutState.statusClass,
    fingerprint,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    history.push({
      id: generateLocalId('bridge'),
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }

  persistAuthBridgeHistory(history);
  updateAccountUi({ keepTab: true });
  return existing || history[history.length - 1];
}

async function copyPreparedBridgeText() {
  const bridgeText = buildTebexBridgeText(loadVisibleCart(), getCurrentAccount());
  if (!bridgeText) return false;

  try {
    await navigator.clipboard.writeText(bridgeText);
    return true;
  } catch (error) {
    const helper = document.createElement('textarea');
    helper.value = bridgeText;
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

function updateBridgeDraftFields(cart = loadVisibleCart()) {
  const bridgeText = buildTebexBridgeText(cart, getCurrentAccount());
  const bridgeField = document.getElementById('tebexBridgeText');
  const copyButton = document.getElementById('tebexBridgeCopyButton');
  if (bridgeField) bridgeField.value = bridgeText;
  if (copyButton) copyButton.disabled = !Array.isArray(cart) || !cart.length;
  hmStoreBridge.bridgeText = bridgeText;
  hmStoreBridge.getBridgeText = () => buildTebexBridgeText(loadVisibleCart(), getCurrentAccount());
}

function openTebexBridgeModal() {
  const overlay = document.getElementById('tebexBridgeOverlay');
  if (!overlay) return;
  const cart = loadVisibleCart();
  if (getCurrentAccount() && cart.length) saveCurrentUserBridgeDraft(cart);
  updateBridgeUi(getCurrentAccount(), cart);
  updateBridgeDraftFields(cart);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('request-modal-open');
}

function closeTebexBridgeModal() {
  const overlay = document.getElementById('tebexBridgeOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('request-modal-open');
}

function openAccountBridgeFlow() {
  closeTebexBridgeModal();
  openAccountSection(getCurrentAccount() ? 'dashboard' : 'login');
}

async function handleBridgeProfileSubmit(event) {
  event.preventDefault();
  const currentUser = getCurrentAccount();
  if (!currentUser) {
    setAccountFeedback('Bitte melde dich zuerst an, bevor du deine Bindungsdaten speicherst.', 'error');
    openAccountSection('login');
    return;
  }

  const users = loadAuthUsers();
  const target = users.find((user) => user.id === currentUser.id);
  if (!target) return;

  const discordField = document.getElementById('bridgeDiscord');
  const cfxField = document.getElementById('bridgeCfx');
  const identifierField = document.getElementById('bridgeIdentifier');
  const noteField = document.getElementById('bridgeNote');

  target.discord = discordField?.value.trim() || '';
  target.cfxAccount = cfxField?.value.trim() || '';
  target.cfxIdentifier = identifierField?.value.trim() || '';
  target.bridgeNote = noteField?.value.trim() || '';
  target.updatedAt = new Date().toISOString();

  persistAuthUsers(users);
  setAccountFeedback('Bridge-Profil gespeichert. Konto und Bindungsdaten wurden aktualisiert.', 'success');
  updateAccountUi({ keepTab: true });
}

function updateAccountUi(options = {}) {
  const currentUser = getCurrentAccount();
  updateAccountSideCard(currentUser);
  renderAccountDashboard(currentUser);
  updateRequestDraftFields(loadVisibleCart());
  updateBridgeUi(currentUser, loadVisibleCart());
  updateBridgeDraftFields(loadVisibleCart());

  hmStoreBridge.account = currentUser
    ? {
        id: currentUser.id,
        displayName: currentUser.displayName,
        email: currentUser.email,
        discord: currentUser.discord,
        cfxAccount: currentUser.cfxAccount,
        cfxIdentifier: currentUser.cfxIdentifier,
        bridgeNote: currentUser.bridgeNote,
      }
    : null;
  hmStoreBridge.getAccount = () => (getCurrentAccount() ? { ...getCurrentAccount() } : null);

  const requestedTab = options.keepTab ? getCurrentAuthTab() : currentUser ? 'dashboard' : 'login';
  setAuthTab(requestedTab);
}

function buildCurrentUserRequestFingerprint(items, totalCents) {
  return `${items.map((item) => item.id).sort().join('|')}::${totalCents}`;
}

function saveCurrentUserRequestDraft(cart) {
  const currentUser = getCurrentAccount();
  const items = Array.isArray(cart) ? cart : [];
  if (!currentUser || !items.length) return null;

  const totals = getVisibleCartTotals(items);
  const requestText = buildCartRequestText(items);
  const history = loadAuthRequestHistory();
  const fingerprint = buildCurrentUserRequestFingerprint(items, totals.totalCents);
  const existing = history.find((entry) => entry.userId === currentUser.id && entry.fingerprint === fingerprint);
  const payload = {
    userId: currentUser.id,
    items: items.map((item) => ({ id: item.id, name: item.name, priceLabel: item.priceLabel, type: item.type })),
    totalLabel: totals.totalLabel,
    totalCents: totals.totalCents,
    requestText,
    kindLabel: items.some((item) => item.type === 'clothing') && items.some((item) => item.type === 'paid-script')
      ? 'Mix'
      : items.every((item) => item.type === 'clothing')
        ? 'Kleidung'
        : 'Scripte',
    fingerprint,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    history.push({
      id: generateLocalId('request'),
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }

  persistAuthRequestHistory(history);
  updateAccountUi({ keepTab: true });
  return existing || history[history.length - 1];
}

async function copyHistoryRequestById(requestId) {
  const entry = loadAuthRequestHistory().find((candidate) => candidate.id === requestId);
  if (!entry?.requestText) return false;

  try {
    await navigator.clipboard.writeText(entry.requestText);
    return true;
  } catch (error) {
    const helper = document.createElement('textarea');
    helper.value = entry.requestText;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
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

function loadHistoryRequestIntoContact(requestId) {
  const currentUser = getCurrentAccount();
  const entry = loadAuthRequestHistory().find((candidate) => candidate.id === requestId && candidate.userId === currentUser?.id);
  if (!entry) return;
  closeRequestModal();
  activateNav('contact');
  showSection('contact');
  const contactText = document.getElementById('contactRequestText');
  if (contactText) {
    contactText.value = entry.requestText;
    contactText.focus();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const emailField = document.getElementById('loginEmail');
  const passwordField = document.getElementById('loginPassword');
  if (!emailField || !passwordField) return;

  const email = emailField.value.trim().toLowerCase();
  const password = passwordField.value;
  if (!email || !password) {
    setAccountFeedback('Bitte fülle E-Mail und Passwort aus.', 'error');
    return;
  }

  const passwordHash = await hashAuthPassword(password);
  const users = loadAuthUsers();
  const user = users.find((entry) => entry.email === email);
  if (!user || user.passwordHash !== passwordHash) {
    setAccountFeedback('Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort.', 'error');
    return;
  }

  user.lastLoginAt = new Date().toISOString();
  persistAuthUsers(users);
  persistAuthSessionUserId(user.id);
  passwordField.value = '';
  setAccountFeedback(`Willkommen zurück, ${user.displayName}.`, 'success');
  updateAccountUi({ keepTab: false });
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const displayNameField = document.getElementById('registerDisplayName');
  const emailField = document.getElementById('registerEmail');
  const discordField = document.getElementById('registerDiscord');
  const cfxField = document.getElementById('registerCfx');
  const passwordField = document.getElementById('registerPassword');
  const confirmField = document.getElementById('registerPasswordConfirm');
  if (!displayNameField || !emailField || !discordField || !cfxField || !passwordField || !confirmField) return;

  const displayName = displayNameField.value.trim();
  const email = emailField.value.trim().toLowerCase();
  const discord = discordField.value.trim();
  const cfxAccount = cfxField.value.trim();
  const password = passwordField.value;
  const passwordConfirm = confirmField.value;

  if (!displayName || !email || !password || !passwordConfirm) {
    setAccountFeedback('Bitte fülle alle Pflichtfelder aus.', 'error');
    return;
  }
  if (password.length < 6) {
    setAccountFeedback('Das Passwort sollte mindestens 6 Zeichen haben.', 'error');
    return;
  }
  if (password !== passwordConfirm) {
    setAccountFeedback('Die Passwörter stimmen nicht überein.', 'error');
    return;
  }

  const users = loadAuthUsers();
  if (users.some((user) => user.email === email)) {
    setAccountFeedback('Zu dieser E-Mail existiert bereits ein Konto.', 'error');
    return;
  }

  const now = new Date().toISOString();
  const user = {
    id: generateLocalId('user'),
    displayName,
    email,
    discord,
    cfxAccount,
    cfxIdentifier: '',
    bridgeNote: '',
    passwordHash: await hashAuthPassword(password),
    createdAt: now,
    lastLoginAt: now,
  };

  users.push(user);
  persistAuthUsers(users);
  persistAuthSessionUserId(user.id);
  event.target.reset();
  setAccountFeedback(`Konto erstellt. Willkommen, ${user.displayName}.`, 'success');
  updateAccountUi({ keepTab: false });
}

function logoutCurrentAccount() {
  persistAuthSessionUserId('');
  setAccountFeedback('Du wurdest abgemeldet.', 'success');
  updateAccountUi({ keepTab: false });
}

function openAccountSection(tab = 'login') {
  activateNav('account');
  showSection('account');
  setAuthTab(tab);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupAccountInterface() {
  const loginForm = document.getElementById('loginPanel');
  const registerForm = document.getElementById('registerPanel');
  const bridgeProfileForm = document.getElementById('bridgeProfileForm');

  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);
  if (bridgeProfileForm) bridgeProfileForm.addEventListener('submit', handleBridgeProfileSubmit);

  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setAuthTab(button.dataset.authTab || 'login');
    });
  });
}

function initializeAccountState() {
  updateAccountUi({ keepTab: false });
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

  if (!items.length) {
    return 'Wähle zuerst Produkte aus deinem Warenkorb aus.';
  }

  const currentUser = getCurrentAccount();
  const lines = [
    'Hammer Modding Bestellanfrage',
    '',
    'Gewünschte Produkte:',
    ...items.map((item) => `- ${item.name} | ${item.priceLabel} | ${getCartItemTypeLabel(item)}`),
    '',
    `Gesamtsumme: ${totals.totalLabel}`,
    '',
    `Konto: ${currentUser?.displayName || '[bitte ergänzen]'}`,
    `E-Mail: ${currentUser?.email || '[bitte ergänzen]'}`,
    `Discord-Name: ${currentUser?.discord || '[bitte ergänzen]'}`,
    `CFX-Account / Tebex-Konto: ${currentUser?.cfxAccount || '[bitte ergänzen]'}`,
    `CFX Identifier / Lizenz: ${currentUser?.cfxIdentifier || '[bitte ergänzen]'}`,
    `Zusätzliche Hinweise: ${currentUser?.bridgeNote || '[optional]'}`,
    '',
    'Bitte später über Tebex / saubere Freischaltung abwickeln.',
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

  updateBridgeDraftFields(items);

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

  saveCurrentUserRequestDraft(cart);
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

  try {
    await navigator.clipboard.writeText(requestText);
    return true;
  } catch (error) {
    const helper = document.createElement('textarea');
    helper.value = requestText;
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

function openContactRequestFlow() {
  closeRequestModal();
  closeTebexBridgeModal();
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
  updateAccountUi({ keepTab: true });
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

  const tebexOpenBtn = e.target.closest('[data-tebex-open="true"]');
  if (tebexOpenBtn) {
    e.preventDefault();
    openTebexBridgeModal();
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

  const closeTebexBtn = e.target.closest('[data-tebex-close="true"]');
  if (closeTebexBtn) {
    e.preventDefault();
    closeTebexBridgeModal();
    return;
  }

  const copyBridgeBtn = e.target.closest('[data-copy-bridge="true"]');
  if (copyBridgeBtn) {
    e.preventDefault();
    const copied = await copyPreparedBridgeText();
    if (copied) {
      const originalText = copyBridgeBtn.textContent;
      copyBridgeBtn.textContent = 'Bridge kopiert';
      window.setTimeout(() => {
        copyBridgeBtn.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const openAccountBridgeBtn = e.target.closest('[data-open-account-bridge="true"]');
  if (openAccountBridgeBtn) {
    e.preventDefault();
    openAccountBridgeFlow();
    return;
  }

  const overlay = e.target.closest('#requestModalOverlay');
  if (overlay && e.target === overlay) {
    closeRequestModal();
    return;
  }

  const tebexOverlay = e.target.closest('#tebexBridgeOverlay');
  if (tebexOverlay && e.target === tebexOverlay) {
    closeTebexBridgeModal();
    return;
  }

  const accountOpenBtn = e.target.closest('[data-account-open]');
  if (accountOpenBtn && accountOpenBtn.dataset.accountOpen) {
    e.preventDefault();
    openAccountSection(accountOpenBtn.dataset.accountOpen);
    return;
  }

  const accountLogoutBtn = e.target.closest('[data-account-logout="true"]');
  if (accountLogoutBtn) {
    e.preventDefault();
    logoutCurrentAccount();
    return;
  }

  const historyCopyBtn = e.target.closest('[data-history-copy-id]');
  if (historyCopyBtn) {
    e.preventDefault();
    const copied = await copyHistoryRequestById(historyCopyBtn.dataset.historyCopyId || '');
    if (copied) {
      const originalText = historyCopyBtn.textContent;
      historyCopyBtn.textContent = 'Text kopiert';
      window.setTimeout(() => {
        historyCopyBtn.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const historyLoadBtn = e.target.closest('[data-history-load-id]');
  if (historyLoadBtn) {
    e.preventDefault();
    loadHistoryRequestIntoContact(historyLoadBtn.dataset.historyLoadId || '');
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
setupAccountInterface();
initializeAccountState();

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
