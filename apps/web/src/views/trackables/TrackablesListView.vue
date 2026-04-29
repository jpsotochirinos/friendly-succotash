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

    <ConfirmDialogBase
      v-model:visible="showAssignConfirm"
      variant="info"
      :title="t('trackables.assignInlineConfirmTitle')"
      :subject="assignConfirmSubjectLine"
      :message="assignConfirmMessageLine"
      :confirm-label="t('trackables.assignInlineConfirmLabel')"
      :loading="assigningInline"
      @hide="onAssignConfirmHide"
      @confirm="confirmAssignInline"
    />

    <ConfirmDialogBase
      v-model:visible="showClientConfirm"
      variant="info"
      :title="t('trackables.assignClientConfirmTitle')"
      :subject="clientConfirmSubjectLine"
      :message="clientConfirmMessageLine"
      :confirm-label="t('trackables.assignClientConfirmLabel')"
      :loading="assigningClientInline"
      @hide="onClientConfirmHide"
      @confirm="confirmAssignClientInline"
    />

    <Popover ref="assignInlinePopoverRef" class="assign-inline-popover w-[min(100vw-2rem,18rem)]">
      <div
        class="flex max-h-[min(280px,46vh)] flex-col gap-1 overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-md"
      >
        <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            {{ t('trackables.assignInlinePopoverTitle') }}
          </p>
          <p class="m-0 mt-0.5 text-xs leading-snug text-[var(--fg-subtle)]">
            {{ t('trackables.assignInlinePopoverHint') }}
          </p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1">
          <template v-if="users.length === 0">
            <p class="m-0 px-2 py-4 text-center text-xs text-[var(--fg-muted)]">
              {{ t('trackables.assignInlinePopoverEmpty') }}
            </p>
          </template>
          <ul v-else class="m-0 list-none space-y-0.5 p-0">
            <li v-for="u in sortedAssignableUsers" :key="u.id">
              <button
                type="button"
                class="assign-inline-user-btn flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--accent-soft)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)]"
                @click="requestAssignConfirm(u)"
              >
                <img
                  v-if="u.avatarUrl"
                  :src="u.avatarUrl"
                  alt=""
                  class="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <span
                  v-else
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--fg-on-brand)]"
                  :style="{ background: assigneeAvatarBg(u.id) }"
                >
                  {{ initialsFromLabel(assignListPrimaryName(u) || u.email) }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-[var(--fg-default)]">{{
                    assignListPrimaryName(u)
                  }}</span>
                  <span
                    v-if="assignListSecondaryLine(u)"
                    class="block truncate text-[11px] text-[var(--fg-muted)]"
                    >{{ assignListSecondaryLine(u) }}</span
                  >
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Popover>

    <Popover ref="clientInlinePopoverRef" class="client-inline-popover w-[min(100vw-2rem,18rem)]">
      <div
        class="flex max-h-[min(280px,46vh)] flex-col gap-1 overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-md"
      >
        <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            {{ t('trackables.assignClientPopoverTitle') }}
          </p>
          <p class="m-0 mt-0.5 text-xs leading-snug text-[var(--fg-subtle)]">
            {{ t('trackables.assignClientPopoverHint') }}
          </p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1">
          <template v-if="clientsOptions.length === 0">
            <p class="m-0 px-2 py-4 text-center text-xs text-[var(--fg-muted)]">
              {{ t('trackables.assignClientPopoverEmpty') }}
            </p>
          </template>
          <ul v-else class="m-0 list-none space-y-0.5 p-0">
            <li v-for="c in sortedAssignableClients" :key="c.id">
              <button
                type="button"
                class="assign-inline-user-btn flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--accent-soft)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)]"
                @click="requestClientConfirm(c)"
              >
                <img
                  v-if="c.avatarUrl"
                  :src="c.avatarUrl"
                  alt=""
                  class="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <span
                  v-else
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-sunken)_75%,transparent)] text-[var(--accent)]"
                  aria-hidden="true"
                >
                  <i class="pi pi-plus text-[11px] leading-none" />
                </span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-[var(--fg-default)]">{{
                  c.name
                }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Popover>

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
    <UrgencyKpiChipsBar
      v-if="listScope === 'active'"
      :facets="listingFacets"
      :model-value="filters.urgency"
      :assigned-to-me-active="isAssignedToMeFilter"
      :mine-count="isAssignedToMeFilter ? totalRecords : null"
      :show-mine-chip="Boolean(user?.id)"
      @update:model-value="onListingUrgencyChange"
      @toggle-assigned-to-me="toggleAssignedToMeFilter"
    />

    <div
      class="app-card matters-cockpit-card flex h-[min(82vh,calc(100dvh-11rem))] min-h-[520px] flex-col overflow-hidden shadow-sm"
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
            />
          </IconField>
          <div
            class="flex min-w-0 shrink-0 flex-col gap-2 border-t border-[var(--surface-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:border-t-0 sm:pt-0 lg:border-l lg:border-t-0 lg:pl-5"
            role="group"
            :aria-label="t('trackables.toolbarResultsGroupAria')"
          >
            <div
              class="toolbar-results-line flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-[var(--fg-default)]"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>{{ t('trackables.toolbarResults', { n: totalRecords }) }}</span>
              <template v-if="activeFilterCount > 0">
                <span class="text-[var(--fg-subtle)]" aria-hidden="true">·</span>
                <Button
                  type="button"
                  class="matters-active-filters-btn !p-0 text-sm font-medium normal-case tabular-nums text-accent underline-offset-2 hover:underline"
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
          <div class="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:shrink-0">
            <MattersToolbarScopeFilters
              v-model:status="filters.status"
              v-model:assigned-to-id="filters.assignedToId"
              :show-status="listScope === 'active'"
              :status-options="statusFilterOptions"
              :assignee-options="assigneeFilterOptions"
              @applied="resetAndLoad"
            />
          </div>
        </div>
      </div>

      <div
        v-if="mattersShowSkeleton"
        class="matters-skeleton-shell flex-1 min-h-[420px] overflow-x-auto overscroll-x-contain"
        :aria-label="t('trackables.loadingTable')"
      >
        <div class="min-w-[560px]">
          <div
            v-for="row in tableSkeletonRows"
            :key="`matter-skeleton-${row}`"
            class="matter-skeleton-row grid items-start gap-3 border-b border-[var(--surface-border)] px-4 py-4 last:border-0"
            style="grid-template-columns: 1fr 3rem 7.5rem;"
          >
            <!-- Info cell skeleton (aligned with matter-info-layout) -->
            <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
              <div class="matter-info-text flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <Skeleton shape="circle" size="2.25rem" />
                  <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <Skeleton height="1rem" width="4.5rem" border-radius="0.375rem" />
                      <Skeleton height="1.25rem" width="4rem" border-radius="999px" />
                    </div>
                    <Skeleton height="0.9rem" width="78%" />
                    <Skeleton height="0.7rem" width="55%" />
                  </div>
                </div>
              </div>
              <div
                class="flex w-full min-w-0 items-start justify-start pl-[calc(2.25rem+0.75rem)] lg:w-auto lg:max-w-none lg:shrink-0 lg:pl-0"
              >
                <Skeleton height="1.75rem" width="11rem" border-radius="0.625rem" />
              </div>
            </div>
            <!-- Assignee avatar only -->
            <div class="flex justify-center pt-1">
              <Skeleton shape="circle" size="2rem" />
            </div>
            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-1">
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
        <div
          v-if="mattersShowEmptyState"
          class="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center"
        >
          <span
            class="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--accent-soft)_55%,var(--surface-raised))] text-[var(--accent)]"
            aria-hidden="true"
          >
            <i class="pi pi-folder-open text-2xl" />
          </span>
          <div class="flex max-w-md flex-col gap-1">
            <p class="m-0 text-base font-medium text-[var(--fg-default)]">
              {{ t('trackables.tableEmptyTitle') }}
            </p>
            <p class="m-0 text-sm text-[var(--fg-muted)]">
              {{
                listScope === 'archived'
                  ? t('trackables.tableEmptyArchived')
                  : t('trackables.tableEmptyActive')
              }}
            </p>
          </div>
          <Button
            v-if="hasActiveFilters"
            :label="t('trackables.clearFilters')"
            icon="pi pi-filter-slash"
            size="small"
            outlined
            @click="clearFilters"
          />
        </div>
        <DataTable
          v-else
          ref="mattersDtRef"
          class="matters-data-table matters-data-table--cockpit min-h-0 flex-1"
          :class="{ 'matters-dt--comfortable': tableDensity === 'comfortable' }"
          :value="trackables"
          :loading="loading"
          data-key="id"
          :size="tableDensity === 'compact' ? 'small' : undefined"
          scrollable
          scroll-height="flex"
          row-hover
          responsive-layout="scroll"
          :show-headers="false"
          :virtual-scroller-options="mattersUseVirtualScroller ? mattersVirtualScrollerOptions : undefined"
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
        <Column
          field="title"
          :header="t('trackables.tableColTitle')"
          body-class="matter-col-info align-top"
        >
          <template #body="{ data }">
            <div class="matter-info-cell flex min-w-0 flex-col gap-2 py-1">
              <span class="sr-only">{{ t('trackables.matterRowInfoSr') }}</span>
              <div
                class="matter-info-layout flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-start lg:gap-x-2 lg:gap-y-2"
                :style="matterPrimaryColumnCssVars"
              >
              <div
                class="matter-info-text flex min-h-0 min-w-0 flex-1 items-start gap-3 lg:min-w-0 lg:flex-none lg:overflow-hidden lg:w-[min(var(--matter-primary-col,280px),calc(100%-13rem))]"
              >
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--accent-soft)] text-lg"
                  :aria-label="t('trackables.matterEmojiLabel')"
                >
                  {{ matterEmoji(data) }}
                </span>
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <div class="matter-info-cell__topline flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      v-if="matterCaseKey(data)"
                      class="matter-case-key font-mono-num inline-flex w-fit max-w-full truncate rounded-md border border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-raised)_88%,var(--accent-soft))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--fg-muted)]"
                    >
                      {{ matterCaseKey(data) }}
                    </span>
                    <button
                      v-else-if="canTrackableUpdate"
                      type="button"
                      class="matter-expediente-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--fg-subtle)] text-[var(--fg-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      :aria-label="t('trackables.assignExpedienteHint')"
                      v-tooltip.top="t('trackables.assignExpedienteHint')"
                      @click="openEditDialog(data)"
                    >
                      <i class="pi pi-hashtag text-[11px]" aria-hidden="true" />
                    </button>
                    <span
                      v-else
                      class="matter-expediente-ring matter-expediente-ring--readonly flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--surface-border)] text-[var(--fg-subtle)]"
                      aria-hidden="true"
                    >
                      <i class="pi pi-hashtag text-[11px] opacity-70" aria-hidden="true" />
                    </span>
                    <Tag
                      :value="typeLabel(data.type).toLocaleUpperCase(dateLocaleTag())"
                      :severity="typeSeverity(data.type)"
                      class="matter-type-tag shrink-0 tracking-wide"
                    />
                  </div>
                  <router-link
                    :to="`/trackables/${data.id}`"
                    class="font-semibold leading-snug text-accent hover:underline"
                  >
                    <span class="line-clamp-2">{{ data.title }}</span>
                  </router-link>
                  <button
                    v-if="matterMetaLooksIncomplete(data) && canTrackableUpdate"
                    type="button"
                    class="matter-meta-incomplete matter-meta-incomplete--cockpit matter-meta-incomplete--action m-0 inline-block max-w-full text-left text-[var(--fg-subtle)] line-clamp-1"
                    :aria-label="t('trackables.assignClientPopoverTitle')"
                    v-tooltip.top="t('trackables.assignClientPopoverHint')"
                    @click="(e) => openClientInlinePopover(e, data)"
                  >
                    {{ t('trackables.matterMetaCockpitClientHint') }}
                  </button>
                  <p
                    v-else
                    class="m-0 max-w-full text-xs leading-snug text-[var(--fg-subtle)]"
                    :class="
                      matterMetaLooksIncomplete(data)
                        ? 'matter-meta-incomplete matter-meta-incomplete--cockpit line-clamp-1'
                        : 'line-clamp-1'
                    "
                  >
                    {{
                      matterMetaLooksIncomplete(data)
                        ? t('trackables.matterMetaCockpitClientHint')
                        : matterCaseKey(data)
                          ? matterSubtitleLine(data)
                          : matterMetaLine(data)
                    }}
                  </p>
                </div>
              </div>
              <div
                class="matter-info-cell__activity flex w-full min-w-0 flex-col pl-[calc(2.5rem+0.75rem)] lg:w-auto lg:max-w-none lg:shrink-0 lg:items-start lg:justify-start lg:pl-0"
              >
                <template v-if="activitySummary(data).total > 0">
                  <div
                    class="activity-stats min-w-0 justify-start lg:w-fit lg:max-w-full"
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
                      class="activity-stat"
                      :class="
                        activitySummary(data).overdue
                          ? 'activity-stat--danger'
                          : 'activity-stat--overdue-zero'
                      "
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
                  <div
                    class="matter-activity-progress mt-2 w-full min-w-[12rem] max-w-[min(22rem,calc(100vw-12rem))]"
                  >
                    <div
                      class="rounded-xl border border-[var(--surface-border)] bg-white/70 px-2 py-1.5 dark:bg-white/5"
                    >
                      <p class="m-0 text-[10px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">
                        {{
                          t('trackables.expedienteSummary.completedPct', {
                            n: activityDonePct(data),
                          })
                        }}
                      </p>
                      <div
                        class="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700/80"
                      >
                        <div
                          class="absolute inset-y-0 left-0 h-full rounded-full bg-slate-400/45 transition-[width] dark:bg-slate-500/35"
                          :style="{ width: `${activityActivePct(data)}%` }"
                        />
                        <div
                          class="absolute inset-y-0 left-0 h-full rounded-full transition-[width]"
                          role="progressbar"
                          :aria-valuenow="activityDonePct(data)"
                          aria-valuemin="0"
                          aria-valuemax="100"
                          :aria-label="t('trackables.expedienteSummary.avanceTitle')"
                          :style="{
                            width: `${activityDonePct(data)}%`,
                            background:
                              'linear-gradient(90deg, #0F6E7A 0%, #2D3FBF 50%, #3FB58C 100%)',
                          }"
                        />
                      </div>
                    </div>
                  </div>
                </template>
                <span
                  v-else
                  class="text-left text-xs italic text-[var(--fg-subtle)] lg:max-w-[18rem]"
                >
                  {{ t('trackables.activityEmpty') }}
                </span>
              </div>
              </div>
            </div>
          </template>
        </Column>
        <Column
          field="assignedTo"
          :header="t('trackables.tableColAssigned')"
          body-class="matter-col-assignee align-middle"
        >
          <template #body="{ data }">
            <!-- Avatar only + tooltip (cockpit pattern) -->
            <template v-if="data.assignedTo">
              <img
                v-if="data.assignedTo.avatarUrl"
                :src="data.assignedTo.avatarUrl"
                :alt="assignedToName(data.assignedTo)"
                class="mx-auto h-8 w-8 rounded-full object-cover"
                v-tooltip.left="assignedToName(data.assignedTo)"
              />
              <span
                v-else
                class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-[var(--fg-on-brand)]"
                :style="{ background: assigneeAvatarBg(data.assignedTo.id) }"
                v-tooltip.left="assignedToName(data.assignedTo)"
                :aria-label="assignedToName(data.assignedTo)"
              >
                {{ assigneeInitials(data.assignedTo) }}
              </span>
            </template>
            <!-- Sin asignar: icono fantasma clicable si tiene permiso -->
            <button
              v-else-if="canTrackableUpdate"
              type="button"
              class="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--fg-subtle)] text-[var(--fg-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              v-tooltip.left="t('trackables.assignInlineCta')"
              :aria-label="t('trackables.assignInlineCta')"
              @click="(e) => openAssignInlinePopover(e, data)"
            >
              <i class="pi pi-user-plus text-sm" aria-hidden="true" />
            </button>
            <span
              v-else
              class="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--fg-subtle)]"
              v-tooltip.left="t('trackables.unassigned')"
              :aria-label="t('trackables.unassigned')"
            >
              <i class="pi pi-user text-xs text-[var(--fg-subtle)]" aria-hidden="true" />
            </span>
          </template>
        </Column>
        <Column
          v-if="rowHasTrackableActions"
          :header="t('common.actions')"
          header-class="matter-actions-header"
          body-class="matter-actions-cell align-middle"
          class="min-w-[7.5rem] whitespace-nowrap"
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

      <div
        v-if="!mattersShowSkeleton && totalRecords > 0"
        class="flex-shrink-0 border-t border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5"
      >
        <Paginator
          :first="listingFirst"
          :rows="listingRowsPerPage"
          :total-records="totalRecords"
          :rows-per-page-options="[25, 50, 100]"
          :current-page-report-template="t('trackables.tablePageReport')"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          @page="onListingPaginatorPage"
        />
        <p
          v-if="activeFilterCount > 0"
          class="m-0 mt-2 text-xs tabular-nums text-[var(--fg-muted)]"
        >
          {{ t('trackables.toolbarFiltersActive', { n: activeFilterCount }) }}
        </p>
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
      :style="{ width: 'min(640px, 96vw)' }"
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
        <div class="matter-dialog-shell">
          <header class="matter-dialog-header">
            <div class="flex items-start gap-3">
              <div class="matter-dialog-icon" aria-hidden="true">
                <span class="text-xl leading-none">{{ newTrackable.emoji || '⚖️' }}</span>
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="matter-dialog-eyebrow">{{ t('trackables.matterDialog.eyebrowCreate') }}</span>
                <h2 class="matter-dialog-title">{{ t('trackables.matterDialog.createTitle') }}</h2>
                <p class="matter-dialog-stephint">{{ t(`trackables.matterDialog.steps.${currentCreateStepId}`) }}</p>
              </div>
            </div>
            <button
              v-if="!creating"
              type="button"
              class="dialog-close-btn"
              :aria-label="t('trackables.matterDialog.closeAriaLabel')"
              @click="attemptCloseCreate"
            >
              <i class="pi pi-times text-sm" aria-hidden="true" />
            </button>
          </header>

          <div
            class="matter-dialog-steps"
            role="group"
            :aria-label="t('trackables.matterDialog.stepIndicator', { current: createWizardStep + 1, total: createStepIds.length })"
          >
            <template v-for="(stepId, idx) in createStepIds" :key="stepId">
              <div class="flex items-center gap-2">
                <div
                  class="matter-dialog-step__circle"
                  :class="{
                    'matter-dialog-step__circle--done': idx < createWizardStep,
                    'matter-dialog-step__circle--active': idx === createWizardStep,
                  }"
                  :aria-current="idx === createWizardStep ? 'step' : undefined"
                >
                  <i v-if="idx < createWizardStep" class="pi pi-check text-[10px]" aria-hidden="true" />
                  <span v-else>{{ idx + 1 }}</span>
                </div>
                <span
                  class="text-xs font-medium"
                  :style="idx === createWizardStep ? { color: 'var(--fg-default)' } : { color: 'var(--fg-subtle)' }"
                >
                  {{ t(`trackables.matterDialog.steps.${stepId}`) }}
                </span>
              </div>
              <div
                v-if="idx < createStepIds.length - 1"
                class="matter-dialog-step__line"
                :class="{ 'matter-dialog-step__line--done': idx < createWizardStep }"
              />
            </template>
          </div>

          <div class="matter-dialog-body">
            <form novalidate @submit.prevent="onCreateSubmit" @keydown="onCreateKeydown">
              <Transition :name="createStepTransitionName" mode="out-in">
                <div v-if="createWizardStep === 0" key="c-step-0" class="flex flex-col gap-5">
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

                <div v-else-if="createWizardStep === 1" key="c-step-1" class="flex flex-col gap-5">
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

                <div v-else key="c-step-2" class="flex flex-col gap-5">
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
                        <small v-if="!wizardTemplateOptions.length" class="matter-field-error">
                          {{ t('trackables.matterDialog.templateNoneHint') }}
                        </small>
                      </div>
                    </div>
                  </section>
                </div>
              </Transition>
            </form>
          </div>

          <footer class="matter-dialog-footer">
            <Button
              type="button"
              :label="t('common.cancel')"
              text
              :disabled="creating"
              @click="attemptCloseCreate"
            />
            <div class="flex items-center gap-2">
              <Button
                v-if="createWizardStep > 0"
                type="button"
                :label="t('trackables.matterDialog.actionBack')"
                icon="pi pi-arrow-left"
                severity="secondary"
                outlined
                :disabled="creating"
                @click="prevCreateStep"
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
          </footer>
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
              v-if="editingId && !editLoading"
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

        <div
          v-if="editLoading"
          class="matter-edit__loading matter-edit__loading--skeleton"
          aria-busy="true"
          aria-live="polite"
        >
          <span class="sr-only">{{ t('trackables.matterDialog.loadingSkeletonSr') }}</span>
          <div class="matter-edit-skeleton flex min-h-[min(420px,52vh)] flex-col gap-5 px-[1.35rem] pb-4 pt-2">
            <section class="flex flex-col gap-3">
              <Skeleton height="0.65rem" width="38%" border-radius="4px" class="matter-edit-skel-section-label" />
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
              </div>
            </section>
            <section class="flex flex-col gap-3">
              <Skeleton height="0.65rem" width="32%" border-radius="4px" class="matter-edit-skel-section-label" />
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
              </div>
              <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
            </section>
            <section class="flex flex-col gap-3">
              <Skeleton height="0.65rem" width="36%" border-radius="4px" class="matter-edit-skel-section-label" />
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
                <Skeleton height="2.75rem" width="100%" border-radius="0.75rem" />
              </div>
              <Skeleton height="4.5rem" width="100%" border-radius="0.75rem" />
            </section>
          </div>
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
              :disabled="!canSubmitEdit || editLoading"
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
import Paginator from 'primevue/paginator';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import DeleteTrackableDialog from '@/components/common/DeleteTrackableDialog.vue';
import UrgencyKpiChipsBar from '@/views/trackables/components/UrgencyKpiChipsBar.vue';
import MattersToolbarScopeFilters from '@/views/trackables/components/MattersToolbarScopeFilters.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import axios from 'axios';
import { apiClient } from '@/api/client';
import {
  fetchTrackablesList,
  type TrackableListingUrgency,
  type TrackableListFacets,
  type TrackableListItemDto,
  type TrackableListParams,
  type TrackableListResponse,
} from '@/api/trackables';
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
const trackableActivityDetails = ref<Record<string, TrackableActivityDetailState>>({});

