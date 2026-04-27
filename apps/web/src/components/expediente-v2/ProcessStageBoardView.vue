<template>
  <div
    class="process-stage-board process-stage-board-v2 flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-app)] motion-reduce:transition-none"
  >
    <div v-if="loadError" class="p-4 text-sm text-red-600 dark:text-red-400">
      {{ loadError }}
    </div>
    <div v-else-if="loading" class="p-6 text-sm text-[var(--fg-muted)]" role="status">
      {{ t('processTrack.stageBoard.loading') }}
    </div>
    <div
      v-else
      class="flex min-h-0 min-h-[min(60vh,28rem)] flex-1 flex-col gap-0 lg:flex-row"
    >
      <!-- Hoja de ruta -->
      <aside
        class="flex w-full shrink-0 flex-col border-b border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm lg:w-[22.5rem] lg:border-b-0 lg:border-r"
        :aria-label="t('processTrack.stageBoard.roadmapAria')"
      >
        <div class="relative border-b border-[var(--surface-border)] px-4 py-3">
          <div
            class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#0F6E7A] via-[#2D3FBF] to-[#3FB58C] opacity-90"
          />
          <div class="flex items-center gap-2">
            <div class="relative min-w-0 flex-1 flex items-center gap-2">
              <Button
                type="button"
                :aria-label="t('processTrack.icon.title')"
                :title="t('processTrack.icon.title')"
                class="!min-h-9 !min-w-9 shrink-0 !p-0 text-[var(--fg-default)]"
                text
                rounded
                :style="{
                  backgroundColor: processIconBg,
                  color: processIconTextColor,
                }"
                @click.stop="(e) => openProcessIconPopover(e)"
              >
                <i :class="['text-base', 'pi', processIconName]" aria-hidden="true" />
              </Button>
              <div
                class="min-w-0 flex-1 cursor-pointer select-none"
                :aria-expanded="!roadmapListCollapsed"
                role="button"
                tabindex="0"
                @click="roadmapListCollapsed = !roadmapListCollapsed"
                @keydown.enter.prevent="roadmapListCollapsed = !roadmapListCollapsed"
                @keydown.space.prevent="roadmapListCollapsed = !roadmapListCollapsed"
              >
                <p class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                  {{ t('processTrack.stageBoard.processEyebrow') }}
                </p>
                <p class="m-0 truncate text-base font-semibold text-[var(--fg-default)]">
                  {{ flowLabel }}
                </p>
              </div>
            </div>
            <Popover
              ref="processIconPopoverRef"
              class="flex max-h-[min(26rem,85vh)] max-w-sm flex-col gap-3 overflow-hidden border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3 shadow-lg"
            >
              <p class="m-0 text-xs font-semibold text-[var(--fg-default)]">
                {{ t('processTrack.icon.title') }}
              </p>
              <div
                class="min-h-0 max-h-[min(15rem,52vh)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/20 p-2 [scrollbar-gutter:stable]"
                role="list"
              >
                <div class="grid grid-cols-6 gap-1">
                  <Button
                    v-for="ic in processIconOptions"
                    :key="ic"
                    type="button"
                    text
                    rounded
                    class="!min-h-9 !min-w-9 !p-0"
                    :class="iconDraft === ic ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''"
                    :aria-label="ic"
                    :aria-pressed="iconDraft === ic"
                    @click="setProcessIconDraft(ic)"
                  >
                    <i :class="`pi ${ic}`" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <p class="m-0 mb-1.5 text-[11px] font-medium text-[var(--fg-muted)]">{{ t('processTrack.icon.color') }}</p>
              <div class="mb-3 flex flex-wrap gap-1.5" role="list">
                <button
                  v-for="c in alegaStageColors"
                  :key="`icon-c-${c}`"
                  type="button"
                  class="h-7 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                  :class="iconColorDraft === c ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''"
                  :style="{ background: c }"
                  :aria-label="c"
                  :aria-pressed="iconColorDraft === c"
                  @click="setProcessIconColorDraft(c)"
                />
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" :label="t('common.cancel')" size="small" text @click="processIconPopoverRef?.hide?.()" />
                <Button
                  type="button"
                  :label="t('processTrack.icon.save')"
                  size="small"
                  :loading="iconSaveLoading"
                  @click="saveProcessIcon"
                />
              </div>
            </Popover>
          </div>
        </div>
        <div
          ref="roadmapScrollRef"
          class="roadmap-scroll-area min-h-0 flex-1 overflow-y-auto px-2 py-3 scroll-smooth [scrollbar-gutter:stable]"
        >
          <div
            v-for="(st, idx) in orderedStages"
            :key="st.id"
            :ref="(el) => setStageCardRef(st.id, el as HTMLElement | null)"
            class="roadmap-stage-entrance mb-2"
            :style="{ '--roadmap-delay': `${idx * 60}ms` }"
          >
            <div
              :class="[
                'roadmap-stage-card group cursor-pointer overflow-hidden rounded-xl bg-[var(--surface-raised)] text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--surface-border)] focus-visible:ring-offset-2 motion-reduce:transition-none',
                st.id === selectedStageId
                  ? 'border-2 shadow-md'
                  : 'border border-[var(--surface-border)] shadow-sm hover:border-[var(--surface-border-strong)] hover:shadow-md',
              ]"
              :style="st.id === selectedStageId ? { borderColor: stageStripeColor(st, idx) } : undefined"
              tabindex="0"
              :aria-label="stageTitle(st)"
              :aria-selected="st.id === selectedStageId"
              @click="selectedStageId = st.id"
              @keydown.enter.prevent="selectedStageId = st.id"
              @keydown.space.prevent="selectedStageId = st.id"
            >
            <div
              class="h-1.5 w-full"
              :style="{
                background: `linear-gradient(90deg, ${stageStripeColor(st, idx)} 0%, ${stageStripeColor(st, idx)}cc 100%)`,
              }"
            />
            <div class="flex items-start p-2.5">
              <div class="min-w-0 flex-1">
                <div
                  class="mb-0.5 flex items-start justify-between gap-2"
                >
                  <div class="line-clamp-2 min-w-0 flex-1 text-left text-sm font-semibold text-[var(--fg-default)]">
                    <span
                      class="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      :class="stageNudgeClass(st, idx)"
                    >
                      {{ t('processTrack.roadmap.stageN', { n: (st.order ?? idx) + 1 }) }}
                    </span>
                    {{ stageTitle(st) }}
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <Tag
                      :value="stageStatusLabel(st)"
                      rounded
                      :severity="stageTagSeverity(st)"
                      class="!text-[9px]"
                    />
                    <Button
                      type="button"
                      icon="pi pi-pencil"
                      text
                      rounded
                      size="small"
                      :aria-label="t('processTrack.roadmap.editStage')"
                      class="text-[var(--fg-muted)]"
                      @click.stop="openEditStage(st)"
                    />
                  </div>
                </div>
                <p
                  v-if="st.id !== selectedStageId"
                  class="m-0 mt-1 text-[10px] text-[var(--fg-muted)]"
                >
                  {{
                    t('processTrack.roadmap.progressShort', {
                      done: progressMap[st.id]?.done ?? 0,
                      total: progressMap[st.id]?.total ?? 0,
                    })
                  }}
                </p>
              </div>
            </div>
            <div
              class="roadmap-detail-collapse"
              :class="st.id === selectedStageId ? 'roadmap-detail-open' : ''"
            >
            <div
              class="min-h-0 border-t border-[var(--surface-border)] px-2.5 pb-2.5 pt-0"
            >
              <p class="m-0 mb-1 text-[11px] text-[var(--fg-muted)]">
                {{ t('processTrack.sprint.progress') }}: {{ progressMap[st.id]?.done ?? 0 }} /
                {{ progressMap[st.id]?.total ?? 0 }}
              </p>
              <div
                class="relative mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
                :aria-hidden="true"
              >
                <div
                  class="absolute inset-y-0 left-0 h-full rounded-full bg-[var(--surface-border-strong)]/70 transition-[width] motion-reduce:transition-none"
                  :style="{ width: stageActivePctLocal(st) + '%' }"
                />
                <div
                  class="absolute inset-y-0 left-0 h-full rounded-full transition-[width] motion-reduce:transition-none"
                  :style="{
                    width: stageDonePctLocal(st) + '%',
                    background: stageStripeColor(st, idx),
                  }"
                />
              </div>
              <p
                v-if="stageResponsibleName(st)"
                class="m-0 mb-1 flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]"
              >
                <Avatar
                  :label="stageResponsibleInitials(st)"
                  class="!h-6 !w-6 !text-[9px] bg-[var(--surface-sunken)] text-[var(--fg-default)]"
                  shape="circle"
                />
                <span class="truncate">{{ stageResponsibleName(st) }}</span>
              </p>
              <ul
                class="m-0 list-none space-y-1 border-t border-[var(--surface-border)] pt-2 text-[11px] text-[var(--fg-default)]"
              >
                <li
                  v-for="a in listPreviewActivities(st, 6)"
                  :key="a.id"
                  class="flex items-center gap-1.5 truncate"
                >
                  <i :class="['pi shrink-0 text-xs', listActivityIcon(a)]" aria-hidden="true" />
                  <span class="truncate">{{ a.title }}</span>
                </li>
                <li v-if="!listPreviewActivities(st, 6).length" class="text-[var(--fg-muted)]">
                  {{ t('processTrack.activity.empty') }}
                </li>
              </ul>
            </div>
            </div>
          </div>
          </div>
          <div class="roadmap-stage-entrance mb-2" :style="{ '--roadmap-delay': `${orderedStages.length * 60}ms` }">
            <button
              type="button"
              class="add-stage-btn flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--surface-border-strong)]/50 bg-[var(--surface-sunken)]/30 px-3 py-2.5 text-left text-sm font-medium text-[var(--accent)] transition-all duration-200 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-sunken)]/60 hover:shadow-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
              @click="openCreateStage"
            >
              <i class="pi pi-plus add-stage-icon" aria-hidden="true" />
              {{ t('processTrack.roadmap.addMoreStages') }}
            </button>
          </div>
        </div>
      </aside>

      <!-- Filtros + tablero -->
      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          class="board-toolbar flex flex-col gap-2 border-b border-[var(--surface-border)] bg-[var(--surface-raised)]/95 px-3 py-2.5 backdrop-blur-sm md:flex-row md:flex-wrap md:items-center md:gap-2"
        >
          <span class="icon-field-alega w-full min-w-0 max-w-[11rem] md:max-w-[11rem]">
            <i class="pi pi-search text-sm" />
            <InputText
              v-model="filterSearch"
              type="search"
              size="small"
              class="w-full text-sm"
              :placeholder="t('processTrack.stageBoard.searchPlaceholder')"
              @keydown.escape="filterSearch = ''"
            />
            <Button
              v-if="filterSearch"
              type="button"
              icon="pi pi-times"
              text
              rounded
              size="small"
              :aria-label="t('processTrack.stageBoard.clearSearchAria')"
              @click="filterSearch = ''"
            />
          </span>
          <MultiSelect
            v-model="filterUserIds"
            :options="userFilterOptions"
            option-label="label"
            option-value="value"
            display="chip"
            :placeholder="t('processTrack.stageBoard.filterUser')"
            class="w-full min-w-[8rem] max-w-[11rem] text-sm"
            :show-toggle-all="false"
            :max-selected-labels="1"
            size="small"
            :pt="{ root: { class: 'text-sm' } }"
          />
          <MultiSelect
            v-model="filterPriorities"
            :options="priorityFilterOptions"
            option-label="label"
            option-value="value"
            display="chip"
            :placeholder="t('processTrack.stageBoard.filterPriority')"
            class="w-full min-w-[8rem] max-w-[11rem] text-sm"
            :show-toggle-all="false"
            :max-selected-labels="1"
            size="small"
            :pt="{ root: { class: 'text-sm' } }"
          />
          <MultiSelect
            v-model="filterKinds"
            :options="kindFilterOptions"
            option-label="label"
            option-value="value"
            display="chip"
            :placeholder="t('processTrack.stageBoard.filterKind')"
            class="w-full min-w-[8rem] max-w-[11rem] text-sm"
            :show-toggle-all="false"
            :max-selected-labels="1"
            size="small"
            :pt="{ root: { class: 'text-sm' } }"
          />
          <div class="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 md:ml-auto md:w-auto">
            <Button
              v-if="hasActiveFilters"
              type="button"
              :label="t('processTrack.stageBoard.clearFilters')"
              text
              size="small"
              class="shrink-0"
              @click="clearFilters"
            />
            <p class="m-0 shrink-0 text-xs text-[var(--fg-muted)] tabular-nums" aria-live="polite">
              {{ t('processTrack.stageBoard.activitiesCount', { shown: filteredCount, total: totalInStageCount }) }}
            </p>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-1">
          <div v-if="!selectedStage" class="p-4 text-sm text-[var(--fg-muted)]">
            {{ t('processTrack.expedienteBoard.noStage') }}
          </div>
          <div
            v-else
            class="board-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-sunken)]/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]"
          >
            <div class="shrink-0 border-b border-[var(--surface-border)] bg-[var(--surface-raised)]/70 px-3 py-2 backdrop-blur-[2px]">
              <div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    :style="{
                      background: stageStripeColor(
                        selectedStage!,
                        orderedStages.findIndex((s) => s.id === selectedStage!.id),
                      ),
                    }"
                    aria-hidden="true"
                  />
                  <h2 class="m-0 min-w-0 flex-1 truncate text-sm font-semibold text-[var(--fg-default)]">
                    {{ t('processTrack.stageBoard.boardHeading', { stage: stageTitle(selectedStage) }) }}
                  </h2>
                  <Tag
                    v-if="selectedStage && isStageEditsLocked(selectedStage)"
                    :value="isWorkClosed(selectedStage) ? t('processTrack.stage.workClosedTag') : t('processTrack.stage.readOnlyShort')"
                    rounded
                    :severity="isWorkClosed(selectedStage) ? 'warn' : 'secondary'"
                    class="!text-[9px]"
                  />
                </div>
                <div class="flex shrink-0 items-center gap-1.5">
                  <Button
                    v-if="selectedStage && canReopenFromBoard(selectedStage)"
                    v-tooltip.bottom="t('processTrack.stage.reopen')"
                    type="button"
                    size="small"
                    severity="secondary"
                    outlined
                    :label="t('processTrack.stage.reopen')"
                    :loading="reopeningStage"
                    @click="openReopenFromBoard"
                  />
                  <Button
                    v-if="selectedStage && canAdvanceFromBoard(selectedStage)"
                    v-tooltip.bottom="t('processTrack.stage.closeWorkDescription')"
                    type="button"
                    size="small"
                    outlined
                    :label="t('processTrack.stage.closeWork')"
                    :loading="advancingStage"
                    @click="onAdvanceStageBoard"
                  />
                </div>
              </div>
            </div>
            <div
              class="kanban-board-scroll min-h-0 min-w-0 flex-1 basis-0 overflow-auto [scrollbar-gutter:stable] motion-reduce:scroll-smooth"
            >
              <div
                class="flex min-h-0 w-full min-w-0 items-stretch gap-2 px-2 pb-2 pt-0 sm:gap-3"
              >
                <section
                  v-for="(col, colIdx) in stateColumns"
                  :key="col.key"
                  class="kanban-col-animate relative z-0 flex w-[min(100vw,17rem)] max-w-[19rem] min-h-0 flex-shrink-0 flex-col self-stretch rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm transition-[box-shadow,border-color,transform] duration-200 ease-out motion-reduce:transition-none"
                  :class="[
                    dragHoverCol === col.key && dragActivityId
                      ? 'kanban-col-drop-target border-[var(--accent)]/50 shadow-[0_0_0_1px_var(--accent)] ring-2 ring-[var(--accent)]/20'
                      : '',
                  ]"
                  :style="{ '--kanban-col-delay': `${colIdx * 45}ms` }"
                  @dragover.prevent="onColDragOver($event, col.key)"
                  @drop="onStateColDrop($event, col.key)"
                >
                  <div
                    class="kanban-col-header sticky top-0 z-40 isolate flex shrink-0 items-center justify-between gap-1 border-b border-[var(--surface-border)] bg-[var(--surface-raised)]/95 px-2 py-2 backdrop-blur-sm [transform:translateZ(0)]"
                    :style="columnHeaderStyle(col.accent)"
                  >
                    <span class="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[var(--fg-default)]">
                      <span
                        class="inline-block h-2 w-2 shrink-0 rounded-full"
                        :style="{ background: col.accent }"
                        aria-hidden="true"
                      />
                      <span class="truncate">{{ col.label }}</span>
                      <span
                        class="ml-0.5 inline-flex min-h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--surface-raised)] px-1.5 text-[10px] font-bold tabular-nums text-[var(--fg-default)] ring-1 ring-[var(--surface-border)]"
                      >
                        {{ columnActivities(col.key).length }}
                      </span>
                    </span>
                    <Button
                      v-if="selectedStage && !isStageEditsLocked(selectedStage)"
                      type="button"
                      size="small"
                      text
                      rounded
                      :aria-label="t('processTrack.roadmap.addInColumn', { col: col.label })"
                      icon="pi pi-plus"
                      class="!min-h-9 !min-w-9 !p-0 text-[var(--fg-default)]"
                      @click.stop="emitCreateForColumn(col.key)"
                    />
                  </div>
                  <div class="relative z-0 space-y-2 p-2" @dragover.prevent="onColDragOver($event, col.key)">
                    <p
                      v-if="!columnActivities(col.key).length"
                      class="m-0 rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--surface-sunken)]/30 py-5 text-center text-xs leading-relaxed text-[var(--fg-muted)] motion-reduce:animate-none kanban-empty-col"
                    >
                      {{ t('processTrack.stageBoard.emptyColumn') }}
                    </p>
                    <div
                      v-for="a in columnActivities(col.key)"
                      :key="a.id"
                      :draggable="!a.isReverted && selectedStage !== null && !isStageEditsLocked(selectedStage)"
                      class="activity-card-entrance group flex min-h-0 flex-row overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm ring-1 ring-black/[0.02] transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none dark:ring-white/[0.04] dark:shadow-none"
                      :class="[
                        a.isReverted
                          ? 'pointer-events-none opacity-50'
                          : selectedStage && isStageEditsLocked(selectedStage)
                            ? 'cursor-default'
                            : 'cursor-grab active:cursor-grabbing hover:shadow-md motion-reduce:hover:translate-y-0 hover:-translate-y-0.5',
                        'focus-within:ring-2 focus-within:ring-[var(--p-primary-300)]/50',
                      ]"
                      role="button"
                      tabindex="0"
                      :aria-label="a.title"
                      @click="onActivityCardClick(a)"
                      @keydown.enter.prevent="onActivityCardClick(a)"
                      @dragstart="onCardDragStart($event, a.id)"
                      @dragend="onCardDragEnd"
                    >
                      <div
                        class="w-1 min-h-[4rem] shrink-0 self-stretch"
                        :style="{
                          background: a.accentColor || columnStripeForActivity(a),
                        }"
                        aria-hidden="true"
                      />
                      <div class="flex min-w-0 flex-1 flex-col p-3">
                        <h3
                          class="m-0 line-clamp-2 text-left text-sm font-semibold leading-snug text-[var(--fg-default)]"
                        >
                          {{ a.title }}
                        </h3>
                        <div
                          v-if="activityTicketKey(a) || a.kind || a.isLegalDeadline"
                          class="mt-2 flex flex-wrap items-center gap-1.5"
                        >
                          <span
                            v-if="activityTicketKey(a)"
                            :class="['inline-flex max-w-full shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-tight text-[var(--fg-default)]', ticketPillClass(a.workflowStateCategory)]"
                            :aria-label="ticketPillAria(a)"
                          >
                            {{ activityTicketKey(a) }}
                          </span>
                          <span
                            v-if="a.kind"
                            class="inline-flex max-w-full truncate rounded-md border border-[var(--surface-border)] bg-[var(--surface-sunken)]/80 px-1.5 py-0.5 text-[10px] font-medium text-[var(--fg-default)]"
                            :title="a.kind"
                          >
                            {{ a.kind }}
                          </span>
                          <span
                            v-if="a.isLegalDeadline"
                            class="inline-flex items-center gap-0.5 rounded border border-[#F3B7C9] bg-[#FBE3EB] px-1.5 py-0.5 text-[10px] font-medium text-[#A8355A] dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200"
                          >
                            {{ t('legal.plazoLegal') }}
                          </span>
                        </div>
                        <div
                          v-if="activityCardHasMetaRow(a)"
                          class="mb-2 mt-2.5 flex w-full min-w-0 items-center gap-2"
                          :class="dueBadgeText(a) ? 'justify-between' : 'justify-end'"
                        >
                          <div
                            v-if="dueBadgeText(a)"
                            :class="['inline-flex min-w-0 items-center gap-1 text-xs', dueRowTextClass(a)]"
                          >
                            <i
                              :class="dueIsOverdue(a) ? 'pi pi-exclamation-circle' : 'pi pi-calendar'"
                              class="!text-[0.7rem] shrink-0"
                              aria-hidden="true"
                            />
                            <span class="min-w-0 truncate">{{ dueBadgeText(a) }}</span>
                          </div>
                          <div
                            v-if="metaCounts(a).att || metaCounts(a).com"
                            class="inline-flex shrink-0 items-center gap-2 text-xs text-[var(--fg-muted)]"
                          >
                            <span
                              v-if="metaCounts(a).att"
                              class="inline-flex items-center gap-0.5"
                              :aria-label="`${metaCounts(a).att} archivos`"
                            >
                              <i class="pi pi-paperclip !text-[0.7rem]" aria-hidden="true" />
                              {{ metaCounts(a).att }}
                            </span>
                            <span
                              v-if="metaCounts(a).com"
                              class="inline-flex items-center gap-0.5"
                              :aria-label="`${metaCounts(a).com} comentarios`"
                            >
                              <i class="pi pi-comments !text-[0.7rem]" aria-hidden="true" />
                              {{ metaCounts(a).com }}
                            </span>
                          </div>
                        </div>
                        <div
                          :class="[
                            'flex min-h-0 items-center justify-between gap-2 border-t border-[var(--surface-border)] pt-2',
                            !activityCardHasMetaRow(a) ? 'mt-2.5' : '',
                          ]"
                        >
                          <span
                            v-tooltip.top="priorityTooltipText(priorityKey(a))"
                            :class="['inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', priorityBadgePillClass(a)]"
                            :aria-label="priorityTooltipText(priorityKey(a))"
                          >
                            <i class="pi pi-flag !text-[0.65rem] shrink-0" aria-hidden="true" />
                            <span class="min-w-0 truncate">{{ priorityBadgeLabel(a) }}</span>
                          </span>
                          <div class="flex shrink-0 items-center gap-2">
                            <span class="h-4 w-px shrink-0 bg-[var(--surface-border)]" aria-hidden="true" />
                            <Avatar
                              v-if="a.assignedTo"
                              :label="assigneeInitials(a.assignedTo)"
                              :title="assigneeName(a.assignedTo)"
                              :style="{ background: assigneeAvatarBg(a.assignedTo.id) }"
                              class="!h-6 !w-6 !text-[9px] !text-white !ring-2 !ring-white shrink-0"
                              shape="circle"
                            />
                            <div
                              v-else
                              class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--surface-border-strong)]/60"
                              :title="t('processTrack.activity.unassigned')"
                              role="img"
                              :aria-label="t('processTrack.activity.unassigned')"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      v-if="col.key === 'todo' && selectedStage && !isStageEditsLocked(selectedStage)"
                      type="button"
                      :label="t('processTrack.roadmap.addActivity')"
                      icon="pi pi-plus"
                      outlined
                      size="small"
                      class="w-full border-dashed"
                      :aria-label="t('processTrack.roadmap.addActivity')"
                      @click="emit('open-create-activity', { stageInstanceId: selectedStage.id, workflowStateCategory: 'todo' })"
                    />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer
      v-if="!loading && !loadError"
      class="footer-avance sticky bottom-0 z-20 border-t border-[var(--surface-border)] bg-[var(--surface-raised)]/95 px-4 py-2.5 shadow-[0_-6px_24px_rgba(15,23,42,0.06)] backdrop-blur-md dark:shadow-[0_-6px_24px_rgba(0,0,0,0.35)] sm:px-6"
    >
      <div class="flex w-full max-w-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div class="min-w-0">
          <p class="m-0 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
            {{ t('processTrack.stageBoard.footerTitle') }}
          </p>
          <p class="m-0 text-sm font-semibold text-[var(--fg-default)]">
            {{ t('processTrack.stageBoard.footerCompleted', { n: donePctGlobal }) }}
          </p>
        </div>
        <div
          class="relative h-2 w-full max-w-none flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)] sm:max-w-md"
        >
          <div
            class="absolute inset-y-0 left-0 h-full rounded-full bg-[var(--surface-border-strong)]/70 transition-[width]"
            :style="{ width: globalActivePct + '%' }"
          />
          <div
            class="absolute inset-y-0 left-0 h-full rounded-full transition-[width]"
            :style="{
              width: donePctGlobal + '%',
              background: 'linear-gradient(90deg, #0F6E7A 0%, #2D3FBF 50%, #3FB58C 100%)',
            }"
            role="progressbar"
            :aria-valuenow="donePctGlobal"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="t('processTrack.stageBoard.footerProgressAria')"
          />
        </div>
        <ul
          class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[var(--fg-muted)]"
          :aria-label="t('processTrack.stageBoard.footerLegendAria')"
        >
          <li class="inline-flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-[#3FB58C]" />
            <span>{{ t('processTrack.stageBoard.footerDone', { n: doneGlobalTotal }) }}</span>
          </li>
          <li class="inline-flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-[#E8A33D]" />
            <span>{{ t('processTrack.stageBoard.footerInProgress', { n: inProgressGlobalTotal }) }}</span>
          </li>
          <li v-if="overdueGlobalTotal" class="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200">
            <i class="pi pi-exclamation-triangle text-xs" />
            <span>{{ t('processTrack.stageBoard.footerOverdue', { n: overdueGlobalTotal }) }}</span>
          </li>
          <li class="inline-flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-slate-400" />
            <span>{{ t('processTrack.stageBoard.footerTotal', { n: totalActivityCount }) }}</span>
          </li>
        </ul>
      </div>
    </footer>

    <StageModal
      v-model="editStageVisible"
      :mode="stageModalMode"
      :initial="stageModalInitial"
      :users="stageModalUsers"
      :current-user-name="currentUserDisplayName"
      :edits-locked="!!editingStage && isWorkClosed(editingStage)"
      @save="onStageModalSave"
      @reopen-work="onReopenWorkInDialog"
    />

    <ConfirmDialog />
    <ReopenStageDialog ref="reopenStageBoardRef" :stages="reopenBoardOptions" @confirm="onReopenStageFlowConfirm" />
    <AdvanceStageDialog ref="advanceStageBoardRef" @done="onAdvanceStageDone" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Avatar from 'primevue/avatar';
