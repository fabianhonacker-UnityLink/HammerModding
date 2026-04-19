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
};
const searchInput = document.getElementById('searchInput');
const searchables = document.querySelectorAll('.searchable');
let lastSectionBeforeDetail = 'scripts';

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
  activateNav(originSection === 'home' ? 'home' : originSection === 'free' ? 'free' : 'scripts');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackFromDetail() {
  const target = lastSectionBeforeDetail || 'scripts';
  activateNav(target);
  showSection(target);
}

navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    activateNav(btn.dataset.section);
    showSection(btn.dataset.section);
  });
});

document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-open-script]');
  if (openBtn) {
    e.preventDefault();
    const originSection = openBtn.closest('#freeSection')
      ? 'free'
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

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    searchables.forEach((card) => {
      const haystack = (card.innerText + ' ' + (card.dataset.type || '')).toLowerCase();
      card.style.display = haystack.includes(q) ? '' : 'none';
    });
  });
}

showSection('home');


function setupMarquees() {
  const configs = [
    { selector: '.slider-track-paid', speed: 52 },
    { selector: '.slider-track-free', speed: 42 },
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
      x = -groupWidth;
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
      const delta = (ts - lastTs) / 1000;
      lastTs = ts;

      if (!paused && groupWidth > 0) {
        x += cfg.speed * delta;
        if (x >= 0) x = -groupWidth;
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

  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let activeStrikes = [];
  let flashTimer;

  const resizeCanvas = () => {
    w = window.innerWidth;
    h = Math.max(window.innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight);
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const weightedStartX = () => {
    const r = Math.random();
    if (r < 0.22) return w * (0.05 + Math.random() * 0.18);
    if (r < 0.44) return w * (0.24 + Math.random() * 0.16);
    if (r < 0.66) return w * (0.44 + Math.random() * 0.12);
    if (r < 0.84) return w * (0.68 + Math.random() * 0.16);
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
    const branchSteps = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchSteps; i += 1) {
      by += 28 + Math.random() * 54;
      bx += branchDir * (28 + Math.random() * 58);
      branchPoints.push({ x: bx, y: by });
    }
    return {
      points,
      branchPoints,
      start: performance.now(),
      drawMs: 180 + Math.random() * 90,
      holdMs: 110 + Math.random() * 120,
      fadeMs: 160 + Math.random() * 120,
      width: 1.8 + Math.random() * 2.2,
      branchWidth: 1.1 + Math.random() * 1.2,
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

  const renderLightning = () => {
    ctx.clearRect(0, 0, w, h);
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
    requestAnimationFrame(renderLightning);
  };

  const triggerFlash = () => {
    bg.classList.remove('flash-active');
    void bg.offsetWidth;
    bg.classList.add('flash-active');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => bg.classList.remove('flash-active'), 520);
  };

  const launchStrikeBurst = () => {
    activeStrikes.push(buildStrike());
    if (Math.random() > 0.45) setTimeout(() => activeStrikes.push(buildStrike()), 110 + Math.random() * 140);
    if (Math.random() > 0.68) setTimeout(() => activeStrikes.push(buildStrike()), 250 + Math.random() * 160);
    triggerFlash();
    const next = 1800 + Math.random() * 2600;
    setTimeout(launchStrikeBurst, next);
  };

  const spawnDebris = () => {
    const count = 96;
    debrisLayer.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('span');
      const frontBias = Math.random() < 0.42;
      const sideBand = Math.random();
      let startX;
      if (sideBand < 0.35) startX = -8 + Math.random() * 30;
      else if (sideBand < 0.70) startX = 68 + Math.random() * 40;
      else startX = 18 + Math.random() * 64;
      const lowerBias = Math.random() < 0.58;
      const startY = lowerBias ? 34 + Math.random() * 66 : -6 + Math.random() * 86;
      const size = frontBias ? 18 + Math.random() * 88 : 9 + Math.random() * 54;
      const driftX = -30 + Math.random() * 60;
      const driftY = -(26 + Math.random() * 74);
      const opacity = frontBias ? 0.24 + Math.random() * 0.46 : 0.16 + Math.random() * 0.30;
      const duration = frontBias ? 10 + Math.random() * 10 : 14 + Math.random() * 14;
      const delay = -Math.random() * duration;
      const radius = 2 + Math.random() * 8;
      const depth = frontBias ? 30 + Math.random() * 130 : -40 + Math.random() * 100;
      piece.className = `debris ${Math.random() > 0.5 ? 'slow' : 'fast'} ${frontBias ? 'front' : ''}`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (0.54 + Math.random() * 0.92)}px`;
      piece.style.left = `${startX}%`;
      piece.style.top = `${startY}%`;
      piece.style.borderRadius = `${radius}px`;
      piece.style.setProperty('--sx', `${-12 + Math.random() * 24}px`);
      piece.style.setProperty('--sy', `${-8 + Math.random() * 18}px`);
      piece.style.setProperty('--ex', `${driftX * 10}px`);
      piece.style.setProperty('--ey', `${driftY * 10}px`);
      piece.style.setProperty('--r0', `${Math.random() * 180}deg`);
      piece.style.setProperty('--r1', `${220 + Math.random() * 600}deg`);
      piece.style.setProperty('--sc0', `${0.72 + Math.random() * 0.52}`);
      piece.style.setProperty('--sc1', `${0.96 + Math.random() * 0.86}`);
      piece.style.setProperty('--o', opacity.toFixed(2));
      piece.style.transform = `translateZ(${depth}px)`;
      piece.style.animation = `debrisDrift ${duration.toFixed(2)}s linear ${delay.toFixed(2)}s infinite`;
      debrisLayer.appendChild(piece);
    }
  };

  resizeCanvas();
  spawnDebris();
  renderLightning();
  setTimeout(launchStrikeBurst, 800);

  window.addEventListener('resize', () => {
    resizeCanvas();
    spawnDebris();
  });

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 18;
    const y = (e.clientY / window.innerHeight - 0.5) * 14;
    imageLayer.style.transform = `scale(1.12) translate3d(${x}px, ${y}px, 0)`;
    debrisLayer.style.transform = `translate3d(${x * 1.8}px, ${y * 1.8}px, 0)`;
    canvas.style.transform = `translate3d(${x * 0.85}px, ${y * 0.85}px, 0)`;
  });
}

setupCinematicBackground();
