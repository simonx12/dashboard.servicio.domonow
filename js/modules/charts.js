// ══════════════════════════════════════════════
//  CHARTS module
//  makeChart, destroyChart, and chart options helpers
// ══════════════════════════════════════════════
import { charts, theme } from './state.js';

export function destroyChart(id) {
  if (charts[id]) {
    try { charts[id].destroy(); } catch(e) {}
    delete charts[id];
  }
}

export function makeChart(id, type, labels, datasets, extra = {}, extraOpts = {}) {
  const canvas = document.getElementById(id); if (!canvas) return;
  destroyChart(id);
  const dk = theme === 'dark';
  const gc = dk ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
  const tc = dk ? '#9287b8' : '#7c6fa0';
  const tb = dk ? '#1e1838' : '#fff';
  const scaleBase = {
    grid:   { color: gc },
    ticks:  { color: tc, font: { family: 'Outfit', size: 10 } },
    border: { color: gc }
  };
  let scales = {};
  if (type !== 'doughnut' && type !== 'pie' && type !== 'radar') {
    scales = {
      x: { ...scaleBase, ...(extraOpts.scales?.x || {}) },
      y: { ...scaleBase, ...(extraOpts.scales?.y || {}) }
    };
  }
  const pluginsOpt = extraOpts.plugins
    ? { legend: { labels: { color: tc, font: { family: 'Outfit', size: 11 }, boxWidth: 12 } }, ...extraOpts.plugins }
    : { legend: { labels: { color: tc, font: { family: 'Outfit', size: 11 }, boxWidth: 12 } },
        tooltip: { backgroundColor: tb, titleColor: dk ? '#ede9ff' : '#16122a', bodyColor: tc, borderColor: dk ? '#2d2448' : '#e0d9f5', borderWidth: 1 } };
  const axisOpt = extraOpts.indexAxis ? { indexAxis: extraOpts.indexAxis } : {};
  charts[id] = new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: { responsive: true, maintainAspectRatio: false, plugins: pluginsOpt, scales, ...axisOpt, ...extra }
  });
}

/** Theme-aware chart colors */
export function chartColors() {
  const dk = theme === 'dark';
  return {
    tc:  dk ? '#9287b8' : '#7c6fa0',
    gc:  dk ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
    tb:  dk ? '#1e1838' : '#fff',
    dk
  };
}