import { apiClient } from '@/api/client';
import {
  advanceStage,
  createCustomActivity,
  createProcessTrackStage,
  patchProcessTrackActivity,
  patchProcessTrackMeta,
  patchStageInstanceMeta,
  reopenStage,
  reopenStageWork,
} from '@/api/process-tracks';
import { useProcessTrackData, type StageRow } from '@/composables/useProcessTrackData';
import { isStageEditsLocked, isStageWorkClosed } from '@tracker/shared';
import Popover from 'primevue/popover';
import { useAuthStore } from '@/stores/auth.store';
import AdvanceStageDialog from './AdvanceStageDialog.vue';
import ReopenStageDialog from './ReopenStageDialog.vue';
import StageModal from './StageModal.vue';
import {
  emptyStageDraft,
  type ActivityType,
  type ActivityPriorityUi,
  type ActivityStatusUi,
  type StageActivityDraft,
  type StageComment,
  type StageDraft,
} from './stage-modal.types';

const props = defineProps<{
  processTrackId: string;
  trackableId?: string;
  uploadFolderId?: string | null;
}>();
const emit = defineEmits<{
  (e: 'open-create-activity', payload: { stageInstanceId: string; workflowStateCategory: string }): void;
  (e: 'open-activity', activityId: string): void;
}>();

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();
const userOptionsForEdit = ref<{ label: string; value: string }[]>([]);

