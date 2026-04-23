// ══════════════════════════════════════════════
//  STATE — Global mutable state
// ══════════════════════════════════════════════

export let sb          = null;
export let sbChannel   = null;
export let charts      = {};

// Setters for module-imported primitives
export function setSb(client)    { sb = client; }
export function setSbChannel(ch) { sbChannel = ch; }

export let theme     = localStorage.getItem('dn_theme') || 'light';
export let isConnected     = false;
export let autoRefreshTimer = null;
export let currentSection  = 'connect';

export function setTheme(t)           { theme = t; }
export function setIsConnected(v)     { isConnected = v; }
export function setAutoRefreshTimer(t){ autoRefreshTimer = t; }
export function setCurrentSection(s)  { currentSection = s; }

export let settings = {
  autoRefresh: 60,
  userName:    '',
  curWeekStart:  '',
  prevWeekStart: ''
};

export let state = {
  properties: [],
  weekData:   { current: {}, previous: {} },
  lastUpdated: null
};

// Strategy
export let strategyView         = 'cards';
export let strategyPhaseFilter  = 'all';
export let selectedPropId       = null;
export let roadSelectedPropId   = null;
export let roadCategory         = 'Administradores';

export function setStrategyView(v)        { strategyView = v; }
export function setStrategyPhaseFilter(f) { strategyPhaseFilter = f; }
export function setSelectedPropId(id)     { selectedPropId = id; }
export function setRoadSelectedPropId(id) { roadSelectedPropId = id; }

// Tasks
export let propTasks = {};

// Filters
export let activeFilter   = 'all';
export let searchQuery    = '';
export let progressFilter = 'all';

export function setActiveFilter(f)   { activeFilter = f; }
export function setSearchQuery(q)    { searchQuery = q; }
export function setProgressFilter(f) { progressFilter = f; }

// Abismo zone selection
export let abismoZoneSelected = {};
