<template>
  <div class="flex flex-col gap-2">
    <canvas
      ref="canvasRef"
      class="border border-gray-300 rounded touch-none w-full max-w-md bg-white"
      :width="width"
      :height="height"
      @mousedown="start"
      @mousemove="move"
      @mouseup="end"
      @mouseleave="end"
      @touchstart.prevent="tStart"
      @touchmove.prevent="tMove"
      @touchend="end"
    />
    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        size="small"
        icon="pi pi-undo"
        :label="t('signatures.undo')"
        :disabled="!strokes.length"
        :aria-label="t('signatures.undo')"
        @click="undo"
      />
      <Button type="button" size="small" :label="t('signatures.clear')" @click="clear" />
      <Button
        type="button"
        size="small"
        :label="t('signatures.confirmDraw')"
        @click="confirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';

type Point = { x: number; y: number };
type Stroke = { points: Point[] };

const emit = defineEmits<{ (e: 'confirm', dataUrl: string): void }>();
const { t } = useI18n();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const width = 400;
const height = 180;
const strokes = ref<Stroke[]>([]);
let drawing = false;

onMounted(() => {
  const c = canvasRef.value?.getContext('2d');
  if (c) {
    c.strokeStyle = '#111';
    c.lineWidth = 2;
    c.lineCap = 'round';
  }
  redraw();
});

function pos(e: MouseEvent | Touch) {
  const c = canvasRef.value!;
  const r = c.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function paintStroke(s: Stroke, ctx: CanvasRenderingContext2D) {
  if (s.points.length < 1) return;
  ctx.beginPath();
  ctx.moveTo(s.points[0]!.x, s.points[0]!.y);
  for (let i = 1; i < s.points.length; i++) {
    const p = s.points[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

function redraw() {
  const c = canvasRef.value;
  if (!c) return;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const s of strokes.value) {
    paintStroke(s, ctx);
  }
}

function start(e: MouseEvent) {
  drawing = true;
  const p = pos(e);
  strokes.value = [...strokes.value, { points: [p] }];
  redraw();
}
function tStart(e: TouchEvent) {
  if (!e.touches[0]) return;
  start({ ...e, clientX: e.touches[0]!.clientX, clientY: e.touches[0]!.clientY } as any);
}
function move(e: MouseEvent) {
  if (!drawing) return;
  const p = pos(e);
  const last = strokes.value[strokes.value.length - 1];
  if (last) {
    last.points.push(p);
  }
  redraw();
}
function tMove(e: TouchEvent) {
  if (!e.touches[0]) return;
  move({ ...e, clientX: e.touches[0]!.clientX, clientY: e.touches[0]!.clientY } as any);
}
function end() {
  drawing = false;
}
function undo() {
  if (!strokes.value.length) return;
  strokes.value = strokes.value.slice(0, -1);
  redraw();
}
function clear() {
  strokes.value = [];
  redraw();
}
function confirm() {
  emit('confirm', canvasRef.value!.toDataURL('image/png'));
}
</script>
