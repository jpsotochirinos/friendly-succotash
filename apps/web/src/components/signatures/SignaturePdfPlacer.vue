<template>
  <div v-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
  <div v-else class="flex min-h-0 flex-col gap-2">
    <p class="m-0 text-sm text-[var(--fg-muted)]">{{ t('signatures.placeHint') }}</p>
    <div v-if="numPages" class="flex flex-wrap items-center gap-2 text-sm">
      <span>{{ t('signatures.placePageLabel') }}</span>
      <select
        v-model.number="activePage"
        class="rounded border border-[var(--surface-border)] bg-[var(--surface-ground)] px-2 py-1"
      >
        <option v-for="n in numPages" :key="n" :value="n - 1">
          {{ t('signatures.placePageN', { n, total: numPages }) }}
        </option>
      </select>
    </div>
    <div
      class="max-h-[min(70vh,36rem)] min-h-[200px] overflow-auto rounded border border-[var(--surface-border)] bg-[var(--surface-ground)]/40"
    >
      <div v-if="loading" class="flex items-center justify-center p-8">
        <ProgressSpinner
          :style="{ width: '2rem', height: '2rem' }"
          stroke-width="3"
          :aria-label="t('app.loading')"
        />
      </div>
      <div v-else class="flex flex-col items-center gap-3 p-2">
        <div
          v-for="(pg, i) in pages"
          :key="i"
          class="relative flex justify-center"
          :class="i === activePage ? 'ring-2 ring-amber-500/50' : ''"
        >
          <div
            class="relative"
            :style="{ width: pg.cssW + 'px', minHeight: pg.cssH + 'px' }"
            :data-page-index="i"
          >
            <img
              :src="pg.dataUrl"
              class="block h-auto w-full"
              :width="pg.cssW"
              :height="pg.cssH"
              :alt="t('signatures.pdfPageN', { n: i + 1 })"
              draggable="false"
            />
            <div
              v-show="i === activePage"
              class="absolute box-border"
              :style="boxStyle"
              :aria-label="t('signatures.placeBox')"
            >
              <div
                class="h-full w-full border-2 border-dashed border-amber-500 bg-amber-400/20"
                @pointerdown.stop.prevent="(e) => onDragStart(e, 'move', i)"
              />
              <div
                class="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm border border-amber-600 bg-amber-200"
                @pointerdown.stop.prevent="(e) => onDragStart(e, 'resize', i)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ProgressSpinner from 'primevue/progressspinner';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = String(workerUrl);

export type PlacedZone = { page: number; x: number; y: number; width: number; height: number };

const props = defineProps<{
  pdfUrl: string;
}>();
const { t } = useI18n();
const model = defineModel<PlacedZone | null>({ required: true });

const loadError = ref<string | null>(null);
const loading = ref(true);
const numPages = ref(0);
const pages = ref<
  { pdfW: number; pdfH: number; cssW: number; cssH: number; dataUrl: string }[]
>([]);
const activePage = ref(0);

const MIN_C = { w: 120, h: 48 };
const DEFAULT = { x: 72, y: 120, w: 200, h: 64 };

const box = ref({ x: 40, y: 80, w: 200, h: 64, page: 0 });

const boxStyle = computed(() => ({
  left: box.value.x + 'px',
  top: box.value.y + 'px',
  width: box.value.w + 'px',
  height: box.value.h + 'px',
}));

let mode: 'move' | 'resize' | null = null;
let startX = 0;
let startY = 0;
let orig = { x: 0, y: 0, w: 0, h: 0 };

function placerToPdf(
  p: (typeof pages)['value'][0],
  b: { x: number; y: number; w: number; h: number; page: number },
): PlacedZone {
  const s = p.pdfW / p.cssW;
  return {
    page: b.page + 1,
    x: b.x * s,
    y: p.pdfH - (b.y + b.h) * s,
    width: b.w * s,
    height: b.h * s,
  };
}

function emitModel() {
  const p = pages.value[box.value.page];
  if (!p) return;
  model.value = placerToPdf(p, { ...box.value, page: box.value.page });
}

function setDefaultOnPage(p: (typeof pages)['value'][0], page: number) {
  const s = p.pdfW / p.cssW;
  const w = Math.max(MIN_C.w, DEFAULT.w / s);
  const h = Math.max(MIN_C.h, DEFAULT.h / s);
  const x = DEFAULT.x / s;
  const top = (p.pdfH - DEFAULT.y - DEFAULT.h) / s;
  box.value = {
    page,
    x: Math.max(0, Math.min(x, p.cssW - w)),
    y: Math.max(0, Math.min(top, p.cssH - h)),
    w: Math.min(w, p.cssW),
    h: Math.min(h, p.cssH),
  };
}

function onMove(e: PointerEvent) {
  if (!mode) return;
  const p = pages.value[box.value.page];
  if (!p) return;
  if (mode === 'move') {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    box.value.x = Math.max(0, Math.min(orig.x + dx, p.cssW - box.value.w));
    box.value.y = Math.max(0, Math.min(orig.y + dy, p.cssH - box.value.h));
  } else {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const nw = Math.max(MIN_C.w, orig.w + dx);
    const nh = Math.max(MIN_C.h, orig.h + dy);
    box.value.w = Math.min(nw, p.cssW - box.value.x);
    box.value.h = Math.min(nh, p.cssH - box.value.y);
  }
  emitModel();
}

function onUp() {
  if (mode) {
    mode = null;
    emitModel();
  }
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onUp);
}

function onDragStart(e: PointerEvent, m: 'move' | 'resize', page: number) {
  if (page !== activePage.value) return;
  mode = m;
  startX = e.clientX;
  startY = e.clientY;
  orig = { x: box.value.x, y: box.value.y, w: box.value.w, h: box.value.h };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  e.currentTarget && (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
}

onBeforeUnmount(() => onUp());

async function loadPdf() {
  loadError.value = null;
  loading.value = true;
  pages.value = [];
  try {
    const task = getDocument({ url: props.pdfUrl, withCredentials: false });
    const doc = await task.promise;
    numPages.value = doc.numPages;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const out: (typeof pages)['value'] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const maxCssW = 720;
      const sc = maxCssW / base.width;
      const vp = page.getViewport({ scale: sc * dpr });
      const c = document.createElement('canvas');
      c.width = vp.width;
      c.height = vp.height;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('2d');
      await page.render({ canvasContext: ctx, canvas: c, viewport: vp, intent: 'display' }).promise;
      out.push({
        pdfW: base.width,
        pdfH: base.height,
        cssW: vp.width / dpr,
        cssH: vp.height / dpr,
        dataUrl: c.toDataURL('image/png', 0.9),
      });
    }
    pages.value = out;
    activePage.value = 0;
    if (out[0]) {
      setDefaultOnPage(out[0]!, 0);
      emitModel();
    }
  } catch (e) {
    loadError.value = (e as Error).message || String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.pdfUrl) void loadPdf();
});
watch(
  () => props.pdfUrl,
  (u) => {
    if (u) void loadPdf();
  },
);
watch(activePage, (p) => {
  box.value.page = p;
  const pg = pages.value[p];
  if (pg) {
    setDefaultOnPage(pg, p);
    emitModel();
  }
});
</script>
