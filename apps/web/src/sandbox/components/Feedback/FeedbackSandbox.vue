<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import InlineMessage from 'primevue/inlinemessage';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

function showToast(severity: 'success' | 'info' | 'warn' | 'error') {
  const configs = {
    success: { summary: 'Expediente guardado', detail: 'Los cambios se guardaron correctamente.', life: 2500 },
    info: { summary: 'Información', detail: 'Tu plan gratuito incluye hasta 10 expedientes.', life: 3000 },
    warn: { summary: 'Advertencia', detail: 'El plazo vence en 2 días. Revisa las actuaciones pendientes.', life: 4000 },
    error: { summary: 'Error al guardar', detail: 'No se pudo conectar con el servidor. Intenta nuevamente.', life: 4000 },
  };
  toast.add({ severity, ...configs[severity] });
}

const codeToast = `// Toast en script setup
const toast = useToast();

// Éxito — 2500ms
toast.add({
  severity: 'success',
  summary: 'Expediente guardado',
  detail: 'Los cambios se guardaron correctamente.',
  life: 2500,
});

// Error — 4000ms
toast.add({
  severity: 'error',
  summary: 'Error al guardar',
  detail: 'No se pudo conectar con el servidor.',
  life: 4000,
});`;

const codeMessage = `<!-- Message banner en página -->
<Message severity="warn">
  Has alcanzado el 80% de tu cuota mensual.
  <a href="/settings/billing">Actualizar plan</a>
</Message>

<!-- InlineMessage en formulario -->
<InlineMessage severity="warn">
  El tipo "Proceso" no puede cambiarse una vez iniciado.
</InlineMessage>`;

const antiPatterns = [
  { bad: '3+ toasts disparados en cadena (ej. loop de operaciones)', good: 'Un solo toast resumen al finalizar el batch. "N expedientes actualizados."' },
  { bad: 'Toast sin detalle: summary="Error" sin contexto', good: 'summary corto + detail explicativo. El abogado necesita saber qué falló.' },
  { bad: 'Toast persistente como alternativa a Message', good: 'Toast es efímero (life obligatorio). Para info persistente usar <Message>.' },
  { bad: 'Message en lugar de InlineMessage dentro de formularios', good: '<InlineMessage> para validaciones o advertencias dentro de un form. <Message> para banners de página.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Feedback</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Toast, Message, InlineMessage</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Tres primitivos de feedback: <strong>Toast</strong> = notificación efímera (auto-cierre); <strong>Message</strong> = banner persistente en página; <strong>InlineMessage</strong> = alerta dentro de un formulario.
      </p>
    </div>

    <!-- Toast -->
    <ExampleFrame title="Toast — severidades y tiempos de vida" description="Disparar toasts haciendo clic en los botones. Toast se monta una sola vez en SandboxLayout." :code="codeToast">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-3">
          <Button label="Success (2.5s)" icon="pi pi-check" severity="success" @click="showToast('success')" />
          <Button label="Info (3s)" icon="pi pi-info-circle" severity="info" @click="showToast('info')" />
          <Button label="Warning (4s)" icon="pi pi-exclamation-triangle" severity="warning" @click="showToast('warn')" />
          <Button label="Error (4s)" icon="pi pi-times-circle" severity="danger" @click="showToast('error')" />
        </div>
        <div
          class="rounded-lg px-3 py-2 text-xs"
          style="background: var(--surface-sunken); border: 1px solid var(--surface-border); color: var(--fg-muted);"
        >
          <strong>Tiempos de vida Alega:</strong> success 2500ms · info 3000ms · warn/error 4000ms. Toast montado en <code class="font-mono">SandboxLayout.vue</code>.
        </div>
      </div>
    </ExampleFrame>

    <!-- Message (banner) -->
    <ExampleFrame title="Message — banner persistente en página" description="Para alertas del sistema, cuotas, mantenimiento. No desaparece automáticamente." :code="codeMessage">
      <div class="flex flex-col gap-3">
        <Message severity="success">Expediente creado correctamente. Ya puedes añadir actuaciones.</Message>
        <Message severity="info">
          Tu plan incluye hasta 10 expedientes activos.
          <a href="#" class="underline" style="color: inherit;" @click.prevent>Actualizar plan</a>
        </Message>
        <Message severity="warn">
          El abogado asignado no tiene permisos en este expediente.
        </Message>
        <Message severity="error">
          Error de sincronización con el servidor SINOE. Intenta nuevamente más tarde.
        </Message>
      </div>
    </ExampleFrame>

    <!-- InlineMessage (dentro de form) -->
    <ExampleFrame title="InlineMessage — dentro de formulario" description="Para advertencias o validaciones justo encima del submit. Más compacto que Message.">
      <div class="flex flex-col gap-4 p-4 rounded-xl" style="border: 1px solid var(--surface-border); background: var(--surface-raised);">
        <div class="flex flex-col gap-1">
          <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Tipo de seguimiento <span style="color: #dc2626;">*</span></label>
          <div class="rounded-lg px-3 py-2 text-sm" style="border: 1px solid var(--surface-border); color: var(--fg-muted);">Proceso</div>
        </div>
        <InlineMessage severity="warn" class="w-full">
          El tipo "Proceso" no puede cambiarse después de crear el expediente.
        </InlineMessage>
        <div class="flex justify-end">
          <Button label="Crear expediente" icon="pi pi-check" />
        </div>
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead><tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);"><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in antiPatterns" :key="i" style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/toast/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Toast</a>
      <span>·</span>
      <a href="https://primevue.org/message/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Message</a>
    </div>
  </div>
</template>
