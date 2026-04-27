<template>
  <div class="flex flex-col gap-6">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <template v-else-if="!canTrackableRead">
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
        <i class="pi pi-lock text-4xl opacity-60" />
        <p class="m-0">{{ t('trackables.noPermission') }}</p>
      </div>
    </template>
    <template v-else>
    <ConfirmDialogBase
      v-model:visible="showArchiveConfirm"
      variant="warning"
      :title="t('trackables.archiveConfirmHeader')"
      :subject="archiveConfirmTarget?.title"
      :message="t('trackables.archiveConfirmMessage')"
      :consequences="archiveConfirmConsequences"
      :consequences-title="t('trackables.confirmConsequencesTitle')"
      :confirm-label="t('trackables.archiveActionLabel')"
      :loading="archivingConfirm"
      @hide="onArchiveConfirmHide"
      @confirm="confirmArchiveTrackable"
    />

    <ConfirmDialogBase
      v-model:visible="showReactivateConfirm"
      variant="success"
      :title="t('trackables.reactivateConfirmHeader')"
      :subject="reactivateConfirmTarget?.title"
      :message="t('trackables.reactivateConfirmMessage')"
      :consequences="reactivateConfirmConsequences"
      :consequences-title="t('trackables.confirmConsequencesTitle')"
      :confirm-label="t('trackables.reactivateActionLabel')"
      :loading="reactivatingConfirm"
      @hide="onReactivateConfirmHide"
      @confirm="confirmReactivateTrackable"
    />

    <ConfirmDialogBase
      v-model:visible="showTrashPermanentConfirm"
      variant="danger"
      :title="t('trackables.trashPermanentConfirmHeader')"
      :subject="trashPermanentTarget?.title"
      :message="t('trackables.trashPermanentConfirmMessage')"
      :consequences="trashPermanentConsequences"
      :consequences-title="t('trackables.confirmConsequencesTitle')"
      :typed-confirm-phrase="t('trackables.trashPermanentTypeWord')"
      :typed-confirm-hint="t('trackables.trashPermanentTypedHint')"
      :typed-confirm-label="t('trackables.trashPermanentInputLabel')"
      :confirm-label="t('trackables.trashPermanentConfirmButton')"
      :cancel-label="t('common.cancel')"
      :loading="trashPermanentDeleting"
      @hide="onTrashPermanentHide"
      @confirm="confirmPermanentDeleteDocument"
    />

    <PageHeader :title="t('trackables.title')" :subtitle="t('trackables.pageSubtitle')">
      <template #actions>
        <Button
          v-if="canTrackableCreate && listScope === 'active'"
          :label="t('trackables.newMatter')"
          icon="pi pi-plus"
          size="small"
          @click="showCreateDialog = true"
        />
      </template>
    </PageHeader>

    <SelectButton
      v-model="listScope"
      :options="scopeOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="scope-tabs"
    />

    <template v-if="listScope === 'trash'">
      <template v-if="!canDocRead">
        <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
          <i class="pi pi-lock text-4xl opacity-60" />
          <p>{{ t('trackables.trashNoPermission') }}</p>
        </div>
      </template>
      <template v-else>
        <div class="app-card overflow-hidden">
          <div v-if="trashLoading && trashDocuments.length === 0" class="overflow-x-auto">
            <div class="min-w-[560px]">
              <div class="grid grid-cols-[minmax(260px,1fr)_160px_120px] gap-4 border-b border-[var(--surface-border)] px-4 py-3">
                <Skeleton v-for="col in 3" :key="`trash-head-${col}`" height="0.75rem" />
              </div>
              <div
                v-for="row in tableSkeletonRows.slice(0, 5)"
                :key="`trash-skeleton-${row}`"
                class="grid grid-cols-[minmax(260px,1fr)_160px_120px] items-center gap-4 border-b border-[var(--surface-border)] px-4 py-4 last:border-0"
              >
                <div class="flex items-center gap-2">
                  <Skeleton shape="circle" size="1.75rem" />
                  <Skeleton height="0.85rem" width="70%" />
                </div>
                <Skeleton height="0.8rem" width="7rem" />
                <div class="flex justify-end gap-2">
                  <Skeleton shape="circle" size="2rem" />
                  <Skeleton shape="circle" size="2rem" />
                </div>
              </div>
            </div>
          </div>
          <DataTable
            v-else
            class="trash-data-table"
            :value="trashDocuments"
            :loading="trashLoading"
            data-key="id"
            size="small"
            striped-rows
            scrollHeight="400px"
            row-hover
            scrollable
            responsive-layout="scroll"
            paginator
            :rows="20"
            :rows-per-page-options="[10, 20, 50]"
            :current-page-report-template="t('trackables.trashTablePageReport')"
          >
            <template #empty>
              <div
                v-if="!trashLoading"
                class="flex flex-col items-center justify-center gap-2 py-16 text-center"
              >
                <i class="pi pi-inbox text-4xl text-[var(--fg-subtle)]" aria-hidden="true" />
                <p class="m-0 text-base font-medium text-[var(--fg-default)]">
                  {{ t('trackables.trashEmpty') }}
                </p>
                <p class="m-0 text-sm text-[var(--fg-muted)]">
                  {{ t('trackables.trashEmptyHint') }}
                </p>
              </div>
            </template>
            <Column field="title" :header="t('trackables.docTitle')">
              <template #body="{ data }">
                <div class="flex min-w-0 items-center gap-2">
                  <i :class="getFileIcon(data.mimeType)" />
                  <span class="min-w-0 truncate text-[var(--fg-default)]" :title="data.title">{{
                    data.title
                  }}</span>
                </div>
              </template>
            </Column>
            <Column field="deletedAt" :header="t('trackables.trashDeletedAt')" sortable>
              <template #body="{ data }">
                <span class="tabular-nums text-[var(--fg-muted)]">{{
                  formatDateShort(data.deletedAt)
                }}</span>
              </template>
            </Column>
            <Column
              v-if="canDocUpdate || canDocDelete"
              :header="t('common.actions')"
              class="w-0 min-w-[7rem] whitespace-nowrap"
            >
              <template #body="{ data }">
                <div class="flex flex-wrap justify-end gap-0.5">
                  <Button
                    v-if="canDocUpdate"
                    icon="pi pi-replay"
                    text
                    rounded
                    size="small"
                    :aria-label="t('trackables.tooltipRestoreDocument')"
                    v-tooltip.top="t('trackables.tooltipRestoreDocument')"
                    @click="restoreDocument(data)"
                  />
                  <Button
                    v-if="canDocDelete"
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    size="small"
                    :aria-label="t('trackables.tooltipDeleteDocumentForever')"
                    v-tooltip.top="t('trackables.tooltipDeleteDocumentForever')"
                    @click="permanentDeleteDocument(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </template>

    <template v-else>
    <!-- KPI: solo en expedientes en curso -->
    <div
      v-if="listScope === 'active'"
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      role="toolbar"
      :aria-label="t('trackables.activityKpiToolbarAria')"
    >
      <button
        v-for="(card, cardIdx) in activityKpiCards"
        :key="card.id"
        type="button"
        class="exp-kpi-card group relative min-h-[5.75rem] overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 text-left shadow-sm transition-[box-shadow,border-color,transform] duration-200 outline-offset-4"
        :class="[
          card.urgencyBarClass,
          isActivityKpiActive(card.id)
            ? `exp-kpi-card--active z-10 ring-2 ${card.activeRingClass}`
            : 'exp-kpi-card--idle hover:border-[color-mix(in_srgb,var(--kpi-accent)_22%,var(--surface-border))] hover:outline hover:outline-1 hover:outline-[color-mix(in_srgb,var(--kpi-accent)_35%,transparent)]',
        ]"
        :style="{
          '--stagger-delay': `${cardIdx * 60}ms`,
          '--kpi-accent': card.accentColor,
          '--kpi-mesh-2': card.mesh2,
        }"
        :aria-pressed="isActivityKpiActive(card.id) ? 'true' : 'false'"
        :aria-label="card.aria"
        @click="toggleActivityFilter(card.id)"
      >
        <div class="exp-kpi-mesh pointer-events-none absolute inset-0 opacity-100" />
        <div
          class="exp-kpi-grain pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <span
          v-if="card.pulse"
          class="exp-kpi-pulse pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_3px_color-mix(in_srgb,var(--surface-raised)_70%,transparent)]"
          aria-hidden="true"
        />
        <div class="relative flex min-h-[4.75rem] items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="exp-kpi-label m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)]">
              {{ card.label }}
            </p>
            <p
              class="exp-kpi-number m-0 mt-2 text-3xl font-semibold tabular-nums tracking-tight sm:text-[2.125rem]"
              :class="card.numberClass"
              style="font-feature-settings: 'tnum' 1, 'lnum' 1"
            >
              {{ card.count }}
            </p>
          </div>
          <span class="exp-kpi-icon-wrap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm" aria-hidden="true">
            <i :class="[card.icon, 'text-sm']" />
          </span>
        </div>
      </button>
    </div>

    <div
      class="app-card matters-cockpit-card flex max-h-[min(82vh,calc(100dvh-11rem))] min-h-0 flex-col overflow-hidden shadow-sm"
    >
      <!-- Command toolbar -->
      <div
        class="matters-command-toolbar flex flex-shrink-0 flex-col gap-3 border-b border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3"
        role="toolbar"
        :aria-label="t('trackables.toolbarCommandBarAria')"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <IconField ref="mattersSearchFieldRef" class="toolbar-iconfield min-w-0 flex-1">
            <InputIcon class="pi pi-search text-[var(--fg-subtle)]" />
            <InputText
              v-model="filters.search"
              :placeholder="t('trackables.toolbarSearchPlaceholder')"
              class="toolbar-search w-full min-w-0 rounded-xl"
              :aria-label="t('common.search')"
              autocomplete="off"
              @input="resetAndLoad"
            />
          </IconField>
          <div
            class="flex min-w-0 shrink-0 flex-col gap-2 border-t border-[var(--surface-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:border-t-0 sm:pt-0 lg:border-l lg:border-t-0 lg:pl-5"
            role="group"
            :aria-label="t('trackables.toolbarResultsGroupAria')"
          >
            <div
              class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm tabular-nums text-[var(--fg-default)]"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>{{ t('trackables.toolbarResults', { n: totalRecords }) }}</span>
              <template v-if="activeFilterCount > 0">
                <span class="text-[var(--fg-subtle)]" aria-hidden="true">·</span>
                <Button
                  type="button"
                  class="matters-active-filters-btn !p-0 font-mono text-sm font-medium normal-case text-accent underline-offset-2 hover:underline"
                  :label="t('trackables.toolbarFiltersActive', { n: activeFilterCount })"
                  text
                  @click="(e) => filtersPopoverRef?.toggle(e)"
                />
              </template>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-1.5">
              <Button
                v-if="hasActiveFilters"
                :label="t('trackables.clearFilters')"
                icon="pi pi-filter-slash"
                text
                size="small"
                class="shrink-0"
                @click="clearFilters"
              />
              <Button
                type="button"
                :label="t('trackables.toolbarSavedViews')"
                icon="pi pi-bookmark"
                text
                size="small"
                class="shrink-0"
                :aria-haspopup="true"
                :aria-expanded="false"
                @click="(e) => savedViewsMenuRef?.toggle(e)"
              />
              <Button
                type="button"
                icon="pi pi-ellipsis-h"
                text
                rounded
                size="small"
                class="shrink-0"
                :aria-label="t('trackables.toolbarMoreActions')"
                @click="(e) => moreActionsMenuRef?.toggle(e)"
              />
            </div>
          </div>
        </div>
        <Popover ref="filtersPopoverRef" class="matters-filters-popover w-[min(100vw-2rem,22rem)]">
          <div class="flex flex-col gap-2 p-3">
            <p class="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)]">
              {{ t('trackables.activeFiltersTitle') }}
            </p>
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <li
                v-for="row in activeFilterRows"
                :key="row.id"
                class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-[color-mix(in_srgb,var(--accent-soft)_55%,transparent)]"
              >
                <span class="min-w-0 flex-1 text-sm text-[var(--fg-default)]">{{ row.label }}</span>
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  :aria-label="t('trackables.activeFilterRemoveAria')"
                  @click="removeActiveFilterRow(row)"
                />
              </li>
            </ul>
          </div>
        </Popover>
        <Menu ref="savedViewsMenuRef" :model="savedViewsMenuItems" popup />
        <Menu ref="moreActionsMenuRef" :model="moreActionsMenuItems" popup />
        <div
          class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
          role="group"
          :aria-label="t('trackables.typeLabel')"
        >
          <div class="-mx-1 flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:thin] snap-x snap-mandatory sm:flex-wrap sm:snap-none sm:overflow-x-visible">
            <button
              v-for="opt in typeChipOptions"
              :key="String(opt.value ?? 'all')"
              type="button"
              class="type-chip shrink-0 snap-start"
              :class="[
                filters.type === opt.value ? 'type-chip--active' : '',
                opt.value == null ? 'type-chip--all' : `type-chip--${opt.value}`,
              ]"
              :style="{ '--chip-accent': typeChipAccentColor(opt.value) }"
              :aria-pressed="filters.type === opt.value"
              @click="setTypeChip(opt.value)"
            >
              <span
                class="type-chip__dot shrink-0"
                :style="{ background: typeChipAccentColor(opt.value) }"
                aria-hidden="true"
              />
              {{ opt.label }}
            </button>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:shrink-0">
            <Dropdown
              v-if="listScope === 'active'"
              v-model="filters.status"
              :options="statusFilterOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('trackables.statusFilterPlaceholder')"
              show-clear
              class="toolbar-dropdown w-full min-w-0 sm:w-auto sm:min-w-[11rem] sm:max-w-[14rem]"
              :aria-label="t('trackables.statusFilterPlaceholder')"
              @change="resetAndLoad"
            />
            <Dropdown
              v-model="filters.assignedToId"
              :options="assigneeFilterOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('trackables.assigneeFilterPlaceholder')"
              show-clear
              class="toolbar-dropdown toolbar-dropdown-assignee w-full min-w-0 sm:min-w-[12rem] sm:max-w-[20rem]"
              :aria-label="t('trackables.assigneeFilterPlaceholder')"
              @change="resetAndLoad"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex min-w-0 items-center gap-2">
                  <i class="pi pi-user shrink-0 text-sm text-[var(--fg-subtle)]" aria-hidden="true" />
                  <span class="min-w-0 truncate text-sm">{{ assigneeDisplayLabel(slotProps.value) }}</span>
                </div>
                <div v-else class="flex items-center gap-2 text-[var(--fg-subtle)]">
                  <i class="pi pi-user text-sm" aria-hidden="true" />
                  <span class="text-sm">{{ t('trackables.assigneeFilterPlaceholder') }}</span>
                </div>
              </template>
              <template #option="{ option }">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--fg-on-brand)]"
                    :style="{ background: assigneeAvatarBg(option.value) }"
                  >
                    {{ initialsFromLabel(option.label) }}
                  </span>
                  <span class="min-w-0 truncate">{{ option.label }}</span>
                </div>
              </template>
            </Dropdown>
          </div>
        </div>
      </div>

      <div
        v-if="mattersShowSkeleton"
        class="matters-skeleton-shell flex-1 min-h-[420px] overflow-x-auto overscroll-x-contain"
        :aria-label="t('trackables.loadingTable')"
      >
        <div class="min-w-[760px]">
          <div
            class="grid grid-cols-[minmax(280px,1.8fr)_140px_220px_220px_140px] gap-4 border-b border-[var(--surface-border)] px-4 py-3"
          >
            <Skeleton v-for="col in 5" :key="`matter-head-${col}`" height="0.75rem" />
          </div>
          <div
            v-for="row in tableSkeletonRows"
            :key="`matter-skeleton-${row}`"
            class="grid grid-cols-[minmax(280px,1.8fr)_140px_220px_220px_140px] items-center gap-4 border-b border-[var(--surface-border)] px-4 py-4 last:border-0"
          >
            <div class="flex min-w-0 items-center gap-3">
              <Skeleton shape="circle" size="2.25rem" />
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton height="0.9rem" width="80%" />
                <Skeleton height="0.7rem" width="55%" />
              </div>
            </div>
            <Skeleton height="1.4rem" width="5.5rem" border-radius="999px" />
            <div class="flex items-center gap-2">
              <Skeleton shape="circle" size="2rem" />
              <Skeleton height="0.8rem" width="7rem" />
            </div>
            <Skeleton height="1.8rem" width="11rem" border-radius="999px" />
            <div class="flex justify-end gap-2">
              <Skeleton shape="circle" size="2rem" />
              <Skeleton shape="circle" size="2rem" />
            </div>
          </div>
        </div>
      </div>
      <div
        v-else
        class="matters-dt-region relative flex min-h-0 flex-1 flex-col"
        :class="{ 'matters-dt-region--scrolled': mattersDtScrolled }"
      >
        <DataTable
          ref="mattersDtRef"
          class="matters-data-table min-h-0 flex-1"
          :class="{ 'matters-dt--comfortable': tableDensity === 'comfortable' }"
          :value="trackables"
          :loading="loading"
          data-key="id"
          :size="tableDensity === 'compact' ? 'small' : undefined"
          scrollable
          scroll-height="flex"
          row-hover
          responsive-layout="scroll"
          :row-class="matterRowClass"
          export-filename="expedientes"
          :table-props="{ 'aria-label': t('trackables.tableAriaLabel') }"
        >
        <template #empty>
          <div
            v-if="!loading"
            class="flex flex-col items-center justify-center gap-2 py-16 text-center"
          >
            <i
              class="pi pi-folder-open text-4xl text-[var(--fg-subtle)]"
              aria-hidden="true"
            />
            <p class="m-0 text-base font-medium text-[var(--fg-default)]">
              {{ t('trackables.tableEmptyTitle') }}
            </p>
            <p class="m-0 max-w-sm text-sm text-[var(--fg-muted)]">
              {{ listScope === 'archived' ? t('trackables.tableEmptyArchived') : t('trackables.tableEmptyActive') }}
            </p>
          </div>
        </template>
        <Column field="title" :header="t('trackables.tableColTitle')">
          <template #body="{ data }">
            <div class="matter-title-cell flex min-w-0 items-start gap-3 py-1">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--accent-soft)] text-lg"
                :aria-label="t('trackables.matterEmojiLabel')"
              >
                {{ matterEmoji(data) }}
              </span>
              <div class="flex min-w-0 flex-col gap-1">
                <span
                  v-if="matterCaseKey(data)"
                  class="matter-case-key inline-flex w-fit max-w-full truncate rounded-md border border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-raised)_88%,var(--accent-soft))] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--fg-muted)]"
                >
                  {{ matterCaseKey(data) }}
                </span>
                <router-link
                  :to="`/trackables/${data.id}`"
                  class="font-semibold leading-snug text-accent hover:underline"
                >
                  <span class="line-clamp-2">{{ data.title }}</span>
                </router-link>
                <p class="m-0 line-clamp-1 text-xs text-[var(--fg-subtle)]">
                  {{ matterCaseKey(data) ? matterSubtitleLine(data) : matterMetaLine(data) }}
                </p>
              </div>
            </div>
          </template>
        </Column>
        <Column field="type" :header="t('trackables.tableColType')">
          <template #body="{ data }">
            <Tag
              :value="typeLabel(data.type).toLocaleUpperCase(dateLocaleTag())"
              :severity="typeSeverity(data.type)"
              class="matter-type-tag tracking-wide"
            />
          </template>
        </Column>
        <Column field="assignedTo" :header="t('trackables.tableColAssigned')">
          <template #body="{ data }">
            <div v-if="data.assignedTo" class="flex min-w-0 items-center gap-2">
              <img
                v-if="data.assignedTo.avatarUrl"
                :src="data.assignedTo.avatarUrl"
                :alt="assignedToName(data.assignedTo)"
                class="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              <span
                v-else
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[var(--fg-on-brand)]"
                :style="{ background: assigneeAvatarBg(data.assignedTo.id) }"
              >
                {{ assigneeInitials(data.assignedTo) }}
              </span>
              <span class="min-w-0 truncate text-sm text-[var(--fg-muted)]">
                {{ assignedToName(data.assignedTo) }}
              </span>
            </div>
            <button
              v-else-if="canTrackableUpdate"
              type="button"
              class="matter-assign-cta group flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-[var(--surface-border)] bg-transparent py-1 pl-1 pr-2 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--surface-border))] hover:bg-[color-mix(in_srgb,var(--accent-soft)_40%,transparent)]"
              @click="openEditDialog(data)"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--fg-subtle)] text-xs text-[var(--fg-subtle)]"
                aria-hidden="true"
              >
                <i class="pi pi-user-plus text-sm" />
              </span>
              <span class="text-sm text-accent underline-offset-2 group-hover:underline">
                {{ t('trackables.assignInlineCta') }}
              </span>
            </button>
            <span v-else class="text-sm text-[var(--fg-subtle)]">
              {{ t('trackables.unassigned') }}
            </span>
          </template>
        </Column>
        <Column :header="t('trackables.tableColActivitySummary')">
          <template #body="{ data }">
            <div
              v-if="activitySummary(data).total > 0"
              class="activity-stats min-w-0"
              :class="activitySummary(data).overdue ? 'activity-stats--has-danger' : ''"
            >
              <div class="activity-stat activity-stat--done">
                <span class="activity-stat__icon" aria-hidden="true">
                  <i class="pi pi-check-square" />
                </span>
                <span class="activity-stat__body">
                  <span class="activity-stat__label">
                    {{ t('trackables.activityDone') }}
                  </span>
                  <span class="activity-stat__value tabular-nums">
                    {{ activitySummary(data).done }}<span class="activity-stat__total">/{{ activitySummary(data).total }}</span>
                  </span>
                </span>
              </div>
              <div
                v-if="activitySummary(data).inProgress"
                class="activity-stat activity-stat--progress"
              >
                <span class="activity-stat__icon" aria-hidden="true">
                  <i class="pi pi-spin pi-cog" v-if="false" />
                  <i class="pi pi-clock" />
                </span>
                <span class="activity-stat__body">
                  <span class="activity-stat__label">
                    {{ t('trackables.activityInProgress') }}
                  </span>
                  <span class="activity-stat__value tabular-nums">
                    {{ activitySummary(data).inProgress }}
                  </span>
                </span>
              </div>
              <div
                v-if="activitySummary(data).overdue"
                class="activity-stat activity-stat--danger"
              >
                <span class="activity-stat__icon" aria-hidden="true">
                  <i class="pi pi-exclamation-triangle" />
                </span>
                <span class="activity-stat__body">
                  <span class="activity-stat__label">
                    {{ t('trackables.activityOverdue') }}
                  </span>
                  <span class="activity-stat__value tabular-nums">
                    {{ activitySummary(data).overdue }}
                  </span>
                </span>
              </div>
              <i
                v-if="activityDetailLoading(data)"
                class="pi pi-spin pi-spinner shrink-0 text-[10px] text-[var(--fg-muted)]"
                aria-hidden="true"
              />
            </div>
            <span v-else class="text-xs italic text-[var(--fg-subtle)]">
              {{ t('trackables.activityEmpty') }}
            </span>
          </template>
        </Column>
        <Column
          v-if="rowHasTrackableActions"
          :header="t('common.actions')"
          header-class="matter-actions-header"
          body-class="matter-actions-cell"
          class="w-0 min-w-[7.5rem] whitespace-nowrap"
        >
          <template #body="{ data }">
            <div class="matters-row-actions" role="group" :aria-label="t('common.actions')">
              <Button
                v-if="canTrackableUpdate"
                type="button"
                icon="pi pi-pencil"
                variant="outlined"
                rounded
                raised 
                size="small"
                severity="secondary"
                class="matter-action matter-action--edit"
                :aria-label="t('trackables.tooltipEditMatter')"
                v-tooltip.top="t('trackables.tooltipEditMatter')"
                @click="openEditDialog(data)"
              />
              <Button
                v-if="canTrackableUpdate && listScope === 'active'"
                type="button"
                icon="pi pi-inbox"
                variant="outlined"
                rounded
                raised 
                size="small"
                severity="warn"
                class="matter-action matter-action--archive"
                :aria-label="t('trackables.tooltipArchiveMatter')"
                v-tooltip.top="t('trackables.tooltipArchiveMatter')"
                @click="archiveTrackable(data)"
              />
              <Button
                v-if="canTrackableUpdate && listScope === 'archived'"
                type="button"
                icon="pi pi-replay"
                variant="outlined"
                rounded
                raised 
                size="small"
                severity="success"
                class="matter-action matter-action--restore"
                :aria-label="t('trackables.tooltipReactivateMatter')"
                v-tooltip.top="t('trackables.tooltipReactivateMatter')"
                @click="reactivateTrackable(data)"
              />
              <Button
                v-if="canTrackableDelete"
                type="button"
                icon="pi pi-trash"
                variant="outlined"
                rounded
                raised 
                size="small"
                severity="danger"
                class="matter-action matter-action--danger"
                :aria-label="t('trackables.tooltipOpenDelete')"
                v-tooltip.top="t('trackables.tooltipOpenDelete')"
                @click="openDeleteWizard(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
      </div>

      <!-- Paginación fija -->
      <div
        v-if="!mattersShowSkeleton && trackables.length > 0"
        class="flex-shrink-0 border-t border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5"
      >
        <Paginator
          :first="first"
          :rows="rows"
          :total-records="totalRecords"
          :rows-per-page-options="[10, 20, 50]"
          :current-page-report-template="t('trackables.tablePageReport')"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          @page="onPage"
        />
      </div>
    </div>
    </template>

    <Dialog
      v-model:visible="showCreateDialog"
      :modal="true"
      :draggable="false"
      :dismissable-mask="!creating"
      :closable="false"
      :close-on-escape="createCloseOnEscape"
      :style="{ width: 'min(880px, 96vw)' }"
      :pt="{
        mask: { class: 'alega-confirm-mask' },
        root: {
          class:
            'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible',
        },
      }"
      @show="onCreateDialogShow"
      @hide="onCreateDialogHide"
    >
      <template #container>
        <div class="matter-dialog-shell matter-dialog-shell--wizard">
          <div class="matter-wizard-root">
        <div class="matter-wizard">
          <aside class="matter-wizard__sidebar" :aria-label="t('trackables.matterDialog.eyebrowCreate')">
            <div class="matter-wizard__brand">
              <div class="matter-wizard__brand-icon" aria-hidden="true">
                <span class="text-xl leading-none">{{ newTrackable.emoji || '⚖️' }}</span>
              </div>
              <div class="matter-wizard__brand-text">
                <span class="matter-wizard__eyebrow">{{ t('trackables.matterDialog.eyebrowCreate') }}</span>
                <p class="matter-wizard__brand-title">{{ t('trackables.matterDialog.createTitle') }}</p>
              </div>
            </div>
            <div class="matter-wizard__progress-wrap">
              <p class="matter-wizard__progress-label">
                {{ t('trackables.matterDialog.progressLabel', { n: createProgressPct }) }}
              </p>
              <div class="matter-wizard__progress-bar" role="progressbar" :aria-valuenow="createProgressPct" aria-valuemin="0" aria-valuemax="100">
                <div class="matter-wizard__progress-fill" :style="{ width: `${createProgressPct}%` }" />
              </div>
            </div>
            <ol
              class="matter-wizard__steps"
              :aria-label="t('trackables.matterDialog.stepIndicator', { current: createWizardStep + 1, total: 3 })"
            >
              <li
                v-for="(stepId, idx) in createStepIds"
                :key="stepId"
                class="matter-wizard__step"
                :class="{
                  'matter-wizard__step--current': idx === createWizardStep,
                  'matter-wizard__step--done': idx < createWizardStep,
                }"
              >
                <button
                  type="button"
                  class="matter-wizard__step-btn"
                  :aria-current="idx === createWizardStep ? 'step' : undefined"
                  :disabled="idx > createWizardStep"
                  @click="goToCreateStep(idx)"
                >
                  <span class="matter-wizard__step-dot" aria-hidden="true">
                    <i v-if="idx < createWizardStep" class="pi pi-check text-[11px] text-white" />
                    <span v-else-if="idx === createWizardStep" class="matter-wizard__step-dot-inner" />
                  </span>
                  <span class="matter-wizard__step-copy">
                    <span class="matter-wizard__step-label">{{ t(`trackables.matterDialog.steps.${stepId}`) }}</span>
                    <span class="matter-wizard__step-hint">{{ t(`trackables.matterDialog.stepHints.${stepId}`) }}</span>
                  </span>
                </button>
              </li>
            </ol>
            <div class="matter-wizard__support">
              <i class="pi pi-headphones matter-wizard__support-icon" aria-hidden="true" />
              <button
                type="button"
                class="matter-wizard__support-link"
                :aria-label="`${t('trackables.matterDialog.support')}: ${t('trackables.matterDialog.supportLink')}`"
                @click.prevent
              >
                {{ t('trackables.matterDialog.supportLink') }}
              </button>
            </div>
          </aside>

          <div class="matter-wizard__content">
            <header class="matter-wizard__header">
              <div class="matter-wizard__header-text">
                <h3 class="matter-wizard__step-title">{{ t(`trackables.matterDialog.steps.${currentCreateStepId}`) }}</h3>
                <p class="matter-wizard__step-sub">{{ t(`trackables.matterDialog.stepHints.${currentCreateStepId}`) }}</p>
              </div>
              <button
                type="button"
                class="matter-wizard__close"
                :disabled="creating"
                :aria-label="t('trackables.matterDialog.closeAriaLabel')"
                @click="attemptCloseCreate"
              >
                <i class="pi pi-times" aria-hidden="true" />
              </button>
            </header>

            <form class="matter-wizard__body" novalidate @submit.prevent="onCreateSubmit" @keydown="onCreateKeydown">
        <div v-show="createWizardStep === 0" class="flex flex-col gap-5">
          <section class="matter-form-section">
            <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionIdentity') }}</h3>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
              <div class="flex flex-col gap-1">
                <label for="md-title" class="matter-field-label">
                  {{ t('trackables.matterDialog.fieldTitle') }}
                  <span class="matter-field-required">*</span>
                </label>
                <InputText
                  id="md-title"
                  ref="createTitleRef"
                  v-model="newTrackable.title"
                  :placeholder="t('trackables.matterDialog.placeholderTitle')"
                  :invalid="!!createErrors.title"
                  autocomplete="off"
                  @blur="validateCreateField('title')"
                  @input="createErrors.title = ''"
                />
                <small v-if="createErrors.title" class="matter-field-error">{{ createErrors.title }}</small>
              </div>
              <div class="flex flex-col gap-1">
                <label for="md-emoji" class="matter-field-label">{{ t('trackables.matterDialog.fieldEmoji') }}</label>
                <Dropdown
                  id="md-emoji"
                  v-model="newTrackable.emoji"
                  :options="emojiOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('trackables.emojiPlaceholder')"
                />
              </div>
            </div>
          </section>

          <section class="matter-form-section">
            <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionMatter') }}</h3>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label for="md-matter" class="matter-field-label">{{ t('trackables.matterDialog.fieldMatter') }}</label>
                <Dropdown
                  id="md-matter"
                  v-model="newTrackable.matterType"
                  :options="matterTypeOptions"
                  option-label="label"
                  option-value="value"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label for="md-type" class="matter-field-label">
                  {{ t('trackables.matterDialog.fieldType') }}
                  <span class="matter-field-required">*</span>
                </label>
                <Dropdown
                  id="md-type"
                  v-model="newTrackable.type"
                  :options="typeSelectOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('trackables.typePlaceholder')"
                  :invalid="!!createErrors.type"
                  @change="createErrors.type = ''"
                />
                <small v-if="createErrors.type" class="matter-field-error">{{ createErrors.type }}</small>
              </div>
              <div class="flex flex-col gap-1">
                <label for="md-expedient" class="matter-field-label">{{ t('trackables.matterDialog.fieldExpedient') }}</label>
                <InputText
                  id="md-expedient"
                  v-model="newTrackable.expedientNumber"
                  :placeholder="t('trackables.matterDialog.placeholderExpedient')"
                  class="font-mono-num"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label for="md-court" class="matter-field-label">{{ t('trackables.matterDialog.fieldCourt') }}</label>
                <InputText
                  id="md-court"
                  v-model="newTrackable.court"
                  :placeholder="t('trackables.matterDialog.placeholderCourt')"
                />
              </div>
            </div>
          </section>

          <section class="matter-form-section">
            <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionTimeline') }}</h3>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
              <div class="flex flex-col gap-1">
                <label for="md-due" class="matter-field-label">{{ t('trackables.matterDialog.fieldDueDate') }}</label>
                <Calendar
                  id="md-due"
                  v-model="newTrackable.dueDate"
                  date-format="dd/mm/yy"
                  :placeholder="t('trackables.matterDialog.placeholderDate')"
                  show-icon
                />
              </div>
              <div class="flex flex-col gap-1">
                <label for="md-desc" class="matter-field-label">{{ t('trackables.matterDialog.fieldDescription') }}</label>
                <Textarea
                  id="md-desc"
                  v-model="newTrackable.description"
                  rows="2"
                  :placeholder="t('trackables.matterDialog.placeholderDescription')"
                  auto-resize
                />
              </div>
            </div>
          </section>
        </div>

        <div v-show="createWizardStep === 1" class="flex flex-col gap-5">
          <section class="matter-form-section">
            <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionParties') }}</h3>
            <div class="grid grid-cols-1 gap-4">
              <div class="flex flex-col gap-1">
                <label for="md-client" class="matter-field-label">{{ t('trackables.matterDialog.fieldClient') }}</label>
                <Dropdown
                  id="md-client"
                  v-model="newTrackable.clientId"
                  :options="clientsOptions"
                  option-label="name"
                  option-value="id"
                  :placeholder="t('trackables.matterDialog.placeholderClient')"
                  filter
                  show-clear
                />
                <small class="matter-field-help">{{ t('trackables.matterDialog.helperClient') }}</small>
              </div>
              <div class="flex flex-col gap-1">
                <label for="md-counterparty" class="matter-field-label">{{ t('trackables.matterDialog.fieldCounterparty') }}</label>
                <InputText
                  id="md-counterparty"
                  v-model="newTrackable.counterpartyName"
                  :placeholder="t('trackables.matterDialog.placeholderCounterparty')"
                />
                <small class="matter-field-help">{{ t('trackables.matterDialog.helperCounterparty') }}</small>
              </div>
            </div>
          </section>
        </div>

        <div v-show="createWizardStep === 2" class="flex flex-col gap-5">
          <section class="matter-form-section">
            <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionTemplate') }}</h3>
            <p class="matter-field-help m-0">{{ t('trackables.matterDialog.modeHint') }}</p>
            <div class="flex flex-col gap-2 mt-3">
              <span class="matter-field-label">{{ t('trackables.matterDialog.modeLabel') }}</span>
              <SelectButton
                v-model="createWizardMode"
                :options="createWizardModeOptionsI18n"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                class="matter-mode-toggle"
              />
            </div>
            <div v-if="createWizardMode === 'template'" class="mt-4">
              <div v-if="wizardTemplatesLoading" class="flex items-center gap-2 py-3 text-sm text-[var(--fg-muted)]">
                <ProgressSpinner style="width: 22px; height: 22px" stroke-width="4" />
                <span>{{ t('app.loading') }}</span>
              </div>
              <div v-else class="flex flex-col gap-1">
                <label for="md-template" class="matter-field-label">
                  {{ t('trackables.matterDialog.templateLabel') }}
                  <span class="matter-field-required">*</span>
                </label>
                <Dropdown
                  id="md-template"
                  v-model="createWizardSystemBlueprintId"
                  :options="wizardTemplateOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="wizardTemplateOptions.length ? t('trackables.matterDialog.templatePlaceholder') : t('trackables.matterDialog.templateEmpty')"
                  :disabled="!wizardTemplateOptions.length"
                  filter
                  show-clear
                />
                <small
                  v-if="!wizardTemplateOptions.length"
                  class="matter-field-error"
                >
                  {{ t('trackables.matterDialog.templateNoneHint') }}
                </small>
              </div>
            </div>
          </section>
        </div>
            </form>

            <footer class="matter-wizard__footer">
              <div class="matter-wizard__footer-inner">
                <Button
                  type="button"
                  :label="t('common.cancel')"
                  text
                  :disabled="creating"
                  @click="attemptCloseCreate"
                />
                <div class="matter-wizard__footer-actions">
                  <Button
                    v-if="createWizardStep > 0"
                    type="button"
                    :label="t('trackables.matterDialog.actionBack')"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    outlined
                    :disabled="creating"
                    @click="createWizardStep -= 1"
                  />
                  <Button
                    v-if="createWizardStep < 2"
                    type="button"
                    :label="t('trackables.matterDialog.actionNext')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    :disabled="!canAdvanceCreateStep"
                    @click="advanceCreateStep"
                  />
                  <Button
                    v-else
                    type="button"
                    :label="t('trackables.matterDialog.actionCreate')"
                    icon="pi pi-check"
                    :disabled="!canSubmitCreate"
                    :loading="creating"
                    @click="onCreateSubmit"
                  />
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showEditDialog"
      :modal="true"
      :draggable="false"
      :dismissable-mask="!savingEdit && !editIsDirty"
      :closable="false"
      :close-on-escape="editCloseOnEscape"
      :style="{ width: 'min(640px, 96vw)' }"
      :pt="{
        mask: { class: 'alega-confirm-mask' },
        root: {
          class:
            'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible',
        },
      }"
      @hide="onEditDialogHide"
    >
      <template #container>
        <div class="matter-dialog-shell matter-dialog-shell--edit">
          <div class="matter-edit-root">
        <header class="matter-edit__header">
          <div class="matter-edit__header-main">
            <div class="matter-edit__brand-icon" aria-hidden="true">
              <span class="text-xl leading-none">{{ editForm.emoji || '⚖️' }}</span>
            </div>
            <div class="matter-edit__header-text min-w-0">
              <span class="matter-edit__eyebrow">{{ t('trackables.matterDialog.eyebrowEdit') }}</span>
              <h2 class="matter-edit__title">
                {{ editForm.title?.trim() || t('trackables.matterDialog.editTitle') }}
              </h2>
              <p v-if="editIsDirty" class="matter-edit__dirty">
                <i class="pi pi-circle-fill text-[8px] text-amber-500" aria-hidden="true" />
                {{ t('trackables.matterDialog.dirtyHint') }}
              </p>
              <p v-else class="matter-edit__sub">{{ t('trackables.matterDialog.editTitle') }}</p>
            </div>
          </div>
          <div class="matter-edit__header-actions">
            <router-link
              v-if="editingId"
              :to="`/trackables/${editingId}`"
              class="matter-open-link"
              @click="showEditDialog = false"
            >
              <i class="pi pi-external-link text-xs" aria-hidden="true" />
              <span>{{ t('trackables.matterDialog.openInExpedient') }}</span>
            </router-link>
            <button
              type="button"
              class="matter-edit__close"
              :disabled="savingEdit"
              :aria-label="t('trackables.matterDialog.closeAriaLabel')"
              @click="attemptCloseEdit"
            >
              <i class="pi pi-times" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div v-if="editLoading" class="matter-edit__loading">
          <ProgressSpinner />
        </div>
        <form v-else class="matter-edit__body" novalidate @submit.prevent="saveEdit" @keydown="onEditKeydown">
        <section class="matter-form-section">
          <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionIdentity') }}</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <div class="flex flex-col gap-1">
              <label for="me-title" class="matter-field-label">
                {{ t('trackables.matterDialog.fieldTitle') }}
                <span class="matter-field-required">*</span>
              </label>
              <InputText
                id="me-title"
                ref="editTitleRef"
                v-model="editForm.title"
                :placeholder="t('trackables.matterDialog.placeholderTitle')"
                autocomplete="off"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="me-emoji" class="matter-field-label">{{ t('trackables.matterDialog.fieldEmoji') }}</label>
              <Dropdown
                id="me-emoji"
                v-model="editForm.emoji"
                :options="emojiOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('trackables.emojiPlaceholder')"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="me-matter" class="matter-field-label">{{ t('trackables.matterDialog.fieldMatter') }}</label>
              <Dropdown
                id="me-matter"
                v-model="editForm.matterType"
                :options="matterTypeOptions"
                option-label="label"
                option-value="value"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="me-type" class="matter-field-label">
                {{ t('trackables.matterDialog.fieldType') }}
                <span class="matter-field-required">*</span>
              </label>
              <Dropdown
                id="me-type"
                v-model="editForm.type"
                :options="typeSelectOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('trackables.typePlaceholder')"
              />
            </div>
          </div>
        </section>

        <section class="matter-form-section">
          <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionParties') }}</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label for="me-client" class="matter-field-label">{{ t('trackables.matterDialog.fieldClient') }}</label>
              <Dropdown
                id="me-client"
                v-model="editForm.clientId"
                :options="clientsOptions"
                option-label="name"
                option-value="id"
                :placeholder="t('trackables.matterDialog.placeholderClient')"
                filter
                show-clear
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="me-counterparty" class="matter-field-label">{{ t('trackables.matterDialog.fieldCounterparty') }}</label>
              <InputText
                id="me-counterparty"
                v-model="editForm.counterpartyName"
                :placeholder="t('trackables.matterDialog.placeholderCounterparty')"
              />
            </div>
            <div class="flex flex-col gap-1 sm:col-span-2">
              <label for="me-assignee" class="matter-field-label">{{ t('trackables.matterDialog.fieldAssignee') }}</label>
              <Dropdown
                id="me-assignee"
                v-model="editForm.assignedToId"
                :options="userOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('trackables.matterDialog.placeholderAssignee')"
                filter
                show-clear
              />
            </div>
          </div>
        </section>

        <section class="matter-form-section">
          <h3 class="matter-form-section__title">{{ t('trackables.matterDialog.sectionMeta') }}</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <div class="flex flex-col gap-1">
              <label for="me-status" class="matter-field-label">{{ t('trackables.matterDialog.fieldStatus') }}</label>
              <Dropdown
                id="me-status"
                v-model="editForm.status"
                :options="trackableStatusEditOptions"
                option-label="label"
                option-value="value"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="me-due" class="matter-field-label">{{ t('trackables.matterDialog.fieldDueDate') }}</label>
              <Calendar
                id="me-due"
                v-model="editForm.dueDate"
                date-format="dd/mm/yy"
                :placeholder="t('trackables.matterDialog.placeholderDate')"
                show-icon
              />
            </div>
            <div class="flex flex-col gap-1 sm:col-span-2">
              <label for="me-desc" class="matter-field-label">{{ t('trackables.matterDialog.fieldDescription') }}</label>
              <Textarea
                id="me-desc"
                v-model="editForm.description"
                rows="3"
                :placeholder="t('trackables.matterDialog.placeholderDescription')"
                auto-resize
              />
            </div>
          </div>
        </section>
        </form>

        <footer class="matter-edit__footer">
          <div class="matter-edit__footer-inner">
            <Button
              type="button"
              :label="t('common.cancel')"
              text
              :disabled="savingEdit"
              @click="attemptCloseEdit"
            />
            <Button
              type="button"
              :label="t('trackables.matterDialog.actionSaveChanges')"
              icon="pi pi-check"
              :disabled="!canSubmitEdit"
              :loading="savingEdit"
              @click="saveEdit"
            />
          </div>
        </footer>
          </div>
        </div>
      </template>
    </Dialog>

    <DeleteTrackableDialog
      v-model:visible="showDeleteWizard"
      :trackable="deleteTarget"
      @deleted="onDeleteWizardDone"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Paginator from 'primevue/paginator';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Popover from 'primevue/popover';
