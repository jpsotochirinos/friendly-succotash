---
name: alega-tokens
description: >
  Variables CSS del design system de Alega: marca, surfaces, foreground, accent, sombras y
  colores de estado. Cuándo usar var() vs clases Tailwind. Dark mode automático con html.dark.
  Referencia antes de escribir cualquier propiedad CSS de color, background o shadow.
---

# Alega — Design tokens (variables CSS)

**Sandbox:** `/sandbox/foundations/tokens`
**Definición:** `apps/web/src/assets/main.css` (`:root` + `html.dark { ... }`)

Cargar siempre junto con [alega-typography](../alega-typography/SKILL.md) y [alega-ui-coherence](../alega-ui-coherence/SKILL.md).

---

## Tokens definidos

### Marca (brand)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--brand-abismo` | `#0d0f2b` | idem | Fondo más profundo, dark-mode base |
| `--brand-medianoche` | `#141852` | idem | Sidebar oscuro, headers |
| `--brand-real` | `#1b2080` | idem | Hover de accent oscuro |
| `--brand-zafiro` | `#2d3fbf` | idem | Color primario de marca. Eyebrows, links |
| `--brand-hielo` | `#c8ccf5` | idem | Tintes muy claros sobre blanco |
| `--brand-papel` | `#f2f3fb` | idem | Fondo de app en claro |

### Surfaces

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--surface-app` | `#f2f3fb` | `#0d0f2b` | Fondo global de la aplicación |
| `--surface-app-soft` | `#ffffff` | `#111434` | Variante suave del fondo |
| `--surface-raised` | `#ffffff` | `#141852` | Cards, modals, popovers, inputs |
| `--surface-sunken` | `#eceefa` | `#0a0c22` | Inputs interior, dialog headers, table headers |
| `--surface-border` | `rgba(20,24,82,0.1)` | `rgba(140,152,230,0.2)` | Bordes tenues (la mayoría de bordes) |
| `--surface-border-strong` | `rgba(20,24,82,0.18)` | `rgba(175,185,245,0.38)` | Bordes con más contraste |

### Foreground (texto)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--fg-default` | `#141852` | `#f2f3fb` | Texto principal |
| `--fg-muted` | `#4a5285` | `#d6daf8` | Subtítulos, metadata, helpers |
| `--fg-subtle` | `#6e76a6` | `rgba(214,218,248,0.72)` | Placeholders, captions, labels de tabla |
| `--fg-on-brand` | `#ffffff` | `#ffffff` | Texto sobre fondo brand |

### Accent (interactivo)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--accent` | `#2d3fbf` | `#949df8` | Botones primary, links, focus ring |
| `--accent-hover` | `#1b2080` | `#c4c9fc` | Hover sobre accent |
| `--accent-soft` | `rgba(45,63,191,0.1)` | `rgba(45,63,191,0.32)` | Background de badges, focus suave |
| `--accent-ring` | `rgba(45,63,191,0.35)` | `rgba(148,157,248,0.55)` | Outline de focus-visible |

### Sombras

| Token | Uso |
|-------|-----|
| `--shadow-sm` | Separación mínima. Cards internos. |
| `--shadow-md` | Cards, dropdowns flotantes. |
| `--shadow-lg` | Dialogs, popovers, menús. |

### Shell / layout

| Token | Uso |
|-------|-----|
| `--layout-border` | Borde del sidebar / cabecera principal |
| `--layout-sidebar-bg` | Fondo del sidebar (gradiente en dark) |
| `--layout-sidebar-shadow` | Sombra lateral del sidebar |

---

## Colores de estado (sin token CSS — usar directamente)

Estos colores no tienen `--*` token pero se usan consistentemente:

| Color | Tailwind | Hex | Uso |
|-------|----------|-----|-----|
| Success / Done | `bg-emerald-500` / `text-emerald-600` | `#10b981` | Stepper done, tag success |
| Warning / Dirty | `bg-amber-500` / `text-amber-600` | `#d97706` | Dirty-dot, tag warn |
| Danger / Error | `text-red-600` | `#dc2626` | Error inline, required asterisk |
| Danger dark | `dark:text-red-300` | `#fca5a5` | Error en dark mode |

---

## Reglas de uso

### Usar `var(--token)` para:
- Todos los colores de fondo (`background: var(--surface-raised)`)
- Todos los colores de texto (`color: var(--fg-default)`)
- Bordes (`border-color: var(--surface-border)`)
- Sombras (`box-shadow: var(--shadow-md)`)
- Accent en componentes interactivos

### Usar Tailwind para:
- **Colores de estado** que no tienen token: `bg-emerald-500`, `bg-amber-500`, `text-red-600`
- **Spacing** y **radius** (p-4, rounded-xl, gap-3, etc.)
- **Responsive** prefixes (sm:, md:, lg:)
- Clases de tipografía (text-sm, font-semibold, uppercase, etc.)

### Nunca:
- Hex suelto en estilos (`color: #4a5285`) → usar `var(--fg-muted)`
- `text-gray-*`, `text-blue-*` para texto de interfaz → usar `var(--fg-*)`
- `bg-white` o `bg-zinc-*` para superficies → usar `var(--surface-*)`
- Colores sin modo oscuro → todos los `var()` se adaptan automáticamente

---

## Dark mode

Los tokens se redefinen en `html.dark { ... }` en `main.css`. El selector `.dark` viene de PrimeVue config en `main.ts`:

```ts
theme: { options: { darkModeSelector: '.dark' } }
```

Y el toggle de tema está en `AppLayout.vue`. En el sandbox hay un toggle in-page en `/sandbox/foundations/tokens`.

---

## color-mix() para tintes

Para crear variantes intermedias entre un token y una superficie:

```css
/* Tinte suave de accent en background */
background: color-mix(in srgb, var(--accent) 12%, var(--surface-raised));

/* Borde con tinte de brand-zafiro */
border-color: color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));

/* chip-accent configurable */
background: color-mix(in srgb, var(--chip-accent, var(--accent)) 12%, var(--surface-raised));
```

---

## Skills relacionadas

- [alega-typography](../alega-typography/SKILL.md) — roles tipográficos que consumen estos tokens.
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — coherencia global, tokens en PageHeader.
- [alega-bespoke-patterns](../alega-bespoke-patterns/SKILL.md) — cómo se usan `--chip-accent`, `--kpi-accent` en patrones bespoke.
