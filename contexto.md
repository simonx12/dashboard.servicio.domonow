# DomoNow — Dashboard de Implementación
## Contexto Técnico y Funcional del Proyecto

> **Última actualización:** 2026-04-22  
> **Versión:** 3.0  
> **Responsable técnico:** Equipo Ofima S.A.S

---

## 1. Descripción General

DomoNow es un dashboard web para el seguimiento de implementación del software DomoNow en conjuntos residenciales. Permite visualizar el avance de cada propiedad en la adopción de módulos, identificar brechas críticas (el "abismo"), gestionar tareas por propiedad y hacer seguimiento semanal del progreso.

**URL de acceso local:** Abrir `index.html` directamente en el navegador o servir con un servidor HTTP local (`python -m http.server 8765`).

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Estructura | HTML5 semántico | — |
| Estilos | Vanilla CSS (modularizado) | — |
| Lógica | Vanilla JavaScript | ES2020+ |
| Base de datos | Supabase (PostgreSQL) | v2 |
| Gráficas | Chart.js | 4.4.0 |
| Fuentes | Google Fonts (Montserrat, JetBrains Mono, Syne) | — |

**Sin bundlers ni frameworks.** Arquitectura de navegador nativo para compatibilidad con `file://` y simplicidad de despliegue.

---

## 3. Estructura de Archivos

```
full-dash/full-dash/
├── index.html              ← Shell principal (~63KB, ~1,094 líneas)
├── contexto.md             ← Este documento
├── README.md               ← Descripción breve
│
├── css/
│   ├── base.css            ← Variables CSS, reset, animaciones globales
│   ├── layout.css          ← Sidebar, topbar, main container, responsivo
│   ├── components.css      ← Botones, formularios, modales, tablas, toasts, pills
│   ├── dashboard.css       ← KPI cards, phase cards, chart cards del Dashboard
│   ├── progress.css        ← Progreso global y tarjetas por propiedad
│   ├── strategy.css        ← Abismo, curva de adopción, heatmap, vistas estratégicas
│   ├── tasks.css           ← UI de gestión de tareas por propiedad
│   └── lineal.css          ← Avance lineal semanal y semáforo de cumplimiento
│
└── js/
    └── app.js              ← Toda la lógica de negocio (~180KB, ~3,300 líneas)
```

### 3.1 Historia de Modularización

El proyecto fue refactorizado desde un monolito único `index.html` de **5,164 líneas / 317KB** hacia la estructura modular actual (sesión: 2026-04-22). El comportamiento funcional es idéntico al original.

---

## 4. Modelo de Datos (Supabase)

### Tabla `properties`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | text | Nombre del conjunto |
| `city` | text | Ciudad |
| `phase` | text | Fase actual: `fase0`, `fase1`, `fase2`, `fase3` |
| `days_elapsed` | int | Días transcurridos (calculado desde `entry_date`) |
| `units` | int | Total de apartamentos |
| `active_modules` | text[] | Array de IDs de módulos activos |
| `module_values` | jsonb | `{moduleId: valorReal}` por módulo |
| `notes` | text | Observaciones libres |
| `entry_date` | date | Fecha de ingreso a la plataforma |
| `created_at` | timestamp | Automático |

### Tabla `property_tasks`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `property_id` | text | FK a `properties.id` |
| `category` | text | Zona de adopción: `Innovadores`, `Visionarios`, `Pragmáticos`, `Conservadores`, `Escépticos` |
| `text` | text | Descripción de la tarea |
| `weight` | int | Peso en el cierre del abismo (1–10) |
| `progress` | int | Progreso de la tarea (0–100%) |

---

## 5. Sistema de Módulos

### 5.1 Definición de Módulos (15 en total)

| ID | Nombre | Unidad | Meta base |
|----|--------|--------|-----------|
| `configuracion` | Configuración | ítems configurados | 1 (fija) |
| `capacitacion` | Capacitación | sesiones realizadas | 30% de unidades |
| `acceso` | Acceso | pases de acceso | 50% de unidades |
| `muro` | Muro | publicaciones/mes | 8 (fija) |
| `alertas` | Alertas | alertas/mes | 2 (mínimo) |
| `solicitudes` | Solicitudes | aptos con solicitudes | 50% de unidades |
| `zonas` | Zonas Comunes | reservas/mes | 50% de unidades |
| `encuestas` | Encuestas | aptos participantes | 50% de unidades |
| `votaciones` | Votaciones | aptos participantes | 50% de unidades |
| `eventos` | Eventos | eventos publicados | 4 (fija) |
| `asambleas` | Asambleas | aptos participantes | 50% de unidades |
| `normativo` | Normativo | documentos publicados | 50% de unidades |
| `documentos` | Documental | aptos con acceso | 50% de unidades |
| `financiero` | Financiero | aptos activos | 50% de unidades |
| `superadmin` | Superadministrador | usuarios superadmin | 1 (fija) |

