
// ══════════════════════════════════════════════════════
//  MODULE DEFINITIONS
// ══════════════════════════════════════════════════════
const MODULES = [
  {id:'configuracion',label:'Configuración',icon:'⚙️',unit:'ítems configurados',metaLabel:u=>`Meta: configuración completa del conjunto`,metaFn:u=>1},
  {id:'capacitacion',label:'Capacitación',icon:'🎓',unit:'sesiones realizadas',metaLabel:u=>`Meta: ${Math.round(u*0.30)} residentes capacitados (30% de ${u})`,metaFn:u=>Math.round(u*0.30)},
  {id:'acceso',label:'Acceso',icon:'🔑',unit:'pases de acceso',metaLabel:u=>`Meta: ${Math.round(u*0.50)} pases (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'muro',label:'Muro',icon:'💬',unit:'publicaciones/mes',metaLabel:u=>`Meta fija: 8 publicaciones al mes`,metaFn:u=>8},
  {id:'alertas',label:'Alertas',icon:'🔔',unit:'alertas/mes',metaLabel:u=>`Meta: mínimo 2, ideal 5 alertas/mes`,metaFn:u=>2},
  {id:'solicitudes',label:'Solicitudes',icon:'📋',unit:'aptos con solicitudes',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'zonas',label:'Zonas Comunes',icon:'⬜',unit:'reservas/mes',metaLabel:u=>`Meta: ${Math.round(u*0.50)} reservas (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'encuestas',label:'Encuestas',icon:'📊',unit:'aptos participantes',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'votaciones',label:'Votaciones',icon:'🗳️',unit:'aptos participantes',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'eventos',label:'Eventos',icon:'📅',unit:'eventos publicados',metaLabel:u=>`Meta: 4 eventos al mes`,metaFn:u=>4},
  {id:'asambleas',label:'Asambleas',icon:'🏛️',unit:'aptos participantes',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'normativo',label:'Normativo',icon:'📜',unit:'documentos normativos publicados',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos con acceso (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'documentos',label:'Documental',icon:'📄',unit:'aptos con acceso',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'financiero',label:'Financiero',icon:'💰',unit:'aptos activos',metaLabel:u=>`Meta: ${Math.round(u*0.50)} aptos (50% de ${u})`,metaFn:u=>Math.round(u*0.50)},
  {id:'superadmin',label:'Superadministrador',icon:'👑',unit:'usuarios superadmin activos',metaLabel:u=>`Meta: 1 superadmin configurado`,metaFn:u=>1}
];

// Configuración y Capacitación son PREREQUISITOS, NO módulos de uso
const NON_MODULES=['configuracion','capacitacion'];
// Módulos reales de uso (sin configuración ni capacitación)
const USE_MODULES=MODULES.filter(m=>!NON_MODULES.includes(m.id));

function calcMeta(mid,units){const m=MODULES.find(x=>x.id===mid);if(!m)return 0;return m.metaFn(units);}
function calcPct(mid,value,units){const meta=calcMeta(mid,units);if(!meta||meta<=0)return 0;return Math.min(100,Math.round((value/meta)*100));}

// Phase → modules mapping
const PHASE_MODULES = {
  fase0: ['configuracion','capacitacion'],
  fase1: ['acceso','muro','alertas','solicitudes'],
  fase2: ['zonas','encuestas','votaciones','eventos'],
  fase3: ['asambleas','normativo','documentos','financiero','superadmin']
};
// All modules for a given phase (cumulative: fase2 includes fase1, etc.)
function getModulesForPhase(phase) {
  if(phase==='fase0') return [...PHASE_MODULES.fase0];
  if(phase==='fase1') return [...PHASE_MODULES.fase0,...PHASE_MODULES.fase1];
  if(phase==='fase2') return [...PHASE_MODULES.fase0,...PHASE_MODULES.fase1,...PHASE_MODULES.fase2];
  if(phase==='fase3') return [...PHASE_MODULES.fase0,...PHASE_MODULES.fase1,...PHASE_MODULES.fase2,...PHASE_MODULES.fase3];
  return [];
}

const PHASES={
  fase0:{label:'Fase 0',color:'#0ea5e9',bg:'rgba(14,165,233,.1)',pill:'pill-fase0'},
  fase1:{label:'Fase 1',color:'#820ad1',bg:'rgba(130,10,209,.1)',pill:'pill-impl'},
  fase2:{label:'Fase 2',color:'#e67e00',bg:'rgba(247,181,0,.12)',pill:'pill-pilot'},
  fase3:{label:'Fase 3',color:'#00b460',bg:'rgba(0,180,100,.1)',pill:'pill-support'}
};

// ══════ STATE ══════
let sb=null,sbChannel=null,charts={};
let activeFilter='all',searchQuery='',progressFilter='all';
let theme=localStorage.getItem('dn_theme')||'light';
let isConnected=false,autoRefreshTimer=null,currentSection='connect';
let settings={autoRefresh:60,userName:'',curWeekStart:'',prevWeekStart:''};
let state={properties:[],weekData:{current:{},previous:{}},lastUpdated:null};
let strategyView='cards',strategyPhaseFilter='all';
let selectedPropId=null,roadSelectedPropId=null,roadCategory='Administradores';
let propTasks = {};

async function savePropTasks() {
  // Solo guarda en localStorage como cache local rápido
  // La fuente de verdad es Supabase
}

async function saveTaskToSB(propId, task) {
  if (!sb) return null;
  const { data, error } = await sb.from('property_tasks').insert({
    property_id: String(propId),
    category: task.category,
    text: task.text,
    weight: task.weight,
    progress: task.progress
  }).select().single();
  if (error) { showToast('Error guardando tarea: ' + error.message, 'error'); return null; }
  return data;
}

async function updateTaskProgressSB(taskId, progress) {
  if (!sb) return;
  await sb.from('property_tasks').update({ progress }).eq('id', taskId);
}

async function deleteTaskSB(taskId) {
  if (!sb) return;
  await sb.from('property_tasks').delete().eq('id', taskId);
}

async function loadTasksFromSupabase() {
  if (!sb) return;
  const { data, error } = await sb.from('property_tasks').select('*');
  if (error) return;
  propTasks = {};
  (data || []).forEach(t => {
    const pid = String(t.property_id);
    if (!propTasks[pid]) propTasks[pid] = [];
    propTasks[pid].push({
      id: t.id,
      category: t.category || 'Innovadores',
      text: t.text || '',
      weight: t.weight || 5,
      progress: t.progress || 0
    });
  });
}

// Persistencia local eliminada — fuente única: Supabase
function saveStateLocal(){ /* no-op: todo se guarda en Supabase */ }
function loadStateLocal(){ return false; /* siempre cargar desde Supabase */ }
const $=id=>document.getElementById(id);

// ══════ HELPERS ══════
function getPropProgress(p){
  // Implementación = módulos activos de uso / 13 módulos totales de uso
  const TOTAL_MODULES = USE_MODULES.length; // 13
  const activeMods = (p.modules||[]).filter(mid=>!NON_MODULES.includes(mid));
  return Math.round((activeMods.length / TOTAL_MODULES) * 100);
}
function getGlobalProgress(){if(!state.properties.length)return 0;return Math.round(state.properties.reduce((s,p)=>s+getPropProgress(p),0)/state.properties.length);}
function pctColor(pct){return pct>=80?'#00b460':pct>=50?'#e67e00':'#820ad1';}
function pctBadgeClass(pct){return pct>=80?'c-green':pct>=50?'c-orange':'c-purple';}

// ══════ DEMO DATA ══════
function useDemoData(){ showToast('Modo demo desactivado. Conecta a Supabase.','error'); }

// ══════ NAVIGATION ══════
function goSection(id){
  document.querySelectorAll('[id^="sec-"]').forEach(s=>s.style.display='none');
  $('sec-'+id).style.display='block';
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const nav=document.querySelector(`.nav-item[data-sec="${id}"]`);
  if(nav)nav.classList.add('active');
  currentSection=id;
  const titleEl=$('topbarTitle');
  if(id==='strategy'){titleEl.innerHTML='Vista de <span style="color:var(--domo)">Estrategia — Abismo</span>';strategyView='overview';}
  if(id==='tasks'){titleEl.innerHTML='Gestión de <span style="color:var(--domo)">Tareas por Propiedad</span>';}
  if(id==='abismo-propiedad'){titleEl.innerHTML='Abismo <span style="color:var(--domo)">Por Propiedad</span>';strategyView='cards';}

  if(id==='abismo-porpropiedad'){titleEl.innerHTML='Abismo <span style="color:var(--domo)">Por Propiedad</span>';strategyView='prop';}
  if(id==='lineal'){titleEl.innerHTML='Avance <span style="color:var(--domo)">Lineal por Semana</span>';}
  else{titleEl.innerHTML='Panel de <span style="color:var(--domo)">Implementación</span>';}
  renderSection(id);
}
function showSection(id){if(!isConnected){showToast('Conecta primero o usa Demo','error');return;}goSection(id);}
function goConnect(){document.querySelectorAll('[id^="sec-"]').forEach(s=>s.style.display='none');$('sec-connect').style.display='block';document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));currentSection='connect';}
function renderSection(id){
  if(id==='dashboard'){renderKPIs();renderPhases();renderDashCharts();}
  if(id==='properties')renderPropertiesTable();
  if(id==='modules')renderModulesSection();
  if(id==='progress')renderProgressSection();
  if(id==='charts')renderChartsPage();
  if(id==='settings'){renderSettings();updateLocalDataInfo();renderWeekCompare();}
  if(id==='strategy')renderStrategySection();
  if(id==='tasks')renderTasksSection();
  if(id==='abismo-propiedad'){strategyView='cards';renderStrategyFromNav('cards');}

  if(id==='abismo-porpropiedad'){strategyView='prop';renderStrategyFromNav('prop');}
  if(id==='lineal'){renderLinealSection();}
}

// ══════ SUPABASE ══════
async function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}

// ── Login helpers ──
function goLogin(){
  document.querySelectorAll('[id^="sec-"]').forEach(s=>s.style.display='none');
  const el=$('sec-login');if(el)el.style.display='flex';
  currentSection='login';
}

function setLoginLoading(loading){
  const btn=$('loginBtn'),txt=$('loginBtnText'),arrow=$('loginBtnArrow'),spin=$('loginSpinner');
  if(!btn)return;
  btn.disabled=loading;
  if(txt)txt.textContent=loading?'Verificando...':'Ingresar';
  if(arrow)arrow.style.display=loading?'none':'inline';
  if(spin)spin.style.display=loading?'inline-block':'none';
}

function showLoginError(msg){
  const el=$('loginError'),msgEl=$('loginErrorMsg');
  if(msgEl)msgEl.textContent=msg;
  if(el)el.classList.add('visible');
  setTimeout(()=>{if(el)el.classList.remove('visible');},6000);
}

function updateUserUI(user){
  const block=$('sidebarUser');
  if(!user){if(block)block.style.display='none';return;}
  const email=user.email||'';
  const name=(user.user_metadata?.full_name)||email.split('@')[0]||'Usuario';
  const initials=name.slice(0,2).toUpperCase();
  if($('userAvatar'))$('userAvatar').textContent=initials;
  if($('userName'))$('userName').textContent=name.length>18?name.slice(0,18)+'…':name;
  if($('userEmail'))$('userEmail').textContent=email;
  if(block)block.style.display='flex';
  if($('greetingText'))$('greetingText').textContent=name.split(' ')[0];
}

async function onUserLoggedIn(user){
  isConnected=true;
  updateUserUI(user);
  showToast('✅ Bienvenido, '+(user.user_metadata?.full_name||user.email.split('@')[0]),'success');
  await fetchAllData();startRealtime();startAutoRefresh();
  goSection('dashboard');
}

async function loginUser(){
  const email=($('loginEmail')?.value||'').trim();
  const password=$('loginPassword')?.value||'';
  if(!email||!password){showLoginError('Ingresa tu correo y contraseña.');return;}
  setLoginLoading(true);
  try{
    const{data,error}=await sb.auth.signInWithPassword({email,password});
    if(error)throw error;
    setLoginLoading(false);
    await onUserLoggedIn(data.user);
  }catch(e){
    setLoginLoading(false);
    console.error('[DomoNow] Login error:',e);
    const msg=e.message==='Invalid login credentials'?'Correo o contraseña incorrectos.':e.message;
    showLoginError(msg);
  }
}

async function logoutUser(){
  try{
    if(sb)await sb.auth.signOut();
  }catch(e){console.warn('Logout error:',e);}
  isConnected=false;
  state.properties=[];
  if(autoRefreshTimer){clearInterval(autoRefreshTimer);autoRefreshTimer=null;}
  updateUserUI(null);
  showToast('Sesión cerrada','success');
  goLogin();
}

// Legacy manual connect (kept for Settings page)
async function connectSupabase(){
  const url=$('sbUrl')?.value.trim()||'',key=$('sbKey')?.value.trim()||'';
  if(!url||!key){showToast('Ingresa URL y Key','error');return;}
  try{
    if(!window.supabase)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    sb=window.supabase.createClient(url,key);
    const{error}=await sb.from('properties').select('id',{count:'exact',head:true});
    if(error)throw error;
    isConnected=true;
    showToast('✅ Conectado','success');
    await fetchAllData();startRealtime();startAutoRefresh();goSection('dashboard');
  }catch(e){showToast('Error: '+e.message,'error');}
}


async function fetchAllData(){
  if(!sb)return;
  try{
    const{data:props,error}=await sb.from('properties').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    state.properties=(props||[]).map(p=>({id:p.id,name:p.name||'',city:p.city||'',phase:p.phase||'fase0',days:p.days_elapsed||0,units:p.units||0,modules:Array.isArray(p.active_modules)?p.active_modules:[],module_values:(p.module_values&&typeof p.module_values==='object')?p.module_values:{},notes:p.notes||'',entry_date:p.entry_date||''}));
    state.lastUpdated=new Date();
    await loadTasksFromSupabase();
    if(currentSection!=='connect')renderSection(currentSection);
  }catch(e){showToast('Error al cargar datos','error');}
}

async function insertSupabase(prop){if(!sb)return;const{error}=await sb.from('properties').insert({name:prop.name,city:prop.city,phase:prop.phase,days_elapsed:prop.days,units:prop.units,active_modules:prop.modules,module_values:prop.module_values,notes:prop.notes,entry_date:new Date(prop.entry_date).toISOString()});if(error)showToast('Error: '+error.message,'error');}
async function updateSupabase(id,prop){if(!sb)return;const edDate=prop.entry_date?new Date(prop.entry_date).toISOString():null;const{error}=await sb.from('properties').update({name:prop.name,city:prop.city,phase:prop.phase,days_elapsed:prop.days,units:prop.units,active_modules:prop.modules,module_values:prop.module_values,notes:prop.notes,...(edDate?{entry_date:edDate}:{})}).eq('id',id);if(error)showToast('Error: '+error.message,'error');}
async function deleteSupabase(id){if(!sb)return;const{error}=await sb.from('properties').delete().eq('id',id);if(error)showToast('Error: '+error.message,'error');}

function startRealtime(){if(!sb)return;sbChannel=sb.channel('dn-rt').on('postgres_changes',{event:'*',schema:'public',table:'properties'},()=>fetchAllData()).subscribe();}
function startAutoRefresh(){if(autoRefreshTimer)clearInterval(autoRefreshTimer);const sec=parseInt(settings.autoRefresh)||60;if(sb&&sec>0)autoRefreshTimer=setInterval(()=>fetchAllData(),sec*1000);}
function disconnectSupabase(){logoutUser();}

// ══════ KPIs ══════
function renderKPIs(){
  const p=state.properties;
  const byPhase=ph=>p.filter(x=>x.phase===ph);
  const avg=ph=>{const a=byPhase(ph);return a.length?Math.round(a.reduce((s,x)=>s+(x.days||0),0)/a.length):0;};
  $('kpiTotal').textContent=p.length;
  $('kpiFase0').textContent=byPhase('fase0').length;$('kpiFase0Days').textContent=avg('fase0');
  $('kpiImpl').textContent=byPhase('fase1').length;$('kpiImplDays').textContent=avg('fase1');
  $('kpiPilot').textContent=byPhase('fase2').length;$('kpiPilotDays').textContent=avg('fase2');
  $('kpiSupport').textContent=byPhase('fase3').length;$('kpiSupportDays').textContent=avg('fase3');

  // ── Implementación Global ──
  const implAvg=p.length?Math.round(p.reduce((s,x)=>s+getPropProgress(x),0)/p.length):0;
  const implColor=implAvg>=80?'#00b460':implAvg>=50?'#e67e00':'#820ad1';
  const implOnTarget=p.filter(x=>getPropProgress(x)>=80).length;
  const implEl=$('implGlobalKpis');
  if(implEl) implEl.innerHTML=`
    <div style="text-align:right">
      <div style="font-size:clamp(22px,2.2vw,32px);font-weight:800;color:${implColor};line-height:1">${implAvg}%</div>
      <div style="font-size:clamp(9px,.85vw,11px);color:var(--text-muted);margin-top:2px">${implOnTarget}/${p.length} en meta</div>
    </div>`;

  // ── Usabilidad Global ──
  let totalActiveMods=0,totalWithUsage=0;
  p.forEach(x=>{
    const mv=x.module_values||{};
    const active=(x.modules||[]).filter(mid=>!NON_MODULES.includes(mid));
    totalActiveMods+=active.length;
    totalWithUsage+=active.filter(mid=>(mv[mid]||0)>0).length;
  });
  const usabAvg=totalActiveMods>0?Math.round((totalWithUsage/totalActiveMods)*100):0;
  const usabColor=usabAvg>=80?'#00b460':usabAvg>=50?'#e67e00':'#820ad1';
  const usabEl=$('usabGlobalKpis');
  if(usabEl) usabEl.innerHTML=`
    <div style="text-align:right">
      <div style="font-size:clamp(22px,2.2vw,32px);font-weight:800;color:${usabColor};line-height:1">${usabAvg}%</div>
      <div style="font-size:clamp(9px,.85vw,11px);color:var(--text-muted);margin-top:2px">${totalWithUsage}/${totalActiveMods} mód. en uso</div>
    </div>`;
}


function getLastFriday(offset=0){const d=new Date();const day=d.getDay();const diff=day>=5?day-5:day+2;d.setDate(d.getDate()-diff+offset);return d.toISOString().split('T')[0];}

function renderWeekCompare(){
  const cws=settings.curWeekStart||getLastFriday(-7),pws=settings.prevWeekStart||getLastFriday(-14);
  $('wcDateRange').textContent='Actual: '+cws+' | Anterior: '+pws;
  const sel=['alertas','solicitudes','muro','acceso'];
  $('wcGrid').innerHTML=sel.map(mid=>{
    const m=MODULES.find(x=>x.id===mid);
    const cur=state.weekData.current[mid]||0,prev=state.weekData.previous[mid]||0;
    const diff=cur-prev,pct=prev>0?Math.round((diff/prev)*100):0;
    const cls=diff>0?'up':diff<0?'down':'eq',arrow=diff>0?'▲':diff<0?'▼':'—';
    return `<div class="wc-item"><div class="wc-mod">${m.icon} ${m.label}</div><div style="display:flex;align-items:flex-end;gap:10px;margin-top:6px"><div class="wc-cur">${cur}</div><div class="wc-prev">Ant: ${prev}</div><div class="wc-delta ${cls}">${arrow} ${Math.abs(pct)}%</div></div><div style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted);margin-top:4px">${m.unit}</div></div>`;
  }).join('');
}

function renderPhases(){
  const total=state.properties.length||1;
  $('phasesGrid').innerHTML=Object.entries(PHASES).map(([k,cfg])=>{
    const cnt=state.properties.filter(p=>p.phase===k).length;
    const pct=Math.round((cnt/total)*100);
    const avg=cnt?Math.round(state.properties.filter(p=>p.phase===k).reduce((s,p)=>s+getDaysFromEntry(p),0)/cnt):0;
    return `<div class="phase-card"><div class="phase-header"><div style="display:flex;align-items:center"><div class="phase-dot" style="background:${cfg.color}"></div><div class="phase-name">${cfg.label}</div></div><div class="phase-count" style="background:${cfg.bg};color:${cfg.color}">${cnt}</div></div><div class="phase-body"><div class="phase-pct" style="color:${cfg.color}">${pct}%</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${cfg.color}"></div></div><div class="phase-days">⏱ Sem. ${Math.min(8,Math.max(1,Math.floor(avg/7)+1))} · ${avg}d prom.</div></div></div>`;
  }).join('');
}

function getFilteredProps(){
  let list=[...state.properties];
  if(activeFilter!=='all')list=list.filter(p=>p.phase===activeFilter);
  if(searchQuery){const q=searchQuery.toLowerCase();list=list.filter(p=>p.name.toLowerCase().includes(q)||(p.city||'').toLowerCase().includes(q));}
  return list;
}
function filterProperties(){searchQuery=$('propSearch').value;renderPropertiesTable();}
function setFilter(f,e){activeFilter=f;document.querySelectorAll('#sec-properties .filter-tab').forEach(t=>t.classList.remove('active'));e.classList.add('active');renderPropertiesTable();}

function renderPropertiesTable(){
  const tbody=$('propsBody'),list=getFilteredProps();
  if(!list.length){tbody.innerHTML=`<tr><td colspan="8"><div class="empty-state">📭 Sin propiedades. ¡Agrega la primera!</div></td></tr>`;return;}
  tbody.innerHTML=list.map(p=>{
    const cfg=PHASES[p.phase]||PHASES.fase1;
    const overall=getPropProgress(p);
    const clr=pctColor(overall);
    return `<tr><td><strong>${p.name}</strong>${p.entry_date?`<div style="display:flex;align-items:center;gap:4px;margin-top:2px"><span style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted)">📅 ${p.entry_date}</span><button style="font-size:9px;padding:1px 6px;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;font-family:'Montserrat',sans-serif" onclick="openQuickDateEdit('${p.id}','${p.entry_date}')">✏️</button></div>`:''}</td><td>${p.city||'—'}</td><td><span class="pill ${cfg.pill}">${cfg.label}</span></td><td style="font-family:JetBrains Mono,monospace">${p.units||0}</td><td><strong>${(p.modules||[]).length}</strong>/${MODULES.length}</td><td style="font-family:JetBrains Mono,monospace">${p.days||0}</td><td><div class="bar-cell"><div class="mini-bar"><div class="mini-fill" style="width:${overall}%;background:${clr}"></div></div><span class="pct-label" style="color:${clr}">${overall}%</span></div></td><td><div class="actions-cell"><button class="btn-edit" onclick="openEditModal('${p.id}')">✏️ Editar</button><button class="btn-del" onclick="deleteProp('${p.id}')">🗑️</button></div></td></tr>`;
  }).join('');
}

function renderModulesSection(){renderModuleMeters();renderModulesTable();renderModuleCharts();$('modTableUpdated').textContent=new Date().toLocaleTimeString();}

