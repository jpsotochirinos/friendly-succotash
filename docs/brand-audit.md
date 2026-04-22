# Auditoría de marca Alega — `apps/web`

Documento de referencia para alinear la app Vue con el spec de la landing y la paleta oficial. **Última actualización:** implementación de utilidades y homologación inicial.

## 1. Paleta y tokens

| Token        | HEX       | Uso |
|-------------|-----------|-----|
| Abismo      | `#0D0F2B` | Fondo oscuro (dark mode) |
| Medianoche  | `#141852` | Texto principal, superficies |
| Real        | `#1B2080` | Secundario, hover |
| Zafiro      | `#2D3FBF` | Primario, CTAs |
| Hielo       | `#C8CCF5` | Muted, bordes suaves |
| Papel       | `#F2F3FB` | Fondo claro |

- **Tailwind:** `bg-brand-zafiro`, `text-brand-medianoche`, etc. — [`apps/web/tailwind.config.js`](../apps/web/tailwind.config.js).
- **Tokens semánticos:** `--surface-*`, `--fg-*`, `--accent*` — [`apps/web/src/assets/main.css`](../apps/web/src/assets/main.css).
- **PrimeVue:** [`apps/web/src/theme/alegaPreset.ts`](../apps/web/src/theme/alegaPreset.ts).

## 2. Inventario actual

| Área | Estado |
|------|--------|
| Colores HEX en `tailwind.config.js` | Alineados al spec |
| Variables `:root` / `html.dark` | Alineados (Papel/Abismo, Zafiro como acento) |
| `.brand-gradient-soft` (antes `.brand-gradient`) | Fondo suave radial + linear para auth/onboarding |
| `.bg-brand-gradient` | Linear 135° Zafiro → Real (spec oficial) |
| `.bg-brand-gradient-reverse` | Linear 135° Real → Medianoche |
| `.text-brand-gradient` | Título con clip de texto sobre gradiente |
| Uso mixto `:style="{ color: 'var(--fg-*)' }"` | Válido; equivalente a `text-fg` / tokens |

## 3. Gaps resueltos

- ~~Faltaban utilidades de gradiente sólido del spec~~ → Añadidas en `main.css`.
- ~~`.brand-gradient` no coincidía con el spec~~ → Renombrada a `.brand-gradient-soft`; la oficial del spec es `.bg-brand-gradient`.

## 4. Decisiones

1. **Identidad:** No se cambian los HEX ni la jerarquía Zafiro / Real / Medianoche.
2. **Dos gradientes:** `brand-gradient-soft` = atmósfera (login/onboarding); `bg-brand-gradient` = bloques hero/CTA según landing.
3. **App interna:** CRUD y tablas siguen priorizando tokens semánticos (`var(--accent)`, `app-card`) para mantenimiento y dark mode.

## 5. Guía de uso

| Situación | Preferir |
|-----------|----------|
| Botón primario | PrimeVue primary o `bg-brand-zafiro hover:bg-brand-real text-white` |
| Fondo hero/CTA | `bg-brand-gradient` + `text-brand-papel` (texto sobre gradiente) |
| Título destacado sobre fondo claro | `text-brand-gradient` |
| Fondo de página suave (auth) | `brand-gradient-soft` |
| Variación más oscura | `bg-brand-gradient-reverse` |
| Tarjetas listados | `app-card` + tokens `--surface-*` |

Evitar `bg-[#2D3FBF]` suelto; usar `bg-brand-zafiro` o `--accent`.

## 6. Plan de oleadas (estado)

| Oleada | Contenido | Estado |
|--------|-----------|--------|
| 0 | Este documento | Hecho |
| 1 | CSS: soft + gradientes spec | Hecho |
| 2 | Auth + Onboarding → `brand-gradient-soft` | Hecho |
| 3 | Home cabecera → `bg-brand-gradient` | Hecho |
| 4 | Opcional: sustituir `:style` por utilidades en CRUD | Hecho en `HomeView.vue`, `RolesView.vue` |

## 7. Checklist de accesibilidad (WCAG 2.1 AA+)

- [x] Zafiro sobre Papel (CTAs en vistas claras)
- [x] Papel / blanco sobre `bg-brand-gradient` (cabecera Home)
- [x] `text-brand-gradient`: usar solo sobre fondos claros (Papel/blanco); evitar sobre gradiente oscuro sin prueba de contraste
- [x] Build `pnpm -w --filter web build` OK
- [ ] Revisión manual en navegador: login, onboarding, home, roles (claro y oscuro)

## 8. Comandos de verificación

```bash
pnpm -w --filter web build
```
