<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import InformationalDialogBase from '@/components/common/InformationalDialogBase.vue';
import type {
  InformationalDialogCallout,
  InformationalDialogFact,
  InformationalDialogSection,
  InformationalDialogVariant,
} from '@/components/common/InformationalDialogBase.vue';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const visible = ref(false);
const demoVariant = ref<InformationalDialogVariant>('info');
const demoEyebrow = ref('');
const demoTitle = ref('');
const demoSubject = ref('');
const demoMessage = ref('');
const demoSections = ref<InformationalDialogSection[]>([]);
const demoFacts = ref<InformationalDialogFact[]>([]);
const demoCallout = ref<InformationalDialogCallout | undefined>(undefined);
const demoLoading = ref(false);

const codeSnippet = `<InformationalDialogBase
  v-model:visible="showInfo"
  variant="info"
  eyebrow="Guía"
  title="Cómo revisar un documento"
  message="Resumen breve opcional."
  :sections="[
    { title: 'Pasos', bullets: ['Abrir vista previa', 'Marcar observaciones', 'Guardar borrador'] },
  ]"
  :facts="[{ label: 'Expediente', value: 'ALG-2024-0142' }]"
  :callout="{ title: 'Nota', body: 'No sustituye asesoría legal.' }"
  close-label="Entendido"
  close-aria-label="Cerrar"
  @close="onClosed"
/>`;

function openDemo(config: {
  variant: InformationalDialogVariant;
  eyebrow: string;
  title: string;
  subject?: string;
  message?: string;
  sections?: InformationalDialogSection[];
  facts?: InformationalDialogFact[];
  callout?: InformationalDialogCallout;
}) {
  demoVariant.value = config.variant;
  demoEyebrow.value = config.eyebrow;
  demoTitle.value = config.title;
  demoSubject.value = config.subject ?? '';
  demoMessage.value = config.message ?? '';
  demoSections.value = config.sections ?? [];
  demoFacts.value = config.facts ?? [];
  demoCallout.value = config.callout;
  demoLoading.value = false;
  visible.value = true;
}

function openLoadingDemo() {
  openDemo({
    variant: 'info',
    eyebrow: 'Estado',
    title: 'Procesando…',
    message: 'Simulación: el botón y la máscara quedan bloqueados hasta terminar.',
    sections: [],
    facts: [],
  });
  demoLoading.value = true;
  setTimeout(() => {
    demoLoading.value = false;
    visible.value = false;
  }, 2000);
}

const whenToUseRows = [
  {
    caso: 'Solo lectura: resumen, guía, contexto legal, resultado de una operación ya hecha',
    usar: 'InformationalDialogBase',
  },
  {
    caso: 'Pedir confirmación de una acción (archivar, eliminar, publicar) con Cancelar / Confirmar',
    usar: 'ConfirmDialogBase',
  },
  {
    caso: 'Capturar datos (crear/editar entidad, wizard)',
    usar: 'Dialog headless + matter-dialog (form)',
  },
];
</script>