const listingFacets = ref<TrackableListFacets>({
  total: 0,
  overdue: 0,
  dueToday: 0,
  dueWeek: 0,
  dueMonth: 0,
  normal: 0,
  noDeadline: 0,
});
const listingFirst = ref(0);
const listingRowsPerPage = ref(50);
let listingAbort: AbortController | null = null;

const filters = ref({
  search: '',
  status: null as string | null,
  type: null as string | null,
  assignedToId: null as string | null,
  urgency: null as TrackableListingUrgency | null,
});

/** Toolbar chip «A mí»: mismo criterio que filtrar asignado = usuario actual */
const isAssignedToMeFilter = computed(
  () => Boolean(user.value?.id && filters.value.assignedToId === user.value.id),
);

const tableSkeletonRows = Array.from({ length: 8 }, (_, i) => i);

const mattersDtRef = ref<InstanceType<typeof DataTable> | null>(null);
const mattersSearchFieldRef = ref<InstanceType<typeof IconField> | null>(null);
const filtersPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assignInlinePopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assignInlineTrackable = ref<any | null>(null);
const showAssignConfirm = ref(false);
const assignConfirmPayload = ref<{
  trackable: any;
  userId: string;
  displayName: string;
} | null>(null);
const assigningInline = ref(false);
const clientInlinePopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const clientInlineTrackable = ref<any | null>(null);
const showClientConfirm = ref(false);
const clientConfirmPayload = ref<{
  trackable: any;
  clientId: string;
  clientName: string;
} | null>(null);
const assigningClientInline = ref(false);
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

