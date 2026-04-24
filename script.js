let navItems = [];
let homeSections = [];
let scriptsSection = null;
let clothingSection = null;
let freeSection = null;
let contactSection = null;
let accountSection = null;
let systemSection = null;
let detailSections = {};
let searchInput = null;
let searchables = [];
let lastSectionBeforeDetail = 'scripts';
let appInitialized = false;
let navigationHandlersBound = false;
let searchHandlerBound = false;

const viewportVisibility = new WeakMap();
let viewportObserver = null;
let introBooting = false;

function cacheDomReferences() {
  navItems = Array.from(document.querySelectorAll('.nav-item'));
  homeSections = Array.from(document.querySelectorAll('.section-home'));
  scriptsSection = document.getElementById('scriptsSection');
  clothingSection = document.getElementById('clothingSection');
  freeSection = document.getElementById('freeSection');
  contactSection = document.getElementById('contactSection');
  accountSection = document.getElementById('accountSection');
  systemSection = document.getElementById('systemSection');
  detailSections = {
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
    'kartell-set': document.getElementById('kartellSetDetailSection'),
    'berlin-strassen-crew': document.getElementById('berlinStrassenCrewDetailSection'),
    'tuner-v2': document.getElementById('tunerV2DetailSection'),
    'weed-outfit': document.getElementById('weedOutfitDetailSection'),
    __dynamic__: document.getElementById('dynamicProductDetailSection'),
  };
  searchInput = document.getElementById('searchInput');
  searchables = Array.from(document.querySelectorAll('.searchable'));
}

const cartStorageKey = 'hm_store_cart';
const cartDraftStorageKey = 'hm_cart_draft';
const tebexPendingCheckoutStorageKey = 'hm_tebex_pending_checkout';
const storeCatalog = {
  blitzer: { id: 'blitzer-script', slug: 'blitzer', name: 'Blitzer Script', price: '15.00', priceLabel: '15,00 €', type: 'paid-script' },
  gps: { id: 'gps-system', slug: 'gps', name: 'GPS System', price: '10.00', priceLabel: '10,00 €', type: 'paid-script' },
  carplay: { id: 'carplay-system', slug: 'carplay', name: 'CarPlay System', price: '10.00', priceLabel: '10,00 €', type: 'paid-script' },
  'mechaniker-ki': { id: 'ki-mechaniker', slug: 'mechaniker-ki', name: 'KI Mechaniker', price: '10.00', priceLabel: '10,00 €', type: 'paid-script' },
  outfit: { id: 'outfit-auswahl', slug: 'outfit', name: 'Outfit-Auswahl', price: '5.00', priceLabel: '5,00 €', type: 'paid-script' },
  afk: { id: 'afk-system', slug: 'afk', name: 'AFK System', price: '0.00', priceLabel: 'Kostenlos', type: 'free-script' },
  taxi: { id: 'taxi-app-lb-phone', slug: 'taxi', name: 'Taxi App LB-Phone', price: '0.00', priceLabel: 'Kostenlos', type: 'free-script' },
  'zoll-uniform': { id: 'zoll-uniform', slug: 'zoll-uniform', name: 'Zoll-Uniform', price: '20.00', priceLabel: '20,00 €', type: 'clothing' },
  'serverteam-uniform': { id: 'serverteam-uniform', slug: 'serverteam-uniform', name: 'Serverteam-Uniform', price: '12.00', priceLabel: '12,00 €', type: 'clothing' },
  'rettungsdienst-uniform': { id: 'rettungsdienst-uniform', slug: 'rettungsdienst-uniform', name: 'Rettungsdienst-Uniform-Set', price: '20.00', priceLabel: '20,00 €', type: 'clothing' },
  'polizei-uniform': { id: 'polizei-uniform', slug: 'polizei-uniform', name: 'Polizei-Uniform', price: '25.00', priceLabel: '25,00 €', type: 'clothing' },
  'kartell-set': { id: 'kartell-set', slug: 'kartell-set', name: 'Kartell-Set', price: '25.00', priceLabel: '25,00 €', type: 'clothing' },
  'berlin-strassen-crew': { id: 'berlin-strassen-crew', slug: 'berlin-strassen-crew', name: 'Berlin Straßen-Crew', price: '19.99', priceLabel: '19,99 €', type: 'clothing' },
  'tuner-v2': { id: 'tuner-v2', slug: 'tuner-v2', name: 'TunerV2', price: '14.99', priceLabel: '14,99 €', type: 'clothing' },
  'weed-outfit': { id: 'weed-outfit', slug: 'weed-outfit', name: 'Weed-Outfit', price: '9.99', priceLabel: '9,99 €', type: 'clothing' },
};

const TEBEX_PUBLIC_TOKEN = 'xttm-f719ed0c6b0a19fbf46ef11d7ebc29d6ec480014';
const TEBEX_BACKEND_BASE_URL = 'https://hammermoddingbackend.onrender.com';
const tebexPackageMap = {
  blitzer: '7388239',
  gps: '7390338',
  carplay: '7387846',
  outfit: '7388108',
  'mechaniker-ki': '7393830',
  'polizei-uniform': '7046414',
  'zoll-uniform': '7046445',
  'serverteam-uniform': '7046450',
  'rettungsdienst-uniform': '7386459',
  taxi: '7393776',
  klingel: '7403415',
  afk: '7388518',
  'kartell-set': '7403741',
  'berlin-strassen-crew': '7405118',
  'tuner-v2': '7405362',
  'weed-outfit': '7403575',
};

Object.entries(tebexPackageMap).forEach(([slug, packageId]) => {
  if (storeCatalog[slug]) {
    storeCatalog[slug].tebexPackageId = packageId;
  }
});

const hmStoreBridge = (window.hmStoreBridge = window.hmStoreBridge || {
  version: 'phase-6h-tebex-mapping-prep',
  catalog: storeCatalog,
  tebexPublicToken: TEBEX_PUBLIC_TOKEN,
  tebexBackendBaseUrl: TEBEX_BACKEND_BASE_URL,
  tebexPackageMap,
  lastPreparedItem: null,
});

const supabaseProductPresentation = {
  'berlin-strassen-crew': {
    badge: 'Berlin Crew',
    image: 'assets/berlin-strassen-crew.png',
    priceHint: 'Kleidungs-Pack',
  },
  'tuner-v2': {
    badge: 'Tuner',
    image: 'assets/tuner-v2.png',
    priceHint: 'Kleidungs-Pack',
  },
  'weed-outfit': {
    badge: 'Hotbox',
    image: 'assets/weed-outfit.png',
    priceHint: 'Kleidungs-Pack',
  },
};

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
  discordStatus: null,
  connectionReady: false,
};
const accountActivityStorageKey = 'hm_account_activity';
let currentAuthModalMode = 'login';
let isAccountDropdownOpen = false;
let activeUsersRefreshTimer = null;
let accountPresenceTimer = null;
const accountPresenceHeartbeatMs = 60000;
let tebexResumeInFlight = false;
let tebexResumeAttempts = 0;
let tebexResumeRetryTimer = null;
let discordStatusInFlight = null;
let discordStatusCheckedAtMs = 0;
const discordStatusCacheMs = 30000;
let supabaseProductsBooted = false;
let supabaseManagedProductsCache = [];
let clothingUiSnapshot = null;
let storefrontUiSnapshot = null;
let baseProductPresentationMap = null;

const adminPortalState = {
  bound: false,
  initialized: false,
  loading: false,
  products: [],
  profiles: [],
  supportRequests: [],
  selectedProductId: '',
  selectedProductDbId: '',
  selectedProductSlug: '',
  selectedUserId: '',
  previewMode: 'detail',
  previewImageObjectUrl: '',
  previewImageObjectKey: '',
};

const adminRoleOptions = ['administrator', 'inhaberin', 'manager', 'marketing', 'supporter', 'kunde'];

const ADMIN_PREVIEW_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#18131a"/>
    </linearGradient>
    <linearGradient id="line" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="rgba(255,82,82,0.95)"/>
      <stop offset="100%" stop-color="rgba(255,82,82,0.08)"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" rx="36" fill="url(#bg)"/>
  <rect x="42" y="42" width="1116" height="716" rx="30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
  <path d="M102 130h996" stroke="url(#line)" stroke-width="6" stroke-linecap="round"/>
  <path d="M102 670h996" stroke="url(#line)" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
  <circle cx="600" cy="340" r="118" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
  <path d="M542 370l50-54 45 42 74-76" fill="none" stroke="rgba(255,82,82,0.95)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="600" y="535" text-anchor="middle" fill="rgba(255,255,255,0.94)" font-family="Arial, sans-serif" font-size="54" font-weight="700">Bildvorschau</text>
  <text x="600" y="585" text-anchor="middle" fill="rgba(255,255,255,0.42)" font-family="Arial, sans-serif" font-size="24">URL oder Upload wird hier live angezeigt</text>
</svg>
`)}`;

const HM_PRODUCT_DETAIL_PREFIX = '__HM_DETAIL__';

function getProductTypeLabel(type, category = '') {
  const normalizedType = getNormalizedRole(type);
  const normalizedCategory = getNormalizedRole(category);
  if (normalizedType === 'clothing' || normalizedCategory === 'clothing') return 'Kleidungs-Pack';
  if (normalizedType === 'script' || normalizedCategory === 'scripts') return 'Script';
  if (normalizedType === 'free_script' || normalizedCategory === 'free_scripts') return 'Free Script';
  if (normalizedType === 'preview') return 'Preview';
  return 'Produkt';
}

function getDetailPageTagLabel(product = {}) {
  const normalizedCategory = getNormalizedRole(product.category);
  if (normalizedCategory === 'clothing') return 'Kleidungs-Detailseite';
  if (normalizedCategory === 'scripts') return 'Script-Detailseite';
  if (normalizedCategory === 'free_scripts') return 'Free-Script-Detailseite';
  return 'Produkt-Detailseite';
}

function getDefaultQuickFacts(product = {}) {
  const normalizedCategory = getNormalizedRole(product.category);
  const typeLabel = getProductTypeLabel(product.product_type, product.category);
  const priceLabel = formatSupabasePriceLabel(product.price_eur || 0);
  const facts = [
    { label: 'Preis', value: priceLabel },
    {
      label: 'Bereich',
      value: normalizedCategory === 'clothing'
        ? 'Outfit / Kleidung'
        : normalizedCategory === 'scripts'
          ? 'Script / System'
          : normalizedCategory === 'free_scripts'
            ? 'Kostenlos / Script'
            : typeLabel,
    },
    {
      label: 'Für',
      value: normalizedCategory === 'clothing' ? 'Männer & Frauen' : 'FiveM / Server',
    },
  ];
  return facts.filter((entry) => entry.label && entry.value).slice(0, 4);
}

function normalizeStoredProductDetail(detail = {}) {
  const source = detail && typeof detail === 'object' ? detail : {};
  return {
    version: 1,
    detailTitle: String(source.detailTitle || '').trim(),
    detailHeadline: String(source.detailHeadline || '').trim(),
    detailIntro: String(source.detailIntro || '').trim(),
    detailPriceHint: String(source.detailPriceHint || '').trim(),
    detailFeatureIntro: String(source.detailFeatureIntro || '').trim(),
    detailPart01: String(source.detailPart01 || '').trim(),
    detailPart02: String(source.detailPart02 || '').trim(),
    detailPart03: String(source.detailPart03 || '').trim(),
    detailEinsatz: String(source.detailEinsatz || '').trim(),
    detailLook: String(source.detailLook || '').trim(),
    detailNutzen: String(source.detailNutzen || '').trim(),
    detailSideImageUrl: String(source.detailSideImageUrl || '').trim(),
    quickFacts: Array.isArray(source.quickFacts)
      ? source.quickFacts
          .map((entry) => ({
            label: String(entry?.label || '').trim(),
            value: String(entry?.value || '').trim(),
          }))
          .filter((entry) => entry.label || entry.value)
          .slice(0, 4)
      : [],
  };
}

function hasMeaningfulProductDetail(detail = {}) {
  return Boolean(
    detail.detailTitle
    || detail.detailHeadline
    || detail.detailIntro
    || detail.detailPriceHint
    || detail.detailFeatureIntro
    || detail.detailPart01
    || detail.detailPart02
    || detail.detailPart03
    || detail.detailEinsatz
    || detail.detailLook
    || detail.detailNutzen
    || detail.detailSideImageUrl
    || (Array.isArray(detail.quickFacts) && detail.quickFacts.length)
  );
}

function decodeStoredProductDetail(rawValue) {
  if (!rawValue) return null;
  if (typeof rawValue === 'object') {
    const normalized = normalizeStoredProductDetail(rawValue);
    return hasMeaningfulProductDetail(normalized) ? normalized : null;
  }

  const raw = String(rawValue || '').trim();
  if (!raw) return null;

  const jsonText = raw.startsWith(HM_PRODUCT_DETAIL_PREFIX)
    ? raw.slice(HM_PRODUCT_DETAIL_PREFIX.length)
    : raw.startsWith('{')
      ? raw
      : '';
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    const normalized = normalizeStoredProductDetail(parsed);
    return hasMeaningfulProductDetail(normalized) ? normalized : null;
  } catch (error) {
    return null;
  }
}

function encodeStoredProductDetail(detail = {}) {
  return `${HM_PRODUCT_DETAIL_PREFIX}${JSON.stringify(normalizeStoredProductDetail(detail))}`;
}

function getStoredProductDetail(product = {}) {
  return decodeStoredProductDetail(product.detail_data)
    || decodeStoredProductDetail(product.detail_config)
    || decodeStoredProductDetail(product.full_description);
}
function resolveProductDetailConfig(product = {}) {
  const stored = getStoredProductDetail(product);
  const plainIntro = stored ? String(stored.detailIntro || '').trim() : String(product.full_description || '').trim();
  const fallbackTitle = String(product.title || '').trim();
  const fallbackHeadline = String(product.short_description || '').trim() || fallbackTitle;
  const fallbackPriceHint = getProductTypeLabel(product.product_type, product.category);
  const fallbackImage = String(product.image_url || '').trim() || 'assets/content.png';
  const quickFacts = (stored?.quickFacts || []).map((entry) => ({
    label: String(entry?.label || '').trim(),
    value: String(entry?.value || '').trim(),
  })).filter((entry) => entry.label || entry.value);

  return {
    detailTitle: String(stored?.detailTitle || fallbackTitle).trim(),
    detailHeadline: String(stored?.detailHeadline || fallbackHeadline).trim(),
    detailIntro: plainIntro || String(product.short_description || '').trim(),
    detailPriceHint: String(stored?.detailPriceHint || fallbackPriceHint).trim(),
    detailFeatureIntro: String(stored?.detailFeatureIntro || product.short_description || '').trim(),
    detailPart01: String(stored?.detailPart01 || '').trim(),
    detailPart02: String(stored?.detailPart02 || '').trim(),
    detailPart03: String(stored?.detailPart03 || '').trim(),
    detailEinsatz: String(stored?.detailEinsatz || '').trim(),
    detailLook: String(stored?.detailLook || '').trim(),
    detailNutzen: String(stored?.detailNutzen || '').trim(),
    detailSideImageUrl: String(stored?.detailSideImageUrl || fallbackImage).trim(),
    quickFacts: quickFacts.length ? quickFacts : getDefaultQuickFacts(product),
  };
}

function buildDetailPayloadFromAdminForm(elements, product = {}) {
  const quickFacts = [1, 2, 3, 4].map((index) => ({
    label: String(elements[`detailQuick${index}Label`]?.value || '').trim(),
    value: String(elements[`detailQuick${index}Value`]?.value || '').trim(),
  })).filter((entry) => entry.label || entry.value);

  return {
    detailTitle: String(elements.detailTitle?.value || product.title || '').trim(),
    detailHeadline: String(elements.detailHeadline?.value || product.short_description || product.title || '').trim(),
    detailIntro: String(elements.productFull?.value || '').trim(),
    detailPriceHint: String(elements.detailPriceHint?.value || '').trim(),
    detailFeatureIntro: String(elements.detailFeatureIntro?.value || '').trim(),
    detailPart01: String(elements.detailPart01?.value || '').trim(),
    detailPart02: String(elements.detailPart02?.value || '').trim(),
    detailPart03: String(elements.detailPart03?.value || '').trim(),
    detailEinsatz: String(elements.detailEinsatz?.value || '').trim(),
    detailLook: String(elements.detailLook?.value || '').trim(),
    detailNutzen: String(elements.detailNutzen?.value || '').trim(),
    detailSideImageUrl: String(elements.detailSideImageUrl?.value || '').trim(),
    quickFacts,
  };
}

function hasDynamicProductDetail(product = {}) {
  if (!product || !product.slug) return false;
  const config = resolveProductDetailConfig(product);
  return Boolean(
    config.detailTitle
    || config.detailHeadline
    || config.detailIntro
    || config.detailFeatureIntro
    || config.detailPart01
    || config.detailPart02
    || config.detailPart03
    || config.detailEinsatz
    || config.detailLook
    || config.detailNutzen
    || config.quickFacts.length
  );
}

function getAdminProductPreviewCopy(product = {}) {
  const config = resolveProductDetailConfig(product);
  return String(product.short_description || config.detailIntro || '').trim();
}

function getSupabaseManagedProductBySlug(slug) {
  return supabaseManagedProductsCache.find((entry) => entry.slug === slug) || null;
}

function getDynamicDetailElements() {
  return {
    section: detailSections.__dynamic__ || document.getElementById('dynamicProductDetailSection'),
    tag: document.getElementById('dynamicDetailTag'),
    eyebrow: document.getElementById('dynamicDetailEyebrow'),
    heading: document.getElementById('dynamicDetailHeading'),
    intro: document.getElementById('dynamicDetailIntro'),
    price: document.getElementById('dynamicDetailPrice'),
    priceHint: document.getElementById('dynamicDetailPriceHint'),
    mainImage: document.getElementById('dynamicDetailMainImage'),
    sideImage: document.getElementById('dynamicDetailSideImage'),
    featureIntro: document.getElementById('dynamicDetailFeatureIntro'),
    featuresGrid: document.getElementById('dynamicDetailFeaturesGrid'),
    facts: document.getElementById('dynamicDetailFacts'),
    cartButton: document.getElementById('dynamicDetailCartButton'),
  };
}

