# Implementación Landing Page Alega — Guía de Ejecución

**Destinatario:** Agente de IA con capacidad de editar código (Claude Code, Cursor, Aider, etc.).
**Objetivo:** Portar el diseño HTML/React del handoff `alega/project/` al proyecto Vue 3 + PrimeVue + Tailwind `friendly-succotash/`, creando una landing pública coherente con el dashboard existente.
**Proyecto base:** `friendly-succotash/` (monorepo pnpm + Turborepo, frontend en `apps/web/`).

---

## 0. Contexto obligatorio antes de ejecutar

### 0.1 Lee estos archivos primero (en orden)

1. `../alega/README.md` — instrucciones del handoff.
2. `../alega/chats/chat1.md` — transcripción completa con decisiones del usuario.
3. `../alega/project/Alega Landing.html` — punto de entrada React prototipo.
4. `../alega/project/Alega App.html` — prototipo de la app (referencia secundaria).
5. `../alega/project/assets/brand.css` — tokens CSS canónicos de marca.
6. `../alega/project/src/copy.jsx` — objeto `COPY` con toda la i18n (ES/EN).
7. `../alega/project/src/atoms.jsx` — `LogoMark`, `useReveal`, `Header`, `Footer`, `Logos`, iconos SVG.
8. `../alega/project/src/sections-hero.jsx` — `Hero` con `heroStyle` split/centered/chat.
9. `../alega/project/src/sections-features.jsx` — `Features` con tabs, `Demo`, `AssistantSection`.
10. `../alega/project/src/sections-diff.jsx` — `Differentiators` (6 cards).
11. `../alega/project/src/sections-rest.jsx` — `Benefits`, `Security`, `Compare`, `Testimonials`, `Pricing`, `FAQ`, `CTA`.
12. `../alega/project/src/dash-mock.jsx` — mini dashboard navegable embebido en el Hero/Demo.
13. `apps/web/src/theme/alegaPreset.ts` — preset PrimeVue ya alineado con marca.
14. `apps/web/tailwind.config.js` — tokens Tailwind ya extendidos con `brand.*`.
15. `apps/web/src/assets/main.css` — variables semánticas existentes (`--surface-*`, `--fg-*`, `--accent`).
16. `apps/web/src/router/index.ts` — router actual con guard `requiresAuth`.
17. `apps/web/src/layouts/AppLayout.vue` — layout del producto (NO tocar para landing).
18. `apps/web/src/i18n/index.ts` — infraestructura i18n existente.

### 0.2 Restricciones duras

- **No rompas rutas existentes.** La landing debe vivir en una ruta pública nueva, sin tocar `/auth/*`, `/documents/*`, `/trackables/*`, etc.
- **No dupliques tokens.** Si una variable CSS ya existe en `main.css`, no la redefinas en `brand.css`. Si falta, añádela.
- **No uses React.** Traduce todo JSX → Vue 3 `<script setup lang="ts">`.
- **Fuentes web:** Inter + JetBrains Mono deben cargarse. Preferir `@fontsource/inter` + `@fontsource/jetbrains-mono` (paquetes npm) antes que CDN Google Fonts.
- **No mezcles estilos del producto con la landing.** La landing no usa `AppLayout.vue`. Cada vista de producto conserva su shell actual.
- **Coherencia visual con dashboard:** el `DashPreview` embebido debe reflejar sidebar blanco, header gradiente Medianoche→Real, cards blancas, KPIs, "Tareas con prioridad", "Actividades recientes". No inventes copys — reutiliza `COPY` del chat.
- **Accesibilidad:** `:focus-visible` conservado, semántica correcta (`<header>`, `<main>`, `<section>`, `<footer>`, encabezados jerárquicos `h1→h3`), `alt` en imágenes, `aria-label` en botones icónicos.
- **Responsive:** breakpoints Tailwind `sm 640 / md 768 / lg 1024 / xl 1280`. El Hero split colapsa a stack en <lg.

### 0.3 Stack confirmado

- Vue 3.4+ con `<script setup lang="ts">` (Composition API)
- PrimeVue 4 (preset `AlegaPreset` ya definido)
- Tailwind CSS (darkMode `class`)
- Vite + `vue-router` 4 + `vue-i18n` (infraestructura i18n ya en `apps/web/src/i18n/`)
- Pinia
- TypeScript estricto

---

## 1. Instalar dependencias de fuentes

```bash
cd apps/web
pnpm add @fontsource/inter @fontsource/jetbrains-mono
```

Si el proyecto ya tiene `@fontsource/inter`, saltar esa instalación. Verifica `apps/web/package.json` antes.