import Menu from 'primevue/menu';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import DeleteTrackableDialog from '@/components/common/DeleteTrackableDialog.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { apiClient } from '@/api/client';
import { createProcessTrack } from '@/api/process-tracks';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from 'primevue/usetoast';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

type ListScope = 'active' | 'archived' | 'trash';
type ActivityFilterId = 'total' | 'urgentToday' | 'overdue' | 'next14Days';
type ActivitySummary = {
  done: number;
  inProgress: number;
  overdue: number;
  total: number;
  urgentToday?: number;
  next14Days?: number;
};
type TrackableActivityDetail = {
  summary: ActivitySummary;
  nextDue: {
    id: string;
    title: string;
    dueDate: string;
    priority?: string | null;
  } | null;
};
type TrackableActivityDetailState = {
  loading: boolean;
  error: boolean;
  data: TrackableActivityDetail | null;
};

const authReady = computed(() => user.value != null);
const canTrackableRead = computed(() => can('trackable:read'));
const canTrackableCreate = computed(() => can('trackable:create'));
const canTrackableUpdate = computed(() => can('trackable:update'));
const canTrackableDelete = computed(() => can('trackable:delete'));
const canDocRead = computed(() => can('document:read'));
const canDocUpdate = computed(() => can('document:update'));
const canDocDelete = computed(() => can('document:delete'));
const rowHasTrackableActions = computed(
  () => canTrackableUpdate.value || canTrackableDelete.value,
);