const clientsOptions = ref<Array<{ id: string; name: string; avatarUrl?: string | null }>>([]);
const users = ref<
  Array<{ id: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string | null }>
>([]);
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

function assignListPrimaryName(u: { firstName?: string; lastName?: string; email: string }) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || u.email || '';
}

function assignListSecondaryLine(u: { firstName?: string; lastName?: string; email: string }) {
  const primary = assignListPrimaryName(u);
  if (!primary || primary === u.email) return '';
  return u.email;
}

const sortedAssignableUsers = computed(() => {
  const list = [...users.value];
  list.sort((a, b) =>
    assignListPrimaryName(a).localeCompare(assignListPrimaryName(b), locale.value, {
      sensitivity: 'base',
    }),
  );
  return list;
});

const assignConfirmSubjectLine = computed(() => {
  const p = assignConfirmPayload.value;
  const title = p?.trackable?.title;
  if (title == null || String(title).trim() === '') return undefined;
  return `«${String(title)}»`;
});

const assignConfirmMessageLine = computed(() => {
  const p = assignConfirmPayload.value;
  if (!p) return '';
  return t('trackables.assignInlineConfirmMessage', { name: p.displayName });
});

const clientConfirmSubjectLine = computed(() => {
  const p = clientConfirmPayload.value;
  const title = p?.trackable?.title;
  if (title == null || String(title).trim() === '') return undefined;
  return `«${String(title)}»`;
});