En `apps/web/src/main.ts` añade en la parte superior (después del `createApp` import, antes de cualquier CSS):

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
```

---

## 2. Portar tokens de marca CSS

### 2.1 Crear `apps/web/src/assets/brand.css`

Copia íntegro el contenido de `../alega/project/assets/brand.css` a `apps/web/src/assets/brand.css`, con dos ajustes:

1. **Prefija cualquier variable que colisione con `main.css`.** Si `main.css` ya define `--accent`, `--surface`, etc., NO las redefinas en `brand.css`. En su lugar, mapea dentro de `brand.css`:
   ```css
   :root {
     --brand-abismo: #0D0F2B;
     --brand-medianoche: #141852;
     --brand-real: #1B2080;
     --brand-zafiro: #2D3FBF;
     /* ... */
   }
   ```
2. **Mantén clases utilitarias** (`.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.chip`, `.eyebrow`, `.h1`, `.h2`, `.h3`, `.lead`, `.muted`, `.mono`, `.bg-brand-gradient`, `.bg-brand-gradient-soft`, `.text-brand-gradient`, `.reveal`, `.placeholder`, `.section`, `.container`). Renombra a `.landing-*` si colisionan con clases globales (`grep "\\.btn"` en `main.css` antes).

### 2.2 Importar `brand.css`

En `apps/web/src/main.ts` después de `main.css`:

```ts
import './assets/main.css';
import './assets/brand.css';
```

### 2.3 Verificar Tailwind

`tailwind.config.js` ya contiene `colors.brand.{abismo,medianoche,real,zafiro,hielo,papel}`. No tocar.

Si falta `fontFamily.mono`, añade:

```js
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
},
```

---

## 3. Estructura de archivos a crear

Crea exactamente esta estructura bajo `apps/web/src/`:

```
views/
  LandingView.vue                          # contenedor principal de la landing

components/
  landing/
    LandingHeader.vue                      # nav fijo, logo, lang/theme toggles, CTAs
    LandingFooter.vue                      # footer con 4 columnas + copyright
    HeroSplit.vue                          # hero estilo "texto + dashboard"
    HeroCentered.vue                       # hero centrado + dashboard debajo
    HeroChat.vue                           # hero con asistente en lugar de dashboard
    HeroWrapper.vue                        # switch por heroStyle
    LogosRow.vue                           # fila de logos placeholders
    FeaturesTabs.vue                       # bloque Features con 4 tabs
    Differentiators.vue                    # sección "Qué nos hace diferentes" (6 cards)
    DemoShowcase.vue                       # mockup grande del dashboard navegable
    AssistantSection.vue                   # sección con chat demo del asistente
    Benefits.vue                           # 4 KPIs en gradiente de marca
    Security.vue                           # 4 pilares seguridad + badges
    Compare.vue                            # tabla Alega vs Excel vs SaaS genérico
    Testimonials.vue                       # 3 testimonios
    Pricing.vue                            # 4 tiers, toggle mensual/anual
    FaqAccordion.vue                       # FAQ con accordion
    CtaFinal.vue                           # CTA final en gradiente
    DashPreview.vue                        # mini dashboard navegable embebido
    AssistantChat.vue                      # componente de chat reutilizable
    LogoMark.vue                           # SVG logo de Alega (circular + mark)
    IconSvg.vue                            # set de iconos usados (bolt, check, calendar, shield, bell, flow, sparkle, doc, lock, arrow)
    RevealOnScroll.vue                     # wrapper que aplica `.reveal.in` al entrar en viewport

composables/
  useReveal.ts                             # IntersectionObserver global
  useLandingTheme.ts                       # toggle claro/oscuro persistido en localStorage
  useLandingTweaks.ts                      # color primario, density, heroStyle persistidos

i18n/
  locales/
    landing.es.ts                          # copy en español (extraído de COPY.es)
    landing.en.ts                          # copy en inglés (extraído de COPY.en)

assets/
  brand.css                                # ya creado en paso 2