function populateDynamicProductDetail(product) {
  const elements = getDynamicDetailElements();
  if (!product || !elements.section) return;
  const config = resolveProductDetailConfig(product);
  const mainImage = String(product.image_url || '').trim() || 'assets/content.png';
  const sideImage = String(config.detailSideImageUrl || mainImage).trim() || mainImage;
  const headingMain = escapeHtml(config.detailTitle || product.title || 'PRODUKT');
  const headingSub = escapeHtml(config.detailHeadline || product.short_description || product.title || 'DETAILSEITE');

  if (elements.tag) elements.tag.textContent = `${getDetailPageTagLabel(product)} · ${product.title || 'Produkt'}`;
  if (elements.eyebrow) elements.eyebrow.textContent = `Hammer Modding · ${product.title || 'Produkt'}`;
  if (elements.heading) elements.heading.innerHTML = `${headingMain}<br><span>${headingSub}</span>`;
  if (elements.intro) elements.intro.textContent = config.detailIntro || 'Für dieses Produkt wurde noch kein Detailtext gepflegt.';
  if (elements.price) elements.price.textContent = formatSupabasePriceLabel(product.price_eur || 0);
  if (elements.priceHint) elements.priceHint.textContent = config.detailPriceHint || getProductTypeLabel(product.product_type, product.category);

  if (elements.mainImage) {
    elements.mainImage.src = mainImage;
    elements.mainImage.alt = `${product.title || 'Produkt'} Vorschau`;
  }
  if (elements.sideImage) {
    elements.sideImage.src = sideImage;
    elements.sideImage.alt = `${product.title || 'Produkt'} Detailbild`;
  }
  if (elements.featureIntro) {
    elements.featureIntro.textContent = config.detailFeatureIntro || 'Hier erscheinen automatisch die gepflegten Produktdetails.';
  }

  if (elements.featuresGrid) {
    const featureItems = [
      { label: 'Teil 01', value: config.detailPart01 },
      { label: 'Teil 02', value: config.detailPart02 },
      { label: 'Teil 03', value: config.detailPart03 },
      { label: 'Einsatz', value: config.detailEinsatz },
      { label: 'Look', value: config.detailLook },
      { label: 'Nutzen', value: config.detailNutzen },
    ].filter((entry) => entry.value);

    elements.featuresGrid.innerHTML = (featureItems.length ? featureItems : [
      { label: 'Hinweis', value: 'Für dieses Produkt wurden noch keine Detailkarten gepflegt.' },
    ]).map((entry) => `
      <article class="feature-sale-item">
        <div class="feature-sale-badge">${escapeHtml(entry.label)}</div>
        <p>${escapeHtml(entry.value)}</p>
      </article>
    `).join('');
  }

  if (elements.facts) {
    const facts = (config.quickFacts.length ? config.quickFacts : getDefaultQuickFacts(product)).slice(0, 4);
    elements.facts.innerHTML = facts.map((entry) => `
      <div class="fact-box">
        <strong>${escapeHtml(entry.label || 'Info')}</strong>
        <span>${escapeHtml(entry.value || '—')}</span>
      </div>
    `).join('');
  }

  if (elements.cartButton) {
    const catalogItem = getCatalogItem(product.slug) || storeCatalog[product.slug] || {};
    elements.cartButton.dataset.productId = catalogItem.id || product.slug;
    elements.cartButton.dataset.productName = product.title || '';
    elements.cartButton.dataset.productPrice = formatSupabasePriceValue(product.price_eur || 0);
    elements.cartButton.dataset.productPriceLabel = formatSupabasePriceLabel(product.price_eur || 0);
    elements.cartButton.dataset.productSlug = product.slug || '';
    elements.cartButton.dataset.productType = catalogItem.type || (product.category === 'clothing' ? 'clothing' : 'paid-script');
  }
}

function openDynamicProductDetail(slug, originSection = 'scripts') {
  const product = getSupabaseManagedProductBySlug(String(slug || '').trim());
  if (!product) return;
  if (!Object.keys(detailSections).length) cacheDomReferences();
  populateDynamicProductDetail(product);
  lastSectionBeforeDetail = originSection;
  const backButton = document.getElementById('backToDynamicProduct');
  if (backButton) {
    backButton.textContent = originSection === 'clothing'
      ? '← Zurück zur Kleidung'
      : originSection === 'free'
        ? '← Zurück zu Free Scripts'
        : originSection === 'home'
          ? '← Zurück zur Startseite'
          : '← Zurück zu Scripten';
  }
  homeSections.forEach((el) => (el.style.display = 'none'));
  setVisible(scriptsSection, false);
  setVisible(clothingSection, false);
  setVisible(freeSection, false);
  setVisible(accountSection, false);
  setVisible(systemSection, false);
  setVisible(contactSection, false);
  hideAllDetails();
  setVisible(detailSections.__dynamic__, true);
  activateNav(originSection === 'home' ? 'home' : originSection === 'free' ? 'free' : originSection === 'clothing' ? 'clothing' : 'scripts');
  syncVideoPlayback();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
  isAccountDropdownOpen = false;
}

function openAccountDropdown() {
  isAccountDropdownOpen = false;
}

function toggleAccountDropdown() {
  isAccountDropdownOpen = false;
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
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  const overlay = document.getElementById('authModalOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden-section');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function scheduleAuthModalClose(delay = 0) {
  window.setTimeout(() => {
    closeAuthModal();
    closeAccountDropdown();
  }, delay);
}

function formatLastPurchase(profile, activity) {
  const label = profile?.last_purchase_label || activity?.lastPurchaseName || '';
  const date = profile?.last_purchase_at || activity?.lastPurchaseAt || '';
  if (!label && !date) return '—';
  if (label && date) return `${label} · ${formatRelativeDate(date)}`;
  return label || formatRelativeDate(date);
}

function getNormalizedRole(role) {
  return String(role || '').trim().toLowerCase();
}

function mapRoleLabel(role) {
  const normalized = getNormalizedRole(role);
  if (normalized === 'administrator' || normalized === 'admin') return 'Administrator';
  if (normalized === 'inhaberin' || normalized === 'owner') return 'Inhaberin';
  if (normalized === 'manager') return 'Manager';
  if (normalized === 'marketing') return 'Marketing';
  if (normalized === 'supporter') return 'Supporter';
  if (normalized === 'developer' || normalized === 'entwickler') return 'Entwickler';
  if (normalized === 'designer') return 'Designer';
  if (normalized === 'partner') return 'Partner';
  if (normalized === 'customer' || normalized === 'kunde') return 'Kunde';
  if (normalized === 'guest' || normalized === 'gast') return 'Gast';
  return role || 'Gast';
}

function getAdminPermissions(role) {
  const normalized = getNormalizedRole(role);
  return {
    role: normalized,
    canAccessPortal: ['administrator', 'inhaberin', 'manager', 'marketing', 'supporter'].includes(normalized),
    canViewProducts: ['administrator', 'inhaberin', 'manager', 'marketing'].includes(normalized),
    canEditProducts: ['administrator', 'inhaberin', 'manager', 'marketing'].includes(normalized),
    canDeleteProducts: ['administrator', 'inhaberin', 'manager'].includes(normalized),
    canViewUsers: normalized === 'administrator',
    canManageRoles: normalized === 'administrator',
    canViewSupport: ['administrator', 'inhaberin', 'manager', 'supporter'].includes(normalized),
    canEditSupport: ['administrator', 'inhaberin', 'manager', 'supporter'].includes(normalized),
  };
}


function formatPresenceTime(value) {
  if (!value) return 'gerade eben';
  return formatRelativeDate(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPresenceRoleToneClass(role) {
  const normalized = getNormalizedRole(role);
  if (normalized === 'administrator' || normalized === 'admin') return 'is-admin';
  if (normalized === 'inhaberin' || normalized === 'owner') return 'is-owner';
  if (normalized === 'manager') return 'is-owner';
  if (normalized === 'marketing') return 'is-designer';
  if (normalized === 'supporter') return 'is-partner';
  if (normalized === 'developer' || normalized === 'entwickler') return 'is-developer';
  if (normalized === 'designer') return 'is-designer';
  if (normalized === 'partner') return 'is-partner';
  if (normalized === 'customer' || normalized === 'kunde') return 'is-customer';
  return 'is-guest';
}

function setPresenceCounter(targetId, count) {
  const counterId = targetId === 'activeUsersList' ? 'activeUsersCountBadge' : 'recentUsersCountBadge';
  const counter = document.getElementById(counterId);
  if (!counter) return;
  if (targetId === 'activeUsersList') {
    counter.textContent = `${count} ${count === 1 ? 'online' : 'online'}`;
  } else {
    counter.textContent = `${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`;
  }
}

function renderPresenceUsers(targetId, users = [], emptyText = 'Keine Einträge.', options = {}) {
  const list = document.getElementById(targetId);
  if (!list) return;
  const { showOnlineDot = false, recent = false } = options;
  const safeUsers = Array.isArray(users) ? users : [];
  setPresenceCounter(targetId, safeUsers.length);
  if (!safeUsers.length) {
    list.innerHTML = `<div class="active-users-empty">${escapeHtml(emptyText)}</div>`;
    return;
  }

  list.innerHTML = safeUsers
    .map((user) => {
      const name = user.username || 'User';
      const safeName = escapeHtml(name);
      const role = mapRoleLabel(user.role || 'customer');
      const safeRole = escapeHtml(role);
      const roleToneClass = getPresenceRoleToneClass(user.role || 'customer');
      const initial = escapeHtml(getDisplayInitial(name, 'HM'));
      const presencePill = showOnlineDot
        ? '<span class="active-user-presence-pill is-live"><span class="active-user-presence-pulse"></span>Live</span>'
        : '<span class="active-user-presence-pill is-recent">Offline</span>';
      const safeAvatarUrl = String(user.avatar_url || '').trim();
      const avatar = safeAvatarUrl
        ? `<img src="${escapeHtml(safeAvatarUrl)}" alt="${safeName}" loading="lazy" decoding="async">`
        : `<strong>${initial}</strong>`;
      const timeBlock = '';
      return `
        <div class="active-user-row${recent ? ' is-recent' : ' is-live'}">
          <div class="active-user-avatar">${avatar}${showOnlineDot ? '<span class="active-user-dot"></span>' : ''}</div>
          <div class="active-user-meta">
            <div class="active-user-topline">
              <div class="active-user-name-wrap">
                <div class="active-user-name">${safeName}</div>
                ${presencePill}
              </div>
            </div>
            <div class="active-user-bottomline">
              <div class="active-user-role ${roleToneClass}">${safeRole}</div>
              ${timeBlock}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function refreshActiveUsersUi() {
  const activeList = document.getElementById('activeUsersList');
  const recentList = document.getElementById('recentUsersList');
  if (!activeList && !recentList) return;
  const client = getSupabaseClient();
  if (!client) {
    renderPresenceUsers('activeUsersList', [], 'Gerade ist niemand online.', { showOnlineDot: true });
    renderPresenceUsers('recentUsersList', [], 'Noch keine Aktivität vorhanden.', { recent: true });
    return;
  }

  try {
    const [{ data: activeData, error: activeError }, { data: recentData, error: recentError }] = await Promise.all([
      client.rpc('get_active_users'),
      client.rpc('get_recent_users'),
    ]);

    renderPresenceUsers(
      'activeUsersList',
      !activeError && Array.isArray(activeData) ? activeData : [],
      'Gerade ist niemand online.',
      { showOnlineDot: true },
    );
    renderPresenceUsers(
      'recentUsersList',
      !recentError && Array.isArray(recentData) ? recentData : [],
      'Noch keine Aktivität vorhanden.',
      { recent: true },
    );
  } catch (error) {
    renderPresenceUsers('activeUsersList', [], 'Gerade ist niemand online.', { showOnlineDot: true });
    renderPresenceUsers('recentUsersList', [], 'Noch keine Aktivität vorhanden.', { recent: true });
  }
}

function setupActiveUsersRefresh() {
  window.clearInterval(activeUsersRefreshTimer);
  refreshActiveUsersUi();
  activeUsersRefreshTimer = window.setInterval(refreshActiveUsersUi, 60000);
}

function setupPresenceHeartbeat() {
  window.clearInterval(accountPresenceTimer);
  const user = liveAccountSnapshot.user;
  if (!user?.id) return;
  accountPresenceTimer = window.setInterval(() => {
    patchLiveProfile(user.id, { last_seen_at: new Date().toISOString() }).then((profile) => {
      if (profile) {
        liveAccountSnapshot.profile = profile;
        setAccountShellUi(liveAccountSnapshot.user, profile);
        updateAccountDock(liveAccountSnapshot.user, profile);
      }
      refreshActiveUsersUi();
    });
  }, accountPresenceHeartbeatMs);
}

function setAccountShellUi(user, profile) {
  const discordStatus = liveAccountSnapshot.discordStatus || null;
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Nicht eingeloggt';
  const displayRole = mapRoleLabel(profile?.role || (user ? 'customer' : 'guest'));
  const displayMail = user?.email || 'Keine aktive Sitzung';
  const initial = getDisplayInitial(displayName);
  const activity = user?.id ? getAccountActivity(user.id) : null;
  const onlineNow = Boolean(user);
  const lastSeen = profile?.last_seen_at || activity?.lastSeenAt || '';
  const lastLogin = profile?.last_login_at || activity?.lastLoginAt || '';
  const profileSubline = !user
    ? 'Website-Konto'
    : discordStatus?.inGuild
      ? 'Konto aktiv · Discord verifiziert'
      : discordStatus?.connected
        ? 'Konto aktiv · Discord verbunden'
        : 'Konto aktiv';

  const mapText = [
    ['accountProfileAvatarInitial', initial],
    ['accountProfileName', displayName],
    ['accountProfileSubline', profileSubline],
    ['accountProfileRolePill', displayRole],
    ['accountProfileMailPill', displayMail],
    ['accountOnlineNowValue', '●'],
    ['accountLastOnlineValue', lastSeen ? formatRelativeDate(lastSeen) : '-'],
    ['accountLastLoginValue', lastLogin ? formatRelativeDate(lastLogin) : '-'],
    ['accountLastPurchaseValue', formatLastPurchase(profile, activity)],
  ];

  mapText.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  syncAccountAvatarViews(user, profile);

  const statusDotIds = ['accountProfileStatusDot', 'accountDockStatusDot'];
  statusDotIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('account-status-online', onlineNow);
    el.classList.toggle('account-status-offline', !onlineNow);
  });

  const onlineIndicator = document.getElementById('accountOnlineNowValue');
  if (onlineIndicator) {
    onlineIndicator.dataset.online = onlineNow ? 'true' : 'false';
    onlineIndicator.setAttribute('aria-label', onlineNow ? 'Online' : 'Offline');
    onlineIndicator.title = onlineNow ? 'Online' : 'Offline';
  }

  const logoutButton = document.getElementById('accountInlineLogoutButton');
  if (logoutButton) logoutButton.classList.toggle('hidden-section', !user);

  const authActions = document.getElementById('accountAuthActions');
  if (authActions) authActions.classList.toggle('hidden-section', Boolean(user));
}

function updateAccountDock(user, profile) {
  const discordStatus = liveAccountSnapshot.discordStatus || null;
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Login / Registrieren';
  const initial = getDisplayInitial(displayName);
  const meta = user
    ? `${mapRoleLabel(profile?.role || 'customer')} · ${discordStatus?.inGuild ? 'discord ok' : discordStatus?.connected ? 'discord verbunden' : 'online'}`
    : 'Website-Konto';
  const map = [
    ['accountDockAvatarInitial', initial],
    ['accountDockEyebrow', user ? meta : 'Website-Konto'],
    ['accountDockName', displayName],
  ];
  map.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function getProfileEditorElements() {
  return {
    form: document.getElementById('profileEditorForm'),
    usernameInput: document.getElementById('profileUsernameInput'),
    discordInput: document.getElementById('profileDiscordInput'),
    cfxInput: document.getElementById('profileCfxInput'),
    avatarInput: document.getElementById('profileAvatarInput'),
    avatarFileInput: document.getElementById('profileAvatarFileInput'),
    avatarPreview: document.getElementById('profileAvatarPreview'),
    avatarPreviewImage: document.getElementById('profileAvatarPreviewImage'),
    avatarPreviewInitial: document.getElementById('profileAvatarPreviewInitial'),
    avatarUploadName: document.getElementById('profileAvatarUploadName'),
    avatarClearButton: document.getElementById('profileAvatarClearButton'),
    message: document.getElementById('profileEditorMessage'),
    saveButton: document.getElementById('profileSaveButton'),
  };
}

const avatarUploadMaxFileSize = 6 * 1024 * 1024;
const avatarUploadOutputSize = 320;

function setCircleAvatarState(container, image, initialElement, avatarUrl = '', initial = 'HM', altText = 'Profilbild') {
  if (initialElement) initialElement.textContent = initial || 'HM';
  if (!container || !image) return;

  const normalizedUrl = String(avatarUrl || '').trim();
  const hasImage = Boolean(normalizedUrl);
  container.classList.toggle('has-image', hasImage);

  if (hasImage) {
    image.src = normalizedUrl;
    image.alt = altText;
    image.hidden = false;
  } else {
    image.removeAttribute('src');
    image.hidden = true;
  }
}

function syncAccountAvatarViews(user, profile) {
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Hammer Modding';
  const initial = getDisplayInitial(displayName, 'HM');
  const avatarUrl = profile?.avatar_url || '';

  setCircleAvatarState(
    document.getElementById('accountProfileAvatar'),
    document.getElementById('accountProfileAvatarImage'),
    document.getElementById('accountProfileAvatarInitial'),
    avatarUrl,
    initial,
    `${displayName} Profilbild`,
  );

  setCircleAvatarState(
    document.getElementById('accountDockAvatar'),
    document.getElementById('accountDockAvatarImage'),
    document.getElementById('accountDockAvatarInitial'),
    avatarUrl,
    initial,
    `${displayName} Profilbild`,
  );
}

function updateProfileAvatarPreview(avatarUrl = '', displayName = '') {
  const elements = getProfileEditorElements();
  const name = String(displayName || elements.usernameInput?.value || liveAccountSnapshot.profile?.username || liveAccountSnapshot.user?.user_metadata?.username || liveAccountSnapshot.user?.email?.split('@')[0] || 'HM').trim();
  const initial = getDisplayInitial(name, 'HM');
  const normalizedUrl = String(avatarUrl || '').trim();

  if (elements.avatarPreviewInitial) {
    elements.avatarPreviewInitial.textContent = initial;
  }
  if (elements.avatarPreview) {
    elements.avatarPreview.classList.toggle('has-image', Boolean(normalizedUrl));
  }
  if (elements.avatarPreviewImage) {
    if (normalizedUrl) {
      elements.avatarPreviewImage.src = normalizedUrl;
      elements.avatarPreviewImage.hidden = false;
    } else {
      elements.avatarPreviewImage.removeAttribute('src');
      elements.avatarPreviewImage.hidden = true;
    }
  }

  if (elements.avatarUploadName) {
    if (normalizedUrl.startsWith('data:image/')) {
      elements.avatarUploadName.textContent = 'Eigenes Bild bereit zum Speichern.';
    } else if (normalizedUrl) {
      elements.avatarUploadName.textContent = 'Avatar im Profil vorhanden.';
    } else {
      elements.avatarUploadName.textContent = 'Noch kein Bild ausgewählt.';
    }
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

async function convertAvatarFileToDataUrl(file) {
  if (!file) throw new Error('Keine Datei ausgewählt.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('Bitte nur Bilddateien hochladen.');
  if (file.size > avatarUploadMaxFileSize) throw new Error('Das Bild ist zu groß. Bitte maximal 6 MB verwenden.');

  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = avatarUploadOutputSize;
  canvas.height = avatarUploadOutputSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Bild konnte nicht verarbeitet werden.');

  const sourceSize = Math.min(image.width, image.height);
  const sourceX = Math.max(0, (image.width - sourceSize) / 2);
  const sourceY = Math.max(0, (image.height - sourceSize) / 2);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.88);
}

async function handleProfileAvatarFileChange(event) {
  const elements = getProfileEditorElements();
  const file = event?.target?.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await convertAvatarFileToDataUrl(file);
    if (elements.avatarInput) elements.avatarInput.value = dataUrl;
    if (elements.avatarUploadName) {
      elements.avatarUploadName.textContent = `${file.name} · bereit zum Speichern`;
    }
    updateProfileAvatarPreview(dataUrl, elements.usernameInput?.value || 'HM');
    setAuthMessage(elements.message, 'Avatar geladen. Jetzt noch auf „Profil speichern“ klicken.', 'success');
  } catch (error) {
    if (elements.avatarFileInput) elements.avatarFileInput.value = '';
    setAuthMessage(elements.message, error.message || 'Avatar konnte nicht geladen werden.', 'warn');
  }
}

function handleProfileAvatarClear() {
  const elements = getProfileEditorElements();
  if (elements.avatarInput) elements.avatarInput.value = '';
  if (elements.avatarFileInput) elements.avatarFileInput.value = '';
  updateProfileAvatarPreview('', elements.usernameInput?.value || 'HM');
  setAuthMessage(elements.message, 'Avatar entfernt. Zum Übernehmen bitte Profil speichern.', 'warn');
}

function getDiscordElements() {
  return {
    linkValue: document.getElementById('authDiscordLinkValue'),
    guildValue: document.getElementById('authDiscordGuildValue'),
    idValue: document.getElementById('authDiscordIdValue'),
    message: document.getElementById('discordRequirementMessage'),
    joinButton: document.getElementById('discordJoinServerButton'),
    linkButton: document.getElementById('discordLinkButton'),
    refreshButton: document.getElementById('discordRefreshButton'),
    signinButtons: Array.from(document.querySelectorAll('[data-auth-discord="signin"]')),
  };
}

function getCurrentDiscordAuthRedirectUrl() {
  const base = `${window.location.origin || ''}${window.location.pathname || ''}`.trim();
  return base || window.location.href.split('?')[0].split('#')[0];
}

function isUserAlreadyLoggedInForDiscordLink() {
  return Boolean(liveAccountSnapshot.user && liveAccountSnapshot.session?.access_token);
}

function resolveDiscordAuthMode(requestedMode = 'signin') {
  if (requestedMode === 'link') return 'link';
  return isUserAlreadyLoggedInForDiscordLink() ? 'link' : 'signin';
}

function buildDiscordAuthStartMessage(mode = 'signin') {
  return mode === 'link'
    ? 'Discord-Verknüpfung startet …'
    : 'Discord-Anmeldung startet …';
}

function getDiscordLinkConflictMessage(error) {
  const raw = String(error?.message || '').trim();
  const normalized = raw.toLowerCase();

  if (!raw) return '';
  if (normalized.includes('identity is already linked') || normalized.includes('already linked') || normalized.includes('already been registered')) {
    return 'Dieses Discord-Konto ist bereits mit einem anderen Website-Konto verknüpft. Lösche erst den versehentlich erstellten Discord-Account in Supabase und versuche es danach erneut.';
  }
  if (normalized.includes('manual linking')) {
    return 'Bitte manuelles Identity Linking in Supabase aktivieren.';
  }
  return raw;
}

function getDiscordIdentityFromUser(user) {
  if (!user || typeof user !== 'object') return null;
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const identity = identities.find((entry) => String(entry?.provider || '').toLowerCase() === 'discord') || null;
  const data = identity?.identity_data && typeof identity.identity_data === 'object' ? identity.identity_data : {};
  const discordUserId = String(
    identity?.provider_id
      || data?.provider_id
      || data?.user_id
      || data?.sub
      || data?.id
      || user?.user_metadata?.provider_id
      || ''
  ).trim();

  if (!discordUserId) return null;

  return {
    discordUserId,
    displayName: String(data?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim(),
    username: String(data?.username || user?.user_metadata?.preferred_username || user?.user_metadata?.user_name || '').trim(),
  };
}

function normalizeDiscordStatusPayload(payload, user = liveAccountSnapshot.user, profile = liveAccountSnapshot.profile) {
  const identity = getDiscordIdentityFromUser(user);
  const displayName = String(
    payload?.discordDisplayName
      || identity?.displayName
      || identity?.username
      || profile?.discord_name
      || user?.user_metadata?.discord_name
      || ''
  ).trim();

  return {
    configured: Boolean(payload?.configured),
    requiredForCheckout: Boolean(payload?.requiredForCheckout),
    manualLinkingEnabled: Boolean(payload?.manualLinkingEnabled),
    connected: Boolean(payload?.connected || identity?.discordUserId),
    discordUserId: String(payload?.discordUserId || identity?.discordUserId || '').trim(),
    displayName,
    guildName: String(payload?.guildName || 'Hammer Modding').trim() || 'Hammer Modding',
    guildId: String(payload?.guildId || '').trim(),
    inviteUrl: String(payload?.inviteUrl || '').trim(),
    inGuild: Boolean(payload?.inGuild),
    checked: Boolean(payload?.checked),
    checkedAt: String(payload?.checkedAt || '').trim(),
  };
}

function buildDiscordRequirementMessage(status) {
  if (!liveAccountSnapshot.user) {
    return 'Melde dich an und verbinde danach dein Discord-Konto für Checkout und spätere Freischaltungen.';
  }

  if (!status?.configured) {
    return 'Discord-Prüfung ist eingebaut, aber im Backend noch nicht vollständig konfiguriert.';
  }

  if (!status.connected) {
    return status?.manualLinkingEnabled
      ? 'Nutze jetzt "Discord verknüpfen", damit dein bestehendes Website-Konto mit Discord verbunden wird.'
      : 'Für Checkout und Community-Zugang bitte zuerst dein Discord-Konto verbinden.';
  }

  if (!status.inGuild) {
    return `Discord ist verbunden. Bitte tritt jetzt dem ${status.guildName || 'Hammer Modding'} Discord bei und prüfe danach erneut.`;
  }

  return `${status.guildName || 'Hammer Modding'} wurde bestätigt. Discord-Freischaltungen können jetzt sauber andocken.`;
}

function updateDiscordStatusUi(status = null) {
  const elements = getDiscordElements();
  const current = status || liveAccountSnapshot.discordStatus || null;
  const isLoggedIn = Boolean(liveAccountSnapshot.user);
  const linkText = !isLoggedIn
    ? 'Bitte zuerst anmelden'
    : current?.connected
      ? 'Verbunden'
      : 'Noch nicht verbunden';
  const guildText = !current?.configured
    ? 'Konfiguration noch offen'
    : !current?.connected
      ? 'Discord zuerst verbinden'
      : current?.inGuild
        ? 'Bestätigt'
        : 'Noch nicht im Server';
  const discordIdText = current?.discordUserId || '-';
  const showSignin = !isLoggedIn;
  const showLink = isLoggedIn && !Boolean(current?.connected);

  if (elements.linkValue) elements.linkValue.textContent = linkText;
  if (elements.guildValue) elements.guildValue.textContent = guildText;
  if (elements.idValue) elements.idValue.textContent = discordIdText;
  if (elements.signinButtons?.length) {
    elements.signinButtons.forEach((button) => {
      button.classList.toggle('hidden-section', !showSignin);
    });
  }
  if (elements.linkButton) {
    elements.linkButton.classList.toggle('hidden-section', !showLink);
    elements.linkButton.textContent = current?.manualLinkingEnabled ? 'Discord verknüpfen' : 'Discord verbinden';
  }
  if (elements.joinButton) {
    const joinUrl = current?.inviteUrl || '';
    elements.joinButton.classList.toggle('hidden-section', !(joinUrl && current?.configured && current?.connected && !current?.inGuild));
    if (joinUrl) elements.joinButton.href = joinUrl;
  }
  if (elements.refreshButton) {
    elements.refreshButton.classList.toggle('hidden-section', !isLoggedIn);
  }
  if (elements.message) {
    setAuthMessage(
      elements.message,
      buildDiscordRequirementMessage(current),
      current?.configured && current?.connected && current?.inGuild ? 'success' : current?.configured ? 'warn' : 'neutral',
    );
  }
}

function hydrateProfileEditor(user, profile) {
  const elements = getProfileEditorElements();
  const discordStatus = liveAccountSnapshot.discordStatus || null;
  const isActive = Boolean(user);
  const usernameValue = profile?.username || user?.user_metadata?.username || '';
  if (elements.usernameInput) elements.usernameInput.value = usernameValue;
  if (elements.discordInput) {
    elements.discordInput.value = discordStatus?.displayName || profile?.discord_name || user?.user_metadata?.discord_name || '';
    elements.discordInput.readOnly = Boolean(discordStatus?.connected);
    elements.discordInput.title = discordStatus?.connected ? 'Wird über Discord-Login gepflegt.' : '';
  }
  if (elements.cfxInput) elements.cfxInput.value = profile?.cfx_identifier || user?.user_metadata?.cfx_identifier || '';
  if (elements.avatarInput) elements.avatarInput.value = profile?.avatar_url || '';
  if (elements.avatarFileInput) elements.avatarFileInput.value = '';
  updateProfileAvatarPreview(profile?.avatar_url || '', usernameValue || user?.email?.split('@')[0] || 'HM');
  if (elements.saveButton) elements.saveButton.disabled = !isActive;
  if (elements.message) {
    setAuthMessage(elements.message, isActive ? '' : 'Melde dich zuerst an, um dein Profil zu bearbeiten.', isActive ? 'neutral' : 'warn');
  }
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
  if (!navItems.length) cacheDomReferences();
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.section === section));
}

function showSection(section) {
  if (!homeSections.length && !scriptsSection) cacheDomReferences();
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
  if (section === 'system') {
    updateAdminPortalAccess();
    loadAdminPortalData();
  }
  syncVideoPlayback();
}

function openScriptDetail(scriptName, originSection = 'scripts') {
  if (!Object.keys(detailSections).length) cacheDomReferences();
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
    tebexPackageId: catalogItem?.tebexPackageId || '',
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
        tebexPackageId: catalogItem.tebexPackageId || '',
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


function getTebexPackageId(entryLike) {
  const catalogItem = getCatalogItem(entryLike);
  return catalogItem?.tebexPackageId || tebexPackageMap[catalogItem?.slug || ''] || '';
}

function buildTebexDraftText(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const totals = getVisibleCartTotals(items);
  const user = liveAccountSnapshot.user;
  const profile = liveAccountSnapshot.profile || {};
  const meta = user?.user_metadata || {};
  const username = profile.username || meta.username || '[bitte ergänzen]';
  const accountEmail = user?.email || '[bitte ergänzen]';
  const discordName = profile.discord_name || meta.discord_name || '[bitte ergänzen]';
  const cfxIdentifier = profile.cfx_identifier || meta.cfx_identifier || '[bitte ergänzen]';

  if (!items.length) {
    return 'Wähle zuerst Produkte aus deinem Warenkorb aus.';
  }

  const mappedItems = items.map((item) => {
    const packageId = getTebexPackageId(item) || '[nicht gemappt]';
    return `- ${item.name} | Package-ID: ${packageId} | ${item.priceLabel}`;
  });

  return [
    'Hammer Modding · Tebex-Draft',
    '',
    `Public Token aktiv: ${TEBEX_PUBLIC_TOKEN}`,
    `Produkte im Warenkorb: ${items.length}`,
    `Gesamtsumme: ${totals.totalLabel}`,
    '',
    'Gemappte Tebex-Pakete:',
    ...mappedItems,
    '',
    'Kontodaten:',
    `Benutzerkonto: ${username}`,
    `E-Mail: ${accountEmail}`,
    `Discord-Name: ${discordName}`,
    `CFX / Tebex-Konto: ${cfxIdentifier}`,
  ].join('\n');
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
  const role = mapRoleLabel(profile?.role || 'customer');

  if (!items.length) {
    return 'Wähle zuerst Produkte aus deinem Warenkorb aus.';
  }

  const lines = [
    'Hammer Modding Bestellanfrage',
    '',
    'Gewünschte Produkte:',
    ...items.map((item) => `- ${item.name} | ${item.priceLabel} | ${getCartItemTypeLabel(item)} | Tebex-Paket: ${getTebexPackageId(item) || '[folgt]'}`),
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
    'Tebex-Paketzuordnung ist bereits hinterlegt.',
    'Zusätzliche Hinweise: [optional]',
  ];

  return lines.join('\n');
}


function updateRequestDraftFields(cart) {
  const items = Array.isArray(cart) ? cart : [];
  const requestText = buildCartRequestText(items);
  const requestButton = document.getElementById('cartRequestButton');
  const tebexButtons = document.querySelectorAll('[data-copy-tebex-draft="true"]');
  const checkoutButtons = document.querySelectorAll('[data-open-tebex-checkout="true"]');
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

  tebexButtons.forEach((button) => {
    button.disabled = !items.length;
  });

  checkoutButtons.forEach((button) => {
    button.disabled = !items.length;
  });

  hmStoreBridge.requestText = requestText;
  hmStoreBridge.getRequestText = () => buildCartRequestText(loadVisibleCart());
  hmStoreBridge.tebexDraft = buildTebexDraftText(items);
  hmStoreBridge.getTebexDraft = () => buildTebexDraftText(loadVisibleCart());
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

async function copyPreparedTebexDraft() {
  const tebexDraft = buildTebexDraftText(loadVisibleCart());
  if (!tebexDraft || tebexDraft === 'Wähle zuerst Produkte aus deinem Warenkorb aus.') return false;
  return copyTextToClipboard(tebexDraft);
}

function openContactRequestFlow() {
  closeRequestModal();
  activateNav('contact');
  showSection('contact');
  const primaryCta = document.querySelector('#contactSection .contact-cta-row .cta');
  if (primaryCta) primaryCta.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getLiveCheckoutUrls() {
  const origin = window.location.origin && !window.location.origin.startsWith('file')
    ? window.location.origin
    : 'http://127.0.0.1:5500';

  return {
    completeUrl: `${origin}/#checkout-complete`,
    cancelUrl: `${origin}/#checkout-cancel`,
  };
}

function buildCheckoutItems(cart) {
  const items = Array.isArray(cart) ? cart : [];
  return items.map((item) => ({
    packageId: getTebexPackageId(item),
    quantity: Number.isFinite(Number(item?.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    name: item.name,
  }));
}

function setCheckoutButtonsLoadingState(isLoading) {
  document.querySelectorAll('[data-open-tebex-checkout="true"]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent || 'Direkt zu Tebex';
    }
    button.disabled = isLoading || !loadVisibleCart().length;
    button.textContent = isLoading ? 'Leite weiter ...' : button.dataset.defaultLabel;
  });
}

function savePendingTebexCheckout(payload) {
  const raw = JSON.stringify(payload || {});
  try {
    localStorage.setItem(tebexPendingCheckoutStorageKey, raw);
  } catch (error) {
    // ignore
  }
  try {
    sessionStorage.setItem(tebexPendingCheckoutStorageKey, raw);
  } catch (error) {
    // ignore
  }
}

function loadPendingTebexCheckout() {
  try {
    const localRaw = localStorage.getItem(tebexPendingCheckoutStorageKey);
    if (localRaw) return JSON.parse(localRaw);
  } catch (error) {
    // ignore
  }

  try {
    const sessionRaw = sessionStorage.getItem(tebexPendingCheckoutStorageKey);
    if (sessionRaw) return JSON.parse(sessionRaw);
  } catch (error) {
    // ignore
  }

  return null;
}

function clearPendingTebexCheckout() {
  try {
    localStorage.removeItem(tebexPendingCheckoutStorageKey);
  } catch (error) {
    // ignore
  }

  try {
    sessionStorage.removeItem(tebexPendingCheckoutStorageKey);
  } catch (error) {
    // ignore
  }
}

function cleanupTebexAuthUrl() {
  const url = new URL(window.location.href);
  let changed = false;
  ['hm_tebex_auth', 'basket', 'success'].forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });
  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, nextUrl || '/');
  }
}

