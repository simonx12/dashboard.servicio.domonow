// ══════════════════════════════════════════════
//  SIDEBAR & NAVIGATION module
// ══════════════════════════════════════════════
import { $ } from './utils.js';
import { state, currentSection, setCurrentSection } from './state.js';
import { renderSection } from './router.js';

// ── Sidebar collapse ──
export function toggleSidebar() {
  const sidebar = $('sidebar'), tb = $('topbar'), mn = document.querySelector('.main');
  const collapsed = sidebar.classList.toggle('collapsed');
  tb.classList.toggle('collapsed', collapsed);
  mn.classList.toggle('collapsed', collapsed);
  localStorage.setItem('dn_sidebar_collapsed', collapsed ? '1' : '0');
}

export function openMobileSidebar() {
  $('sidebar').classList.add('mobile-open');
  $('sidebarOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeMobileSidebar() {
  $('sidebar').classList.remove('mobile-open');
  $('sidebarOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

export function initSidebarState() {
  const collapsed = localStorage.getItem('dn_sidebar_collapsed') === '1';
  if (collapsed) {
    const sb = $('sidebar'), tb = $('topbar'), mn = document.querySelector('.main');
    if (sb) sb.classList.add('collapsed');
    if (tb) tb.classList.add('collapsed');
    if (mn) mn.classList.add('collapsed');
  }
}

// ── Navigation ──
export function goSection(id) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  $('sec-' + id).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-sec="${id}"]`);
  if (nav) nav.classList.add('active');
  setCurrentSection(id);
  const titleEl = $('topbarTitle');
  if (id === 'strategy')          titleEl.innerHTML = 'Vista de <span style="color:var(--domo)">Estrategia — Abismo</span>';
  else if (id === 'tasks')        titleEl.innerHTML = 'Gestión de <span style="color:var(--domo)">Tareas por Propiedad</span>';
  else if (id === 'abismo-propiedad') titleEl.innerHTML = 'Abismo <span style="color:var(--domo)">Por Propiedad</span>';
  else if (id === 'abismo-porpropiedad') titleEl.innerHTML = 'Abismo <span style="color:var(--domo)">Por Propiedad</span>';
  else if (id === 'lineal')       titleEl.innerHTML = 'Avance <span style="color:var(--domo)">Lineal por Semana</span>';
  else titleEl.innerHTML = 'Panel de <span style="color:var(--domo)">Implementación</span>';
  renderSection(id);
}

export function showSection(id) {
  const { isConnected } = await import('./state.js');
  if (!isConnected) { const { showToast } = await import('./utils.js'); showToast('Conecta primero', 'error'); return; }
  goSection(id);
}

export function goConnect() {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  $('sec-connect').style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  setCurrentSection('connect');
}

// ── User UI ──
export function updateUserUI(user) {
  const block = $('sidebarUser');
  if (!user) { if (block) block.style.display = 'none'; return; }
  const email    = user.email || '';
  const name     = (user.user_metadata?.full_name) || email.split('@')[0] || 'Usuario';
  const initials = name.slice(0, 2).toUpperCase();
  if ($('userAvatar')) $('userAvatar').textContent = initials;
  if ($('userName'))   $('userName').textContent   = name.length > 18 ? name.slice(0, 18) + '…' : name;
  if ($('userEmail'))  $('userEmail').textContent  = email;
  if (block) block.style.display = 'flex';
  if ($('greetingText')) $('greetingText').textContent = name.split(' ')[0];
}

// ── Clock & Greeting ──
export function updateGreeting() {
  const h = new Date().getHours();
  const g = h >= 6 && h < 12 ? 'Buenos días' : h >= 12 && h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const { settings } = await import('./state.js');
  $('greetingLabel').textContent = g;
  $('greetingText').textContent  = settings.userName || 'Admin';
}

export function updateClock() {
  const now  = new Date();
  $('topbarClock').textContent = now.toLocaleTimeString('es-CO');
  const yyyy = now.getFullYear(), mm = String(now.getMonth() + 1).padStart(2, '0'), dd = String(now.getDate()).padStart(2, '0');
  $('sidebarDate').textContent = `${yyyy}-${mm}-${dd}`;
  if (now.getSeconds() === 0) updateGreeting();
}

// ── Theme ──
export function toggleTheme() {
  const { theme: t, setTheme, charts: ch } = await import('./state.js');
  const newTheme = t === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  document.body.dataset.theme = newTheme;
  localStorage.setItem('dn_theme', newTheme);
  $('themeBtn').textContent = newTheme === 'dark' ? '☀️' : '🌙';
  if ($('themeBtn2')) $('themeBtn2').textContent = newTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
  const { destroyChart } = await import('./charts.js');
  Object.keys(ch).forEach(id => destroyChart(id));
  const { currentSection: cs } = await import('./state.js');
  if (cs !== 'login' && cs !== 'connect') renderSection(cs);
}