```

---

## 4. Extracción de la i18n

### 4.1 Crear `apps/web/src/i18n/locales/landing.es.ts`

Traduce el objeto `COPY.es` de `../alega/project/src/copy.jsx:2-172` a TypeScript, exportado como default. Estructura literal, sin modificar claves ni textos:

```ts
export default {
  nav: { features: 'Producto', pricing: 'Precios', security: 'Seguridad', faq: 'FAQ', login: 'Iniciar sesión', cta: 'Probar Alega' },
  hero: { eyebrow: '...', title: '...', titleAccent: '...', sub: '...', cta: '...', ctaSecondary: '...', meta: '...' },
  logos: '...',
  features: { eyebrow, title, sub, tabs: [...] },
  demo: { eyebrow, title, sub },
  assistant: { eyebrow, title, sub, placeholder, send, hint, starters: [...] },
  benefits: { eyebrow, title, items: [...] },
  differentiators: { eyebrow, title, sub, items: [...] },
  security: { eyebrow, title, sub, items: [...] },
  compare: { eyebrow, title, rows: [...], headers: [...] },
  testimonials: { eyebrow, title, items: [...] },
  pricing: { eyebrow, title, sub, monthly, yearly, save, perUser, billedYearly: '...', contact, pick, plans: [...] },
  faq: { eyebrow, title, items: [...] },
  cta: { title, sub, primary, secondary },
  footer: { tag, cols: [...], copyright },
} as const;
```

**Importante:** `COPY.es.pricing.billed` es una función `(p) => \`Facturado anualmente: ${p} €/año por usuario\``. Conviértela a string con placeholder `{price}` y resuélvelo con `vue-i18n` (`t('pricing.billedYearly', { price })`).

### 4.2 Crear `apps/web/src/i18n/locales/landing.en.ts`

Análogo con `COPY.en` de `copy.jsx:173-277`.

### 4.3 Registrar en `apps/web/src/i18n/index.ts`

Lee la estructura existente. Si usa namespace/merge por locale, añade:

```ts
import landingEs from './locales/landing.es';
import landingEn from './locales/landing.en';

// dentro del messages:
es: { ...existing.es, landing: landingEs },
en: { ...existing.en, landing: landingEn },
```

Todos los `t()` de los componentes landing usarán el prefijo `landing.*`.

---

## 5. Crear la ruta pública

Edita `apps/web/src/router/index.ts`:

1. Añade el import:
   ```ts
   const LandingView = () => import('../views/LandingView.vue');
   ```

2. Añade como **primera entrada** dentro de `routes: [ ... ]`:
   ```ts
   {
     path: '/',
     name: 'landing',
     component: LandingView,
     meta: { public: true },
   },
   ```

3. La ruta `/` actual (AppLayout con `name: 'home'` en el child vacío) debe pasar a `/app`:
   ```ts
   {
     path: '/app',
     component: AppLayout,
     meta: { requiresAuth: true },
     children: [
       { path: '', name: 'home', component: () => import('../views/HomeView.vue') },
       // ... resto sin cambios
     ],
   },
   ```
   Cualquier ruta interna que tenga `path: 'trackables'` ahora se servirá en `/app/trackables`. Revisa `apps/web/src/navigation/` y **todos** los `router.push`, `<router-link :to="...">`, `useRouter().push` del código para reemplazar literales `/trackables`, `/clients`, etc., por `{ name: 'nombre-ruta' }` (preferido) o prefijar con `/app`.

4. Ajusta el `beforeEach`:
   ```ts
   if (to.meta.public) return true;
   if (to.name === 'landing') return true;
   ```
   Si un usuario autenticado entra a `/`, redirígelo a `/app`:
   ```ts
   if (to.name === 'landing' && authStore.isAuthenticated) {
     return { path: '/app' };
   }
   ```
   **Decisión:** si el usuario prefiere que la landing sea visible siempre (incluso autenticado), omite la redirección. Confirma con el usuario si hay ambigüedad.

5. Login/register: si `to.query.redirect` apuntaba a `/`, ahora debe apuntar a `/app`.

---

## 6. Traducir JSX → Vue (regla general)

Para cada archivo `.jsx` del handoff, aplica:

| React / JSX | Vue 3 |
|-------------|-------|
| `className` | `class` |
| `onClick={fn}` | `@click="fn"` |
| `{foo && <X/>}` | `<X v-if="foo"/>` |
| `{arr.map(x => <Y key={x.id}/>)}` | `<Y v-for="x in arr" :key="x.id"/>` |
| `useState` | `ref()` / `reactive()` |
| `useEffect(fn, [])` | `onMounted(fn)` |
| `useEffect(fn, [dep])` | `watch(dep, fn)` |
| `useRef` | `ref<HTMLElement|null>(null)` |
| `{t.foo}` | `{{ t('landing.foo') }}` |
| Inline `style={{ color: 'red' }}` | `:style="{ color: 'red' }"` |

Conserva clases CSS (`.card`, `.btn-primary`, `.eyebrow`, `.bg-brand-gradient`, etc.). No las reemplaces por utilidades Tailwind salvo que el JSX ya las use en clase.

---

## 7. Componentes landing — especificación detallada

