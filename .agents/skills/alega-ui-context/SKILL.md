---
name: alega-ui-context
description: >
  Coherencia de UI para el proyecto Alega (friendly-succotash): Vue 3, PrimeVue 4, Tailwind, paleta
  de marca y logo. Usar junto con frontend-design, web-design-guidelines, theme-factory y primevue.
  Motion en SPA: vercel-react-view-transitions. Composición de componentes: vercel-composition-patterns.
---

# Alega — contexto de diseño (web)

## Dónde vive la marca en código

- **Variables CSS:** `apps/web/src/assets/main.css` (`--brand-abismo`, `--brand-medianoche`, `--brand-real`, `--brand-zafiro`, `--brand-hielo`, `--brand-papel`)
- **Tailwind:** `apps/web/tailwind.config.js` → `colors.brand.*` y escalas `gray` / `blue` alineadas a la marca
- **PrimeVue:** `apps/web/src/theme/alegaPreset.ts` (preset Aura)
- **Logo:** `apps/web/public/brand/logo.svg` · componente `apps/web/src/components/brand/AppLogo.vue`

## Cómo combinar con otras skills

1. **frontend-design** — calidad visual y UI distintiva; evitar estética genérica; respetar tokens anteriores.
2. **web-design-guidelines** — auditoría UX / accesibilidad / patrones (Vercel WIG).
3. **theme-factory** — explorar temas o variantes de color; **mapear siempre** a `brand.*` y a `alegaPreset`, no introducir una segunda paleta suelta.
4. **primevue** — componentes, temas Aura, auto-import según skill.
5. **vercel-react-view-transitions** — transiciones y motion tipo “nativo” en vistas Vue cuando aplique (View Transition API / patrones de la skill).
6. **vercel-composition-patterns** — APIs de componentes claras (compound components, menos props booleanas).
7. **canvas-design** — piezas gráficas estáticas (posters, arte) cuando el entregable no sea solo la app.

## Regla práctica

Para cualquier cambio de color, espaciado o componente: **reutilizar `brand.*`, grays del tema y Prime preset** antes de valores sueltos (`#hex` arbitrarios o `blue-500` genérico fuera de escala).

**Coherencia vista-a-vista y componente `PageHeader`:** cargar también la skill **`alega-ui-coherence`** (Tier 1 Inicio vs Tier 2 herramienta, sin padding raíz en vistas, subtítulo obligatorio, CTA `size="small"`).