function shouldUsePendingCheckoutFallback({ responseStatus = 0, message = '' } = {}) {
  const detail = String(message || '').toLowerCase();
  if (responseStatus >= 500) return true;
  return detail.includes('checkout-url fehlt') || detail.includes('backend nicht erreichbar') || detail.includes('failed to fetch');
}

async function finalizePendingTebexCheckout(pending) {
  if (!pending?.basketIdent || !Array.isArray(pending?.items) || !pending.items.length) {
    throw new Error('Tebex-Basket ist unvollständig.');
  }

  if (!liveAccountSnapshot.user || !liveAccountSnapshot.session?.access_token) {
    throw new Error('Bitte zuerst einloggen.');
  }

  const authUrl = new URL(window.location.href);
  const authSuccess = authUrl.searchParams.get('success') === 'true';

  try {
    const response = await fetch(`${TEBEX_BACKEND_BASE_URL}/api/tebex/checkout/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${liveAccountSnapshot.session.access_token}`,
      },
      body: JSON.stringify({
        basketIdent: pending.basketIdent,
        items: pending.items,
        completeUrl: pending.completeUrl,
        cancelUrl: pending.cancelUrl,
        checkoutUrl: pending.checkoutUrl,
        paymentUrl: pending.paymentUrl,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const message = payload?.error || payload?.message || 'Checkout konnte nicht abgeschlossen werden.';
      const fallbackUrl = pending.checkoutUrl || pending.paymentUrl || '';
      if (authSuccess && fallbackUrl && shouldUsePendingCheckoutFallback({ responseStatus: response.status, message })) {
        clearPendingTebexCheckout();
        cleanupTebexAuthUrl();
        window.location.href = fallbackUrl;
        return;
      }
      throw new Error(message);
    }

    const redirectUrl = payload.checkoutUrl || payload.paymentUrl || pending.checkoutUrl || pending.paymentUrl || (pending.basketIdent ? `https://pay.tebex.io/${encodeURIComponent(pending.basketIdent)}` : '');
    if (!redirectUrl) {
      throw new Error('Tebex-Checkout-URL fehlt.');
    }

    clearPendingTebexCheckout();
    cleanupTebexAuthUrl();
    window.location.href = redirectUrl;
  } catch (error) {
    const fallbackUrl = authSuccess ? pending.checkoutUrl || pending.paymentUrl || '' : '';
    if (fallbackUrl && shouldUsePendingCheckoutFallback({ message: error?.message || '' })) {
      clearPendingTebexCheckout();
      cleanupTebexAuthUrl();
      window.location.href = fallbackUrl;
      return;
    }
    throw error;
  }
}

async function maybeResumePendingTebexCheckout() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('hm_tebex_auth') !== '1') return;
  if (tebexResumeInFlight) return;

  const pending = loadPendingTebexCheckout();
  if (!pending) {
    console.warn('Tebex-Rückkehr erkannt, aber kein gespeicherter Checkout gefunden.');
    cleanupTebexAuthUrl();
    window.alert('Tebex-Rückkehr erkannt, aber kein offener Checkout wurde gefunden. Bitte den Checkout erneut starten.');
    return;
  }

  const basketFromUrl = url.searchParams.get('basket') || '';
  if (basketFromUrl && pending.basketIdent && basketFromUrl !== pending.basketIdent) {
    console.warn('Tebex-Basket stimmt nicht mit gespeichertem Checkout überein.', {
      basketFromUrl,
      pendingBasket: pending.basketIdent,
    });
    cleanupTebexAuthUrl();
    window.alert('Der zurückgegebene Tebex-Basket passt nicht zum gespeicherten Checkout. Bitte erneut starten.');
    return;
  }

  if (!liveAccountSnapshot.user || !liveAccountSnapshot.session?.access_token) {
    if (tebexResumeAttempts < 8) {
      tebexResumeAttempts += 1;
      window.clearTimeout(tebexResumeRetryTimer);
      tebexResumeRetryTimer = window.setTimeout(() => {
        maybeResumePendingTebexCheckout();
      }, 700);
      return;
    }
    tebexResumeAttempts = 0;
    cleanupTebexAuthUrl();
    window.alert('Tebex-Rückkehr erkannt, aber dein Login ist noch nicht bereit. Bitte kurz neu einloggen und den Checkout erneut starten.');
    return;
  }

  tebexResumeAttempts = 0;
  tebexResumeInFlight = true;
  setCheckoutButtonsLoadingState(true);
  try {
    await finalizePendingTebexCheckout(pending);
  } catch (error) {
    const message = String(error?.message || 'Checkout konnte nicht abgeschlossen werden.');
    window.alert(message.includes('Failed to fetch') ? 'Backend nicht erreichbar. Bitte später erneut versuchen.' : message);
    setCheckoutButtonsLoadingState(false);
  } finally {
    tebexResumeInFlight = false;
  }
}