const STAGE_PLANNING_KEY = 'stagePlanning';

const currentUserDisplayName = computed(
  () =>
    [authStore.user?.firstName, authStore.user?.lastName].filter(Boolean).join(' ').trim()
    || authStore.user?.email
    || undefined,
);

const stageModalMode = ref<'create' | 'edit'>('create');
const stageModalInitial = ref<StageDraft>(emptyStageDraft());

const {
  loading,
  loadError,
  progressMap,
  pt,
  currentStageInstanceId,
  errMsg,
  currentStageOrder,
  stageTitle,
  load,
  loadSilent,
} = useProcessTrackData(() => props.processTrackId);

const alegaStageColors = ['#2D3FBF', '#7C4DB8', '#C85A9B', '#0F6E7A', '#3FB58C', '#E8A33D', '#0F1729', '#5B6D8C'];

function hashUserId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

const stageModalUsers = computed(() => {
  const list = alegaStageColors;
  return userOptionsForEdit.value.map((o) => {
    const label = o.label;
    const parts = String(label).split(/\s+/).filter(Boolean);
    const initials =
      parts.length > 1
        ? (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
        : (parts[0]?.slice(0, 2).toUpperCase() || '?');
    return {
      id: o.value,
      name: o.label,
      initials,
      color: list[hashUserId(o.value) % list.length]!,
    };
  });
});

const selectedStageId = ref<string | null>(null);
/** `true` = etapa expandida en hoja de ruta; por defecto cerrada hasta elegir etapa o abrir manualmente */
const roadmapListCollapsed = ref(false);
let dragActivityId: string | null = null;
const dragHoverCol = ref<'todo' | 'in_progress' | 'done' | null>(null);

/* ── Scroll-into-view + card refs for roadmap ── */
const roadmapScrollRef = ref<HTMLElement | null>(null);
const stageCardRefs = new Map<string, HTMLElement>();

function setStageCardRef(id: string, el: HTMLElement | null) {
  if (el) stageCardRefs.set(id, el);
  else stageCardRefs.delete(id);
}

watch(selectedStageId, (id) => {
  if (!id) return;
  nextTick(() => {
    const el = stageCardRefs.get(id);
    if (el && roadmapScrollRef.value) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
});

const filterSearch = ref('');
const filterUserIds = ref<string[]>([]);
const filterPriorities = ref<string[]>([]);
const filterKinds = ref<string[]>([]);

const flowLabel = computed(() => {
  const meta = (pt.value?.metadata as { label?: string } | null)?.label;
  if (meta?.trim()) return meta.trim();
  return (pt.value as { blueprint?: { name?: string } } | null)?.blueprint?.name?.trim() || t('processTrack.stepper.flowDefault');
});

const processTrackKeyPrefix = computed(() => {
  const p = (pt.value as { prefix?: string | null } | null)?.prefix;
  return typeof p === 'string' && p.trim() ? p.trim() : 'P';
});

const processIconOptions = [
  'pi-hammer',
  'pi-briefcase',
  'pi-book',
  'pi-pencil',
  'pi-file',
  'pi-building',
  'pi-id-card',
  'pi-graduation-cap',
  'pi-handshake',
  'pi-calculator',
  'pi-chart-line',
  'pi-verified',
  'pi-home',
  'pi-user',
  'pi-users',
  'pi-shield',
  'pi-bolt',
  'pi-flag',
  'pi-inbox',
  'pi-th-large',
  'pi-map',
  'pi-folder',
  'pi-calendar',
  'pi-cog',
] as const;

const processIconOptionSet = new Set<string>(processIconOptions);

/** PrimeIcons no incluye algunos nombres antiguos; normalizamos para no dejar celdas vacías en el picker. */
function normalizeProcessIconClass(icon: string | null | undefined): (typeof processIconOptions)[number] {
  const s = (icon || '').trim();
  if (!s.startsWith('pi-')) return 'pi-hammer';
  if (processIconOptionSet.has(s)) return s as (typeof processIconOptions)[number];
  if (s === 'pi-gavel' || s === 'pi-balance') return 'pi-hammer';
  return 'pi-hammer';
}

const processIconName = computed(() => {
  const raw = (pt.value?.metadata as { icon?: string } | null)?.icon;
  if (raw && typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('pi-')) return normalizeProcessIconClass(s);
  }
  return 'pi-hammer';
});

const processIconBg = computed(() => {
  const m = (pt.value?.metadata as { iconColor?: string } | null)?.iconColor;
  if (m && /^#[0-9A-Fa-f]{6}$/i.test(m)) return m;
  return '#0F1729';
});

function pickContrastFg(hex: string): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return '#E8EDF4';
  const n = parseInt(m, 16);
  if (Number.isNaN(n)) return '#E8EDF4';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return y > 0.55 ? 'var(--fg-default)' : '#E8EDF4';
}

const processIconTextColor = computed(() => pickContrastFg(processIconBg.value));

const processIconPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const iconDraft = ref<(typeof processIconOptions)[number]>('pi-hammer');
const iconColorDraft = ref('#0F1729');
const iconSaveLoading = ref(false);

const priorityFilterOptions = [
  { label: 'Baja', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'Alta', value: 'high' },
  { label: 'Urgente', value: 'urgent' },
];
const kindFilterOptions = [
  { label: 'Fase', value: 'Fase' },
  { label: 'Actuación', value: 'Actuacion' },
  { label: 'Diligencia', value: 'Diligencia' },
  { label: 'Escrito', value: 'Escrito' },
  { label: 'Audiencia', value: 'Audiencia' },
  { label: 'Plazo', value: 'Plazo' },
];

const orderedStages = computed(() => {
  const list = pt.value?.stageInstances ?? [];
  return [...list].sort((a, b) => a.order - b.order);
});

const selectedStage = computed(() =>
  orderedStages.value.find((s) => s.id === selectedStageId.value) ?? null,
);

const advancingStage = ref(false);
const reopeningStage = ref(false);
const advanceStageBoardRef = ref<InstanceType<typeof AdvanceStageDialog> | null>(null);
const reopenStageBoardRef = ref<InstanceType<typeof ReopenStageDialog> | null>(null);
const reopenBoardOptions = ref<{ id: string; label: string }[]>([]);
const reopeningWorkInDialog = ref(false);

function isWorkClosed(st: StageRow | null | undefined) {
  if (!st) return false;
  return isStageWorkClosed(st.metadata as Record<string, unknown> | null);
}

/** Cerrar etapa = avanzar workflow: solo en la etapa actual del track. */
function canAdvanceFromBoard(st: StageRow) {
  if (st.isReverted) return false;
  if ((st.status || '').toLowerCase() !== 'active') return false;
  if (st.id !== currentStageInstanceId.value) return false;
  return true;
}

/** Reabrir flujo (workflow): etapa completada u omitida antes de la etapa en curso. */
function canReopenFromBoard(st: StageRow) {
  const status = (st.status || '').toLowerCase();
  if (status !== 'completed' && status !== 'skipped') return false;
  if (st.order >= currentStageOrder.value) return false;
  return !st.isReverted;
}

function pendingOpenForAdvance(st: StageRow) {
  return visibleActivities(st).filter((a) => {
    if (a.isReverted) return false;
    const c = (a.workflowStateCategory || '').toLowerCase();
    return c !== 'done' && c !== 'cancelled';
  });
}

const stateColumns = computed(() => [
  { key: 'todo' as const, label: t('processTrack.activity.state.todo'), accent: '#8A92C7' },
  { key: 'in_progress' as const, label: t('processTrack.expedienteBoard.colInProgress'), accent: '#E8A33D' },
  { key: 'done' as const, label: t('processTrack.activity.state.done'), accent: '#3FB58C' },
]);

function columnHeaderStyle(accent: string) {
  return {
    borderTop: `3px solid ${accent}`,
  } as const;
}

function openProcessIconPopover(e: Event) {
  iconDraft.value = normalizeProcessIconClass(processIconName.value);
  const m = (pt.value?.metadata as { iconColor?: string } | null)?.iconColor;
  iconColorDraft.value = m && /^#[0-9A-Fa-f]{6}$/i.test(m) ? m : '#0F1729';
  processIconPopoverRef.value?.toggle(e);
}

function setProcessIconDraft(ic: (typeof processIconOptions)[number]) {
  iconDraft.value = ic;
}

function setProcessIconColorDraft(c: string) {
  iconColorDraft.value = c;
}

async function saveProcessIcon() {
  iconSaveLoading.value = true;
  try {
    await patchProcessTrackMeta(props.processTrackId, {
      icon: iconDraft.value,
      iconColor: iconColorDraft.value,
    });
    await loadSilent();
    processIconPopoverRef.value?.hide();
    toast.add({ severity: 'success', summary: t('common.success'), life: 2200 });
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, 'Error'), life: 4000 });
  } finally {
    iconSaveLoading.value = false;
  }
}