const clientConfirmMessageLine = computed(() => {
  const p = clientConfirmPayload.value;
  if (!p) return '';
  return t('trackables.assignClientConfirmMessage', { name: p.clientName });
});

const sortedAssignableClients = computed(() => {
  const list = [...clientsOptions.value];
  list.sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), locale.value, {
      sensitivity: 'base',
    }),
  );
  return list;
});

const hasActiveFilters = computed(
  () =>
    Boolean(filters.value.search.trim()) ||
    Boolean(filters.value.status) ||
    Boolean(filters.value.type) ||
    Boolean(filters.value.assignedToId) ||
    Boolean(filters.value.urgency),
);

const activeFilterCount = computed(() => {
  let n = 0;
  if (filters.value.search.trim()) n += 1;
  if (filters.value.status) n += 1;
  if (filters.value.type) n += 1;
  if (filters.value.assignedToId) n += 1;
  if (filters.value.urgency) n += 1;
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
  if (f.urgency) {
    const map: Record<TrackableListingUrgency, string> = {
      overdue: t('trackables.listingChipOverdue'),
      due_today: t('trackables.listingChipDueToday'),
      due_week: t('trackables.listingChipDueWeek'),
      due_month: t('trackables.listingChipDueMonth'),
      normal: t('trackables.listingChipNormal'),
      no_deadline: t('trackables.listingChipNoDeadline'),
    };
    rows.push({
      id: 'urgency',
      label: t('trackables.activeFilterUrgency', { label: map[f.urgency] ?? f.urgency }),
      clear: () => {
        filters.value.urgency = null;
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
        urgency: null,
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
        urgency: 'overdue',
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
        urgency: null,
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
    const nearBottom =
      scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 120;
    // Paginación por cursor en footer (Paginator); sin infinite scroll append.
  };
  scrollHost.addEventListener('scroll', onScroll, { passive: true });
  mattersScrollCleanup = () => scrollHost.removeEventListener('scroll', onScroll);
}

const mattersShowSkeleton = computed(() => loading.value && trackables.value.length === 0);
const mattersShowEmptyState = computed(
  () => !loading.value && trackables.value.length === 0,
);
const mattersUseVirtualScroller = computed(
  () => totalRecords.value > 100 || trackables.value.length > 100,
);

const mattersVirtualScrollerOptions = computed(() => ({
  itemSize: tableDensity.value === 'compact' ? 72 : 104,
}));

/** Cockpit: anchura unificada de la columna principal = máximo entre filas cargadas (chips alineados). */
let matterMeasureCanvasCtx: CanvasRenderingContext2D | null = null;
function measureMatterCanvasTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 8;
  if (!matterMeasureCanvasCtx) {
    matterMeasureCanvasCtx = document.createElement('canvas').getContext('2d');
  }
  if (!matterMeasureCanvasCtx) return text.length * 8;
  matterMeasureCanvasCtx.font = font;
  return matterMeasureCanvasCtx.measureText(text).width;
}

function estimatePrimaryColumnWidthPx(row: any): number {
  const emojiCol = 40;
  const gap = 12;
  const left = emojiCol + gap;

  const key = matterCaseKey(row);
  const keySegment = key
    ? measureMatterCanvasTextWidth(key, '600 10px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace') +
      14
    : 36;

  const tagLabel = typeLabel(row.type).toLocaleUpperCase(dateLocaleTag());
  const tagSegment =
    measureMatterCanvasTextWidth(tagLabel, '600 11px Inter, system-ui, sans-serif') + 44;

  const topLine = keySegment + 8 + tagSegment;

  const title = String(row.title ?? '');
  const titleW =
    title.length > 0
      ? measureMatterCanvasTextWidth(title, '600 15px Inter, system-ui, sans-serif')
      : 0;

  const meta = matterMetaLooksIncomplete(row)
    ? t('trackables.matterMetaCockpitClientHint')
    : matterCaseKey(row)
      ? matterSubtitleLine(row)
      : matterMetaLine(row);
  const metaW = measureMatterCanvasTextWidth(meta, '400 12px Inter, system-ui, sans-serif');

  const inner = Math.max(topLine, titleW, metaW);
  return Math.ceil(left + inner + 6);
}

const matterPrimaryColumnCssVars = computed(() => {
  const rows = trackables.value;
  if (!rows.length) return undefined;
  let max = 0;
  for (const row of rows) {
    max = Math.max(max, estimatePrimaryColumnWidthPx(row));
  }
  const w = Math.min(Math.max(240, max), 920);
  return { '--matter-primary-col': `${w}px` };
});

function setTypeChip(value: string | null) {
  filters.value.type = value;
  resetAndLoad();
}

async function loadClientsForCase() {
  try {
    const { data } = await apiClient.get('/clients', { params: { limit: 500 } });
    const list = Array.isArray(data?.data) ? data.data : [];
    clientsOptions.value = list.map((cl: { id: string; name: string; avatarUrl?: string | null }) => ({
      id: cl.id,
      name: cl.name,
      avatarUrl: cl.avatarUrl ?? null,
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
const createStepDirection = ref<'forward' | 'backward'>('forward');
const createStepTransitionName = computed(() =>
  createStepDirection.value === 'forward' ? 'step-fwd' : 'step-back',
);
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
  if (createWizardStep.value < 2) {
    createStepDirection.value = 'forward';
    createWizardStep.value += 1;
  }
}

function prevCreateStep() {
  if (createWizardStep.value > 0) {
    createStepDirection.value = 'backward';
    createWizardStep.value -= 1;
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
  createStepDirection.value = 'forward';
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
  createStepDirection.value = 'forward';
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
const editCloseOnEscape = computed(
  () => !savingEdit.value && (!editIsDirty.value || editLoading.value),
);

function attemptCloseEdit() {
  if (savingEdit.value) return;
  if (editLoading.value) {
    showEditDialog.value = false;
    return;
  }
  if (editIsDirty.value && !window.confirm(t('trackables.matterDialog.actionDiscard'))) return;
  showEditDialog.value = false;
}

function onEditDialogHide() {
  if (savingEdit.value) return;
  editLoading.value = false;
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

const EXPEDIENTES_PREFS_KEY = 'alega:expedientes:prefs:v1';

onMounted(() => {
  syncScopeFromRoute();
  window.addEventListener('keydown', onGlobalSearchHotkey);
  try {
    const raw = localStorage.getItem(EXPEDIENTES_PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { density?: 'compact' | 'comfortable' };
      if (p.density === 'compact' || p.density === 'comfortable') {
        tableDensity.value = p.density;
      }
    }
  } catch {
    /* ignore */
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalSearchHotkey);
  mattersScrollCleanup?.();
});

watch(tableDensity, (d) => {
  try {
    localStorage.setItem(EXPEDIENTES_PREFS_KEY, JSON.stringify({ v: 1, density: d }));
  } catch {
    /* ignore */
  }
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

function mapListingDtoToTrackableRow(d: TrackableListItemDto) {
  const total = d.contadores.actividadesTotal;
  const done = d.contadores.actividadesHechas;
  const inProgress = Math.max(0, total - done);
  const parts = (d.asignado?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return {
    id: d.id,
    title: d.caratula,
    description: undefined,
    expedientNumber: d.codigo || undefined,
    type: d.tipo,
    matterType: d.materia,
    status: d.estado,
    assignedTo: d.asignado
      ? {
          id: d.asignado.id,
          firstName,
          lastName,
          email: '',
          avatarUrl: d.asignado.avatarUrl,
        }
      : null,
    client: d.cliente ? { id: d.cliente.id, name: d.cliente.nombre } : null,
    activitySummary: {
      total,
      done,
      inProgress,
      overdue: d.urgencia === 'overdue' ? 1 : 0,
      urgentToday: d.urgencia === 'due_today' ? 1 : 0,
      next14Days: d.urgencia === 'due_week' || d.urgencia === 'due_month' ? 1 : 0,
    },
    listingUrgency: d.urgencia,
    __listingMapped: true,
    __proximoPlazo: d.proximoPlazo,
    metadata: {},
  };
}

function onListingUrgencyChange(v: TrackableListingUrgency | null) {
  filters.value.urgency = v;
  resetAndLoad();
}

function toggleAssignedToMeFilter() {
  const uid = user.value?.id;
  if (!uid) return;
  if (filters.value.assignedToId === uid) filters.value.assignedToId = null;
  else filters.value.assignedToId = uid;
  resetAndLoad();
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => filters.value.search,
  (_q, prev) => {
    if (prev === undefined) return;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      resetAndLoad();
    }, 300);
  },
);

function listingParams(cursor?: string): TrackableListParams {
  const scope = listScope.value === 'archived' ? 'archived' : 'active';
  return {
    scope,
    search: filters.value.search.trim() || undefined,
    status:
      listScope.value === 'active' ? (filters.value.status as string | undefined) || undefined : undefined,
    tipo: filters.value.type ? [filters.value.type] : undefined,
    asignadoId: filters.value.assignedToId
      ? filters.value.assignedToId === '__unassigned__'
        ? ['__unassigned__']
        : [filters.value.assignedToId]
      : undefined,
    urgencia: filters.value.urgency || undefined,
    sortBy: 'urgency',
    cursor,
    limit: listingRowsPerPage.value,
  };
}

/** Lista paginada vía cursor: prefetch secuencial hasta la página pedida. */
async function fetchListingPage(desiredPageIndex: number) {
  if (listScope.value === 'trash') return;
  listingAbort?.abort();
  listingAbort = new AbortController();
  const signal = listingAbort.signal;
  loading.value = true;
  const rows = listingRowsPerPage.value;
  try {
    let pi = Math.max(0, desiredPageIndex);
    let cursor: string | undefined = undefined;
    let reuseChunk: TrackableListResponse | null = null;

    for (let i = 0; i < pi; i++) {
      const chunk = await fetchTrackablesList(listingParams(cursor), signal);
      totalRecords.value = chunk.totalCount ?? totalRecords.value;
      const nc = chunk.nextCursor ?? undefined;
      if (!nc) {
        pi = i;
        reuseChunk = chunk;
        break;
      }
      cursor = nc;
    }

    let data: TrackableListResponse;
    if (reuseChunk) {
      data = reuseChunk;
    } else {
      data = await fetchTrackablesList(listingParams(pi === 0 ? undefined : cursor), signal);
    }

    totalRecords.value = data.totalCount ?? 0;
    if (data.facets) listingFacets.value = data.facets;
    const mapped = (data.items ?? []).map(mapListingDtoToTrackableRow);
    trackables.value = mapped;
    listingFirst.value = pi * rows;
    void hydrateVisibleTrackableActivities(mapped);
  } catch (e) {
    if (!axios.isCancel(e)) {
      toast.add({ severity: 'error', summary: t('trackables.listingLoadError'), life: 4000 });
    }
  } finally {
    loading.value = false;
  }
}

async function resetAndLoad() {
  listingFirst.value = 0;
  await fetchListingPage(0);
}

function onListingPaginatorPage(event: { first: number; rows: number }) {
  if (event.rows !== listingRowsPerPage.value) {
    listingRowsPerPage.value = event.rows;
    listingFirst.value = 0;
    void fetchListingPage(0);
    return;
  }
  listingFirst.value = event.first;
  void fetchListingPage(Math.floor(event.first / event.rows));
}

function clearFilters() {
  filters.value = {
    search: '',
    status: null,
    type: null,
    assignedToId: null,
    urgency: null,
  };
  resetAndLoad();
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
  if (row.__listingMapped && row.activitySummary) {
    const pz = row.__proximoPlazo as { fecha: string; tipo?: string } | null | undefined;
    trackableActivityDetails.value = {
      ...trackableActivityDetails.value,
      [id]: {
        loading: false,
        error: false,
        data: {
          summary: {
            done: row.activitySummary.done ?? 0,
            inProgress: row.activitySummary.inProgress ?? 0,
            overdue: row.activitySummary.overdue ?? 0,
            total: row.activitySummary.total ?? 0,
            urgentToday: row.activitySummary.urgentToday ?? 0,
            next14Days: row.activitySummary.next14Days ?? 0,
          },
          nextDue: pz?.fecha
            ? {
                id: `listing:${id}`,
                title: pz.tipo || t('trackables.tableColDue'),
                dueDate: pz.fecha,
              }
            : null,
        },
      },
    };
    return;
  }
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
  return Math.min(100, Math.round((summary.done / summary.total) * 100));
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

function matterMetaLooksIncomplete(row: any): boolean {
  const text = matterCaseKey(row) ? matterSubtitleLine(row) : matterMetaLine(row);
  return text === t('trackables.matterMetaFallback');
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

function matterRowClass(data: any) {
  const u = data?.listingUrgency as TrackableListingUrgency | undefined;
  const parts = ['matter-datatable-row'];
  if (u) parts.push(`matter-row--urg-${u}`);
  return parts.join(' ');
}

function closeCreateDialog() {
  showCreateDialog.value = false;
  createWizardStep.value = 0;
  createStepDirection.value = 'forward';
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
    await resetAndLoad();
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
    await resetAndLoad();
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
    await resetAndLoad();
  } catch {
    toast.add({ severity: 'error', summary: t('trackables.reactivateToastError'), life: 3000 });
  } finally {
    reactivatingConfirm.value = false;
  }
}

function openAssignInlinePopover(e: Event, row: any) {
  if (!canTrackableUpdate.value) return;
  assignInlineTrackable.value = row;
  void loadUsers();
  assignInlinePopoverRef.value?.toggle(e);
}

function requestAssignConfirm(u: {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string | null;
}) {
  assignInlinePopoverRef.value?.hide?.();
  const row = assignInlineTrackable.value;
  assignInlineTrackable.value = null;
  if (!row?.id) return;
  assignConfirmPayload.value = {
    trackable: row,
    userId: u.id,
    displayName: assignListPrimaryName(u) || u.email,
  };
  showAssignConfirm.value = true;
}

function onAssignConfirmHide() {
  if (!assigningInline.value) assignConfirmPayload.value = null;
}

async function confirmAssignInline() {
  const p = assignConfirmPayload.value;
  if (!p?.trackable?.id) return;
  assigningInline.value = true;
  try {
    await apiClient.patch(`/trackables/${p.trackable.id}`, { assignedToId: p.userId });
    toast.add({
      severity: 'success',
      summary: t('trackables.assignInlineToastSuccess'),
      life: 3000,
    });
    showAssignConfirm.value = false;
    assignConfirmPayload.value = null;
    await resetAndLoad();
  } catch {
    toast.add({
      severity: 'error',
      summary: t('trackables.assignInlineToastError'),
      life: 4000,
    });
  } finally {
    assigningInline.value = false;
  }
}

function openClientInlinePopover(e: Event, row: any) {
  if (!canTrackableUpdate.value) return;
  clientInlineTrackable.value = row;
  void loadClientsForCase();
  clientInlinePopoverRef.value?.toggle(e);
}

function requestClientConfirm(c: { id: string; name: string; avatarUrl?: string | null }) {
  clientInlinePopoverRef.value?.hide?.();
  const row = clientInlineTrackable.value;
  clientInlineTrackable.value = null;
  if (!row?.id) return;
  clientConfirmPayload.value = {
    trackable: row,
    clientId: c.id,
    clientName: c.name,
  };
  showClientConfirm.value = true;
}

function onClientConfirmHide() {
  if (!assigningClientInline.value) clientConfirmPayload.value = null;
}

async function confirmAssignClientInline() {
  const p = clientConfirmPayload.value;
  if (!p?.trackable?.id) return;
  assigningClientInline.value = true;
  try {
    await apiClient.patch(`/trackables/${p.trackable.id}`, { clientId: p.clientId });
    toast.add({
      severity: 'success',
      summary: t('trackables.assignClientToastSuccess'),
      life: 3000,
    });
    showClientConfirm.value = false;
    clientConfirmPayload.value = null;
    await resetAndLoad();
  } catch {
    toast.add({
      severity: 'error',
      summary: t('trackables.assignClientToastError'),
      life: 4000,
    });
  } finally {
    assigningClientInline.value = false;
  }
}

async function openEditDialog(row: any) {
  if (!canTrackableUpdate.value) return;
  editingId.value = row.id;
  showEditDialog.value = true;
  editLoading.value = true;
  try {
    const { data } = await apiClient.get(`/trackables/${row.id}`);
    if (!showEditDialog.value || editingId.value !== row.id) return;
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
    await resetAndLoad();
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
  void resetAndLoad();
}

watch(
  [authReady, canTrackableRead, listScope],
  ([ready, read, scope], prev) => {
    if (!ready || !read) return;
    const prevScope = prev?.[2] as ListScope | undefined;
    if (scope !== 'trash' && prevScope !== undefined && prevScope !== scope) {
      trackables.value = [];
      totalRecords.value = 0;
      listingFacets.value = {
        total: 0,
        overdue: 0,
        dueToday: 0,
        dueWeek: 0,
        dueMonth: 0,
        normal: 0,
        noDeadline: 0,
      };
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
    void resetAndLoad();
  },
  { immediate: true },
);

watch(listScope, (scope) => {
  if (scope !== 'trash') {
    filters.value.status = null;
  }
  if (scope !== 'active') {
    filters.value.urgency = null;
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
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}
@media (min-width: 1024px) {
  .activity-stats {
    width: fit-content;
    max-width: 100%;
    justify-content: flex-start;
  }
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
/** VENCIDAS en 0: mismo chip, tono neutro (sin alerta). */
.activity-stat--overdue-zero {
  --stat-accent: rgb(148 163 184);
  border-color: color-mix(in srgb, var(--surface-border) 96%, transparent);
  background: color-mix(in srgb, var(--surface-sunken) 65%, var(--surface-raised));
  opacity: 0.95;
}
.activity-stat--overdue-zero .activity-stat__icon {
  background: color-mix(in srgb, var(--fg-muted) 12%, var(--surface-raised));
  color: var(--fg-muted);
}
.activity-stat--overdue-zero .activity-stat__value {
  color: var(--fg-muted);
  font-weight: 600;
}
.activity-stat--overdue-zero .activity-stat__label {
  color: var(--fg-subtle);
}
:global(.dark) .activity-stat--overdue-zero {
  border-color: color-mix(in srgb, var(--surface-border) 88%, transparent);
  background: color-mix(in srgb, var(--surface-sunken) 55%, transparent);
}
:global(.dark) .activity-stat--overdue-zero .activity-stat__value {
  color: var(--fg-muted);
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
.matters-data-table--cockpit {
  min-width: 640px;
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
/* Info cell: expand to fill remaining space */
.matters-data-table--cockpit :deep(th.matter-col-info),
.matters-data-table--cockpit :deep(td.matter-col-info) {
  width: 100%;
  min-width: 280px;
}
/* Assignee: slim — only avatar (no text) */
.matters-data-table--cockpit :deep(th.matter-col-assignee),
.matters-data-table--cockpit :deep(td.matter-col-assignee) {
  width: 3rem;
  min-width: 3rem;
  max-width: 3rem;
  text-align: center;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

/* Expediente ausente: mismo lenguaje que avatar sin asignar (borde punteado + acción en edición) */
.matter-expediente-ring:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 55%, var(--surface-border));
  outline-offset: 2px;
}
.matter-meta-incomplete {
  width: fit-content;
  max-width: 100%;
  padding: 0.28rem 0.55rem;
  border-radius: 0.5rem;
  border: 1px dashed color-mix(in srgb, var(--fg-subtle) 42%, var(--surface-border));
  background: color-mix(in srgb, var(--surface-sunken) 82%, transparent);
}
/** Lista cockpit: hint incompleto más liviano (una línea; detalle en tooltip / aria). */
.matter-meta-incomplete--cockpit {
  padding: 0.125rem 0.4rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  line-height: 1.25;
}
.matter-meta-incomplete--action {
  cursor: pointer;
  appearance: none;
  border-style: dashed;
}
.matter-meta-incomplete--action:not(.matter-meta-incomplete--cockpit) {
  font: inherit;
}
@media (hover: hover) {
  .matter-meta-incomplete--action:hover {
    border-color: color-mix(in srgb, var(--accent) 38%, var(--surface-border));
    background: color-mix(in srgb, var(--accent-soft) 42%, var(--surface-sunken));
    color: var(--fg-muted);
  }
}
.matter-meta-incomplete--action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 55%, var(--surface-border));
  outline-offset: 2px;
}
@media (hover: hover) {
  .matters-data-table :deep(.p-datatable-tbody > tr:hover) {
    background: color-mix(in srgb, var(--accent-soft) 50%, var(--surface-raised));
  }
  .trash-data-table :deep(.p-datatable-tbody > tr:hover) {
    background: color-mix(in srgb, var(--accent-soft) 45%, var(--surface-raised));
  }
}

.matters-data-table :deep(.p-datatable-tbody > tr.matter-row--urg-overdue) {
  border-left: 3px solid #dc2626;
}
.matters-data-table :deep(.p-datatable-tbody > tr.matter-row--urg-due_today) {
  border-left: 3px solid #d97706;
}
.matters-data-table :deep(.p-datatable-tbody > tr.matter-row--urg-due_week) {
  border-left: 3px solid #ca8a04;
}
.matters-data-table :deep(.p-datatable-tbody > tr.matter-row--urg-due_month) {
  border-left: 3px solid #0f766e;
}
.matters-data-table :deep(.p-datatable-tbody > tr.matter-row--urg-normal) {
  border-left: 3px solid color-mix(in srgb, var(--brand-zafiro) 55%, var(--surface-border));
}
.matters-data-table :deep(.p-datatable-tbody > tr.matter-row--urg-no_deadline) {
  border-left: 3px solid var(--fg-subtle);
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

/* —— Create wizard (horizontal stepper) —— */
.matter-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--brand-zafiro) 7%, transparent),
    transparent 90%
  );
}
html.dark .matter-dialog-header {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent) 18%, transparent),
    transparent 90%
  );
}
.matter-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
}
.matter-dialog-eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow {
  color: var(--accent);
}
.matter-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--fg-default);
  margin: 0;
}
.matter-dialog-stephint {
  font-size: 0.8125rem;
  color: var(--fg-muted);
  margin: 0;
}
.dialog-close-btn {
  flex-shrink: 0;
  height: 2rem;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--fg-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.dialog-close-btn:hover {
  background: var(--surface-sunken);
}

.matter-dialog-steps {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  flex-shrink: 0;
}
.matter-dialog-step__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--surface-border);
  color: var(--fg-subtle);
  transition: background-color 220ms ease, color 220ms ease;
}
.matter-dialog-step__circle--active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.matter-dialog-step__circle--done {
  background: #10b981;
  color: #fff;
}
.matter-dialog-step__line {
  flex: 1;
  min-width: 16px;
  height: 1px;
  background: var(--surface-border);
  transition: background-color 220ms ease;
}
.matter-dialog-step__line--done {
  background: #10b981;
}

.matter-dialog-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.matter-dialog-body > * {
  height: 100%;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

.matter-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  flex-shrink: 0;
}

/* Directional step transitions */
.step-fwd-enter-active,
.step-fwd-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 240ms ease-out, transform 240ms ease-out;
  will-change: opacity, transform;
}
.step-fwd-enter-from {
  opacity: 0;
  transform: translateX(28px);
}
.step-fwd-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}
.step-back-leave-to {
  opacity: 0;
  transform: translateX(28px);
}
@media (prefers-reduced-motion: reduce) {
  .step-fwd-enter-active,
  .step-fwd-leave-active,
  .step-back-enter-active,
  .step-back-leave-active {
    transition: opacity 120ms ease-out;
  }
  .step-fwd-enter-from,
  .step-fwd-leave-to,
  .step-back-enter-from,
  .step-back-leave-to {
    transform: none;
  }
}

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
.matter-edit__close:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--surface-border));
  color: var(--fg-default);
}
.matter-edit__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  min-height: min(420px, 52vh);
}
.matter-edit__loading--skeleton :deep(.p-skeleton) {
  background: color-mix(in srgb, var(--surface-border) 55%, var(--surface-sunken));
}
.matter-edit-skel-section-label :deep(.p-skeleton) {
  opacity: 0.85;
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
.font-mono-num {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: 0.01em;
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
  .matter-dialog-shell {
    max-height: 92vh;
  }
  .matter-dialog-header {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .matter-dialog-body > * {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .matter-dialog-footer {
    padding-left: 1rem;
    padding-right: 1rem;
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
