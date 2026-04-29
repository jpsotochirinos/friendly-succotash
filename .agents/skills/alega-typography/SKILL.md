---
name: alega-typography
description: >
  Escala tipográfica completa de Alega (Inter). Roles, clases Tailwind canónicas, tamaños en px,
  tokens de color semántico, font-mono-num para números legales y reglas de accesibilidad.
  Referencia antes de usar cualquier texto en views, dialogs, tables o forms.
---

# Alega — Tipografía

**Sandbox:** `/sandbox/foundations/typography`
**Fuente:** Inter — cargada desde `rsms.me/inter/inter.css` en `apps/web/index.html`.
Para offline-first: `@fontsource-variable/inter` + `import '@fontsource-variable/inter'` en `main.ts`.

Cargar siempre junto con [alega-tokens](../alega-tokens/SKILL.md) y [alega-ui-coherence](../alega-ui-coherence/SKILL.md).

---

## Escala de roles

| Rol | Clase Tailwind | Tamaño | Color | Uso |
|-----|----------------|--------|-------|-----|
| **Display** | `text-3xl font-semibold tracking-tight` | 30px | `var(--fg-default)` | Onboarding / landing únicamente |
| **Page title H1** | `text-xl sm:text-2xl font-semibold leading-tight` | 20-24px | `var(--fg-default)` | `PageHeader` — un solo H1 por vista |
| **Section H2** | `text-base font-semibold` | 16px | `var(--fg-default)` | Secciones de sandbox, settings |
| **Card / dialog title** | `text-[1.0625rem] font-semibold leading-tight` | 17px | `var(--fg-default)` | `.matter-dialog-title`, h3 de card |
| **Eyebrow (brand)** | `text-[0.6875rem] font-semibold uppercase tracking-[0.06em]` | 11px | `var(--brand-zafiro)` (claro) / `var(--accent)` (dark) | Dialog eyebrow, stepper |
| **Eyebrow (page)** | `text-xs font-semibold uppercase tracking-widest` | 12px | `var(--fg-subtle)` | Eyebrow muted sobre PageHeader |
| **Subtitle / lead** | `text-sm` | 14px | `var(--fg-muted)` | Subtítulo bajo H1 |
| **Body** | `text-sm` | 14px | `var(--fg-default)` | Párrafos, cuerpo de formularios |
| **Step hint** | `text-[0.8125rem]` | 13px | `var(--fg-muted)` | `.matter-dialog-stephint` |
| **Field label** | `text-[0.8125rem] font-medium` | 13px | `var(--fg-default)` | Labels de campos (`.matter-field-label`) |
| **Helper** | `text-xs` | 12px | `var(--fg-subtle)` | Helper text bajo campo (`.matter-field-help`) |
| **Caption / table header** | `text-[0.6875rem] font-semibold uppercase tracking-[0.06em]` | 11px | `var(--fg-subtle)` | Encabezados de columna en DataTable |
| **Tag chip text** | `text-[10px] font-medium uppercase tracking-wide` | 10px | (depende de severity) | Pills de tipo, status chips |
| **Code inline** | `font-mono text-xs px-1.5 py-0.5 rounded` | 12px | `var(--fg-default)` | Snippets en docs y sandbox. Background `var(--surface-sunken)`. |

---

## Números legales (font-mono-num)

Clase utilitaria que activa `font-feature-settings: 'tnum' 1, 'lnum' 1`. **No cambia la fuente a monospace** — sigue siendo Inter.

Obligatorio en:
- N.º de expediente, N.º de actuación.
- Fechas en columnas de tabla.
- Montos, precios, días.
- Jurisdicción / código de juzgado.

```css
/* en <style scoped> */
.font-mono-num :deep(.p-inputtext) {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: 0.01em;
}
```

Para texto estático (no input):
```html
<span style="font-feature-settings: 'tnum' 1, 'lnum' 1; font-variant-numeric: tabular-nums lining-nums;">
  01234-2024-0-1801-JR-CI-05
</span>
```

---

## Required / error / dirty

```vue
<!-- Required asterisk -->
<span class="matter-field-required" style="color: #dc2626;">*</span>

<!-- Error inline -->
<small class="matter-field-error" style="font-size: 0.75rem; color: #dc2626;">
  {{ error }}
</small>
<!-- dark mode: color: #fca5a5 -->

<!-- Dirty dot ámbar -->
<p class="flex items-center gap-1.5 text-[0.8125rem]" style="color: #d97706;">
  <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
  Cambios sin guardar
</p>
```

---

## Reglas inviolables

1. **Solo Inter** — ni Roboto, ni system-ui en texto visible. Inter está configurada en `body` de `main.css`.
2. **Nunca `font-bold`** en títulos lawyer-grade. Usar `font-semibold` como máximo.
3. **Nunca `text-gray-*`** — usar `var(--fg-default)`, `var(--fg-muted)`, `var(--fg-subtle)`.
4. **Nunca `text-2xl` o `text-xl` en card/dialog titles** — usar `text-[1.0625rem]`.
5. **Nunca `font-mono` para texto general** — solo para snippets de código. Para números usar `font-mono-num`.
6. **Un solo H1 por vista** (el de `PageHeader`). Secciones usan H2/H3.
7. **Todo a través de `t()`** — cero literales en plantilla.
8. **Hex solo para estados semánticos sin token** — `#dc2626` (error/required, claro) y `#fca5a5` (error, dark) son las únicas excepciones permitidas. No existe aún `--color-error` en `main.css`; hasta que se agregue, usar estos valores literales.

---

## Anti-patrones

| Anti-patrón | Corrección |
|-------------|------------|
| `font-bold` en títulos de modal | `font-semibold` |
| `text-xl` en card/dialog title | `text-[1.0625rem]` |
| `font-mono` para texto general | `font-mono` sólo para código; `font-mono-num` para números legales |
| Hex directo en color de texto (`#4a5285`) | `var(--fg-muted)` — excepción: `#dc2626` / `#fca5a5` solo para error/required |
| H1 múltiple en una vista | Un único H1, secciones con H2/H3 |
| Literales de texto directo en template (`«Título»`, `«Cancelar»`) | Todo a través de `t()` — i18n obligatorio |

---

## Eyebrow: variante tipográfica vs variante pill

Dos usos distintos del concepto "eyebrow":

| Variante | Clase / token | Apariencia | Uso |
|----------|---------------|------------|-----|
| **Tipográfico brand** | `text-[0.6875rem] font-semibold uppercase tracking-[0.06em]` + `color: var(--brand-zafiro)` | Solo texto | Dialog / wizard header |
| **Tipográfico page** | `text-xs font-semibold uppercase tracking-widest` + `color: var(--fg-subtle)` | Solo texto | Eyebrow muted sobre PageHeader |
| **Pill `.eyebrow`** (main.css) | clase `.eyebrow` | Pastilla con `background: var(--accent-soft)`, borde y border-radius 999px | Prop opcional `eyebrow` en `PageHeader` |

No usar la clase `.eyebrow` (pill) en dialogs ni dentro de cards — solo en `PageHeader` Tier-2.

---

## Skills relacionadas

- [alega-tokens](../alega-tokens/SKILL.md) — variables CSS de color que se aplican a los roles tipográficos.
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — PageHeader anatomy, tabular-nums, coherencia entre vistas.
- [alega-primevue-components](../alega-primevue-components/SKILL.md) — índice maestro de componentes.
