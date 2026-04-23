// ══════════════════════════════════════════════
//  AUTH & SUPABASE module
//  Login, logout, fetch, insert, update, delete, realtime
// ══════════════════════════════════════════════
import { $, showToast, loadScript } from './utils.js';
import {
  sb, setSb, setSbChannel,
  state, isConnected, setIsConnected,
  autoRefreshTimer, setAutoRefreshTimer,
  settings, propTasks
} from './state.js';
import { goSection, goConnect, updateUserUI } from './sidebar.js';
import { renderSection } from './router.js';

// ── Login helpers ──
export function goLogin() {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  const el = $('sec-login'); if (el) el.style.display = 'flex';
}

export function setLoginLoading(loading) {
  const btn  = $('loginBtn'), txt = $('loginBtnText'),
        arrow = $('loginBtnArrow'), spin = $('loginSpinner');
  if (!btn) return;
  btn.disabled = loading;
  if (txt)   txt.textContent   = loading ? 'Verificando...' : 'Ingresar';
  if (arrow) arrow.style.display = loading ? 'none' : 'inline';
  if (spin)  spin.style.display  = loading ? 'inline-block' : 'none';
}

export function showLoginError(msg) {
  const el = $('loginError'), msgEl = $('loginErrorMsg');
  if (msgEl) msgEl.textContent = msg;
  if (el) el.classList.add('visible');
  setTimeout(() => { if (el) el.classList.remove('visible'); }, 6000);
}

export async function loginUser() {
  const email    = ($('loginEmail')?.value || '').trim();
  const password = $('loginPassword')?.value || '';
  if (!email || !password) { showLoginError('Ingresa tu correo y contraseña.'); return; }
  setLoginLoading(true);
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setLoginLoading(false);
    await onUserLoggedIn(data.user);
  } catch(e) {
    setLoginLoading(false);
    const msg = e.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : e.message;
    showLoginError(msg);
  }
}

export async function logoutUser() {
  try { if (sb) await sb.auth.signOut(); } catch(e) {}
  setIsConnected(false);
  state.properties = [];
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); setAutoRefreshTimer(null); }
  updateUserUI(null);
  showToast('Sesión cerrada', 'success');
  goLogin();
}

export async function onUserLoggedIn(user) {
  setIsConnected(true);
  updateUserUI(user);
  showToast('✅ Bienvenido, ' + (user.user_metadata?.full_name || user.email.split('@')[0]), 'success');
  await fetchAllData();
  startRealtime();
  startAutoRefresh();
  goSection('dashboard');
}

// ── Data operations ──
export async function fetchAllData() {
  if (!sb) return;
  try {
    const { data: props, error } = await sb.from('properties').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    state.properties = (props || []).map(p => ({
      id:           p.id,
      name:         p.name          || '',
      city:         p.city          || '',
      phase:        p.phase         || 'fase0',
      days:         p.days_elapsed  || 0,
      units:        p.units         || 0,
      modules:      Array.isArray(p.active_modules) ? p.active_modules : [],
      module_values:(p.module_values && typeof p.module_values === 'object') ? p.module_values : {},
      notes:        p.notes         || '',
      core_notes:   p.core_notes    || '',
      core_list:    p.core_list     || '',
      entry_date:   p.entry_date    || ''
    }));
    state.lastUpdated = new Date();
    await loadTasksFromSupabase();
    const { currentSection } = await import('./state.js');
    if (currentSection !== 'connect') renderSection(currentSection);
  } catch(e) { showToast('Error al cargar datos', 'error'); }
}

export async function insertSupabase(prop) {
  if (!sb) return;
  const { error } = await sb.from('properties').insert({
    name: prop.name, city: prop.city, phase: prop.phase,
    days_elapsed: prop.days, units: prop.units,
    active_modules: prop.modules, module_values: prop.module_values,
    notes: prop.notes, core_notes: prop.core_notes, core_list: prop.core_list,
    entry_date: new Date(prop.entry_date).toISOString()
  });
  if (error) showToast('Error: ' + error.message, 'error');
}

export async function updateSupabase(id, prop) {
  if (!sb) return;
  const edDate = prop.entry_date ? new Date(prop.entry_date).toISOString() : null;
  const { error } = await sb.from('properties').update({
    name: prop.name, city: prop.city, phase: prop.phase,
    days_elapsed: prop.days, units: prop.units,
    active_modules: prop.modules, module_values: prop.module_values,
    notes: prop.notes, core_notes: prop.core_notes, core_list: prop.core_list, ...(edDate ? { entry_date: edDate } : {})
  }).eq('id', id);
  if (error) showToast('Error: ' + error.message, 'error');
}

export async function deleteSupabase(id) {
  if (!sb) return;
  const { error } = await sb.from('properties').delete().eq('id', id);
  if (error) showToast('Error: ' + error.message, 'error');
}

// ── Tasks ──
export async function saveTaskToSB(propId, task) {
  if (!sb) return null;
  const { data, error } = await sb.from('property_tasks').insert({
    property_id: String(propId),
    category: task.category, text: task.text,
    weight: task.weight,     progress: task.progress
  }).select().single();
  if (error) { showToast('Error guardando tarea: ' + error.message, 'error'); return null; }
  return data;
}

export async function updateTaskProgressSB(taskId, progress) {
  if (!sb) return;
  await sb.from('property_tasks').update({ progress }).eq('id', taskId);
}

export async function deleteTaskSB(taskId) {
  if (!sb) return;
  await sb.from('property_tasks').delete().eq('id', taskId);
}

export async function loadTasksFromSupabase() {
  if (!sb) return;
  const { data, error } = await sb.from('property_tasks').select('*');
  if (error) return;
  const { propTasks: pt } = await import('./state.js');
  // Reset
  for (const k in pt) delete pt[k];
  (data || []).forEach(t => {
    const pid = String(t.property_id);
    if (!pt[pid]) pt[pid] = [];
    pt[pid].push({ id: t.id, category: t.category || 'Innovadores', text: t.text || '', weight: t.weight || 5, progress: t.progress || 0 });
  });
}

// ── Realtime & auto-refresh ──
export function startRealtime() {
  if (!sb) return;
  const ch = sb.channel('dn-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => fetchAllData()).subscribe();
  setSbChannel(ch);
}

export function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  const sec = parseInt(settings.autoRefresh) || 60;
  if (sb && sec > 0) setAutoRefreshTimer(setInterval(() => fetchAllData(), sec * 1000));
}

export async function connectSupabase() {
  const url = $('sbUrl')?.value.trim() || '', key = $('sbKey')?.value.trim() || '';
  if (!url || !key) { showToast('Ingresa URL y Key', 'error'); return; }
  try {
    if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    const client = window.supabase.createClient(url, key);
    const { error } = await client.from('properties').select('id', { count: 'exact', head: true });
    if (error) throw error;
    setSb(client);
    setIsConnected(true);
    showToast('✅ Conectado', 'success');
    await fetchAllData(); startRealtime(); startAutoRefresh(); goSection('dashboard');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

export function disconnectSupabase() { logoutUser(); }