### 5.2 Fases y Módulos Asignados

| Fase | Módulos incluidos |
|------|------------------|
| `fase0` | configuracion, capacitacion |
| `fase1` | + acceso, muro, alertas, solicitudes |
| `fase2` | + zonas, encuestas, votaciones, eventos |
| `fase3` | + asambleas, normativo, documentos, financiero, superadmin |

Las fases son **acumulativas**: una propiedad en `fase2` tiene disponibles los módulos de `fase0` + `fase1` + `fase2`.

### 5.3 Cálculo de Progreso

```js
// Meta de un módulo para una propiedad
calcMeta(moduleId, units) → número

// % cumplimiento de un módulo
calcPct(moduleId, valor, units) → 0–100

// Progreso ponderado de una propiedad (promedio de sus módulos activos)
getPropProgress(property) → 0–100

// Promedio global de todas las propiedades
getGlobalProgress() → 0–100
```

---

## 6. Estado Global (JavaScript)

```js
let state = {
  properties: [],          // Array de propiedades cargadas desde Supabase
  weekData: {
    current: {},           // {moduleId: valor} de la semana actual
    previous: {}           // {moduleId: valor} de la semana anterior
  },
  lastUpdated: null        // Date de última sincronización
};

let propTasks = {};        // {propId: [{id, category, text, weight, progress}]}
let charts = {};           // {canvasId: Chart instance}
let sb = null;             // Supabase client instance
let isConnected = false;
let currentSection = 'connect';
let theme = 'light';       // 'light' | 'dark'
let settings = {
  autoRefresh: 60,         // segundos
  userName: '',
  curWeekStart: '',
  prevWeekStart: ''
};
```

---

## 7. Navegación y Secciones

| ID de sección | Nav label | Descripción |
|---------------|-----------|-------------|
| `dashboard` | Dashboard | KPIs por fase, progreso por fase, gráfica Avance General |
| `properties` | Propiedades | Tabla CRUD de propiedades con filtros y búsqueda |
| `progress` | Avances | Tarjetas detalladas de progreso por propiedad |
| `lineal` | Avance Lineal | Seguimiento semanal (8 semanas) por módulo/propiedad |
| `settings` | Configuración | Preferencias, comparativa semanal, datos Supabase |
| `tasks` | Tareas | Gestión de tareas por propiedad con impacto en abismo |
| `strategy` | Estrategia — Abismo | Vista general del abismo (overview, cards, heatmap, charts) |
| `abismo-propiedad` | Por Propiedad | Grid de propiedades con estado del abismo |
| `abismo-porpropiedad` | Abismo x Prop. | Vista detallada de curva de adopción por propiedad |

### 7.1 Flujo de Renderizado

```
showSection(id) 
  → goSection(id)          ← oculta todas las secciones, muestra la seleccionada
  → renderSection(id)      ← llama a la función de renderizado correspondiente
```

---

## 8. Dashboard — Componentes Actuales

1. **KPI Cards** (×5): Total propiedades, Fase 0, Fase 1, Fase 2, Fase 3 — con días promedio por fase.
2. **Progreso por Fase**: Cards con barra de progreso y semana estimada de cada fase.
3. **Avance General de Implementaciones**: Gráfica horizontal de barras apiladas (avance + pendiente), ordenada de mayor a menor. Coloreado por estado (verde ≥80%, naranja 50–79%, rojo <50%). Incluye KPI strip: Promedio Global, En Meta, Críticas.

> ⚠️ La **Comparativa Semanal** fue movida a la sección **Configuración** (no aparece en el Dashboard).

---

## 9. Sistema de Abismo (Chasm)

Basado en el modelo de Geoffrey Moore "Crossing the Chasm". Cada propiedad tiene un **porcentaje de sellado del abismo** calculado combinando:

- **Avance de módulos** (peso 20%): promedio de % de cumplimiento de módulos activos.
- **Avance de tareas** (peso 80%): promedio ponderado del progreso de tareas asignadas.

```js
combinedSeal = Math.min(100, Math.round(avgPct * 0.2 + taskSeal * 0.8))
```

**Zonas de adopción:**
- 🟢 Innovadores
- 🟩 Visionarios
- ⚡ ABISMO (brecha crítica)
- 🟡 Pragmáticos
- 🔴 Conservadores
- ⬜ Escépticos

---

## 10. Integración Supabase

### Credenciales (hardcodeadas en `app.js`)
```js
const SB_URL = 'https://dbtlyjaxqoezxbwvkimc.supabase.co';
const SB_KEY = 'sb_publishable_OOOitM2zGuo78KEO_K0Mug_3dkdh6z1';
```