### 7.1 `LogoMark.vue`

Copia el SVG de `../alega/project/src/atoms.jsx` (función `LogoMark`). Debe aceptar prop `size` (default 24) y respetar `currentColor` para que herede del contenedor.

```vue
<script setup lang="ts">
defineProps<{ size?: number }>();
</script>
<template>
  <svg :width="size ?? 24" :height="size ?? 24" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <!-- pega paths exactos de atoms.jsx LogoMark -->
  </svg>
</template>
```

### 7.2 `IconSvg.vue`

Prop `name: 'bolt' | 'check' | 'calendar' | 'shield' | 'bell' | 'flow' | 'sparkle' | 'doc' | 'lock' | 'arrow' | ...`. Map interno `name → paths`. Copia cada SVG del helper `Icon` de `atoms.jsx`/`sections-*.jsx`.

### 7.3 `RevealOnScroll.vue`

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const el = ref<HTMLElement|null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!el.value) return;
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).classList.add('in');
        observer?.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  observer.observe(el.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div ref="el" class="reveal"><slot /></div>
</template>
```

### 7.4 `useReveal.ts` (alternativa global)

Si prefieres no envolver cada sección: expone un composable que busca todos los `.reveal` en el `onMounted` de `LandingView` y los observa. Mantén solo una de las dos rutas.

### 7.5 `useLandingTheme.ts`

```ts
import { ref, watch, onMounted } from 'vue';

export function useLandingTheme() {
  const theme = ref<'light' | 'dark'>('light');
  onMounted(() => {
    const saved = localStorage.getItem('alega-theme') as 'light' | 'dark' | null;
    theme.value = saved ?? 'light';
    document.documentElement.setAttribute('data-theme', theme.value);
  });
  watch(theme, (v) => {
    localStorage.setItem('alega-theme', v);
    document.documentElement.setAttribute('data-theme', v);
  });
  const toggle = () => { theme.value = theme.value === 'light' ? 'dark' : 'light'; };
  return { theme, toggle };
}
```

### 7.6 `useLandingTweaks.ts`

Expón: `primary` (`'zafiro' | 'real' | 'cobalt' | 'lavender'`), `heroStyle` (`'split' | 'centered' | 'chat'`), `density` (`'compact' | 'normal' | 'spacious'`). Persistir `density` en `data-density` del `<html>`, aplicar `primary` a variables CSS `--accent`, `--zafiro-600`, `--accent-soft` (variantes copiadas de `Alega Landing.html:37-42`).

### 7.7 `LandingHeader.vue`

Requisitos exactos (de `atoms.jsx` `Header`):

- `<header>` sticky top, fondo `var(--surface)` con `backdrop-filter: blur(8px)` y 88% opacidad, borde inferior `1px solid var(--border)`, z-index 50.
- Interior: `.container` flex, alineado, altura 68px.
- Izquierda: `LogoMark` 28px + wordmark "Alega" en `font-weight: 700`, `letter-spacing: -0.01em`, `font-size: 18px`.
- Centro (oculto en `<md`): nav con links `#features`, `#pricing`, `#security`, `#faq`, texto `t('landing.nav.*')`.
- Derecha: selector lang ES/EN (dropdown), toggle tema (icono sol/luna), link "Iniciar sesión" → `/auth/login`, botón primario "Probar Alega" → `/auth/register`.
- Mobile (<md): menú hamburguesa (usa `Drawer` de PrimeVue o implementación propia).

### 7.8 `HeroWrapper.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useLandingTweaks } from '@/composables/useLandingTweaks';
import HeroSplit from './HeroSplit.vue';
import HeroCentered from './HeroCentered.vue';
import HeroChat from './HeroChat.vue';

const { heroStyle } = useLandingTweaks();
</script>
<template>
  <HeroSplit v-if="heroStyle === 'split'"/>
  <HeroCentered v-else-if="heroStyle === 'centered'"/>
  <HeroChat v-else-if="heroStyle === 'chat'"/>
</template>
```

### 7.9 `HeroSplit.vue`

De `sections-hero.jsx` función `Hero` rama `split`:

- `<section class="section">` con fondo `.bg-brand-gradient-soft`.
- Grid 2 cols en `lg+` (7fr/5fr), stack en `<lg`.
- Izquierda: `.eyebrow` "Plataforma para despachos legales", `<h1 class="h1">` con `titleAccent` en `.text-brand-gradient`, `<p class="lead">`, dos botones (`btn btn-primary btn-lg` + `btn btn-ghost btn-lg`), fila de meta con `.mono` y chips.
- Derecha: `DashPreview` (componente 7.19) con animación `floating` sutil (`transform: translateY` en `@keyframes`) y sombra `var(--shadow-lg)`.
- Tarjetas flotantes decorativas (ver `sections-hero.jsx`): 3 chips absolutas con iconos y stats (`"–62% admin"`, `"0 plazos perdidos"`, `"3.4× casos"`). Mantener `position: absolute` dentro de un contenedor `position: relative` que engloba el dashboard.

### 7.10 `HeroCentered.vue`

Variante con texto centrado (max-width 760px) y `DashPreview` debajo full-width.

### 7.11 `HeroChat.vue`

Variante con texto a la izquierda y `AssistantChat` funcional a la derecha.

### 7.12 `LogosRow.vue`

De `atoms.jsx` `Logos`: texto pequeño centrado arriba, fila de 5-6 placeholders (divs con `background: color-mix(in oklab, var(--border-strong) 40%, transparent)`, ancho 120px, alto 28px, border-radius 6px, opacidad 0.7, hover opacidad 1).

### 7.13 `FeaturesTabs.vue`

De `sections-features.jsx` `Features`:

- 4 tabs: Expedientes, Asistente IA, Calendario, Plantillas & flujos.
- Usa `<Tabs>` de PrimeVue 4 (o implementación manual con `ref` activo).
- Cada tab renderiza: título, body, bullets (lista con checkmarks SVG) y un mockup visual específico (placeholders monospace o ilustración SVG).
- Layout: tabs horizontales en `md+`, acordeón vertical en mobile.

### 7.14 `Differentiators.vue`

De `sections-diff.jsx`:

- Grid 3×2 de cards (en `lg`), 2×3 en `md`, 1×6 en mobile.
- Cada card: icono en color propio (del array `items[].color`), título (`h3`), descripción, hover eleva (`.card-hover`).
- Items exactos (claves `t('landing.differentiators.items')`): revisiones criterios, alertas SINOE, SPIJ, copiloto editor, versiones e historial, carpetas + roles.

### 7.15 `DemoShowcase.vue`

De `sections-features.jsx` `Demo`:

- Título grande + lead.
- Debajo: `DashPreview` en tamaño grande (~1100px ancho, escalable responsivo) con marco browser fake (barra superior con 3 puntos rojo/amarillo/verde, barra de URL con `alega.app/dashboard`).

### 7.16 `AssistantSection.vue`

De `sections-features.jsx` `AssistantSection`:

- Dos columnas: izq texto explicativo + eyebrow + starters (chips clickables que rellenan input), der `AssistantChat` con burbujas, input grande, botón "Enviar" en gradiente.
- El chat es un demo local sin backend real en primera iteración (mensajes mock). Segunda iteración puede conectar a un endpoint `/api/assistant/demo` si existe.

### 7.17 `Benefits.vue`

De `sections-rest.jsx`:

- Fondo `.bg-brand-gradient` (Medianoche→Real→Zafiro).
- Texto blanco.
- 4 KPIs en grid, cada uno con icono, cifra grande (48px, semibold), descripción corta.
- Números de `COPY.es.benefits.items`: `–62%`, `3,4×`, `0`, `100%`.

### 7.18 `Security.vue`, `Compare.vue`, `Testimonials.vue`, `Pricing.vue`, `FaqAccordion.vue`, `CtaFinal.vue`, `LandingFooter.vue`

Para cada uno, lee el componente homónimo en `sections-rest.jsx` y replícalo en Vue.

- **Pricing**: toggle mensual/anual con switch PrimeVue (`ToggleSwitch` o implementación propia). 4 tiers en grid. Tier "Pro" marcado con `featured: true` → borde `var(--accent)` y badge "Más popular". Pricing mensual muestra precio mensual, pricing anual muestra precio/mes con ahorro 20%.
- **FAQ**: acordeón PrimeVue `Accordion` o implementación con `<details>` nativo. 6 preguntas.
- **Compare**: `<table>` semántica. Columnas: feature + 3 opciones. Celdas: check verde para `true`, x gris para `false`, texto literal para strings.
- **Testimonials**: 3 cards con comilla grande, texto, autor y rol.
- **CtaFinal**: sección con `.bg-brand-gradient`, título centrado, 2 botones.
- **LandingFooter**: 4 columnas + copyright. Logo + tagline a la izquierda. Links de cada columna como `<ul>`.

### 7.19 `DashPreview.vue` (crítico — componente estrella)

De `../alega/project/src/dash-mock.jsx`. Debe ser una mini-app navegable:

- Contenedor: `border-radius: var(--radius-xl)`, `box-shadow: var(--shadow-lg)`, `border: 1px solid var(--border)`, `overflow: hidden`, ancho 100%, aspect-ratio ~16/10.
- **Layout interno:**
  - Sidebar izquierda (200px): fondo blanco, logo Alega arriba, 8 items de navegación (Inicio, Expedientes, Notificaciones, Clientes, Calendario, Cola de revisiones, Plantillas, Papelera), ítem activo con fondo `var(--accent-soft)` y texto `var(--accent)`.
  - Header superior: gradiente `linear-gradient(90deg, var(--medianoche), var(--real))`, altura 56px, texto blanco, avatar usuario a la derecha ("Jean Pierre" + chevron).
  - Main: fondo `var(--papel-soft)`, padding 20px, contenido cambia según item activo.
- **Vistas internas (mínimo viable):**
  - Inicio: saludo "Buenos días, Jean Pierre" + 4 KPIs en fila + tabla "Tareas con prioridad" (3 filas) + "Actividades recientes" (3 filas con avatares).
  - Expedientes: tabla con 5 filas (nº, cliente, materia, estado, plazo).
  - Notificaciones: lista con 4 items (SINOE, plazo, revisión, comentario), filtros arriba.
  - Clientes: tabla con 4 filas.
  - Calendario: grid mensual 7×5 con 3-4 eventos de colores + mini calendario lateral.
  - Cola de revisiones: tabla con 3 filas.
  - Plantillas: grid de 6 cards.
  - Papelera: tabla con 2 filas y botón "Restaurar".
- **Interacción:** clic en item de sidebar → cambia `activeView` (estado interno `ref`). Sin routing, sin persistencia, sin llamadas API — todo mock.
- **Responsive:** en `<md` se esconde la sidebar y se muestra un botón menú que la abre como drawer.

Para ahorrar tiempo, mantén los datos mock en `components/landing/dash-preview-data.ts` (copia del JSON de `app-data.jsx` filtrando solo lo necesario).

### 7.20 `AssistantChat.vue`

Chat UI con:

- Burbujas (usuario derecha en `var(--accent)` con texto blanco, asistente izquierda en `var(--surface-muted)` con texto `var(--text)`).
- Input textarea autoexpansible.
- Botón enviar con gradiente `.bg-brand-gradient`.
- 3 "starters" (chips) clickables que insertan texto en el input.
- Tag "trackable-flow" pequeño tipo chip debajo del input.
- FAB (floating action button) en esquina si se usa como widget standalone.
- Lógica de mensajes mock: al enviar, añade mensaje usuario y tras 800ms añade respuesta canned (1 de 3 textos preescritos).
- Si existe un endpoint de IA real en el backend (`apps/api/src/modules/assistant/` — verifica), conectarlo en una segunda iteración con streaming SSE.

---

## 8. Ensamblar `LandingView.vue`

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useLandingTheme } from '@/composables/useLandingTheme';
import { useLandingTweaks } from '@/composables/useLandingTweaks';
import LandingHeader from '@/components/landing/LandingHeader.vue';
import HeroWrapper from '@/components/landing/HeroWrapper.vue';
import LogosRow from '@/components/landing/LogosRow.vue';
import FeaturesTabs from '@/components/landing/FeaturesTabs.vue';
import Differentiators from '@/components/landing/Differentiators.vue';
import DemoShowcase from '@/components/landing/DemoShowcase.vue';
import AssistantSection from '@/components/landing/AssistantSection.vue';
import Benefits from '@/components/landing/Benefits.vue';
import Security from '@/components/landing/Security.vue';
import Compare from '@/components/landing/Compare.vue';
import Testimonials from '@/components/landing/Testimonials.vue';
import Pricing from '@/components/landing/Pricing.vue';
import FaqAccordion from '@/components/landing/FaqAccordion.vue';
import CtaFinal from '@/components/landing/CtaFinal.vue';
import LandingFooter from '@/components/landing/LandingFooter.vue';

useLandingTheme();
useLandingTweaks();

onMounted(() => {
  document.documentElement.lang = 'es';
});
</script>

<template>
  <div class="landing-root">
    <LandingHeader/>
    <main>
      <HeroWrapper/>
      <LogosRow/>
      <section id="features"><FeaturesTabs/></section>
      <Differentiators/>
      <DemoShowcase/>
      <AssistantSection/>
      <Benefits/>
      <section id="security"><Security/></section>
      <Compare/>
      <Testimonials/>
      <section id="pricing"><Pricing/></section>
      <section id="faq"><FaqAccordion/></section>
      <CtaFinal/>
    </main>
    <LandingFooter/>
  </div>
</template>

<style scoped>
.landing-root { min-height: 100vh; }
</style>
```

---

## 9. SEO y meta

En `apps/web/index.html`, añade `<meta>` tags si el proyecto no usa `@unhead/vue` ya. Si usa `@unhead/vue` o `unhead`, en `LandingView.vue`:

```ts
import { useHead } from '@unhead/vue';
useHead({
  title: 'Alega — El sistema operativo de tu despacho',
  meta: [
    { name: 'description', content: 'Alega unifica expedientes, calendarios, plantillas y un asistente con IA.' },
    { property: 'og:title', content: 'Alega' },
    { property: 'og:description', content: 'Plataforma para despachos legales.' },
    { property: 'og:image', content: '/og-image.png' },
  ],
});
```

Si no existe `@unhead/vue`, instalarlo o usar `document.title = ...` dentro de `onMounted`.

---

## 10. Testing manual

### 10.1 Arranque local

```bash
cd ../..  # raíz del monorepo
pnpm docker:up
pnpm db:migrate
pnpm dev
```

Abre `http://localhost:5173/` (puerto por defecto Vite; revisa `vite.config.ts`).

### 10.2 Checklist de QA visual

Comparar pixel-a-pixel contra `alega/project/Alega Landing.html` (abrir en browser separado).

- [ ] Fuentes Inter cargadas (sin FOUT visible de fallback).
- [ ] Paleta correcta en modo claro: fondos `#F8F9FD`/blancos, texto `#141852`.
- [ ] Paleta correcta en modo oscuro: fondo `#0D0F2B`, texto `#EDEEF9`, superficies `#151839`.
- [ ] Toggle tema persiste tras reload.
- [ ] Toggle ES/EN cambia textos sin recargar.
- [ ] Hero muestra dashboard flotante con sombra.
- [ ] `DashPreview`: clic en cada item del sidebar cambia la vista sin recargar.
- [ ] Features: clic en cada tab cambia contenido.
- [ ] Differentiators: 6 cards, hover eleva.
- [ ] Pricing: toggle mensual/anual ajusta precios (x0.8 aprox).
- [ ] FAQ: cada pregunta expande/colapsa.
- [ ] Animaciones de reveal al scroll.
- [ ] Responsive: sin overflow horizontal en 360px, 768px, 1024px, 1440px.
- [ ] Navegación ancla (#features, #pricing, etc.) scrollea suave.
- [ ] Links de CTA van a `/auth/register` y `/auth/login`.
- [ ] Botón en header "Probar Alega" abre `/auth/register`.
- [ ] Footer: links devuelven a anclas o stub.
- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90.

### 10.3 Testing automatizado

- Unit: no imprescindible para landing (componentes estáticos). Si el proyecto ya tiene Vitest configurado, añade 1-2 smoke tests para `LandingView` (render sin errores) y `DashPreview` (cambio de vista al clic).
- E2E: añade `apps/web/e2e/landing.spec.ts` con Playwright:
  ```ts
  import { test, expect } from '@playwright/test';

  test('landing renders and tabs work', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('El sistema operativo');
    await page.click('text=Asistente IA');
    await expect(page.locator('text=Un asistente que conoce tu despacho')).toBeVisible();
  });
  ```

---

## 11. Criterios de aceptación finales

Para que la implementación se considere completa:

1. La ruta `/` muestra la landing sin autenticación.
2. La app interna sigue funcionando en `/app/*` con todos los permisos y guards intactos.
3. La landing se ve pixel-perfect contra `alega/project/Alega Landing.html` en escritorio (`1440×900`).
4. Modo claro y oscuro ambos funcionales, persistidos en `localStorage`.
5. Selector ES/EN funcional y persistido.
6. `DashPreview` navegable con 8 vistas mínimas.
7. Tipado TypeScript estricto sin `any` (excepto en integraciones con librerías legacy si es inevitable).
8. `pnpm lint` y `pnpm --filter @tracker/web test` pasan.
9. No se han introducido warnings nuevos en consola del navegador.
10. Commits atómicos siguiendo Conventional Commits (`feat(web): add landing page`, `feat(web): add dash preview component`, etc.).

---

## 12. Orden de ejecución sugerido (PR por paso)

1. **feat(web): brand tokens + fonts** — pasos 1-2. PR pequeño, sin cambios visuales.
2. **feat(web): landing route scaffold** — paso 5 (router) + `LandingView.vue` vacío con "Hello". Confirma que no rompe la app.
3. **feat(web): landing i18n copy** — paso 4.
4. **feat(web): landing atoms** — `LogoMark`, `IconSvg`, `RevealOnScroll`, composables.
5. **feat(web): landing header/footer** — 7.7, 7.18.
6. **feat(web): landing hero + logos** — 7.8-7.12.
7. **feat(web): dash preview** — 7.19 (el más grande; considera sub-PRs por vista).
8. **feat(web): features + differentiators + demo** — 7.13-7.15.
9. **feat(web): assistant section + chat** — 7.16, 7.20.
10. **feat(web): benefits + security + compare + testimonials** — 7.17-7.18.
11. **feat(web): pricing + faq + cta** — 7.18.
12. **feat(web): landing SEO + polish** — paso 9, ajustes responsive finales, Lighthouse.
13. **test(web): landing e2e** — paso 10.3.

---

## 13. Pitfalls conocidos (no caer en ellos)

- **No vuelvas a montar `<BrowserRouter>` o `<ReactDOM.createRoot>`.** El proyecto es Vue; React sólo existe en el handoff.
- **No uses `window.parent.postMessage`** del sistema de tweaks de claude.ai/design: es propio del sandbox de diseño, no forma parte del producto final.
- **No instales `react`, `react-dom`, ni `@babel/standalone`** aunque los imports aparezcan en los HTML.
- **No copies las etiquetas `<script src="...unpkg...">` de los HTML.** Son del prototipo.
- **Clases Tailwind vs CSS:** si una clase como `.card` colisiona con algún plugin Tailwind o librería UI, renómbrala a `.landing-card`. Revisa `@apply` reglas existentes en `main.css`.
- **PrimeVue `Button` vs `<button>`:** para botones CTA de la landing usa `<button class="btn btn-primary">` (HTML nativo) — así mantienes consistencia con `brand.css`. Reserva PrimeVue `Button` para el producto interno.
- **`DashPreview` dentro del hero puede saturar el DOM** en móviles débiles. Carga `DashPreview` solo en `lg+` usando `v-if="isDesktop"` con media-query reactiva, y en `<lg` muestra una imagen estática PNG o un placeholder más ligero.
- **Asegura que `document.documentElement.setAttribute('data-theme', ...)` no rompa el preset PrimeVue** (que espera `class="p-dark"` o similar para su dark mode). Revisa `apps/web/src/main.ts` cómo se activa el dark mode de PrimeVue y alinea ambos: o mapea `data-theme="dark"` a también añadir `class="p-dark"` en `<html>`, o usa solo el sistema existente.
- **i18n `vue-i18n`:** si el proyecto usa `legacy: false` (Composition API), los `t()` devuelven strings. Si usa `legacy: true`, mismo resultado pero importación distinta. Revisa `i18n/index.ts` antes de usar `useI18n()`.

---

## 14. Referencias rápidas

| Handoff | Destino |
|---------|---------|
| `alega/project/assets/brand.css` | `apps/web/src/assets/brand.css` |
| `alega/project/src/copy.jsx` | `apps/web/src/i18n/locales/landing.{es,en}.ts` |
| `alega/project/src/atoms.jsx` | `components/landing/{LogoMark,IconSvg,LandingHeader,LandingFooter,LogosRow,RevealOnScroll}.vue` + `composables/useReveal.ts` |
| `alega/project/src/sections-hero.jsx` | `components/landing/{HeroSplit,HeroCentered,HeroChat,HeroWrapper}.vue` |
| `alega/project/src/sections-features.jsx` | `components/landing/{FeaturesTabs,DemoShowcase,AssistantSection}.vue` |
| `alega/project/src/sections-diff.jsx` | `components/landing/Differentiators.vue` |
| `alega/project/src/sections-rest.jsx` | `components/landing/{Benefits,Security,Compare,Testimonials,Pricing,FaqAccordion,CtaFinal}.vue` |
| `alega/project/src/dash-mock.jsx` | `components/landing/DashPreview.vue` + `components/landing/dash-preview-data.ts` |
| `alega/project/src/app-data.jsx` | extraer datos mock a `components/landing/dash-preview-data.ts` |

---

## 15. Qué hacer si algo es ambiguo

- Lee primero `alega/chats/chat1.md` completo — suele contener la decisión final del usuario.
- Si persiste la ambigüedad, pregunta al usuario **antes** de inventar. Especialmente en:
  - Si la landing debe reemplazar la ruta `/` o ser `/landing`.
  - Si se conecta el chat del asistente con IA real o solo mock.
  - Si se debe soportar móvil completo en primera iteración o solo desktop.
  - Si el `DashPreview` debe usar componentes reales del producto o un mock aparte.

---

**Fin.**
