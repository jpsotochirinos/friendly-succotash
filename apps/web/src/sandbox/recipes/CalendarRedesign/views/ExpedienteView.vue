<script setup lang="ts">
import { computed } from 'vue';
import { urgencyForActuacion } from '../urgency';
import { EXPEDIENTES, type Actuacion, type Expediente, type Usuario } from '../mocks';
import ExpedienteCard from './ExpedienteCard.vue';

const props = withDefaults(
  defineProps<{
    actuaciones: Actuacion[];
    expedientes?: Expediente[];
    usuarios?: Usuario[];
  }>(),
  {},
);

const expedientesList = computed(() => props.expedientes ?? EXPEDIENTES);

const emit = defineEmits<{
  (e: 'open', a: Actuacion): void;
  (e: 'add', exp: Expediente): void;
}>();

const URGENCY_RANK = {
  done: 0,
  info: 1,
  normal: 2,
  warn: 3,
  urgent: 4,
  overdue: 5,
} as const;

const ordered = computed(() => {
  return [...expedientesList.value]
    .map((e) => {
      const acts = props.actuaciones
        .filter((a) => a.expedienteId === e.id)
        .sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
      const next = acts.find(
        (a) => a.estado !== 'cumplido' && a.estado !== 'presentado',
      );
      let priority = -1;
      if (next) {
        const lvl = urgencyForActuacion(next.tipo, new Date(next.fechaIso), next.estado);
        priority = URGENCY_RANK[lvl];
      }
      const nextTime = next ? new Date(next.fechaIso).getTime() : Number.POSITIVE_INFINITY;
      return { exp: e, acts, priority, nextTime };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.nextTime - b.nextTime;
    });
});
</script>

<template>
  <section class="exps">
    <ExpedienteCard
      v-for="row in ordered"
      :key="row.exp.id"
      :expediente="row.exp"
      :actuaciones="row.acts"
      :usuarios="usuarios"
      @open="(a) => emit('open', a)"
      @add="(e) => emit('add', e)"
    />
  </section>
</template>

<style scoped>
.exps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 34rem), 1fr));
  align-items: start;
  gap: 12px;
}
</style>