### Funciones principales de sincronización
| Función | Descripción |
|---------|-------------|
| `connectSupabase()` | Inicializa cliente y valida conexión |
| `fetchAllData()` | Carga todas las propiedades y tareas desde Supabase |
| `insertSupabase(prop)` | Inserta nueva propiedad |
| `updateSupabase(id, prop)` | Actualiza propiedad existente |
| `deleteSupabase(id)` | Elimina propiedad |
| `saveTaskToSB(propId, task)` | Inserta nueva tarea |
| `updateTaskProgressSB(taskId, progress)` | Actualiza progreso de tarea |
| `deleteTaskSB(taskId)` | Elimina tarea |
| `startRealtime()` | Suscripción a cambios en tiempo real via Supabase Realtime |
| `startAutoRefresh()` | Polling automático configurable (default: 60s) |

### Persistencia offline
- `saveStateLocal()` / `loadStateLocal()`: Caché de propiedades en `localStorage` (solo activo sin Supabase).
- `localStorage` keys: `dn_sb_url`, `dn_sb_key`, `dn_settings`, `dn_state_props`, `dn_theme`.

---

## 11. Avance Lineal (Sección `lineal`)

Seguimiento de progreso semanal de cada módulo en cada propiedad durante 8 semanas. Meta: 80% de usabilidad en 8 semanas (~10%/semana).

**Sub-vistas:**
1. **Resumen Global** (`linealViewOverview`): Gráfica de líneas de progresión + cards por semana.
2. **Progreso por Módulo** (`linealViewModule`): Selector de propiedad + módulo, gráfica + tabla detallada.
3. **Comparativa Semanal** (`linealViewCompare`): Comparación entre dos semanas seleccionadas.
4. **Semáforo de Cumplimiento** (`linealViewSemaforo`): Grid de módulos con estado visual + radar.

**Cálculo de semana actual:**
```js
getPropWeek(p) → Math.min(8, Math.max(1, Math.floor(getDaysFromEntry(p) / 7) + 1))
```

---

## 12. Sistema de Temas (Claro / Oscuro)

Implementado via CSS custom properties. Activado con `data-theme="dark"` en `<body>`.

```css
/* Activación */
[data-theme="dark"] {
  --bg: #0d0a1a;
  --surface: #15102a;
  /* ... */
}
```

Toggle: `toggleTheme()` en `app.js`. Persistencia en `localStorage` (`dn_theme`).

---

## 13. Patrones de Código Importantes

### Selector de elemento por ID
```js
const $ = id => document.getElementById(id);
```

### Creación de gráficas
```js
makeChart(canvasId, type, labels, datasets, extra?, extraOpts?)
destroyChart(canvasId)
```

### Toast de notificación
```js
showToast('Mensaje', 'success' | 'error' | '')
```

### Cálculo de días desde ingreso
```js
getDaysFromEntry(property) → número de días desde entry_date hasta hoy
```

---

## 14. Cambios Recientes (Historial)

| Fecha | Cambio |
|-------|--------|
| 2026-04-22 | Refactorización completa: monolito 5,164 líneas → estructura modular (8 CSS + 1 JS) |
| 2026-04-22 | Eliminado nav item "Módulos" del sidebar |
| 2026-04-22 | Agregada gráfica "Avance General de Implementaciones" en Dashboard (reemplaza gráficas de módulos) |
| 2026-04-22 | Comparativa Semanal movida de Dashboard → Configuración |
| 2026-04-22 | Mejorado `<head>`: `preconnect` para fuentes, `meta description`, `theme-color`, `defer` en app.js |
| 2026-04-22 | Chart.js movido al final del `<body>` para mejor rendimiento |

---

## 15. ⚠️ Mantenimiento de este Documento

> **Este archivo debe actualizarse de forma constante.**

Cada vez que se realice un cambio significativo en el proyecto, se debe registrar aquí:

- ✅ **Nuevas secciones o vistas** agregadas al dashboard
- ✅ **Cambios en el modelo de datos** (nuevas tablas, campos o relaciones en Supabase)
- ✅ **Nuevos módulos** de software DomoNow incorporados
- ✅ **Cambios en la lógica de cálculo** (fórmulas de progreso, abismo, tareas)
- ✅ **Modificaciones a la estructura de archivos** (nuevos CSS, JS separados, etc.)
- ✅ **Cambios en credenciales o endpoints** de Supabase
- ✅ **Decisiones de arquitectura** tomadas y su justificación
- ✅ **Bugs conocidos** o limitaciones documentadas

### Cómo actualizar

1. Editar este archivo directamente en el proyecto.
2. Actualizar la fecha en el encabezado.
3. Agregar la entrada en la sección **14. Cambios Recientes**.
4. Si aplica, actualizar las secciones técnicas afectadas.

**Este documento es la fuente de verdad para cualquier desarrollador que retome el proyecto.  
Un documento desactualizado es peor que no tenerlo.**