<template>
  <div class="flex flex-col gap-10 max-w-5xl mx-auto pb-16">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Diálogos
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Informational dialog</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Patrón de solo lectura: sin formulario, sin confirmación destructiva. Complementa
        <strong>ConfirmDialogBase</strong> y el <strong>Dialog (form)</strong> del sandbox.
      </p>
    </div>

    <section class="flex flex-col gap-6">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Demos</h2>

      <ExampleFrame
        title="Resumen del expediente (neutral + facts + secciones)"
        description="Metadatos en rejilla clave-valor, cuerpo por secciones y nota al pie."
        :code="codeSnippet"
      >
        <Button
          label="Abrir: resumen"
          icon="pi pi-folder-open"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="
            openDemo({
              variant: 'neutral',
              eyebrow: 'Resumen',
              title: 'Estado del expediente',
              subject: 'Pérez vs. Constructora Andina SAC',
              message:
                'Vista consolidada para orientación interna. Los plazos activos siguen en el tablero de actuaciones.',
              facts: [
                { label: 'Clave', value: 'ALG-2024-0142' },
                { label: 'Órgano', value: '12.º Juzgado Civil de Lima' },
                { label: 'Jurisdicción', value: 'PE' },
                { label: 'Última actuación', value: '2025-04-18 · Contestación de demanda' },
              ],
              sections: [
                {
                  title: 'Partes',
                  body: 'Demandante: María Pérez López. Demandada: Constructora Andina SAC.',
                },
                {
                  title: 'Próximos hitos sugeridos',
                  bullets: [
                    'Revisar medios probatorios adjuntos al escrito.',
                    'Coordinar audiencia única de conciliación si aplica.',
                  ],
                },
              ],
              callout: {
                title: 'Nota',
                body: 'Este resumen no constituye dictamen jurídico; es orientación operativa dentro del despacho.',
              },
            })
          "
        />
      </ExampleFrame>

      <ExampleFrame
        title="Guía de revisión (info + bullets)"
        description="Instrucciones cortas; variante info y acento de marca."
      >
        <Button
          label="Abrir: guía de revisión"
          icon="pi pi-book"
          severity="info"
          variant="outlined"
          size="small"
          @click="
            openDemo({
              variant: 'info',
              eyebrow: 'Guía',
              title: 'Cómo revisar un documento antes de enviarlo',
              message:
                'Usá esta checklist cuando el cliente o contraparte deba recibir el PDF final. No reemplaza revisión humana.',
              sections: [
                {
                  title: 'Pasos',
                  bullets: [
                    'Abrir vista previa y comprobar numeración y encabezados.',
                    'Verificar que las citas legales coincidan con el cuerpo del escrito.',
                    'Marcar observaciones en comentarios internos antes de firmar.',
                    'Exportar PDF y validar que no queden marcas de revisión.',
                  ],
                },
              ],
              callout: {
                title: 'Privacidad',
                body: 'No compartas borradores con correos personales; usá el canal del expediente.',
              },
            })
          "
        />
      </ExampleFrame>

      <ExampleFrame
        title="Resultado correcto (success)"
        description="Explicar una operación ya finalizada sin pedir confirmación adicional."
      >
        <Button
          label="Abrir: operación completada"
          icon="pi pi-check"
          severity="success"
          variant="outlined"
          size="small"
          @click="
            openDemo({
              variant: 'success',
              eyebrow: 'Listo',
              title: 'Sincronización completada',
              subject: 'Carpeta «Demanda principal»',
              message:
                'Los documentos del repositorio local se alinearon con el expediente. No se requiere ninguna acción adicional.',
              sections: [
                {
                  title: 'Detalle',
                  bullets: [
                    '3 archivos actualizados, 0 conflictos.',
                    'Última ejecución: hoy, 14:32 (hora del servidor).',
                  ],
                },
              ],
            })
          "
        />
      </ExampleFrame>

      <ExampleFrame
        title="Advertencia informativa (warning)"
        description="Riesgo o consecuencia a tener en cuenta, sin acción destructiva ni frase escrita."
      >
        <Button
          label="Abrir: advertencia informativa"
          icon="pi pi-exclamation-circle"
          severity="warn"
          variant="outlined"
          size="small"
          @click="
            openDemo({
              variant: 'warning',
              eyebrow: 'Atención',
              title: 'Plazo judicial próximo',
              subject: '01234-2024-0-1801-JR-CI-12',
              message:
                'El sistema detectó un plazo procesal en los próximos 5 días hábiles. Revisá el tablero de actuaciones para la fecha exacta y el escrito correspondiente.',
              callout: {
                title: 'Importante',
                body: 'Este aviso es informativo: no suspende plazos ni genera constancias ante el Poder Judicial.',
              },
            })
          "
        />
      </ExampleFrame>

      <ExampleFrame
        title="Estado loading"
        description="Mientras loading=true: botón con spinner, X oculta, Esc y máscara no cierran."
      >
        <Button
          label="Demo: loading 2s"
          icon="pi pi-bolt"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="openLoadingDemo"
        />
      </ExampleFrame>
    </section>

    <div style="border-top: 1px dashed var(--surface-border);" />

    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">¿Cuándo usar qué?</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold w-1/2" style="color: var(--fg-muted);">Caso</th>
              <th class="text-left px-4 py-2 font-semibold w-1/2" style="color: var(--fg-muted);">Patrón</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in whenToUseRows"
              :key="row.caso"
              style="border-bottom: 1px solid var(--surface-border);"
            >
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.caso }}</td>
              <td class="px-4 py-2.5 font-medium" style="color: var(--fg-muted);">{{ row.usar }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a
        href="https://primevue.org/dialog/"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 hover:text-[var(--accent)] transition-colors no-underline"
        style="color: var(--fg-muted);"
      >
        <i class="pi pi-external-link text-[10px]" />
        Docs PrimeVue Dialog
      </a>
      <span>·</span>
      <span>
        Componente:
        <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">
          @/components/common/InformationalDialogBase.vue
        </code>
      </span>
    </div>

    <InformationalDialogBase
      v-model:visible="visible"
      :variant="demoVariant"
      :eyebrow="demoEyebrow"
      :title="demoTitle"
      :subject="demoSubject"
      :message="demoMessage"
      :sections="demoSections"
      :facts="demoFacts"
      :callout="demoCallout"
      :loading="demoLoading"
      close-label="Entendido"
      close-aria-label="Cerrar"
    />
  </div>
</template>