async function beginLiveTebexCheckout() {
  const cart = loadVisibleCart();
  if (!cart.length) return;

  if (!liveAccountSnapshot.user || !liveAccountSnapshot.session?.access_token) {
    openAuthModal('login');
    return;
  }

  const discordReady = await ensureDiscordReadyForCheckout();
  if (!discordReady) {
    return;
  }

  const items = buildCheckoutItems(cart);
  const missingMappings = items.filter((item) => !item.packageId);
  if (missingMappings.length) {
    window.alert('Mindestens ein Produkt ist noch nicht mit einem Tebex-Paket verknüpft.');
    return;
  }

  const { completeUrl, cancelUrl } = getLiveCheckoutUrls();
  setCheckoutButtonsLoadingState(true);

  try {
    const response = await fetch(`${TEBEX_BACKEND_BASE_URL}/api/tebex/checkout/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${liveAccountSnapshot.session.access_token}`,
      },
      body: JSON.stringify({
        items,
        completeUrl,
        cancelUrl,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || payload?.message || 'Checkout konnte nicht gestartet werden.');
    }

    const pending = {
      basketIdent: payload.basketIdent,
      items,
      checkoutUrl: payload.checkoutUrl || (payload.basketIdent ? `https://pay.tebex.io/${encodeURIComponent(payload.basketIdent)}` : ''),
      paymentUrl: payload.paymentUrl || '',
      completeUrl,
      cancelUrl,
      createdAt: new Date().toISOString(),
    };

    savePendingTebexCheckout(pending);

    if (payload.authUrl) {
      window.location.href = payload.authUrl;
      return;
    }

    await finalizePendingTebexCheckout(pending);
  } catch (error) {
    const message = String(error?.message || 'Checkout konnte nicht gestartet werden.');
    window.alert(message.includes('Failed to fetch') ? 'Backend nicht erreichbar. Bitte später erneut versuchen.' : message);
    setCheckoutButtonsLoadingState(false);
  }
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
    button.textContent = inCart ? 'Im Warenkorb' : 'In den Warenkorb';
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
  adminRole: 'administrator',
  managerRole: 'owner',
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
  const webhookReady = Boolean(state.webhookUrl);
  const lines = [
    'Hammer Modding – Phase 6E Profiles & Rollen',
    '',
    `Provider: ${state.provider === 'custom' ? 'Custom Backend' : 'Supabase'}`,
    `Project Ref: ${prettifyFoundationValue(state.projectRef)}`,
    `Project URL: ${prettifyFoundationValue(state.projectUrl)}`,
    `Public Key: ${state.anonKey ? 'gesetzt' : 'noch offen'}`,
    `Site URL: ${prettifyFoundationValue(state.siteUrl)}`,
    `Redirect URL: ${prettifyFoundationValue(state.redirectUrl)}`,
    `Schema: ${prettifyFoundationValue(state.publicSchema, 'public')}`,
    `Storage Bucket: ${prettifyFoundationValue(state.storageBucket, 'product-assets')}`,
    `Admin Rolle: ${prettifyFoundationValue(state.adminRole, 'administrator')}`,
    `Manager Rolle: ${prettifyFoundationValue(state.managerRole, 'owner')}`,
    `Bindungsmodus: ${formatBindingMode(state.bindingMode)}`,
    `Webhook URL: ${prettifyFoundationValue(state.webhookUrl)}`,
    '',
    'Nächste Schritte:',
    `- Profiles SQL in Supabase ausführen`,
    `- Profil-Trigger + RLS aktivieren`,
    `- Anmeldung testen: ${dbReady ? 'bereit' : 'noch offen'}`,
    `- Redirects prüfen: ${redirectReady ? 'bereit' : 'noch offen'}`,
    `- Webhook später andocken: ${webhookReady ? 'vorbereitet' : 'offen'}`,
  ];
  return lines.join('\n');
}

function buildFoundationSqlBlueprint(state) {
  if (state.provider === 'custom') {
    return [
      '-- Custom Backend gewählt.',
      '-- Übertragt die Profiles-, Trigger- und Rollenlogik in euren eigenen Stack.',
    ].join('\n');
  }

  const schema = sanitizeSqlIdentifier(state.publicSchema, 'public');
  const adminRole = sanitizeSqlIdentifier(state.adminRole, 'admin');
  const managerRole = sanitizeSqlIdentifier(state.managerRole, 'product_manager');

  return [
    '-- Hammer Modding · Phase 6E Profiles & Rollen',
    '-- Diesen Block komplett im Supabase SQL Editor ausführen.',
    '',
    `create schema if not exists ${schema};`,
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
    '  email text,',
    "  username text not null default '',",
    "  discord_name text not null default '',",
    "  cfx_identifier text not null default '',",
    "  avatar_url text not null default '',",
    `  role text not null default 'customer' check (role in ('customer', 'partner', 'designer', 'developer', '${managerRole}', '${adminRole}')),`,
    '  is_active boolean not null default true,',
    '  last_login_at timestamptz,',
    '  last_seen_at timestamptz,',
    '  last_purchase_at timestamptz,',
    "  last_purchase_label text not null default '',",
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `create or replace function ${schema}.handle_new_user()`,
    'returns trigger',
    'language plpgsql',
    'security definer',
    `set search_path = ${schema}`,
    'as $$',
    'begin',
    `  insert into ${schema}.profiles (id, email, username, discord_name, cfx_identifier)`,
    '  values (',
    '    new.id,',
    '    new.email,',
    "    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), ''),",
    "    coalesce(new.raw_user_meta_data ->> 'discord_name', ''),",
    "    coalesce(new.raw_user_meta_data ->> 'cfx_identifier', '')",
    '  )',
    '  on conflict (id) do update set',
    '    email = excluded.email,',
    `    username = coalesce(nullif(excluded.username, ''), ${schema}.profiles.username),`,
    `    discord_name = coalesce(nullif(excluded.discord_name, ''), ${schema}.profiles.discord_name),`,
    `    cfx_identifier = coalesce(nullif(excluded.cfx_identifier, ''), ${schema}.profiles.cfx_identifier),`,
    '    updated_at = now();',
    '  return new;',
    'end;',
    '$$;',
    '',
    'drop trigger if exists on_auth_user_created on auth.users;',
    'create trigger on_auth_user_created',
    '  after insert on auth.users',
    `  for each row execute procedure ${schema}.handle_new_user();`,
    '',
    `insert into ${schema}.profiles (id, email, username)`,
    'select',
    '  u.id,',
    '  u.email,',
    "  coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1), '')",
    'from auth.users u',
    `where not exists (select 1 from ${schema}.profiles p where p.id = u.id);`,
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
    '',
    `drop policy if exists profiles_self_select on ${schema}.profiles;`,
    `drop policy if exists profiles_self_insert on ${schema}.profiles;`,
    `drop policy if exists profiles_self_update on ${schema}.profiles;`,
    '',
    `create policy profiles_self_select on ${schema}.profiles`,
    '  for select',
    `  using (auth.uid() = id or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    '',
    `create policy profiles_self_insert on ${schema}.profiles`,
    '  for insert',
    `  with check (auth.uid() = id or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    '',
    `create policy profiles_self_update on ${schema}.profiles`,
    '  for update',
    `  using (auth.uid() = id or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'))`,
    `  with check (auth.uid() = id or ${schema}.current_app_role() in ('${adminRole}', '${managerRole}'));`,
    '',
    `create or replace trigger profiles_touch_updated_at`,
    `  before update on ${schema}.profiles`,
    `  for each row execute function ${schema}.touch_updated_at();`,
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
  hmStoreBridge.tebex = { publicToken: TEBEX_PUBLIC_TOKEN, mappedPackages: { ...tebexPackageMap } };
  return supabaseClient;
}


function setStoreStatCount(labelText, nextValue) {
  document.querySelectorAll('.store-stat-tile').forEach((tile) => {
    const label = tile.querySelector('span');
    const value = tile.querySelector('strong');
    if (!label || !value) return;
    if (label.textContent.trim().toLowerCase() === String(labelText || '').trim().toLowerCase()) {
      value.textContent = String(nextValue);
    }
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSupabasePriceValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
}

function formatSupabasePriceLabel(value) {
  return `${formatSupabasePriceValue(value).replace('.', ',')} €`;
}

function normalizeSupabaseProductRow(row) {
  if (!row || !row.slug || !row.title) return null;
  const storedDetail = getStoredProductDetail(row);
  const plainFullDescription = storedDetail
    ? String(storedDetail.detailIntro || '').trim()
    : String(row.full_description || '').trim();
  return {
    ...row,
    slug: String(row.slug).trim(),
    title: String(row.title).trim(),
    category: String(row.category || 'other').trim().toLowerCase(),
    product_type: String(row.product_type || row.category || 'other').trim().toLowerCase(),
    price_eur: Number.isFinite(Number(row.price_eur)) ? Number(row.price_eur) : 0,
    short_description: String(row.short_description || '').trim(),
    full_description: String(row.full_description || '').trim(),
    full_description_text: plainFullDescription,
    detail_config: storedDetail,
    detail_data: storedDetail || {},
    image_url: String(row.image_url || '').trim(),
    tebex_package_id: String(row.tebex_package_id || '').trim(),
    is_active: row.is_active !== false,
    is_featured: row.is_featured === true,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
  };
}

function getSupabaseProductPresentation(row) {
  const preset = supabaseProductPresentation[row.slug] || {};
  const firstWord = row.title.split(/\s+/).filter(Boolean)[0] || 'Produkt';
  return {
    badge: preset.badge || firstWord,
    image: row.image_url || preset.image || 'assets/clothing.webp',
    priceHint: preset.priceHint || (row.product_type === 'clothing' ? 'Kleidungs-Pack' : 'Produkt'),
  };
}

function upsertCatalogProductFromSupabase(row) {
  const normalizedType = row.product_type === 'free_script'
    ? 'free-script'
    : row.category === 'clothing' || row.product_type === 'clothing'
      ? 'clothing'
      : 'paid-script';

  storeCatalog[row.slug] = {
    id: storeCatalog[row.slug]?.id || row.slug,
    slug: row.slug,
    name: row.title,
    price: formatSupabasePriceValue(row.price_eur),
    priceLabel: formatSupabasePriceLabel(row.price_eur),
    type: normalizedType,
    tebexPackageId: row.tebex_package_id || storeCatalog[row.slug]?.tebexPackageId || '',
  };

  if (row.tebex_package_id) {
    tebexPackageMap[row.slug] = row.tebex_package_id;
  }
}


function extractProductSlugFromCard(card) {
  if (!card) return '';
  return String(
    card.querySelector('[data-open-script]')?.dataset.openScript
      || card.querySelector('[data-cart-add="true"]')?.dataset.productSlug
      || ''
  ).trim();
}

function captureBaseProductPresentationMap() {
  if (baseProductPresentationMap) return baseProductPresentationMap;
  const map = {};
  document.querySelectorAll('article.product-card').forEach((card) => {
    const slug = extractProductSlugFromCard(card);
    if (!slug || map[slug]) return;
    map[slug] = {
      badge: String(card.querySelector('.card-badge')?.textContent || '').trim(),
      image: String(card.querySelector('img')?.getAttribute('src') || '').trim(),
      short: String(card.querySelector('p')?.textContent || '').trim(),
      priceHint: String(card.querySelector('.price-row small')?.textContent || '').trim(),
    };
  });
  baseProductPresentationMap = map;
  return map;
}

function captureSliderSnapshot(trackSelector) {
  const groups = Array.from(document.querySelectorAll(`${trackSelector} .slider-group`));
  const primaryGroup = groups[0] || null;
  const liveCards = new Map();
  const previewCards = [];
  Array.from(primaryGroup?.children || []).forEach((item) => {
    const slug = extractProductSlugFromCard(item);
    if (slug) {
      liveCards.set(slug, item.outerHTML);
    } else {
      previewCards.push(item.outerHTML);
    }
  });
  return { trackSelector, liveCards, previewCards };
}

function captureGridSnapshot(gridSelector, isLiveCard) {
  const grid = document.querySelector(gridSelector);
  const liveCards = new Map();
  const previewCards = [];
  Array.from(grid?.children || []).forEach((item) => {
    const slug = extractProductSlugFromCard(item);
    if (slug && (!isLiveCard || isLiveCard(item))) {
      liveCards.set(slug, item.outerHTML);
    } else {
      previewCards.push(item.outerHTML);
    }
  });
  return { gridSelector, liveCards, previewCards };
}

function captureStorefrontUiSnapshot() {
  if (storefrontUiSnapshot) return storefrontUiSnapshot;
  storefrontUiSnapshot = {
    homeScripts: captureSliderSnapshot('.slider-track-paid'),
    homeClothing: captureSliderSnapshot('.slider-track-clothing'),
    scriptsGrid: captureGridSnapshot('#scriptsGrid'),
    freeGrid: captureGridSnapshot('#freeGrid'),
    clothingGrid: captureGridSnapshot('#clothingGrid', (item) => item.classList.contains('clothing-card-live')),
  };
  return storefrontUiSnapshot;
}

function captureClothingUiSnapshot() {
  const snapshot = captureStorefrontUiSnapshot();
  clothingUiSnapshot = snapshot.homeClothing;
  return clothingUiSnapshot;
}

function buildDynamicProductActionMarkup(row) {
  const catalogItem = getCatalogItem(row.slug) || storeCatalog[row.slug];
  const actionLabel = row.category === 'scripts' || row.category === 'free_scripts' ? 'Jetzt ansehen' : 'Produkt ansehen';

  if (hasDynamicProductDetail(row)) {
    return `<a class="card-link" data-open-dynamic-detail="${escapeHtml(row.slug)}" href="#">${escapeHtml(actionLabel)}</a>`;
  }

  if (detailSections[row.slug]) {
    return `<a class="card-link" data-open-script="${escapeHtml(row.slug)}" href="#">${escapeHtml(actionLabel)}</a>`;
  }

  return `
    <button
      class="card-link"
      data-cart-add="true"
      data-product-id="${escapeHtml(catalogItem?.id || row.slug)}"
      data-product-name="${escapeHtml(row.title)}"
      data-product-price="${escapeHtml(formatSupabasePriceValue(row.price_eur))}"
      data-product-price-label="${escapeHtml(formatSupabasePriceLabel(row.price_eur))}"
      data-product-slug="${escapeHtml(row.slug)}"
      data-product-type="${escapeHtml(catalogItem?.type || 'clothing')}"
      type="button"
    >In den Warenkorb</button>
  `;
}

function getSupabaseProductPresentation(row) {
  const baseMap = captureBaseProductPresentationMap();
  const base = baseMap[row.slug] || {};
  const preset = supabaseProductPresentation[row.slug] || {};
  const firstWord = row.title.split(/\s+/).filter(Boolean)[0] || 'Produkt';
  const fallbackHint = row.category === 'scripts'
    ? 'Script'
    : row.category === 'free_scripts'
      ? 'Kostenlos'
      : row.product_type === 'clothing'
        ? 'Kleidungs-Pack'
        : 'Produkt';

  return {
    badge: preset.badge || base.badge || firstWord,
    image: row.image_url || preset.image || base.image || 'assets/content.png',
    priceHint: preset.priceHint || base.priceHint || fallbackHint,
    short: row.short_description || row.full_description_text || base.short || 'Live aus Supabase geladen.',
  };
}

function buildDynamicHomeCardHtml(row) {
  const presentation = getSupabaseProductPresentation(row);
  return `
    <article class="product-card glass-soft searchable marquee-card dynamic-product-card" data-product-slug="${escapeHtml(row.slug)}" data-type="${escapeHtml(`${row.category} ${row.product_type} ${row.slug} ${row.title}`)}">
      <div class="card-badge">${escapeHtml(presentation.badge)}</div>
      <div class="card-main card-main-vertical compact-home-card">
        <img alt="${escapeHtml(row.title)}" decoding="async" loading="lazy" src="${escapeHtml(presentation.image)}"/>
        <div>
          <h4>${escapeHtml(row.title)}</h4>
          <p>${escapeHtml(presentation.short)}</p>
          <div class="price-row"><strong>${escapeHtml(formatSupabasePriceLabel(row.price_eur))}</strong><small>${escapeHtml(presentation.priceHint)}</small></div>
        </div>
      </div>
      ${buildDynamicProductActionMarkup(row)}
    </article>
  `;
}

function buildDynamicGridCardHtml(row) {
  const presentation = getSupabaseProductPresentation(row);
  const cardClass = row.category === 'scripts'
    ? 'script-card'
    : row.category === 'free_scripts'
      ? 'free-script-card'
      : 'clothing-card clothing-card-live';
  const categoryAttr = row.category === 'clothing' ? ` data-category="${escapeHtml(row.slug)}"` : '';

  return `
    <article class="product-card glass-soft searchable ${cardClass} dynamic-product-card" data-product-slug="${escapeHtml(row.slug)}"${categoryAttr} data-type="${escapeHtml(`${row.category} ${row.product_type} live ${row.slug} ${row.title}`)}">
      <div class="card-badge">${escapeHtml(presentation.badge)}</div>
      <div class="card-main card-main-vertical">
        <img alt="${escapeHtml(row.title)}" decoding="async" loading="lazy" src="${escapeHtml(presentation.image)}"/>
        <div>
          <h4>${escapeHtml(row.title)}</h4>
          <p>${escapeHtml(presentation.short)}</p>
          <div class="price-row"><strong>${escapeHtml(formatSupabasePriceLabel(row.price_eur))}</strong><small>${escapeHtml(presentation.priceHint)}</small></div>
        </div>
      </div>
      ${buildDynamicProductActionMarkup(row)}
    </article>
  `;
}

function renderMergedTrack(snapshot, rows) {
  if (!snapshot) return;
  const merged = new Map(snapshot.liveCards);
  rows.forEach((row) => {
    merged.set(row.slug, buildDynamicHomeCardHtml(row));
  });
  const markup = [...merged.values(), ...snapshot.previewCards].join('');
  const groups = Array.from(document.querySelectorAll(`${snapshot.trackSelector} .slider-group`));
  groups.forEach((group) => {
    group.innerHTML = markup;
  });
}

function renderMergedGrid(snapshot, rows) {
  if (!snapshot) return 0;
  const merged = new Map(snapshot.liveCards);
  rows.forEach((row) => {
    merged.set(row.slug, buildDynamicGridCardHtml(row));
  });
  const grid = document.querySelector(snapshot.gridSelector);
  if (grid) {
    grid.innerHTML = [...merged.values(), ...snapshot.previewCards].join('');
  }
  return merged.size;
}

function renderSupabaseManagedProducts(products) {
  const snapshot = captureStorefrontUiSnapshot();
  const activeProducts = products.filter((row) => row.is_active);

  activeProducts.forEach(upsertCatalogProductFromSupabase);
  supabaseManagedProductsCache = activeProducts.slice();
  hmStoreBridge.supabaseManagedProducts = supabaseManagedProductsCache.slice();

  if (!activeProducts.length) return;

  const scripts = activeProducts.filter((row) => row.category === 'scripts');
  const freeScripts = activeProducts.filter((row) => row.category === 'free_scripts');
  const clothing = activeProducts.filter((row) => row.category === 'clothing');

  renderMergedTrack(snapshot.homeScripts, scripts);
  renderMergedTrack(snapshot.homeClothing, clothing);

  const scriptsCount = renderMergedGrid(snapshot.scriptsGrid, scripts) || snapshot.scriptsGrid.liveCards.size;
  const freeCount = renderMergedGrid(snapshot.freeGrid, freeScripts) || snapshot.freeGrid.liveCards.size;
  const clothingCount = renderMergedGrid(snapshot.clothingGrid, clothing) || snapshot.clothingGrid.liveCards.size;

  setStoreStatCount('Scripte', scriptsCount);
  setStoreStatCount('Free Scripts', freeCount);
  setStoreStatCount('Kleidungs-Packs', clothingCount);
  setStoreStatCount('Live-Produkte', scriptsCount + freeCount + clothingCount);

  bindPreparedCartButtons(document);
  refreshSearchableCards();
  updateCartButtonsState(loadVisibleCart());
}

async function loadSupabaseManagedProducts() {
  if (supabaseProductsBooted) return supabaseManagedProductsCache;
  supabaseProductsBooted = true;

  const client = getSupabaseClient();
  if (!client) return [];

  const foundation = loadFoundationState();
  const productsTable = foundation.productsTable || 'products';

  try {
    const { data, error } = await withTimeout(
      client
        .from(productsTable)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }),
      12000,
    );

    if (error) throw error;

    const normalizedProducts = Array.isArray(data)
      ? data.map(normalizeSupabaseProductRow).filter(Boolean)
      : [];

    renderSupabaseManagedProducts(normalizedProducts);
    return normalizedProducts;
  } catch (error) {
    console.warn('Supabase-Produkte konnten nicht geladen werden. Fallback bleibt aktiv.', error);
    return [];
  }
}

function createAuthTimeoutError() {
  const error = new Error('Datenbank nicht erreichbar. Bitte später erneut versuchen.');
  error.code = 'AUTH_TIMEOUT';
  return error;
}

function withTimeout(promise, timeoutMs = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(createAuthTimeoutError()), timeoutMs);
    }),
  ]);
}