function renderModuleMeters(){
  const total=state.properties.length||1;
  $('moduleMeterGrid').innerHTML=MODULES.map(m=>{
    const active=state.properties.filter(p=>(p.modules||[]).includes(m.id));
    const adoptPct=Math.round((active.length/total)*100);
    const avgPct=active.length?Math.round(active.reduce((s,p)=>s+calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/active.length):0;
    const clr=pctColor(avgPct);
    const avgVal=active.length?Math.round(active.reduce((s,p)=>s+((p.module_values||{})[m.id]||0),0)/active.length):0;
    return `<div class="mod-meter"><div class="mm-header"><div class="mm-name"><span class="mm-icon">${m.icon}</span>${m.label}</div><div class="mm-pct" style="color:${clr}">${avgPct}%</div></div><div class="mm-bar"><div class="mm-fill" style="width:${avgPct}%;background:${clr}"></div></div><div class="mm-meta"><span>${active.length}/${total} propiedades activas · Val. prom: <strong>${avgVal} ${m.unit}</strong></span><span style="color:${clr}">Adopción: ${adoptPct}%</span></div></div>`;
  }).join('');
}

function renderModulesTable(){
  $('modulesBody').innerHTML=MODULES.map(m=>{
    const withMod=ph=>state.properties.filter(p=>p.phase===ph&&(p.modules||[]).includes(m.id)).length;
    const active=state.properties.filter(p=>(p.modules||[]).includes(m.id));
    const avgPct=active.length?Math.round(active.reduce((s,p)=>s+calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/active.length):0;
    const avgVal=active.length?Math.round(active.reduce((s,p)=>s+((p.module_values||{})[m.id]||0),0)/active.length):0;
    const clr=pctColor(avgPct);
    const refMeta=calcMeta(m.id,80);
    return `<tr><td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">${m.icon}</span><strong>${m.label}</strong></div></td><td><span style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted)">${m.unit}</span></td><td><span style="font-size:clamp(9px,.85vw,11px);font-weight:700;color:var(--domo)">${refMeta} <span style="font-weight:400;color:var(--text-muted)">(ref. 80 unid.)</span></span></td><td><strong style="font-family:JetBrains Mono,monospace">${avgVal}</strong> ${m.unit}</td><td><div class="bar-cell"><div class="mini-bar"><div class="mini-fill" style="width:${avgPct}%;background:${clr}"></div></div><span class="pct-label" style="color:${clr}">${avgPct}%</span></div></td><td><span class="pill pill-fase0">${withMod('fase0')}</span></td><td><span class="pill pill-impl">${withMod('fase1')}</span></td><td><span class="pill pill-pilot">${withMod('fase2')}</span></td><td><span class="pill pill-support">${withMod('fase3')}</span></td></tr>`;
  }).join('');
}

function renderModuleCharts(){
  const props=state.properties;
  const avgPcts=MODULES.map(m=>{const active=props.filter(p=>(p.modules||[]).includes(m.id));return active.length?Math.round(active.reduce((s,p)=>s+calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/active.length):0;});
  makeChart('chartModFull','bar',MODULES.map(m=>m.label),[{label:'% Cumplimiento meta',data:avgPcts,backgroundColor:avgPcts.map(v=>v>=80?'#00b460':v>=50?'#e67e00':'#820ad1'),borderRadius:6,borderSkipped:false}]);
  const colors=['#820ad1','#e67e00','#00b460','#0088cc','#F7B500','#a34dde','#00ccaa','#ff6b6b'];
  makeChart('chartModPhase','bar',props.map(p=>p.name.length>16?p.name.substring(0,16)+'…':p.name),MODULES.map((m,i)=>({label:m.icon+' '+m.label,data:props.map(p=>(p.modules||[]).includes(m.id)?((p.module_values||{})[m.id]||0):null),backgroundColor:colors[i%8],borderRadius:3,borderSkipped:false,barThickness:8})),{},{indexAxis:'y',plugins:{legend:{position:'bottom',labels:{font:{family:'Outfit',size:10},boxWidth:10}}}});
}

// ══════ MODAL ══════
function openAddModal(){
  $('modalTitle').textContent='Agregar Propiedad';$('editPropId').value='';
  $('fName').value='';$('fCity').value='';$('fPhase').value='fase0';
  $('fDays').value='0';$('fUnits').value='50';$('fNotes').value='';
  $('fEntryDate').value=new Date().toISOString().split('T')[0];
  // Auto-activate phase 1 modules
  setTimeout(()=>onPhaseChange(),0);
  $('propModal').style.display='flex';
}
function openEditModal(id){
  const p=state.properties.find(x=>String(x.id)===String(id));if(!p)return;
  $('modalTitle').textContent='Editar Propiedad';$('editPropId').value=id;
  $('fName').value=p.name||'';$('fCity').value=p.city||'';$('fPhase').value=p.phase||'fase0';
  $('fDays').value=p.days||0;$('fUnits').value=p.units||0;$('fEntryDate').value=p.entry_date||'';
  autoCalcDays();$('fNotes').value=p.notes||'';
  // Use the property's existing modules & values (they were set for their phase)
  buildModuleChecks(p.modules||[],p.module_values||{});$('propModal').style.display='flex';
}
function onPhaseChange(){
  const phase = $('fPhase').value;
  const phaseModules = getModulesForPhase(phase);
  const currentVals = {};
  MODULES.forEach(m=>{const el=document.getElementById('mp-num-'+m.id);if(el&&el.value)currentVals[m.id]=parseInt(el.value)||0;});
  buildModuleChecks(phaseModules, currentVals);
}
function rebuildModuleChecks(){
  const units=parseInt($('fUnits').value)||50;
  const currentActive=MODULES.filter(m=>document.getElementById('mp-chk-'+m.id)?.checked).map(m=>m.id);
  const currentVals={};
  MODULES.forEach(m=>{const el=document.getElementById('mp-num-'+m.id);if(el&&!el.disabled)currentVals[m.id]=parseInt(el.value)||0;});
  buildModuleChecks(currentActive,currentVals);
}
function buildModuleChecks(activeModules,moduleValues){
  const units=parseInt($('fUnits').value)||50;
  const phaseGroups = [
    {label:'Fase 0 — Configuración y Capacitación', color:'#0ea5e9', ids: PHASE_MODULES.fase0},
    {label:'Fase 1', color:'#820ad1', ids: PHASE_MODULES.fase1},
    {label:'Fase 2', color:'#e67e00', ids: PHASE_MODULES.fase2},
    {label:'Fase 3', color:'#00b460', ids: PHASE_MODULES.fase3},
  ];
  let html = '';
  phaseGroups.forEach(group => {
    html += `<div style="font-size:11px;font-weight:800;color:${group.color};text-transform:uppercase;letter-spacing:.8px;margin:14px 0 6px;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${group.color};display:inline-block"></span>${group.label}</div>`;
    group.ids.forEach(mid => {
      const m = MODULES.find(x=>x.id===mid); if(!m) return;
      const isActive=activeModules.includes(m.id);
      const val=(moduleValues[m.id]!==undefined)?moduleValues[m.id]:0;
      const meta=m.metaFn(units);
      const pct=isActive?calcPct(m.id,val,units):0;
      const badgeClass=isActive?pctBadgeClass(pct):'';
      const barW=isActive?Math.min(100,pct):0;
      const barColor=pctColor(pct);
      html += `<div class="mp-row${isActive?' mp-on':''}" id="mp-row-${m.id}"><div class="mp-top"><div class="mp-icon">${m.icon}</div><div class="mp-info"><div class="mp-name">${m.label}</div><div class="mp-meta-label" id="mp-ml-${m.id}">${m.metaLabel(units)}</div></div><div class="mp-num-wrap"><input class="mp-num-input" type="number" min="0" id="mp-num-${m.id}" value="${isActive?val:''}" placeholder="0" ${!isActive?'disabled':''} oninput="onModuleInput('${m.id}',this.value)"/><span class="mp-unit">${m.unit}</span><div class="mp-pct-badge ${badgeClass}" id="mp-badge-${m.id}">${isActive?pct+'%':'—'}</div></div><div class="mp-toggle"><input type="checkbox" id="mp-chk-${m.id}" ${isActive?'checked':''} onchange="toggleModuleCheck('${m.id}',this)"/></div></div><div class="mp-bar-row" id="mp-barrow-${m.id}" ${!isActive?'style="display:none"':''}><div class="mp-bar-track"><div class="mp-bar-fill" id="mp-bar-${m.id}" style="width:${barW}%;background:${barColor}"></div></div><div class="mp-bar-label" id="mp-barlbl-${m.id}">${isActive?val+' / '+meta+' '+m.unit:'—'}</div></div></div>`;
    });
  });
  $('modulesChecks').innerHTML = html;
}
function onModuleInput(mid,rawVal){
  const units=parseInt($('fUnits').value)||50;
  const val=Math.max(0,parseInt(rawVal)||0);
  const meta=calcMeta(mid,units);
  const pct=calcPct(mid,val,units);
  const clr=pctColor(pct);
  const badge=$('mp-badge-'+mid),bar=$('mp-bar-'+mid),lbl=$('mp-barlbl-'+mid);
  if(badge){badge.textContent=pct+'%';badge.className='mp-pct-badge '+pctBadgeClass(pct);}
  if(bar){bar.style.width=Math.min(100,pct)+'%';bar.style.background=clr;}
  if(lbl){const _mu=MODULES.find(m=>m.id===mid);lbl.textContent=val+' / '+meta+' '+(_mu?_mu.unit:'');}
  // Guardar en tiempo real si hay propiedad activa en modo local
  if(!sb){
    const editId = $('editPropId') ? $('editPropId').value : '';
    if(editId){
      const idx = state.properties.findIndex(x=>String(x.id)===String(editId));
      if(idx>=0){
        if(!state.properties[idx].module_values) state.properties[idx].module_values={};
        state.properties[idx].module_values[mid] = val;
        // Actualiza estado en memoria (persiste al guardar con Supabase)
        clearTimeout(window._saveDebounce);
        window._saveDebounce = setTimeout(()=>{
          const ind = $('modalSaveStatus');
          if(ind){ind.style.display='block';clearTimeout(window._hideInd);window._hideInd=setTimeout(()=>{ind.style.display='none';},2000);}
        }, 600);
      }
    }
  }
}
function toggleModuleCheck(id,inp){
  const numEl=$('mp-num-'+id),row=$('mp-row-'+id),barRow=$('mp-barrow-'+id),badge=$('mp-badge-'+id);
  if(!numEl||!row)return;
  if(inp.checked){numEl.disabled=false;if(!numEl.value)numEl.value='0';row.classList.add('mp-on');if(barRow)barRow.style.display='flex';onModuleInput(id,numEl.value);}
  else{numEl.disabled=true;numEl.value='';row.classList.remove('mp-on');if(barRow)barRow.style.display='none';if(badge){badge.textContent='—';badge.className='mp-pct-badge';}const bar=$('mp-bar-'+id);if(bar){bar.style.width='0%';}const lbl=$('mp-barlbl-'+id);if(lbl)lbl.textContent='—';}
  // Guardar módulos activos inmediatamente en modo local
  if(!sb){
    const editId = $('editPropId') ? $('editPropId').value : '';
    if(editId){
      const idx = state.properties.findIndex(x=>String(x.id)===String(editId));
      if(idx>=0){
        const mods=[], mvals={};
        MODULES.forEach(m=>{const c=$('mp-chk-'+m.id),n=$('mp-num-'+m.id);if(c&&c.checked){mods.push(m.id);mvals[m.id]=Math.max(0,parseInt(n?.value)||0);}});
        state.properties[idx].modules = mods;
        state.properties[idx].module_values = mvals;
        saveStateLocal();
      }
    }
  }
}
function closeModal(){$('propModal').style.display='none';}
function closeModalOutside(e){if(e.target===$('propModal'))closeModal();}

async function saveProperty(){
  const name=$('fName').value.trim();
  if(!name){showToast('El nombre es requerido','error');return;}
  const modules=[],module_values={};
  MODULES.forEach(m=>{const chk=$('mp-chk-'+m.id),num=$('mp-num-'+m.id);if(chk&&chk.checked){modules.push(m.id);module_values[m.id]=Math.max(0,parseInt(num.value)||0);}});
  const editId=$('editPropId').value;
  // Si es edición y el campo de fecha está vacío, conservar la fecha original
  let entryDate=$('fEntryDate').value;
  if(editId&&!entryDate){
    const existing=state.properties.find(x=>String(x.id)===String(editId));
    entryDate=(existing&&existing.entry_date)||'';
  }
  const prop={name,city:$('fCity').value.trim(),phase:$('fPhase').value,days:parseInt($('fDays').value)||0,units:parseInt($('fUnits').value)||0,entry_date:entryDate,notes:$('fNotes').value.trim(),modules,module_values};
  closeModal();
  if(editId){
    if(sb){await updateSupabase(editId,prop);await fetchAllData();}
    else{const idx=state.properties.findIndex(x=>String(x.id)===String(editId));if(idx>=0){state.properties[idx]={...state.properties[idx],...prop};saveStateLocal();}}
  }else{
    if(sb){await insertSupabase(prop);await fetchAllData();}
    else{state.properties.unshift({...prop,id:'demo-'+Date.now()});}
  }
  saveStateLocal();
  showToast('✅ Guardado','success');
  renderSection(currentSection);
}

async function deleteProp(id){
  if(!confirm('¿Eliminar esta propiedad?'))return;
  if(sb){await deleteSupabase(id);await fetchAllData();}
  else{state.properties=state.properties.filter(x=>String(x.id)!==String(id));saveStateLocal();renderSection(currentSection);}
  showToast('🗑️ Eliminado','success');
}

// ══════ PROGRESS SECTION ══════
function setPFilter(f,elem){progressFilter=f;document.querySelectorAll('#progressFilterTabs .filter-tab').forEach(t=>t.classList.remove('active'));elem.classList.add('active');renderPropertyProgressCards();renderModuleProgressChart();}
function renderProgressSection(){renderGlobalProgress();renderPropertyProgressCards();renderModuleProgressChart();}
function renderGlobalProgress(){
  const props=state.properties,g=getGlobalProgress();
  $('pgValue').textContent=g+'%';$('pgPct').textContent=g+'%';$('pgFill').style.width=g+'%';$('pgRingCenter').textContent=g+'%';

  // ── Usabilidad global ──
  let totalActiveMods=0,totalWithUsage=0;
  props.forEach(p=>{
    const mv=p.module_values||{};
    const active=(p.modules||[]).filter(mid=>!NON_MODULES.includes(mid));
    totalActiveMods+=active.length;
    totalWithUsage+=active.filter(mid=>(mv[mid]||0)>0).length;
  });
  const usabGlobal=totalActiveMods>0?Math.round((totalWithUsage/totalActiveMods)*100):0;
  const usabColor=usabGlobal>=80?'#00b460':usabGlobal>=50?'#e67e00':'#820ad1';
  const implColor=g>=80?'#00b460':g>=50?'#e67e00':'#820ad1';
  const totalMods=props.reduce((s,p)=>s+(p.modules||[]).length,0);
  $('pgSub').textContent=props.length+' propiedades · '+totalMods+' módulos activos';

  // ── KPI headers de las cards ──
  const implOnTarget=props.filter(p=>getPropProgress(p)>=80).length;
  if($('pgImplKpi')) $('pgImplKpi').innerHTML=`<div style="font-size:clamp(22px,2.2vw,30px);font-weight:800;color:${implColor};line-height:1">${g}%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${implOnTarget}/${props.length} en meta</div>`;
  if($('pgUsabKpi')) $('pgUsabKpi').innerHTML=`<div style="font-size:clamp(22px,2.2vw,30px);font-weight:800;color:${usabColor};line-height:1">${usabGlobal}%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${totalWithUsage}/${totalActiveMods} en uso</div>`;
  if($('pgImplSub')) $('pgImplSub').textContent=`Promedio: ${g}% · ${implOnTarget}/${props.length} propiedades en meta (≥80%)`;
  if($('pgUsabSub')) $('pgUsabSub').textContent=`${totalWithUsage} de ${totalActiveMods} módulos activos con uso real`;

  const dk=theme==='dark';
  const tc=dk?'#9287b8':'#7c6fa0';

  // ── Gráfico 1: Barras horizontales — Implementación por propiedad ──
  destroyChart('chartPgImpl');
  destroyChart('chartPgUsab');
  setTimeout(()=>{
    const dk2=theme==='dark';
    const tc2=dk2?'#9287b8':'#7c6fa0';
    if($('chartPgImpl')&&props.length){
      const sorted=[...props].sort((a,b)=>getPropProgress(b)-getPropProgress(a));
      const labels=sorted.map(p=>p.name.length>18?p.name.substring(0,18)+'…':p.name);
      const vals=sorted.map(p=>getPropProgress(p));
      const colors=vals.map(v=>v>=80?'#00b460':v>=50?'rgba(230,126,0,.85)':'rgba(130,10,209,.85)');
      charts['chartPgImpl']=new Chart($('chartPgImpl').getContext('2d'),{
        type:'bar',
        data:{labels,datasets:[{label:'Implementación (%)',data:vals,backgroundColor:colors,borderRadius:6,borderSkipped:false,barThickness:16}]},
        options:{
          indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.raw}%`}}},
          scales:{
            x:{max:100,ticks:{color:tc2,font:{family:'Montserrat',size:10},callback:v=>v+'%'},grid:{color:dk2?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'},border:{display:false}},
            y:{ticks:{color:tc2,font:{family:'Montserrat',size:10}},grid:{display:false},border:{display:false}}
          }
        }
      });
    }
    if($('chartPgUsab')&&props.length){
      const useMods=USE_MODULES;
      const labels=useMods.map(m=>m.icon+' '+m.label.substring(0,10));
      const withUsage=useMods.map(m=>props.filter(p=>(p.modules||[]).includes(m.id)&&((p.module_values||{})[m.id]||0)>0).length);
      const withMod=useMods.map(m=>props.filter(p=>(p.modules||[]).includes(m.id)).length);
      charts['chartPgUsab']=new Chart($('chartPgUsab').getContext('2d'),{
        type:'bar',
        data:{
          labels,
          datasets:[
            {label:'Con uso real',data:withUsage,backgroundColor:'rgba(0,180,100,.75)',borderRadius:6,borderSkipped:false,barThickness:14},
            {label:'Sin uso aún',data:withMod.map((v,i)=>Math.max(0,v-withUsage[i])),backgroundColor:'rgba(130,10,209,.2)',borderRadius:6,borderSkipped:false,barThickness:14}
          ]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{color:tc2,font:{family:'Montserrat',size:10},boxWidth:10}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.raw} props`}}},
          scales:{
            x:{stacked:true,ticks:{color:tc2,font:{family:'Montserrat',size:9}},grid:{display:false},border:{display:false}},
            y:{stacked:true,ticks:{color:tc2,font:{family:'Montserrat',size:10},stepSize:1},grid:{color:dk2?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'},border:{display:false}}
          }
        }
      });
    }
  }, 50);

  $('pgStats').innerHTML=Object.entries(PHASES).map(([k,cfg])=>{
    const arr=props.filter(p=>p.phase===k);
    const avg=arr.length?Math.round(arr.reduce((s,p)=>s+getPropProgress(p),0)/arr.length):0;
    return `<div class="pg-stat"><div class="pg-stat-val" style="color:${cfg.color}">${avg}%</div><div class="pg-stat-label">${cfg.label} (${arr.length})</div></div>`;
  }).join('');
  const canvas=$('pgRing'),ctx=canvas.getContext('2d');
  canvas.width=140;canvas.height=140;ctx.clearRect(0,0,140,140);
  const cx=70,cy=70,r=54,lw=12;
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=lw;ctx.stroke();
  if(g>0){ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(g/100)*Math.PI*2);ctx.strokeStyle='#F7B500';ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke();}
}
function renderPropertyProgressCards(){
  const sortVal=$('progressSort')?$('progressSort').value:'pct_desc';
  let props=[...state.properties];
  if(progressFilter!=='all')props=props.filter(p=>p.phase===progressFilter);
  props.sort((a,b)=>{if(sortVal==='pct_desc')return getPropProgress(b)-getPropProgress(a);if(sortVal==='pct_asc')return getPropProgress(a)-getPropProgress(b);if(sortVal==='name')return a.name.localeCompare(b.name);if(sortVal==='phase'){const o={fase0:0,fase1:1,fase2:2,fase3:3};return(o[a.phase]||0)-(o[b.phase]||0);}return 0;});
  if(!props.length){$('propProgressGrid').innerHTML=`<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);font-size:13px">📭 Sin propiedades en esta fase.</div>`;return;}
  $('propProgressGrid').innerHTML=props.map(p=>{
    const cfg=PHASES[p.phase]||PHASES.fase1;
    const mv=p.module_values||{};const units=p.units||50;
    const overall=getPropProgress(p);const clr=pctColor(overall);
    // Solo módulos reales (sin configuración ni capacitación)
    const allActive=p.modules||[];
    const activeMods=allActive.filter(mid=>!NON_MODULES.includes(mid));
    const inactiveMods=USE_MODULES.filter(m=>!activeMods.includes(m.id));
    // Usabilidad: módulos activos con uso real
    const modsWithUsage=activeMods.filter(mid=>(mv[mid]||0)>0).length;
    const usabilidad=activeMods.length>0?Math.round((modsWithUsage/activeMods.length)*100):0;
    const usabColor=usabilidad>=80?'#00b460':usabilidad>=50?'#e67e00':'#e03030';
    const modRows=USE_MODULES.filter(m=>activeMods.includes(m.id)).map(m=>{
      const val=mv[m.id]||0;const meta=m.metaFn(units);const pct=calcPct(m.id,val,units);const mc=pctColor(pct);
      return `<div class="pp-mod-row"><div class="pp-mod-icon">${m.icon}</div><div class="pp-mod-name">${m.label}</div><div class="pp-mod-num">${val}/${meta}</div><div class="pp-mod-pct" style="color:${mc}">${pct}%</div></div><div class="pp-mod-bar-wrap"><div class="pp-mod-fill" style="width:${Math.min(100,pct)}%;background:${mc}"></div></div>`;
    }).join('');
    const metricsRow=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div style="background:${clr}15;border:1px solid ${clr}40;border-radius:10px;padding:8px 12px">
        <div style="font-size:clamp(8px,.8vw,10px);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Implementación</div>
        <div style="font-size:clamp(18px,1.8vw,26px);font-weight:800;color:${clr};line-height:1">${overall}%</div>
        <div style="height:4px;background:var(--surface2);border-radius:2px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${overall}%;background:${clr};border-radius:2px;transition:width .4s"></div></div>
      </div>
      <div style="background:${usabColor}15;border:1px solid ${usabColor}40;border-radius:10px;padding:8px 12px">
        <div style="font-size:clamp(8px,.8vw,10px);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Usabilidad</div>
        <div style="font-size:clamp(18px,1.8vw,26px);font-weight:800;color:${usabColor};line-height:1">${usabilidad}%</div>
        <div style="font-size:clamp(8px,.75vw,10px);color:var(--text-muted);margin-top:6px">${modsWithUsage}/${activeMods.length} módulos en uso</div>
      </div>
    </div>`;
    return `<div class="pp-card"><div class="pp-header"><div><div class="pp-name">${p.name}</div><div class="pp-city">📍 ${p.city||'—'} · ${units} unid.</div>${p.entry_date?`<div style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted);margin-top:2px">📅 ${p.entry_date}</div>`:''}</div><div style="text-align:right"><span class="pill ${cfg.pill}">${cfg.label}</span></div></div><div class="pp-body">${metricsRow}${activeMods.length?`<div style="font-size:clamp(8px,.8vw,10px);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Módulos activos (${activeMods.length}/${USE_MODULES.length})</div><div class="pp-mod-list">${modRows}</div>`:`<div style="font-size:clamp(10px,.9vw,12px);color:var(--text-muted);padding:10px 0;text-align:center">Sin módulos activos</div>`}${inactiveMods.length?`<div style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted);margin-top:8px">Pendientes: ${inactiveMods.map(m=>m.icon+' '+m.label).join(', ')}</div>`:''}</div><div class="pp-footer"><div class="pp-days">⏱ Sem. ${getPropWeek(p)}/8 · ${getDaysFromEntry(p)} días</div><button class="pp-edit-btn" onclick="openEditModal('${p.id}')">✏️ Editar</button></div></div>`;
  }).join('');
}


function renderModuleProgressChart(){
  const props=state.properties;if(!props.length)return;
  const colors=['#820ad1','#e67e00','#00b460','#0088cc','#F7B500','#a34dde','#00ccaa','#ff6b6b'];
  makeChart('chartModProgress','bar',props.map(p=>p.name.length>18?p.name.substring(0,18)+'…':p.name),MODULES.map((m,i)=>({label:m.icon+' '+m.label,data:props.map(p=>(p.modules||[]).includes(m.id)?calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50):null),backgroundColor:colors[i%8],borderRadius:4,borderSkipped:false,barThickness:10})),{},{indexAxis:'y',scales:{x:{stacked:false,max:100},y:{stacked:false}},plugins:{legend:{position:'bottom',labels:{font:{family:'Outfit',size:10},boxWidth:10}}}});
}

// ══════════════════════════════════════════════════════
//  ★ STRATEGY / ABISMO SECTION ★
// ══════════════════════════════════════════════════════

function setStrategyView(view, el) {
  strategyView = view;
  ['cards','heat','chart'].forEach(v => {
    const el2 = $('btnView'+v.charAt(0).toUpperCase()+v.slice(1));
    if(el2) el2.classList.remove('active-view');
    const vEl = $('stratView'+v.charAt(0).toUpperCase()+v.slice(1));
    if(vEl) vEl.style.display = 'none';
  });
  el.classList.add('active-view');
  $('stratView'+view.charAt(0).toUpperCase()+view.slice(1)).style.display = 'block';

}

function setStratPhase(f, el) {
  strategyPhaseFilter = f;
  document.querySelectorAll('#strategyPhaseTabs .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAbismoCards();
}

function getStrategyProps() {
  let props = [...state.properties];
  if(strategyPhaseFilter !== 'all') props = props.filter(p => p.phase === strategyPhaseFilter);
  return props;
}

// Calcula el "abismo" (gap) de una propiedad: cuánto falta hasta la meta en cada módulo
function calcAbismo(p) {
  const units = p.units || 50;
  const mv = p.module_values || {};
  const activeMods = p.modules || [];
  const modData = MODULES.map(m => {
    const isActive = activeMods.includes(m.id);
    const val = isActive ? (mv[m.id] || 0) : 0;
    const meta = m.metaFn(units);
    const pct = isActive ? calcPct(m.id, val, units) : null;
    const gap = isActive ? Math.max(0, meta - val) : null;
    const gapPct = isActive ? Math.max(0, 100 - (pct || 0)) : null;
    return { mid: m.id, isActive, val, meta, pct, gap, gapPct };
  });
  const activeMd = modData.filter(d => d.isActive);
  const avgPct = activeMd.length ? Math.round(activeMd.reduce((s,d) => s + d.pct, 0) / activeMd.length) : 0;
  const avgGapPct = activeMd.length ? Math.round(activeMd.reduce((s,d) => s + d.gapPct, 0) / activeMd.length) : 100;
  return { modData, avgPct, avgGapPct };
}

function gapLevel(pct) {
  if(pct >= 80) return 'good';
  if(pct >= 50) return 'warning';
  return 'critical';
}
function gapLevelLabel(pct) {
  if(pct >= 80) return '✅ En Meta';
  if(pct >= 50) return '⚠️ Alerta';
  return '🔴 Crítico';
}

function renderStrategySection() {
  renderStrategyGlobalMetrics();
  // Reset to overview on each visit
  if(strategyView !== 'overview') {
    const btn = $('btnViewOverview');
    if(btn) { btn.classList.add('strat-tab-active'); }
    ['cards','heat','chart','prop'].forEach(v => {
      const cap = v.charAt(0).toUpperCase() + v.slice(1);
      const vBtn = $('btnView'+cap); if(vBtn) vBtn.classList.remove('strat-tab-active');
      const vEl = $('stratView'+cap); if(vEl) vEl.style.display = 'none';
    });
    const ov = $('stratViewOverview'); if(ov) ov.style.display = 'block';
    const fb = $('stratFiltersBar'); if(fb) fb.style.display = 'none';
    strategyView = 'overview';
  }
  if(strategyView === 'overview') renderStrategyOverview();
  if(strategyView === 'cards') renderAbismoCards();
  if(strategyView === 'prop') renderPropChasmView();
}

function renderStrategyGlobalMetrics() {
  const props = state.properties;
  if(!props.length) { $('strategyGlobalMetrics').innerHTML = ''; return; }
  const totalProps = props.length;
  const globalAvg = getGlobalProgress();
  const globalGap = 100 - globalAvg;
  const critical = props.filter(p => getPropProgress(p) < 50).length;
  const onTarget = props.filter(p => getPropProgress(p) >= 80).length;
  const totalActiveMods = props.reduce((s,p) => s + (p.modules||[]).length, 0);
  const avgModsPerProp = totalProps ? Math.round(totalActiveMods / totalProps * 10) / 10 : 0;
  const lvlMain = gapLevel(globalAvg);
  $('strategyGlobalMetrics').innerHTML = `
    <div class="sh-metric">
      <div class="sh-metric-val">${globalAvg}%</div>
      <div class="sh-metric-lbl">Avance Global</div>
      <div class="sh-metric-sub ${lvlMain}">${gapLevelLabel(globalAvg)}</div>
    </div>
    <div class="sh-metric">
      <div class="sh-metric-val" style="color:#ff5f5f">${globalGap}%</div>
      <div class="sh-metric-lbl">Abismo Global</div>
      <div class="sh-metric-sub warn">${globalGap > 30 ? '⚡ Brecha significativa' : globalGap > 10 ? '🔶 Cierre cercano' : '🟢 Brecha mínima'}</div>
    </div>
    <div class="sh-metric">
      <div class="sh-metric-val" style="color:#ff5f5f">${critical}</div>
      <div class="sh-metric-lbl">Propiedades Críticas</div>
      <div class="sh-metric-sub bad">${critical ? 'Requieren atención urgente' : '🟢 Sin críticas'}</div>
    </div>
    <div class="sh-metric">
      <div class="sh-metric-val" style="color:#00e57c">${onTarget}</div>
      <div class="sh-metric-lbl">En Meta (≥80%)</div>
      <div class="sh-metric-sub good">${Math.round(onTarget/totalProps*100)}% del portafolio</div>
    </div>
  `;
}

function renderStrategyOverview() {
  const props = state.properties;
  const total = props.length;

  // ── KPI cards ──
  const globalAvg = getGlobalProgress();
  const critical = props.filter(p => getPropProgress(p) < 50).length;
  const onTarget = props.filter(p => getPropProgress(p) >= 80).length;
  const totalMods = props.reduce((s,p)=>s+(p.modules||[]).length,0);
  const avgMods = total ? (totalMods/total).toFixed(1) : 0;

  const kpiRow = $('overviewKpiRow');
  if(kpiRow) {
    const kpis = [
      {val: globalAvg+'%', label:'Avance Global', sub: globalAvg>=80?'✅ En Meta':globalAvg>=50?'⚠️ En Alerta':'🔴 Crítico', color: globalAvg>=80?'#00b460':globalAvg>=50?'#e67e00':'#e03030'},
      {val: (100-globalAvg)+'%', label:'Abismo Global', sub: (100-globalAvg)>30?'⚡ Brecha significativa':'🟢 Brecha mínima', color:'#e03030'},
      {val: critical, label:'Propiedades Críticas', sub: critical?'Requieren atención':'Sin críticas', color:'#e03030'},
      {val: onTarget+'/'+total, label:'En Meta (≥80%)', sub: Math.round(onTarget/(total||1)*100)+'% del portafolio', color:'#00b460'},
    ];
    kpiRow.innerHTML = kpis.map(k =>
      '<div class="ov-kpi" style="--ok:'+k.color+'">'
      +'<div class="ov-kpi-val" style="color:'+k.color+'">'+k.val+'</div>'
      +'<div class="ov-kpi-label">'+k.label+'</div>'
      +'<div class="ov-kpi-sub" style="color:'+k.color+'">'+k.sub+'</div>'
      +'</div>'
    ).join('');
  }

  // ── Sub label ──
  const sub = $('overviewTableSub');
  if(sub) sub.textContent = total + ' propiedades · actualizado ' + (state.lastUpdated ? state.lastUpdated.toLocaleTimeString('es-CO') : 'ahora');

  // ── Table ──
  const head = $('overviewTableHead');
  const body = $('overviewTableBody');
  if(head) head.innerHTML = ['Propiedad','Ciudad','Fase','Unidades','Módulos','Días','Avance'].map(h =>
    '<th style="padding:10px 14px;text-align:left;font-size:clamp(8px,.8vw,10px);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;background:var(--surface2);border-bottom:1px solid var(--border);white-space:nowrap">'+h+'</th>'
  ).join('');
  if(body) {
    if(!props.length) {
      body.innerHTML = '<tr><td colspan="7" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">📭 Sin propiedades</td></tr>';
    } else {
      const sorted = [...props].sort((a,b)=>getPropProgress(b)-getPropProgress(a));
      body.innerHTML = sorted.map(p => {
        const cfg = PHASES[p.phase]||PHASES.fase1;
        const pct = getPropProgress(p);
        const c = pct>=80?'#00b460':pct>=50?'#e67e00':'#e03030';
        return '<tr style="border-bottom:1px solid var(--border)">'
          +'<td style="padding:11px 14px;font-size:clamp(10px,.9vw,12px);font-weight:700">'+p.name+'</td>'
          +'<td style="padding:11px 14px;font-size:clamp(10px,.9vw,12px);color:var(--text-muted)">'+( p.city||'—')+'</td>'
          +'<td style="padding:11px 14px"><span class="pill '+cfg.pill+'">'+cfg.label+'</span></td>'
          +'<td style="padding:11px 14px;font-size:clamp(10px,.9vw,12px);font-family:JetBrains Mono,monospace">'+( p.units||0)+'</td>'
          +'<td style="padding:11px 14px;font-size:clamp(10px,.9vw,12px);font-weight:700;color:var(--domo)">'+(p.modules||[]).length+'/'+MODULES.length+'</td>'
          +'<td style="padding:11px 14px;font-size:clamp(10px,.9vw,12px);font-family:JetBrains Mono,monospace">S'+getPropWeek(p)+'/8 · '+getDaysFromEntry(p)+'d</td>'
          +'<td style="padding:11px 14px"><div style="display:flex;align-items:center;gap:8px">'
          +'<div style="flex:1;height:5px;border-radius:3px;background:var(--surface2);overflow:hidden;min-width:50px"><div style="height:100%;width:'+pct+'%;background:'+c+';border-radius:3px"></div></div>'
          +'<span style="font-size:clamp(9px,.85vw,11px);font-weight:800;color:'+c+';min-width:34px">'+pct+'%</span>'
          +'</div></td>'
          +'</tr>';
      }).join('');
    }
  }

  // ── Charts ──
  const dk = theme==='dark';
  const tc = dk?'#9287b8':'#7c6fa0';
  const gc = dk?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';

  // Phase donut
  destroyChart('chartOverviewPhase');
  const c1=$('chartOverviewPhase');
  if(c1){
    charts['chartOverviewPhase']=new Chart(c1.getContext('2d'),{
      type:'doughnut',
      data:{labels:Object.values(PHASES).map(p=>p.label),datasets:[{data:Object.keys(PHASES).map(k=>props.filter(p=>p.phase===k).length),backgroundColor:Object.values(PHASES).map(p=>p.color),borderWidth:0,hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}}}
    });
  }

  // Radar modules — full-width prominent
  destroyChart('chartOverviewRadar');
  const c2=$('chartOverviewRadar');
  if(c2){
    const modPcts=MODULES.map(m=>{const a=props.filter(p=>(p.modules||[]).includes(m.id));return a.length?Math.round(a.reduce((s,p)=>s+calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/a.length):0;});
    const sub=$('overviewRadarSub');
    if(sub) sub.textContent = props.length + ' propiedades · ' + MODULES.length + ' módulos';
    charts['chartOverviewRadar']=new Chart(c2.getContext('2d'),{
      type:'radar',
      data:{
        labels:MODULES.map(m=>m.icon+'  '+m.label),
        datasets:[
          {label:'Promedio',data:modPcts,backgroundColor:'rgba(130,10,209,.18)',borderColor:'#820ad1',pointBackgroundColor:'#820ad1',pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5,pointRadius:5,fill:true},
          {label:'Meta',data:MODULES.map(()=>100),backgroundColor:'rgba(0,180,100,.05)',borderColor:'rgba(0,180,100,.5)',borderWidth:1.5,pointRadius:3,borderDash:[5,4],fill:true}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{color:tc,font:{family:'Montserrat',size:11,weight:'700'},boxWidth:12,padding:20}}},
        scales:{r:{
          angleLines:{color:gc},
          grid:{color:gc},
          pointLabels:{color:tc,font:{family:'Montserrat',size:11,weight:'600'}},
          ticks:{color:tc,font:{family:'Montserrat',size:9},backdropColor:'transparent',stepSize:20},
          min:0,max:100
        }}
      }
    });
  }

  // Props bar
  destroyChart('chartOverviewProps');
  const c3=$('chartOverviewProps');
  if(c3){
    const sorted=[...props].sort((a,b)=>getPropProgress(b)-getPropProgress(a));
    const pcts=sorted.map(p=>getPropProgress(p));
    charts['chartOverviewProps']=new Chart(c3.getContext('2d'),{
      type:'bar',
      data:{labels:sorted.map(p=>p.name.length>14?p.name.substring(0,14)+'…':p.name),datasets:[
        {label:'Avance %',data:pcts,backgroundColor:pcts.map(v=>v>=80?'rgba(0,180,100,.8)':v>=50?'rgba(230,126,0,.8)':'rgba(130,10,209,.8)'),borderRadius:5,borderSkipped:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,ticks:{color:tc,font:{family:'Montserrat',size:9}},grid:{color:gc}},y:{ticks:{color:tc,font:{family:'Montserrat',size:9}},grid:{color:gc}}}}
    });
  }

  // Dist donut
  destroyChart('chartOverviewDist');
  const c4=$('chartOverviewDist');
  if(c4){
    const g=props.filter(p=>getPropProgress(p)>=80).length;
    const w=props.filter(p=>getPropProgress(p)>=50&&getPropProgress(p)<80).length;
    const cr=props.filter(p=>getPropProgress(p)<50).length;
    charts['chartOverviewDist']=new Chart(c4.getContext('2d'),{
      type:'doughnut',
      data:{labels:['Meta ≥80%','Alerta 50-79%','Crítico <50%'],datasets:[{data:[g,w,cr],backgroundColor:['#00b460','#e67e00','#e03030'],borderWidth:0,hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}}}
    });
  }
}

function renderAbismoCards() {
  const props = getStrategyProps();
  if(!props.length) {
    $('abismoGrid').innerHTML = `<div style="grid-column:1/-1;padding:44px;text-align:center;color:var(--text-muted);font-size:13px">📭 No hay propiedades en esta fase.</div>`;
    return;
  }
  // Sort by gap descending (most critical first)
  const sorted = [...props].sort((a,b) => getPropProgress(a) - getPropProgress(b));
  $('abismoGrid').innerHTML = sorted.map(p => buildAbismoCard(p)).join('');
  sorted.forEach(p => renderAbismoTaskBadge(p.id));
}

function buildAbismoCard(p) {
  const cfg = PHASES[p.phase] || PHASES.fase1;
  const { modData, avgPct, avgGapPct } = calcAbismo(p);
  const units = p.units || 50;
  const lvl = gapLevel(avgPct);
  const barColor = avgPct >= 80 ? '#00e57c' : avgPct >= 50 ? '#ffcc00' : '#ff5f5f';
  const gapBadge = lvl === 'good' ? 'good' : lvl === 'warning' ? 'warning' : 'critical';
  const gapLabel = gapLevelLabel(avgPct);

  const modRows = modData.map(d => {
    const m = MODULES.find(x => x.id === d.mid);
    if(!d.isActive) return `
      <div class="abismo-mod-row" style="opacity:.3">
        <div class="abismo-mod-icon">${m.icon}</div>
        <div class="abismo-mod-bars">
          <div class="abismo-mod-name" style="color:var(--text-muted)">${m.label}</div>
          <div class="abismo-bar-wrap" style="margin-top:4px"><div style="font-size:clamp(8px,.75vw,9px);color:var(--text-muted)">sin activar</div></div>
        </div>
        <div class="abismo-mod-nums"><div class="abismo-mod-val" style="color:var(--text-muted)">—</div><div class="abismo-mod-target">meta: ${d.meta}</div></div>
        <div class="abismo-mod-pct-col" style="color:var(--text-muted);font-size:11px">N/A</div>
      </div>`;
    const mc = d.pct >= 80 ? '#00b460' : d.pct >= 50 ? '#e67e00' : '#e03030';
    const barPct = Math.min(100, d.pct);
    const targetPct = 100; // target is always 100% of the bar
    return `
      <div class="abismo-mod-row">
        <div class="abismo-mod-icon">${m.icon}</div>
        <div class="abismo-mod-bars">
          <div class="abismo-mod-name">${m.label}</div>
          <div class="abismo-bar-wrap" style="margin-top:4px">
            <div class="abismo-bar-actual" style="width:${barPct}%;background:${mc}"></div>
            <div class="abismo-bar-target" style="left:calc(${targetPct}% - 2px)"></div>
          </div>
        </div>
        <div class="abismo-mod-nums">
          <div class="abismo-mod-val">${d.val}</div>
          <div class="abismo-mod-target">/ ${d.meta} ${m.unit.split('/')[0]}</div>
        </div>
        <div class="abismo-mod-pct-col" style="color:${mc}">${d.pct}%</div>
      </div>`;
  }).join('');

  return `
    <div class="abismo-card">
      <div class="abismo-card-header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <div class="ach-name">${p.name}</div>
            <div class="ach-city">📍 ${p.city || '—'} · ${units} unidades</div>
            <div class="ach-phase-badge" style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}40">${cfg.label}</div>
          </div>
          <div style="text-align:right">
            <div class="ach-pct">${avgPct}%</div>
            <div class="ach-gap-badge ${gapBadge}" style="margin-top:6px;display:inline-block">${gapLabel}</div>
          </div>
        </div>
        <div class="ach-progress-row">
          <div class="ach-overall">
            <div class="ach-overall-label">Avance ponderado</div>
            <div class="ach-overall-bar"><div class="ach-overall-fill" style="width:${avgPct}%;background:${barColor}"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:3px">
              <span style="font-size:clamp(8px,.75vw,9px);color:rgba(255,255,255,.4)">0%</span>
              <span style="font-size:clamp(8px,.75vw,9px);color:rgba(255,255,255,.55)">Abismo: <span style="color:#ff9a9a;font-weight:700">${avgGapPct}%</span></span>
              <span style="font-size:clamp(8px,.75vw,9px);color:rgba(255,255,255,.4)">100%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="abismo-card-body">
        <div class="abismo-mod-title">
          <span>Cumplimiento por módulo</span>
          <span style="font-weight:400">${(p.modules||[]).length}/${MODULES.length} activos</span>
        </div>
        <div class="abismo-mod-list">${modRows}</div>
      </div>
      <div class="abismo-card-footer">
        <div class="abismo-gap-total">
          <div class="abismo-gap-total-label">Brecha promedio</div>
          <div class="abismo-gap-total-val ${gapBadge}">${avgGapPct}% hacia meta</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:clamp(9px,.85vw,11px);color:var(--text-muted)">⏱ Sem. ${getPropWeek(p)}/8 · ${getDaysFromEntry(p)}d</span>
          <button class="abismo-action-btn" onclick="openEditModal('${p.id}')">✏️ Editar</button>
        </div>
      </div>
      <div class="abismo-tasks-panel">
        <div class="abismo-tasks-toggle" onclick="toggleAbismoTasks('${p.id}')">
          <span class="att-label">📋 Tareas <span class="att-badge" id="abt-badge-${p.id}">${(propTasks[String(p.id)]||[]).length}</span></span>
          <span id="abt-seal-${p.id}" style="font-size:clamp(9px,.85vw,11px);font-weight:700;color:${getCombinedSealPct(p)>=80?'#00b460':getCombinedSealPct(p)>=50?'#e67e00':'#e03030'}">${getCombinedSealPct(p)}% sellado</span>
          <span class="att-arrow" id="abt-arrow-${p.id}">▼</span>
        </div>
        <div class="abismo-tasks-body" id="abt-body-${p.id}" style="display:none">
          <div class="abt-list" id="abt-list-${p.id}"></div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
            <button style="padding:3px 8px;border-radius:6px;border:1.5px solid #34d399;color:#34d399;background:transparent;font-size:9px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif" onclick="setAbismoZone('${p.id}','Innovadores',this)">🟢 Innov.</button>
            <button style="padding:3px 8px;border-radius:6px;border:1.5px solid #84cc16;color:#84cc16;background:transparent;font-size:9px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif" onclick="setAbismoZone('${p.id}','Visionarios',this)">🟩 Vision.</button>
            <button style="padding:3px 8px;border-radius:6px;border:1.5px solid #fbbf24;color:#fbbf24;background:transparent;font-size:9px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif" onclick="setAbismoZone('${p.id}','Pragmáticos',this)">🟡 Pragm.</button>
            <button style="padding:3px 8px;border-radius:6px;border:1.5px solid #fb7185;color:#fb7185;background:transparent;font-size:9px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif" onclick="setAbismoZone('${p.id}','Conservadores',this)">🔴 Conserv.</button>
            <button style="padding:3px 8px;border-radius:6px;border:1.5px solid #94a3b8;color:#94a3b8;background:transparent;font-size:9px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif" onclick="setAbismoZone('${p.id}','Escépticos',this)">⬜ Escép.</button>
          </div>
          <div class="abt-add-row">
            <input class="abt-input" id="abt-input-${p.id}" placeholder="Nueva tarea (zona seleccionada arriba)..." onkeydown="handleAbismoTaskKey(event,'${p.id}')">
            <button class="abt-add-btn" onclick="addAbismoTask('${p.id}')">+ Agregar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAbismoHeatMap() {
  const props = getStrategyProps();
  if(!props.length) { $('abismoHeatMap').innerHTML = '<div class="empty-state">Sin propiedades.</div>'; return; }

  const cols = MODULES.length;
  const colFr = `160px repeat(${cols}, 1fr) 70px`;

  let html = `<div class="abismo-heat-grid">`;
  // Header
  html += `<div class="abismo-heat-header" style="grid-template-columns:${colFr}">
    <div>Propiedad</div>
    ${MODULES.map(m => `<div style="text-align:center;font-size:9px">${m.icon}<br>${m.label}</div>`).join('')}
    <div style="text-align:center">Global</div>
  </div>`;

  props.forEach(p => {
    const { modData, avgPct } = calcAbismo(p);
    const cfg = PHASES[p.phase] || PHASES.fase1;
    const overallLvl = gapLevel(avgPct);
    const overallColor = avgPct >= 80 ? '#00b460' : avgPct >= 50 ? '#e67e00' : '#e03030';
    html += `<div class="abismo-heat-row" style="grid-template-columns:${colFr}">
      <div>
        <div class="heat-prop-name">${p.name.length > 20 ? p.name.substring(0,20)+'…' : p.name}</div>
        <div class="heat-prop-city" style="color:${cfg.color}">${cfg.label}</div>
      </div>
      ${modData.map(d => {
        if(!d.isActive) return `<div style="text-align:center"><div class="heat-cell heat-na">—</div></div>`;
        const lvlNum = d.pct >= 80 ? 3 : d.pct >= 60 ? 2 : d.pct >= 40 ? 1 : 0;
        return `<div style="text-align:center"><div class="heat-cell heat-${lvlNum}" title="${d.val}/${d.meta}">${d.pct}%</div></div>`;
      }).join('')}
      <div style="text-align:center"><div class="heat-overall" style="color:${overallColor}">${avgPct}%</div></div>
    </div>`;
  });

  html += `</div>`;
  $('abismoHeatMap').innerHTML = html;
}

function renderAbismoCharts() {
  const props = getStrategyProps();
  if(!props.length) return;

  // Chart 1: Avance vs meta por propiedad (gap chart)
  const sorted = [...props].sort((a,b) => getPropProgress(a) - getPropProgress(b));
  const propNames = sorted.map(p => p.name.length > 18 ? p.name.substring(0,18)+'…' : p.name);
  const propPcts = sorted.map(p => getPropProgress(p));
  const propGaps = propPcts.map(v => 100 - v);
  makeChart('chartAbismoProps', 'bar', propNames, [
    {label:'Avance actual (%)', data:propPcts, backgroundColor:propPcts.map(v => v>=80?'rgba(0,180,100,.7)':v>=50?'rgba(230,126,0,.7)':'rgba(224,48,48,.7)'), borderRadius:4, borderSkipped:false, barThickness:18},
    {label:'Abismo restante (%)', data:propGaps, backgroundColor:'rgba(100,100,120,.15)', borderRadius:4, borderSkipped:false, barThickness:18}
  ], {}, {indexAxis:'y', scales:{x:{stacked:true, max:100}, y:{stacked:true}}, plugins:{legend:{position:'bottom',labels:{font:{family:'Outfit',size:11},boxWidth:12}}}});

  // Chart 2: Cumplimiento por módulo promedio (todas las props filtradas)
  const modAvgPcts = MODULES.map(m => {
    const active = props.filter(p => (p.modules||[]).includes(m.id));
    return active.length ? Math.round(active.reduce((s,p) => s + calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/active.length) : 0;
  });
  const modGaps = modAvgPcts.map(v => Math.max(0, 100 - v));
  makeChart('chartAbismoModules', 'bar', MODULES.map(m => m.icon+' '+m.label), [
    {label:'Cumplimiento (%)', data:modAvgPcts, backgroundColor:modAvgPcts.map(v=>v>=80?'rgba(0,180,100,.8)':v>=50?'rgba(230,126,0,.8)':'rgba(224,48,48,.8)'), borderRadius:5, borderSkipped:false},
    {label:'Abismo (%)', data:modGaps, backgroundColor:'rgba(100,100,120,.12)', borderRadius:5, borderSkipped:false}
  ], {}, {scales:{x:{stacked:true},y:{stacked:true, max:100}}, plugins:{legend:{position:'bottom',labels:{font:{family:'Outfit',size:11},boxWidth:12}}}});

  // Chart 3: Distribución del avance
  const dist = [{label:'≥80% (Meta)',count:0,color:'#00b460'},{label:'50–79% (Alerta)',count:0,color:'#e67e00'},{label:'<50% (Crítico)',count:0,color:'#e03030'}];
  props.forEach(p => {const v=getPropProgress(p);if(v>=80)dist[0].count++;else if(v>=50)dist[1].count++;else dist[2].count++;});
  makeChart('chartAbismoDist', 'doughnut', dist.map(d=>d.label), [{data:dist.map(d=>d.count),backgroundColor:dist.map(d=>d.color),borderWidth:0,hoverOffset:8}]);

  // Chart 4: Radar abismo
  makeChart('chartAbismoRadar', 'radar', MODULES.map(m=>m.label), [
    {label:'Cumplimiento promedio',data:modAvgPcts,backgroundColor:'rgba(130,10,209,.15)',borderColor:'#820ad1',pointBackgroundColor:'#820ad1',borderWidth:2,pointRadius:4},
    {label:'Meta (100%)',data:MODULES.map(()=>100),backgroundColor:'rgba(0,180,100,.05)',borderColor:'rgba(0,180,100,.5)',pointBackgroundColor:'rgba(0,180,100,.5)',borderWidth:1,borderDash:[4,4],pointRadius:2}
  ]);
}

// ══════ STRATEGY VIEW MANAGEMENT ══════
function setStrategyView(view, el) {
  strategyView = view;
  // Hide all views & deactivate all tabs
  ['overview','cards','heat','chart','prop'].forEach(v => {
    const cap = v.charAt(0).toUpperCase() + v.slice(1);
    const btn = $('btnView' + cap);
    if(btn) btn.classList.remove('strat-tab-active');
    const vEl = $('stratView' + cap);
    if(vEl) vEl.style.display = 'none';
  });
  // Activate clicked tab & show view
  el.classList.add('strat-tab-active');
  const target = $('stratView' + view.charAt(0).toUpperCase() + view.slice(1));
  if(target) target.style.display = 'block';
  // Show/hide filter bar only for card/heat/chart
  const filtersBar = $('stratFiltersBar');
  if(filtersBar) filtersBar.style.display = view==='cards' ? 'flex' : 'none';
  // Render
  if(view === 'overview') renderStrategyOverview();

  if(view === 'prop') renderPropChasmView();
}

function setStratPhase(f, el) {
  strategyPhaseFilter = f;
  document.querySelectorAll('#strategyPhaseTabs .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAbismoCards();
}

// ══════ PROP SUBTABS ══════
let propSubTab = 'estrategia';

function setPropSubTab(tab) {
  propSubTab = tab;
  $('propSubStrategia').style.display = tab === 'estrategia' ? 'block' : 'none';
  $('propSubRoadmap').style.display = tab === 'roadmap' ? 'block' : 'none';
  $('propSubTabEst').className = 'prop-subtab' + (tab === 'estrategia' ? ' prop-subtab-active' : '');
  $('propSubTabRoad').className = 'prop-subtab' + (tab === 'roadmap' ? ' prop-subtab-active' : '');
  if(tab === 'estrategia') renderPropStratTab();
  if(tab === 'roadmap') renderPropRoadmapTab();
}

// ══════ PROP CHASM VIEW ══════
function renderPropChasmView() {
  const props = state.properties;
  buildPropDropdown('propDropdown', props, selectedPropId);
  buildPropDropdown('propDropdownRoad', props, roadSelectedPropId);
  if(!selectedPropId && props.length) selectPropChasm(props[0].id);
  else if(selectedPropId) renderPropStratTab();
  if(!roadSelectedPropId && props.length) selectRoadProp(props[0].id);
}

// Map dropdown IDs to their select fn and badge ID
const PROP_DROPDOWN_MAP = {
  'propDropdown':       {fn:'selectPropChasm',    badge:'propDdBadge'},
  'propDropdownRoad':   {fn:'selectRoadProp',     badge:'propDdBadgeRoad'},
  'navPropDropdown':    {fn:'navSelectPropChasm', badge:'navPropDdBadge'},
  'navPropDropdownRoad':{fn:'navSelectRoadProp',  badge:'navPropDdBadgeRoad'},
};

function buildPropDropdown(dropdownId, props, activeId) {
  const sel = $(dropdownId); if(!sel) return;
  const map = PROP_DROPDOWN_MAP[dropdownId];
  if(!props.length) { sel.innerHTML='<option>Sin propiedades</option>'; return; }
  sel.innerHTML = props.map(p =>
    '<option value="' + p.id + '"' + (String(p.id)===String(activeId)?' selected':'') + '>'
    + p.name + (p.city?' · '+p.city:'') + ' — ' + getPropProgress(p) + '%'
    + '</option>'
  ).join('');
  // onchange already in HTML, but also ensure it fires correctly
  sel.onchange = function() { window[map.fn](this.value); };
  updatePropDdBadge(dropdownId, props, activeId);
}

// Keep buildPropPills as alias for backward compat
function buildPropPills(containerId, props, activeId, fnName, countId) {
  // Map old IDs to new dropdown IDs
  const idMap = {
    'propSelectorTabs':        'propDropdown',
    'propSelectorTabsRoad':    'propDropdownRoad',
    'navPropSelectorTabs':     'navPropDropdown',
    'navPropSelectorTabsRoad': 'navPropDropdownRoad',
  };
  const dropId = idMap[containerId] || containerId;
  buildPropDropdown(dropId, props, activeId);
}

function updatePropDdBadge(dropdownId, props, activeId) {
  const map = PROP_DROPDOWN_MAP[dropdownId]; if(!map) return;
  const badge = $(map.badge); if(!badge) return;
  const p = props.find(x => String(x.id)===String(activeId));
  if(!p) return;
  const pct = getPropProgress(p);
  const color = pct>=80?'#00b460':pct>=50?'#e67e00':'#e03030';
  badge.innerHTML = '<span class="prop-dd-dot" style="background:'+color+'"></span>'
    + '<span class="prop-dd-pct" style="color:'+color+'">'+pct+'%</span>';
}

function navPropStep(dropdownId, dir) {
  const sel = $(dropdownId); if(!sel||!sel.options.length) return;
  const cur = sel.selectedIndex;
  const next = (cur + dir + sel.options.length) % sel.options.length;
  sel.selectedIndex = next;
  sel.dispatchEvent(new Event('change'));
}

function selectPropChasm(id) {
  selectedPropId = String(id);
  buildPropDropdown('propDropdown', state.properties, selectedPropId);
  renderPropStratTab();
}

function renderPropStratTab() {
  const p = state.properties.find(x => String(x.id) === String(selectedPropId));
  if(!p) return;
  const { modData, avgPct, avgGapPct } = calcAbismo(p);
  const units = p.units || 50;

  // Title & eyebrow
  if($('propChasmTitle')) $('propChasmTitle').textContent = p.name + (p.city ? ' · ' + p.city : '');
  if($('propModChartSub')) $('propModChartSub').textContent = p.name;

  // Adoption curve (full design)
  renderAdoptionCurve(p, avgPct, avgGapPct);

  // Hitos de la estrategia (dark card)
  renderHitosGrid(p, modData);

  // KPIs
  renderPropKpis(p, avgPct, avgGapPct);

  // Charts
  renderPropCharts(p, modData, avgPct);
}

function renderHitosGrid(p, modData) {
  const propTasksForP = propTasks[String(p.id)] || [];
  const grid = $('hitosGrid');
  const titleEl = $('hitosTitle');
  const badgeEl = $('hitosPropBadge');
  if(!grid) return;

  if(titleEl) titleEl.textContent = 'Hitos de ' + p.name;
  if(badgeEl) badgeEl.textContent = (p.modules||[]).length + ' módulos activos';

  // Show active modules as hitos + prop tasks
  const items = [];

  // Module-based hitos
  modData.filter(d => d.isActive).forEach(d => {
    const m = MODULES.find(x => x.id === d.mid);
    items.push({
      cat: m.icon + ' ' + m.label,
      text: m.label + ' — ' + d.val + '/' + d.meta + ' ' + m.unit,
      progress: d.pct,
      isModule: true
    });
  });

  // Task-based hitos
  propTasksForP.forEach(t => {
    items.push({
      cat: t.category,
      text: t.text,
      progress: t.progress,
      isModule: false
    });
  });

  if(!items.length) {
    grid.innerHTML = '<div style="color:rgba(255,255,255,.35);font-size:clamp(10px,.95vw,13px);padding:20px;grid-column:1/-1">Sin módulos activos ni tareas asignadas.</div>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const barColor = item.progress === 100 ? '#00e57c' : item.progress >= 50 ? '#ffcc00' : '#820ad1';
    const isDone = item.progress === 100;
    return '<div class="hito-card">'
      + '<span class="hito-cat">' + item.cat + '</span>'
      + '<div class="hito-text">' + item.text + '</div>'
      + '<div class="hito-bar-wrap"><div class="hito-bar-fill" style="width:' + item.progress + '%;background:' + barColor + '"></div></div>'
      + '<div class="hito-footer">'
      + '<span class="hito-pct" style="color:' + barColor + '">' + item.progress + '%</span>'
      + '<span class="hito-status ' + (isDone?'hito-done':'hito-pending') + '">' + (isDone?'✓ Meta':'En progreso') + '</span>'
      + '</div>'
      + '</div>';
  }).join('');
}

function renderAdoptionCurve(p, avgPct, avgGapPct) {
  const wrap = $('adoptionCurve');
  if(!wrap) return;

  // Tasks-based seal progress for this property
  const tasks = propTasks[String(p.id)] || [];
  const totalW = tasks.reduce((s,t)=>s+t.weight,0);
  const doneW = tasks.reduce((s,t)=>s+(t.progress/100)*t.weight,0);
  const taskSeal = totalW > 0 ? Math.round((doneW/totalW)*100) : 0;
  // Combined: module progress + task seal influence
  const combinedSeal = Math.min(100, Math.round((avgPct + taskSeal) / 2));
  const chasmRemaining = 100 - combinedSeal;
  const chasmColor = combinedSeal >= 80 ? '#00b460' : combinedSeal >= 50 ? '#e67e00' : '#e03030';

  // Update success pct badge
  const succEl = $('adoptionSuccessPct');
  if(succEl) {
    succEl.textContent = combinedSeal + '%';
    succEl.style.color = chasmColor;
  }

  // Segment definitions matching index5 design
  const segs = [
    {name:'Innovadores',  color:'#34d399', h:'90px'},
    {name:'Visionarios',  color:'#84cc16', h:'140px'},
    null,
    {name:'Pragmáticos',  color:'#fbbf24', h:'210px'},
    {name:'Conservadores',color:'#fb7185', h:'168px'},
    {name:'Escépticos',   color:'#94a3b8', h:'88px'},
  ];

  wrap.innerHTML = segs.map(seg => {
    if(seg === null) {
      return '<div class="ab-gap">'
        + '<div class="ab-gap-track">'
        + '<div class="ab-gap-fill" style="height:' + combinedSeal + '%;background:' + chasmColor + '"></div>'
        + '</div>'
        + '<div class="ab-gap-info">'
        + '<div class="ab-gap-word">Abismo</div>'
        + '<div class="ab-gap-pct">' + chasmRemaining + '%</div>'
        + '</div>'
        + '</div>';
    }
    return '<div class="ab-seg" title="' + seg.name + '">'
      + '<div class="ab-bar" style="height:' + seg.h + ';background:' + seg.color + '"></div>'
      + '<div class="ab-label" style="color:' + seg.color + '">' + seg.name + '</div>'
      + '</div>';
  }).join('');

  // Show & animate chasm meter bar
  const meter = $('chasmMeter');
  if(meter) meter.style.display = 'flex';
  const fill = $('chasmMeterFill');
  if(fill) setTimeout(()=>{ fill.style.width = combinedSeal + '%'; }, 80);
  const pctLbl = $('chasmPctLabel');
  if(pctLbl) pctLbl.textContent = combinedSeal + '% sellado · ' + chasmRemaining + '% restante';
}

function renderPropKpis(p, avgPct, avgGapPct) {
  const el = $('propChasmKpis');
  if(!el) return;
  const cfg = PHASES[p.phase] || PHASES.fase1;
  const lvlColor = avgPct >= 80 ? '#00b460' : avgPct >= 50 ? '#e67e00' : '#e03030';
  const activeMods = (p.modules||[]).length;
  const tasks = propTasks[p.id] || [];
  const totalWeight = tasks.reduce((s,t)=>s+t.weight,0);
  const doneWeight = tasks.filter(t=>t.progress===100).reduce((s,t)=>s+t.weight,0);
  const sealPct = totalWeight > 0 ? Math.round((doneWeight/totalWeight)*100) : 0;
  el.innerHTML = `
    <div class="pck-grid">
      <div class="pck-item"><div class="pck-val" style="color:${lvlColor}">${avgPct}%</div><div class="pck-label">Avance global</div></div>
      <div class="pck-item"><div class="pck-val" style="color:#e03030">${avgGapPct}%</div><div class="pck-label">Abismo restante</div></div>
      <div class="pck-item"><div class="pck-val" style="color:var(--domo)">${activeMods}</div><div class="pck-label">Módulos activos</div></div>
      <div class="pck-item"><div class="pck-val" style="color:#00b460">${sealPct}%</div><div class="pck-label">Cierre por tareas</div></div>
    </div>
    <div style="margin-top:12px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
      <div style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Fase actual</div>
      <span class="pill ${cfg.pill}">${cfg.label}</span>
      <div style="font-size:clamp(9px,.85vw,11px);color:var(--text-muted);margin-top:6px">⏱ Sem. ${getPropWeek(p)}/8 · ${getDaysFromEntry(p)} días · ${p.units||0} unidades</div>
    </div>`;
}

function renderPropCharts(p, modData, avgPct) {
  const dk = theme === 'dark';
  const tc = dk ? '#9287b8' : '#7c6fa0';
  const activeMods = modData.filter(d => d.isActive);
  if(!activeMods.length) return;

  // Bar: avance vs meta por módulo
  const labels = activeMods.map(d => { const _m=MODULES.find(m=>m.id===d.mid); return _m ? _m.icon+' '+_m.label : d.mid; });
  const vals = activeMods.map(d => d.pct);
  const gaps = activeMods.map(d => Math.max(0, 100 - d.pct));
  const colors = vals.map(v => v>=80?'rgba(0,180,100,.8)':v>=50?'rgba(230,126,0,.8)':'rgba(130,10,209,.8)');

  destroyChart('chartPropModProgress');
  const c1 = $('chartPropModProgress'); if(c1) {
    const ctx = c1.getContext('2d');
    charts['chartPropModProgress'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {label:'Avance (%)', data:vals, backgroundColor:colors, borderRadius:5, borderSkipped:false},
          {label:'Abismo (%)', data:gaps, backgroundColor:'rgba(100,100,120,.12)', borderRadius:5, borderSkipped:false}
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color:tc, font:{family:'Montserrat',size:10}, boxWidth:10 } } },
        scales: {
          x: { stacked:true, ticks:{color:tc, font:{family:'Montserrat',size:9}}, grid:{color:dk?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'} },
          y: { stacked:true, max:100, ticks:{color:tc, font:{family:'Montserrat',size:10}}, grid:{color:dk?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'} }
        }
      }
    });
  }

  // Radar
  destroyChart('chartPropRadar');
  const c2 = $('chartPropRadar'); if(c2) {
    const ctx = c2.getContext('2d');
    charts['chartPropRadar'] = new Chart(ctx, {
      type:'radar',
      data:{labels,datasets:[
        {label:'Avance',data:vals,backgroundColor:'rgba(130,10,209,.15)',borderColor:'#820ad1',pointBackgroundColor:'#820ad1',borderWidth:2,pointRadius:3},
        {label:'Meta',data:activeMods.map(()=>100),backgroundColor:'rgba(0,180,100,.05)',borderColor:'rgba(0,180,100,.5)',borderWidth:1,pointRadius:2}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}}}
    });
  }

  // Doughnut
  destroyChart('chartPropDist');
  const c3 = $('chartPropDist'); if(c3) {
    const ctx = c3.getContext('2d');
    const good = vals.filter(v=>v>=80).length;
    const warn = vals.filter(v=>v>=50&&v<80).length;
    const crit = vals.filter(v=>v<50).length;
    charts['chartPropDist'] = new Chart(ctx, {
      type:'doughnut',
      data:{labels:['Meta ≥80%','Alerta 50-79%','Crítico <50%'],datasets:[{data:[good,warn,crit],backgroundColor:['#00b460','#e67e00','#e03030'],borderWidth:0,hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}}}
    });
  }
}

// ══════ ROADMAP (PROP) ══════
function setRoadCategory(cat, el) {
  roadCategory = cat;
  document.querySelectorAll('#roadCategoryBtns .road-cat-btn').forEach(b => b.className = 'road-cat-btn');
  el.className = 'road-cat-btn road-cat-active';
}

function selectRoadProp(id) {
  roadSelectedPropId = String(id);
  buildPropDropdown('propDropdownRoad', state.properties, roadSelectedPropId);
  renderPropRoadmapTab();
}

function addRoadTask() {}

function updateRoadTaskProgress(propId, taskId, val) {
  if(!propTasks[propId]) return;
  const t = propTasks[propId].find(x => x.id === taskId);
  if(!t) return;
  t.progress = parseInt(val);
  updateTaskProgressSB(t.id,t.progress);
  // Actualizar card visualmente sin re-render (slider sigue activo)
  const sid = String(taskId);
  const bc = t.progress===100?'#00b460':t.progress>=50?'#e67e00':'#820ad1';
  const bar = $('rtc-bar-'+sid); if(bar){bar.style.width=t.progress+'%';bar.style.background=bc;}
  const lbl = $('rtc-pct-'+sid); if(lbl){lbl.textContent=t.progress+'%';lbl.style.color=bc;}
  const card = document.querySelector('[data-tid="'+sid+'"]');
  if(card){ if(t.progress===100) card.classList.add('rtc-done'); else card.classList.remove('rtc-done'); }
  // Checkmark en el botón
  const chk = $('rtc-chk-'+sid);
  if(chk){ chk.className='rtc-check-btn'+(t.progress===100?' checked':''); chk.textContent=t.progress===100?'✓':''; }
  // Actualizar abismo en tiempo real
  renderRoadChasmVisual(propId);
  renderRoadTaskBridges(propId);
}

function deleteRoadTask(propId, taskId) {
  if(!propTasks[propId]) return;
  propTasks[propId] = propTasks[propId].filter(x => x.id !== taskId);
  deleteTaskSB(taskId);
  renderPropRoadmapTab();
}

function getRoadSealPct(propId) {
  const tasks = propTasks[propId] || [];
  if(!tasks.length) return 0;
  const totalWeight = tasks.reduce((s,t)=>s+t.weight,0);
  const doneWeight = tasks.reduce((s,t)=>s+(t.progress/100)*t.weight,0);
  return totalWeight > 0 ? Math.round((doneWeight/totalWeight)*100) : 0;
}

function renderPropRoadmapTab() {
  const id = roadSelectedPropId;
  const p = state.properties.find(x => String(x.id) === String(id));
  if(!p) return;

  // Update prop name
  if($('roadPropName')) $('roadPropName').textContent = p.name;

  // Seal pct
  const sealPct = getRoadSealPct(id);
  if($('roadChasmPct')) $('roadChasmPct').textContent = sealPct + '%';

  renderRoadChasmVisual(id);
  renderRoadTaskBridges(id);
  renderRoadTaskList(id);
}

function renderRoadChasmVisual(propId) {
  const sealPct = getRoadSealPct(propId);
  const color = sealPct >= 80 ? '#00b460' : sealPct >= 50 ? '#e67e00' : '#820ad1';

  // rcv-gap-sealed height
  const fill = $('chasmGapFill');
  if(fill) setTimeout(()=>{ fill.style.height = sealPct + '%'; }, 80);

  // rcv-gap-open takes the rest (flex handles it, but also set explicitly)
  const rem = $('chasmGapRemaining');
  if(rem) rem.style.height = (100 - sealPct) + '%';

  // pct label
  const pct = $('chasmGapPct');
  if(pct) { pct.textContent = sealPct + '% sellado'; pct.style.color = color; }

  // header pct badge
  const badge = $('roadChasmPct');
  if(badge) { badge.textContent = sealPct + '%'; badge.style.color = color; }
}

function renderRoadTaskBridges(propId) {
  const el = $('roadTaskBridges');
  if(!el) return;
  const tasks = (propTasks[propId] || []);
  if(!tasks.length) {
    el.innerHTML = '<div style="font-size:clamp(10px,.9vw,12px);color:var(--text-muted);padding:8px 0">Sin tareas asignadas aún.</div>';
    return;
  }
  const totalW = tasks.reduce((s,t)=>s+t.weight,0);
  el.innerHTML = tasks.map(t => {
    const share = totalW > 0 ? Math.round((t.weight/totalW)*100) : 0;
    const contribution = Math.round(share * (t.progress/100));
    const barColor = t.progress === 100 ? '#00b460' : t.progress >= 50 ? '#e67e00' : 'var(--domo)';
    return `<div class="task-bridge-row">
      <div class="tbr-name" title="${t.text}">${t.text}</div>
      <div class="tbr-weight">×${t.weight}</div>
      <div class="tbr-bar-wrap"><div class="tbr-bar-fill" style="width:${t.progress}%;background:${barColor}"></div></div>
      <div class="tbr-pct" style="color:${barColor}">${contribution}%</div>
    </div>`;
  }).join('');
}

function renderRoadTaskList(propId) {
  const el = $('roadTaskList');
  if(!el) return;
  const tasks = propTasks[propId] || [];
  const done = tasks.filter(t=>t.progress===100).length;
  if(!tasks.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;border:2px dashed var(--border);border-radius:14px">📋 Las tareas se agregan desde la pestaña <strong>Tareas</strong>.</div>`;
    return;
  }
  const hdrCol = done===tasks.length&&done>0?'#00b460':'var(--text-muted)';
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.7px">${tasks.length} tarea${tasks.length!==1?'s':''}</span>
    <span style="font-size:12px;font-weight:800;color:${hdrCol}">${done===tasks.length&&done>0?'✅ ':''} ${done}/${tasks.length} completadas</span>
  </div>`
  + tasks.map(t => {
    const bc = t.progress===100?'#00b460':t.progress>=50?'#e67e00':'#820ad1';
    const isDone = t.progress===100;
    const sid = String(t.id);
    const spid = String(propId);
    const zoneCols = {Innovadores:'#34d399',Visionarios:'#84cc16','Pragmáticos':'#fbbf24',Conservadores:'#fb7185','Escépticos':'#94a3b8'};
    const zoneCol = zoneCols[t.category]||'var(--domo)';
    return `<div class="road-task-card${isDone?' rtc-done':''}" id="rtc-card-${sid}" data-tid="${sid}" data-pid="${spid}" style="border-left:3px solid ${zoneCol}">
      <div class="rtc-top">
        <button class="rtc-check-btn${isDone?' checked':''}" id="rtc-chk-${sid}" onclick="toggleRoadTask('${spid}',${sid})" title="${isDone?'Desmarcar':'Marcar 100%'}">${isDone?'✓':''}</button>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span class="rtc-cat" style="background:${zoneCol}20;border-color:${zoneCol};color:${zoneCol}">${t.category}</span>
            <span style="font-size:9px;font-weight:700;color:var(--text-muted);background:var(--surface2);padding:2px 6px;border-radius:8px;border:1px solid var(--border)">Peso ${t.weight}</span>
          </div>
          <div class="rtc-text" style="${isDone?'text-decoration:line-through;color:var(--text-muted)':''}">${t.text}</div>
        </div>
      </div>
      <div class="rtc-progress-row" style="margin-top:10px;gap:8px">
        <button onclick="stepRoadTask('${spid}',${sid},-10)" style="width:26px;height:26px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;font-size:14px;font-weight:800;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;justify-content:center;line-height:1">−</button>
        <div class="rtc-bar-wrap" style="height:10px;border-radius:5px;flex:1">
          <div class="rtc-bar-fill" id="rtc-bar-${sid}" style="width:${t.progress}%;background:${bc};border-radius:5px;transition:width .4s ease"></div>
        </div>
        <button onclick="stepRoadTask('${spid}',${sid},10)" style="width:26px;height:26px;border-radius:6px;border:1.5px solid var(--domo);background:rgba(130,10,209,.08);cursor:pointer;font-size:14px;font-weight:800;color:var(--domo);flex-shrink:0;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
        <div id="rtc-pct-${sid}" style="font-size:13px;font-weight:800;color:${bc};min-width:36px;text-align:right">${t.progress}%</div>
      </div>
    </div>`;
  }).join('');
}

// ══════ CHARTS ══════
function destroyChart(id){if(charts[id]){try{charts[id].destroy();}catch(e){}delete charts[id];}}
function makeChart(id,type,labels,datasets,extra={},extraOpts={}){
  const canvas=document.getElementById(id);if(!canvas)return;
  destroyChart(id);
  const dk=theme==='dark';
  const gc=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';
  const tc=dk?'#9287b8':'#7c6fa0';
  const tb=dk?'#1e1838':'#fff';
  const scaleBase={grid:{color:gc},ticks:{color:tc,font:{family:'Outfit',size:10}},border:{color:gc}};
  let scales={};
  if(type!=='doughnut'&&type!=='pie'&&type!=='radar'){scales={x:{...scaleBase,...(extraOpts.scales?.x||{})},y:{...scaleBase,...(extraOpts.scales?.y||{})}};}
  const pluginsOpt = extraOpts.plugins ? {legend:{labels:{color:tc,font:{family:'Outfit',size:11},boxWidth:12}},...extraOpts.plugins} : {legend:{labels:{color:tc,font:{family:'Outfit',size:11},boxWidth:12}},tooltip:{backgroundColor:tb,titleColor:dk?'#ede9ff':'#16122a',bodyColor:tc,borderColor:dk?'#2d2448':'#e0d9f5',borderWidth:1}};
  const axisOpt = extraOpts.indexAxis ? {indexAxis:extraOpts.indexAxis} : {};
  charts[id]=new Chart(canvas,{type,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:pluginsOpt,scales,...axisOpt,...extra}});
}

function renderDashCharts(){
  const props=state.properties;if(!props.length)return;
  const total=props.length;
  const dk=theme==='dark';
  const tc=dk?'#9287b8':'#7c6fa0';
  // Usa la constante global NON_MODULES
  const implAvg=getGlobalProgress();
  const implOnTarget=props.filter(p=>getPropProgress(p)>=80).length;
  const implAlert=props.filter(p=>{const v=getPropProgress(p);return v>=50&&v<80;}).length;
  const implCritical=props.filter(p=>getPropProgress(p)<50).length;
  const implColor=implAvg>=80?'#00b460':implAvg>=50?'#e67e00':'#e03030';

  // ── Cálculos de Usabilidad (excluye NON_MODULES) ──
  const usabPerProp=props.map(p=>{
    const mv=p.module_values||{};
    const usabMods=(p.modules||[]).filter(mid=>!NON_MODULES.includes(mid));
    const withUsage=usabMods.filter(mid=>(mv[mid]||0)>0).length;
    return usabMods.length>0?Math.round((withUsage/usabMods.length)*100):0;
  });
  const usabAvg=usabPerProp.length?Math.round(usabPerProp.reduce((s,v)=>s+v,0)/usabPerProp.length):0;
  const usabOnTarget=usabPerProp.filter(v=>v>=80).length;
  const usabAlert=usabPerProp.filter(v=>v>=50&&v<80).length;
  const usabCritical=usabPerProp.filter(v=>v<50).length;
  const usabColor=usabAvg>=80?'#00b460':usabAvg>=50?'#e67e00':'#e03030';

  // ── Helper: KPI strip ──
  const renderKpiStrip=(elId,avg,onTarget,color)=>{
    const el=document.getElementById(elId);
    if(!el)return;
    el.innerHTML=[
      {val:avg+'%',lbl:'Promedio',col:color},
      {val:onTarget+'/'+total,lbl:'En Meta',col:'#00b460'},
    ].map(k=>`<div style="text-align:center"><div style="font-size:clamp(13px,1.4vw,18px);font-weight:800;color:${k.col};line-height:1">${k.val}</div><div style="font-size:clamp(8px,.7vw,10px);font-weight:600;color:${tc};margin-top:2px">${k.lbl}</div></div>`).join('');
  };
  renderKpiStrip('implGlobalKpis',implAvg,implOnTarget,implColor);
  renderKpiStrip('usabGlobalKpis',usabAvg,usabOnTarget,usabColor);

  // ── Helper: subtítulo ──
  const time=new Date().toLocaleTimeString('es-CO');
  const setS=(id,txt)=>{const e=document.getElementById(id);if(e)e.textContent=txt;};
  setS('implGlobalSub',total+' propiedades · Prom: '+implAvg+'% · '+time);
  setS('usabGlobalSub',total+' propiedades · Prom: '+usabAvg+'% · '+time);

  // ── Helper: construir donut con texto central ──
  const makeDoughnut=(canvasId,avg,avgColor,segments,segLabels)=>{
    destroyChart(canvasId);
    const canvas=document.getElementById(canvasId);
    if(!canvas)return;
    const plugin={
      id:'ct_'+canvasId,
      afterDraw(chart){
        const{ctx,chartArea:{width,height,left,top}}=chart;
        ctx.save();
        const cx=left+width/2,cy=top+height/2;
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='bold 26px Montserrat,sans-serif';
        ctx.fillStyle=avgColor;
        ctx.fillText(avg+'%',cx,cy-13);
        ctx.font='600 11px Montserrat,sans-serif';
        ctx.fillStyle=tc;
        ctx.fillText('promedio',cx,cy+12);
        ctx.restore();
      }
    };
    charts[canvasId]=new Chart(canvas.getContext('2d'),{
      type:'doughnut',
      data:{
        labels:segLabels,
        datasets:[{data:segments,backgroundColor:['#00b460','#e67e00','#e03030'],borderWidth:0,hoverOffset:10,borderRadius:6}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'68%',
        plugins:{
          legend:{position:'bottom',labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10,padding:14,usePointStyle:true}},
          tooltip:{callbacks:{label:ctx=>{const pct=total>0?Math.round(ctx.raw/total*100):0;return ' '+ctx.label+': '+ctx.raw+' ('+pct+'%)';}}}
        }
      },
      plugins:[plugin]
    });
  };

  makeDoughnut('chartImplGlobal',implAvg,implColor,
    [implOnTarget,implAlert,implCritical],
    ['En Meta \u226580%','Alerta 50\u201379%','Cr\u00edtico <50%']
  );
  makeDoughnut('chartUsabGlobal',usabAvg,usabColor,
    [usabOnTarget,usabAlert,usabCritical],
    ['En Meta \u226580%','Alerta 50\u201379%','Cr\u00edtico <50%']
  );
}


function renderChartsPage(){
  const props=state.properties;if(!props.length)return;
  makeChart('chartPhase2','doughnut',Object.values(PHASES).map(c=>c.label),[{data:Object.keys(PHASES).map(k=>props.filter(p=>p.phase===k).length),backgroundColor:Object.values(PHASES).map(c=>c.color),borderWidth:0,hoverOffset:8}]);
  const avgPcts=MODULES.map(m=>{const active=props.filter(p=>(p.modules||[]).includes(m.id));return active.length?Math.round(active.reduce((s,p)=>s+calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/active.length):0;});
  makeChart('chartRadar','radar',MODULES.map(m=>m.label),[{label:'% Cumplimiento promedio',data:avgPcts,backgroundColor:'rgba(130,10,209,.15)',borderColor:'#820ad1',pointBackgroundColor:'#820ad1',borderWidth:2,pointRadius:4}]);
  makeChart('chartDays','bar',props.map(p=>p.name.length>16?p.name.substring(0,16)+'…':p.name),[{label:'Días',data:props.map(p=>p.days||0),backgroundColor:props.map(p=>PHASES[p.phase]?.color||'#820ad1'),borderRadius:6,borderSkipped:false}]);
  const sorted=[...props].sort((a,b)=>getPropProgress(b)-getPropProgress(a));
  makeChart('chartProps2','bar',sorted.map(p=>p.name.length>20?p.name.substring(0,20)+'…':p.name),[{label:'Avance real (%)',data:sorted.map(p=>getPropProgress(p)),backgroundColor:sorted.map(p=>PHASES[p.phase]?.color||'#820ad1'),borderRadius:6,borderSkipped:false}],{},{indexAxis:'y'});
}

// ══════ SETTINGS ══════
function renderSettings(){
  $('setAutoRefresh').value=settings.autoRefresh||60;$('setUserName').value=settings.userName||'';
  $('setCurWeekStart').value=settings.curWeekStart||getLastFriday(-7);$('setPrevWeekStart').value=settings.prevWeekStart||getLastFriday(-14);
  // URL desde config.js (no localStorage)
  const cfgUrl=(typeof SUPABASE_CONFIG!=='undefined'&&SUPABASE_CONFIG.url)||'';
  $('setShowUrl').textContent=cfgUrl?cfgUrl.substring(0,50)+'…':'Definida en config.js';
  $('setConnStatus').textContent=isConnected?'Conectado ✓':'No conectado';$('setConnStatus').style.color=isConnected?'#00b460':'#e03030';
  $('themeBtn2').textContent=theme==='dark'?'☀️ Claro':'🌙 Oscuro';
  $('targetSettings').innerHTML=MODULES.map(m=>{const ref80=m.metaFn(80);return `<div class="setting-row"><div><div class="setting-label">${m.icon} ${m.label}</div><div class="setting-sub">${m.unit} · ${m.metaLabel(80)}</div></div><span style="font-size:clamp(10px,.9vw,12px);font-weight:800;color:var(--domo)">${ref80}</span></div>`;}).join('');
}
function autoSetDates(){settings.curWeekStart=getLastFriday(-7);settings.prevWeekStart=getLastFriday(-14);const cw=$('setCurWeekStart'),pw=$('setPrevWeekStart');if(cw)cw.value=settings.curWeekStart;if(pw)pw.value=settings.prevWeekStart;saveSettings();}
// Configuración solo en memoria (no persiste localmente)
function saveSettings(){const ar=$('setAutoRefresh'),un=$('setUserName'),cw=$('setCurWeekStart'),pw=$('setPrevWeekStart');if(ar)settings.autoRefresh=parseInt(ar.value)||60;if(un)settings.userName=un.value;if(cw)settings.curWeekStart=cw.value;if(pw)settings.prevWeekStart=pw.value;startAutoRefresh();updateGreeting();}
function loadSettings(){ /* No-op: settings se inicializan con valores por defecto */ }

// ══════ GREETING & CLOCK ══════
function updateGreeting(){const h=new Date().getHours();const g=h>=6&&h<12?'Buenos días':h>=12&&h<20?'Buenas tardes':'Buenas noches';$('greetingLabel').textContent=g;$('greetingText').textContent=settings.userName||'Admin';}
function updateClock(){const now=new Date();$('topbarClock').textContent=now.toLocaleTimeString('es-CO');const yyyy=now.getFullYear(),mm=String(now.getMonth()+1).padStart(2,'0'),dd=String(now.getDate()).padStart(2,'0');$('sidebarDate').textContent=`${yyyy}-${mm}-${dd}`;if(now.getSeconds()===0)updateGreeting();}

// ══════ THEME ══════
function toggleTheme(){theme=theme==='light'?'dark':'light';document.body.dataset.theme=theme;localStorage.setItem('dn_theme',theme);$('themeBtn').textContent=theme==='dark'?'☀️':'🌙';if($('themeBtn2'))$('themeBtn2').textContent=theme==='dark'?'☀️ Claro':'🌙 Oscuro';Object.keys(charts).forEach(id=>destroyChart(id));if(currentSection!=='login'&&currentSection!=='connect')renderSection(currentSection);}

// ══════ REFRESH ══════
function refreshData(){if(!isConnected){showToast('Inicia sesión primero','error');return;}const btn=$('refreshBtn');btn.style.transition='transform .7s';btn.style.transform='rotate(360deg)';const p=sb?fetchAllData():Promise.resolve();p.then(()=>{setTimeout(()=>btn.style.transform='',800);showToast('↻ Actualizado','success');if(currentSection!=='login')renderSection(currentSection);});}

// ══════ TOAST ══════
function showToast(msg,type=''){const c=$('toastContainer'),e=document.createElement('div');e.className='toast'+(type?' toast-'+type:'');e.textContent=msg;c.appendChild(e);setTimeout(()=>{e.style.opacity='0';e.style.transform='translateX(36px)';setTimeout(()=>e.remove(),350);},3000);}

// ══════ INIT ══════
document.addEventListener('DOMContentLoaded',async()=>{
  loadSettings();document.body.dataset.theme=theme;$('themeBtn').textContent=theme==='dark'?'☀️':'🌙';
  updateGreeting();setInterval(updateClock,1000);updateClock();autoSetDates();

  // Lee credenciales desde config.js (excluido de git)
  const SB_URL=(typeof SUPABASE_CONFIG!=='undefined'&&SUPABASE_CONFIG.url)||'';
  const SB_KEY=(typeof SUPABASE_CONFIG!=='undefined'&&SUPABASE_CONFIG.key)||'';

  if(!SB_URL||!SB_KEY){
    console.warn('[DomoNow] config.js no encontrado o incompleto.');
    goLogin();
    showLoginError('Configuración de Supabase no encontrada. Contacta al administrador.');
    return;
  }

  try{
    console.log('[DomoNow] Inicializando Supabase...');
    if(!window.supabase)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    if(!window.supabase)throw new Error('No se pudo cargar el SDK de Supabase.');
    sb=window.supabase.createClient(SB_URL,SB_KEY);

    // Auth state listener (maneja token refresh y signout externos)
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){isConnected=false;state.properties=[];updateUserUI(null);goLogin();}
    });

    // Verifica sesión existente
    const{data:{session}}=await sb.auth.getSession();
    if(session?.user){
      console.log('[DomoNow] ✅ Sesión activa:',session.user.email);
      await onUserLoggedIn(session.user);
    }else{
      console.log('[DomoNow] Sin sesión. Mostrando login.');
      goLogin();
    }
  }catch(e){
    console.error('[DomoNow] ❌ Error de inicialización:',e);
    goLogin();
    showLoginError(e.message||'Error al inicializar. Recarga la página.');
  }
});





// ══════════════════════════════════════════════
// TASKS SECTION
// ══════════════════════════════════════════════
let taskCat = 'Innovadores';
let taskSelectedPropId = null;

const TASK_SEGS = [
  {name:'Innovadores',  color:'#34d399', h:'70px'},
  {name:'Visionarios',  color:'#84cc16', h:'110px'},
  null,
  {name:'Pragmáticos',  color:'#fbbf24', h:'160px'},
  {name:'Conservadores',color:'#fb7185', h:'128px'},
  {name:'Escépticos',   color:'#94a3b8', h:'68px'},
];

function setTaskCat(cat, el) {
  taskCat = cat;
  document.querySelectorAll('#tafCatBtns .taf-cat').forEach(b => b.className = 'taf-cat');
  el.className = 'taf-cat taf-cat-active';
}

function getTaskSealPct(propId) {
  const tasks = propTasks[String(propId)] || [];
  if(!tasks.length) return 0;
  const totalW = tasks.reduce((s,t) => s + t.weight, 0);
  const doneW  = tasks.reduce((s,t) => s + (t.progress/100) * t.weight, 0);
  return totalW > 0 ? Math.round((doneW/totalW)*100) : 0;
}

function getCombinedSealPct(p) {
  const { avgPct } = calcAbismo(p);
  const taskSeal = getTaskSealPct(p.id);
  // weighted: 60% module progress + 40% task completion
  return Math.min(100, Math.round(avgPct * 0.2 + taskSeal * 0.8));
}

function renderTasksSection() {
  const props = state.properties;
  const list = $('tasksPropList');
  if(!list) return;

  // Global pct
  const globalSeal = props.length
    ? Math.round(props.reduce((s,p) => s + getCombinedSealPct(p), 0) / props.length)
    : 0;
  const gEl = $('tasksGlobalPct');
  if(gEl) {
    gEl.textContent = globalSeal + '%';
    gEl.style.color = globalSeal>=80?'#00e57c':globalSeal>=50?'#fbbf24':'#fb7185';
  }

  // Property list
  if(!props.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:clamp(10px,.9vw,12px);padding:16px;text-align:center">Sin propiedades</div>';
    return;
  }

  list.innerHTML = props.map(p => {
    const seal = getCombinedSealPct(p);
    const tasks = propTasks[String(p.id)] || [];
    const barColor = seal>=80?'#00b460':seal>=50?'#e67e00':'#820ad1';
    const isActive = String(p.id) === String(taskSelectedPropId);
    return '<div class="tpl-card' + (isActive?' tpl-active':'') + '" data-pid="' + p.id + '" onclick="selectTaskProp(' + JSON.stringify(String(p.id)) + ')">'
      + '<div class="tpl-name">' + p.name + '</div>'
      + '<div class="tpl-meta">' + (p.city||'—') + ' · ' + (p.units||0) + ' und.</div>'
      + '<div class="tpl-bar-wrap"><div class="tpl-bar-fill" style="width:' + seal + '%;background:' + barColor + '"></div></div>'
      + '<div class="tpl-pct" style="color:' + barColor + '">' + seal + '% sellado</div>'
      + (tasks.length ? '<div class="tpl-task-count">' + tasks.length + ' tarea' + (tasks.length!==1?'s':'') + '</div>' : '')
      + '</div>';
  }).join('');

  // Populate dropdown
  populateTafPropDropdown();
  // Auto-select first
  if(!taskSelectedPropId && props.length) selectTaskProp(String(props[0].id));
  else if(taskSelectedPropId) renderTaskDetail(taskSelectedPropId);
}

function selectTaskProp(id) {
  taskSelectedPropId = String(id);
  // Update active state usando data-pid
  document.querySelectorAll('.tpl-card').forEach(c => {
    if(String(c.dataset.pid) === String(id)) c.classList.add('tpl-active');
    else c.classList.remove('tpl-active');
  });
  // Sync dropdown
  const sel = $('tafPropSelect');
  if(sel) sel.value = String(id);
  // Show detail panel
  const empty = $('tasksEmptyState'); if(empty) empty.style.display='none';
  const detail = $('tasksPropDetail'); if(detail) detail.style.display='block';
  renderTaskDetail(id);
}

function selectTaskPropFromDropdown(id) {
  if(!id) return;
  selectTaskProp(String(id));
}

function populateTafPropDropdown() {
  const sel = $('tafPropSelect');
  if(!sel) return;
  const props = state.properties;
  sel.innerHTML = '<option value="">\u2014 Selecciona propiedad \u2014</option>'
    + props.map(p => {
        const seal = getCombinedSealPct(p);
        const tasks = propTasks[String(p.id)] || [];
        const selected = String(p.id) === String(taskSelectedPropId) ? ' selected' : '';
        return '<option value="' + p.id + '"' + selected + '>'
          + p.name + ' \u2014 ' + seal + '% \u00b7 ' + tasks.length + ' tarea' + (tasks.length !== 1 ? 's' : '')
          + '</option>';
      }).join('');
}

function renderTaskDetail(id) {
  const p = state.properties.find(x => String(x.id) === String(id));
  if(!p) return;

  const { modData, avgPct, avgGapPct } = calcAbismo(p);
  const taskSeal = getTaskSealPct(id);
  const combined = getCombinedSealPct(p);
  const chasmColor = combined>=80?'#00b460':combined>=50?'#e67e00':'#e03030';

  // ── Adoption curve ──
  if($('tacPropName')) $('tacPropName').textContent = p.name;
  if($('tacChasmPct')) {
    $('tacChasmPct').textContent = combined + '%';
    $('tacChasmPct').style.color = chasmColor;
  }

  const tacBars = $('tacBars');
  if(tacBars) {
    tacBars.innerHTML = TASK_SEGS.map(seg => {
      if(seg === null) {
        const remaining = 100 - combined;
        return '<div class="tac-gap-col">'
          + '<div class="tac-gap-track">'
          + '<div class="tac-gap-fill" style="height:' + combined + '%;background:' + chasmColor + '"></div>'
          + '</div>'
          + '<div class="tac-gap-word">Abismo</div>'
          + '<div class="tac-gap-pct">' + remaining + '%</div>'
          + '</div>';
      }
      return '<div class="tac-seg" style="cursor:pointer" onclick="selectZoneFromCurve(' + JSON.stringify(seg.name) + ')" title="Agregar tarea para ' + seg.name + '">'
        + '<div class="tac-bar" style="height:' + seg.h + ';background:' + seg.color + ';transition:opacity .2s" onmouseover="this.style.opacity=.75" onmouseout="this.style.opacity=1"></div>'
        + '<div class="tac-label" style="color:' + seg.color + '">' + seg.name + '</div>'
        + '</div>';
    }).join('');
  }

  // ── Stacked progress bar (modules + tasks) ──
  const modsPct = Math.round(avgPct * 0.2);
  const tasksPct = Math.round(taskSeal * 0.8);
  if($('tacSealPct')) { $('tacSealPct').textContent = combined + '%'; $('tacSealPct').style.color = chasmColor; }
  // Checkmark y mensaje de estado
  const sealCheck = $('tacSealCheck');
  const sealMsg   = $('tacSealMsg');
  if(sealCheck) sealCheck.style.display = combined >= 80 ? 'inline' : 'none';
  if(sealMsg) {
    if(combined >= 100)      { sealMsg.style.display='block'; sealMsg.textContent='🎉 Abismo sellado'; sealMsg.style.color='#00b460'; }
    else if(combined >= 80)  { sealMsg.style.display='block'; sealMsg.textContent='✅ Meta alcanzada'; sealMsg.style.color='#00b460'; }
    else if(combined >= 50)  { sealMsg.style.display='block'; sealMsg.textContent='⚡ En progreso — falta '+(100-combined)+'%'; sealMsg.style.color='#e67e00'; }
    else                     { sealMsg.style.display='block'; sealMsg.textContent='🔴 Crítico — falta '+(100-combined)+'%'; sealMsg.style.color='#e03030'; }
  }
  setTimeout(() => {
    if($('tacBarMods')) $('tacBarMods').style.width = modsPct + '%';
    if($('tacBarTasks')) $('tacBarTasks').style.width = tasksPct + '%';
  }, 80);

  // ── Task list ──
  renderTaskList(id);
}

function renderTaskList(propId) {
  const el = $('tasksListWrap');
  if(!el) return;
  const tasks = propTasks[String(propId)] || [];
  const totalW = tasks.reduce((s,t) => s + t.weight, 0);
  const done = tasks.filter(t => t.progress === 100).length;

  if(!tasks.length) {
    el.innerHTML = '<div style="background:var(--surface);border:2px dashed var(--border);border-radius:14px;padding:32px;text-align:center"><div style="font-size:24px;margin-bottom:8px">📋</div><div style="font-size:13px;font-weight:600;color:var(--text-muted)">Sin tareas — agrega la primera arriba</div></div>';
    return;
  }

  const hdrCol = done === tasks.length && done > 0 ? '#00b460' : 'var(--text-muted)';
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.7px">${tasks.length} tarea${tasks.length!==1?'s':''} · Peso total: ${totalW}</span>
    <span style="font-size:12px;font-weight:800;color:${hdrCol}">${done===tasks.length&&done>0?'✅ ':''}${done}/${tasks.length} completadas</span>
  </div>`
  + tasks.map(t => {
    const isDone = t.progress === 100;
    const bc = t.progress===100?'#00b460':t.progress>=50?'#e67e00':'#820ad1';
    const zoneCols = {Innovadores:'#34d399',Visionarios:'#84cc16','Pragmáticos':'#fbbf24',Conservadores:'#fb7185','Escépticos':'#94a3b8'};
    const zoneCol = zoneCols[t.category] || 'var(--domo)';
    const maxContrib = totalW > 0 ? Math.round((t.weight / totalW) * 100 * 0.8) : 0;
    const curContrib = Math.round(maxContrib * t.progress / 100);
    const sid = String(t.id);
    return `<div class="task-item-card${isDone?' tic-done':''}" id="tic-${sid}" style="border-left:3px solid ${zoneCol}">
      <div class="tic-top" style="margin-bottom:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
            <span class="tic-cat-badge" style="background:${zoneCol}20;border-color:${zoneCol};color:${zoneCol}">${t.category}</span>
            <span class="tic-weight-pill">Peso ${t.weight}</span>
          </div>
          <div class="tic-text" style="${isDone?'text-decoration:line-through;color:var(--text-muted)':''}">${t.text}</div>
        </div>
        <button class="tic-del" data-pid="${propId}" data-tid="${sid}" onclick="deleteTaskItem(this)" style="flex-shrink:0">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button onclick="stepTaskProgress('${propId}',${sid},-10)" style="width:28px;height:28px;border-radius:7px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;font-size:16px;font-weight:800;color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;justify-content:center">−</button>
        <div style="flex:1;height:10px;border-radius:5px;background:var(--surface2);overflow:hidden">
          <div id="ticbar-${sid}" style="height:100%;width:${t.progress}%;background:${bc};border-radius:5px;transition:width .4s ease"></div>
        </div>
        <button onclick="stepTaskProgress('${propId}',${sid},10)" style="width:28px;height:28px;border-radius:7px;border:1.5px solid var(--domo);background:rgba(130,10,209,.08);cursor:pointer;font-size:16px;font-weight:800;color:var(--domo);flex-shrink:0;display:flex;align-items:center;justify-content:center">+</button>
        <div id="ticpct-${sid}" style="font-size:13px;font-weight:800;color:${bc};min-width:38px;text-align:right">${t.progress}%</div>
      </div>
      <div class="tic-abismo-row">
        <span class="tic-abismo-label">Abismo</span>
        <div class="tic-abismo-bar-wrap">
          <div class="tic-abismo-fill" id="ticabismo-${sid}" style="width:${curContrib}%;background:${bc}"></div>
        </div>
        <span class="tic-contrib-label" id="ticcontrib-${sid}" style="color:${bc}">${isDone?'+'+maxContrib+'%':curContrib>0?'+'+curContrib+'%':'+0%/+'+maxContrib+'%'}</span>
      </div>
    </div>`;
  }).join('');
}

async function addTaskForProp() {
  const id = taskSelectedPropId;
  if(!id) { showToast('Selecciona una propiedad','error'); return; }
  const text = ($('tafTaskText')||{}).value?.trim();
  if(!text) { showToast('Escribe una descripción','error'); return; }
  const weight = parseInt(($('tafWeight')||{}).value) || 5;
  const newTask = { id: Date.now(), category: taskCat, text, weight, progress: 0 };
  if (sb) {
    const saved = await saveTaskToSB(id, newTask);
    if (saved) newTask.id = saved.id;
  }
  if (!propTasks[id]) propTasks[id] = [];
  propTasks[id].push(newTask);
  if($('tafTaskText')) $('tafTaskText').value = '';
  renderTasksSection();
  showToast('✅ Tarea agregada','success');
}

function updateTaskItemProgress(propId, taskId, val) {
  const tasks = propTasks[String(propId)];
  if(!tasks) return;
  const t = tasks.find(x => x.id === taskId);
  if(!t) return;
  t.progress = val;
  updateTaskProgressSB(t.id,t.progress);
  // Update UI inline (no full re-render for smoothness)
  renderTaskList(propId);
  renderTaskDetail(propId);
  renderTasksSection();
}

function deleteTaskItem(btn) {
  const propId = btn.dataset.pid;
  const taskId = parseInt(btn.dataset.tid);
  if(!propTasks[propId]) return;
  propTasks[propId] = propTasks[propId].filter(x => x.id !== taskId);
  deleteTaskSB(taskId);
  renderTasksSection();
  showToast('Tarea eliminada','success');
}


// ══════════════════════════════════════════════
// NAV-LEVEL ABISMO SECTIONS (sidebar items)
// ══════════════════════════════════════════════
let navRoadCategory = 'Administradores';
let navSelectedPropId = null;
let navRoadSelectedPropId = null;

function renderStrategyFromNav(view) {
  // Render into the independent sec-abismo-* containers
  if(view === 'cards') {
    renderStrategyGlobalMetrics2();
    renderAbismoCards2();
  }
  if(view === 'heat') renderAbismoHeatMap2();
  if(view === 'chart') renderAbismoCharts2();
  if(view === 'prop') renderNavPropChasmView();
}

function setStratPhaseNav(f, el, suffix) {
  strategyPhaseFilter = f;
  document.querySelectorAll('#strategyPhaseTabs' + suffix + ' .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAbismoCards2();
}

function renderStrategyGlobalMetrics2() {
  const el = $('strategyGlobalMetrics2');
  if(!el) return;
  // Re-use same logic as main
  const props = getStrategyProps();
  const total = props.length;
  const globalAvg = total ? Math.round(props.reduce((s,p)=>s+getPropProgress(p),0)/total) : 0;
  const abismoGlobal = 100 - globalAvg;
  const critical = props.filter(p=>getPropProgress(p)<50).length;
  const onTarget = props.filter(p=>getPropProgress(p)>=80).length;
  const m = [
    {val:globalAvg+'%',lbl:'Avance Global',sub:'',color:globalAvg>=80?'#00b460':globalAvg>=50?'#e67e00':'#e03030'},
    {val:abismoGlobal+'%',lbl:'Abismo Global',sub:abismoGlobal>30?'⚡ Brecha significativa':'🟢 Brecha mínima',color:'#e03030'},
    {val:String(critical),lbl:'Propiedades Críticas',sub:critical?'Requieren atención urgente':'Sin críticas',color:'#e03030'},
    {val:String(onTarget),lbl:'En Meta (≥80%)',sub:Math.round(onTarget/(total||1)*100)+'% del portafolio',color:'#00b460'},
  ];
  el.innerHTML = m.map(x=>'<div class="sh-metric"><div class="sh-metric-val" style="color:'+x.color+'">'+x.val+'</div><div class="sh-metric-lbl">'+x.lbl+'</div><div class="sh-metric-sub" style="color:'+x.color+'">'+x.sub+'</div></div>').join('');
}

function renderAbismoCards2() {
  const el = $('abismoGrid2'); if(!el) return;
  const props = getStrategyProps();
  el.innerHTML = props.length ? props.map(p => buildAbismoCard(p)).join('') : '<div style="color:var(--text-muted);padding:40px;text-align:center">Sin propiedades</div>';
  if(props.length) props.forEach(p => renderAbismoTaskBadge(p.id));
}

function renderAbismoHeatMap2() {
  const el = $('abismoHeatMap2'); if(!el) return;
  // Call existing heat map builder targeting new element
  const props = getStrategyProps();
  buildHeatMapInto(el, props);
}

function renderAbismoCharts2() {
  const props = getStrategyProps();
  renderAbismoChartsInto(props, '2');
}

// ── Nav prop chasm view ──
function renderNavPropChasmView() {
  const props = state.properties;
  ['navPropSelectorTabs','navPropSelectorTabsRoad'].forEach(tabsId => {
    const el = $(tabsId); if(!el) return;
    el.innerHTML = props.map(p => {
      const isSelEst = tabsId==='navPropSelectorTabs' && String(navSelectedPropId)===String(p.id);
      const isSelRoad = tabsId==='navPropSelectorTabsRoad' && String(navRoadSelectedPropId)===String(p.id);
      const isSel = isSelEst || isSelRoad;
      const fn = tabsId==='navPropSelectorTabs'
        ? 'navSelectPropChasm('+JSON.stringify(String(p.id))+')'
        : 'navSelectRoadProp('+JSON.stringify(String(p.id))+')';
      return '<div class="filter-tab'+(isSel?' active':'')+'" onclick="'+fn+'">'+(p.name.length>18?p.name.substring(0,18)+'…':p.name)+'</div>';
    }).join('') || '<span style="font-size:clamp(10px,.9vw,12px);color:var(--text-muted)">Sin propiedades</span>';
  });
  if(!navSelectedPropId && props.length) navSelectPropChasm(String(props[0].id));
  if(!navRoadSelectedPropId && props.length) navSelectRoadProp(String(props[0].id));
}

function setNavPropSubTab(tab) {
  $('navPropSubStrategia').style.display = tab==='estrategia'?'block':'none';
  $('navPropSubRoadmap').style.display = tab==='roadmap'?'block':'none';
  $('navPropSubTabEst').className = 'prop-subtab'+(tab==='estrategia'?' prop-subtab-active':'');
  $('navPropSubTabRoad').className = 'prop-subtab'+(tab==='roadmap'?' prop-subtab-active':'');
  if(tab==='estrategia' && navSelectedPropId) navRenderPropStratTab();
  if(tab==='roadmap' && navRoadSelectedPropId) navRenderRoadmapTab();
}

function navSelectPropChasm(id) {
  navSelectedPropId = String(id);
  buildPropDropdown('navPropDropdown', state.properties, navSelectedPropId);
  navRenderPropStratTab();
}

function navRenderPropStratTab() {
  const p = state.properties.find(x=>String(x.id)===String(navSelectedPropId));
  if(!p) return;
  const {modData,avgPct,avgGapPct} = calcAbismo(p);
  if($('navPropChasmTitle')) $('navPropChasmTitle').textContent = p.name+(p.city?' · '+p.city:'');

  // Adoption curve (reuse same logic with nav- prefixed elements)
  const wrap = $('navAdoptionCurve'); if(!wrap) return;
  const tasks = propTasks[String(p.id)]||[];
  const totalW = tasks.reduce((s,t)=>s+t.weight,0);
  const doneW = tasks.reduce((s,t)=>s+(t.progress/100)*t.weight,0);
  const taskSeal = totalW>0?Math.round((doneW/totalW)*100):0;
  const combinedSeal = Math.min(100,Math.round(avgPct*0.8+taskSeal*0.2));
  const chasmRemaining = 100-combinedSeal;
  const chasmColor = combinedSeal>=80?'#00b460':combinedSeal>=50?'#e67e00':'#e03030';

  const succEl = $('navAdoptionSuccessPct');
  if(succEl){succEl.textContent=combinedSeal+'%';succEl.style.color=chasmColor;}

  const SEGS=[
    {name:'Innovadores',color:'#34d399',h:'90px'},
    {name:'Visionarios',color:'#84cc16',h:'140px'},
    null,
    {name:'Pragmáticos',color:'#fbbf24',h:'210px'},
    {name:'Conservadores',color:'#fb7185',h:'168px'},
    {name:'Escépticos',color:'#94a3b8',h:'88px'},
  ];
  wrap.innerHTML = SEGS.map(seg=>{
    if(seg===null) return '<div class="ab-gap">'
      +'<div class="ab-gap-track"><div class="ab-gap-fill" style="height:'+combinedSeal+'%;background:'+chasmColor+'"></div></div>'
      +'<div class="ab-gap-info"><div class="ab-gap-word">Abismo</div><div class="ab-gap-pct">'+chasmRemaining+'%</div></div>'
      +'</div>';
    return '<div class="ab-seg"><div class="ab-bar" style="height:'+seg.h+';background:'+seg.color+'"></div>'
      +'<div class="ab-label" style="color:'+seg.color+'">'+seg.name+'</div></div>';
  }).join('');

  const meter=$('navChasmMeter');if(meter)meter.style.display='flex';
  const fill=$('navChasmMeterFill');if(fill)setTimeout(()=>{fill.style.width=combinedSeal+'%';},80);
  const pctLbl=$('navChasmPctLabel');if(pctLbl)pctLbl.textContent=combinedSeal+'% sellado · '+chasmRemaining+'% restante';

  // Hitos
  const hitosEl=$('navHitosGrid');
  const titleEl=$('navHitosTitle');
  const badgeEl=$('navHitosPropBadge');
  if(titleEl)titleEl.textContent='Hitos de '+p.name;
  if(badgeEl)badgeEl.textContent=(p.modules||[]).length+' módulos activos';
  if(hitosEl){
    const items=[];
    modData.filter(d=>d.isActive).forEach(d=>{
      const m=MODULES.find(x=>x.id===d.mid);
      items.push({cat:m.icon+' '+m.label,text:m.label+' — '+d.val+'/'+d.meta+' '+m.unit,progress:d.pct});
    });
    (propTasks[String(p.id)]||[]).forEach(t=>items.push({cat:t.category,text:t.text,progress:t.progress}));
    hitosEl.innerHTML=items.length?items.map(item=>{
      const bc=item.progress===100?'#00e57c':item.progress>=50?'#ffcc00':'#820ad1';
      return '<div class="hito-card"><span class="hito-cat">'+item.cat+'</span>'
        +'<div class="hito-text">'+item.text+'</div>'
        +'<div class="hito-bar-wrap"><div class="hito-bar-fill" style="width:'+item.progress+'%;background:'+bc+'"></div></div>'
        +'<div class="hito-footer"><span class="hito-pct" style="color:'+bc+'">'+item.progress+'%</span>'
        +'<span class="hito-status '+(item.progress===100?'hito-done':'hito-pending')+'">'+(item.progress===100?'✓ Meta':'En progreso')+'</span></div></div>';
    }).join(''):'<div style="color:rgba(255,255,255,.35);font-size:clamp(10px,.95vw,13px);padding:20px">Sin módulos activos.</div>';
  }

  // KPIs
  const kpiEl=$('navPropChasmKpis');
  if(kpiEl){
    const lvlColor=avgPct>=80?'#00b460':avgPct>=50?'#e67e00':'#e03030';
    const taskSealFull=totalW>0?Math.round((tasks.filter(t=>t.progress===100).reduce((s,t)=>s+t.weight,0)/totalW)*100):0;
    kpiEl.innerHTML='<div class="pck-grid">'
      +'<div class="pck-item"><div class="pck-val" style="color:'+lvlColor+'">'+avgPct+'%</div><div class="pck-label">Avance módulos</div></div>'
      +'<div class="pck-item"><div class="pck-val" style="color:#e03030">'+avgGapPct+'%</div><div class="pck-label">Abismo restante</div></div>'
      +'<div class="pck-item"><div class="pck-val" style="color:var(--domo)">'+(p.modules||[]).length+'</div><div class="pck-label">Módulos activos</div></div>'
      +'<div class="pck-item"><div class="pck-val" style="color:#00b460">'+combinedSeal+'%</div><div class="pck-label">Cierre combinado</div></div>'
      +'</div>';
  }
}

function navSelectRoadProp(id) {
  navRoadSelectedPropId = String(id);
  buildPropDropdown('navPropDropdownRoad', state.properties, navRoadSelectedPropId);
  navRenderRoadmapTab();
}

function navRenderRoadmapTab() {
  const id = navRoadSelectedPropId;
  const p = state.properties.find(x=>String(x.id)===String(id)); if(!p) return;
  if($('navRoadPropName')) $('navRoadPropName').textContent = p.name;
  const sealPct = getRoadSealPct(id);
  const color = sealPct>=80?'#00b460':sealPct>=50?'#e67e00':'#820ad1';
  if($('navRoadChasmPct')){$('navRoadChasmPct').textContent=sealPct+'%';$('navRoadChasmPct').style.color=color;}
  const fill=$('navChasmGapFill');if(fill)setTimeout(()=>{fill.style.height=sealPct+'%';},80);
  const rem=$('navChasmGapRemaining');if(rem)rem.style.height=(100-sealPct)+'%';
  const pct=$('navChasmGapPct');if(pct){pct.textContent=sealPct+'% sellado';pct.style.color=color;}
  // Bridges
  const bridgesEl=$('navRoadTaskBridges');
  const tasks=propTasks[id]||[];
  const totalW=tasks.reduce((s,t)=>s+t.weight,0);
  if(bridgesEl){
    bridgesEl.innerHTML=tasks.length?tasks.map(t=>{
      const share=totalW>0?Math.round((t.weight/totalW)*100):0;
      const contrib=Math.round(share*(t.progress/100));
      const bc=t.progress===100?'#00b460':t.progress>=50?'#e67e00':'var(--domo)';
      return '<div class="task-bridge-row"><div class="tbr-name" title="'+t.text+'">'+t.text+'</div>'
        +'<div class="tbr-weight">×'+t.weight+'</div>'
        +'<div class="tbr-bar-wrap"><div class="tbr-bar-fill" style="width:'+t.progress+'%;background:'+bc+'"></div></div>'
        +'<div class="tbr-pct" style="color:'+bc+'">+'+contrib+'%</div></div>';
    }).join(''):'<div style="font-size:clamp(10px,.9vw,12px);color:var(--text-muted);padding:8px 0">Sin tareas asignadas.</div>';
  }
  // Task list
  const listEl=$('navRoadTaskList');
  if(listEl){
    listEl.innerHTML=tasks.length?tasks.map(t=>{
      const bc=t.progress===100?'#00b460':t.progress>=50?'#e67e00':'#820ad1';
      return '<div class="road-task-card'+(t.progress===100?' rtc-done':'')+'">'
        +'<div class="rtc-top"><span class="rtc-cat">'+t.category+'</span><div class="rtc-text">'+t.text+'</div>'
        +'<div class="rtc-weight">Peso: '+t.weight+'</div>'
        +'<button class="tic-del" data-pid="'+id+'" data-tid="'+t.id+'" onclick="deleteRoadTask(this.dataset.pid,parseInt(this.dataset.tid));navRenderRoadmapTab();">✕</button></div>'
        +'<div class="rtc-progress-row"><span style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted);font-weight:700;min-width:60px">PROGRESO</span>'
        +'<div class="rtc-bar-wrap"><div class="rtc-bar-fill" style="width:'+t.progress+'%;background:'+bc+'"></div></div>'
        +'<input type="range" min="0" max="100" value="'+t.progress+'" style="width:80px;accent-color:'+bc+'" '
        +'oninput="updateRoadTaskProgress('+JSON.stringify(id)+','+t.id+',this.value);navRenderRoadmapTab();" />'
        +'<div class="rtc-pct-lbl" style="color:'+bc+'">'+t.progress+'%</div></div></div>';
    }).join(''):'<div class="prop-chasm-chart-card" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">📋 Agrega tareas para comenzar.</div>';
  }
}

function setNavRoadCategory(cat, el) {
  navRoadCategory = cat;
  document.querySelectorAll('#navRoadCategoryBtns .road-cat-btn').forEach(b => b.className='road-cat-btn');
  el.className = 'road-cat-btn road-cat-active';
}

async function navAddRoadTask() {
  const id = navRoadSelectedPropId;
  if(!id){showToast('Selecciona una propiedad','error');return;}
  const text=($('navRoadNewTaskText')||{}).value?.trim();
  if(!text){showToast('Escribe una descripción','error');return;}
  const weight=parseInt(($('navRoadTaskWeight')||{}).value)||5;
  if(!propTasks[id])propTasks[id]=[];
  const newTask={id:Date.now(),category:navRoadCategory,text,weight,progress:0};
  if(sb){const saved=await saveTaskToSB(id,newTask);if(saved)newTask.id=saved.id;}
  propTasks[id].push(newTask);
  if($('navRoadNewTaskText'))$('navRoadNewTaskText').value='';
  navRenderRoadmapTab();
  showToast('✅ Tarea agregada','success');
}

// Stubs for chart helpers (reuse existing render functions with new canvas ids)
function buildHeatMapInto(el, props) {
  // Build same heat map table as renderAbismoHeatMap but into arbitrary element
  if(!props.length){el.innerHTML='<div style="color:var(--text-muted);padding:40px;text-align:center">Sin propiedades</div>';return;}
  const cols = MODULES.map(m=>m.icon+' '+m.label);
  let html='<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>'
    +'<th style="padding:8px 12px;font-size:clamp(8px,.8vw,10px);font-weight:700;color:var(--text-muted);text-align:left;white-space:nowrap;background:var(--surface2);border:1px solid var(--border)">Propiedad</th>'
    +cols.map(c=>'<th style="padding:8px 10px;font-size:clamp(8px,.75vw,9px);font-weight:700;color:var(--text-muted);text-align:center;white-space:nowrap;background:var(--surface2);border:1px solid var(--border)">'+c+'</th>').join('')
    +'</tr></thead><tbody>'
    +props.map(p=>{
      const {modData}=calcAbismo(p);
      return '<tr>'
        +'<td style="padding:8px 12px;font-size:clamp(10px,.9vw,12px);font-weight:700;white-space:nowrap;border:1px solid var(--border)">'+p.name+'</td>'
        +MODULES.map(m=>{
          const d=modData.find(x=>x.mid===m.id);
          if(!d||!d.isActive) return '<td style="padding:6px 10px;text-align:center;background:var(--surface3);border:1px solid var(--border)"><span style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted)">—</span></td>';
          const c=d.pct>=80?'rgba(0,180,100,.25)':d.pct>=50?'rgba(230,126,0,.2)':'rgba(224,48,48,.2)';
          const fc=d.pct>=80?'#00b460':d.pct>=50?'#e67e00':'#e03030';
          return '<td style="padding:6px 10px;text-align:center;background:'+c+';border:1px solid var(--border)"><span style="font-size:clamp(9px,.85vw,11px);font-weight:700;color:'+fc+'">'+d.pct+'%</span></td>';
        }).join('')+'</tr>';
    }).join('')+'</tbody></table></div>';
  el.innerHTML=html;
}

function renderAbismoChartsInto(props, suffix) {
  const dk=theme==='dark', tc=dk?'#9287b8':'#7c6fa0', gc=dk?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';
  const labels=props.map(p=>p.name.length>14?p.name.substring(0,14)+'…':p.name);
  const avances=props.map(p=>getPropProgress(p));
  const abismos=avances.map(v=>100-v);
  const barsColors=avances.map(v=>v>=80?'rgba(0,180,100,.8)':v>=50?'rgba(230,126,0,.8)':'rgba(130,10,209,.8)');

  destroyChart('chartAbismoProps'+suffix);
  const c1=$('chartAbismoProps'+suffix);
  if(c1){charts['chartAbismoProps'+suffix]=new Chart(c1.getContext('2d'),{type:'bar',data:{labels,datasets:[{label:'Avance %',data:avances,backgroundColor:barsColors,borderRadius:5},{label:'Abismo %',data:abismos,backgroundColor:'rgba(100,100,120,.12)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}},scales:{x:{stacked:true,ticks:{color:tc,font:{family:'Montserrat',size:9}},grid:{color:gc}},y:{stacked:true,max:100,ticks:{color:tc,font:{family:'Montserrat',size:10}},grid:{color:gc}}}}});}

  const modPcts=MODULES.map(m=>{const a=props.filter(p=>(p.modules||[]).includes(m.id));return a.length?Math.round(a.reduce((s,p)=>s+calcPct(m.id,(p.module_values||{})[m.id]||0,p.units||50),0)/a.length):0;});
  destroyChart('chartAbismoModules'+suffix);
  const c2=$('chartAbismoModules'+suffix);
  if(c2){charts['chartAbismoModules'+suffix]=new Chart(c2.getContext('2d'),{type:'bar',data:{labels:MODULES.map(m=>m.icon+' '+m.label),datasets:[{label:'Cumplimiento %',data:modPcts,backgroundColor:modPcts.map(v=>v>=80?'rgba(0,180,100,.8)':v>=50?'rgba(230,126,0,.8)':'rgba(130,10,209,.8)'),borderRadius:5},{label:'Abismo %',data:modPcts.map(v=>100-v),backgroundColor:'rgba(100,100,120,.12)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}},scales:{x:{stacked:true,ticks:{color:tc,font:{family:'Montserrat',size:9}},grid:{color:gc}},y:{stacked:true,max:100,ticks:{color:tc,font:{family:'Montserrat',size:10}},grid:{color:gc}}}}});}

  const g=avances.filter(v=>v>=80).length,w=avances.filter(v=>v>=50&&v<80).length,cr=avances.filter(v=>v<50).length;
  destroyChart('chartAbismoDist'+suffix);
  const c3=$('chartAbismoDist'+suffix);
  if(c3){charts['chartAbismoDist'+suffix]=new Chart(c3.getContext('2d'),{type:'doughnut',data:{labels:['Meta ≥80%','Alerta 50-79%','Crítico <50%'],datasets:[{data:[g,w,cr],backgroundColor:['#00b460','#e67e00','#e03030'],borderWidth:0,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}}}});}

  destroyChart('chartAbismoRadar'+suffix);
  const c4=$('chartAbismoRadar'+suffix);
  if(c4){charts['chartAbismoRadar'+suffix]=new Chart(c4.getContext('2d'),{type:'radar',data:{labels:MODULES.map(m=>m.icon+' '+m.label),datasets:[{label:'Promedio',data:modPcts,backgroundColor:'rgba(130,10,209,.15)',borderColor:'#820ad1',pointBackgroundColor:'#820ad1',borderWidth:2,pointRadius:3},{label:'Meta',data:MODULES.map(()=>100),backgroundColor:'rgba(0,180,100,.05)',borderColor:'rgba(0,180,100,.4)',borderWidth:1,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:10}}}}});}
}


// ══ AVANCE LINEAL JS ══
// ══════════════════════════════════════════════════════
//  AVANCE LINEAL — LÓGICA COMPLETA
// ══════════════════════════════════════════════════════

// State for lineal section
let linealPropId        = null;  // overview tab
let linealModPropId     = null;  // module tab
let linealModId         = 'acceso'; // selected module
let linealCmpPropId     = null;  // compare tab
let linealSemPropId     = null;  // semáforo tab
let linealTab           = 'overview';

// ── Week calculation helpers ──────────────────────────

/**
 * Returns the current week number (1–8) based on a property's entry_date.
 * Week 1 = days 1–7, Week 2 = days 8–14, etc.
 * Returns null if no entry_date or entry_date is in the future.
 */

function getDaysFromEntry(p) {
  if(!p.entry_date) return p.days || 0;
  const start = new Date(p.entry_date);
  if(isNaN(start.getTime())) return p.days || 0;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const t = new Date(); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.max(0, Math.floor((today - s) / 86400000));
}
function getPropWeek(p) {
  const d = getDaysFromEntry(p);
  return Math.min(8, Math.max(1, Math.floor(d / 7) + 1));
}
function calcCurrentWeek(entryDate) {
  if(!entryDate) return null;
  const start = new Date(entryDate);
  if(isNaN(start.getTime())) return null;
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  if(diffDays < 0) return null;
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(8, Math.max(1, week));
}

/**
 * Expected cumulative % for week W (linear: 10%/week, max 80%).
 */
function expectedPctForWeek(week) {
  return Math.min(80, week * 10);
}

/**
 * Simulates weekly values for a module/property.
 * Since we only have the current value, we distribute it progressively.
 * Week W value = current * (W / currentWeek), capped at current.
 */
function simulateWeeklyValues(prop, mid) {
  const curWeek = calcCurrentWeek(prop.entry_date) || 1;
  const mv       = prop.module_values || {};
  const curVal   = mv[mid] || 0;
  const units    = prop.units || 50;
  const meta     = calcMeta(mid, units);

  // Build 8-week array of simulated values
  const vals = [];
  for(let w = 1; w <= 8; w++) {
    if(w > curWeek) {
      vals.push(null); // future weeks unknown
    } else if(curWeek === 0) {
      vals.push(0);
    } else {
      // Simple linear interpolation from 0 to curVal over weeks 1..curWeek
      // Add slight S-curve: slow start, faster middle, plateau end
      const progress = w / curWeek;
      // S-curve factor
      const sCurve = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const simVal = Math.round(curVal * sCurve);
      vals.push(Math.max(0, simVal));
    }
  }
  return { vals, curWeek, meta, curVal };
}

/**
 * Get real % for a specific week (simulated).
 */
function realPctForWeek(prop, mid, week) {
  const { vals, meta } = simulateWeeklyValues(prop, mid);
  const val = vals[week - 1];
  if(val === null || val === undefined) return null;
  if(!meta || meta <= 0) return 0;
  return Math.min(100, Math.round((val / meta) * 100));
}

/**
 * Compliance index: real% / expected% × 100.
 * Returns null if real% is null (future).
 */
function complianceIndex(realPct, expectedPct) {
  if(realPct === null || realPct === undefined) return null;
  if(!expectedPct || expectedPct <= 0) return realPct > 0 ? 999 : 100;
  return Math.round((realPct / expectedPct) * 100);
}

/**
 * Average real % across all active modules for a property in a given week.
 */
function propRealPctForWeek(prop, week) {
  const mods = prop.modules || [];
  if(!mods.length) return 0;
  const pcts = mods.map(mid => realPctForWeek(prop, mid, week)).filter(v => v !== null);
  if(!pcts.length) return 0;
  return Math.round(pcts.reduce((s,v) => s+v, 0) / pcts.length);
}

// ── Section tab switcher ─────────────────────────────
function setLinealTab(tab, el) {
  linealTab = tab;
  ['overview','module','compare','semaforo'].forEach(t => {
    const cap = t.charAt(0).toUpperCase() + t.slice(1);
    const btn = $('linealTab' + {overview:1,module:2,compare:3,semaforo:4}[t]);
    if(btn) btn.classList.remove('strat-tab-active');
    const view = $('linealView' + cap);
    if(view) view.style.display = 'none';
  });
  el.classList.add('strat-tab-active');
  $('linealView' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
  if(tab === 'overview')  renderLinealOverview();
  if(tab === 'module')    renderLinealModuleTab();
  if(tab === 'compare')   renderCompareView();
  if(tab === 'semaforo')  renderSemaforoView();
}

// ── Main render entry ────────────────────────────────
function renderLinealSection() {
  const props = state.properties;
  // Init prop IDs
  if(!linealPropId    && props.length) linealPropId    = String(props[0].id);
  if(!linealModPropId && props.length) linealModPropId = String(props[0].id);
  if(!linealCmpPropId && props.length) linealCmpPropId = String(props[0].id);
  if(!linealSemPropId && props.length) linealSemPropId = String(props[0].id);

  renderLinealGlobalMetrics();

  // Build all prop dropdowns
  buildPropDropdownGeneric('linealPropDrop',    props, linealPropId,    p => { linealPropId = p; renderLinealOverview(); });
  buildPropDropdownGeneric('linealModPropDrop', props, linealModPropId, p => { linealModPropId = p; renderLinealModuleTab(); });
  buildPropDropdownGeneric('linealCmpPropDrop', props, linealCmpPropId, p => { linealCmpPropId = p; renderCompareView(); });
  buildPropDropdownGeneric('linealSemPropDrop', props, linealSemPropId, p => { linealSemPropId = p; renderSemaforoView(); });

  // Build module dropdown
  buildModDropdown();

  // Render active tab
  if(linealTab === 'overview')  renderLinealOverview();
  if(linealTab === 'module')    renderLinealModuleTab();
  if(linealTab === 'compare')   renderCompareView();
  if(linealTab === 'semaforo')  renderSemaforoView();
}

// Generic dropdown builder with callback
function buildPropDropdownGeneric(id, props, activeId, onChangeFn) {
  const sel = $(id); if(!sel) return;
  sel.innerHTML = props.map(p =>
    '<option value="' + p.id + '"' + (String(p.id)===String(activeId)?' selected':'') + '>'
    + p.name + (p.city?' · '+p.city:'') + '</option>'
  ).join('') || '<option>Sin propiedades</option>';
  sel.onchange = function() { onChangeFn(String(this.value)); };
}

function buildModDropdown() {
  const prop = state.properties.find(p => String(p.id) === String(linealModPropId));
  const mods = (prop ? prop.modules : MODULES.map(m => m.id)) || [];
  const sel = $('linealModDrop'); if(!sel) return;
  const available = MODULES.filter(m => mods.includes(m.id));
  if(!available.length) {
    sel.innerHTML = '<option>Sin módulos activos</option>';
    return;
  }
  sel.innerHTML = available.map(m =>
    '<option value="' + m.id + '"' + (m.id === linealModId ? ' selected' : '') + '>'
    + m.icon + ' ' + m.label + '</option>'
  ).join('');
  sel.onchange = function() { linealModId = this.value; renderLinealModuleTab(); };
  if(!mods.includes(linealModId)) linealModId = mods[0];
}

function selectLinealProp(id)    { linealPropId = id;    buildPropDropdownGeneric('linealPropDrop', state.properties, id, p=>{ linealPropId=p; renderLinealOverview(); }); renderLinealOverview(); }
function selectLinealModProp(id) { linealModPropId = id; buildModDropdown(); renderLinealModuleTab(); }
function selectLinealCmpProp(id) { linealCmpPropId = id; renderCompareView(); }
function selectLinealSemProp(id) { linealSemPropId = id; renderSemaforoView(); }
function selectLinealMod(id)     { linealModId = id;     renderLinealModuleTab(); }

function navModStep(dir) {
  const sel = $('linealModDrop'); if(!sel||!sel.options.length) return;
  const next = (sel.selectedIndex + dir + sel.options.length) % sel.options.length;
  sel.selectedIndex = next;
  linealModId = sel.value;
  renderLinealModuleTab();
}

// ── GLOBAL METRICS (header badges) ──────────────────
function renderLinealGlobalMetrics() {
  const el = $('linealGlobalMetrics'); if(!el) return;
  const props = state.properties; if(!props.length) { el.innerHTML=''; return; }
  const curWeeks = props.map(p => calcCurrentWeek(p.entry_date)).filter(Boolean);
  const avgWeek  = curWeeks.length ? Math.round(curWeeks.reduce((s,w)=>s+w,0)/curWeeks.length) : 1;
  const expected = expectedPctForWeek(avgWeek);
  const real     = Math.round(props.reduce((s,p) => s + propRealPctForWeek(p, avgWeek), 0) / props.length);
  const idx      = complianceIndex(real, expected);
  const idxColor = idx === null ? '#94a3b8' : idx >= 100 ? '#00e57c' : idx >= 75 ? '#ffcc00' : '#ff5f5f';

  el.innerHTML = [
    { val: 'Sem. ' + avgWeek + '/8', lbl: 'Semana Promedio',      sub: Math.round((avgWeek/8)*100)+'% del período',   color: '#c77dff' },
    { val: expected + '%',           lbl: 'Meta Esperada',         sub: '80% ÷ 8 semanas × ' + avgWeek,               color: '#fbbf24' },
    { val: real + '%',               lbl: 'Avance Real',           sub: real >= expected ? '✅ Sobre la meta' : '⚠️ Por debajo', color: real>=expected?'#00e57c':'#fb7185' },
    { val: (idx||0) + '%',           lbl: 'Índice Cumplimiento',   sub: idx>=100?'🟢 En ritmo':idx>=75?'🟡 Atención':'🔴 Rezagado', color: idxColor },
  ].map(k =>
    '<div class="sh-metric"><div class="sh-metric-val" style="color:'+k.color+'">'+k.val+'</div>'
    +'<div class="sh-metric-lbl">'+k.lbl+'</div>'
    +'<div class="sh-metric-sub" style="color:'+k.color+'">'+k.sub+'</div></div>'
  ).join('');
}

// ── OVERVIEW TAB ─────────────────────────────────────
function renderLinealOverview() {
  const prop = state.properties.find(p => String(p.id) === String(linealPropId));
  if(!prop) return;

  const curWeek = calcCurrentWeek(prop.entry_date) || 1;
  const weekLabels = Array.from({length:8}, (_,i) => 'Sem. '+(i+1));
  const expected   = Array.from({length:8}, (_,i) => expectedPctForWeek(i+1));
  const realVals   = Array.from({length:8}, (_,i) => propRealPctForWeek(prop, i+1) || (i+1 <= curWeek ? 0 : null));

  // KPI row
  const exp  = expectedPctForWeek(curWeek);
  const real = propRealPctForWeek(prop, curWeek);
  const idx  = complianceIndex(real, exp);
  const idxC = idx===null?'#94a3b8':idx>=100?'#00b460':idx>=75?'#e67e00':'#e03030';
  const kpiRow = $('linealKpiRow');
  if(kpiRow) kpiRow.innerHTML = [
    { val: 'Sem. '+curWeek+'/8', lbl: 'Semana Actual',      sub: prop.entry_date ? '📅 Inicio: '+prop.entry_date : '—',  color:'#c77dff', ok:'#c77dff' },
    { val: exp+'%',              lbl: 'Meta Esperada',       sub: 'Lineal: '+curWeek+' × 10%',                             color:'#fbbf24', ok:'#fbbf24' },
    { val: real+'%',             lbl: 'Avance Real',         sub: real>=exp?'✅ Por encima':'⚠️ Por debajo de meta',        color:real>=exp?'#00b460':'#e03030', ok:real>=exp?'#00b460':'#e03030' },
    { val: (idx||0)+'%',         lbl: 'Índice Cumplimiento', sub: idx>=100?'🟢 En ritmo':idx>=75?'🟡 Atención':'🔴 Rezagado', color:idxC, ok:idxC },
  ].map(k =>
    '<div class="ov-kpi" style="--ok:'+k.ok+'"><div class="ov-kpi-val" style="color:'+k.color+'">'+k.val+'</div>'
    +'<div class="ov-kpi-label">'+k.lbl+'</div><div class="ov-kpi-sub" style="color:'+k.color+'">'+k.sub+'</div></div>'
  ).join('');

  // Badge in dropdown area
  if($('linealCurWeekBadge')) $('linealCurWeekBadge').textContent = curWeek;
  if($('linealPropBadge')) $('linealPropBadge').innerHTML =
    '<span class="prop-dd-dot" style="background:'+idxC+'"></span>'
    +'<span class="prop-dd-pct" style="color:'+idxC+'">Sem. '+curWeek+'/8</span>';

  // Sub label
  if($('linealOverviewSub')) $('linealOverviewSub').textContent = prop.name + ' · ' + (prop.modules||[]).length + ' módulos activos · Sem. '+curWeek+'/8';

  // ── Main line chart ──
  destroyChart('chartLinealOverview');
  const cv = $('chartLinealOverview'); if(!cv) return;
  const dk = theme==='dark', tc=dk?'#9287b8':'#7c6fa0', gc=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';

  // Build a dataset per module (only active ones)
  const modColors = ['#820ad1','#e67e00','#00b460','#0088cc','#F7B500','#a34dde','#00ccaa','#ff6b6b'];
  const activeMods = (prop.modules || []);
  const modDatasets = activeMods.slice(0,5).map((mid, i) => {
    const m = MODULES.find(x => x.id === mid);
    const sim = simulateWeeklyValues(prop, mid);
    const data = Array.from({length:8}, (_,w) => {
      const v = sim.vals[w];
      if(v === null) return null;
      return sim.meta > 0 ? Math.min(100, Math.round((v/sim.meta)*100)) : 0;
    });
    return {
      label: m.icon+' '+m.label,
      data,
      borderColor: modColors[i % modColors.length],
      backgroundColor: modColors[i % modColors.length] + '22',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: modColors[i % modColors.length],
      tension: 0.35,
      spanGaps: false,
      fill: false,
    };
  });

  charts['chartLinealOverview'] = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: {
      labels: weekLabels,
      datasets: [
        {
          label: '— Meta Lineal (10%/sem)',
          data: expected,
          borderColor: '#ffffff55',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6,4],
          pointRadius: 3,
          pointBackgroundColor: '#ffffff66',
          tension: 0,
          fill: false,
          order: 0,
        },
        ...modDatasets
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { position:'bottom', labels:{ color:tc, font:{family:'Montserrat',size:10}, boxWidth:12, padding:16 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if(v === null) return ctx.dataset.label + ': —';
              return ctx.dataset.label + ': ' + v + '%';
            }
          }
        }
      },
      scales: {
        x: { grid:{color:gc}, ticks:{color:tc,font:{family:'Montserrat',size:10}} },
        y: {
          min:0, max:100,
          grid:{color:gc},
          ticks:{color:tc, font:{family:'Montserrat',size:10}, callback:v=>v+'%' },
        }
      },
      // Mark current week with annotation-like dataset
    }
  });

  // ── Week mini cards ──
  const cardsEl = $('linealWeekCards'); if(!cardsEl) return;
  cardsEl.innerHTML = Array.from({length:8}, (_,i) => {
    const w = i + 1;
    const rPct = propRealPctForWeek(prop, w);
    const ePct = expectedPctForWeek(w);
    const idx  = w <= curWeek ? complianceIndex(rPct, ePct) : null;
    const isFuture = w > curWeek;
    const isCur    = w === curWeek;
    const idxCls = idx === null ? '' : idx >= 100 ? 'idx-green' : idx >= 75 ? 'idx-yellow' : 'idx-red';
    const c       = rPct >= 80 ? '#00b460' : rPct >= 50 ? '#e67e00' : '#820ad1';
    return '<div class="week-mini-card' + (isCur?' wmc-active':'') + '" style="opacity:' + (isFuture?.45:1) + '">'
      + '<div class="wmc-header">'
      +   '<div class="wmc-week">Semana ' + w + (isCur?' ★':'') + '</div>'
      +   (idx !== null ? '<div class="wmc-index ' + idxCls + '">' + idx + '%</div>' : '<div class="wmc-index" style="background:var(--surface3);color:var(--text-muted)">—</div>')
      + '</div>'
      + '<div class="wmc-real" style="color:' + (isFuture?'var(--text-muted)':c) + '">' + (isFuture ? '—' : rPct + '%') + '</div>'
      + '<div class="wmc-exp">Esperado: ' + ePct + '%</div>'
      + '<div class="wmc-bar-track">'
      +   '<div class="wmc-bar-fill" style="width:' + (isFuture?0:rPct) + '%;background:' + c + '"></div>'
      +   '<div class="wmc-bar-marker" style="left:' + ePct + '%"></div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:clamp(8px,.75vw,9px);color:var(--text-muted);margin-top:5px">'
      +   '<span>Real</span><span style="color:var(--domo)">▎ Meta</span>'
      + '</div>'
      + '</div>';
  }).join('');
}

// ── MODULE TAB ───────────────────────────────────────
function renderLinealModuleTab() {
  const prop = state.properties.find(p => String(p.id) === String(linealModPropId));
  if(!prop) return;
  buildModDropdown(); // refresh

  const m = MODULES.find(x => x.id === linealModId);
  if(!m) return;

  const curWeek = calcCurrentWeek(prop.entry_date) || 1;
  const sim     = simulateWeeklyValues(prop, linealModId);
  const { vals, meta, curVal } = sim;
  const weekLabels = Array.from({length:8}, (_,i) => 'Sem. '+(i+1));
  const expected   = Array.from({length:8}, (_,i) => expectedPctForWeek(i+1));
  const realPcts   = Array.from({length:8}, (_,i) => {
    const v = vals[i]; if(v === null) return null;
    return meta > 0 ? Math.min(100, Math.round((v/meta)*100)) : 0;
  });

  // KPIs
  const rNow = realPcts[curWeek-1] || 0;
  const eNow = expectedPctForWeek(curWeek);
  const idx  = complianceIndex(rNow, eNow);
  const idxC = idx===null?'#94a3b8':idx>=100?'#00b460':idx>=75?'#e67e00':'#e03030';
  const kpiEl = $('linealModKpis'); if(kpiEl) kpiEl.innerHTML = [
    { val: m.icon+' '+m.label,      lbl:'Módulo',             sub:'', color:'var(--domo)' },
    { val: curVal + ' '+m.unit.split('/')[0], lbl:'Valor Real Actual', sub:'Semana '+curWeek, color:'var(--text)' },
    { val: meta + ' '+m.unit.split('/')[0],   lbl:'Meta Final',        sub:'100% en 8 semanas', color:'#fbbf24' },
    { val: (idx||0)+'%',            lbl:'Índice Cumpl.', sub:idx>=100?'🟢 En ritmo':idx>=75?'🟡 Atención':'🔴 Rezagado', color:idxC },
  ].map(k =>
    '<div class="ov-kpi" style="--ok:'+k.color+'"><div class="ov-kpi-val" style="color:'+k.color+'">'+k.val+'</div>'
    +'<div class="ov-kpi-label">'+k.lbl+'</div><div class="ov-kpi-sub" style="color:'+k.color+'">'+k.sub+'</div></div>'
  ).join('');

  // Labels
  if($('linealModChartTitle')) $('linealModChartTitle').textContent = m.icon+' '+m.label+' — Progresión Semanal';
  if($('linealModChartSub'))   $('linealModChartSub').textContent = prop.name + ' · Meta: ' + meta + ' ' + m.unit;
  if($('linealModTableTitle')) $('linealModTableTitle').textContent = 'Desglose Semanal — ' + m.label;

  // Line chart
  destroyChart('chartLinealMod');
  const cv = $('chartLinealMod'); if(!cv) return;
  const dk = theme==='dark', tc=dk?'#9287b8':'#7c6fa0', gc=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';

  charts['chartLinealMod'] = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: {
      labels: weekLabels,
      datasets: [
        {
          label: '— Progreso Esperado (%)',
          data: expected,
          borderColor: 'rgba(247,181,0,.6)',
          backgroundColor: 'rgba(247,181,0,.05)',
          borderWidth: 2,
          borderDash: [6,4],
          pointRadius: 3,
          pointBackgroundColor: 'rgba(247,181,0,.7)',
          tension: 0,
          fill: false,
        },
        {
          label: m.icon+' '+m.label+' — Real (%)',
          data: realPcts,
          borderColor: '#820ad1',
          backgroundColor: 'rgba(130,10,209,.12)',
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#820ad1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.35,
          fill: true,
          spanGaps: false,
        },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'bottom',labels:{color:tc,font:{family:'Montserrat',size:11},boxWidth:12,padding:16}},
        tooltip:{
          callbacks:{
            label: ctx => {
              const v = ctx.parsed.y;
              if(v===null) return ctx.dataset.label+': —';
              return ctx.dataset.label+': '+v+'%';
            },
            afterLabel: ctx => {
              if(ctx.datasetIndex !== 1) return '';
              const w = ctx.dataIndex + 1;
              if(w > curWeek) return 'Semana futura';
              const idx2 = complianceIndex(ctx.parsed.y, expected[ctx.dataIndex]);
              return 'Índice: ' + idx2 + '% (' + (idx2>=100?'✅ En ritmo':idx2>=75?'⚠️ Atención':'❌ Rezagado') + ')';
            }
          }
        }
      },
      scales:{
        x:{grid:{color:gc},ticks:{color:tc,font:{family:'Montserrat',size:10}}},
        y:{min:0,max:100,grid:{color:gc},ticks:{color:tc,font:{family:'Montserrat',size:10},callback:v=>v+'%'}}
      }
    }
  });

  // Table
  const tbody = $('linealModTableBody'); if(!tbody) return;
  tbody.innerHTML = Array.from({length:8}, (_,i) => {
    const w     = i + 1;
    const rPct  = realPcts[i];
    const ePct  = expected[i];
    const rVal  = vals[i];
    const idx2  = w <= curWeek ? complianceIndex(rPct, ePct) : null;
    const isFut = w > curWeek;
    const isCur = w === curWeek;
    const c     = rPct===null?'var(--text-muted)': rPct>=80?'#00b460':rPct>=50?'#e67e00':'#e03030';
    const idxC2 = idx2===null?'var(--text-muted)':idx2>=100?'#00b460':idx2>=75?'#e67e00':'#e03030';
    const statusLabel = isFut ? '—' : idx2>=100 ? '✅ En Meta' : idx2>=75 ? '⚠️ Atención' : '🔴 Rezagado';
    return '<tr style="'+(isCur?'background:rgba(130,10,209,.05)':'')+'border-bottom:1px solid var(--border)">'
      + '<td style="padding:11px 14px;font-weight:800;color:'+(isCur?'var(--domo)':'var(--text)')+'">Semana '+w+(isCur?' ★':'')+''+(isFut?'<span style="font-size:9px;color:var(--text-muted);display:block">Futura</span>':'')+'</td>'
      + '<td style="padding:11px 14px;font-family:JetBrains Mono,monospace;color:'+c+'">'+(rVal!==null?rVal+' '+m.unit.split('/')[0]:'—')+'</td>'
      + '<td style="padding:11px 14px;font-family:JetBrains Mono,monospace">'+meta+' '+m.unit.split('/')[0]+'</td>'
      + '<td style="padding:11px 14px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:5px;border-radius:3px;background:var(--surface2);overflow:hidden;min-width:40px"><div style="width:'+(rPct||0)+'%;height:100%;background:'+c+';border-radius:3px"></div></div><span style="font-weight:800;color:'+c+'">'+(rPct!==null?rPct+'%':'—')+'</span></div></td>'
      + '<td style="padding:11px 14px;font-weight:700;color:#fbbf24">'+ePct+'%</td>'
      + '<td style="padding:11px 14px;font-weight:800;color:'+idxC2+'">'+(idx2!==null?idx2+'%':'—')+'</td>'
      + '<td style="padding:11px 14px">'+statusLabel+'</td>'
      + '</tr>';
  }).join('');
}

// ── COMPARE TAB ──────────────────────────────────────
function renderCompareView() {
  const prop = state.properties.find(p => String(p.id) === String(linealCmpPropId));
  if(!prop) return;
  const wA = parseInt($('cmpWeekA')?.value) || 1;
  const wB = parseInt($('cmpWeekB')?.value) || 6;

  if($('cmpChartTitle')) $('cmpChartTitle').textContent = 'Semana '+wA+' vs Semana '+wB+' — '+prop.name;
  if($('cmpChartSub'))   $('cmpChartSub').textContent = 'Real vs Meta lineal · Índice de cumplimiento';

  const mods    = (prop.modules || []);
  const modLabels = mods.map(mid => { const m=MODULES.find(x=>x.id===mid); return m?m.icon+' '+m.label:mid; });
  const dataA   = mods.map(mid => realPctForWeek(prop, mid, wA) || 0);
  const dataB   = mods.map(mid => realPctForWeek(prop, mid, wB) || 0);
  const expA    = expectedPctForWeek(wA);
  const expB    = expectedPctForWeek(wB);

  // Chart
  destroyChart('chartLinealCmp');
  const cv = $('chartLinealCmp'); if(!cv) return;
  const dk = theme==='dark', tc=dk?'#9287b8':'#7c6fa0', gc=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';
  charts['chartLinealCmp'] = new Chart(cv.getContext('2d'), {
    type:'bar',
    data:{
      labels: modLabels,
      datasets:[
        { label:'Sem. '+wA+' Real',     data:dataA, backgroundColor:'rgba(130,10,209,.7)', borderRadius:5, borderSkipped:false, barThickness:18 },
        { label:'Sem. '+wB+' Real',     data:dataB, backgroundColor:'rgba(0,180,100,.7)',  borderRadius:5, borderSkipped:false, barThickness:18 },
        { label:'Meta Sem. '+wA+' ('+expA+'%)', data:mods.map(()=>expA), type:'line', borderColor:'rgba(247,181,0,.7)', backgroundColor:'transparent', borderWidth:2, borderDash:[5,4], pointRadius:3, tension:0 },
        { label:'Meta Sem. '+wB+' ('+expB+'%)', data:mods.map(()=>expB), type:'line', borderColor:'rgba(255,182,93,.6)', backgroundColor:'transparent', borderWidth:2, borderDash:[3,3], pointRadius:3, tension:0 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{ legend:{ position:'bottom', labels:{color:tc,font:{family:'Montserrat',size:10},boxWidth:12,padding:14} } },
      scales:{
        x:{ticks:{color:tc,font:{family:'Montserrat',size:9}},grid:{color:gc}},
        y:{min:0,max:100,ticks:{color:tc,font:{family:'Montserrat',size:10},callback:v=>v+'%'},grid:{color:gc}}
      }
    }
  });

  // Table
  const head = $('cmpTableHead'); const body = $('cmpTableBody');
  if(head) head.innerHTML = '<tr>'
    + ['Módulo','Valor Sem.'+wA,'% Real Sem.'+wA,'Índice Sem.'+wA,'Valor Sem.'+wB,'% Real Sem.'+wB,'Índice Sem.'+wB,'Δ Índice'].map(h =>
        '<th style="padding:9px 13px;font-size:clamp(8px,.8vw,10px);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.7px;background:var(--surface2);border-bottom:1px solid var(--border);white-space:nowrap">'+h+'</th>'
    ).join('') + '</tr>';

  if(body) {
    const curWeek = calcCurrentWeek(prop.entry_date) || 1;
    body.innerHTML = mods.map(mid => {
      const m = MODULES.find(x=>x.id===mid);
      const rA = realPctForWeek(prop, mid, wA) || 0;
      const rB = realPctForWeek(prop, mid, wB) || 0;
      const iA = complianceIndex(rA, expA);
      const iB = complianceIndex(rB, expB);
      const delta = iB !== null && iA !== null ? iB - iA : null;
      const sim = simulateWeeklyValues(prop, mid);
      const valA = sim.vals[wA-1] !== null ? sim.vals[wA-1] : '—';
      const valB = sim.vals[wB-1] !== null ? sim.vals[wB-1] : '—';
      const cA = rA>=80?'#00b460':rA>=50?'#e67e00':'#e03030';
      const cB = rB>=80?'#00b460':rB>=50?'#e67e00':'#e03030';
      const iAC = iA===null?'#94a3b8':iA>=100?'#00b460':iA>=75?'#e67e00':'#e03030';
      const iBC = iB===null?'#94a3b8':iB>=100?'#00b460':iB>=75?'#e67e00':'#e03030';
      const dC  = delta===null?'#94a3b8':delta>0?'#00b460':delta<0?'#e03030':'#94a3b8';
      return '<tr style="border-bottom:1px solid var(--border)">'
        + '<td style="padding:10px 13px"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">'+m.icon+'</span><strong>'+m.label+'</strong></div></td>'
        + '<td style="padding:10px 13px;font-family:JetBrains Mono,monospace">'+valA+'</td>'
        + '<td style="padding:10px 13px;font-weight:800;color:'+cA+'">'+rA+'%</td>'
        + '<td style="padding:10px 13px;font-weight:800;color:'+iAC+'">'+(iA!==null?iA+'%':'—')+'</td>'
        + '<td style="padding:10px 13px;font-family:JetBrains Mono,monospace">'+valB+'</td>'
        + '<td style="padding:10px 13px;font-weight:800;color:'+cB+'">'+rB+'%</td>'
        + '<td style="padding:10px 13px;font-weight:800;color:'+iBC+'">'+(iB!==null?iB+'%':'—')+'</td>'
        + '<td style="padding:10px 13px;font-weight:800;color:'+dC+'">'+(delta!==null?(delta>=0?'+':'')+delta+'%':'—')+'</td>'
        + '</tr>';
    }).join('');
  }
}

// ── SEMÁFORO TAB ─────────────────────────────────────
function renderSemaforoView() {
  const prop = state.properties.find(p => String(p.id) === String(linealSemPropId));
  if(!prop) return;

  const curWeek = calcCurrentWeek(prop.entry_date) || 1;
  const mods    = prop.modules || [];
  const ePct    = expectedPctForWeek(curWeek);

  if($('semaforoRadarSub')) $('semaforoRadarSub').textContent = prop.name + ' · Semana '+curWeek+'/8 · Meta esperada: '+ePct+'%';

  // Grid
  const grid = $('semaforoGrid'); if(!grid) return;
  if(!mods.length) {
    grid.innerHTML = '<div style="color:var(--text-muted);padding:40px;text-align:center;grid-column:1/-1">Sin módulos activos</div>';
    return;
  }

  const inactiveMods = MODULES.filter(m => !mods.includes(m.id));

  grid.innerHTML = [
    ...MODULES.filter(m => mods.includes(m.id)).map(m => {
      const rPct = realPctForWeek(prop, m.id, curWeek) || 0;
      const idx  = complianceIndex(rPct, ePct);
      const lightColor = idx >= 100 ? 'green' : idx >= 75 ? 'yellow' : 'red';
      const c = rPct>=80?'#00b460':rPct>=50?'#e67e00':'#e03030';
      const idxC = idx>=100?'#00b460':idx>=75?'#e67e00':'#e03030';
      const statusMsg = idx >= 100
        ? 'En ritmo o adelantado'
        : idx >= 75 ? 'Necesita atención'
        : 'Requiere acción urgente';
      const sim = simulateWeeklyValues(prop, m.id);
      return '<div class="sem-card">'
        + '<div class="sem-header">'
        +   '<div class="sem-icon-name"><div class="sem-icon">'+m.icon+'</div><div class="sem-name">'+m.label+'</div></div>'
        +   '<div style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted)">Sem. '+curWeek+'/8</div>'
        + '</div>'
        + '<div class="sem-light-wrap">'
        +   '<div class="sem-light '+(lightColor==='red'?'sem-on-red':'sem-off')+'"></div>'
        +   '<div class="sem-light '+(lightColor==='yellow'?'sem-on-yellow':'sem-off')+'"></div>'
        +   '<div class="sem-light '+(lightColor==='green'?'sem-on-green':'sem-off')+'"></div>'
        + '</div>'
        + '<div class="sem-body">'
        +   '<div class="sem-index-val" style="color:'+idxC+'">'+idx+'%</div>'
        +   '<div class="sem-label">Índice de Cumplimiento</div>'
        +   '<div class="sem-bar-row"><span class="sem-bar-label">Real</span><div class="sem-bar-track"><div class="sem-bar-fill" style="width:'+rPct+'%;background:'+c+'"></div></div><span class="sem-pct" style="color:'+c+'">'+rPct+'%</span></div>'
        +   '<div class="sem-bar-row"><span class="sem-bar-label">Esperado</span><div class="sem-bar-track"><div class="sem-bar-fill" style="width:'+ePct+'%;background:#fbbf24"></div></div><span class="sem-pct" style="color:#fbbf24">'+ePct+'%</span></div>'
        +   '<div class="sem-week-info">'+sim.curVal+'/'+sim.meta+' '+m.unit+' · '+statusMsg+'</div>'
        + '</div>'
        + '</div>';
    }),
    ...inactiveMods.map(m => '<div class="sem-card" style="opacity:.35">'
      + '<div class="sem-header"><div class="sem-icon-name"><div class="sem-icon">'+m.icon+'</div><div class="sem-name">'+m.label+'</div></div><div style="font-size:clamp(8px,.8vw,10px);color:var(--text-muted)">Inactivo</div></div>'
      + '<div class="sem-light-wrap"><div class="sem-light sem-off"></div><div class="sem-light sem-off"></div><div class="sem-light sem-off"></div></div>'
      + '<div class="sem-body"><div class="sem-index-val" style="color:var(--text-muted)">—</div><div class="sem-label">Módulo sin activar</div></div>'
      + '</div>'
    )
  ].join('');

  // Radar
  destroyChart('chartSemaforoRadar');
  const cv = $('chartSemaforoRadar'); if(!cv) return;
  const dk=theme==='dark', tc=dk?'#9287b8':'#7c6fa0', gc=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';
  const idxVals = MODULES.map(m => {
    if(!mods.includes(m.id)) return 0;
    const rPct = realPctForWeek(prop, m.id, curWeek) || 0;
    const idx  = complianceIndex(rPct, ePct);
    return idx || 0;
  });
  charts['chartSemaforoRadar'] = new Chart(cv.getContext('2d'), {
    type:'radar',
    data:{
      labels: MODULES.map(m=>m.icon+'  '+m.label),
      datasets:[
        { label:'Índice de Cumplimiento (%)', data:idxVals, backgroundColor:'rgba(130,10,209,.18)', borderColor:'#820ad1', pointBackgroundColor:'#820ad1', pointBorderColor:'#fff', pointBorderWidth:2, borderWidth:2.5, pointRadius:5, fill:true },
        { label:'Meta (100%)', data:MODULES.map(()=>100), backgroundColor:'rgba(247,181,0,.05)', borderColor:'rgba(247,181,0,.4)', borderWidth:1.5, borderDash:[5,4], pointRadius:3, fill:true },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{color:tc,font:{family:'Montserrat',size:11,weight:'700'},boxWidth:12,padding:20} } },
      scales:{ r:{
        angleLines:{color:gc}, grid:{color:gc},
        pointLabels:{color:tc,font:{family:'Montserrat',size:10,weight:'600'}},
        ticks:{color:tc,font:{family:'Montserrat',size:9},backdropColor:'transparent',stepSize:25},
        min:0, max:Math.max(150, ...idxVals.filter(Boolean))
      }}
    }
  });
}




// ══ ABISMO CARD INLINE TASKS ══
function toggleAbismoTasks(propId) {
  const body = document.getElementById('abt-body-' + propId);
  const arrow = document.getElementById('abt-arrow-' + propId);
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (arrow) arrow.className = 'att-arrow' + (open ? '' : ' open');
}

function renderAbismoTaskBadge(propId) {
  const tasks = propTasks[String(propId)] || [];
  const totalW = tasks.reduce((s,t) => s + t.weight, 0);
  const done = tasks.filter(t => t.progress === 100).length;

  const badge = document.getElementById('abt-badge-' + propId);
  if (badge) badge.textContent = tasks.length;

  const sealEl = document.getElementById('abt-seal-' + propId);
  if (sealEl) {
    const p = state.properties.find(x => String(x.id) === String(propId));
    if (p) {
      const v = getCombinedSealPct(p);
      sealEl.textContent = v + '% sellado' + (v >= 80 ? ' ✅' : '');
      sealEl.style.color = v >= 80 ? '#00b460' : v >= 50 ? '#e67e00' : '#e03030';
    }
  }

  const list = document.getElementById('abt-list-' + propId);
  if (!list) return;

  if (!tasks.length) {
    list.innerHTML = '<div class="abt-empty">Sin tareas — agrega una abajo ↓</div>';
    return;
  }

  const _zc = {'Innovadores':'#34d399','Visionarios':'#84cc16','Pragmáticos':'#fbbf24','Conservadores':'#fb7185','Escépticos':'#94a3b8'};
  const hdrCol = done === tasks.length && done > 0 ? '#00b460' : 'var(--text-muted)';

  list.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">
    <span style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${tasks.length} tarea${tasks.length!==1?'s':''} · Peso: ${totalW}</span>
    <span style="font-size:10px;font-weight:800;color:${hdrCol}">${done===tasks.length&&done>0?'✅ ':''}${done}/${tasks.length}</span>
  </div>`
  + tasks.map(t => {
    const isDone = t.progress === 100;
    const zc = _zc[t.category] || '#820ad1';
    const bc = isDone ? '#00b460' : t.progress >= 50 ? '#e67e00' : '#820ad1';
    const maxC = totalW > 0 ? Math.round((t.weight / totalW) * 100 * 0.8) : 0;
    const curC = Math.round(maxC * t.progress / 100);
    const sid = String(t.id);
    const spid = String(propId);

    return `<div class="abt-item" id="abt-item-${spid}-${sid}"
      style="flex-direction:column;align-items:stretch;border-left:2px solid ${zc};padding:8px 10px;gap:6px;background:var(--surface)">

      <!-- Fila: zona + texto + eliminar -->
      <div style="display:flex;align-items:center;gap:7px">
        <span style="font-size:8px;font-weight:700;color:${zc};white-space:nowrap;padding:1px 6px;
          border-radius:10px;background:${zc}20;flex-shrink:0">${t.category}</span>
        <span style="flex:1;font-size:clamp(10px,.9vw,12px);color:var(--text);line-height:1.3;
          ${isDone?'text-decoration:line-through;color:var(--text-muted)':''}">${t.text}</span>
        <span style="font-size:8px;font-weight:800;color:var(--text-muted);background:var(--surface2);
          padding:1px 5px;border-radius:6px;border:1px solid var(--border);flex-shrink:0">×${t.weight}</span>
        <button class="abt-del" onclick="deleteAbismoTask('${spid}',${sid})" title="Eliminar">✕</button>
      </div>

      <!-- Fila: botón − + barra + botón + + pct -->
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="stepAbismoTaskProgress('${spid}',${sid},-10)"
          style="width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border);
            background:var(--surface2);cursor:pointer;font-size:14px;font-weight:800;
            color:var(--text-muted);flex-shrink:0;display:flex;align-items:center;
            justify-content:center;line-height:1;font-family:monospace">−</button>
        <div style="flex:1;height:8px;border-radius:4px;background:var(--surface2);overflow:hidden">
          <div id="abt-bar-${spid}-${sid}"
            style="height:100%;width:${t.progress}%;background:${bc};border-radius:4px;transition:width .4s ease">
          </div>
        </div>
        <button onclick="stepAbismoTaskProgress('${spid}',${sid},10)"
          style="width:22px;height:22px;border-radius:6px;border:1.5px solid var(--domo);
            background:rgba(130,10,209,.08);cursor:pointer;font-size:14px;font-weight:800;
            color:var(--domo);flex-shrink:0;display:flex;align-items:center;
            justify-content:center;line-height:1;font-family:monospace">+</button>
        <span id="abt-pct-${spid}-${sid}"
          style="font-size:11px;font-weight:800;color:${bc};min-width:34px;text-align:right">
          ${t.progress}%</span>
      </div>

      <!-- Fila: contribución al abismo -->
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:8px;font-weight:700;color:var(--text-muted);
          text-transform:uppercase;letter-spacing:.4px;white-space:nowrap">Abismo</span>
        <div style="flex:1;height:4px;border-radius:2px;background:var(--surface3);overflow:hidden">
          <div id="abt-abismo-${spid}-${sid}"
            style="height:100%;width:${curC}%;background:${bc};border-radius:2px;transition:width .5s ease">
          </div>
        </div>
        <span id="abt-contrib-${spid}-${sid}"
          style="font-size:9px;font-weight:800;color:${bc};min-width:50px;text-align:right">
          ${isDone ? '+'+maxC+'%' : curC > 0 ? '+'+curC+'%' : '+0%/+'+maxC+'%'}</span>
      </div>
    </div>`;
  }).join('');
}

function toggleAbismoTaskCheck(propId, taskId) {
  const tasks = propTasks[String(propId)] || [];
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  t.progress = t.progress === 100 ? 0 : 100;
  updateTaskProgressSB(t.id,t.progress);
  renderAbismoTaskBadge(propId);
  showToast(t.progress===100 ? '✅ Tarea completada' : '↩️ Tarea pendiente', t.progress===100?'success':'info');
}

async function addAbismoTask(propId) {
  const input = document.getElementById('abt-input-' + propId);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const zone = abismoZoneSelected[propId] || 'Innovadores';
  if (!propTasks[String(propId)]) propTasks[String(propId)] = [];
  const newTask={id:Date.now(),category:zone,text,weight:5,progress:0};
  if(sb){const saved=await saveTaskToSB(String(propId),newTask);if(saved)newTask.id=saved.id;}
  propTasks[String(propId)].push(newTask);
  input.value = '';
  input.placeholder = 'Tarea para ' + zone + '...';
  renderAbismoTaskBadge(propId);
}

function toggleAbismoTask(propId, taskId, checked) {
  const tasks = propTasks[String(propId)] || [];
  const t = tasks.find(x => x.id === taskId);
  if (t) { t.progress = checked ? 100 : 0; updateTaskProgressSB(t.id,t.progress); }
  renderAbismoTaskBadge(propId);
  // refresh combined seal in the card header if visible
  const pct = document.getElementById('abt-seal-' + propId);
  if (pct) {
    const p = state.properties.find(x => String(x.id) === String(propId));
    if (p) {
      const v = getCombinedSealPct(p);
      pct.textContent = v + '% sellado';
      pct.style.color = v >= 80 ? '#00b460' : v >= 50 ? '#e67e00' : '#e03030';
    }
  }
}

function deleteAbismoTask(propId, taskId) {
  if (!propTasks[String(propId)]) return;
  propTasks[String(propId)] = propTasks[String(propId)].filter(x => x.id !== taskId);
  deleteTaskSB(taskId);
  renderAbismoTaskBadge(propId);
}

function stepAbismoTaskProgress(propId, taskId, delta) {
  const tasks = propTasks[String(propId)];
  if (!tasks) return;
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;

  t.progress = Math.min(100, Math.max(0, t.progress + delta));
  updateTaskProgressSB(t.id,t.progress);

  const sid   = String(taskId);
  const spid  = String(propId);
  const bc    = t.progress === 100 ? '#00b460' : t.progress >= 50 ? '#e67e00' : '#820ad1';
  const isDone = t.progress === 100;

  // ── Actualizar barra de progreso ──
  const bar = document.getElementById('abt-bar-' + spid + '-' + sid);
  if (bar) { bar.style.width = t.progress + '%'; bar.style.background = bc; }

  // ── Actualizar porcentaje ──
  const pctEl = document.getElementById('abt-pct-' + spid + '-' + sid);
  if (pctEl) { pctEl.textContent = t.progress + '%'; pctEl.style.color = bc; }

  // ── Actualizar barra de contribución al abismo ──
  const totalW = tasks.reduce((s,x) => s + x.weight, 0);
  const maxC   = totalW > 0 ? Math.round((t.weight / totalW) * 100 * 0.8) : 0;
  const curC   = Math.round(maxC * t.progress / 100);

  const abismoBar = document.getElementById('abt-abismo-' + spid + '-' + sid);
  if (abismoBar) { abismoBar.style.width = curC + '%'; abismoBar.style.background = bc; }

  const contribEl = document.getElementById('abt-contrib-' + spid + '-' + sid);
  if (contribEl) {
    contribEl.textContent = isDone ? '+'+maxC+'%' : curC > 0 ? '+'+curC+'%' : '+0%/+'+maxC+'%';
    contribEl.style.color = bc;
  }

  // ── Tachado del texto si completada ──
  const itemEl = document.getElementById('abt-item-' + spid + '-' + sid);
  if (itemEl) {
    const textSpan = itemEl.querySelectorAll('span')[1]; // segundo span = texto tarea
    if (textSpan) {
      textSpan.style.textDecoration = isDone ? 'line-through' : '';
      textSpan.style.color          = isDone ? 'var(--text-muted)' : 'var(--text)';
    }
  }

  // ── Refrescar sello del abismo en header de card ──
  renderAbismoTaskBadge(propId); // re-render solo el badge/header, no toda la lista

  // ── Refrescar sello combinado en la card (indicador superior) ──
  const sealEl = document.getElementById('abt-seal-' + propId);
  if (sealEl) {
    const p = state.properties.find(x => String(x.id) === String(propId));
    if (p) {
      const v = getCombinedSealPct(p);
      sealEl.textContent = v + '% sellado' + (v >= 80 ? ' ✅' : '');
      sealEl.style.color = v >= 80 ? '#00b460' : v >= 50 ? '#e67e00' : '#e03030';
    }
  }
}

function handleAbismoTaskKey(e, propId) {
  if (e.key === 'Enter') addAbismoTask(propId);
}


// ══ ZONE SELECT FROM CURVE ══
function selectZoneFromCurve(zoneName) {
  taskCat = zoneName;
  // Highlight el botón correcto en tafCatBtns
  document.querySelectorAll('#tafCatBtns .taf-cat').forEach(b => {
    b.className = 'taf-cat';
    b.style.removeProperty('border-color');
    b.style.removeProperty('color');
  });
  const zoneCols = {'Innovadores':'#34d399','Visionarios':'#84cc16','Pragmáticos':'#fbbf24','Conservadores':'#fb7185','Escépticos':'#94a3b8'};
  const col = zoneCols[zoneName] || 'var(--domo)';
  document.querySelectorAll('#tafCatBtns .taf-cat').forEach(b => {
    if(b.textContent.includes(zoneName)) {
      b.className = 'taf-cat taf-cat-active';
      b.style.borderColor = col;
      b.style.color = col;
    }
  });
  // Scroll al formulario y hacer focus
  const inp = $('tafTaskText');
  if(inp) {
    inp.focus();
    inp.placeholder = 'Tarea para ' + zoneName + '...';
  }
  showToast('📍 Zona: ' + zoneName + ' — escribe la tarea abajo', 'success');
}

// Override setTaskCat para manejar colores de zona
const _origSetTaskCat = setTaskCat;
function setTaskCat(cat, el) {
  taskCat = cat;
  const zoneCols = {'Innovadores':'#34d399','Visionarios':'#84cc16','Pragmáticos':'#fbbf24','Conservadores':'#fb7185','Escépticos':'#94a3b8'};
  const col = zoneCols[cat] || 'var(--domo)';
  document.querySelectorAll('#tafCatBtns .taf-cat').forEach(b => {
    b.className = 'taf-cat';
    b.style.removeProperty('border-color');
    b.style.removeProperty('color');
  });
  if(el) {
    el.className = 'taf-cat taf-cat-active';
    el.style.borderColor = col;
    el.style.color = col;
  }
  const inp = $('tafTaskText');
  if(inp) inp.placeholder = 'Tarea para ' + cat + '...';
}


// ══ ABISMO CARD ZONA SELECTION ══
let abismoZoneSelected = {};  // propId → zoneName

function setAbismoZone(propId, zone, el) {
  abismoZoneSelected[propId] = zone;
  const zoneCols = {'Innovadores':'#34d399','Visionarios':'#84cc16','Pragmáticos':'#fbbf24','Conservadores':'#fb7185','Escépticos':'#94a3b8'};
  const col = zoneCols[zone];
  // Reset all zone buttons en este card
  if(el && el.parentElement) {
    el.parentElement.querySelectorAll('button').forEach(b => {
      b.style.fontWeight = '700';
      b.style.opacity = '0.55';
    });
    el.style.opacity = '1';
    el.style.background = col + '20';
  }
  const inp = document.getElementById('abt-input-' + propId);
  if(inp) { inp.focus(); inp.placeholder = 'Tarea para ' + zone + '...'; }
}


function autoCalcDays() {
  const v = $('fEntryDate') ? $('fEntryDate').value : '';
  if(!v) return;
  const p = {entry_date: v, days: 0};
  const d = getDaysFromEntry(p), w = getPropWeek(p);
  if($('fDays')) $('fDays').value = d;
  if($('fDaysHint')) $('fDaysHint').textContent = '→ Semana ' + w + '/8 (' + d + ' días desde el inicio)';
}


// ══ ENTRY DATE ADJUST ══
function adjustEntryDate(days) {
  const inp = $('fEntryDate');
  if(!inp || !inp.value) return;
  const d = new Date(inp.value);
  if(isNaN(d.getTime())) return;
  d.setDate(d.getDate() + days);
  inp.value = d.toISOString().split('T')[0];
  autoCalcDays();
}
function setEntryDateToday() {
  const inp = $('fEntryDate');
  if(!inp) return;
  inp.value = new Date().toISOString().split('T')[0];
  autoCalcDays();
}


// ══ QUICK DATE EDIT MODAL JS ══
function openQuickDateEdit(propId, currentDate) {
  const p = state.properties.find(x => String(x.id) === String(propId));
  if(!p) return;
  $('qdPropId').value = propId;
  $('qdPropName').textContent = p.name + ' — ' + (p.city || '');
  $('qdDate').value = currentDate || new Date().toISOString().split('T')[0];
  updateQuickDateHint();
  $('quickDateModal').style.display = 'flex';
}
function closeQuickDateModal(e) {
  if(e.target === $('quickDateModal')) $('quickDateModal').style.display = 'none';
}
function adjustQD(days) {
  const inp = $('qdDate');
  if(!inp) return;
  if(days === 0) { inp.value = new Date().toISOString().split('T')[0]; }
  else {
    const d = new Date(inp.value || new Date());
    d.setDate(d.getDate() + days);
    inp.value = d.toISOString().split('T')[0];
  }
  updateQuickDateHint();
}
function updateQuickDateHint() {
  const v = $('qdDate') ? $('qdDate').value : '';
  const hint = $('qdHint');
  if(!hint || !v) return;
  const p = {entry_date: v, days: 0};
  const d = getDaysFromEntry(p), w = getPropWeek(p);
  hint.textContent = '→ Semana ' + w + '/8 · ' + d + ' días desde el ingreso';
  hint.style.color = w <= 2 ? '#34d399' : w <= 5 ? '#fbbf24' : '#fb7185';
}
function saveQuickDate() {
  const propId = $('qdPropId').value;
  const newDate = $('qdDate') ? $('qdDate').value : '';
  if(!propId || !newDate) return;
  const p = state.properties.find(x => String(x.id) === String(propId));
  if(!p) return;
  p.entry_date = newDate;
  p.days = getDaysFromEntry(p);
  // Persist to Supabase si conectado, o en local
  if(sb) updateSupabase(propId, p);
  saveStateLocal();
  $('quickDateModal').style.display = 'none';
  showToast('📅 Fecha actualizada — Sem. ' + getPropWeek(p) + '/8', 'success');
  // Re-render current section
  if(currentSection !== 'connect') renderSection(currentSection);
}


// ══ TASK CHECK TOGGLE ══
function checkToggleTask(propId, taskId) {
  const tasks = propTasks[String(propId)];
  if(!tasks) return;
  const t = tasks.find(x => x.id === taskId);
  if(!t) return;
  t.progress = t.progress === 100 ? 0 : 100;
  updateTaskProgressSB(t.id,t.progress);
  // Re-render suave
  renderTaskList(propId);
  renderTaskDetail(propId);
  renderTasksSection();
  // También actualizar badge en abismo cards si existe
  renderAbismoTaskBadge && renderAbismoTaskBadge(propId);
  showToast(t.progress===100 ? '✅ Tarea completada — abismo actualizado' : '↩️ Tarea marcada pendiente', t.progress===100?'success':'info');
}


// ══ DATA INFO (todo viene de Supabase) ══
function clearLocalData() {
  // No hay datos locales — todo está en Supabase
  showToast('ℹ️ No hay datos locales. Todo se gestiona en Supabase.', '');
}
function updateLocalDataInfo() {
  const el = $('localDataInfo');
  if(!el) return;
  const propCount = state.properties.length;
  const taskCount = Object.values(propTasks).reduce((s,a)=>s+a.length,0);
  el.textContent = propCount + ' propiedades · ' + taskCount + ' tareas · (Supabase)';
}


// ── Toggle tarea roadmap (0 / 100) ──
function toggleRoadTask(propId, taskId) {
  const tasks = propTasks[String(propId)];
  if(!tasks) return;
  const t = tasks.find(x => x.id === taskId);
  if(!t) return;
  t.progress = t.progress === 100 ? 0 : 100;
  updateTaskProgressSB(t.id,t.progress);
  updateRoadTaskProgress(String(propId), taskId, t.progress);
  // Re-render lista para actualizar tachado y header
  renderRoadTaskList(String(propId));
  showToast(t.progress===100?'✅ Tarea completada':'↩️ Tarea pendiente', t.progress===100?'success':'info');
}

// ── Subir/bajar % en roadmap con botones +/− ──
function stepRoadTask(propId, taskId, delta) {
  const tasks = propTasks[String(propId)];
  if(!tasks) return;
  const t = tasks.find(x => x.id === taskId);
  if(!t) return;
  t.progress = Math.min(100, Math.max(0, t.progress + delta));
  updateTaskProgressSB(t.id,t.progress);
  // Actualizar UI inline sin re-render
  const sid = String(taskId);
  const bc = t.progress===100?'#00b460':t.progress>=50?'#e67e00':'#820ad1';
  const bar = $('rtc-bar-'+sid);
  if(bar){ bar.style.width=t.progress+'%'; bar.style.background=bc; }
  const lbl = $('rtc-pct-'+sid);
  if(lbl){ lbl.textContent=t.progress+'%'; lbl.style.color=bc; }
  const card = $('rtc-card-'+sid);
  if(card){ t.progress===100 ? card.classList.add('rtc-done') : card.classList.remove('rtc-done'); }
  const chk = $('rtc-chk-'+sid);
  if(chk){ chk.className='rtc-check-btn'+(t.progress===100?' checked':''); chk.textContent=t.progress===100?'✓':''; }
  // Abismo en tiempo real
  renderRoadChasmVisual(propId);
  renderRoadTaskBridges(propId);
  // También refrescar tab tareas si está activo
  if(currentSection==='tasks' && String(taskSelectedPropId)===String(propId)) renderTaskDetail(propId);
}

// ── Subir/bajar % en tab Tareas con botones +/− ──
function stepTaskProgress(propId, taskId, delta) {
  const tasks = propTasks[String(propId)];
  if(!tasks) return;
  const t = tasks.find(x => x.id === taskId);
  if(!t) return;
  t.progress = Math.min(100, Math.max(0, t.progress + delta));
  updateTaskProgressSB(t.id,t.progress);

  const sid = String(taskId);
  const bc = t.progress===100?'#00b460':t.progress>=50?'#e67e00':'#820ad1';
  const isDone = t.progress === 100;

  // Barra de progreso
  const bar = $('ticbar-'+sid);
  if(bar){ bar.style.width=t.progress+'%'; bar.style.background=bc; }

  // Porcentaje
  const lbl = $('ticpct-'+sid);
  if(lbl){ lbl.textContent=t.progress+'%'; lbl.style.color=bc; }

  // Card done state
  const card = $('tic-'+sid);
  if(card){
    isDone ? card.classList.add('tic-done') : card.classList.remove('tic-done');
    const textEl = card.querySelector('.tic-text');
    if(textEl) textEl.style.textDecoration = isDone ? 'line-through' : '';
  }

  // Barra abismo y contribución
  const tasks2 = propTasks[String(propId)] || [];
  const totalW = tasks2.reduce((s,x)=>s+x.weight,0);
  const maxContrib = totalW > 0 ? Math.round((t.weight/totalW)*100*0.8) : 0;
  const curContrib = Math.round(maxContrib * t.progress / 100);
  const abismoBar = $('ticabismo-'+sid);
  if(abismoBar){ abismoBar.style.width=curContrib+'%'; abismoBar.style.background=bc; }
  const contribLbl = $('ticcontrib-'+sid);
  if(contribLbl){ contribLbl.textContent=isDone?'+'+maxContrib+'%':curContrib>0?'+'+curContrib+'%':'+0%/+'+maxContrib+'%'; contribLbl.style.color=bc; }

  // Header contador
  const done2 = tasks2.filter(x=>x.progress===100).length;
  const hdrCol = done2===tasks2.length&&done2>0?'#00b460':'var(--text-muted)';
  const listEl = $('tasksListWrap');
  if(listEl){
    const hdr = listEl.querySelector('div[style*="space-between"] span:last-child');
    if(hdr){ hdr.textContent=(done2===tasks2.length&&done2>0?'✅ ':'')+done2+'/'+tasks2.length+' completadas'; hdr.style.color=hdrCol; }
  }

  // Actualizar barra del abismo (tacBar) y detalle
  renderTaskDetail(String(propId));
}
