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

## Auth público (login / registro / enlaces)

- **Shell:** [apps/web/src/components/auth/AuthShell.vue](../../../apps/web/src/components/auth/AuthShell.vue) — layout split en escritorio; en **recuperación de contraseña** (`showShowcase=false`) la tarjeta va **centrada y compacta**, sin panel derecho.
- **Visual de producto:** [apps/web/src/components/auth/LoginShowcasePanel.vue](../../../apps/web/src/components/auth/LoginShowcasePanel.vue) — ilustración tipo captura de producto (expediente, etapas, columnas tipo tablero, documento); **no** usar mini-dashboard genérico con KPIs/tablas de ejemplo estilo CRM ajeno a Alega.
- **Variantes:** el shell pasa `showcaseVariant` (`login` | `register` | `invite` | `magic`) al panel visual para ajustar composición y copy de confianza en invitación / magic link.

## Onboarding (cuenta nueva)

- **Vista:** ruta autenticada `/onboarding` (fuera del layout con panel) → `apps/web/src/views/onboarding/OnboardingWizard.vue` + `components/OnboardingFeaturePreview.vue`.
- El panel derecho debe ser **mock interactivo de producto Alega** (tablero, plazos, documentos, equipo), con la misma paleta y densidad que el resto de la app — **no** ilustraciones genéricas ni capturas frágiles de marketing.

## Confirmaciones (`ConfirmDialogBase`)

- **Componente:** `apps/web/src/components/common/ConfirmDialogBase.vue` (PrimeVue `Dialog`, sin `ConfirmationService`).
- **Patrón:** `title` + `subject` («expediente o documento») + `message` + lista opcional `consequences` / `consequencesTitle`; acciones irreversibles con `typedConfirmPhrase` y textos en i18n.
- **Variantes:** `danger` | `warning` | `info` | `success` — ver [docs/frontend-confirm-patterns.md](../../../docs/frontend-confirm-patterns.md) §7 y showcase `/dev/confirm-dialog-base`.

## Listados con `DataTable` (PrimeVue)

- **Referencia:** [apps/web/src/views/trackables/TrackablesListView.vue](../../../apps/web/src/views/trackables/TrackablesListView.vue) — barra de filtros en panel con `border`, `bg-[var(--surface-raised)]` y bordes redondeados; tabla envuelta en `.app-card.overflow-hidden`.
- **Props base:** `dataKey`, `size="small"`, `stripedRows`, `rowHover`, `responsiveLayout="scroll"`; paginación con `rowsPerPageOptions`, `currentPageReportTemplate` (texto en i18n con `{first}` / `{last}` / `{totalRecords}`).
- **Loading:** usar `Skeleton` de PrimeVue cuando la tabla aún no tiene filas (`loading && rows.length === 0`); conservar `:loading` de `DataTable` para recargas/paginación con datos ya visibles.
- **Contenido:** encabezados y vacíos (`#empty`) desde i18n; fechas con `tabular-nums` y locale alineada a `useI18n().locale`; primera columna con identificador visual (emoji/ícono) + título + metadatos secundarios.
- **Expedientes:** mostrar chip de tipo en mayúsculas, avatar de asignado con tamaño fijo, y resumen compacto de actividades (`done`, `inProgress`, `overdue`, `total`) cuando el API lo entregue.
- **Acciones en fila:** icon-only con `aria-label` y tooltip desde i18n (no textos fijos en la vista).
- **Alternativa app-wide:** otras pantallas aún usan `ConfirmDialog` + `useConfirm()`; el estándar nuevo de contenido rico es `ConfirmDialogBase`.

## Skills hermanas Alega

- **[alega-datatable](../alega-datatable/SKILL.md)** — listados cockpit (KPI mesh, command toolbar, type chips, acciones outlined).
- **[alega-confirm-dialog](../alega-confirm-dialog/SKILL.md)** — `ConfirmDialogBase` (variantes danger/warning/info/success, typed phrase).
- **[alega-form-dialog](../alega-form-dialog/SKILL.md)** — diálogos cortos crear/editar y wizards con Dialog headless edge-to-edge.
- **[alega-onboarding-stepper](../alega-onboarding-stepper/SKILL.md)** — onboarding, asistentes y stepper vertical/sidebar.
- **[alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md)** — detalle/edición tipo Jira con sidebar.

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
