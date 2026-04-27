---
name: alega-motion
description: >
  Guía de animaciones, transiciones y micro-interacciones para Alega (Vue 3, CSS).
  Curvas, duraciones, stagger, expand/collapse, empty-states, reduced-motion.
  Usar al agregar animaciones, revisar fluidez o crear nuevas vistas con movimiento.
---

# Alega — Motion & Animation Style Guide

## Principios

1. **Sutil y funcional.** La animación guía la atención, no la roba. Cada movimiento tiene propósito: confirmar una acción, revelar contenido, o indicar relación.
2. **Coherente.** Mismas curvas, duraciones y patrones en toda la app.
3. **Accesible.** Todo se desactiva con `prefers-reduced-motion: reduce`.
4. **Rendimiento.** Solo animar `transform` y `opacity`. Evitar animar `width`, `height`, `top`, `left` (excepto CSS Grid trick para expand/collapse).

---

## Curvas (Easing)

| Nombre | Valor | Uso |
|--------|-------|-----|
| **spring-out** | `cubic-bezier(0.22, 1, 0.36, 1)` | Curva principal para entradas, aperturas, hover lift. Sensación de rebote natural. |
| **ease-out** | `ease-out` | Hovers rápidos, transiciones de color, opacity. |
| **ease** | `ease` | Transiciones de `border-color`, fondos suaves. |

> **Regla:** nunca usar `linear` ni `ease-in` para UI interactiva.

---

## Duraciones

| Categoría | Rango | Ejemplos |
|-----------|-------|----------|
| **Micro** | 80–150ms | Color de fondo en hover, opacity de iconos |
| **Standard** | 200–320ms | Hover lift, expand/collapse, fade-in de cards |
| **Deliberate** | 350–500ms | Entrada de columnas/secciones, animaciones stagger |

> **Regla:** entrada (appear) siempre más lenta que salida (leave). Entrada ≈ 300-400ms, salida ≈ 200-250ms.

---

## Stagger (entrada escalonada de listas)

- **Delay entre items:** 45–60ms
- **Implementación:** CSS custom property `--delay` en cada item + `animation-delay: var(--delay)`.
- **Keyframe estándar:**

```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.list-item-entrance {
  animation: fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--stagger-delay, 0ms);
}
```

### Ejemplo en template (Vue)

```vue
<div
  v-for="(item, idx) in items"
  :key="item.id"
  class="list-item-entrance"
  :style="{ '--stagger-delay': `${idx * 55}ms` }"
>
```

---

## Hover Effects

### Card lift (estándar para tarjetas interactivas)

```css
.interactive-card {
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s ease-out,
    border-color 0.28s ease;
}

@media (hover: hover) {
  .interactive-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px color-mix(in srgb, var(--brand-abismo, #0f1729) 10%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent, #0f6e7a) 10%, transparent);
  }
}
```

> **Regla:** `translateY` entre `-1px` y `-2px`. Nunca más de `-3px`.

### Icon rotation (botones de acción)

```css
.action-btn .action-icon {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .action-btn:hover .action-icon {
    transform: rotate(90deg) scale(1.1);
  }
}
```

---

## Expand / Collapse (CSS Grid trick)

Para paneles que se despliegan/colapsan sin JS de medición:

```css
.collapse-panel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.26s ease;
}

.collapse-panel > * {
  overflow: hidden;
}

.collapse-panel.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}
```

> **En Vue:** usar `:class="condition ? 'is-open' : ''"` en vez de `v-show`.

---

## Empty States

Pulso suave en borde y fondo con tinte de accent:

```css
.empty-state-pulse {
  animation: emptyPulse 2.8s ease-in-out infinite;
}

@keyframes emptyPulse {
  0%, 100% {
    border-color: var(--surface-border);
    background-color: color-mix(in srgb, var(--surface-sunken) 25%, transparent);
  }
  50% {
    border-color: color-mix(in srgb, var(--accent) 22%, var(--surface-border));
    background-color: color-mix(in srgb, var(--surface-sunken) 38%, transparent);
  }
}
```

---

## Smooth Scroll

```css
.scroll-container {
  scroll-behavior: smooth;
}
```

### Scroll-into-view (Vue)

```ts
watch(selectedId, (id) => {
  if (!id) return;
  nextTick(() => {
    const el = refs.get(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});
```

---

## Sidebar / Panel Width Transition

```css
.collapsible-panel {
  transition: width 0.2s ease-out;
  overflow: hidden;
}
```

---

## Reduced Motion (OBLIGATORIO)

Toda animación nueva **debe** tener su contraparte en este bloque:

```css
@media (prefers-reduced-motion: reduce) {
  .list-item-entrance,
  .empty-state-pulse {
    animation: none !important;
  }

  .interactive-card {
    transition: none !important;
  }

  .scroll-container {
    scroll-behavior: auto;
  }
}
```

> **Regla inviolable:** si agregas un `animation` o `transition`, agrega la línea de desactivación correspondiente.

---

## Antipatrones

| ❌ No hacer | ✅ Hacer |
|------------|---------|
| `transition: all 0.3s` | `transition: transform 0.22s ..., box-shadow 0.22s ...` (explícito) |
| Animar `width`/`height` directamente | CSS Grid `grid-template-rows: 0fr → 1fr` |
| `ease-in` para entradas | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Omitir `prefers-reduced-motion` | Siempre incluir `@media (prefers-reduced-motion)` |
| `text-gray-*`, `bg-gray-*` | Tokens: `var(--fg-muted)`, `var(--surface-raised)` |
| `translateY(-5px)` o más en hover | Máximo `translateY(-2px)` |

---

## Referencia de componentes con motion implementado

| Componente | Patrones usados |
|-----------|-----------------|
| `ProcessStageBoardView.vue` | Stagger entrada, expand/collapse grid, hover lift, empty pulse, scroll-into-view, icon rotate |
| `FolderBrowserView.vue` | Stagger entrada, sidebar transition, subfolder hover lift, breadcrumb transitions, empty pulse |
| `main.css` → `.view-fade-*` | Transición de ruta (opacity + translateY) |

---

## Composición con otras skills

- **alega-ui-coherence** — tokens de color y layout obligatorios
- **alega-ui-context** — marca, PrimeVue preset, Tailwind config
- **frontend-design** — calidad visual general