function formatAuthErrorMessage(error, fallbackAction = 'Anmeldung') {
  const rawMessage = String(error?.message || '').trim();
  const normalized = rawMessage.toLowerCase();

  if (error?.code === 'AUTH_TIMEOUT' || normalized.includes('network') || normalized.includes('failed to fetch') || normalized.includes('fetch')) {
    return 'Datenbank nicht erreichbar. Bitte später erneut versuchen.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Bitte zuerst deine E-Mail bestätigen.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'E-Mail oder Passwort ist nicht korrekt.';
  }

  if (normalized.includes('invalid email')) {
    return 'Bitte eine gültige E-Mail-Adresse eingeben.';
  }

  if (normalized.includes('password should be')) {
    return 'Das Passwort erfüllt die Anforderungen nicht.';
  }

  if (normalized.includes('user already registered')) {
    return 'Für diese E-Mail gibt es bereits ein Konto.';
  }

  if (normalized.includes('signup is disabled')) {
    return 'Registrierung ist aktuell nicht verfügbar.';
  }

  return rawMessage || `${fallbackAction} fehlgeschlagen. Bitte erneut versuchen.`;
}

function isMissingProfilesTableError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('relation') || msg.includes('does not exist') || msg.includes('schema cache');
}

async function fetchLiveProfile(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) return null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, email, username, discord_name, cfx_identifier, avatar_url, role, is_active, last_login_at, last_seen_at, last_purchase_at, last_purchase_label')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingProfilesTableError(error)) return null;
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
    email: user.email || '',
    username: profileDraft.username ?? user.user_metadata?.username ?? user.email?.split('@')[0] ?? '',
  };

  if (profileDraft.discord_name !== undefined) {
    payload.discord_name = profileDraft.discord_name;
  } else if (user.user_metadata?.discord_name) {
    payload.discord_name = user.user_metadata.discord_name;
  }

  if (profileDraft.cfx_identifier !== undefined) {
    payload.cfx_identifier = profileDraft.cfx_identifier;
  } else if (user.user_metadata?.cfx_identifier) {
    payload.cfx_identifier = user.user_metadata.cfx_identifier;
  }

  if (profileDraft.avatar_url !== undefined) {
    payload.avatar_url = profileDraft.avatar_url;
  }

  if (profileDraft.last_login_at) payload.last_login_at = profileDraft.last_login_at;
  if (profileDraft.last_seen_at) payload.last_seen_at = profileDraft.last_seen_at;
  if (profileDraft.last_purchase_at) payload.last_purchase_at = profileDraft.last_purchase_at;
  if (profileDraft.last_purchase_label !== undefined) payload.last_purchase_label = profileDraft.last_purchase_label;

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, email, username, discord_name, cfx_identifier, avatar_url, role, is_active, last_login_at, last_seen_at, last_purchase_at, last_purchase_label')
      .maybeSingle();

    if (error) {
      if (isMissingProfilesTableError(error)) return null;
      return null;
    }

    return data || null;
  } catch (error) {
    return null;
  }
}

async function patchLiveProfile(userId, patch = {}) {
  const client = getSupabaseClient();
  if (!client || !userId || !patch || !Object.keys(patch).length) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('id, email, username, discord_name, cfx_identifier, avatar_url, role, is_active, last_login_at, last_seen_at, last_purchase_at, last_purchase_label')
      .maybeSingle();

    if (error) {
      if (isMissingProfilesTableError(error)) return null;
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
  const roleLabel = mapRoleLabel(profile?.role || (user ? 'customer' : 'guest'));
  const discordStatus = liveAccountSnapshot.discordStatus || null;
  const accessLabel = !user
    ? 'Offen'
    : discordStatus?.configured
      ? discordStatus?.inGuild
        ? `${roleLabel} · Discord ok`
        : discordStatus?.connected
          ? `${roleLabel} · Server offen`
          : `${roleLabel} · Discord offen`
      : roleLabel;

  setBadgeState('accountDbStatusBadge', connectionReady ? 'Verbunden' : 'Offen', connectionReady ? 'ready' : 'warn');
  setBadgeState('accountAuthStatusBadge', user ? 'Live' : connectionReady ? 'Bereit' : 'Offen', user ? 'ready' : connectionReady ? 'draft' : 'warn');
  setBadgeState('accountAccessStatusBadge', accessLabel, user ? (discordStatus?.configured && !discordStatus?.inGuild ? 'draft' : 'ready') : 'warn');
  setBadgeState('accountBridgeStatusBadge', foundation.webhookUrl ? 'Vorbereitet' : 'Wartet', foundation.webhookUrl ? 'ready' : 'warn');
}

async function fetchLiveDiscordStatus({ force = false } = {}) {
  if (!liveAccountSnapshot.user || !liveAccountSnapshot.session?.access_token) {
    liveAccountSnapshot.discordStatus = null;
    discordStatusCheckedAtMs = 0;
    return null;
  }

  if (!force && liveAccountSnapshot.discordStatus && (Date.now() - discordStatusCheckedAtMs) < discordStatusCacheMs) {
    return liveAccountSnapshot.discordStatus;
  }

  if (discordStatusInFlight) return discordStatusInFlight;

  discordStatusInFlight = (async () => {
    const response = await fetch(`${TEBEX_BACKEND_BASE_URL}/api/discord/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${liveAccountSnapshot.session.access_token}`,
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || payload?.message || 'Discord-Status konnte nicht geladen werden.');
    }

    const normalized = normalizeDiscordStatusPayload(payload, liveAccountSnapshot.user, liveAccountSnapshot.profile);
    liveAccountSnapshot.discordStatus = normalized;
    discordStatusCheckedAtMs = Date.now();
    return normalized;
  })();

  try {
    return await discordStatusInFlight;
  } finally {
    discordStatusInFlight = null;
  }
}

function setDiscordButtonsBusy(isBusy, label = '', activeMode = '') {
  ['signin', 'link'].forEach((mode) => {
    document.querySelectorAll(`[data-auth-discord="${mode}"]`).forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent || '';
      }
      button.disabled = isBusy;
      if (isBusy && activeMode && mode === activeMode && label) {
        button.textContent = label;
      } else if (!isBusy && button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    });
  });

  const elements = getDiscordElements();
  if (elements.refreshButton) {
    elements.refreshButton.disabled = isBusy;
  }
}

async function handleDiscordAuthAction(mode = 'signin') {
  const client = getSupabaseClient();
  const authElements = getAuthElements();
  const discordElements = getDiscordElements();

  if (!client) {
    const target = authElements.loginMessage || authElements.registerMessage || discordElements.message;
    setAuthMessage(target, 'Supabase ist noch nicht verbunden.', 'warn');
    return;
  }

  if (mode === 'link' && !liveAccountSnapshot.user) {
    openAuthModal('login');
    return;
  }

  const resolvedMode = resolveDiscordAuthMode(mode);
  setDiscordButtonsBusy(true, buildDiscordAuthStartMessage(resolvedMode), resolvedMode);

  try {
    const options = {
      redirectTo: getCurrentDiscordAuthRedirectUrl(),
      scopes: 'identify email',
      queryParams: resolvedMode === 'link'
        ? { hm_discord_link: '1' }
        : { hm_discord_signin: '1' },
    };

    const result = resolvedMode === 'link' && liveAccountSnapshot.user
      ? await client.auth.linkIdentity({ provider: 'discord', options })
      : await client.auth.signInWithOAuth({ provider: 'discord', options });

    if (result?.error) throw result.error;
  } catch (error) {
    const target = discordElements.message || authElements.loginMessage || authElements.registerMessage;
    setAuthMessage(target, getDiscordLinkConflictMessage(error) || 'Discord-Verbindung konnte nicht gestartet werden.', 'warn');
    setDiscordButtonsBusy(false);
  }
}

async function handleDiscordStatusRefresh({ force = true } = {}) {
  const discordElements = getDiscordElements();

  if (!liveAccountSnapshot.user || !liveAccountSnapshot.session?.access_token) {
    updateDiscordStatusUi(null);
    return null;
  }

  if (discordElements.refreshButton) {
    discordElements.refreshButton.disabled = true;
    discordElements.refreshButton.textContent = 'Prüfe ...';
  }

  try {
    const status = await fetchLiveDiscordStatus({ force });
    updateDiscordStatusUi(status);
    updateAccountStatusBadges(liveAccountSnapshot.user, liveAccountSnapshot.profile);
    setAccountShellUi(liveAccountSnapshot.user, liveAccountSnapshot.profile);
    updateAccountDock(liveAccountSnapshot.user, liveAccountSnapshot.profile);
    hydrateProfileEditor(liveAccountSnapshot.user, liveAccountSnapshot.profile);
    return status;
  } catch (error) {
    setAuthMessage(discordElements.message, String(error?.message || 'Discord-Status konnte nicht geprüft werden.'), 'warn');
    return null;
  } finally {
    if (discordElements.refreshButton) {
      discordElements.refreshButton.disabled = false;
      discordElements.refreshButton.textContent = 'Discord prüfen';
    }
  }
}

async function ensureDiscordReadyForCheckout() {
  const status = await handleDiscordStatusRefresh({ force: false });

  if (!status?.configured || !status.requiredForCheckout) {
    return true;
  }

  if (!status.connected) {
    openAuthModal('login');
    setAuthMessage(getDiscordElements().message, 'Bitte verbinde zuerst dein Discord-Konto, bevor du einkaufst.', 'warn');
    return false;
  }

  if (!status.inGuild) {
    setAuthMessage(getDiscordElements().message, `Bitte tritt zuerst dem ${status.guildName || 'Hammer Modding'} Discord bei und prüfe danach erneut.`, 'warn');
    return false;
  }

  return true;
}

async function refreshLiveAuthUi() {
  const elements = getAuthElements();
  const client = getSupabaseClient();

  if (!client) {
    liveAccountSnapshot = { user: null, profile: null, session: null, discordStatus: null, connectionReady: false };
    updateAccountStatusBadges(null, null);
    setAccountShellUi(null, null);
    updateAccountDock(null, null);
    hydrateProfileEditor(null, null);
    updateDiscordStatusUi(null);
    updateRequestDraftFields(loadVisibleCart());
    setCheckoutButtonsLoadingState(false);
    return;
  }

  const { data } = await client.auth.getSession();

  const session = data?.session || null;
  const user = session?.user || null;
  if (user?.id) updateAccountActivity(user.id, { lastSeenAt: new Date().toISOString() });

  let profile = user ? await fetchLiveProfile(user.id) : null;
  if (user && !profile) {
    profile = await upsertLiveProfile(user, {
      last_seen_at: new Date().toISOString(),
    });
  }

  liveAccountSnapshot = {
    user,
    profile,
    session,
    discordStatus: null,
    connectionReady: true,
  };

  let discordStatus = null;
  if (user && session?.access_token) {
    try {
      discordStatus = await fetchLiveDiscordStatus({ force: true });
    } catch (error) {
      discordStatus = normalizeDiscordStatusPayload(null, user, profile);
    }
  }

  liveAccountSnapshot.discordStatus = discordStatus;

  const displayUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || '-';
  const displayDiscord = discordStatus?.displayName || profile?.discord_name || user?.user_metadata?.discord_name || '-';
  const displayCfx = profile?.cfx_identifier || user?.user_metadata?.cfx_identifier || '-';
  const displayRole = mapRoleLabel(profile?.role || 'customer');
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

  updateAccountStatusBadges(user, profile);
  setAccountShellUi(user, profile);
  updateAccountDock(user, profile);
  hydrateProfileEditor(user, profile);
  updateDiscordStatusUi(discordStatus);
  updateAdminPortalAccess();
  adminPortalState.initialized = false;
  updateRequestDraftFields(loadVisibleCart());
  setupPresenceHeartbeat();
  refreshActiveUsersUi();
  if (!systemSection?.classList.contains('hidden-section')) {
    loadAdminPortalData(true);
  }
}

