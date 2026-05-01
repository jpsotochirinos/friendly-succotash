<script setup lang="ts">
import { computed, ref } from 'vue';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Checkbox from 'primevue/checkbox';
import Popover from 'primevue/popover';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import CalendarFilterTrigger from '@/views/calendar/components/CalendarFilterTrigger.vue';
import { hashAvatarColor } from '@/utils/avatarColor';

const MOCK_USERS = [
  { id: 'u1', name: 'Carlos Mendoza', initials: 'CM', avatarColor: '#3b5bdb' },
  { id: 'u2', name: 'Ana Torres', initials: 'AT', avatarColor: '#0ca678' },
  { id: 'u3', name: 'Luis Paredes', initials: 'LP', avatarColor: '#e67700' },
];

const currentUser = MOCK_USERS[0]!;

interface AssigneeOption {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  isMine?: boolean;
  isUnassigned?: boolean;
  isDivider?: boolean;
}

const assigneeOptions: AssigneeOption[] = [
  { id: '__mine', name: 'Asignado a mí', initials: currentUser.initials, avatarColor: currentUser.avatarColor, isMine: true },
  { id: '__d1', name: '', initials: '', avatarColor: '', isDivider: true },
  ...MOCK_USERS.map((u) => ({ id: u.id, name: u.name, initials: u.initials, avatarColor: u.avatarColor })),
  { id: '__d2', name: '', initials: '', avatarColor: '', isDivider: true },
  { id: '__unassigned', name: 'Sin asignar', initials: 'SA', avatarColor: '', isUnassigned: true },
];

const assigneeFilters = ref<string[]>(['__mine']);
const assigneePopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assigneePopoverOpen = ref(false);

const MAX_TRIGGER_AVATARS = 3;

const triggerAvatars = computed(() =>
  assigneeFilters.value
    .filter((id) => id !== '__unassigned')
    .map((id): { initials: string; color: string; name: string } | null => {
      if (id === '__mine') {
        return {
          initials: currentUser.initials,
          color: currentUser.avatarColor,
          name: 'Asignado a mí',
        };
      }
      const u = MOCK_USERS.find((m) => m.id === id);
      return u ? { initials: u.initials, color: u.avatarColor, name: u.name } : null;
    })
    .filter((x): x is { initials: string; color: string; name: string } => x !== null)
    .slice(0, MAX_TRIGGER_AVATARS),
);

const triggerOverflow = computed(() =>
  Math.max(0, assigneeFilters.value.filter((id) => id !== '__unassigned').length - MAX_TRIGGER_AVATARS),
);

const triggerOverflowTooltip = computed(() =>
  assigneeFilters.value
    .filter((id) => id !== '__unassigned')
    .slice(MAX_TRIGGER_AVATARS)
    .map((id) => {
      if (id === '__mine') return 'Asignado a mí';
      return MOCK_USERS.find((u) => u.id === id)?.name ?? id;
    })
    .join(', '),
);