function onActivityCardClick(a: { id: string; isReverted?: boolean }) {
  if (a.isReverted) return;
  emit('open-activity', a.id);
}

function stageStripeColor(st: StageRow, idx: number): string {
  const fromMeta = st.metadata && typeof (st.metadata as { stageColor?: string }).stageColor === 'string'
    ? (st.metadata as { stageColor: string }).stageColor
    : '';
  if (fromMeta && /^#[0-9A-Fa-f]{6}$/.test(fromMeta)) return fromMeta;
  return alegaStageColors[idx % alegaStageColors.length]!;
}

function stageNudgeClass(st: StageRow, idx: number) {
  return st.id === selectedStageId.value
    ? 'bg-[#2D3FBF] text-white'
    : 'bg-slate-200/90 text-slate-800 dark:bg-slate-600 dark:text-slate-100';
}

function stageStatusLabel(st: StageRow) {
  if (st.isReverted) return t('processTrack.stage.status.reverted');
  const s = (st.status || '').toLowerCase();
  if (s === 'active') return t('processTrack.stage.status.active');
  if (s === 'pending') return t('processTrack.stage.status.pending');
  if (s === 'completed') return t('processTrack.stage.status.completed');
  if (s === 'skipped') return t('processTrack.stage.status.skipped');
  return st.status;
}

function stageTagSeverity(st: StageRow): 'success' | 'info' | 'secondary' | 'warn' {
  const s = (st.status || '').toLowerCase();
  if (s === 'active') return 'info';
  if (s === 'completed') return 'success';
  return 'secondary';
}

function stageCountsLocal(st: StageRow) {
  const acts = visibleActivities(st);
  const done = acts.filter((a) => (a.workflowStateCategory || '').toLowerCase() === 'done').length;
  const inProg = acts.filter((a) => {
    const c = (a.workflowStateCategory || '').toLowerCase();
    return c === 'in_progress' || c === 'in_review';
  }).length;
  return { done, inProg, total: acts.length };
}

function stageDonePctLocal(st: StageRow) {
  const { done, total } = stageCountsLocal(st);
  return total ? Math.min(100, Math.round((done * 100) / total)) : 0;
}

function stageActivePctLocal(st: StageRow) {
  const { done, inProg, total } = stageCountsLocal(st);
  return total ? Math.min(100, Math.round(((done + inProg) * 100) / total)) : 0;
}

async function loadUserOptions() {
  try {
    const { data } = await apiClient.get('/users', { params: { limit: 200 } });
    const list = Array.isArray(data) ? data : (data as { data: unknown[] }).data;
    const arr = Array.isArray(list) ? list : [];
    userOptionsForEdit.value = arr.map((u: { id: string; firstName?: string; lastName?: string; email: string }) => ({
      value: u.id,
      label: u.firstName ? `${[u.firstName, u.lastName || ''].filter(Boolean).join(' ')} (${u.email})` : u.email,
    }));
  } catch {
    userOptionsForEdit.value = [];
  }
}

function stageResponsibleName(st: StageRow) {
  const m = (st.metadata || {}) as { responsibleUserId?: string };
  if (m.responsibleUserId) {
    const o = userOptionsForEdit.value.find((x) => x.value === m.responsibleUserId);
    if (o) return o.label;
  }
  const acts = st.activities ?? [];
  for (const a of acts) {
    if (a.assignedTo) return assigneeName(a.assignedTo);
  }
  return '';
}

function stageResponsibleInitials(st: StageRow) {
  const n = stageResponsibleName(st);
  if (!n) return '?';
  return n
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function listPreviewActivities(st: StageRow, max: number) {
  return visibleActivities(st).slice(0, max);
}

const userFilterOptions = computed(() => {
  const st = selectedStage.value;
  const users = new Map<string, { label: string; value: string }>();
  for (const a of st?.activities ?? []) {
    const u = a.assignedTo;
    if (u?.id) {
      users.set(u.id, {
        value: u.id,
        label: assigneeName(u) || u.id,
      });
    }
  }
  return [...users.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const hasActiveFilters = computed(
  () =>
    filterSearch.value.trim().length > 0
    || filterUserIds.value.length > 0
    || filterPriorities.value.length > 0
    || filterKinds.value.length > 0,
);

function clearFilters() {
  filterSearch.value = '';
  filterUserIds.value = [];
  filterPriorities.value = [];
  filterKinds.value = [];
}

function activityStateLabel(cat: string) {
  const c = (cat || '').toLowerCase();
  if (c === 'done') return t('processTrack.activity.state.done');
  if (c === 'in_progress' || c === 'in_review') return t('processTrack.activity.state.inProgress');
  if (c === 'cancelled') return t('processTrack.activity.state.cancelled');
  return t('processTrack.activity.state.todo');
}

function activityTicketKey(a: { itemNumber?: number | null }): string | null {
  const n = a.itemNumber;
  if (n == null || Number.isNaN(Number(n))) return null;
  return `${processTrackKeyPrefix.value}-${n}`;
}

function ticketPillClass(cat: string) {
  const c = (cat || '').toLowerCase();
  if (c === 'done') return 'border-[#3FB58C]/45 bg-[#3FB58C]/18';
  if (c === 'in_progress' || c === 'in_review') return 'border-[#E8A33D]/50 bg-[#E8A33D]/20';
  return 'border-[#8A92C7]/50 bg-[#8A92C7]/20';
}

function ticketPillAria(a: { workflowStateCategory: string; itemNumber?: number | null }) {
  return t('processTrack.activity.ticketPill.aria', {
    key: activityTicketKey(a) ?? '—',
    state: activityStateLabel(a.workflowStateCategory),
  });
}

const ASSIGNEE_AVATAR_PALETTE = [
  '#2E7D6A',
  '#2563EB',
  '#7C3AED',
  '#C2410C',
  '#0D9488',
  '#4F46E5',
  '#B45309',
  '#0E7490',
];

function assigneeAvatarBg(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return ASSIGNEE_AVATAR_PALETTE[Math.abs(h) % ASSIGNEE_AVATAR_PALETTE.length]!;
}

function priorityKey(a: { priority?: string | null }) {
  return a.priority && String(a.priority).trim() ? a.priority : 'normal';
}

function priorityBadgeLabel(a: { priority?: string | null }) {
  const k = (priorityKey(a) || 'normal').toLowerCase();
  if (k === 'low') return t('processTrack.activity.priorityLevel.low');
  if (k === 'high' || k === 'urgent') return t('processTrack.activity.priorityLevel.high');
  return t('processTrack.activity.priorityLevel.normal');
}

function priorityBadgePillClass(a: { priority?: string | null }) {
  const k = (priorityKey(a) || 'normal').toLowerCase();
  if (k === 'low') {
    return 'border border-[#C8CCF5] bg-[#E8EAF5] text-[#1B2080] dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200';
  }
  if (k === 'high' || k === 'urgent') {
    return 'border border-[#F3B7C9] bg-[#FCE7F0] text-[#A8355A] dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-100';
  }
  return 'border border-[#F5D4A0] bg-[#FEF3E0] text-[#B45309] dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100';
}

function activityCardHasMetaRow(a: { dueDate?: string | null; metadata?: Record<string, unknown> | null }) {
  return (
    dueBadgeText(a) != null ||
    metaCounts(a).att > 0 ||
    metaCounts(a).com > 0
  );
}

function activityDueDiff(a: { dueDate?: string | null }): number | null {
  if (!a.dueDate) return null;
  const d = new Date(a.dueDate);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function dueBadgeText(a: { dueDate?: string | null }): string | null {
  const diff = activityDueDiff(a);
  if (diff === null) return null;
  if (diff < 0) return `Vencida hace ${Math.abs(diff)}d`;
  if (diff === 0) return 'Hoy';
  if (diff <= 3) return `En ${diff}d`;
  return `En ${diff}d`;
}

function dueIsOverdue(a: { dueDate?: string | null }) {
  const diff = activityDueDiff(a);
  return diff !== null && diff < 0;
}

function dueRowTextClass(a: { dueDate?: string | null }) {
  const diff = activityDueDiff(a);
  if (diff === null) return 'text-[#8A92C7] dark:text-[var(--fg-muted)]';
  if (diff < 0) return 'text-rose-600 dark:text-rose-300';
  if (diff <= 3) return 'text-amber-700 dark:text-amber-200';
  return 'text-[#8A92C7] dark:text-[var(--fg-muted)]';
}

function priorityTooltipText(p: string) {
  const k = (p || 'normal').toLowerCase();
  if (k === 'low') return t('processTrack.activity.priorityTooltip.low');
  if (k === 'high') return t('processTrack.activity.priorityTooltip.high');
  if (k === 'urgent') return t('processTrack.activity.priorityTooltip.urgent');
  return t('processTrack.activity.priorityTooltip.normal');
}

function activityBelongsToColumn(
  category: string,
  col: 'todo' | 'in_progress' | 'done',
): boolean {
  const c = (category || '').toLowerCase();
  if (c === 'cancelled') return false;
  if (col === 'done') return c === 'done';
  if (col === 'in_progress') return c === 'in_progress' || c === 'in_review';
  return c === 'todo' || c === '' || !['done', 'in_progress', 'in_review', 'cancelled'].includes(c);
}

function matchesFilters(
  a: {
    id: string;
    title: string;
    kind?: string | null;
    priority?: string | null;
    assignedTo?: { id?: string } | null;
  },
): boolean {
  const q = filterSearch.value.trim().toLowerCase();
  if (q) {
    const hay = `${a.title} ${a.kind || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filterUserIds.value.length) {
    const aid = a.assignedTo?.id;
    if (!aid || !filterUserIds.value.includes(aid)) return false;
  }
  if (filterPriorities.value.length) {
    const p = a.priority || 'normal';
    if (!filterPriorities.value.includes(p)) return false;
  }
  if (filterKinds.value.length) {
    const k = a.kind || '';
    if (!filterKinds.value.includes(k)) return false;
  }
  return true;
}

function visibleActivities(st: StageRow) {
  const acts = st.activities ?? [];
  return acts.filter((a) => (a.workflowStateCategory || '').toLowerCase() !== 'cancelled');
}

function visibleActivitiesFiltered(st: StageRow) {
  return visibleActivities(st).filter((a) => matchesFilters(a));
}

const totalInStageCount = computed(() => {
  if (!selectedStage.value) return 0;
  return visibleActivitiesFiltered(selectedStage.value).length;
});

const filteredCount = computed(() => totalInStageCount.value);

function columnActivities(col: 'todo' | 'in_progress' | 'done') {
  const st = selectedStage.value;
  if (!st) return [];
  return visibleActivitiesFiltered(st).filter((a) => activityBelongsToColumn(a.workflowStateCategory, col));
}

function columnStripeForActivity(
  a: { workflowStateCategory?: string | null; accentColor?: string | null },
) {
  if (a.accentColor) return a.accentColor;
  const c = (a.workflowStateCategory || '').toLowerCase();
  if (c === 'done') return '#3FB58C';
  if (c === 'in_progress' || c === 'in_review') return '#E8A33D';
  return '#8A92C7';
}

function metaCounts(a: { metadata?: Record<string, unknown> | null }) {
  const m = a.metadata || {};
  const att = (m as { attachmentsCount?: number }).attachmentsCount;
  const com = (m as { commentsCount?: number }).commentsCount;
  return {
    att: typeof att === 'number' && att > 0 ? att : 0,
    com: typeof com === 'number' && com > 0 ? com : 0,
  };
}

function assigneeName(u: { firstName?: string; lastName?: string; email?: string }) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return n || u.email || '';
}

function assigneeInitials(u: { firstName?: string; lastName?: string; email?: string }) {
  const a = assigneeName(u);
  if (!a) return '?';
  return a
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const allActivities = computed(() => {
  const out: Array<{
    id: string;
    workflowStateCategory: string;
    dueDate?: string | null;
  }> = [];
  for (const st of orderedStages.value) {
    for (const a of st.activities ?? []) {
      if ((a.workflowStateCategory || '').toLowerCase() === 'cancelled') continue;
      out.push({
        id: a.id,
        workflowStateCategory: a.workflowStateCategory,
        dueDate: a.dueDate,
      });
    }
  }
  return out;
});

const totalActivityCount = computed(() => allActivities.value.length);
const doneGlobalTotal = computed(
  () => allActivities.value.filter((a) => (a.workflowStateCategory || '').toLowerCase() === 'done').length,
);
const inProgressGlobalTotal = computed(() =>
  allActivities.value.filter((a) => {
    const c = (a.workflowStateCategory || '').toLowerCase();
    return c === 'in_progress' || c === 'in_review';
  }).length,
);
const overdueGlobalTotal = computed(() => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return allActivities.value.filter((a) => {
    if ((a.workflowStateCategory || '').toLowerCase() === 'done') return false;
    if (!a.dueDate) return false;
    const d = new Date(a.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < start.getTime();
  }).length;
});
const donePctGlobal = computed(() => {
  if (!totalActivityCount.value) return 0;
  return Math.min(100, Math.round((doneGlobalTotal.value / totalActivityCount.value) * 100));
});

const globalActivePct = computed(() => {
  if (!totalActivityCount.value) return 0;
  return Math.min(
    100,
    Math.round(((doneGlobalTotal.value + inProgressGlobalTotal.value) / totalActivityCount.value) * 100),
  );
});

function listActivityIcon(a: { workflowStateCategory?: string; dueDate?: string | null }) {
  const c = (a.workflowStateCategory || '').toLowerCase();
  if (c === 'done') return 'pi-check-circle text-[#3FB58C]';
  if (c === 'in_progress' || c === 'in_review') return 'pi-sync text-[#E8A33D]';
  if (a.dueDate) {
    const d = new Date(a.dueDate);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < start.getTime()) return 'pi-exclamation-triangle text-amber-600';
  }
  return 'pi-circle text-slate-400';
}

function categoryForColumn(col: 'todo' | 'in_progress' | 'done'): string {
  if (col === 'done') return 'done';
  if (col === 'in_progress') return 'in_progress';
  return 'todo';
}

function emitCreateForColumn(col: 'todo' | 'in_progress' | 'done') {
  const st = selectedStage.value;
  if (!st || isStageEditsLocked(st)) return;
  emit('open-create-activity', {
    stageInstanceId: st.id,
    workflowStateCategory: categoryForColumn(col),
  });
}

const editStageVisible = ref(false);
const editingStage = ref<StageRow | null>(null);

const validActivityTypes: ReadonlySet<string> = new Set([
  'Fase',
  'Diligencia',
  'Obligatoria',
  'Audiencia',
  'Crítica',
  'Trámite',
  'Informe',
]);

function computeDueInDays(iso: string | null | undefined) {
  if (!iso) return undefined;
  const end = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const d = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return d >= 0 ? d : 0;
}

function mapActivityToDraft(
  a: NonNullable<StageRow['activities']>[number],
): StageActivityDraft {
  const c = (a.workflowStateCategory || '').toLowerCase();
  let status: ActivityStatusUi = 'Pendiente';
  if (c === 'done') status = 'Hecha';
  else if (c === 'in_progress' || c === 'in_review') status = 'En progreso';
  const pr = (a.priority || 'normal').toLowerCase();
  let priority: ActivityPriorityUi = 'Media';
  if (pr === 'high' || pr === 'urgent') priority = 'Alta';
  else if (pr === 'low') priority = 'Baja';
  const k = a.kind;
  return {
    tempId: a.id,
    serverId: a.id,
    name: a.title,
    type: k && validActivityTypes.has(k) ? (k as ActivityType) : undefined,
    priority,
    assigneeId: a.assignedTo?.id,
    dueInDays: computeDueInDays(a.dueDate),
    status,
  };
}

type StagePlanningMeta = {
  description?: string;
  startDate?: string;
  endDate?: string;
  comments?: StageComment[];
};

function buildStageDraftFromRow(st: StageRow): StageDraft {
  const m = (st.metadata || {}) as {
    label?: string;
    stageColor?: string;
    responsibleUserId?: string | null;
    [STAGE_PLANNING_KEY]?: StagePlanningMeta;
  };
  const planning = m[STAGE_PLANNING_KEY] || {};
  return {
    id: st.id,
    name: (m.label && m.label.trim()) || stageTitle(st),
    color: (m.stageColor && /^#/.test(m.stageColor) ? m.stageColor : null) || stageStripeColor(st, orderedStages.value.indexOf(st)),
    responsibleId: m.responsibleUserId ?? undefined,
    description: planning.description,
    startDate: planning.startDate,
    endDate: planning.endDate,
    activities: (st.activities || []).map((a) => mapActivityToDraft(a)),
    documents: [],
    comments: (planning.comments as StageComment[] | undefined) ? [...(planning.comments as StageComment[])] : [],
  };
}

function statusUiToCategory(s: ActivityStatusUi): 'todo' | 'in_progress' | 'done' {
  if (s === 'Hecha') return 'done';
  if (s === 'En progreso') return 'in_progress';
  return 'todo';
}

function priorityUiToApi(p: ActivityPriorityUi): 'low' | 'normal' | 'high' {
  if (p === 'Alta') return 'high';
  if (p === 'Baja') return 'low';
  return 'normal';
}

function openCreateStage() {
  void loadUserOptions();
  editingStage.value = null;
  stageModalMode.value = 'create';
  stageModalInitial.value = emptyStageDraft();
  editStageVisible.value = true;
}

function openEditStage(st: StageRow) {
  void loadUserOptions();
  editingStage.value = st;
  stageModalMode.value = 'edit';
  stageModalInitial.value = buildStageDraftFromRow(st);
  editStageVisible.value = true;
}

function dueDateFromDays(dueInDays: number | undefined) {
  if (dueInDays == null || Number.isNaN(dueInDays)) return undefined;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dueInDays);
  return d.toISOString();
}

async function onStageModalSave(draft: StageDraft) {
  if (stageModalMode.value === 'create') {
    let newStageId: string;
    try {
      const created = await createProcessTrackStage(props.processTrackId);
      newStageId = (created as { id: string }).id;
    } catch (e) {
      toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stageModal.stageCreateErr')), life: 5000 });
      return;
    }
    const existingMeta: Record<string, unknown> = {
      [STAGE_PLANNING_KEY]: {
        description: draft.description,
        startDate: draft.startDate,
        endDate: draft.endDate,
        comments: draft.comments,
      } satisfies StagePlanningMeta,
    };
    try {
      await patchStageInstanceMeta(props.processTrackId, newStageId, {
        label: draft.name?.trim() || undefined,
        stageColor: draft.color,
        responsibleUserId: draft.responsibleId ?? null,
        metadata: existingMeta,
      });
    } catch (e) {
      toast.add({ severity: 'error', summary: errMsg(e, t('common.saving')), life: 4000 });
    }
    for (const a of draft.activities) {
      if (!a.name?.trim()) continue;
      try {
        await createCustomActivity(props.processTrackId, {
          stageInstanceId: newStageId,
          title: a.name.trim(),
          kind: a.type,
          priority: priorityUiToApi(a.priority),
          assignedToId: a.assigneeId ?? null,
          dueDate: dueDateFromDays(a.dueInDays) ?? null,
          workflowStateCategory: statusUiToCategory(a.status),
        });
      } catch (e) {
        toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.expedienteBoard.updateStateError')), life: 5000 });
      }
    }
    if (props.trackableId && props.uploadFolderId) {
      for (const doc of draft.documents) {
        if (!doc.file) continue;
        const form = new FormData();
        form.append('file', doc.file);
        form.append('title', doc.name.replace(/\.[^/.]+$/, '') || doc.name);
        form.append('folderId', props.uploadFolderId);
        form.append('trackableId', props.trackableId);
        form.append('classifiedStageInstanceId', newStageId);
        try {
          await apiClient.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (e) {
          toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stageModal.uploadDocErr')), life: 4000 });
        }
      }
    } else if (draft.documents.some((x) => x.file)) {
      toast.add({ severity: 'warn', summary: t('processTrack.stageModal.uploadDocErr'), life: 4000 });
    }
    await load();
    selectedStageId.value = newStageId;
    editStageVisible.value = false;
    editingStage.value = null;
    toast.add({ severity: 'success', summary: t('processTrack.stageModal.stageCreateOk'), life: 2200 });
    return;
  }
  const st = editingStage.value;
  if (!st) return;
  const m = (st.metadata || {}) as Record<string, unknown>;
  const planning = (m[STAGE_PLANNING_KEY] as StagePlanningMeta | undefined) || {};
  try {
    await patchStageInstanceMeta(props.processTrackId, st.id, {
      label: draft.name?.trim() || undefined,
      stageColor: draft.color,
      responsibleUserId: draft.responsibleId ?? null,
      metadata: {
        [STAGE_PLANNING_KEY]: {
          description: draft.description,
          startDate: draft.startDate,
          endDate: draft.endDate,
          comments: draft.comments,
        } satisfies StagePlanningMeta,
      },
    });
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('common.saving')), life: 4000 });
    return;
  }
  for (const a of draft.activities) {
    if (a.serverId) continue;
    if (!a.name?.trim()) continue;
    try {
      await createCustomActivity(props.processTrackId, {
        stageInstanceId: st.id,
        title: a.name.trim(),
        kind: a.type,
        priority: priorityUiToApi(a.priority),
        assignedToId: a.assigneeId ?? null,
        dueDate: dueDateFromDays(a.dueInDays) ?? null,
        workflowStateCategory: statusUiToCategory(a.status),
      });
    } catch (e) {
      toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.expedienteBoard.updateStateError')), life: 5000 });
    }
  }
  if (props.trackableId && props.uploadFolderId) {
    for (const doc of draft.documents) {
      if (!doc.file) continue;
      const form = new FormData();
      form.append('file', doc.file);
      form.append('title', doc.name.replace(/\.[^/.]+$/, '') || doc.name);
      form.append('folderId', props.uploadFolderId);
      form.append('trackableId', props.trackableId);
      form.append('classifiedStageInstanceId', st.id);
      try {
        await apiClient.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (e) {
        toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stageModal.uploadDocErr')), life: 4000 });
      }
    }
  }
  await load();
  editStageVisible.value = false;
  editingStage.value = null;
  toast.add({ severity: 'success', summary: t('processTrack.stageModal.stageSaveOk'), life: 2200 });
}

watch(editStageVisible, (v) => {
  if (!v) {
    editingStage.value = null;
  }
});

function onAdvanceStageBoard() {
  const st = selectedStage.value;
  if (!st) return;
  const pend = pendingOpenForAdvance(st);
  /** Un solo modal: con pendientes abrimos directo el de heredar / marcar; evita confirm + advance. */
  if (pend.length > 0) {
    advanceStageBoardRef.value?.show({
      processTrackId: props.processTrackId,
      stageInstanceId: st.id,
      pending: pend.map((x) => ({ id: x.id, title: x.title })),
    });
    return;
  }
  if (!progressMap.value[st.id]?.canAdvance) {
    toast.add({ severity: 'warn', summary: t('processTrack.sprint.advance'), life: 3000 });
    return;
  }
  confirm.require({
    header: t('processTrack.stage.closeWorkConfirmTitle'),
    message: t('processTrack.stage.closeWorkConfirmMessage'),
    icon: 'pi pi-exclamation-circle',
    acceptLabel: t('processTrack.stage.closeWork'),
    rejectLabel: t('common.cancel'),
    accept: async () => {
      await runAdvanceStageWhenClean();
    },
  });
}

/** Etapa sin actividades abiertas: confirmar y luego avanzar (409 abre el diálogo de pendientes si el servidor pide resolución). */
async function runAdvanceStageWhenClean() {
  const st = selectedStage.value;
  if (!st) return;
  advancingStage.value = true;
  try {
    await advanceStage(props.processTrackId, st.id);
    toast.add({ severity: 'success', summary: t('processTrack.stage.closeWork'), life: 2200 });
    await load();
    const active = orderedStages.value.find((s) => (s.status || '').toLowerCase() === 'active');
    if (active) selectedStageId.value = active.id;
  } catch (e) {
    const p = (e as { response?: { data?: { pending?: { id: string; title: string }[] } } })?.response?.data
      ?.pending;
    if (p?.length) {
      advanceStageBoardRef.value?.show({
        processTrackId: props.processTrackId,
        stageInstanceId: st.id,
        pending: p,
      });
      return;
    }
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stage.closeWorkError')), life: 4000 });
  } finally {
    advancingStage.value = false;
  }
}

function openReopenFromBoard() {
  const st = selectedStage.value;
  if (!st) return;
  reopenBoardOptions.value = [{ id: st.id, label: stageTitle(st) }];
  reopenStageBoardRef.value?.show();
}

async function onReopenStageFlowConfirm(p: { stageId: string; reason: string }) {
  reopeningStage.value = true;
  try {
    await reopenStage(props.processTrackId, p.stageId, { reason: p.reason });
    toast.add({ severity: 'success', summary: t('processTrack.stage.reopen'), life: 2400 });
    reopenStageBoardRef.value?.close();
    await load();
    const active = orderedStages.value.find((s) => (s.status || '').toLowerCase() === 'active');
    if (active) selectedStageId.value = active.id;
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stage.reopen')), life: 4000 });
  } finally {
    reopeningStage.value = false;
  }
}

async function onAdvanceStageDone() {
  await load();
  const active = orderedStages.value.find((s) => (s.status || '').toLowerCase() === 'active');
  if (active) selectedStageId.value = active.id;
}

async function onReopenWorkInDialog() {
  const st = editingStage.value;
  if (!st) return;
  reopeningWorkInDialog.value = true;
  try {
    await reopenStageWork(props.processTrackId, st.id);
    toast.add({ severity: 'success', summary: t('processTrack.stage.reopenWork'), life: 2200 });
    await load();
    const fresh = orderedStages.value.find((s) => s.id === st.id);
    if (fresh) editingStage.value = fresh;
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stage.reopenWorkError')), life: 4000 });
  } finally {
    reopeningWorkInDialog.value = false;
  }
}

function onCardDragStart(e: DragEvent, activityId: string) {
  dragActivityId = activityId;
  e.dataTransfer?.setData('text/plain', activityId);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}

function onCardDragEnd() {
  dragActivityId = null;
  dragHoverCol.value = null;
}

function onColDragOver(_e: DragEvent, col: 'todo' | 'in_progress' | 'done') {
  if (dragActivityId) dragHoverCol.value = col;
}

function onStateColDrop(e: DragEvent, col: 'todo' | 'in_progress' | 'done') {
  e.preventDefault();
  dragHoverCol.value = null;
  if (selectedStage.value && isStageEditsLocked(selectedStage.value)) {
    dragActivityId = null;
    toast.add({ severity: 'warn', summary: t('processTrack.stage.terminalReadOnly'), life: 3500 });
    return;
  }
  const id = e.dataTransfer?.getData('text/plain') || dragActivityId;
  if (!id || !selectedStage.value) {
    dragActivityId = null;
    return;
  }
  const next = categoryForColumn(col);
  const act = visibleActivities(selectedStage.value).find((a) => a.id === id) as
    | { isReverted?: boolean; workflowStateCategory?: string }
    | undefined;
  if (!act || act.isReverted) {
    dragActivityId = null;
    return;
  }
  const cur = (act.workflowStateCategory || '').toLowerCase();
  if (cur === next || (col === 'in_progress' && (cur === 'in_progress' || cur === 'in_review'))) {
    dragActivityId = null;
    return;
  }
  const prev = act.workflowStateCategory ?? '';
  (act as { workflowStateCategory: string }).workflowStateCategory = next;
  void patchProcessTrackActivity(props.processTrackId, id, { workflowStateCategory: next })
    .then(() => {
      void loadSilent();
    })
    .catch((err) => {
      (act as { workflowStateCategory: string }).workflowStateCategory = prev;
      toast.add({ severity: 'error', summary: errMsg(err, t('processTrack.expedienteBoard.updateStateError')), life: 4000 });
    });
  dragActivityId = null;
}

watch(
  [orderedStages, loading],
  () => {
    if (loading.value) return;
    const stages = orderedStages.value;
    if (selectedStageId.value && stages.some((s) => s.id === selectedStageId.value)) {
      return;
    }
    const firstActive = stages.find((s) => (s.status || '').toLowerCase() === 'active');
    selectedStageId.value = firstActive?.id ?? stages[0]?.id ?? null;
  },
  { immediate: true },
);

watch(
  () => props.processTrackId,
  (id) => {
    if (id) void load();
  },
  { immediate: true },
);

defineExpose({ refresh: loadSilent });
</script>

<style scoped>
.board-toolbar {
  background-image: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-raised, #fff) 92%, transparent) 0%,
    color-mix(in srgb, var(--surface-raised, #fff) 100%, transparent) 100%
  );
}

.board-shell {
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--surface-border, #e5e7eb) 55%, transparent),
    inset 0 12px 28px color-mix(in srgb, var(--brand-abismo, #0f1729) 4%, transparent);
}

/* ── Roadmap stage cards: entrance + hover ── */
.roadmap-stage-entrance {
  animation: roadmapCardIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--roadmap-delay, 0ms);
}

.roadmap-stage-card {
  will-change: transform, box-shadow;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s ease-out,
    border-color 0.28s ease;
}

.roadmap-stage-card:not(:hover) {
  transform: translateZ(0);
}

@media (hover: hover) {
  .roadmap-stage-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px color-mix(in srgb, var(--brand-abismo, #0f1729) 10%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent, #0f6e7a) 10%, transparent);
  }
}

/* ── Detail panel expand / collapse ── */
.roadmap-detail-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.26s ease;
}

.roadmap-detail-collapse > * {
  overflow: hidden;
}

.roadmap-detail-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

/* ── Roadmap scroll area ── */
.roadmap-scroll-area {
  scroll-behavior: smooth;
}

/* ── Add-stage button ── */
.add-stage-btn .add-stage-icon {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .add-stage-btn:hover .add-stage-icon {
    transform: rotate(90deg) scale(1.1);
  }
}

.kanban-col-animate {
  animation: kanbanColIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--kanban-col-delay, 0ms);
}

.kanban-col-drop-target {
  transform: translateY(-1px);
}

.activity-card-entrance {
  animation: cardIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@media (hover: hover) {
  .activity-card-entrance:hover {
    box-shadow:
      0 10px 22px color-mix(in srgb, var(--brand-abismo, #0f1729) 10%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent, #0f6e7a) 18%, transparent);
  }
}

.kanban-empty-col {
  animation: emptyPulse 2.8s ease-in-out infinite;
}

@keyframes roadmapCardIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes kanbanColIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes emptyPulse {
  0%,
  100% {
    border-color: var(--surface-border, #e5e7eb);
    background-color: color-mix(in srgb, var(--surface-sunken, #f1f5f9) 25%, transparent);
  }
  50% {
    border-color: color-mix(in srgb, var(--accent, #0f6e7a) 22%, var(--surface-border, #e5e7eb));
    background-color: color-mix(in srgb, var(--surface-sunken, #f1f5f9) 38%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kanban-col-animate,
  .activity-card-entrance,
  .kanban-empty-col,
  .roadmap-stage-entrance {
    animation: none !important;
  }

  .roadmap-stage-card:hover {
    transform: none;
  }

  .roadmap-detail-collapse {
    transition: none !important;
  }

  .roadmap-scroll-area {
    scroll-behavior: auto;
  }

  .add-stage-btn .add-stage-icon {
    transition: none !important;
  }
}

.icon-field-alega {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 0.625rem;
  padding: 0.125rem 0.5rem 0.125rem 0.25rem;
  background: var(--surface-raised, #fff);
}
.icon-field-alega :deep(.p-inputtext) {
  border: none;
  box-shadow: none;
}

</style>