const scopeOptions = computed(() => {
  const opts: { label: string; value: ListScope }[] = [
    { label: t('trackables.scopeActive'), value: 'active' },
    { label: t('trackables.scopeArchived'), value: 'archived' },
  ];
  if (canDocRead.value) {
    opts.push({ label: t('nav.trash'), value: 'trash' });
  }
  return opts;
});

const trashDocuments = ref<any[]>([]);
const trashLoading = ref(false);

const trackables = ref<any[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const first = ref(0);
const rows = ref(20);
const trackableActivityDetails = ref<Record<string, TrackableActivityDetailState>>({});

const activityFilterFacets = ref({
  total: 0,
  urgentToday: 0,
  overdue: 0,
  next14Days: 0,
});

const filters = ref({
  search: '',
  status: null as string | null,
  type: null as string | null,
  assignedToId: null as string | null,
  activityFilter: null as ActivityFilterId | null,
});

const tableSkeletonRows = Array.from({ length: 8 }, (_, i) => i);

const mattersDtRef = ref<InstanceType<typeof DataTable> | null>(null);
const mattersSearchFieldRef = ref<InstanceType<typeof IconField> | null>(null);
const filtersPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const savedViewsMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const moreActionsMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const tableDensity = ref<'compact' | 'comfortable'>('compact');
const mattersDtScrolled = ref(false);
let mattersScrollCleanup: (() => void) | undefined;

const listScope = ref<ListScope>(
  route.query.scope === 'trash' ? 'trash' : 'active',
);

const statusFilterOptions = computed(() => [
  { label: t('trackables.statuses.created'), value: 'created' },
  { label: t('trackables.statuses.active'), value: 'active' },
  { label: t('trackables.statuses.under_review'), value: 'under_review' },
  { label: t('trackables.statuses.completed'), value: 'completed' },
]);
const typeOptions = ['case', 'process', 'project', 'audit'];
const typeSelectOptions = computed(() =>
  typeOptions.map((value) => ({ value, label: t(`trackables.types.${value}`) })),
);
const typeChipOptions = computed(() => [
  { value: null as string | null, label: t('trackables.typeChipAll') },
  ...typeOptions.map((value) => ({ value, label: t(`trackables.types.${value}`) })),
]);
/** Accent for type filter chips (dot + active state); null = todos (zafiro marca). */
function typeChipAccentColor(value: string | null): string {
  if (value === null) return 'var(--brand-zafiro)';
  switch (value) {
    case 'case':
      return '#0F766E';
    case 'process':
      return '#7C3AED';
    case 'project':
      return '#B45309';
    case 'audit':
      return '#0E7490';
    default:
      return 'var(--brand-zafiro)';
  }
}
function typeLabel(value: string): string {
  if (!value) return '';
  const key = `trackables.types.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

const trackableStatusEditOptions = computed(() => [
  { label: t('trackables.statuses.created'), value: 'created' },
  { label: t('trackables.statuses.active'), value: 'active' },
  { label: t('trackables.statuses.under_review'), value: 'under_review' },
  { label: t('trackables.statuses.completed'), value: 'completed' },
  { label: t('trackables.statuses.archived'), value: 'archived' },
]);

const matterTypeOptions = [
  { label: 'Litigio', value: 'litigation' },
  { label: 'Corporativo', value: 'corporate' },
  { label: 'Laboral', value: 'labor' },
  { label: 'Familia', value: 'family' },
  { label: 'Tributario', value: 'tax' },
  { label: 'Penal', value: 'criminal' },
  { label: 'Administrativo', value: 'administrative' },
  { label: 'Asesoría', value: 'advisory' },
  { label: 'Inmobiliario', value: 'real_estate' },
  { label: 'Otro', value: 'other' },
];

const emojiOptions = computed(() => [
  { label: `⚖️ ${t('trackables.emojiOptions.litigation')}`, value: '⚖️' },
  { label: `📁 ${t('trackables.emojiOptions.case')}`, value: '📁' },
  { label: `🏢 ${t('trackables.emojiOptions.corporate')}`, value: '🏢' },
  { label: `👥 ${t('trackables.emojiOptions.family')}`, value: '👥' },
  { label: `🧾 ${t('trackables.emojiOptions.tax')}`, value: '🧾' },
  { label: `🏛️ ${t('trackables.emojiOptions.administrative')}`, value: '🏛️' },
  { label: `💼 ${t('trackables.emojiOptions.advisory')}`, value: '💼' },
  { label: `🔎 ${t('trackables.emojiOptions.audit')}`, value: '🔎' },
]);

const clientsOptions = ref<Array<{ id: string; name: string }>>([]);
const users = ref<Array<{ id: string; firstName?: string; lastName?: string; email: string }>>([]);
const userOptions = computed(() =>
  users.value.map((u) => {
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return {
      label: fullName ? `${fullName} (${u.email})` : u.email,
      value: u.id,
    };
  }),
);
const assigneeFilterOptions = computed(() => [
  { label: t('trackables.unassigned'), value: '__unassigned__' },
  ...userOptions.value,
]);

function assigneeDisplayLabel(value: string | null | undefined) {
  if (value == null || value === '') return '';
  const opt = assigneeFilterOptions.value.find((o) => o.value === value);
  return opt?.label ?? String(value);
}

const hasActiveFilters = computed(
  () =>
    Boolean(filters.value.search.trim()) ||
    Boolean(filters.value.status) ||
    Boolean(filters.value.type) ||
    Boolean(filters.value.assignedToId) ||
    Boolean(filters.value.activityFilter),
);

const activeFilterCount = computed(() => {
  let n = 0;
  if (filters.value.search.trim()) n += 1;
  if (filters.value.status) n += 1;
  if (filters.value.type) n += 1;
  if (filters.value.assignedToId) n += 1;
  if (filters.value.activityFilter) n += 1;
  return n;
});

type ActiveFilterRow = { id: string; label: string; clear: () => void };

const activeFilterRows = computed((): ActiveFilterRow[] => {
  const rows: ActiveFilterRow[] = [];
  const f = filters.value;
  if (f.search.trim()) {
    rows.push({
      id: 'search',
      label: t('trackables.activeFilterSearch', { q: f.search.trim() }),
      clear: () => {
        filters.value.search = '';
        resetAndLoad();
      },
    });
  }
  if (f.status) {
    const label = statusFilterOptions.value.find((o) => o.value === f.status)?.label ?? f.status;
    rows.push({
      id: 'status',
      label: t('trackables.activeFilterStatus', { label }),
      clear: () => {
        filters.value.status = null;
        resetAndLoad();
      },
    });
  }
  if (f.type) {
    rows.push({
      id: 'type',
      label: t('trackables.activeFilterType', { label: typeLabel(f.type) }),
      clear: () => {
        filters.value.type = null;
        resetAndLoad();
      },
    });
  }
  if (f.assignedToId) {
    rows.push({
      id: 'assigned',
      label: t('trackables.activeFilterAssigned', { label: assigneeDisplayLabel(f.assignedToId) }),
      clear: () => {
        filters.value.assignedToId = null;
        resetAndLoad();
      },
    });
  }
  if (f.activityFilter) {
    const map: Record<ActivityFilterId, string> = {
      total: t('trackables.activityKpiTotal'),
      urgentToday: t('trackables.activityKpiUrgentToday'),
      overdue: t('trackables.activityKpiOverdue'),
      next14Days: t('trackables.activityKpiNext14'),
    };
    rows.push({
      id: 'activity',
      label: t('trackables.activeFilterActivity', { label: map[f.activityFilter] ?? f.activityFilter }),
      clear: () => {
        filters.value.activityFilter = null;
        resetAndLoad();
      },
    });
  }
  return rows;
});

const savedViewsMenuItems = computed(() => [
  {
    label: t('trackables.savedViewMineOpen'),
    command: () => {
      filters.value = {
        search: '',
        status: null,
        type: null,
        assignedToId: user.value?.id ?? null,
        activityFilter: null,
      };
      resetAndLoad();
    },
  },
  {
    label: t('trackables.savedViewOverdueWeek'),
    command: () => {
      filters.value = {
        search: '',
        status: null,
        type: null,
        assignedToId: null,
        activityFilter: 'overdue',
      };
      resetAndLoad();
    },
  },
  {
    label: t('trackables.savedViewUnassigned'),
    command: () => {
      filters.value = {
        search: '',
        status: null,
        type: null,
        assignedToId: '__unassigned__',
        activityFilter: null,
      };
      resetAndLoad();
    },
  },
]);

const moreActionsMenuItems = computed(() => {
  const compact = tableDensity.value === 'compact';
  return [
    {
      label: t('trackables.moreExportCsv'),
      icon: 'pi pi-download',
      command: () => {
        (mattersDtRef.value as unknown as { exportCSV?: (opts?: object) => void })?.exportCSV?.();
      },
    },
    { separator: true },
    {
      label: t('trackables.densityCompact'),
      icon: compact ? 'pi pi-check' : 'pi pi-fw',
      command: () => {
        tableDensity.value = 'compact';
      },
    },
    {
      label: t('trackables.densityComfortable'),
      icon: !compact ? 'pi pi-check' : 'pi pi-fw',
      command: () => {
        tableDensity.value = 'comfortable';
      },
    },
  ];
});

function focusMattersSearch() {
  const root = (mattersSearchFieldRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
  const input = root?.querySelector('input');
  input?.focus();
}

function onGlobalSearchHotkey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    focusMattersSearch();
  }
}

function removeActiveFilterRow(row: ActiveFilterRow) {
  row.clear();
  filtersPopoverRef.value?.hide?.();
}

function bindMattersDataTableScroll() {
  mattersScrollCleanup?.();
  mattersScrollCleanup = undefined;
  const root = (mattersDtRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
  if (!root) return;
  const scrollHost =
    (root.querySelector('[data-pc-name="virtualscroller"]') as HTMLElement | null) ??
    (root.querySelector('[data-pc-section="tablecontainer"]') as HTMLElement | null);
  if (!scrollHost) return;
  const onScroll = () => {
    mattersDtScrolled.value = scrollHost.scrollTop > 2;
  };
  scrollHost.addEventListener('scroll', onScroll, { passive: true });
  mattersScrollCleanup = () => scrollHost.removeEventListener('scroll', onScroll);
}

function isActivityKpiActive(id: ActivityFilterId) {
  if (id === 'total') return !filters.value.activityFilter;
  return filters.value.activityFilter === id;
}

const mattersShowSkeleton = computed(() => loading.value);

const activityKpiCards = computed(() => {
  const f = activityFilterFacets.value;
  return [
    {
      id: 'total' as const,
      count: f.total,
      label: t('trackables.activityKpiTotal'),
      icon: 'pi pi-folder',
      aria: t('trackables.activityKpiAriaTotal'),
      accentColor: '#2D3FBF',
      mesh2: 'color-mix(in srgb, #7C3AED 12%, transparent)',
      numberClass: 'text-[var(--brand-medianoche)] dark:text-[var(--brand-hielo)]',
      activeRingClass: 'ring-[var(--brand-zafiro)]',
      urgencyBarClass: 'exp-kpi-card--total-bar',
      pulse: false,
    },
    {
      id: 'urgentToday' as const,
      count: f.urgentToday,
      label: t('trackables.activityKpiUrgentToday'),
      icon: 'pi pi-bolt',
      aria: t('trackables.activityKpiAriaUrgentToday'),
      accentColor: '#B45309',
      mesh2: 'color-mix(in srgb, #FB7185 10%, transparent)',
      numberClass: 'text-amber-900 dark:text-amber-100',
      activeRingClass: 'ring-amber-700 dark:ring-amber-300',
      urgencyBarClass: 'exp-kpi-card--urgency-bar',
      pulse: false,
    },
    {
      id: 'overdue' as const,
      count: f.overdue,
      label: t('trackables.activityKpiOverdue'),
      icon: 'pi pi-exclamation-triangle',
      aria: t('trackables.activityKpiAriaOverdue'),
      accentColor: '#B91C1C',
      mesh2: 'color-mix(in srgb, #F97316 12%, transparent)',
      numberClass: 'text-red-900 dark:text-red-100',
      activeRingClass: 'ring-red-700 dark:ring-red-300',
      urgencyBarClass: 'exp-kpi-card--overdue-bar',
      pulse: f.urgentToday > 0,
    },
    {
      id: 'next14Days' as const,
      count: f.next14Days,
      label: t('trackables.activityKpiNext14'),
      icon: 'pi pi-calendar-clock',
      aria: t('trackables.activityKpiAriaNext14'),
      accentColor: '#0F766E',
      mesh2: 'color-mix(in srgb, #06B6D4 14%, transparent)',
      numberClass: 'text-teal-900 dark:text-teal-100',
      activeRingClass: 'ring-teal-700 dark:ring-teal-300',
      urgencyBarClass: 'exp-kpi-card--next14-bar',
      pulse: false,
    },
  ];
});

function toggleActivityFilter(id: ActivityFilterId) {
  if (id === 'total') {
    filters.value.activityFilter = null;
    resetAndLoad();
    return;
  }
  filters.value.activityFilter = filters.value.activityFilter === id ? null : id;
  resetAndLoad();
}

function setTypeChip(value: string | null) {
  filters.value.type = value;
  resetAndLoad();
}

async function loadClientsForCase() {
  try {
    const { data } = await apiClient.get('/clients', { params: { limit: 500 } });
    const list = Array.isArray(data?.data) ? data.data : [];
    clientsOptions.value = list.map((cl: { id: string; name: string }) => ({
      id: cl.id,
      name: cl.name,
    }));
  } catch {
    clientsOptions.value = [];
  }
}

async function loadUsers() {
  try {
    const { data } = await apiClient.get('/users', { params: { limit: 100 } });
    users.value = Array.isArray(data) ? data : data.data;
  } catch {
    users.value = [];
  }
}

const showCreateDialog = ref(false);
const creating = ref(false);
const createWizardStep = ref(0);
const createWizardMode = ref<'template' | 'free'>('template');
const createWizardModeOptionsI18n = computed(() => [
  { label: t('trackables.matterDialog.modeTemplate'), value: 'template' as const },
  { label: t('trackables.matterDialog.modeFree'), value: 'free' as const },
]);
const createWizardSystemBlueprintId = ref<string | null>(null);
const wizardSystemBlueprints = ref<Array<{ id: string; name: string; code: string }>>([]);
const wizardTemplatesLoading = ref(false);
const wizardTemplateOptions = computed(() =>
  wizardSystemBlueprints.value.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id })),
);

const createStepIds = ['identity', 'parties', 'template'] as const;
const createErrors = ref<{ title: string; type: string; template: string }>({
  title: '',
  type: '',
  template: '',
});
const createTitleRef = ref<{ $el?: HTMLElement; focus?: () => void } | null>(null);

const newTrackable = ref({
  title: '',
  emoji: '⚖️',
  type: null as string | null,
  matterType: 'other' as string,
  description: '',
  dueDate: null as Date | null,
  expedientNumber: '',
  court: '',
  jurisdiction: 'PE',
  clientId: null as string | null,
  counterpartyName: '',
});

function validateCreateField(field: 'title' | 'type'): boolean {
  if (field === 'title') {
    if (!newTrackable.value.title?.trim()) {
      createErrors.value.title = t('trackables.matterDialog.errorTitleRequired');
      return false;
    }
    createErrors.value.title = '';
  } else if (field === 'type') {
    if (!newTrackable.value.type) {
      createErrors.value.type = t('trackables.matterDialog.errorTypeRequired');
      return false;
    }
    createErrors.value.type = '';
  }
  return true;
}

function validateCreateStep(step: number): boolean {
  if (step === 0) {
    const okTitle = validateCreateField('title');
    const okType = validateCreateField('type');
    return okTitle && okType;
  }
  if (step === 2) {
    if (createWizardMode.value === 'template' && !createWizardSystemBlueprintId.value) {
      createErrors.value.template = t('trackables.matterDialog.errorTemplateRequired');
      return false;
    }
    createErrors.value.template = '';
  }
  return true;
}

const canAdvanceCreateStep = computed(() => {
  if (createWizardStep.value === 0) {
    return Boolean(newTrackable.value.title?.trim()) && Boolean(newTrackable.value.type);
  }
  return true;
});

const canSubmitCreate = computed(() => {
  if (creating.value) return false;
  if (!newTrackable.value.title?.trim() || !newTrackable.value.type) return false;
  if (createWizardMode.value === 'template' && !createWizardSystemBlueprintId.value) return false;
  return true;
});

function advanceCreateStep() {
  if (!validateCreateStep(createWizardStep.value)) return;
  if (createWizardStep.value < 2) createWizardStep.value += 1;
}

function goToCreateStep(idx: number) {
  if (idx < createWizardStep.value) {
    createWizardStep.value = idx;
  }
}

function isCreateDirty(): boolean {
  const f = newTrackable.value;
  return Boolean(
    f.title?.trim() ||
      f.type ||
      f.description?.trim() ||
      f.dueDate ||
      f.expedientNumber?.trim() ||
      f.court?.trim() ||
      f.clientId ||
      f.counterpartyName?.trim() ||
      createWizardSystemBlueprintId.value,
  );
}

const createProgressPct = computed(() =>
  Math.round(((createWizardStep.value + 1) / createStepIds.length) * 100),
);
const currentCreateStepId = computed(() => createStepIds[createWizardStep.value]);
const createCloseOnEscape = computed(() => !creating.value && !isCreateDirty());

function attemptCloseCreate() {
  if (creating.value) return;
  if (isCreateDirty() && !window.confirm(t('trackables.matterDialog.actionDiscard'))) return;
  closeCreateDialog();
}

function onCreateDialogHide() {
  if (creating.value) return;
  createWizardStep.value = 0;
  createWizardMode.value = 'template';
  createWizardSystemBlueprintId.value = null;
  createErrors.value = { title: '', type: '', template: '' };
}

function onCreateKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'TEXTAREA') return;
    event.preventDefault();
    if (createWizardStep.value < 2) {
      if (canAdvanceCreateStep.value) advanceCreateStep();
    } else if (canSubmitCreate.value) {
      void onCreateSubmit();
    }
  }
}

async function onCreateSubmit() {
  if (!canSubmitCreate.value) return;
  if (!validateCreateStep(0) || !validateCreateStep(2)) return;
  await createTrackable();
}

async function loadWizardSystemBlueprints() {
  wizardTemplatesLoading.value = true;
  try {
    const { data } = await apiClient.get('/blueprints', {
      params: { matterType: newTrackable.value.matterType },
    });
    const system = (data as { system?: { id: string; name: string; code: string }[] } | null)?.system;
    wizardSystemBlueprints.value = Array.isArray(system) ? system : [];
  } catch {
    wizardSystemBlueprints.value = [];
  } finally {
    wizardTemplatesLoading.value = false;
  }
}

async function onCreateDialogShow() {
  createWizardStep.value = 0;
  createWizardMode.value = 'template';
  createWizardSystemBlueprintId.value = null;
  createErrors.value = { title: '', type: '', template: '' };
  await loadClientsForCase();
  await loadWizardSystemBlueprints();
  await nextTick();
  const titleInput = (createTitleRef.value as { $el?: HTMLElement } | null)?.$el?.querySelector?.('input');
  (titleInput as HTMLInputElement | undefined)?.focus();
}

const showEditDialog = ref(false);
const editLoading = ref(false);
const savingEdit = ref(false);
const editingId = ref<string | null>(null);
const editTitleRef = ref<{ $el?: HTMLElement; focus?: () => void } | null>(null);
const editForm = ref({
  title: '',
  emoji: '⚖️',
  type: null as string | null,
  status: 'created' as string,
  description: '',
  dueDate: null as Date | null,
  clientId: null as string | null,
  counterpartyName: '',
  matterType: 'other' as string,
  assignedToId: null as string | null,
  metadata: {} as Record<string, unknown>,
});
const editSnapshot = ref<string>('');
const editIsDirty = computed(() => JSON.stringify(editForm.value) !== editSnapshot.value);
const canSubmitEdit = computed(() => {
  if (savingEdit.value) return false;
  if (!editForm.value.title?.trim() || !editForm.value.type) return false;
  return editIsDirty.value;
});
const editCloseOnEscape = computed(() => !savingEdit.value && !editIsDirty.value);

function attemptCloseEdit() {
  if (savingEdit.value) return;
  if (editIsDirty.value && !window.confirm(t('trackables.matterDialog.actionDiscard'))) return;
  showEditDialog.value = false;
}

function onEditDialogHide() {
  if (savingEdit.value) return;
  resetEditForm();
}

function onEditKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    if (canSubmitEdit.value) void saveEdit();
  }
}

const showDeleteWizard = ref(false);
const deleteTarget = ref<any | null>(null);

const typeSeverityMap: Record<string, string> = {
  case: 'info',
  process: 'warn',
  project: 'success',
  audit: 'secondary',
};

function typeSeverity(type: string): string {
  return typeSeverityMap[type] || 'secondary';
}

async function loadTrash() {
  if (!canDocRead.value) return;
  trashLoading.value = true;
  try {
    const { data } = await apiClient.get('/documents/trash/list');
    trashDocuments.value = data;
  } finally {
    trashLoading.value = false;
  }
}

async function restoreDocument(doc: any) {
  if (!canDocUpdate.value) return;
  await apiClient.post(`/documents/${doc.id}/restore`);
  trashDocuments.value = trashDocuments.value.filter((d) => d.id !== doc.id);
  toast.add({
    severity: 'success',
    summary: t('trackables.trashRestored'),
    life: 3000,
  });
}

function permanentDeleteDocument(doc: any) {
  if (!canDocDelete.value) return;
  trashPermanentTarget.value = doc;
  showTrashPermanentConfirm.value = true;
}

function onTrashPermanentHide() {
  if (!trashPermanentDeleting.value) trashPermanentTarget.value = null;
}

async function confirmPermanentDeleteDocument() {
  if (!trashPermanentTarget.value) return;
  trashPermanentDeleting.value = true;
  const doc = trashPermanentTarget.value;
  try {
    await apiClient.delete(`/documents/${doc.id}/permanent`);
    trashDocuments.value = trashDocuments.value.filter((d) => d.id !== doc.id);
    toast.add({ severity: 'info', summary: t('trackables.trashPermanentGone'), life: 3000 });
    showTrashPermanentConfirm.value = false;
    trashPermanentTarget.value = null;
  } catch {
    toast.add({ severity: 'error', summary: t('trackables.trashPermanentError'), life: 3000 });
  } finally {
    trashPermanentDeleting.value = false;
  }
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-600';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'pi pi-file-word text-accent';
  if (mimeType?.includes('image')) return 'pi pi-image text-emerald-600';
  return 'pi pi-file text-[var(--fg-subtle)]';
}

function syncScopeFromRoute() {
  if (route.query.scope === 'trash' && canTrackableRead.value && canDocRead.value) {
    listScope.value = 'trash';
  }
}

onMounted(() => {
  syncScopeFromRoute();
  window.addEventListener('keydown', onGlobalSearchHotkey);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalSearchHotkey);
  mattersScrollCleanup?.();
});

watch(() => route.query.scope, syncScopeFromRoute);

watch(mattersShowSkeleton, (sk) => {
  if (!sk) {
    void nextTick(() => {
      bindMattersDataTableScroll();
    });
  } else {
    mattersScrollCleanup?.();
    mattersScrollCleanup = undefined;
    mattersDtScrolled.value = false;
  }
});

watch([() => trackables.value.length, loading], () => {
  if (!mattersShowSkeleton.value && !loading.value) {
    void nextTick(() => bindMattersDataTableScroll());
  }
});

watch(
  () => [createWizardStep.value, newTrackable.value.matterType] as const,
  ([step]) => {
    if (showCreateDialog.value && step === 2) {
      void loadWizardSystemBlueprints();
    }
  },
);

async function loadTrackables(page = 1) {
  if (listScope.value === 'trash') return;
  loading.value = true;
  try {
    const { data } = await apiClient.get('/trackables', {
      params: {
        page,
        limit: rows.value,
        scope: listScope.value,
        search: filters.value.search || undefined,
        status:
          listScope.value === 'active' ? filters.value.status || undefined : undefined,
        type: filters.value.type || undefined,
        assignedTo:
          filters.value.assignedToId === '__unassigned__'
            ? '__unassigned__'
            : filters.value.assignedToId || undefined,
        activityFilter: filters.value.activityFilter || undefined,
      },
    });
    trackables.value = data.data;
    totalRecords.value = data.total;
    void hydrateVisibleTrackableActivities(trackables.value);
    const facets = data.activityFilterFacets;
    if (facets && typeof facets === 'object') {
      activityFilterFacets.value = {
        total: Number(facets.total ?? 0),
        urgentToday: Number(facets.urgentToday ?? 0),
        overdue: Number(facets.overdue ?? 0),
        next14Days: Number(facets.next14Days ?? 0),
      };
    }
  } finally {
    loading.value = false;
  }
}

function resetAndLoad() {
  first.value = 0;
  loadTrackables(1);
}

function clearFilters() {
  filters.value = {
    search: '',
    status: null,
    type: null,
    assignedToId: null,
    activityFilter: null,
  };
  resetAndLoad();
}

function onPage(event: { first: number; page: number; rows: number }) {
  first.value = event.first;
  if (typeof event.rows === 'number') rows.value = event.rows;
  loadTrackables(event.page + 1);
}

function dateLocaleTag() {
  return String(locale.value).toLowerCase().startsWith('en') ? 'en' : 'es-PE';
}

function formatDateShort(value: string | Date) {
  return new Date(value).toLocaleDateString(dateLocaleTag(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initialsFromLabel(label?: string | null) {
  const source = (label || '').split('(')[0].trim();
  if (!source) return '—';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function assignedToName(userValue?: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
} | null) {
  if (!userValue) return t('trackables.unassigned');
  const fullName = [userValue.firstName, userValue.lastName].filter(Boolean).join(' ');
  return userValue.name || fullName || userValue.email || t('trackables.unassigned');
}

function assigneeInitials(userValue?: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
} | null) {
  return initialsFromLabel(assignedToName(userValue));
}

function assigneeAvatarBg(seed?: string | null) {
  const palette = [
    'linear-gradient(135deg, var(--brand-zafiro), var(--brand-real))',
    'linear-gradient(135deg, #0f766e, #14b8a6)',
    'linear-gradient(135deg, #7c3aed, #a855f7)',
    'linear-gradient(135deg, #b45309, #f59e0b)',
    'linear-gradient(135deg, #be123c, #f43f5e)',
  ];
  const source = seed || 'unassigned';
  const index = Array.from(source).reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function extractStageActivities(track: any): any[] {
  const stages = Array.isArray(track?.stageInstances) ? track.stageInstances : [];
  return stages.flatMap((stage: any) => (Array.isArray(stage?.activities) ? stage.activities : []));
}

function isActivityDone(activity: any) {
  const category = activity?.workflowStateCategory ?? activity?.currentState?.category;
  return Boolean(activity?.completedAt) || category === 'done';
}

function isActivityCancelled(activity: any) {
  const category = activity?.workflowStateCategory ?? activity?.currentState?.category;
  return category === 'cancelled';
}

function isActivityOpen(activity: any) {
  return !isActivityDone(activity) && !isActivityCancelled(activity);
}

function summarizeTrackActivities(activities: any[]): TrackableActivityDetail {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const next15 = new Date(today);
  next15.setDate(next15.getDate() + 15);
  let done = 0;
  let inProgress = 0;
  let overdue = 0;
  let urgentToday = 0;
  let next14Days = 0;
  const openWithDue: TrackableActivityDetail['nextDue'][] = [];

  for (const activity of activities) {
    const category = activity?.workflowStateCategory ?? activity?.currentState?.category;
    const open = isActivityOpen(activity);
    if (isActivityDone(activity)) {
      done += 1;
    } else if (open && (category === 'in_progress' || category === 'in_review')) {
      inProgress += 1;
    }
    if (!open) continue;

    const dueDateRaw = activity?.dueDate;
    const due = dueDateRaw ? new Date(dueDateRaw) : null;
    const validDue = due && !Number.isNaN(due.getTime()) ? due : null;
    if (validDue) {
      if (validDue < today) overdue += 1;
      if (validDue >= today && validDue < next15) next14Days += 1;
      openWithDue.push({
        id: String(activity?.id ?? ''),
        title: String(activity?.title ?? activity?.name ?? t('processTrack.activities')),
        dueDate: validDue.toISOString(),
        priority: activity?.priority ?? null,
      });
    }
    if (activity?.priority === 'urgent' || (validDue && validDue >= today && validDue < tomorrow)) {
      urgentToday += 1;
    }
  }

  const nextDue =
    openWithDue
      .filter(Boolean)
      .sort((a, b) => new Date(a!.dueDate).getTime() - new Date(b!.dueDate).getTime())[0] ?? null;

  return {
    summary: {
      done,
      inProgress,
      overdue,
      total: activities.filter((a) => !isActivityCancelled(a)).length,
      urgentToday,
      next14Days,
    },
    nextDue,
  };
}

function trackableActivityDetailState(row: any): TrackableActivityDetailState | null {
  const id = row?.id;
  return id ? (trackableActivityDetails.value[id] ?? null) : null;
}

async function loadTrackableActivityDetail(row: any) {
  const id = row?.id;
  if (!id) return;
  const current = trackableActivityDetails.value[id];
  if (current?.loading || current?.data) return;
  trackableActivityDetails.value = {
    ...trackableActivityDetails.value,
    [id]: { loading: true, error: false, data: null },
  };
  try {
    const { data: trackableDetail } = await apiClient.get(`/trackables/${id}`);
    const processTrackId = Array.isArray(trackableDetail?.processTracks)
      ? trackableDetail.processTracks[0]?.id
      : null;
    if (!processTrackId) {
      trackableActivityDetails.value = {
        ...trackableActivityDetails.value,
        [id]: {
          loading: false,
          error: false,
          data: { summary: { done: 0, inProgress: 0, overdue: 0, total: 0, urgentToday: 0, next14Days: 0 }, nextDue: null },
        },
      };
      return;
    }
    const { data: processTrack } = await apiClient.get(`/process-tracks/${processTrackId}`);
    trackableActivityDetails.value = {
      ...trackableActivityDetails.value,
      [id]: {
        loading: false,
        error: false,
        data: summarizeTrackActivities(extractStageActivities(processTrack)),
      },
    };
  } catch {
    trackableActivityDetails.value = {
      ...trackableActivityDetails.value,
      [id]: { loading: false, error: true, data: null },
    };
  }
}

async function hydrateVisibleTrackableActivities(rowsToHydrate: any[]) {
  await Promise.allSettled(rowsToHydrate.map((row) => loadTrackableActivityDetail(row)));
}

function activitySummary(row: any): ActivitySummary {
  const detail = trackableActivityDetailState(row)?.data;
  const summary = detail?.summary ?? row?.activitySummary ?? {};
  return {
    done: Number(summary.done ?? 0),
    inProgress: Number(summary.inProgress ?? 0),
    overdue: Number(summary.overdue ?? 0),
    total: Number(summary.total ?? 0),
    urgentToday: Number(summary.urgentToday ?? 0),
    next14Days: Number(summary.next14Days ?? 0),
  };
}

function activityDonePct(row: any) {
  const summary = activitySummary(row);
  if (!summary.total) return 0;
  return Math.round((summary.done / summary.total) * 100);
}

function activityActivePct(row: any) {
  const summary = activitySummary(row);
  if (!summary.total) return 0;
  return Math.min(100, Math.round(((summary.done + summary.inProgress) / summary.total) * 100));
}

function matterEmoji(row: any) {
  const metadataEmoji = row?.metadata?.emoji;
  if (typeof metadataEmoji === 'string' && metadataEmoji.trim()) {
    return metadataEmoji.trim();
  }
  const matterType = row?.matterType || row?.type;
  const emojiByType: Record<string, string> = {
    litigation: '⚖️',
    criminal: '🛡️',
    family: '👥',
    labor: '🤝',
    tax: '🧾',
    corporate: '🏢',
    administrative: '🏛️',
    real_estate: '🏠',
    advisory: '💼',
    audit: '🔎',
    project: '📌',
    process: '⚙️',
    case: '📁',
  };
  return emojiByType[matterType] ?? '📁';
}

function matterMetaLine(row: any) {
  const parts = [
    row?.expedientNumber,
    row?.court,
    row?.client?.name,
    row?.counterpartyName,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : t('trackables.matterMetaFallback');
}

function matterSubtitleLine(row: any) {
  const parts = [row?.court, row?.client?.name, row?.counterpartyName].filter(Boolean);
  return parts.length ? parts.join(' · ') : t('trackables.matterMetaFallback');
}

function matterCaseKey(row: any) {
  const n = row?.expedientNumber;
  if (n == null || !String(n).trim()) return '';
  return String(n).trim().toUpperCase();
}

function formatRelativeDay(d: Date) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startDue = new Date(d);
  startDue.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startDue.getTime() - startOfToday.getTime()) / 86400000);
  const loc = dateLocaleTag();
  const lang = String(loc).toLowerCase().startsWith('en') ? 'en' : 'es';
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (Math.abs(diffDays) > 200) return formatDateShort(d);
  return rtf.format(diffDays, 'day');
}

function activityDeadlineHint(row: any): string | null {
  const detail = trackableActivityDetailState(row)?.data;
  if (detail?.nextDue) {
    const due = new Date(detail.nextDue.dueDate);
    if (!Number.isNaN(due.getTime())) {
      return t('trackables.activityDeadlineNextActivity', {
        title: detail.nextDue.title,
        when: formatRelativeDay(due),
      });
    }
  }
  const s = activitySummary(row);
  if (row?.dueDate) {
    const d = new Date(row.dueDate);
    if (!Number.isNaN(d.getTime())) {
      return t('trackables.activityDeadlineMatterDue', { when: formatRelativeDay(d) });
    }
  }
  if (s.overdue > 0) return t('trackables.activityDeadlineOverdueActivities', { n: s.overdue });
  if (Number(s.urgentToday ?? 0) > 0)
    return t('trackables.activityDeadlineUrgentTodayActivities', { n: Number(s.urgentToday ?? 0) });
  return null;
}

function activityDetailLoading(row: any) {
  return Boolean(trackableActivityDetailState(row)?.loading);
}

function matterRowClass() {
  return 'matter-datatable-row';
}

function closeCreateDialog() {
  showCreateDialog.value = false;
  createWizardStep.value = 0;
  createWizardMode.value = 'template';
  createWizardSystemBlueprintId.value = null;
  newTrackable.value = {
    title: '',
    type: null,
    matterType: 'other',
    description: '',
    dueDate: null,
    expedientNumber: '',
    court: '',
    jurisdiction: 'PE',
    clientId: null,
    counterpartyName: '',
    emoji: '⚖️',
  };
}

async function createTrackable() {
  if (!canTrackableCreate.value) return;
  creating.value = true;
  try {
    const { data: created } = await apiClient.post('/trackables', {
      title: newTrackable.value.title.trim(),
      type: newTrackable.value.type,
      matterType: newTrackable.value.matterType,
      description: newTrackable.value.description.trim() || undefined,
      dueDate: newTrackable.value.dueDate?.toISOString() || undefined,
      expedientNumber: newTrackable.value.expedientNumber.trim() || undefined,
      court: newTrackable.value.court.trim() || undefined,
      jurisdiction: newTrackable.value.jurisdiction.trim() || 'PE',
      clientId: newTrackable.value.clientId,
      counterpartyName: newTrackable.value.counterpartyName.trim() || undefined,
      metadata: { emoji: newTrackable.value.emoji },
      // Wizard always calls `createProcessTrack` next; avoid two ProcessTracks.
      skipAutoProcessTrack: true,
    });
    const id = created?.id as string | undefined;
    if (id) {
      if (createWizardMode.value === 'template' && createWizardSystemBlueprintId.value) {
        await createProcessTrack({
          trackableId: id,
          systemBlueprintId: createWizardSystemBlueprintId.value,
        });
      } else {
        await createProcessTrack({ trackableId: id });
      }
    }
    closeCreateDialog();
    toast.add({
      severity: 'success',
      summary: t('trackables.matterDialog.toastCreateSuccess'),
      life: 3000,
    });
    await loadTrackables(1);
    first.value = 0;
    if (id) {
      router.push(`/trackables/${id}`);
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: t('trackables.matterDialog.toastCreateError'),
      life: 4000,
    });
  } finally {
    creating.value = false;
  }
}

const showArchiveConfirm = ref(false);
const archiveConfirmTarget = ref<any | null>(null);
const archivingConfirm = ref(false);

const showReactivateConfirm = ref(false);
const reactivateConfirmTarget = ref<any | null>(null);
const reactivatingConfirm = ref(false);

const showTrashPermanentConfirm = ref(false);
const trashPermanentTarget = ref<any | null>(null);
const trashPermanentDeleting = ref(false);

const archiveConfirmConsequences = computed(() => [
  t('trackables.archiveConsequence1'),
  t('trackables.archiveConsequence2'),
  t('trackables.archiveConsequence3'),
]);

const reactivateConfirmConsequences = computed(() => [
  t('trackables.reactivateConsequence1'),
  t('trackables.reactivateConsequence2'),
]);

const trashPermanentConsequences = computed(() => [
  t('trackables.trashPermanentConsequence1'),
  t('trackables.trashPermanentConsequence2'),
]);

function onArchiveConfirmHide() {
  if (!archivingConfirm.value) archiveConfirmTarget.value = null;
}

function onReactivateConfirmHide() {
  if (!reactivatingConfirm.value) reactivateConfirmTarget.value = null;
}

function archiveTrackable(trackable: any) {
  if (!canTrackableUpdate.value) return;
  archiveConfirmTarget.value = trackable;
  showArchiveConfirm.value = true;
}

async function confirmArchiveTrackable() {
  if (!archiveConfirmTarget.value) return;
  archivingConfirm.value = true;
  try {
    await apiClient.patch(`/trackables/${archiveConfirmTarget.value.id}`, { status: 'archived' });
    toast.add({ severity: 'success', summary: t('trackables.deleteWizard.toastArchived'), life: 3000 });
    showArchiveConfirm.value = false;
    archiveConfirmTarget.value = null;
    first.value = 0;
    await loadTrackables(1);
  } catch {
    toast.add({ severity: 'error', summary: t('trackables.deleteWizard.toastArchiveError'), life: 3000 });
  } finally {
    archivingConfirm.value = false;
  }
}

function reactivateTrackable(trackable: any) {
  if (!canTrackableUpdate.value) return;
  reactivateConfirmTarget.value = trackable;
  showReactivateConfirm.value = true;
}

async function confirmReactivateTrackable() {
  if (!reactivateConfirmTarget.value) return;
  reactivatingConfirm.value = true;
  try {
    await apiClient.patch(`/trackables/${reactivateConfirmTarget.value.id}`, { status: 'active' });
    toast.add({ severity: 'success', summary: t('trackables.reactivateToastSuccess'), life: 3000 });
    showReactivateConfirm.value = false;
    reactivateConfirmTarget.value = null;
    first.value = 0;
    await loadTrackables(1);
  } catch {
    toast.add({ severity: 'error', summary: t('trackables.reactivateToastError'), life: 3000 });
  } finally {
    reactivatingConfirm.value = false;
  }
}

async function openEditDialog(row: any) {
  if (!canTrackableUpdate.value) return;
  editingId.value = row.id;
  showEditDialog.value = true;
  editLoading.value = true;
  try {
    const { data } = await apiClient.get(`/trackables/${row.id}`);
    const client = data.client as { id?: string } | undefined;
    const assignedTo = data.assignedTo as { id?: string } | undefined;
    editForm.value = {
      title: data.title ?? '',
      type: data.type ?? null,
      status: data.status ?? 'created',
      description: data.description ?? '',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      clientId: client?.id ?? null,
      counterpartyName: (data.counterpartyName as string) ?? '',
      matterType: (data.matterType as string) ?? 'other',
      assignedToId: assignedTo?.id ?? null,
      emoji: (data.metadata?.emoji as string | undefined) || matterEmoji(data),
      metadata: (data.metadata as Record<string, unknown> | null) ?? {},
    };
    editSnapshot.value = JSON.stringify(editForm.value);
    await nextTick();
    const titleInput = (editTitleRef.value as { $el?: HTMLElement } | null)?.$el?.querySelector?.('input');
    (titleInput as HTMLInputElement | undefined)?.focus();
  } catch {
    toast.add({ severity: 'error', summary: t('trackables.matterDialog.toastEditError'), life: 3000 });
    showEditDialog.value = false;
  } finally {
    editLoading.value = false;
  }
}

function resetEditForm() {
  editingId.value = null;
  editForm.value = {
    title: '',
    type: null,
    status: 'created',
    description: '',
    dueDate: null,
    clientId: null,
    counterpartyName: '',
    matterType: 'other',
    assignedToId: null,
    emoji: '⚖️',
    metadata: {},
  };
  editSnapshot.value = JSON.stringify(editForm.value);
}

async function saveEdit() {
  if (!editingId.value || !canTrackableUpdate.value) return;
  savingEdit.value = true;
  try {
    await apiClient.patch(`/trackables/${editingId.value}`, {
      title: editForm.value.title.trim(),
      type: editForm.value.type,
      status: editForm.value.status,
      description: editForm.value.description.trim() || undefined,
      dueDate: editForm.value.dueDate?.toISOString() || undefined,
      matterType: editForm.value.matterType,
      counterpartyName: editForm.value.counterpartyName?.trim() || undefined,
      clientId: editForm.value.clientId,
      assignedToId: editForm.value.assignedToId,
      metadata: { ...editForm.value.metadata, emoji: editForm.value.emoji },
    });
    toast.add({
      severity: 'success',
      summary: t('trackables.matterDialog.toastEditSuccess'),
      life: 3000,
    });
    editSnapshot.value = JSON.stringify(editForm.value);
    showEditDialog.value = false;
    await loadTrackables(Math.floor(first.value / rows.value) + 1);
  } catch {
    toast.add({
      severity: 'error',
      summary: t('trackables.matterDialog.toastEditError'),
      life: 3000,
    });
  } finally {
    savingEdit.value = false;
  }
}

function openDeleteWizard(trackable: any) {
  if (!canTrackableDelete.value) return;
  deleteTarget.value = trackable;
  showDeleteWizard.value = true;
}

function onDeleteWizardDone() {
  deleteTarget.value = null;
  loadTrackables(Math.floor(first.value / rows.value) + 1);
}

watch(
  [authReady, canTrackableRead, listScope],
  ([ready, read, scope], prev) => {
    if (!ready || !read) return;
    const prevScope = prev?.[2] as ListScope | undefined;
    if (scope !== 'trash' && prevScope !== undefined && prevScope !== scope) {
      trackables.value = [];
      totalRecords.value = 0;
      activityFilterFacets.value = { total: 0, urgentToday: 0, overdue: 0, next14Days: 0 };
    }
    if (scope === 'trash') {
      if (!canDocRead.value) {
        listScope.value = 'active';
        return;
      }
      loadTrash();
      return;
    }
    void loadClientsForCase();
    void loadUsers();
    loadTrackables(1);
  },
  { immediate: true },
);

watch(listScope, (scope) => {
  first.value = 0;
  if (scope !== 'trash') {
    filters.value.status = null;
  }
  if (scope !== 'active') {
    filters.value.activityFilter = null;
  }
  if (scope === 'trash' && canDocRead.value) {
    router.replace({ path: '/trackables', query: { scope: 'trash' } });
  } else if (scope !== 'trash') {
    router.replace({ path: '/trackables', query: {} });
  }
});

watch(canDocRead, (ok) => {
  if (!ok && listScope.value === 'trash') {
    listScope.value = 'active';
    router.replace({ path: '/trackables', query: {} });
  }
});
</script>

<style scoped>
.scope-tabs :deep(.p-button) {
  flex: 1 1 auto;
}
@media (min-width: 640px) {
  .scope-tabs {
    width: fit-content;
  }
}
.matters-data-table :deep(.p-datatable-tbody > tr),
.trash-data-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.15s ease;
}
.activity-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.5rem;
}
.activity-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  padding: 0.25rem 0.55rem 0.25rem 0.4rem;
  border-radius: 0.625rem;
  border: 1px solid color-mix(in srgb, var(--surface-border) 92%, transparent);
  background: color-mix(in srgb, var(--surface-raised) 96%, var(--surface-app));
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  --stat-accent: var(--brand-zafiro);
}
.activity-stat__icon {
  display: inline-flex;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  background: color-mix(in srgb, var(--stat-accent) 14%, var(--surface-raised));
  color: var(--stat-accent);
  font-size: 11px;
}
.activity-stat__body {
  display: inline-flex;
  flex-direction: column;
  line-height: 1;
  gap: 0.1rem;
}
.activity-stat__label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg-muted);
  white-space: nowrap;
}
.activity-stat__value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--fg-default);
  letter-spacing: -0.01em;
}
.activity-stat__total {
  font-weight: 600;
  color: var(--fg-subtle);
}
.activity-stat--done {
  --stat-accent: #0f766e;
}
.activity-stat--progress {
  --stat-accent: #b45309;
}
.activity-stat--danger {
  --stat-accent: #b91c1c;
  border-color: color-mix(in srgb, #b91c1c 28%, var(--surface-border));
  background: color-mix(in srgb, #fef2f2 70%, var(--surface-raised));
}
.activity-stat--danger .activity-stat__value {
  color: #991b1b;
}
.activity-stat--danger .activity-stat__label {
  color: #b91c1c;
}
:global(.dark) .activity-stat--danger {
  border-color: color-mix(in srgb, #dc2626 38%, var(--surface-border));
  background: color-mix(in srgb, #dc2626 14%, var(--surface-raised));
}
:global(.dark) .activity-stat--danger .activity-stat__value {
  color: #fecaca;
}
:global(.dark) .activity-stat--danger .activity-stat__label {
  color: #fca5a5;
}
.exp-kpi-mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 80% at 0% 0%, var(--kpi-mesh-1, transparent), transparent 60%),
    radial-gradient(120% 80% at 100% 100%, var(--kpi-mesh-2, transparent), transparent 60%);
  pointer-events: none;
}
.exp-kpi-grain {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.06'/></svg>");
  mix-blend-mode: overlay;
  pointer-events: none;
}
.exp-kpi-icon-wrap {
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 24%, var(--surface-border));
  background: color-mix(in srgb, var(--kpi-accent) 10%, var(--surface-raised));
  color: var(--kpi-accent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 28%, transparent);
}
:global(.dark) .exp-kpi-icon-wrap {
  background: color-mix(in srgb, var(--kpi-accent) 18%, var(--surface-raised));
  box-shadow: none;
}
.exp-kpi-card {
  cursor: pointer;
  animation: expKpiFadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--stagger-delay, 0ms);
}
.exp-kpi-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--kpi-accent, var(--accent)) 55%, var(--surface-border));
  outline-offset: 2px;
}
.exp-kpi-card--active {
  background: color-mix(in srgb, var(--kpi-accent) 12%, var(--surface-raised));
}
:global(.dark) .exp-kpi-card--active {
  background: color-mix(in srgb, var(--kpi-accent) 22%, var(--surface-raised));
}


.exp-kpi-card--overdue-bar {
  border-left: 3px solid color-mix(in srgb, #b91c1c 85%, var(--surface-border));
}
.exp-kpi-card--urgency-bar {
  border-left: 3px solid color-mix(in srgb, #f7d306 85%, var(--surface-border));
}
.exp-kpi-card--next14-bar {
  border-left: 3px solid color-mix(in srgb, #06B6D4 85%, var(--surface-border));
}
.exp-kpi-card--total-bar {
  border-left: 3px solid color-mix(in srgb, #2D3FBF 85%, var(--surface-border));
}

.exp-kpi-pulse {
  animation: expKpiPulse 1.6s ease-in-out infinite;
}
@keyframes expKpiPulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(1.15);
  }
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .exp-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}
.toolbar-iconfield {
  width: 100%;
}
.toolbar-iconfield :deep(.p-inputtext),
.toolbar-search :deep(.p-inputtext) {
  width: 100%;
  border-radius: 0.75rem;
}
.matters-command-toolbar {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--brand-zafiro) 6%, transparent);
}
.matter-type-tag :deep(.p-tag) {
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 0.375rem;
}
:deep(.matter-actions-header) {
  text-align: center !important;
}
:deep(.matter-actions-cell) {
  text-align: center !important;
  vertical-align: middle !important;
}
:deep(.matters-row-actions) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.5rem !important;
  column-gap: 1rem !important;
}
:deep(.matters-row-actions > *) {
  margin: 0 0.000em !important;
}
:deep(.matter-action.p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}
:deep(.matter-action .p-button-icon) {
  font-size: 0.875rem;
}
.matters-dt-region--scrolled :deep([data-pc-section='tablecontainer']) {
  box-shadow: inset 0 10px 14px -12px color-mix(in srgb, #000 14%, transparent);
}
.matters-dt-region :deep([data-pc-name='datatable']) {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}
.matters-data-table :deep([data-pc-section='tablecontainer']) {
  transition: box-shadow 0.2s ease;
}
.matters-dt--comfortable :deep([data-pc-section='tbody'] > tr > td) {
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}
.type-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  padding: 0.35rem 0.95rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fg-muted);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.type-chip__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 9999px;
}
.type-chip:hover {
  border-color: color-mix(in srgb, var(--chip-accent, var(--accent)) 35%, var(--surface-border));
  color: var(--fg-default);
}
.type-chip--active {
  border-width: 1.5px;
  border-color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 12%, var(--surface-raised));
  color: var(--chip-accent, var(--accent));
}
:global(.dark) .type-chip--active {
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 22%, var(--surface-raised));
}
.type-chip:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--chip-accent, var(--accent)) 45%, var(--surface-border));
  outline-offset: 2px;
}
.toolbar-dropdown :deep(.p-dropdown),
.toolbar-dropdown :deep(.p-select) {
  width: 100%;
  border-radius: 0.75rem;
}
.toolbar-dropdown-assignee :deep(.p-select-label),
.toolbar-dropdown-assignee :deep(.p-dropdown-label) {
  display: flex;
  align-items: center;
  min-width: 0;
}
@keyframes expKpiFadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .exp-kpi-card {
    animation: none !important;
  }
  .exp-kpi-card:hover {
    transform: none !important;
  }
  .exp-kpi-pulse {
    animation: none !important;
  }
  .exp-kpi-grain {
    opacity: 0.12 !important;
  }
}
.matters-data-table {
  min-width: 760px;
}
.matters-data-table :deep([data-pc-section='thead'] > tr > th) {
  background: var(--surface-raised);
  border-bottom: 1px solid var(--surface-border);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-feature-settings: 'tnum' 1;
}
@media (hover: hover) {
  .matters-data-table :deep(.p-datatable-tbody > tr:hover) {
    background: color-mix(in srgb, var(--accent-soft) 50%, var(--surface-raised));
  }
  .trash-data-table :deep(.p-datatable-tbody > tr:hover) {
    background: color-mix(in srgb, var(--accent-soft) 45%, var(--surface-raised));
  }
}

/* ------------------------------------------------------------------ */
/* Matter dialogs: headless #container — no .p-dialog-content padding   */
/* ------------------------------------------------------------------ */
:deep(.matter-dialog-root.p-dialog) {
  display: flex !important;
  flex-direction: column;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}
.matter-dialog-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  max-height: min(88vh, 720px);
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* —— Create wizard —— */
.matter-wizard-root {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.matter-wizard {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  overflow: hidden;
}
.matter-wizard__sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.35rem 1.1rem 1rem;
  border-right: 1px solid var(--surface-border);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 14%, var(--surface-raised)) 0%,
    color-mix(in srgb, var(--brand-zafiro) 5%, var(--surface-raised)) 100%
  );
  min-height: 0;
  overflow-y: auto;
}
.matter-wizard__brand {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}
.matter-wizard__brand-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 28%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 12%, var(--surface-raised));
}
.matter-wizard__brand-text {
  min-width: 0;
}
.matter-wizard__eyebrow {
  display: block;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-zafiro);
}
:global(.dark) .matter-wizard__eyebrow {
  color: var(--accent);
}
.matter-wizard__brand-title {
  margin: 0.15rem 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--fg-default);
}
.matter-wizard__progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.matter-wizard__progress-label {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--fg-muted);
}
.matter-wizard__progress-bar {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-zafiro) 16%, var(--surface-border));
  overflow: hidden;
}
.matter-wizard__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--brand-zafiro);
  transition: width 0.25s ease;
}
.matter-wizard__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.matter-wizard__step {
  position: relative;
  padding-left: 0;
}
.matter-wizard__step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 28px;
  bottom: -6px;
  width: 0;
  border-left: 1px dashed color-mix(in srgb, var(--brand-zafiro) 35%, var(--surface-border));
  pointer-events: none;
}
.matter-wizard__step-btn {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  width: 100%;
  padding: 0.35rem 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--fg-default);
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.matter-wizard__step-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-zafiro) 8%, transparent);
}
.matter-wizard__step-btn:disabled {
  cursor: default;
  opacity: 0.55;
}
.matter-wizard__step-dot {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--brand-zafiro) 35%, var(--surface-border));
  background: var(--surface-raised);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.matter-wizard__step--done .matter-wizard__step-dot {
  border-color: #059669;
  background: #059669;
}
.matter-wizard__step--current .matter-wizard__step-dot {
  border-color: var(--brand-zafiro);
  background: var(--brand-zafiro);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-zafiro) 22%, transparent);
}
.matter-wizard__step-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #fff;
}
.matter-wizard__step-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.matter-wizard__step-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--fg-default);
}
.matter-wizard__step-hint {
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--fg-muted);
}
.matter-wizard__support {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.matter-wizard__support-icon {
  font-size: 0.85rem;
  color: var(--brand-zafiro);
}
.matter-wizard__support-link {
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.matter-wizard__support-link:hover {
  color: var(--accent-hover);
}

.matter-wizard__content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  position: relative;
  background: var(--surface-raised);
}
.matter-wizard__header {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 3rem 0.85rem 1.35rem;
  border-bottom: 1px solid var(--surface-border);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 5%, var(--surface-raised)) 0%,
    var(--surface-raised) 100%
  );
}
.matter-wizard__header-text {
  min-width: 0;
}
.matter-wizard__step-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--fg-default);
  line-height: 1.25;
}
.matter-wizard__step-sub {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--fg-muted);
}
.matter-wizard__close,
.matter-edit__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  color: var(--fg-muted);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.matter-wizard__close:hover:not(:disabled),
.matter-edit__close:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--surface-border));
  color: var(--fg-default);
}
.matter-wizard__close:disabled,
.matter-edit__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.matter-wizard__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.35rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-gutter: stable;
}
.matter-wizard__footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-sunken) 58%, var(--surface-raised));
  padding: 0.75rem 1.35rem 0.9rem;
}
.matter-wizard__footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.matter-wizard__footer-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* —— Edit modal —— */
.matter-edit-root {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.matter-edit__header {
  flex: 0 0 auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 3.25rem 0.85rem 1.25rem;
  border-bottom: 1px solid var(--surface-border);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 6%, var(--surface-raised)) 0%,
    var(--surface-raised) 100%
  );
}
.matter-edit__header-main {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}
.matter-edit__brand-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 24%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 10%, var(--surface-raised));
}
.matter-edit__eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-zafiro);
}
:global(.dark) .matter-edit__eyebrow {
  color: var(--accent);
}
.matter-edit__title {
  margin: 0.15rem 0 0;
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--fg-default);
}
.matter-edit__sub {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--fg-muted);
}
.matter-edit__dirty {
  margin: 0.25rem 0 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #b45309;
}
:global(.dark) .matter-edit__dirty {
  color: #fbbf24;
}
.matter-edit__header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.15rem;
}
.matter-open-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  transition: background-color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}
.matter-open-link:hover {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--surface-border));
}
.matter-edit__loading {
  flex: 1 1 auto;
  min-height: 8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.matter-edit__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-gutter: stable;
}
.matter-edit__footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-sunken) 58%, var(--surface-raised));
  padding: 0.75rem 1.35rem 0.9rem;
}
.matter-edit__footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* —— Form blocks (shared) —— */
.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding-bottom: 0.85rem;
}
.matter-form-section:last-of-type {
  padding-bottom: 0;
}
.matter-form-section__title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
.matter-field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--fg-default);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.matter-field-required {
  color: #b91c1c;
  font-weight: 600;
}
:global(.dark) .matter-field-required {
  color: #fca5a5;
}
.matter-field-help {
  font-size: 0.75rem;
  color: var(--fg-subtle);
  line-height: 1.4;
}
.matter-field-error {
  font-size: 0.75rem;
  color: #b91c1c;
  font-weight: 500;
  line-height: 1.4;
}
:global(.dark) .matter-field-error {
  color: #fca5a5;
}
.matter-mode-toggle :deep(.p-button) {
  flex: 1 1 0;
}
.font-mono-num :deep(.p-inputtext) {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: 0.01em;
}
.uppercase-input :deep(.p-inputtext) {
  text-transform: uppercase;
}

@media (max-width: 699px) {
  .matter-wizard {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .matter-wizard__sidebar {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-right: 0;
    border-bottom: 1px solid var(--surface-border);
    max-height: none;
    overflow: visible;
  }
  .matter-wizard__brand {
    flex: 1 1 auto;
    min-width: 0;
  }
  .matter-wizard__progress-wrap {
    flex: 1 1 140px;
    min-width: 120px;
  }
  .matter-wizard__steps {
    flex-direction: row;
    flex-wrap: nowrap;
    width: 100%;
    overflow-x: auto;
    gap: 0.25rem;
    padding-bottom: 0.15rem;
  }
  .matter-wizard__step:not(:last-child)::before {
    display: none;
  }
  .matter-wizard__step-btn {
    flex-direction: column;
    align-items: center;
    min-width: 4.5rem;
    padding: 0.25rem;
  }
  .matter-wizard__step-hint {
    display: none;
  }
  .matter-wizard__support {
    display: none;
  }
  .matter-wizard__header {
    padding-right: 3rem;
    padding-left: 1rem;
  }
  .matter-wizard__body {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .matter-wizard__footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .matter-dialog-shell {
    max-height: 92vh;
  }
  .matter-edit__header {
    padding-right: 3rem;
    padding-left: 1rem;
  }
  .matter-edit__body {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
