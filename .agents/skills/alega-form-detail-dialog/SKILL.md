---
name: alega-form-detail-dialog
description: >
  Patrón de modales de detalle/edición tipo Jira en Alega (Vue 3, PrimeVue 4): dos columnas,
  barra-meta, sidebar clave|valor, modo lectura + Editar, Guardar en header con dirty state,
  estado vía Menu, color en Popover. Usar al diseñar o refactorizar diálogos de entidad
  (actuaciones, partes, clientes, etc.).
---

# Alega — formularios en diálogo de detalle (tipo Jira)

## Cuándo aplicarla

- Modales centrados que muestran una entidad y permiten editar campos de negocio.
- Cuando el usuario pide “como Jira”, “dos columnas”, “clave valor en el lateral”, o coherencia con el detalle de actuación en **Expediente**.

Referencia viva: [apps/web/src/views/trackables/ExpedienteView.vue](apps/web/src/views/trackables/ExpedienteView.vue) (diálogos “Detalle de actuación” y “Nueva actuación”).

## Anatomía canónica

```
┌ Dialog (contentStyle: maxHeight + flex column + overflow hidden) ─────────────┐
│ Header: TicketKey | eyebrow (“Detalle…” / “Editando…”) | Tag solo lectura | [Editar] [Guardar] [share] | X │
├───────────────────────────────────────────────────────────────────────────────┤
│ Main (scroll-y)              │ Aside (scroll-y)                                │
│ · Título inline (InputText)  │ h3 "Detalles" + hint lectura/edición           │
│ · Meta strip: estado (Tag+Menu solo en edición), │ <dl class="grid … item-detail-properties"> │
│   asignado, prioridad, due…  │   <dt>…</dt><dd>control o texto</dd> …          │
│ · Secciones planas (border-b)│ Color: swatch + Popover (presets + input color)│
│   Descripción, listas…       │ Meta: creado / etiqueta                         │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Sin** `<template #footer>` con “Cerrar”: el cierre es la **X** del `Dialog` y **Esc** (`dismissable-mask`). Si hay cambios sin guardar, `confirm` antes de cerrar.

## Modos

| Modo | Comportamiento |
|------|----------------|
| **Detalle (lectura)** | Por defecto al abrir. Campos `readonly` / texto. Eyebrow **“Detalle de actuación”**. Estado en meta strip como **Tag** (sin menú). Botón **Editar** visible si hay permiso. |
| **Edición** | Tras **Editar**: `isEditingDetail = true`, eyebrow **“Editando actuación”**, foco en el título (`nextTick` + `#item-detail-title`). **Guardar** habilitado solo si `serialize() !== snapshot` (dirty). Tras guardar OK: vuelta a lectura y nuevo snapshot. En meta strip, **Tag + `Menu`** de transiciones solo si hay `availableTransitions`. |
| **Crear** | Siempre editable; botón **Crear** en el **header** (`:disabled` sin título o loading). Misma grilla lateral que detalle cuando aplique. |

## Reglas inviolables

1. **Guardar / Crear** viven en el **header**, no en un footer ancho con “Cerrar”.
2. **Editar** explícito junto al flujo de cabecera (no asumir edición al abrir).
3. **Estado** no duplicado en sidebar como bloque enorme: en **lectura**, solo **Tag**; en **edición** (y con permiso), **Tag + `Menu` popup** con transiciones (`availableTransitions`). Sin modo edición no se abre el menú de cambio de estado.
4. **Sidebar** = `dl` con `grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3`; `dt` en **11px** uppercase `var(--fg-muted)` (clase `.item-detail-sidebar dt` o equivalente).
5. **Color**: un único **swatch** que abre **Popover** con presets + `input type="color"`; nunca un panel expandido fijo que empuje el layout.
6. **Valores vacíos** en lectura: mostrar **—** o placeholder claro.
7. **Acciones que mutan la actuación** (p. ej. “Nueva diligencia”, cambio de estado en la franja meta) exigen **modo edición** además del permiso, salvo que el producto defina otra regla.
8. **Cierre con cambios**: `window.confirm` si `dirty && editingMode && canEdit`.

## Accesibilidad

- `aria-label` en botones solo icono (compartir, swatch de color).
- `aria-haspopup` / menú de estado cuando abre `Menu`.
- Anillo de foco visible en título (`focus:ring-2` + estilos que quiten outline duplicado del input).
- No usar solo color para estado; el Tag lleva texto.

## Tokens y skills relacionadas

- [alega-ui-coherence](.agents/skills/alega-ui-coherence/SKILL.md) — PageHeader, tokens `--fg-*`, `--surface-*`.
- [alega-ui-context](.agents/skills/alega-ui-context/SKILL.md) — marca y convenciones globales.
- [primevue](.agents/skills/primevue/SKILL.md) — `Dialog`, `Menu`, `Popover`, `Tag`.

## Snippets (referencia)

**Dirty snapshot (idea):** serializar los mismos campos que el `PATCH` / create envía al API.

**CSS mínimo del diálogo:**

```css
.item-detail-dialog :deep(.p-dialog-content) {
  overflow: hidden;
  min-height: 0;
}
.item-detail-dialog :deep(.p-dialog-footer) {
  display: none;
}
```

**Meta strip:** fila `flex-wrap` con `Tag` estado (en edición: botón + `Menu` si hay transiciones), `Avatar` + nombre, `Tag` prioridad, fecha con icono `pi-calendar`, `Tag` “Plazo legal” si aplica.