function toggleAssigneeFilter(id: string) {
  const next = new Set(assigneeFilters.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  assigneeFilters.value = Array.from(next);
}

const codeSnippet = `<!-- CalendarFilterTrigger + Popover (mesa / calendario) -->
<CalendarFilterTrigger
  a11y-label="Filtrar por abogado asignado"
  label="Asignado"
  icon="pi pi-user-plus"
  :active="assigneeFilters.length > 0"
  :expanded="assigneePopoverOpen"
  @toggle="(e) => assigneePopoverRef?.toggle(e)"
>
  <AvatarGroup v-if="triggerAvatars.length > 0">…</AvatarGroup>
  <div v-else class="cal-filter-trigger-empty"><i class="pi pi-user-plus" /></div>
</CalendarFilterTrigger>
<Popover ref="assigneePopoverRef" @show="assigneePopoverOpen = true" @hide="assigneePopoverOpen = false">
  <!-- Checkbox list + «Asignado a mí» con badge Yo -->
</Popover>`;
</script>

<template>
  <div class="waf-page flex flex-col gap-10 p-4 md:p-6 max-w-2xl mx-auto">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Patrones / Toolbar</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Filtro asignado (CalendarFilterTrigger)</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Mismo patrón que calendario y receta Expediente v2.1: trigger compacto, avatares en el botón, checklist en Popover.
        Estado inicial de ejemplo: solo «Asignado a mí».
      </p>
    </div>

    <ExampleFrame
      title="Demo interactivo"
      description="Pulsa «Asignado» para abrir el popover. Combina «Asignado a mí», usuarios y «Sin asignar»."
      :code="codeSnippet"
    >
      <div
        class="flex flex-wrap items-center gap-3 rounded-xl p-6"
        style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <span class="text-xs font-medium shrink-0" style="color: var(--fg-muted);">Filtro:</span>
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <CalendarFilterTrigger
            a11y-label="Filtrar por abogado asignado"
            label="Asignado"
            icon="pi pi-user-plus"
            :active="assigneeFilters.length > 0"
            :expanded="assigneePopoverOpen"
            @toggle="(e) => assigneePopoverRef?.toggle(e)"
          >
            <AvatarGroup v-if="triggerAvatars.length > 0" class="wb-filter-avatar-group">
              <Avatar
                v-for="av in triggerAvatars"
                :key="av.name"
                :label="av.initials"
                shape="circle"
                size="small"
                class="wb-filter-avatar"
                :style="{ background: av.color, color: '#fff' }"
                :aria-label="av.name"
                v-tooltip.top="av.name"
              />
              <Avatar
                v-if="triggerOverflow > 0"
                :label="`+${triggerOverflow}`"
                shape="circle"
                size="small"
                class="wb-filter-avatar"
                :style="{ background: 'var(--surface-sunken)', color: 'var(--fg-muted)', border: '1px solid var(--surface-border)' }"
                :aria-label="triggerOverflowTooltip"
                v-tooltip.top="triggerOverflowTooltip"
              />
            </AvatarGroup>
            <AvatarGroup v-else-if="assigneeFilters.includes('__unassigned')" class="wb-filter-avatar-group">
              <Avatar
                label="SA"
                shape="circle"
                size="small"
                class="wb-filter-avatar"
                :style="{ background: 'var(--surface-sunken)', color: 'var(--fg-muted)', border: '1px dashed var(--surface-border)' }"
                aria-label="Sin asignar"
                v-tooltip.top="'Sin asignar'"
              />
            </AvatarGroup>
            <div v-else class="cal-filter-trigger-empty" aria-hidden="true">
              <i class="pi pi-user-plus" />
            </div>
          </CalendarFilterTrigger>

          <Popover
            ref="assigneePopoverRef"
            class="wb-assignee-pop"
            @show="assigneePopoverOpen = true"
            @hide="assigneePopoverOpen = false"
          >
            <div class="wb-assignee-pop__header">
              <p>Abogados asignados</p>
              <button
                v-if="assigneeFilters.length > 0"
                type="button"
                class="wb-assignee-pop__clear"
                @click="assigneeFilters = []"
              >
                Limpiar
              </button>
            </div>
            <ul class="wb-assignee-pop__list" aria-label="Filtrar por asignado">
              <template v-for="opt in assigneeOptions" :key="opt.id">
                <li v-if="opt.isDivider" class="wb-assignee-pop__divider" aria-hidden="true" />
                <li v-else>
                  <label
                    :for="`waf-${opt.id}`"
                    class="wb-assignee-pop__item"
                    :class="{ 'wb-assignee-pop__item--mine': opt.isMine }"
                  >
                    <Checkbox
                      :model-value="assigneeFilters.includes(opt.id)"
                      binary
                      :input-id="`waf-${opt.id}`"
                      @update:model-value="toggleAssigneeFilter(opt.id)"
                    />
                    <span
                      v-if="opt.isMine"
                      class="wb-assignee-pop__avatar wb-assignee-pop__avatar--mine"
                      :style="{ background: opt.avatarColor }"
                      aria-hidden="true"
                    >
                      {{ opt.initials }}
                      <span class="wb-assignee-pop__me-badge">Yo</span>
                    </span>
                    <Avatar
                      v-else-if="!opt.isUnassigned"
                      :label="opt.initials"
                      shape="circle"
                      size="small"
                      class="wb-assignee-pop__avatar-pv shrink-0"
                      :style="{ background: hashAvatarColor(opt.name), color: '#fff' }"
                      aria-hidden="true"
                    />
                    <span
                      v-else
                      class="wb-assignee-pop__avatar wb-assignee-pop__avatar--empty"
                      aria-hidden="true"
                    ><i class="pi pi-user-plus" /></span>
                    <span class="wb-assignee-pop__name">{{ opt.name }}</span>
                  </label>
                </li>
              </template>
            </ul>
          </Popover>
        </div>
      </div>
    </ExampleFrame>
  </div>
</template>

<style scoped>
.wb-filter-avatar-group :deep(.p-avatar) {
  width: 1.375rem;
  height: 1.375rem;
  font-size: 0.52rem;
}

:deep(.wb-assignee-pop) {
  width: min(100vw - 2rem, 14rem);
}

.wb-assignee-pop__list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0;
  padding: 0.3rem;
  list-style: none;
}

.wb-assignee-pop__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--surface-border);
  padding: 0.55rem 0.75rem 0.45rem;
}

.wb-assignee-pop__header p {
  margin: 0;
  color: var(--fg-muted);
  font-size: 0.67rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wb-assignee-pop__clear {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 650;
  padding: 0;
}

.wb-assignee-pop__clear:hover {
  text-decoration: underline;
}

.wb-assignee-pop__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  border-radius: 0.55rem;
  color: var(--fg-default);
  cursor: pointer;
  font-size: 0.82rem;
  padding: 0.45rem 0.55rem;
  transition: background-color 0.1s ease;
}

.wb-assignee-pop__item:hover {
  background: color-mix(in srgb, var(--accent-soft) 60%, transparent);
}

.wb-assignee-pop__avatar {
  display: inline-grid;
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  color: var(--fg-on-brand);
  font-size: 0.6rem;
  font-weight: 760;
}

.wb-assignee-pop__avatar--empty {
  background: var(--surface-sunken);
  border: 1px dashed var(--surface-border);
  color: var(--fg-muted);
  font-size: 0.72rem;
}

.wb-assignee-pop__name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-assignee-pop__avatar-pv :deep(.p-avatar) {
  width: 1.6rem;
  height: 1.6rem;
  font-size: 0.6rem;
}

.wb-assignee-pop__divider {
  height: 1px;
  margin: 0.25rem 0.55rem;
  background: var(--surface-border);
}

.wb-assignee-pop__item--mine {
  font-weight: 650;
}

.wb-assignee-pop__avatar--mine {
  position: relative;
}

.wb-assignee-pop__me-badge {
  position: absolute;
  bottom: -0.25rem;
  right: -0.35rem;
  display: inline-grid;
  place-items: center;
  border: 1.5px solid var(--surface-raised);
  border-radius: 999px;
  background: var(--accent);
  color: var(--fg-on-brand);
  font-size: 0.42rem;
  font-weight: 760;
  line-height: 1;
  padding: 0.08rem 0.22rem;
  pointer-events: none;
}
</style>
