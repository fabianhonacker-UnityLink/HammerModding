const navItems = document.querySelectorAll('.nav-item');
const homeSections = document.querySelectorAll('.section-home');
const scriptsSection = document.getElementById('scriptsSection');
const clothingSection = document.getElementById('clothingSection');
const freeSection = document.getElementById('freeSection');
const contactSection = document.getElementById('contactSection');
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
  version: 'phase-4g-polizei-uniform',
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
    'Bitte später über Tebex / saubere Freischaltung abwickeln.',
    'CFX-Account / Tebex-Konto: [bitte ergänzen]',
    'Discord-Name: [bitte ergänzen]',
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
