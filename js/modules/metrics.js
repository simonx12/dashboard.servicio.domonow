// ══════════════════════════════════════════════
//  METRICS — Pure calculation functions
// ══════════════════════════════════════════════
import { MODULES, USAB_META, USE_MODULES, NON_MODULES, PHASE_MODULES } from './config.js';
import { state } from './state.js';

// ── Abismo / Modal meta ──
export function calcMeta(mid, units) {
  const m = MODULES.find(x => x.id === mid);
  if (!m) return 0;
  return m.metaFn(units);
}

export function calcPct(mid, value, units) {
  const meta = calcMeta(mid, units);
  if (!meta || meta <= 0) return 0;
  return Math.min(100, Math.round((value / meta) * 100));
}

// ── Usabilidad meta (independiente del Abismo) ──
export function calcUsabMeta(mid, units) {
  const fn = USAB_META[mid] || USAB_META._default;
  return Math.max(1, fn(units));
}

export function moduleInUse(mid, value, units) {
  return (value || 0) > 0;
}

export function calcUsabPct(mid, value, units) {
  const meta = calcUsabMeta(mid, units);
  return Math.min(100, Math.round(((value || 0) / meta) * 100));
}

// ── Implementación ──
export function getPropProgress(p) {
  const activeMods = (p.modules || []).filter(mid => !NON_MODULES.includes(mid));
  return Math.round((activeMods.length / USE_MODULES.length) * 100);
}

export function getGlobalProgress() {
  if (!state.properties.length) return 0;
  return Math.round(
    state.properties.reduce((s, p) => s + getPropProgress(p), 0) / state.properties.length
  );
}

// ── Color helpers ──
export function pctColor(pct) {
  return pct >= 80 ? '#00b460' : pct >= 50 ? '#e67e00' : '#820ad1';
}

export function pctBadgeClass(pct) {
  return pct >= 80 ? 'c-green' : pct >= 50 ? 'c-orange' : 'c-purple';
}

// ── Phase helpers ──
export function getModulesForPhase(phase) {
  if (phase === 'fase0') return [...PHASE_MODULES.fase0];
  if (phase === 'fase1') return [...PHASE_MODULES.fase0, ...PHASE_MODULES.fase1];
  if (phase === 'fase2') return [...PHASE_MODULES.fase0, ...PHASE_MODULES.fase1, ...PHASE_MODULES.fase2];
  if (phase === 'fase3') return [...PHASE_MODULES.fase0, ...PHASE_MODULES.fase1, ...PHASE_MODULES.fase2, ...PHASE_MODULES.fase3];
  return [];
}
