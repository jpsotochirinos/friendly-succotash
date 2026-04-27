# Confirmaciones en el frontend (PrimeVue: ConfirmDialog y ConfirmPopup)

Guía de equipo para que las confirmaciones se vean y se escriban de forma coherente en la web (Vue 3, PrimeVue 4).

## 1. Stack y montaje

- En [apps/web/src/main.ts](../apps/web/src/main.ts) se registran `ConfirmationService` y `app.use(PrimeVue, …)`.
- Cada vista o componente que use `useConfirm()` de [primevue/useconfirm](https://primevue.org/confirmdialog/) debe renderizar **un** `<ConfirmDialog />` (import desde `primevue/confirmdialog`) en su plantilla. El bus de confirmación asocia el servicio a ese diálogo; si falta, `confirm.require` no muestra nada.
- Patrón actual del repositorio: un `<ConfirmDialog />` por pantalla o bloque de árbol que dispare el confirm (no hace falta un único `ConfirmDialog` en `App.vue` mientras se siga este patrón de forma consciente).

## 2. API mínima de `confirm.require`

Ejemplo (campos frecuentes):

```ts
const confirm = useConfirm();

confirm.require({
  header: t('módulo.títuloAcción'),
  message: t('módulo.mensajeDetalle'),
  icon: 'pi pi-exclamation-triangle',
  acceptLabel: t('common.delete'), // o la acción primaria
  rejectLabel: t('common.cancel'),
  acceptClass: 'p-button-danger', // solo acciones destructivas
  accept: async () => {
    // …
  },
});
```

Pautas:

| Intención | `icon` sugerido | `acceptClass` |
|-----------|-----------------|----------------|
| Borrado irreversible | `pi pi-exclamation-triangle` | `p-button-danger` |
| Archivar u ocultar (reversible) | `pi pi-inbox` o `pi pi-info-circle` | (por defecto, sin danger) |
| Confirmar transición de flujo (riesgo operativo) | `pi pi-exclamation-circle` | según el tono; no siempre danger |

- **Siempre** fijar `rejectLabel: t('common.cancel')` (o equivalente en i18n) y la etiqueta de aceptación con `acceptLabel` explícita, para alinear con el resto de pantallas (p. ej. [ClientsListView.vue](../apps/web/src/views/clients/ClientsListView.vue)).
- `message` y `header` no deben mezclar idiomas: todo en [apps/web/src/i18n/index.ts](../apps/web/src/i18n/index.ts).

## 3. i18n

- Ninguna cadena visible al usuario en un confirm debe ir fija en español/inglés en el componente, salvo transición puntual; las claves viven bajo el dominio adecuado (`trackables`, `clients`, `common`, etc.).
- Textos reutilizables: `common.cancel`, `common.delete`, `common.confirm` según corresponda.

## 4. Cuándo **no** usar solo `ConfirmDialog`

- Wizards con varios pasos (elegir archivar vs eliminar, luego tecleo de palabra, luego progreso): usar [Dialog](https://primevue.org/dialog/) u otro flujo, como en el asistente de borrado de expediente en [TrackablesListView.vue](../apps/web/src/views/trackables/TrackablesListView.vue).
- Confirmación que pide un texto concreto para continuar: combinar el diálogo o wizard adecuado con el mismo criterio de i18n (palabra de confirmación localizada, etc.).

## 5. Theming y documentación de PrimeVue

Ajustes visuales globales y referencia de clases y tokens oficiales:

- Documentación de componente: [ConfirmDialog (PrimeVue)](https://primevue.org/confirmdialog/), [ConfirmPopup (PrimeVue)](https://primevue.org/confirmpopup/).
- **Clases (modo con estilos):** p. ej. `p-confirmdialog`, `p-confirmdialog-icon`, `p-confirmdialog-message`, `p-confirmdialog-reject-button`, `p-confirmdialog-accept-button`; y para popup anclado, `p-confirmpopup`, `p-confirmpopup-content`, `p-confirmpopup-icon`, `p-confirmpopup-message`, `p-confirmpopup-footer`, `p-confirmpopup-reject-button`, `p-confirmpopup-accept-button`.
- **Design tokens (variables CSS):** resumen: `--p-confirmdialog-icon-size`, `--p-confirmdialog-icon-color`, `--p-confirmdialog-content-gap`, etc.; para popup, `--p-confirmpopup-background`, `--p-confirmpopup-border-color`, `--p-confirmpopup-color`, y el resto listados en la doc de theming de PrimeVue.

Hoy el preset Alega ([apps/web/src/theme/alegaPreset.ts](../apps/web/src/theme/alegaPreset.ts)) no redefine de forma explícita los tokens de `confirmdialog` / `confirmpopup`. Si hace falta alinear con los colores de texto de la app (`--fg-*` en [main.css](../apps/web/src/assets/main.css)), se puede ampliar el preset o capa de estilos en un cambio de diseño dedicado.

## 6. ConfirmDialog vs ConfirmPopup

- **ConfirmDialog:** modal centrado; es lo que usamos en toda la app con `useConfirm` (patrón por defecto).
- **ConfirmPopup:** confirmación anclada a un disparador (p. ej. menú, botón con overlay). Hoy el proyecto no lo usa. Tiene sentido valorarlo cuando el contexto de la acción sea local y un modal a pantalla completa pese al flujo; la API y el `ConfirmationService` son las mismas ideas, con otro componente de presentación.

## 7. `ConfirmDialogBase` (componente propio, `primevue/Dialog`)

Para confirmaciones con encabezado con icono en disco, gradiente y botones fijos **sin** `ConfirmationService`, usar el wrapper en [ConfirmDialogBase.vue](../apps/web/src/components/common/ConfirmDialogBase.vue).

- **No requiere instalar dependencias** adicionales: [apps/web/package.json](../apps/web/package.json) ya incluye `primevue` y `primeicons`. El componente importa [Dialog](https://primevue.org/dialog/), [Button](https://primevue.org/button/) e [InputText](https://primevue.org/inputtext/) cuando hace falta confirmación por texto; el diálogo del servicio (`primevue/confirmdialog`) es otra vía, descrita en las secciones 1 y 2.
- **Variantes (tono legal-operativo):** `danger` (irreversible o pérdida de datos/evidencia), `warning` (cambia visibilidad o flujo pero suele ser reversible), `info` (neutro; acento de marca), `success` (acción positiva explícita, p. ej. reactivar).
- **Anatomía recomendada:** `title` (verbo + objeto: “Archivar expediente”), `subject` (nombre del expediente o documento), `message` (párrafo de contexto), opcional `consequences` + `consequencesTitle` (lista “Qué pasará”), y para destrucción fuerte `typedConfirmPhrase` + textos de ayuda/etiqueta en i18n.
- **Configuración:** `modal`, `draggable: false`, ancho fluido `min(440px, 96vw)` o `min(520px, 96vw)` si hay consecuencias, asunto largo o campo de confirmación.
- **Showcase en vivo:** con sesión iniciada, ruta `/dev/confirm-dialog-base` (vista [ConfirmDialogBaseShowcaseView.vue](../apps/web/src/views/dev/ConfirmDialogBaseShowcaseView.vue)).

## 8. Evolución posible (opcional)

- Un composable del estilo `useAlegaConfirm()` que envuelva `confirm.require` con `rejectLabel` y convención de iconos por “tipo de riesgo” reduciría repeticiones; no es un requisito mientras se sigan las pautas de esta guía.
