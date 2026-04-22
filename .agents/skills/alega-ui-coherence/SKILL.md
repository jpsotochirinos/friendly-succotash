---
name: alega-ui-coherence
description: >
  Coherencia vista-a-vista en la app autenticada Alega (Vue 3, PrimeVue 4, Tier 2 PageHeader, tokens).
  Usar en restyle de vistas, nuevas pantallas, auditoría UI, "unificar cabeceras", "mismo espaciado que Expedientes".
---

# Alega — coherencia de vistas (app autenticada)

## Dos tiempos (ritmo visual)

1. **Tier 1 — Hero (solo Inicio `/`):** tarjeta con `bg-brand-gradient`, saludo, logo del despacho, KPIs y feed. No usar `PageHeader` aquí. Referencia: [apps/web/src/views/HomeView.vue](apps/web/src/views/HomeView.vue).

2. **Tier 2 — Herramienta (resto de rutas bajo `AppLayout`):** cabecera compacta uniforme con el componente compartido `PageHeader`, subtítulo obligatorio, CTA primario `size="small"`, sin padding en el root de la vista (el shell ya aplica padding). Referencia: [apps/web/src/components/common/PageHeader.vue](apps/web/src/components/common/PageHeader.vue).

**Criterio:** si la pantalla es un “listado / herramienta / configuración”, es Tier 2. Si es el “feed del despacho hoy”, es Tier 1.

## Anatomía canónica Tier 2

```vue
<template>
  <section class="flex flex-col gap-6">
    <PageHeader :title="t('…')" :subtitle="t('…')">
      <template #actions>
        <Button … size="small" />
      </template>
    </PageHeader>
    <!-- Toolbar: filtros, pestañas, búsqueda -->
    <div class="flex flex-wrap gap-2 items-center">…</div>
    <!-- Contenido -->
    …
  </section>
</template>
```

- **Eyebrow opcional:** prop `eyebrow` en `PageHeader` + clase `.eyebrow` en [apps/web/src/assets/main.css](apps/web/src/assets/main.css).

## Reglas inviolables

1. **Root de la vista:** `class="flex flex-col gap-6"` (u otro gap vertical coherente). **No** `p-6`, `px-*` ni `space-y-*` en el contenedor raíz: el padding lo aplica [apps/web/src/layouts/AppLayout.vue](apps/web/src/layouts/AppLayout.vue) (`px-6 py-6 sm:px-8 sm:py-8`).

2. **Título de página:** solo vía `PageHeader` (internamente `h1`, `text-xl sm:text-2xl font-semibold`, color `var(--fg-default)`). No duplicar `h1` fuera del header.

3. **Subtítulo:** obligatorio en i18n (`trackables.pageSubtitle`, `clients.pageSubtitle`, etc.), aunque sea una línea corta.

4. **Botón primario de cabecera:** PrimeVue `<Button size="small" />` (icono + label de acción principal).

5. **Color y texto:** preferir `text-[var(--fg-default)]`, `text-[var(--fg-muted)]`, `text-[var(--fg-subtle)]`, `text-accent`. Evitar `text-gray-*`, `dark:text-gray-*`, `bg-gray-*` en vistas nuevas; migrar los existentes cuando se toque el archivo.

6. **Tipografía:** solo Inter; **prohibido** `font-mono`, JetBrains, `--font-mono` (ver [APP_RESTYLE_PLAN.md](APP_RESTYLE_PLAN.md)).

7. **Dark mode:** comprobar cada cambio en claro y en `html.dark`.

## Tokens rápidos (recordatorio)

| Uso | Token / clase |
|-----|----------------|
| Fondo app | `var(--surface-app)` |
| Card / panel | `var(--surface-raised)`, `.app-card` |
| Borde | `var(--surface-border)` |
| Texto principal | `var(--fg-default)` |
| Texto secundario | `var(--fg-muted)` |
| Acento / enlaces | `var(--accent)`, clase Tailwind `text-accent` |
| CTA gradiente puntual | `.bg-brand-gradient` |
| Números alineados en tablas | `tabular-nums` |

Tabla completa: [APP_RESTYLE_PLAN.md](APP_RESTYLE_PLAN.md) sección 3.

## Antipatrones (grep)

Ejecutar al terminar cambios en `apps/web/src/views` o componentes de pantalla:

```bash
rg 'class="[^"]*\bp-6\b' apps/web/src/views
rg 'text-gray-|dark:text-gray-|bg-gray-' apps/web/src/views apps/web/src/components
rg '\bfont-bold\b' apps/web/src/views
rg 'font-mono|JetBrains|--font-mono' apps/web/src
```

- Padding raíz `p-6` en la vista raíz: corregir.
- `font-bold` en títulos de página: usar `PageHeader` (ya trae `font-semibold`).
- `font-mono` / JetBrains: debe quedar en **0** resultados en `apps/web/src`.

## Flujo obligatorio al crear o editar una vista Tier 2

1. Usar `PageHeader` con `title` + `subtitle` desde i18n.
2. Acciones de cabecera en `#actions`; CTA `size="small"`.
3. Sin padding en el root; `gap-6` entre bloques.
4. Pasar los greps anteriores en los archivos tocados.
5. Probar en tema claro y oscuro.

## Composición con otras skills

- **[alega-ui-context](.agents/skills/alega-ui-context/SKILL.md)** — dónde viven marca, tokens y Prime preset; cargar **siempre** junto con esta skill para trabajo UI en Alega.
- **frontend-design** — calidad visual sin romper tokens.
- **web-design-guidelines** — accesibilidad y patrones (WIG).
- **theme-factory** — variantes de color; mapear siempre a `brand.*` / `alegaPreset`.
- **primevue** — componentes y temas Aura.

## Cita la fuente

- Plan maestro de restyle: [APP_RESTYLE_PLAN.md](APP_RESTYLE_PLAN.md) (fases, prohibiciones, checklist).
- Handoff de diseño (fuera del repo): `../alega/project/` (prototipo `app-shell`, `app-views`, `brand.css`).
