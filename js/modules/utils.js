// ══════════════════════════════════════════════
//  UTILS — Shared helpers
// ══════════════════════════════════════════════

export const $ = id => document.getElementById(id);

// ── Toast ──
export function showToast(msg, type = '') {
  const c = $('toastContainer');
  if (!c) return;
  const e = document.createElement('div');
  e.className = 'toast' + (type ? ' toast-' + type : '');
  e.textContent = msg;
  c.appendChild(e);
  setTimeout(() => {
    e.style.opacity = '0';
    e.style.transform = 'translateX(36px)';
    setTimeout(() => e.remove(), 350);
  }, 3000);
}

// ══════════════════════════════════════════════
//  ★ COUNTER ANIMATION (new!)
//  Animates a numeric value from `from` to `to`
//  inside an element, with easing.
//
//  Usage:
//    animateCounter(element, 0, 82, { suffix: '%', duration: 900 })
// ══════════════════════════════════════════════
export function animateCounter(el, from, to, { suffix = '', prefix = '', duration = 700, decimals = 0 } = {}) {
  if (!el) return;
  const start    = performance.now();
  const range    = to - from;
  const easeOut  = t => 1 - Math.pow(1 - t, 3); // cubic ease-out

  function tick(now) {
    const elapsed  = Math.min(now - start, duration);
    const progress = easeOut(elapsed / duration);
    const value    = from + range * progress;
    el.textContent = prefix + value.toFixed(decimals) + suffix;
    if (elapsed < duration) requestAnimationFrame(tick);
    else el.textContent = prefix + to.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(tick);
}

// ══════════════════════════════════════════════
//  ★ SKELETON LOADERS (new!)
//  Returns HTML strings for different skeleton shapes.
//  CSS is in css/skeletons.css
// ══════════════════════════════════════════════

/** Generic single skeleton block */
export function skeletonBlock(cls = '') {
  return `<div class="skeleton ${cls}"></div>`;
}

/** KPI card skeleton (matches .kpi-card layout) */
export function skeletonKpiCard() {
  return `
    <div class="skeleton-kpi-card">
      <div class="skeleton skeleton-kpi-label"></div>
      <div class="skeleton skeleton-kpi-value"></div>
      <div class="skeleton skeleton-kpi-sub"></div>
    </div>`;
}

/** Full KPI strip (4 cards) */
export function skeletonKpiStrip(count = 4) {
  return Array.from({ length: count }, skeletonKpiCard).join('');
}

/** Table row skeleton */
export function skeletonTableRow(cols = 7) {
  return `<tr>${Array.from({ length: cols }, () =>
    `<td><div class="skeleton skeleton-cell"></div></td>`
  ).join('')}</tr>`;
}

/** Table body skeleton (n rows) */
export function skeletonTableBody(rows = 5, cols = 7) {
  return Array.from({ length: rows }, () => skeletonTableRow(cols)).join('');
}

/** Progress card skeleton */
export function skeletonProgressCard() {
  return `
    <div class="skeleton-progress-card">
      <div class="skeleton skeleton-card-title"></div>
      <div class="skeleton skeleton-card-sub"></div>
      <div class="skeleton skeleton-card-bar"></div>
      <div class="skeleton skeleton-card-mods"></div>
    </div>`;
}

/** Chart area skeleton */
export function skeletonChart() {
  return `<div class="skeleton skeleton-chart"></div>`;
}

// ── Date helpers ──
export function getDaysFromEntry(p) {
  if (!p.entry_date) return p.days || 0;
  const start = new Date(p.entry_date);
  if (isNaN(start.getTime())) return p.days || 0;
  const s     = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const t     = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.max(0, Math.floor((today - s) / 86400000));
}

export function getPropWeek(p) {
  const d = getDaysFromEntry(p);
  return Math.min(8, Math.max(1, Math.floor(d / 7) + 1));
}

export function getLastFriday(offset = 0) {
  const d   = new Date();
  const day  = d.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff + offset);
  return d.toISOString().split('T')[0];
}

// ── Script loader ──
export function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