async function handleLiveRegister(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  const elements = getAuthElements();
  if (!client) {
    setAuthMessage(elements.registerMessage, 'Datenbank ist noch nicht verbunden.', 'warn');
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
    const { data, error } = await withTimeout(
      client.auth.signUp({
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
      }),
      12000,
    );

    if (error) throw error;

    if (data?.session?.user) {
      await upsertLiveProfile(data.session.user, {
        username,
        discord_name: discordName,
        cfx_identifier: cfxIdentifier,
        last_login_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }

    const registerForm = elements.registerForm;
    if (registerForm) registerForm.reset();
    setAuthMessage(
      elements.registerMessage,
      data?.session
        ? 'Konto erstellt und eingeloggt.'
        : 'Konto erstellt. Bitte E-Mail-Bestätigung prüfen.',
      'success',
    );
    if (data?.session?.user?.id) updateAccountActivity(data.session.user.id, { lastLoginAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() });
    await refreshLiveAuthUi();
    if (data?.session) scheduleAuthModalClose(150);
  } catch (error) {
    setAuthMessage(elements.registerMessage, formatAuthErrorMessage(error, 'Registrierung'), 'warn');
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
    setAuthMessage(elements.loginMessage, 'Datenbank ist noch nicht verbunden.', 'warn');
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
    elements.loginSubmitButton.textContent = 'Einloggen ...';
  }

  try {
    const { data, error } = await withTimeout(client.auth.signInWithPassword({ email, password }), 12000);
    if (error) throw error;

    if (data?.user) {
      await upsertLiveProfile(data.user, {
        last_login_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }

    if (elements.loginForm) elements.loginForm.reset();
    setAuthMessage(elements.loginMessage, 'Login erfolgreich.', 'success');
    if (data?.user?.id) updateAccountActivity(data.user.id, { lastLoginAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() });
    await refreshLiveAuthUi();
    scheduleAuthModalClose(150);
  } catch (error) {
    setAuthMessage(elements.loginMessage, formatAuthErrorMessage(error, 'Login'), 'warn');
  } finally {
    if (elements.loginSubmitButton) {
      elements.loginSubmitButton.disabled = false;
      elements.loginSubmitButton.textContent = 'Einloggen';
    }
  }
}

async function handleLiveLogout() {
  const client = getSupabaseClient();
  if (!client) return;
  discordStatusCheckedAtMs = 0;
  liveAccountSnapshot.discordStatus = null;
  const { error } = await client.auth.signOut();
  if (error) {
    const editor = getProfileEditorElements();
    setAuthMessage(editor.message, `Logout fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, 'warn');
    return;
  }
  closeAccountDropdown();
  window.clearInterval(accountPresenceTimer);
  await refreshLiveAuthUi();
}

async function handleProfileEditorSave(event) {
  event.preventDefault();
  const user = liveAccountSnapshot.user;
  const elements = getProfileEditorElements();
  if (!user) {
    setAuthMessage(elements.message, 'Melde dich zuerst an.', 'warn');
    return;
  }

  const payload = {
    username: elements.usernameInput?.value.trim() || user.email?.split('@')[0] || '',
    discord_name: elements.discordInput?.value.trim() || '',
    cfx_identifier: elements.cfxInput?.value.trim() || '',
    avatar_url: elements.avatarInput?.value.trim() || '',
    last_seen_at: new Date().toISOString(),
  };

  if (elements.saveButton) {
    elements.saveButton.disabled = true;
    elements.saveButton.textContent = 'Speichere ...';
  }

  try {
    const profile = await upsertLiveProfile(user, payload);
    if (profile) {
      liveAccountSnapshot.profile = profile;
      setAuthMessage(elements.message, 'Profil gespeichert.', 'success');
    } else {
      setAuthMessage(elements.message, 'Profil konnte noch nicht gespeichert werden. Bitte SQL in Supabase ausführen.', 'warn');
    }
    await refreshLiveAuthUi();
  } catch (error) {
    setAuthMessage(elements.message, 'Profil konnte nicht gespeichert werden.', 'warn');
  } finally {
    if (elements.saveButton) {
      elements.saveButton.disabled = false;
      elements.saveButton.textContent = 'Profil speichern';
    }
  }
}

function setupLiveSupabaseAuth() {
  const elements = getAuthElements();
  if (!elements.registerForm || !elements.loginForm) return;

  elements.registerForm.addEventListener('submit', handleLiveRegister);
  elements.loginForm.addEventListener('submit', handleLiveLogin);

  const profileEditor = getProfileEditorElements();
  if (profileEditor.form) {
    profileEditor.form.addEventListener('submit', handleProfileEditorSave);
  }
  if (profileEditor.avatarFileInput) {
    profileEditor.avatarFileInput.addEventListener('change', handleProfileAvatarFileChange);
  }
  if (profileEditor.avatarClearButton) {
    profileEditor.avatarClearButton.addEventListener('click', handleProfileAvatarClear);
  }
  if (profileEditor.usernameInput) {
    profileEditor.usernameInput.addEventListener('input', () => {
      updateProfileAvatarPreview(profileEditor.avatarInput?.value || '', profileEditor.usernameInput?.value || 'HM');
    });
  }

  const client = getSupabaseClient();
  if (client) {
    client.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        refreshLiveAuthUi();
      }, 0);
    });
  }

  setAuthModalTab('login');
  setupActiveUsersRefresh();
  refreshLiveAuthUi().finally(() => {
    maybeResumePendingTebexCheckout();
  });
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

function bindPreparedCartButtons(root = document) {
  const buttons = Array.from(root.querySelectorAll('[data-cart-add="true"]'));

  buttons.forEach((button) => {
    if (button.dataset.cartBound === 'true') return;

    const preparedItem = buildPreparedCartItem(button);

    if (!preparedItem) {
      button.dataset.cartReady = 'false';
      return;
    }

    button.dataset.cartReady = 'true';
    button.dataset.cartBound = 'true';
    button.setAttribute('aria-label', `${preparedItem.name} zum Warenkorb hinzufügen`);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const item = buildPreparedCartItem(button);
      if (!item) return;
      addPreparedItemToCart(item);
      pulsePreparedCartButton(button);
    });
  });
}

function setupPreparedCartButtons() {
  bindPreparedCartButtons(document);

  const initialCart = loadVisibleCart();
  persistVisibleCart(initialCart);
  refreshVisibleCartUi(initialCart);
}


function bindNavigationHandlers() {
  if (navigationHandlersBound) return;
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateNav(btn.dataset.section);
      showSection(btn.dataset.section);
    });
  });
  navigationHandlersBound = true;
}

function applyProductSearchFilter(query = searchInput?.value || '') {
  const q = String(query || '').trim().toLowerCase();
  searchables.forEach((card) => {
    const haystack = (card.innerText + ' ' + (card.dataset.type || '')).toLowerCase();
    card.style.display = haystack.includes(q) ? '' : 'none';
  });
}

function refreshSearchableCards() {
  searchables = Array.from(document.querySelectorAll('.searchable'));
  applyProductSearchFilter(searchInput?.value || '');
}

function bindSearchHandler() {
  if (searchHandlerBound || !searchInput) return;
  searchInput.addEventListener('input', (e) => {
    applyProductSearchFilter(e.target.value);
  });
  searchHandlerBound = true;
}

function getAdminPortalElements() {
  return {
    locked: document.getElementById('adminPortalLocked'),
    lockedCopy: document.getElementById('adminLockedCopy'),
    content: document.getElementById('adminPortalContent'),
    productsMessage: document.getElementById('adminProductsMessage'),
    usersMessage: document.getElementById('adminUsersMessage'),
    supportMessage: document.getElementById('adminSupportMessage'),
    productsList: document.getElementById('adminProductsList'),
    userQuickSelect: document.getElementById('adminUserQuickSelect'),
    userQuickMeta: document.getElementById('adminUserQuickMeta'),
    userEditor: document.getElementById('adminUserEditor'),
    userEditorName: document.getElementById('adminUserEditorName'),
    userEditorMail: document.getElementById('adminUserEditorMail'),
    userEditorCurrentRole: document.getElementById('adminUserEditorCurrentRole'),
    userEditorDiscord: document.getElementById('adminUserEditorDiscord'),
    userEditorStatus: document.getElementById('adminUserEditorStatus'),
    userRoleSelect: document.getElementById('adminUserRoleSelect'),
    userRoleSaveButton: document.getElementById('adminUserRoleSaveButton'),
    supportList: document.getElementById('adminSupportList'),
    productRefreshButton: document.getElementById('adminProductRefreshButton'),
    productSyncButton: document.getElementById('adminProductSyncCatalogButton'),
    productQuickSelect: document.getElementById('adminProductQuickSelect'),
    productForm: document.getElementById('adminProductForm'),
    productFormTitle: document.getElementById('adminProductFormTitle'),
    productFormHint: document.getElementById('adminProductFormHint'),
    productId: document.getElementById('adminProductId'),
    productTitle: document.getElementById('adminProductTitle'),
    productSlug: document.getElementById('adminProductSlug'),
    productCategory: document.getElementById('adminProductCategory'),
    productType: document.getElementById('adminProductType'),
    productPrice: document.getElementById('adminProductPrice'),
    productTebexId: document.getElementById('adminProductTebexId'),
    productImageUrl: document.getElementById('adminProductImageUrl'),
    productImageFile: document.getElementById('adminProductImageFile'),
    productImageHint: document.getElementById('adminProductImageHint'),
    productShort: document.getElementById('adminProductShort'),
    detailTitle: document.getElementById('adminDetailTitle'),
    detailHeadline: document.getElementById('adminDetailHeadline'),
    productFull: document.getElementById('adminProductFull'),
    detailPriceHint: document.getElementById('adminDetailPriceHint'),
    detailSideImageUrl: document.getElementById('adminDetailSideImageUrl'),
    detailFeatureIntro: document.getElementById('adminDetailFeatureIntro'),
    detailPart01: document.getElementById('adminDetailPart01'),
    detailPart02: document.getElementById('adminDetailPart02'),
    detailPart03: document.getElementById('adminDetailPart03'),
    detailEinsatz: document.getElementById('adminDetailEinsatz'),
    detailLook: document.getElementById('adminDetailLook'),
    detailNutzen: document.getElementById('adminDetailNutzen'),
    detailQuick1Label: document.getElementById('adminDetailQuick1Label'),
    detailQuick1Value: document.getElementById('adminDetailQuick1Value'),
    detailQuick2Label: document.getElementById('adminDetailQuick2Label'),
    detailQuick2Value: document.getElementById('adminDetailQuick2Value'),
    detailQuick3Label: document.getElementById('adminDetailQuick3Label'),
    detailQuick3Value: document.getElementById('adminDetailQuick3Value'),
    detailQuick4Label: document.getElementById('adminDetailQuick4Label'),
    detailQuick4Value: document.getElementById('adminDetailQuick4Value'),
    productSort: document.getElementById('adminProductSort'),
    productActive: document.getElementById('adminProductActive'),
    productFeatured: document.getElementById('adminProductFeatured'),
    productResetButton: document.getElementById('adminProductResetButton'),
    productDeleteButton: document.getElementById('adminProductDeleteButton'),
    productSaveButton: document.getElementById('adminProductSaveButton'),
    previewModeCard: document.getElementById('adminPreviewModeCard'),
    previewModeDetail: document.getElementById('adminPreviewModeDetail'),
    previewCardStage: document.getElementById('adminPreviewCardStage'),
    previewDetailStage: document.getElementById('adminPreviewDetailStage'),
    previewCardBadge: document.getElementById('adminPreviewCardBadge'),
    previewCardImage: document.getElementById('adminPreviewCardImage'),
    previewCardTitle: document.getElementById('adminPreviewCardTitle'),
    previewCardText: document.getElementById('adminPreviewCardText'),
    previewCardPrice: document.getElementById('adminPreviewCardPrice'),
    previewCardPriceHint: document.getElementById('adminPreviewCardPriceHint'),
    previewCardAction: document.getElementById('adminPreviewCardAction'),
    previewDetailTag: document.getElementById('adminPreviewDetailTag'),
    previewDetailEyebrow: document.getElementById('adminPreviewDetailEyebrow'),
    previewDetailHeading: document.getElementById('adminPreviewDetailHeading'),
    previewDetailIntro: document.getElementById('adminPreviewDetailIntro'),
    previewDetailPrice: document.getElementById('adminPreviewDetailPrice'),
    previewDetailPriceHint: document.getElementById('adminPreviewDetailPriceHint'),
    previewDetailMainImage: document.getElementById('adminPreviewDetailMainImage'),
    previewDetailFeatureIntro: document.getElementById('adminPreviewDetailFeatureIntro'),
    previewDetailFeaturesGrid: document.getElementById('adminPreviewDetailFeaturesGrid'),
    previewDetailFacts: document.getElementById('adminPreviewDetailFacts'),
    previewDetailSideImage: document.getElementById('adminPreviewDetailSideImage'),
    productsRoleHint: document.getElementById('adminProductsRoleHint'),
    usersRoleHint: document.getElementById('adminUsersRoleHint'),
    supportRoleHint: document.getElementById('adminSupportRoleHint'),
  };
}

function clearAdminPreviewImageObjectUrl() {
  if (adminPortalState.previewImageObjectUrl) {
    try {
      URL.revokeObjectURL(adminPortalState.previewImageObjectUrl);
    } catch (error) {
      // ignore
    }
  }
  adminPortalState.previewImageObjectUrl = '';
  adminPortalState.previewImageObjectKey = '';
}

function getAdminPreviewUploadedImageUrl(elements) {
  const file = elements.productImageFile?.files?.[0] || null;
  if (!file) {
    clearAdminPreviewImageObjectUrl();
    return '';
  }
  const key = `${file.name}:${file.size}:${file.lastModified}`;
  if (adminPortalState.previewImageObjectKey !== key) {
    clearAdminPreviewImageObjectUrl();
    adminPortalState.previewImageObjectUrl = URL.createObjectURL(file);
    adminPortalState.previewImageObjectKey = key;
  }
  return adminPortalState.previewImageObjectUrl;
}

function getAdminPreviewResolvedMainImage(elements) {
  const directUrl = String(elements.productImageUrl?.value || '').trim();
  if (directUrl) return directUrl;
  return getAdminPreviewUploadedImageUrl(elements) || 'assets/content.png';
}

function getAdminPreviewDraftProduct() {
  const elements = getAdminPortalElements();
  const title = String(elements.productTitle?.value || '').trim() || 'Produktname';
  const slug = String(elements.productSlug?.value || '').trim() || slugifyProductValue(title || 'produktname') || 'produktname';
  const category = String(elements.productCategory?.value || 'clothing').trim();
  const productType = String(elements.productType?.value || category || 'clothing').trim();
  const shortDescription = String(elements.productShort?.value || '').trim();
  const priceValue = Number(elements.productPrice?.value || 0);
  const product = {
    title,
    slug,
    category,
    product_type: productType,
    short_description: shortDescription,
    price_eur: Number.isFinite(priceValue) ? priceValue : 0,
    image_url: getAdminPreviewResolvedMainImage(elements),
    tebex_package_id: String(elements.productTebexId?.value || '').trim(),
    is_active: elements.productActive?.checked !== false,
    is_featured: elements.productFeatured?.checked === true,
    sort_order: Number(elements.productSort?.value || 0) || 0,
  };
  const detailPayload = buildDetailPayloadFromAdminForm(elements, product);
  product.full_description = encodeStoredProductDetail(detailPayload);
  product.full_description_text = detailPayload.detailIntro || '';
  return product;
}


function setAdminPreviewImage(element, src, alt = 'Vorschau') {
  if (!element) return;
  const nextSrc = String(src || '').trim() || ADMIN_PREVIEW_PLACEHOLDER;
  element.onerror = () => {
    element.onerror = null;
    element.src = ADMIN_PREVIEW_PLACEHOLDER;
  };
  element.src = nextSrc;
  element.alt = alt;
}

function setAdminPreviewMode(mode = 'detail') {
  const elements = getAdminPortalElements();
  adminPortalState.previewMode = mode === 'card' ? 'card' : 'detail';
  elements.previewModeCard?.classList.toggle('is-active', adminPortalState.previewMode === 'card');
  elements.previewModeDetail?.classList.toggle('is-active', adminPortalState.previewMode === 'detail');
  if (elements.previewCardStage) setVisible(elements.previewCardStage, adminPortalState.previewMode === 'card');
  if (elements.previewDetailStage) setVisible(elements.previewDetailStage, adminPortalState.previewMode === 'detail');
}

function updateAdminProductLivePreview() {
  const elements = getAdminPortalElements();
  if (!elements.previewCardStage || !elements.previewDetailStage) return;
  const draft = getAdminPreviewDraftProduct();
  const detail = resolveProductDetailConfig(draft);
  const presentation = getSupabaseProductPresentation(draft);
  const mainImage = String(draft.image_url || presentation.image || '').trim() || ADMIN_PREVIEW_PLACEHOLDER;
  const sideImage = String(elements.detailSideImageUrl?.value || detail.detailSideImageUrl || '').trim() || mainImage || ADMIN_PREVIEW_PLACEHOLDER;
  const defaultFacts = getDefaultQuickFacts(draft);
  const quickFacts = Array.from({ length: 4 }, (_, index) => {
    const current = detail.quickFacts[index] || {};
    const fallback = defaultFacts[index] || {};
    return {
      label: String(current.label || fallback.label || `Info ${index + 1}`).trim(),
      value: String(current.value || fallback.value || 'Noch nicht befüllt.').trim(),
    };
  });
  const featureItems = [
    { label: 'Teil 01', value: detail.detailPart01 || 'Noch nicht befüllt.' },
    { label: 'Teil 02', value: detail.detailPart02 || 'Noch nicht befüllt.' },
    { label: 'Teil 03', value: detail.detailPart03 || 'Noch nicht befüllt.' },
    { label: 'Einsatz', value: detail.detailEinsatz || 'Noch nicht befüllt.' },
    { label: 'Look', value: detail.detailLook || 'Noch nicht befüllt.' },
    { label: 'Nutzen', value: detail.detailNutzen || 'Noch nicht befüllt.' },
  ];
  const cardAction = draft.category === 'clothing' || hasDynamicProductDetail(draft) ? 'Produkt ansehen' : 'Jetzt ansehen';
  const badgeLabel = presentation.badge || (draft.category === 'scripts' ? 'Script' : draft.category === 'free_scripts' ? 'Free Script' : 'Kleidung');

  if (elements.previewCardBadge) elements.previewCardBadge.textContent = badgeLabel;
  setAdminPreviewImage(elements.previewCardImage, mainImage, `${draft.title} Kartenansicht`);
  if (elements.previewCardTitle) elements.previewCardTitle.textContent = draft.title;
  if (elements.previewCardText) elements.previewCardText.textContent = draft.short_description || 'Kurzer Teaser für Karten und Listen.';
  if (elements.previewCardPrice) elements.previewCardPrice.textContent = formatSupabasePriceLabel(draft.price_eur || 0);
  if (elements.previewCardPriceHint) elements.previewCardPriceHint.textContent = detail.detailPriceHint || getProductTypeLabel(draft.product_type, draft.category);
  if (elements.previewCardAction) elements.previewCardAction.textContent = cardAction;

  if (elements.previewDetailTag) elements.previewDetailTag.textContent = `${getDetailPageTagLabel(draft)} · ${draft.title}`;
  if (elements.previewDetailEyebrow) elements.previewDetailEyebrow.textContent = `Hammer Modding · ${draft.title}`;
  if (elements.previewDetailHeading) {
    elements.previewDetailHeading.innerHTML = `${escapeHtml(detail.detailTitle || draft.title)}<br><span>${escapeHtml(detail.detailHeadline || draft.short_description || draft.title)}</span>`;
  }
  if (elements.previewDetailIntro) elements.previewDetailIntro.textContent = detail.detailIntro || 'Text unter der großen Überschrift auf der Detailseite.';
  if (elements.previewDetailPrice) elements.previewDetailPrice.textContent = formatSupabasePriceLabel(draft.price_eur || 0);
  if (elements.previewDetailPriceHint) elements.previewDetailPriceHint.textContent = detail.detailPriceHint || getProductTypeLabel(draft.product_type, draft.category);
  setAdminPreviewImage(elements.previewDetailMainImage, mainImage, `${draft.title} Detailansicht`);
  if (elements.previewDetailFeatureIntro) elements.previewDetailFeatureIntro.textContent = detail.detailFeatureIntro || 'Kurzer Einleitungstext für den Enthalten-Bereich.';
  if (elements.previewDetailFeaturesGrid) {
    elements.previewDetailFeaturesGrid.innerHTML = featureItems.map((entry) => `
      <article class="admin-preview-feature-item">
        <div class="admin-preview-feature-badge">${escapeHtml(entry.label)}</div>
        <p>${escapeHtml(entry.value)}</p>
      </article>
    `).join('');
  }
  if (elements.previewDetailFacts) {
    elements.previewDetailFacts.innerHTML = quickFacts.map((entry) => `
      <div class="admin-preview-fact-box">
        <strong>${escapeHtml(entry.label)}</strong>
        <span>${escapeHtml(entry.value)}</span>
      </div>
    `).join('');
  }
  setAdminPreviewImage(elements.previewDetailSideImage, sideImage, `${draft.title} Seitenbild`);
  setAdminPreviewMode(adminPortalState.previewMode || 'detail');
}


function mapCatalogTypeToAdminCategory(type) {
  if (type === 'clothing') return 'clothing';
  if (type === 'free-script') return 'free_scripts';
  if (type === 'paid-script') return 'scripts';
  return 'other';
}

function mapCatalogTypeToAdminProductType(type) {
  if (type === 'clothing') return 'clothing';
  if (type === 'free-script') return 'free_script';
  if (type === 'paid-script') return 'script';
  return 'other';
}

function buildCatalogAdminProductEntries() {
  return Object.values(storeCatalog)
    .filter(Boolean)
    .map((item, index) => ({
      id: `catalog:${item.slug}`,
      dbId: '',
      slug: item.slug,
      title: item.name,
      category: mapCatalogTypeToAdminCategory(item.type),
      product_type: mapCatalogTypeToAdminProductType(item.type),
      price_eur: Number(item.price || 0) || 0,
      short_description: '',
      full_description: '',
      image_url: '',
      tebex_package_id: item.tebexPackageId || '',
      is_active: true,
      is_featured: false,
      sort_order: (index + 1) * 10,
      sourceKind: 'catalog',
      sourceLabel: 'Website-Basis',
    }));
}

function mergeAdminPortalProducts(supabaseRows = []) {
  const merged = new Map();
  buildCatalogAdminProductEntries().forEach((entry) => {
    merged.set(entry.slug, entry);
  });

  (Array.isArray(supabaseRows) ? supabaseRows : []).forEach((row) => {
    if (!row) return;
    merged.set(row.slug, {
      ...row,
      id: `db:${row.id}`,
      dbId: row.id,
      sourceKind: 'supabase',
      sourceLabel: 'Supabase',
    });
  });

  return [...merged.values()].sort((a, b) => (Number(a.sort_order || 0) - Number(b.sort_order || 0)) || String(a.title || '').localeCompare(String(b.title || '')));
}

function buildCatalogSyncPayloads() {
  const base = captureBaseProductPresentationMap();
  return buildCatalogAdminProductEntries().map((entry) => {
    const prepared = {
      ...entry,
      short_description: base[entry.slug]?.short || entry.short_description || '',
      image_url: base[entry.slug]?.image || entry.image_url || '',
    };
    const detailConfig = resolveProductDetailConfig(prepared);
    return {
      title: entry.title,
      slug: entry.slug,
      category: entry.category,
      product_type: entry.product_type,
      price_eur: Number(entry.price_eur || 0) || 0,
      short_description: prepared.short_description,
      full_description: encodeStoredProductDetail(detailConfig),
      detail_data: normalizeStoredProductDetail(detailConfig),
      image_url: prepared.image_url,
      tebex_package_id: entry.tebex_package_id || '',
      is_active: entry.is_active !== false,
      is_featured: entry.is_featured === true,
      sort_order: Number(entry.sort_order || 0) || 0,
    };
  });
}

function getAdminProfileById(profileId) {
  return adminPortalState.profiles.find((entry) => entry.id === profileId) || null;
}

function getAdminProductByKey(productKey) {
  return adminPortalState.products.find((entry) => entry.id === productKey) || null;
}

async function convertProductImageFileToDataUrl(file) {
  if (!file) return '';
  if (!String(file.type || '').startsWith('image/')) throw new Error('Bitte nur Bilddateien hochladen.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Das Produktbild ist zu groß. Bitte maximal 8 MB verwenden.');

  const image = await loadImageFromFile(file);
  const maxWidth = 1600;
  const maxHeight = 1200;
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Bild konnte nicht verarbeitet werden.');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/webp', 0.9);
}

function slugifyProductValue(value) {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function setAdminMessage(element, message = '', type = 'neutral') {
  if (!element) return;
  setAuthMessage(element, message, type === 'error' ? 'warn' : type === 'success' ? 'success' : 'neutral');
}

function updateAdminPortalAccess() {
  const elements = getAdminPortalElements();
  if (!elements.locked || !elements.content) return;

  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const roleLabel = mapRoleLabel(liveAccountSnapshot.profile?.role || 'guest');

  if (!liveAccountSnapshot.user || !permissions.canAccessPortal) {
    elements.locked.classList.remove('hidden-section');
    elements.content.classList.add('hidden-section');
    if (elements.lockedCopy) {
      elements.lockedCopy.textContent = liveAccountSnapshot.user
        ? `Deine aktuelle Rolle (${roleLabel}) hat keinen Zugriff auf das Admin-Portal.`
        : 'Melde dich mit einer berechtigten Rolle an, um Produkte, Benutzer und Support zu verwalten.';
    }
    return permissions;
  }

  elements.locked.classList.add('hidden-section');
  elements.content.classList.remove('hidden-section');
  if (elements.productsRoleHint) elements.productsRoleHint.textContent = permissions.canEditProducts ? `${roleLabel} · Produktzugriff` : `${roleLabel} · nur Ansicht`;
  if (elements.usersRoleHint) elements.usersRoleHint.textContent = permissions.canManageRoles ? 'Administrator · aktiv' : `${roleLabel} · keine Rollenvergabe`;
  if (elements.supportRoleHint) elements.supportRoleHint.textContent = permissions.canViewSupport ? `${roleLabel} · Supportzugriff` : `${roleLabel} · kein Supportzugriff`;
  return permissions;
}

function resetAdminProductForm(keepMessage = false) {
  const elements = getAdminPortalElements();
  if (!elements.productForm) return;
  elements.productForm.reset();
  if (elements.productId) elements.productId.value = '';
  if (elements.productSort) elements.productSort.value = '0';
  if (elements.productActive) elements.productActive.checked = true;
  if (elements.productFeatured) elements.productFeatured.checked = false;
  if (elements.productImageFile) elements.productImageFile.value = '';
  clearAdminPreviewImageObjectUrl();
  if (elements.productImageHint) elements.productImageHint.textContent = 'Du kannst eine URL eintragen oder direkt ein Bild hochladen. Ein Upload überschreibt die URL beim Speichern.';
  if (elements.productFormTitle) elements.productFormTitle.textContent = 'Produkt anlegen';
  if (elements.productFormHint) elements.productFormHint.textContent = 'Neu';
  if (elements.productQuickSelect) elements.productQuickSelect.value = '';
  adminPortalState.selectedProductId = '';
  adminPortalState.selectedProductDbId = '';
  adminPortalState.selectedProductSlug = '';
  document.querySelectorAll('.admin-product-card').forEach((card) => card.classList.remove('is-selected'));
  if (!keepMessage) setAdminMessage(elements.productsMessage, '');
  updateAdminProductControls();
  updateAdminProductLivePreview();
}


function hydrateAdminProductForm(product) {
  const elements = getAdminPortalElements();
  if (!product) return resetAdminProductForm(true);
  const detailConfig = resolveProductDetailConfig(product);
  adminPortalState.selectedProductId = product.id || '';
  adminPortalState.selectedProductDbId = product.dbId || '';
  adminPortalState.selectedProductSlug = product.slug || '';
  if (elements.productId) elements.productId.value = product.dbId || '';
  if (elements.productTitle) elements.productTitle.value = product.title || '';
  if (elements.productSlug) elements.productSlug.value = product.slug || '';
  if (elements.productCategory) elements.productCategory.value = product.category || 'clothing';
  if (elements.productType) elements.productType.value = product.product_type || 'clothing';
  if (elements.productPrice) elements.productPrice.value = Number(product.price_eur || 0).toFixed(2);
  if (elements.productTebexId) elements.productTebexId.value = product.tebex_package_id || '';
  if (elements.productImageUrl) elements.productImageUrl.value = product.image_url || getSupabaseProductPresentation(product).image || '';
  if (elements.productShort) elements.productShort.value = product.short_description || '';
  if (elements.detailTitle) elements.detailTitle.value = detailConfig.detailTitle || '';
  if (elements.detailHeadline) elements.detailHeadline.value = detailConfig.detailHeadline || '';
  if (elements.productFull) elements.productFull.value = detailConfig.detailIntro || product.full_description_text || '';
  if (elements.detailPriceHint) elements.detailPriceHint.value = detailConfig.detailPriceHint || '';
  if (elements.detailSideImageUrl) elements.detailSideImageUrl.value = detailConfig.detailSideImageUrl || product.image_url || getSupabaseProductPresentation(product).image || '';
  if (elements.detailFeatureIntro) elements.detailFeatureIntro.value = detailConfig.detailFeatureIntro || '';
  if (elements.detailPart01) elements.detailPart01.value = detailConfig.detailPart01 || '';
  if (elements.detailPart02) elements.detailPart02.value = detailConfig.detailPart02 || '';
  if (elements.detailPart03) elements.detailPart03.value = detailConfig.detailPart03 || '';
  if (elements.detailEinsatz) elements.detailEinsatz.value = detailConfig.detailEinsatz || '';
  if (elements.detailLook) elements.detailLook.value = detailConfig.detailLook || '';
  if (elements.detailNutzen) elements.detailNutzen.value = detailConfig.detailNutzen || '';
  [1, 2, 3, 4].forEach((index) => {
    const fact = detailConfig.quickFacts[index - 1] || { label: '', value: '' };
    if (elements[`detailQuick${index}Label`]) elements[`detailQuick${index}Label`].value = fact.label || '';
    if (elements[`detailQuick${index}Value`]) elements[`detailQuick${index}Value`].value = fact.value || '';
  });
  if (elements.productSort) elements.productSort.value = String(product.sort_order || 0);
  if (elements.productActive) elements.productActive.checked = product.is_active !== false;
  if (elements.productFeatured) elements.productFeatured.checked = product.is_featured === true;
  if (elements.productImageFile) elements.productImageFile.value = '';
  clearAdminPreviewImageObjectUrl();
  if (elements.productImageHint) {
    elements.productImageHint.textContent = product.sourceKind === 'catalog'
      ? 'Frontend-Produkt geladen. Du kannst es jetzt mit URL oder Upload in Supabase übernehmen.'
      : 'Supabase-Produkt geladen. Upload überschreibt die URL beim Speichern.';
  }
  if (elements.productFormTitle) elements.productFormTitle.textContent = product.title || 'Produkt bearbeiten';
  if (elements.productFormHint) elements.productFormHint.textContent = product.sourceKind === 'catalog' ? 'Website-Basis' : 'Bearbeiten';
  document.querySelectorAll('.admin-product-card').forEach((card) => card.classList.toggle('is-selected', card.dataset.productId === product.id));
  updateAdminProductControls();
  updateAdminProductLivePreview();
}


function updateAdminProductControls() {
  const elements = getAdminPortalElements();
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const editable = Boolean(liveAccountSnapshot.user && permissions.canEditProducts);
  const deletable = Boolean(liveAccountSnapshot.user && permissions.canDeleteProducts && adminPortalState.selectedProductDbId);
  [
    elements.productTitle,
    elements.productSlug,
    elements.productCategory,
    elements.productType,
    elements.productPrice,
    elements.productTebexId,
    elements.productImageUrl,
    elements.productImageFile,
    elements.productShort,
    elements.detailTitle,
    elements.detailHeadline,
    elements.productFull,
    elements.detailPriceHint,
    elements.detailSideImageUrl,
    elements.detailFeatureIntro,
    elements.detailPart01,
    elements.detailPart02,
    elements.detailPart03,
    elements.detailEinsatz,
    elements.detailLook,
    elements.detailNutzen,
    elements.detailQuick1Label,
    elements.detailQuick1Value,
    elements.detailQuick2Label,
    elements.detailQuick2Value,
    elements.detailQuick3Label,
    elements.detailQuick3Value,
    elements.detailQuick4Label,
    elements.detailQuick4Value,
    elements.productSort,
    elements.productActive,
    elements.productFeatured,
  ].forEach((field) => {
    if (!field) return;
    field.disabled = !editable;
  });
  if (elements.productSaveButton) elements.productSaveButton.disabled = !editable;
  if (elements.productDeleteButton) elements.productDeleteButton.disabled = !deletable;
  if (elements.previewModeCard) elements.previewModeCard.disabled = false;
  if (elements.previewModeDetail) elements.previewModeDetail.disabled = false;
}

function renderAdminProducts() {
  const elements = getAdminPortalElements();
  if (!elements.productsList) return;
  const products = [...adminPortalState.products].sort((a, b) => (Number(a.sort_order || 0) - Number(b.sort_order || 0)) || String(a.title || '').localeCompare(String(b.title || '')));
  if (elements.productQuickSelect) {
    const options = ['<option value="">Produkt auswählen ...</option>']
      .concat(products.map((product) => `<option value="${escapeHtml(product.id)}"${adminPortalState.selectedProductId === product.id ? ' selected' : ''}>${escapeHtml(product.title || 'Produkt')} · ${escapeHtml(product.sourceLabel || 'Quelle')}</option>`));
    elements.productQuickSelect.innerHTML = options.join('');
  }
  if (!products.length) {
    elements.productsList.innerHTML = '<div class="admin-record-empty">Noch keine Produkte geladen. Sobald Supabase liefert, erscheinen sie hier.</div>';
    return;
  }
  elements.productsList.innerHTML = products.map((product) => {
    const roleType = mapRoleLabel(product.product_type || product.category || 'Produkt');
    const priceLabel = formatSupabasePriceLabel(product.price_eur || 0);
    return `
      <article class="admin-record-card admin-product-card${adminPortalState.selectedProductId === product.id ? ' is-selected' : ''}" data-product-id="${escapeHtml(product.id)}">
        <div class="admin-record-head">
          <div>
            <strong>${escapeHtml(product.title || 'Produkt')}</strong>
            <small>${escapeHtml(product.slug || 'ohne-slug')}</small>
          </div>
          <button class="cta secondary compact-cta" data-admin-product-edit="${escapeHtml(product.id)}" type="button">Bearbeiten</button>
        </div>
        <div class="admin-record-copy">${escapeHtml(getAdminProductPreviewCopy(product) || 'Keine Beschreibung hinterlegt.')}</div>
        <div class="admin-record-meta">
          <span class="admin-record-pill">${escapeHtml(priceLabel)}</span>
          <span class="admin-record-pill">${escapeHtml(roleType)}</span>
          <span class="admin-record-pill ${product.sourceKind === 'catalog' ? 'is-source-catalog' : 'is-source-supabase'}">${escapeHtml(product.sourceLabel || 'Supabase')}</span>
          <span class="admin-record-pill">${product.is_active ? 'Aktiv' : 'Inaktiv'}</span>
          <span class="admin-record-pill">Sortierung ${escapeHtml(String(product.sort_order || 0))}</span>
        </div>
      </article>
    `;
  }).join('');
}

function hydrateAdminUserEditor(profile) {
  const elements = getAdminPortalElements();
  const selected = profile || null;
  const roleLabel = mapRoleLabel(selected?.role || 'kunde');

  if (elements.userQuickMeta) {
    elements.userQuickMeta.textContent = selected
      ? `${selected.email || 'ohne Mail'} · ${selected.discord_name || 'kein Discord'} · ${selected.is_active === false ? 'inaktiv' : 'aktiv'}`
      : 'Bitte Benutzer auswählen, um die Rolle direkt zu bearbeiten.';
  }

  if (elements.userEditorName) elements.userEditorName.textContent = selected?.username || selected?.email || 'Keine Auswahl';
  if (elements.userEditorMail) elements.userEditorMail.textContent = selected?.email || '—';
  if (elements.userEditorCurrentRole) elements.userEditorCurrentRole.textContent = roleLabel;
  if (elements.userEditorDiscord) elements.userEditorDiscord.textContent = selected?.discord_name || '—';
  if (elements.userEditorStatus) elements.userEditorStatus.textContent = selected ? (selected.is_active === false ? 'Inaktiv' : 'Aktiv') : '—';

  if (elements.userRoleSelect) {
    elements.userRoleSelect.value = getNormalizedRole(selected?.role || 'kunde');
    elements.userRoleSelect.disabled = !selected;
  }

  if (elements.userRoleSaveButton) {
    elements.userRoleSaveButton.disabled = !selected;
  }
}

function renderAdminUsers() {
  const elements = getAdminPortalElements();
  if (!elements.userQuickSelect) return;
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const select = elements.userQuickSelect;

  const rebuildOptions = (items = [], placeholder = 'Benutzer auswählen ...') => {
    select.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    items.forEach((profile) => {
      const option = document.createElement('option');
      option.value = String(profile.id || '').trim();
      option.textContent = `${profile.username || profile.email || 'Benutzer'} · ${mapRoleLabel(profile.role || 'kunde')}`;
      select.appendChild(option);
    });
  };

  if (!permissions.canViewUsers) {
    rebuildOptions([], 'Keine Freigabe');
    select.disabled = true;
    hydrateAdminUserEditor(null);
    return;
  }

  if (!adminPortalState.profiles.length) {
    rebuildOptions([], 'Keine Benutzer geladen');
    select.disabled = true;
    hydrateAdminUserEditor(null);
    return;
  }

  if (!getAdminProfileById(adminPortalState.selectedUserId)) {
    adminPortalState.selectedUserId = String(adminPortalState.profiles[0]?.id || '').trim();
  }

  rebuildOptions(adminPortalState.profiles, 'Benutzer auswählen ...');
  select.disabled = false;
  select.value = adminPortalState.selectedUserId || '';
  if (!select.value && adminPortalState.profiles[0]?.id) {
    select.value = String(adminPortalState.profiles[0].id).trim();
    adminPortalState.selectedUserId = select.value;
  }

  hydrateAdminUserEditor(getAdminProfileById(adminPortalState.selectedUserId));
}

function renderAdminSupport() {
  const elements = getAdminPortalElements();
  if (!elements.supportList) return;
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  if (!permissions.canViewSupport) {
    elements.supportList.innerHTML = '<div class="admin-record-empty">Für deine Rolle ist die Support-Inbox nicht freigeschaltet.</div>';
    return;
  }
  if (!adminPortalState.supportRequests.length) {
    elements.supportList.innerHTML = '<div class="admin-record-empty">Noch keine Supportanfragen vorhanden.</div>';
    return;
  }
  elements.supportList.innerHTML = adminPortalState.supportRequests.map((entry) => {
    const status = String(entry.status || 'open');
    return `
      <article class="admin-record-card admin-support-row" data-support-id="${escapeHtml(entry.id || '')}">
        <div class="admin-record-head">
          <div>
            <strong>${escapeHtml(entry.subject || 'Ohne Betreff')}</strong>
            <small>${escapeHtml(entry.name || 'Unbekannt')} · ${escapeHtml(entry.email || entry.discord_name || 'kein Kontakt')}</small>
          </div>
        </div>
        <div class="admin-support-message">${escapeHtml(entry.message || 'Keine Nachricht.')}</div>
        <div class="admin-support-actions">
          <select class="hm-select admin-status-select" data-admin-support-status="${escapeHtml(entry.id || '')}">
            <option value="open"${status === 'open' ? ' selected' : ''}>Offen</option>
            <option value="in_progress"${status === 'in_progress' ? ' selected' : ''}>In Bearbeitung</option>
            <option value="closed"${status === 'closed' ? ' selected' : ''}>Geschlossen</option>
          </select>
          <button class="cta secondary compact-cta" data-admin-support-save="${escapeHtml(entry.id || '')}" type="button">Status speichern</button>
        </div>
      </article>
    `;
  }).join('');
}

async function loadAdminPortalData(force = false) {
  const permissions = updateAdminPortalAccess();
  if (!permissions.canAccessPortal || adminPortalState.loading) return;
  const client = getSupabaseClient();
  if (!client) return;
  if (adminPortalState.initialized && !force) return;

  const elements = getAdminPortalElements();
  adminPortalState.loading = true;
  setAdminMessage(elements.productsMessage, permissions.canViewProducts ? 'Lade Produkte ...' : 'Deine Rolle hat nur eingeschränkten Produktzugriff.');
  setAdminMessage(elements.usersMessage, permissions.canViewUsers ? 'Lade Benutzer ...' : 'Benutzerverwaltung ist aktuell nur für Administratoren freigeschaltet.');
  setAdminMessage(elements.supportMessage, permissions.canViewSupport ? 'Lade Supportanfragen ...' : 'Support-Inbox ist für deine Rolle nicht freigeschaltet.');

  const foundation = loadFoundationState();
  const requests = [];
  if (permissions.canViewProducts) {
    requests.push(
      client.from(foundation.productsTable || 'products').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw { scope: 'products', error };
          const supabaseRows = Array.isArray(data) ? data.map(normalizeSupabaseProductRow).filter(Boolean) : [];
          adminPortalState.products = mergeAdminPortalProducts(supabaseRows);
          renderAdminProducts();
          const supabaseCount = supabaseRows.length;
          const totalCount = adminPortalState.products.length;
          setAdminMessage(elements.productsMessage, `${totalCount} Produkte geladen (${supabaseCount} aus Supabase, ${Math.max(0, totalCount - supabaseCount)} aus dem Website-Stand).`, 'success');
        })
        .catch((wrapped) => {
          const error = wrapped?.error || wrapped;
          adminPortalState.products = mergeAdminPortalProducts([]);
          renderAdminProducts();
          setAdminMessage(elements.productsMessage, `Supabase-Produkte konnten nicht geladen werden. Website-Produkte bleiben sichtbar: ${error.message || 'Unbekannter Fehler'}`, 'error');
        })
    );
  } else {
    adminPortalState.products = [];
    renderAdminProducts();
  }

  if (permissions.canViewUsers) {
    requests.push(
      client.from('profiles').select('id, email, username, discord_name, role, is_active, created_at').order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw { scope: 'profiles', error };
          adminPortalState.profiles = Array.isArray(data) ? data : [];
          if (!getAdminProfileById(adminPortalState.selectedUserId)) {
            adminPortalState.selectedUserId = String(adminPortalState.profiles[0]?.id || '').trim();
          }
          renderAdminUsers();
          setAdminMessage(elements.usersMessage, `${adminPortalState.profiles.length} Benutzer geladen.`, 'success');
        })
        .catch((wrapped) => {
          const error = wrapped?.error || wrapped;
          adminPortalState.profiles = [];
          renderAdminUsers();
          setAdminMessage(elements.usersMessage, `Benutzer konnten nicht geladen werden: ${error.message || 'Unbekannter Fehler'}`, 'error');
        })
    );
  } else {
    adminPortalState.profiles = [];
    renderAdminUsers();
  }

  if (permissions.canViewSupport) {
    requests.push(
      client.from('support_requests').select('*').order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw { scope: 'support', error };
          adminPortalState.supportRequests = Array.isArray(data) ? data : [];
          renderAdminSupport();
          setAdminMessage(elements.supportMessage, `${adminPortalState.supportRequests.length} Supporteinträge geladen.`, 'success');
        })
        .catch((wrapped) => {
          const error = wrapped?.error || wrapped;
          adminPortalState.supportRequests = [];
          renderAdminSupport();
          setAdminMessage(elements.supportMessage, `Support konnte nicht geladen werden: ${error.message || 'Unbekannter Fehler'}`, 'error');
        })
    );
  } else {
    adminPortalState.supportRequests = [];
    renderAdminSupport();
  }

  await Promise.all(requests);
  adminPortalState.loading = false;
  adminPortalState.initialized = true;
  updateAdminProductControls();
}

async function collectAdminProductPayload() {
  const elements = getAdminPortalElements();
  const title = String(elements.productTitle?.value || '').trim();
  const slugInput = String(elements.productSlug?.value || '').trim();
  const slug = slugifyProductValue(slugInput || title);
  let imageUrl = String(elements.productImageUrl?.value || '').trim();
  const uploadFile = elements.productImageFile?.files?.[0] || null;
  if (uploadFile) {
    imageUrl = await convertProductImageFileToDataUrl(uploadFile);
  }
  const draftProduct = {
    title,
    slug,
    category: String(elements.productCategory?.value || 'clothing').trim(),
    product_type: String(elements.productType?.value || 'clothing').trim(),
    price_eur: Number(elements.productPrice?.value || 0) || 0,
    image_url: imageUrl,
    short_description: String(elements.productShort?.value || '').trim(),
  };
  const detailPayload = buildDetailPayloadFromAdminForm(elements, draftProduct);
  return {
    title,
    slug,
    category: draftProduct.category,
    product_type: draftProduct.product_type,
    price_eur: draftProduct.price_eur,
    tebex_package_id: String(elements.productTebexId?.value || '').trim(),
    image_url: imageUrl,
    short_description: draftProduct.short_description,
    full_description: encodeStoredProductDetail(detailPayload),
    detail_data: normalizeStoredProductDetail(detailPayload),
    sort_order: Number(elements.productSort?.value || 0) || 0,
    is_active: Boolean(elements.productActive?.checked),
    is_featured: Boolean(elements.productFeatured?.checked),
  };
}

function stripDetailDataFromProductPayload(payload = {}) {
  const { detail_data: _detailData, ...fallbackPayload } = payload;
  return fallbackPayload;
}

function isMissingDetailDataColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('detail_data') && (message.includes('column') || message.includes('schema cache') || message.includes('could not find'));
}

async function executeAdminProductSave(client, tableName, payload, selectedDbId, includeDetailData = true) {
  const savePayload = includeDetailData ? payload : stripDetailDataFromProductPayload(payload);
  if (selectedDbId) {
    return client.from(tableName).update(savePayload).eq('id', selectedDbId).select('*').single();
  }

  const lookup = await client.from(tableName).select('id').eq('slug', savePayload.slug).limit(1).maybeSingle();
  if (lookup.error) return lookup;
  if (lookup.data?.id) {
    return client.from(tableName).update(savePayload).eq('id', lookup.data.id).select('*').single();
  }
  return client.from(tableName).insert(savePayload).select('*').single();
}

async function saveAdminProductToSupabase(options = {}) {
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const elements = getAdminPortalElements();
  if (!permissions.canEditProducts) {
    return setAdminMessage(elements.productsMessage, 'Deine Rolle darf Produkte nicht bearbeiten.', 'error');
  }
  const client = getSupabaseClient();
  if (!client) return setAdminMessage(elements.productsMessage, 'Supabase ist nicht verbunden.', 'error');

  const payload = await collectAdminProductPayload();
  if (!payload.title || !payload.slug) {
    return setAdminMessage(elements.productsMessage, 'Titel und Slug sind Pflicht.', 'error');
  }
  if (elements.productSlug) elements.productSlug.value = payload.slug;

  const button = options.button || elements.productSaveButton;
  const idleText = options.idleText || button?.textContent || 'Speichern';
  const loadingText = options.loadingText || 'Speichere ...';
  if (button) {
    button.disabled = true;
    button.textContent = loadingText;
  }

  try {
    const tableName = loadFoundationState().productsTable || 'products';
    let result = await executeAdminProductSave(client, tableName, payload, adminPortalState.selectedProductDbId, true);
    let savedWithoutDetailDataColumn = false;

    if (result.error && isMissingDetailDataColumnError(result.error)) {
      result = await executeAdminProductSave(client, tableName, payload, adminPortalState.selectedProductDbId, false);
      savedWithoutDetailDataColumn = true;
    }

    if (result.error) throw result.error;
    const data = result.data;
    const hiddenHint = payload.is_active ? '' : ' Das Produkt ist gespeichert, aber aktuell verborgen/inaktiv.';
    const detailHint = savedWithoutDetailDataColumn
      ? ' Hinweis: Die neue detail_data-Spalte fehlt noch, deshalb wurden die Detaildaten zusätzlich im alten full_description-Fallback gespeichert.'
      : '';
    setAdminMessage(elements.productsMessage, `${payload.title} wurde in Supabase gespeichert.${hiddenHint}${detailHint}`, savedWithoutDetailDataColumn ? 'warn' : 'success');
    resetAdminProductForm(true);
    adminPortalState.initialized = false;
    await loadAdminPortalData(true);
    if (data?.slug) {
      supabaseProductsBooted = false;
      loadSupabaseManagedProducts();
    }
  } catch (error) {
    setAdminMessage(elements.productsMessage, `Speichern fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = idleText;
    }
  }
}

async function handleAdminProductSave(event) {
  event.preventDefault();
  await saveAdminProductToSupabase({
    button: getAdminPortalElements().productSaveButton,
    idleText: 'Speichern',
    loadingText: 'Speichere ...',
  });
}

async function handleAdminProductDelete() {
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const elements = getAdminPortalElements();
  if (!permissions.canDeleteProducts || !adminPortalState.selectedProductDbId) {
    return setAdminMessage(elements.productsMessage, 'Löschen ist für deine Rolle oder ohne gespeichertes Supabase-Produkt nicht erlaubt.', 'error');
  }
  const target = getAdminProductByKey(adminPortalState.selectedProductId);
  if (!target) return;

  const expected = String(target.slug || target.title || '').trim();
  const typed = window.prompt(`Produkt endgültig löschen?\n\nDas entfernt "${target.title}" komplett aus Supabase.\nZum Bestätigen bitte exakt den Slug eingeben:\n${expected}`);
  if (typed === null) return;
  if (String(typed).trim() !== expected) {
    return setAdminMessage(elements.productsMessage, 'Löschen abgebrochen: Bestätigung passte nicht zum Slug.', 'warn');
  }

  const client = getSupabaseClient();
  if (!client) return setAdminMessage(elements.productsMessage, 'Supabase ist nicht verbunden.', 'error');
  try {
    const { error } = await client.from(loadFoundationState().productsTable || 'products').delete().eq('id', adminPortalState.selectedProductDbId);
    if (error) throw error;
    setAdminMessage(elements.productsMessage, `${target.title} wurde endgültig aus Supabase gelöscht.`, 'success');
    resetAdminProductForm(true);
    adminPortalState.initialized = false;
    await loadAdminPortalData(true);
    supabaseProductsBooted = false;
    loadSupabaseManagedProducts();
  } catch (error) {
    setAdminMessage(elements.productsMessage, `Löschen fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, 'error');
  }
}

async function handleAdminCatalogSync() {
  const elements = getAdminPortalElements();
  await saveAdminProductToSupabase({
    button: elements.productSyncButton,
    idleText: 'Formular → Supabase',
    loadingText: 'Speichere ...',
  });
}

async function handleAdminRoleSave(profileId = adminPortalState.selectedUserId) {
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const elements = getAdminPortalElements();
  if (!permissions.canManageRoles) {
    return setAdminMessage(elements.usersMessage, 'Nur Administratoren dürfen Rollen ändern.', 'error');
  }
  const selectedProfile = getAdminProfileById(profileId);
  if (!selectedProfile || !elements.userRoleSelect) {
    return setAdminMessage(elements.usersMessage, 'Bitte zuerst einen Benutzer auswählen.', 'error');
  }
  const nextRole = getNormalizedRole(elements.userRoleSelect.value);
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('profiles').update({ role: nextRole }).eq('id', profileId);
    if (error) throw error;
    setAdminMessage(elements.usersMessage, `Rolle wurde auf ${mapRoleLabel(nextRole)} gesetzt.`, 'success');
    adminPortalState.initialized = false;
    await loadAdminPortalData(true);
    if (liveAccountSnapshot.user?.id === profileId) {
      await refreshLiveAuthUi();
    }
  } catch (error) {
    setAdminMessage(elements.usersMessage, `Rolle konnte nicht gespeichert werden: ${error.message || 'Unbekannter Fehler'}`, 'error');
  }
}

async function handleAdminSupportSave(requestId) {
  const permissions = getAdminPermissions(liveAccountSnapshot.profile?.role || 'guest');
  const elements = getAdminPortalElements();
  if (!permissions.canEditSupport) {
    return setAdminMessage(elements.supportMessage, 'Deine Rolle darf Supportstatus nicht ändern.', 'error');
  }
  const select = document.querySelector(`[data-admin-support-status="${CSS.escape(requestId)}"]`);
  if (!select) return;
  const nextStatus = String(select.value || 'open');
  try {
    const client = getSupabaseClient();
    const payload = {
      status: nextStatus,
      closed_at: nextStatus === 'closed' ? new Date().toISOString() : null,
    };
    const { error } = await client.from('support_requests').update(payload).eq('id', requestId);
    if (error) throw error;
    setAdminMessage(elements.supportMessage, 'Supportstatus gespeichert.', 'success');
    adminPortalState.initialized = false;
    await loadAdminPortalData(true);
  } catch (error) {
    setAdminMessage(elements.supportMessage, `Supportstatus konnte nicht gespeichert werden: ${error.message || 'Unbekannter Fehler'}`, 'error');
  }
}

function setupAdminPortal() {
  if (adminPortalState.bound) return;
  adminPortalState.initialized = false;
  const elements = getAdminPortalElements();
  if (!elements.productForm) return;

  elements.productForm.addEventListener('submit', handleAdminProductSave);
  elements.productResetButton?.addEventListener('click', () => resetAdminProductForm());
  elements.productDeleteButton?.addEventListener('click', handleAdminProductDelete);
  elements.productRefreshButton?.addEventListener('click', async () => {
    setAdminMessage(elements.productsMessage, 'Lade Produkte neu ...');
    adminPortalState.initialized = false;
    await loadAdminPortalData(true);
  });
  elements.productTitle?.addEventListener('input', () => {
    if (!elements.productSlug) return;
    if (!elements.productSlug.value || elements.productSlug.dataset.autofill === 'true') {
      elements.productSlug.value = slugifyProductValue(elements.productTitle.value || '');
      elements.productSlug.dataset.autofill = 'true';
    }
  });
  elements.productSlug?.addEventListener('input', () => {
    elements.productSlug.dataset.autofill = elements.productSlug.value ? 'false' : 'true';
  });

  elements.productQuickSelect?.addEventListener('change', () => {
    const productId = elements.productQuickSelect?.value || '';
    if (!productId) {
      resetAdminProductForm(true);
      return;
    }
    const product = getAdminProductByKey(productId);
    if (product) hydrateAdminProductForm(product);
  });

  elements.userQuickSelect?.addEventListener('change', () => {
    adminPortalState.selectedUserId = String(elements.userQuickSelect?.value || '').trim();
    hydrateAdminUserEditor(getAdminProfileById(adminPortalState.selectedUserId));
  });

  elements.userRoleSaveButton?.addEventListener('click', () => {
    handleAdminRoleSave(adminPortalState.selectedUserId);
  });

  elements.productSyncButton?.addEventListener('click', async () => {
    await handleAdminCatalogSync();
  });

  elements.productImageFile?.addEventListener('change', () => {
    const file = elements.productImageFile?.files?.[0] || null;
    if (elements.productImageHint) {
      elements.productImageHint.textContent = file
        ? `${file.name} ausgewählt. Der Upload überschreibt die Bild-URL beim Speichern.`
        : 'Du kannst eine URL eintragen oder direkt ein Bild hochladen. Ein Upload überschreibt die URL beim Speichern.';
    }
    updateAdminProductLivePreview();
  });

  elements.productForm?.addEventListener('input', () => {
    updateAdminProductLivePreview();
  });
  elements.productForm?.addEventListener('change', () => {
    updateAdminProductLivePreview();
  });

  elements.previewModeCard?.addEventListener('click', () => setAdminPreviewMode('card'));
  elements.previewModeDetail?.addEventListener('click', () => setAdminPreviewMode('detail'));

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-admin-product-edit], [data-admin-support-save]') : null;
    if (!target) return;
    if (target.hasAttribute('data-admin-product-edit')) {
      event.preventDefault();
      const productId = target.getAttribute('data-admin-product-edit') || '';
      const product = getAdminProductByKey(productId);
      if (product) hydrateAdminProductForm(product);
      return;
    }
    if (target.hasAttribute('data-admin-support-save')) {
      event.preventDefault();
      handleAdminSupportSave(target.getAttribute('data-admin-support-save') || '');
    }
  });

  updateAdminPortalAccess();
  resetAdminProductForm(true);
  setAdminPreviewMode(adminPortalState.previewMode || 'detail');
  updateAdminProductLivePreview();
  renderAdminProducts();
  renderAdminUsers();
  renderAdminSupport();
  adminPortalState.bound = true;
}

function initHammerModdingApp() {
  if (appInitialized) return;
  cacheDomReferences();
  bindNavigationHandlers();
  bindSearchHandler();
  setupPreparedCartButtons();
  setupFoundationPlanner();
  setupAdminPortal();
  loadSupabaseManagedProducts();
  setupLiveSupabaseAuth();
  setupSmoothHomeIntro();
  setupMarquees();
  setupCinematicBackground();
  syncVideoPlayback();
  appInitialized = true;
}

document.addEventListener('click', async (e) => {
  const eventTarget = e.target instanceof Element ? e.target : e.target?.parentElement;
  if (!eventTarget) return;

  const accountDockButton = eventTarget.closest('#accountDockButton');
  if (accountDockButton) {
    e.preventDefault();
    if (liveAccountSnapshot.user) {
      showSection('account');
      activateNav('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      openAuthModal('login');
    }
    return;
  }

  const authOpen = eventTarget.closest('[data-auth-open]');
  if (authOpen) {
    e.preventDefault();
    openAuthModal(authOpen.dataset.authOpen || 'login');
    closeAccountDropdown();
    return;
  }

  const authClose = eventTarget.closest('[data-auth-close="true"]');
  if (authClose) {
    e.preventDefault();
    closeAuthModal();
    return;
  }

  const authTab = eventTarget.closest('[data-auth-tab]');
  if (authTab) {
    e.preventDefault();
    setAuthModalTab(authTab.dataset.authTab || 'login');
    return;
  }

  const accountDirect = eventTarget.closest('[data-account-direct]');
  if (accountDirect) {
    e.preventDefault();
    const section = accountDirect.dataset.accountDirect || 'system';
    showSection(section);
    activateNav(section);
    closeAccountDropdown();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const accountNav = eventTarget.closest('[data-account-nav]');
  if (accountNav) {
    e.preventDefault();
    const section = accountNav.dataset.accountNav || 'account';
    showSection(section);
    activateNav(section);
    closeAccountDropdown();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const authOverlay = eventTarget.closest('#authModalOverlay');
  if (authOverlay && eventTarget === authOverlay) {
    closeAuthModal();
    return;
  }


  const removeBtn = eventTarget.closest('[data-cart-remove-id]');
  if (removeBtn) {
    e.preventDefault();
    removeVisibleCartItem(removeBtn.dataset.cartRemoveId || '');
    return;
  }

  const clearBtn = eventTarget.closest('[data-cart-clear="true"]');
  if (clearBtn) {
    e.preventDefault();
    clearVisibleCart();
    return;
  }

  const requestBtn = eventTarget.closest('[data-cart-request="true"]');
  if (requestBtn) {
    e.preventDefault();
    openRequestModal();
    return;
  }

  const copyRequestBtn = eventTarget.closest('[data-copy-request="true"]');
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

  const tebexCheckoutBtn = eventTarget.closest('[data-open-tebex-checkout="true"]');
  if (tebexCheckoutBtn) {
    e.preventDefault();
    await beginLiveTebexCheckout();
    return;
  }

  const copyTebexBtn = eventTarget.closest('[data-copy-tebex-draft="true"]');
  if (copyTebexBtn) {
    e.preventDefault();
    const copied = await copyPreparedTebexDraft();
    if (copied) {
      const originalText = copyTebexBtn.textContent;
      copyTebexBtn.textContent = 'Tebex-Draft kopiert';
      window.setTimeout(() => {
        copyTebexBtn.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const foundationSaveBtn = eventTarget.closest('[data-foundation-save="true"]');
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

  const foundationCopyBtn = eventTarget.closest('[data-foundation-copy="true"]');
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

  const foundationCopySqlBtn = eventTarget.closest('[data-foundation-copy-sql="true"]');
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

  const foundationTestBtn = eventTarget.closest('[data-foundation-test="true"]');
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

  const authRefreshBtn = eventTarget.closest('[data-auth-refresh="true"]');
  if (authRefreshBtn) {
    e.preventDefault();
    await refreshLiveAuthUi();
    return;
  }

  const discordAuthBtn = eventTarget.closest('[data-auth-discord]');
  if (discordAuthBtn) {
    e.preventDefault();
    await handleDiscordAuthAction(discordAuthBtn.dataset.authDiscord || 'signin');
    return;
  }

  const discordRefreshBtn = eventTarget.closest('[data-discord-refresh="true"]');
  if (discordRefreshBtn) {
    e.preventDefault();
    await handleDiscordStatusRefresh({ force: true });
    return;
  }

  const authLogoutBtn = eventTarget.closest('[data-auth-logout="true"]');
  if (authLogoutBtn) {
    e.preventDefault();
    await handleLiveLogout();
    return;
  }

  const openContactBtn = eventTarget.closest('[data-open-contact-request="true"]');
  if (openContactBtn) {
    e.preventDefault();
    openContactRequestFlow();
    return;
  }

  const closeRequestBtn = eventTarget.closest('[data-request-close="true"]');
  if (closeRequestBtn) {
    e.preventDefault();
    closeRequestModal();
    return;
  }

  const overlay = eventTarget.closest('#requestModalOverlay');
  if (overlay && eventTarget === overlay) {
    closeRequestModal();
    return;
  }

  const dynamicDetailBtn = eventTarget.closest('[data-open-dynamic-detail]');
  if (dynamicDetailBtn) {
    e.preventDefault();
    const originSection = dynamicDetailBtn.closest('#freeSection')
      ? 'free'
      : dynamicDetailBtn.closest('#clothingSection')
        ? 'clothing'
        : dynamicDetailBtn.closest('.section-home')
          ? 'home'
          : dynamicDetailBtn.closest('#scriptsSection')
            ? 'scripts'
            : 'scripts';
    openDynamicProductDetail(dynamicDetailBtn.dataset.openDynamicDetail, originSection);
    return;
  }

  const openBtn = eventTarget.closest('[data-open-script]');
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

  const navOpen = eventTarget.closest('[data-nav-open]');
  if (navOpen) {
    e.preventDefault();
    const section = navOpen.dataset.navOpen;
    activateNav(section);
    showSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const backBtn = eventTarget.closest('[data-back]');
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
    closeRequestModal();
    closeAccountDropdown();
  }
});

window.addEventListener('pageshow', () => {
  maybeResumePendingTebexCheckout();
});

window.addEventListener('load', () => {
  maybeResumePendingTebexCheckout();
});

window.addEventListener('focus', () => {
  maybeResumePendingTebexCheckout();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initHammerModdingApp();
    showSection('home');
  }, { once: true });
} else {
  initHammerModdingApp();
  showSection('home');
}

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


function setupMarquees() {
  const tracks = document.querySelectorAll('.slider-track');
  tracks.forEach((track) => {
    track.dataset.cssMarquee = 'true';
  });
}


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

