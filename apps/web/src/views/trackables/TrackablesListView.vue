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
          class="alega-btn-cta-brand border-0"
          :label="t('trackables.newMatter')"
          icon="pi pi-plus"
          size="small"
          @click="showCreateDialog = true"
        />
      </template>
    </PageHeader>

    <template v-if="listScope === 'trash'">
      <template v-if="!canDocRead">
        <div class="app-card overflow-hidden">
          <div
            class="matters-workbench-scope flex min-h-[2.75rem] items-stretch border-b border-[var(--surface-border)]"
            style="background: color-mix(in srgb, var(--surface-sunken) 88%, var(--surface-raised));"
          >
            <SelectButton
              v-model="listScope"
              :options="scopeOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              class="matters-workbench-scope-tabs scope-tabs flex-1 min-w-0"
              :aria-label="t('trackables.workbenchScopeAria')"
            />
          </div>
          <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
            <i class="pi pi-lock text-4xl opacity-60" />
            <p>{{ t('trackables.trashNoPermission') }}</p>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="app-card overflow-hidden">
          <div
            class="matters-workbench-scope flex min-h-[2.75rem] items-stretch border-b border-[var(--surface-border)]"
            style="background: color-mix(in srgb, var(--surface-sunken) 88%, var(--surface-raised));"
          >
            <SelectButton
              v-model="listScope"
              :options="scopeOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              class="matters-workbench-scope-tabs scope-tabs flex-1 min-w-0"
              :aria-label="t('trackables.workbenchScopeAria')"
            />
          </div>
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
    <div class="exp21">
      <div class="app-card wb-card">
        <div class="wb-toolbar" role="toolbar" :aria-label="t('trackables.toolbarCommandBarAria')">
          <div class="wb-toolbar__primary">
            <SelectButton
              v-model="listScope"
              :options="scopeOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              size="small"
              :aria-label="t('trackables.workbenchScopeAria')"
              class="wb-scope-select"
            />
          </div>

          <div class="wb-toolbar__row wb-toolbar__row--main">
            <IconField class="wb-search">
              <InputIcon class="pi pi-search" />
              <InputText
                ref="toolbarSearchInputRef"
                v-model="filters.search"
                size="small"
                name="matters-toolbar-search"
                autocomplete="off"
                :placeholder="t('trackables.toolbarSearchPlaceholder')"
                :aria-label="t('common.search')"
              />
            </IconField>

            <div class="wb-signals" :aria-label="t('trackables.signalFiltersAria')">
              <button
                v-for="f in workbenchSignalFilters"
                :key="f.key"
                type="button"
                class="wb-signal"
                :class="{ 'wb-signal--active': activeWorkbenchSignals.includes(f.key) }"
                :style="{ '--sa': f.accent } as Record<string, string>"
                :aria-pressed="activeWorkbenchSignals.includes(f.key)"
                @click="toggleWorkbenchSignal(f.key)"
              >
                <i :class="f.icon" aria-hidden="true" />
                {{ f.label }}
              </button>

              <CalendarFilterTrigger
                :a11y-label="t('trackables.assigneeFilterPlaceholder')"
                :label="t('trackables.assigneeFilterShortLabel')"
                icon="pi pi-user-plus"
                :active="assigneeFilters.length > 0"
                :expanded="assigneeToolbarPopoverOpen"
                @toggle="(e) => assigneeToolbarPopoverRef?.toggle(e)"
              >
                <AvatarGroup v-if="assigneeTriggerAvatars.length > 0" class="wb-filter-avatar-group">
                  <Avatar
                    v-for="av in assigneeTriggerAvatars"
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
                    v-if="assigneeTriggerOverflow > 0"
                    :label="`+${assigneeTriggerOverflow}`"
                    shape="circle"
                    size="small"
                    class="wb-filter-avatar"
                    :style="{
                      background: 'var(--surface-sunken)',
                      color: 'var(--fg-muted)',
                      border: '1px solid var(--surface-border)',
                    }"
                    :aria-label="assigneeTriggerOverflowTooltip"
                    v-tooltip.top="assigneeTriggerOverflowTooltip"
                  />
                </AvatarGroup>
                <AvatarGroup v-else-if="assigneeFilters.includes('__unassigned__')" class="wb-filter-avatar-group">
                  <Avatar
                    label="SA"
                    shape="circle"
                    size="small"
                    class="wb-filter-avatar"
                    :style="{
                      background: 'var(--surface-sunken)',
                      color: 'var(--fg-muted)',
                      border: '1px dashed var(--surface-border)',
                    }"
                    :aria-label="t('trackables.unassigned')"
                    v-tooltip.top="t('trackables.unassigned')"
                  />
                </AvatarGroup>
                <div v-else class="cal-filter-trigger-empty" aria-hidden="true">
                  <i class="pi pi-user-plus" />
                </div>
              </CalendarFilterTrigger>

              <Popover
                ref="assigneeToolbarPopoverRef"
                class="wb-assignee-pop"
                @show="assigneeToolbarPopoverOpen = true"
                @hide="assigneeToolbarPopoverOpen = false"
              >
                <div class="wb-assignee-pop__header">
                  <p>{{ t('trackables.assigneePopoverHeader') }}</p>
                  <button
                    v-if="assigneeFilters.length > 0"
                    type="button"
                    class="wb-assignee-pop__clear"
                    @click="clearAssigneeFiltersOnly"
                  >
                    {{ t('trackables.clearFilters') }}
                  </button>
                </div>
                <ul class="wb-assignee-pop__list" :aria-label="t('trackables.assigneeFilterPlaceholder')">
                  <template v-for="opt in workbenchAssigneeOptions" :key="opt.id">
                    <li v-if="opt.isDivider" class="wb-assignee-pop__divider" aria-hidden="true" />
                    <li v-else>
                      <label
                        :for="`wb-af-${opt.id}`"
                        class="wb-assignee-pop__item"
                        :class="{ 'wb-assignee-pop__item--mine': opt.isMine }"
                      >
                        <Checkbox
                          :model-value="assigneeFilters.includes(opt.id)"
                          binary
                          :input-id="`wb-af-${opt.id}`"
                          @update:model-value="toggleAssigneeFilter(opt.id)"
                        />
                        <span
                          v-if="opt.isMine"
                          class="wb-assignee-pop__avatar wb-assignee-pop__avatar--mine"
                          :style="{ background: opt.avatarColor }"
                          aria-hidden="true"
                        >
                          {{ opt.initials }}
                          <span class="wb-assignee-pop__me-badge">{{ t('trackables.assigneeMeBadge') }}</span>
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

              <button
                v-if="hasActiveFilters"
                type="button"
                class="wb-signal wb-signal--reset"
                @click="clearFilters"
              >
                <i class="pi pi-filter-slash" aria-hidden="true" />
                {{ t('trackables.clearFilters') }}
              </button>
            </div>

            <span class="wb-count" aria-live="polite" aria-atomic="true">
              {{ totalRecords }}
              {{
                totalRecords === 1
                  ? t('trackables.toolbarMattersCountSingular')
                  : t('trackables.toolbarMattersCountPlural')
              }}
            </span>
          </div>
        </div>

        <div
          v-if="mattersShowSkeleton"
          class="wb-skeleton flex-1 min-h-0 overflow-hidden"
          aria-live="polite"
          :aria-label="t('trackables.loadingTable')"
        >
          <div
            v-for="n in tableSkeletonRows"
            :key="`wb-sk-${n}`"
            class="wb-skeleton__row"
            :class="{ 'wb-skeleton__row--no-actions': !rowHasTrackableActions }"
          >
            <div class="wb-skeleton__col wb-skeleton__col--main">
              <Skeleton shape="circle" size="2rem" />
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton height="0.75rem" width="60%" />
                <Skeleton height="0.65rem" width="42%" />
              </div>
            </div>
            <Skeleton height="0.75rem" width="9rem" />
            <Skeleton height="1.2rem" width="6.5rem" border-radius="999px" />
            <div class="wb-assignee">
              <Skeleton shape="circle" size="1.75rem" />
              <Skeleton height="0.65rem" width="4rem" />
            </div>
            <div v-if="rowHasTrackableActions" class="flex gap-1">
              <Skeleton shape="circle" size="1.75rem" />
              <Skeleton shape="circle" size="1.75rem" />
              <Skeleton shape="circle" size="1.75rem" />
            </div>
          </div>
        </div>

        <div
          v-else-if="mattersShowEmptyState"
          class="wb-empty wb-empty--standalone flex-1 min-h-0"
        >
          <i class="pi pi-folder-open" aria-hidden="true" />
          <h3>{{ t('trackables.tableEmptyTitle') }}</h3>
          <p>
            {{
              listScope === 'archived'
                ? t('trackables.tableEmptyArchived')
                : t('trackables.tableEmptyActive')
            }}
          </p>
          <Button
            v-if="hasActiveFilters"
            :label="t('trackables.clearFilters')"
            icon="pi pi-filter-slash"
            size="small"
            outlined
            severity="secondary"
            @click="clearFilters"
          />
        </div>

        <div
          v-else
          class="matters-dt-region relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden"
          :class="{ 'matters-dt-region--scrolled': mattersDtScrolled }"
        >
          <DataTable
            ref="mattersDtRef"
            :value="trackables"
            :loading="loading"
            data-key="id"
            size="small"
            scrollable
            scroll-height="flex"
            row-hover
            responsive-layout="scroll"
            :row-class="wbRowClass"
            export-filename="expedientes"
            class="wb-table flex-1 min-h-0"
            :table-props="{ 'aria-label': t('trackables.tableAriaLabel') }"
          >
            <template #empty>
              <div v-if="!loading" class="wb-empty">
                <i class="pi pi-folder-open" aria-hidden="true" />
                <h3>{{ t('trackables.tableEmptyTitle') }}</h3>
                <p>
                  {{
                    listScope === 'archived'
                      ? t('trackables.tableEmptyArchived')
                      : t('trackables.tableEmptyActive')
                  }}
                </p>
              </div>
            </template>

            <Column
              field="title"
              :header="t('trackables.tableColTitle')"
              header-class="wb-col-matter"
              body-class="wb-col-matter align-top"
            >
              <template #body="{ data }">
                <div class="wb-matter">
                  <span class="sr-only">{{ t('trackables.matterRowInfoSr') }}</span>
                  <span class="wb-matter__emoji" aria-hidden="true">{{ matterEmoji(data) }}</span>
                  <div class="wb-matter__copy">
                    <div class="wb-matter__topline">
                      <span v-if="matterCaseKey(data)" class="wb-case" translate="no">{{ matterCaseKey(data) }}</span>
                      <button
                        v-else-if="canTrackableUpdate"
                        type="button"
                        class="matters-wb-expediente-ring"
                        :aria-label="t('trackables.assignExpedienteHint')"
                        v-tooltip.top="t('trackables.assignExpedienteHint')"
                        @click="openEditDialog(data)"
                      >
                        <i class="pi pi-hashtag text-[11px]" aria-hidden="true" />
                      </button>
                      <span v-else class="matters-wb-expediente-ring matters-wb-expediente-ring--readonly" aria-hidden="true">
                        <i class="pi pi-hashtag text-[11px] opacity-70" aria-hidden="true" />
                      </span>
                      <span class="wb-chip">{{ typeLabel(data.type).toLocaleUpperCase(dateLocaleTag()) }}</span>
                      <span v-if="matterStageChip(data)" class="wb-chip wb-chip--stage">{{ matterStageChip(data) }}</span>
                      <span
                        v-if="listingRowShowsSinoeHint(data)"
                        class="wb-chip wb-chip--sinoe"
                        :title="t('trackables.sinoeChipTitle')"
                      >SINOE</span>
                    </div>
                    <router-link :to="`/trackables/${data.id}`" class="wb-matter__title">
                      <span class="line-clamp-1">{{ data.title }}</span>
                    </router-link>
                    <p class="wb-matter__client">
                      <i class="pi pi-building" aria-hidden="true" />
                      <button
                        v-if="matterMetaLooksIncomplete(data) && canTrackableUpdate"
                        type="button"
                        class="matters-wb-matter__client-btn"
                        :aria-label="t('trackables.assignClientPopoverTitle')"
                        v-tooltip.top="t('trackables.assignClientPopoverHint')"
                        @click="(e) => openClientInlinePopover(e, data)"
                      >
                        {{ t('trackables.matterMetaCockpitClientHint') }}
                      </button>
                      <span v-else-if="matterMetaLooksIncomplete(data)">{{
                        t('trackables.matterMetaCockpitClientHint')
                      }}</span>
                      <span v-else>{{ data.client?.name ?? t('trackables.matterMetaCockpitClientHint') }}</span>
                    </p>
                  </div>
                </div>
              </template>
            </Column>

            <Column
              :header="t('trackables.tableColTodo')"
              body-class="wb-col-action align-top"
              style="width: 13rem;"
            >
              <template #body="{ data }">
                <div class="wb-actions-cell" role="list" :aria-label="t('trackables.tableColTodo')">
                  <router-link
                    v-for="task in matterRowPendingTasks(data).slice(0, MAX_MATTER_TASK_ROWS)"
                    :key="task.id"
                    role="listitem"
                    class="wb-action-stat"
                    :to="matterPendingActionTo(data, task)"
                    v-tooltip.top="task.tooltip"
                  >
                    <i
                      :class="task.icon"
                      class="wb-action-stat__icon shrink-0 text-[11px]"
                      :style="{ color: task.accent }"
                      aria-hidden="true"
                    />
                    <span class="wb-action-stat__label">{{ task.label }}</span>
                    <i class="pi pi-angle-right wb-action-stat__go shrink-0 text-[10px]" aria-hidden="true" />
                  </router-link>
                  <span
                    v-if="matterRowPendingTasks(data).length > MAX_MATTER_TASK_ROWS"
                    class="wb-action-overflow"
                    v-tooltip.top="
                      matterRowPendingTasks(data)
                        .slice(MAX_MATTER_TASK_ROWS)
                        .map((x) => x.label)
                        .join(' · ')
                    "
                  >
                    +{{ matterRowPendingTasks(data).length - MAX_MATTER_TASK_ROWS }}
                  </span>
                </div>
              </template>
            </Column>

            <Column
              :header="t('trackables.tableColDue')"
              body-class="wb-col-deadline align-middle"
              style="width: 8.5rem;"
            >
              <template #body="{ data }">
                <Tag
                  :value="matterDeadlineCell(data).label"
                  :severity="matterDeadlineCell(data).severity"
                  class="wb-deadline-tag"
                  v-tooltip.top="matterDeadlineCell(data).label"
                />
              </template>
            </Column>

            <Column
              :header="t('trackables.tableColInvolved')"
              body-class="wb-col-assignee align-middle"
              style="width: 10rem;"
            >
              <template #body="{ data }">
                <div class="wb-involved">
                  <template v-if="!data.assignedTo">
                    <button
                      v-if="canTrackableUpdate"
                      type="button"
                      class="wb-avatar-primary wb-avatar-primary--empty"
                      :aria-label="t('trackables.assignInlineCta')"
                      v-tooltip.right="t('trackables.assignInlineCta')"
                      @click="(e) => openAssignInlinePopover(e, data)"
                    >
                      <i class="pi pi-user-plus" aria-hidden="true" />
                    </button>
                    <span
                      v-else
                      class="wb-avatar-primary wb-avatar-primary--empty"
                      :aria-label="t('trackables.unassigned')"
                      v-tooltip.right="t('trackables.unassigned')"
                    >
                      <i class="pi pi-user" aria-hidden="true" />
                    </span>
                    <div class="wb-involved__copy">
                      <span class="wb-involved__name wb-involved__name--empty">{{ t('trackables.unassigned') }}</span>
                      <span class="wb-involved__role">{{ t('trackables.matterInvolvedPrimaryRole') }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="wb-inv-stack">
                      <img
                        v-if="data.assignedTo.avatarUrl"
                        :src="data.assignedTo.avatarUrl"
                        :alt="assignedToName(data.assignedTo)"
                        class="wb-avatar-primary wb-avatar-primary--img"
                        v-tooltip.right="`${assignedToName(data.assignedTo)} · ${t('trackables.matterInvolvedPrimaryRole')}`"
                      />
                      <span
                        v-else
                        class="wb-avatar-primary"
                        :style="{ background: assigneeAvatarBg(data.assignedTo.id) }"
                        :aria-label="`${assignedToName(data.assignedTo)} – ${t('trackables.matterInvolvedPrimaryRole')}`"
                        v-tooltip.right="`${assignedToName(data.assignedTo)} · ${t('trackables.matterInvolvedPrimaryRole')}`"
                      >
                        {{ assigneeInitials(data.assignedTo) }}
                      </span>
                    </div>
                    <div class="wb-involved__copy">
                      <span class="wb-involved__name">{{ assignedToName(data.assignedTo) }}</span>
                      <span class="wb-involved__role">{{ t('trackables.matterInvolvedPrimaryRole') }}</span>
                    </div>
                  </template>
                </div>
              </template>
            </Column>

            <Column
              v-if="rowHasTrackableActions"
              :header="t('common.actions')"
              header-class="wb-actions-header"
              body-class="wb-col-actions align-middle"
              style="width: 8rem;"
            >
              <template #body="{ data }">
                <div class="wb-row-actions" role="group" :aria-label="t('common.actions')">
                  <Button
                    v-if="canTrackableUpdate"
                    type="button"
                    icon="pi pi-pencil"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="secondary"
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
                    size="small"
                    severity="warn"
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
                    size="small"
                    severity="success"
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
                    size="small"
                    severity="danger"
                    :aria-label="t('trackables.tooltipOpenDelete')"
                    v-tooltip.top="t('trackables.tooltipOpenDelete')"
                    @click="openDeleteWizard(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <div v-if="!mattersShowSkeleton && totalRecords > 0" class="wb-footer">
          <Paginator
            :first="listingFirst"
            :rows="listingRowsPerPage"
            :total-records="totalRecords"
            :rows-per-page-options="[25, 50, 100]"
            :current-page-report-template="t('trackables.tablePageReport')"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            @page="onListingPaginatorPage"
          />
        </div>
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
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
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
import Popover from 'primevue/popover';
import Paginator from 'primevue/paginator';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Checkbox from 'primevue/checkbox';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import CalendarFilterTrigger from '@/views/calendar/components/CalendarFilterTrigger.vue';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import DeleteTrackableDialog from '@/components/common/DeleteTrackableDialog.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { hashAvatarColor } from '@/utils/avatarColor';
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
});

/** Una sola vez: expedientes activos abren filtrados por el usuario actual (mesa v2.1). */
const assigneeMineBootstrapped = ref(false);

type WorkbenchSignalKey = 'decision' | 'sinoe' | 'hearing';

const activeWorkbenchSignals = ref<WorkbenchSignalKey[]>([]);
const assigneeFilters = ref<string[]>([]);
const assigneeToolbarPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assigneeToolbarPopoverOpen = ref(false);

const MAX_MATTER_TASK_ROWS = 3;

interface MatterPendingTaskRow {
  id: string;
  label: string;
  tooltip: string;
  icon: string;
  accent: string;
  tab: 0 | 1;
}

const tableSkeletonRows = Array.from({ length: 8 }, (_, i) => i);

const mattersDtRef = ref<InstanceType<typeof DataTable> | null>(null);
const toolbarSearchInputRef = ref<InstanceType<typeof InputText> | null>(null);
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
const mattersDtScrolled = ref(false);
let mattersScrollCleanup: (() => void) | undefined;

const listScope = ref<ListScope>(
  route.query.scope === 'trash' ? 'trash' : 'active',
);

const typeOptions = ['case', 'process', 'project', 'audit'];
const typeSelectOptions = computed(() =>
  typeOptions.map((value) => ({ value, label: t(`trackables.types.${value}`) })),
);
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

interface WorkbenchAssigneeOption {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  isMine?: boolean;
  isUnassigned?: boolean;
  isDivider?: boolean;
}

const workbenchAssigneeOptions = computed((): WorkbenchAssigneeOption[] => {
  const uid = user.value?.id ?? '';
  const cu = users.value.find((u) => u.id === uid);
  const mineName = cu ? assignListPrimaryName(cu) || cu.email : t('trackables.assigneeMineOption');
  const mineInitials = cu ? initialsFromLabel(mineName) : 'Yo';
  return [
    {
      id: '__mine',
      name: t('trackables.assigneeMineOption'),
      initials: mineInitials,
      avatarColor: assigneeAvatarBg(uid || 'me'),
      isMine: true,
    },
    { id: '__d1', name: '', initials: '', avatarColor: '', isDivider: true },
    ...users.value.map((u) => {
      const nm = assignListPrimaryName(u) || u.email;
      return {
        id: u.id,
        name: nm,
        initials: initialsFromLabel(nm),
        avatarColor: hashAvatarColor(nm),
      };
    }),
    { id: '__d2', name: '', initials: '', avatarColor: '', isDivider: true },
    {
      id: '__unassigned__',
      name: t('trackables.unassigned'),
      initials: 'SA',
      avatarColor: '',
      isUnassigned: true,
    },
  ];
});

const workbenchSignalFilters = computed(() => [
  {
    key: 'decision' as const,
    label: t('trackables.signalDecision'),
    icon: 'pi pi-exclamation-circle',
    accent: '#dc2626',
  },
  {
    key: 'sinoe' as const,
    label: t('trackables.signalSinoe'),
    icon: 'pi pi-inbox',
    accent: '#7c3aed',
  },
  {
    key: 'hearing' as const,
    label: t('trackables.signalHearing'),
    icon: 'pi pi-calendar',
    accent: '#0e7490',
  },
]);

const MAX_TRIGGER_AVATARS = 3;

const assigneeTriggerAvatars = computed(() =>
  assigneeFilters.value
    .filter((id) => id !== '__unassigned__')
    .map((id): { initials: string; color: string; name: string } | null => {
      if (id === '__mine') {
        const uid = user.value?.id;
        const cu = uid ? users.value.find((m) => m.id === uid) : undefined;
        const nm = cu ? assignListPrimaryName(cu) || cu.email : t('trackables.assigneeMineOption');
        return {
          initials: cu ? initialsFromLabel(nm) : 'Yo',
          color: assigneeAvatarBg(uid ?? 'me'),
          name: t('trackables.assigneeMineOption'),
        };
      }
      const u = users.value.find((m) => m.id === id);
      if (!u) return null;
      const nm = assignListPrimaryName(u) || u.email;
      return { initials: initialsFromLabel(nm), color: hashAvatarColor(nm), name: nm };
    })
    .filter((x): x is { initials: string; color: string; name: string } => x !== null)
    .slice(0, MAX_TRIGGER_AVATARS),
);

const assigneeTriggerOverflow = computed(() =>
  Math.max(0, assigneeFilters.value.filter((id) => id !== '__unassigned__').length - MAX_TRIGGER_AVATARS),
);

const assigneeTriggerOverflowTooltip = computed(() =>
  assigneeFilters.value
    .filter((id) => id !== '__unassigned__')
    .slice(MAX_TRIGGER_AVATARS)
    .map((id) => {
      if (id === '__mine') return t('trackables.assigneeMineOption');
      return users.value.find((u) => u.id === id)?.email ?? id;
    })
    .join(', '),
);

function toggleAssigneeFilter(id: string) {
  const next = new Set(assigneeFilters.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  assigneeFilters.value = Array.from(next);
  listingFirst.value = 0;
  void resetAndLoad();
}

function clearAssigneeFiltersOnly() {
  assigneeFilters.value = [];
  listingFirst.value = 0;
  void resetAndLoad();
}

function toggleWorkbenchSignal(key: WorkbenchSignalKey) {
  const next = new Set(activeWorkbenchSignals.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  activeWorkbenchSignals.value = Array.from(next);
  listingFirst.value = 0;
  void resetAndLoad();
}

function listingUrgenciaFromSignals(): TrackableListingUrgency | undefined {
  const s = activeWorkbenchSignals.value;
  if (s.includes('decision')) return 'overdue';
  if (s.includes('hearing')) return 'due_today';
  if (s.includes('sinoe')) return 'due_week';
  return undefined;
}

function buildAsignadoIdForApi(): string[] | undefined {
  if (!assigneeFilters.value.length) return undefined;
  const out: string[] = [];
  const uid = user.value?.id;
  for (const id of assigneeFilters.value) {
    if (id === '__mine') {
      if (uid) out.push(uid);
    } else if (id === '__unassigned__') {
      out.push('__unassigned__');
    } else {
      out.push(id);
    }
  }
  return out.length ? out : undefined;
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
    activeWorkbenchSignals.value.length > 0 ||
    assigneeFilters.value.length > 0,
);

function focusMattersSearch() {
  const el = (toolbarSearchInputRef.value as unknown as { $el?: HTMLElement } | null)?.$el?.querySelector?.(
    'input',
  ) as HTMLInputElement | null | undefined;
  el?.focus();
}

function onGlobalSearchHotkey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    focusMattersSearch();
  }
}

function bindMattersDataTableScroll() {
  mattersScrollCleanup?.();
  mattersScrollCleanup = undefined;
  const root = (mattersDtRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
  if (!root) return;
  const scrollHost = root.querySelector('[data-pc-section="tablecontainer"]') as HTMLElement | null;
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
    __contadores: d.contadores,
    metadata: {},
  };
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
    asignadoId: buildAsignadoIdForApi(),
    urgencia: listingUrgenciaFromSignals(),
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
  filters.value = { search: '' };
  activeWorkbenchSignals.value = [];
  assigneeFilters.value = [];
  void resetAndLoad();
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

function listingHashId(value: string): number {
  return Array.from(value).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
}

function listingRowShowsSinoeHint(row: any): boolean {
  const c = row?.__contadores as { comentarios?: number } | undefined;
  const n = c?.comentarios ?? 0;
  return (listingHashId(String(row?.id ?? '')) + n) % 4 === 0;
}

function matterStageChip(row: any): string {
  const m = row?.matterType;
  if (m != null && String(m).trim() !== '') return String(m).trim();
  const st = row?.status;
  if (st != null && String(st).trim() !== '') {
    const key = `trackables.statuses.${String(st)}`;
    const tr = t(key);
    return tr === key ? String(st) : tr;
  }
  return '';
}

function wbRowClass(data: any) {
  const u = data?.listingUrgency as TrackableListingUrgency | undefined;
  const parts = ['matter-datatable-row'];
  if (u === 'overdue' || u === 'due_today') parts.push('wb-row--urgent');
  else if (u === 'due_week') parts.push('wb-row--warn');
  return parts.join(' ');
}

function daysFromProximoPlazo(row: any): number | null {
  const pz = row?.__proximoPlazo as { fecha?: string; diasRestantes?: number } | null | undefined;
  if (!pz) return null;
  if (typeof pz.diasRestantes === 'number') return pz.diasRestantes;
  if (pz.fecha) {
    const d = new Date(pz.fecha);
    if (Number.isNaN(d.getTime())) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const due = new Date(d);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - start.getTime()) / 86400000);
  }
  return null;
}

function matterRowPendingTasks(row: any): MatterPendingTaskRow[] {
  const actions: MatterPendingTaskRow[] = [];
  const u = row?.listingUrgency as TrackableListingUrgency | undefined;
  const days = daysFromProximoPlazo(row);

  if (u === 'overdue' || (days != null && days < 0)) {
    actions.push({
      id: 'overdue',
      label: t('trackables.matterRowTasksOverdue'),
      tooltip: activityDeadlineHint(row) ?? t('trackables.matterRowTasksOverdue'),
      icon: 'pi pi-send',
      accent: '#dc2626',
      tab: 1,
    });
  } else if (u === 'due_today' || days === 0) {
    actions.push({
      id: 'today',
      label: t('trackables.matterRowTasksDueToday'),
      tooltip: activityDeadlineHint(row) ?? t('trackables.matterRowTasksDueToday'),
      icon: 'pi pi-send',
      accent: '#dc2626',
      tab: 1,
    });
  } else if (
    u === 'due_week' ||
    u === 'due_month' ||
    (days != null && days > 0 && days <= 7)
  ) {
    actions.push({
      id: 'soon',
      label: t('trackables.matterRowTasksDueSoon'),
      tooltip: activityDeadlineHint(row) ?? t('trackables.matterRowTasksDueSoon'),
      icon: 'pi pi-file-edit',
      accent: '#d97706',
      tab: 1,
    });
  }

  if (!row.assignedTo && canTrackableUpdate.value) {
    actions.push({
      id: 'assign',
      label: t('trackables.unassigned'),
      tooltip: t('trackables.assignInlineCta'),
      icon: 'pi pi-user-plus',
      accent: '#64748b',
      tab: 0,
    });
  }

  if (matterMetaLooksIncomplete(row) && canTrackableUpdate.value) {
    actions.push({
      id: 'client',
      label: t('trackables.matterRowTasksAssignClient'),
      tooltip: t('trackables.assignClientPopoverHint'),
      icon: 'pi pi-building',
      accent: '#0e7490',
      tab: 0,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'open',
      label: t('trackables.matterRowTasksOpen'),
      tooltip: t('trackables.tooltipEditMatter'),
      icon: 'pi pi-flag',
      accent: '#0f766e',
      tab: 1,
    });
  }

  return actions;
}

function matterPendingActionTo(row: any, task: MatterPendingTaskRow): RouteLocationRaw {
  const path = `/trackables/${row.id}`;
  if (task.tab === 1) return { path, query: { tab: '1' } };
  return path;
}

function matterDeadlineCell(row: any): {
  label: string;
  severity: 'danger' | 'warn' | 'info' | 'secondary';
} {
  const u = row?.listingUrgency as TrackableListingUrgency | undefined;
  const pz = row?.__proximoPlazo as { fecha?: string; tipo?: string } | null | undefined;
  let label = t('trackables.matterDeadlineFallback');
  if (pz?.fecha) {
    const short = formatDateShort(pz.fecha);
    label = pz.tipo ? `${pz.tipo} · ${short}` : short;
  } else if (u) {
    const map: Record<TrackableListingUrgency, string> = {
      overdue: t('trackables.listingChipOverdue'),
      due_today: t('trackables.listingChipDueToday'),
      due_week: t('trackables.listingChipDueWeek'),
      due_month: t('trackables.listingChipDueMonth'),
      normal: t('trackables.listingChipNormal'),
      no_deadline: t('trackables.listingChipNoDeadline'),
    };
    label = map[u] ?? label;
  }
  const severity =
    u === 'overdue' || u === 'due_today'
      ? 'danger'
      : u === 'due_week'
        ? 'warn'
        : u === 'due_month'
          ? 'info'
          : 'secondary';
  return { label, severity };
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
    if (scope === 'active' && user.value?.id && !assigneeMineBootstrapped.value) {
      assigneeMineBootstrapped.value = true;
      assigneeFilters.value = ['__mine'];
    }
    void loadClientsForCase();
    void loadUsers();
    void resetAndLoad();
  },
  { immediate: true },
);

watch(listScope, (scope) => {
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
.wb-table :deep(.p-datatable-tbody > tr),
.trash-data-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.15s ease;
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
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .exp-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
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
/* ── Expediente v2.1 workbench (wb-*) — portado desde ExpedienteV21Sandbox ───────── */
.exp21 {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.wb-toolbar__primary {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border-bottom: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-sunken) 88%, var(--surface-raised));
}

.wb-scope-select {
  align-self: stretch;
  display: flex;
  align-items: stretch;
}

:deep(.wb-scope-select .p-selectbutton) {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  gap: 0;
}

:deep(.wb-scope-select .p-togglebutton),
:deep(.wb-scope-select .p-togglebutton:first-child),
:deep(.wb-scope-select .p-togglebutton:last-child) {
  align-self: stretch;
  flex: 0 0 auto;
  min-height: 2.75rem;
  height: auto;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  color: var(--fg-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  padding-inline: 1.1rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}

:deep(.wb-scope-select .p-togglebutton-checked),
:deep(.wb-scope-select .p-togglebutton-checked:first-child),
:deep(.wb-scope-select .p-togglebutton-checked:last-child) {
  background: var(--surface-raised);
  box-shadow: inset 0 0 0 1px var(--surface-border);
  color: var(--fg-default);
  border-radius: 0;
}

:deep(.wb-scope-select .p-togglebutton:not(.p-togglebutton-checked)) {
  background: transparent;
  color: var(--fg-muted);
}

:deep(.wb-scope-select .p-togglebutton .p-togglebutton-content),
:deep(.wb-scope-select .p-togglebutton-checked .p-togglebutton-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
}

.wb-card {
  height: min(84vh, calc(100dvh - 9.5rem));
  min-height: 520px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.wb-toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-raised);
}

.wb-toolbar__row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
}

.wb-toolbar__row--main {
  gap: 0.6rem;
}

.wb-search {
  min-width: 13rem;
  max-width: min(22rem, 38%);
  flex: 0 0 auto;
}

.wb-search :deep(.p-inputtext) {
  width: 100%;
}

.wb-signals {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.wb-signal {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  min-height: 1.875rem;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  padding-inline: 0.6rem;
  touch-action: manipulation;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.wb-signal:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 44%, var(--surface-border));
  outline-offset: 2px;
}

.wb-signal:hover,
.wb-signal--active {
  border-color: color-mix(in srgb, var(--sa, var(--accent)) 38%, var(--surface-border));
  color: var(--fg-default);
}

.wb-signal--active {
  background: color-mix(in srgb, var(--sa, var(--accent)) 11%, var(--surface-raised));
  color: var(--sa, var(--accent));
}

.wb-signal--reset {
  border-color: color-mix(in srgb, var(--accent) 36%, var(--surface-border));
  background: var(--accent-soft);
  color: var(--accent);
  --sa: var(--accent);
}

.wb-count {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--fg-subtle);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

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

.wb-assignee-pop__item--mine {
  font-weight: 650;
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

.wb-assignee-pop__avatar--empty,
.wb-assignee-pop__avatar--all {
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

.wb-skeleton {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 0 0.85rem;
}

.wb-skeleton__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem 8.5rem 10rem 8rem;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid var(--surface-border);
  padding-block: 0.9rem;
}

.wb-skeleton__row--no-actions {
  grid-template-columns: minmax(0, 1fr) 13rem 8.5rem 10rem;
}

.wb-skeleton__col--main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.wb-assignee {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.wb-table .p-datatable-table-container) {
  overflow-x: hidden;
}

:deep(.wb-table .p-datatable-thead > tr > th:first-child),
:deep(.wb-table .p-datatable-tbody > tr > td:first-child) {
  width: auto;
}

:deep(.wb-table .wb-col-assignee) {
  isolation: isolate;
}

:deep(.wb-table .p-datatable-thead > tr > th) {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--fg-muted);
  background: var(--surface-sunken);
  padding-block: 0.6rem;
  padding-inline: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 20;
}

:deep(.wb-table .p-datatable-tbody > tr) {
  transition: background-color 0.12s ease;
}

:deep(.wb-table .p-datatable-tbody > tr > td) {
  padding: 0.7rem 0.85rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--surface-border);
}

:deep(.wb-table .wb-row--urgent > td:first-child) {
  border-left: 3px solid #dc2626;
}

:deep(.wb-table .wb-row--warn > td:first-child) {
  border-left: 3px solid #d97706;
}

:deep(.wb-table .wb-col-matter),
:deep(.wb-table .wb-col-action) {
  vertical-align: top;
}

/* Expediente: tope que NO depende del % del <table> (ese % crece con el layout y amplía la celda) */
:deep(.wb-table .p-datatable-thead > tr > th.wb-col-matter),
:deep(.wb-table .p-datatable-thead > tr > th:nth-child(1)),
:deep(.wb-table .p-datatable-tbody > tr > td.wb-col-matter),
:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1)) {
  width: min(22rem, 42vw);
  max-width: min(22rem, 42vw);
  box-sizing: border-box;
  overflow: hidden;
}

:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1) .wb-matter) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1) .wb-matter__copy) {
  max-width: 100%;
  min-width: 0;
}

:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1) .wb-matter__topline),
:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1) .wb-matter__title),
:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1) .wb-matter__client) {
  max-width: 100%;
}

:deep(.wb-table .p-datatable-tbody > tr > td:nth-child(1) .wb-matter__title .line-clamp-1) {
  display: block;
  max-width: 100%;
}

.wb-matter {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  min-width: 0;
}

.wb-matter__emoji {
  display: inline-grid;
  width: 2.1rem;
  height: 2.1rem;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--surface-border);
  border-radius: 0.55rem;
  background: var(--surface-sunken);
  font-size: 1rem;
}

.wb-matter__copy {
  min-width: 0;
  flex: 1;
}

.wb-matter__topline {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.28rem;
  margin-bottom: 0.22rem;
}

.wb-case {
  max-width: min(9rem, 100%);
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--surface-sunken) 68%, var(--surface-raised));
  color: var(--fg-muted);
  font-size: 0.6rem;
  font-weight: 760;
  letter-spacing: 0.05em;
  padding: 0.1rem 0.35rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.wb-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.1rem;
  border-radius: 999px;
  background: var(--surface-sunken);
  color: var(--fg-muted);
  font-size: 0.6rem;
  font-weight: 760;
  letter-spacing: 0.04em;
  padding-inline: 0.42rem;
  text-transform: uppercase;
}

.wb-chip--stage {
  background: var(--accent-soft);
  color: var(--accent);
}

.wb-chip--sinoe {
  background: color-mix(in srgb, #7c3aed 14%, var(--surface-raised));
  color: #7c3aed;
}

.wb-matter__title {
  display: block;
  margin: 0;
  overflow: hidden;
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.25;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-matter__title:hover {
  text-decoration: underline;
}

.wb-matter__title:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
  border-radius: 2px;
}

.wb-matter__client {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.2rem 0 0;
  overflow: hidden;
  color: var(--fg-subtle);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-actions-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 0.2rem;
}

.wb-action-stat {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.65rem;
  padding: 0.15rem 0.35rem 0.15rem 0.4rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background: var(--surface-sunken);
  text-decoration: none;
  color: inherit;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.wb-action-stat:hover {
  background: color-mix(in srgb, var(--surface-border) 45%, var(--surface-sunken));
  border-color: var(--surface-border);
}

.wb-action-stat:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 1px;
}

.wb-action-stat__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-action-stat__go {
  margin-left: 0.1rem;
  color: var(--fg-subtle);
  opacity: 0.55;
}

.wb-action-stat:hover .wb-action-stat__go {
  opacity: 0.85;
}

.wb-action-overflow {
  align-self: flex-start;
  display: inline-grid;
  min-width: 1.45rem;
  min-height: 1.35rem;
  place-items: center;
  border: 1px solid var(--surface-border);
  border-radius: 0.3rem;
  background: var(--surface-raised);
  color: var(--fg-muted);
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.1rem 0.28rem;
  cursor: default;
}

:deep(.wb-deadline-tag.p-tag) {
  font-size: 0.68rem;
  white-space: nowrap;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wb-involved {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.wb-inv-stack {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  width: 2.15rem;
}

.wb-avatar-primary {
  display: inline-grid;
  width: 2.15rem;
  height: 2.15rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  box-shadow:
    0 0 0 2px var(--surface-raised),
    0 0 0 3.5px color-mix(in srgb, var(--accent) 40%, var(--surface-border));
  color: var(--fg-on-brand);
  font-size: 0.7rem;
  font-weight: 760;
  position: relative;
  z-index: 4;
  cursor: default;
}

.wb-avatar-primary--img {
  object-fit: cover;
}

.wb-avatar-primary--empty {
  background: var(--surface-sunken);
  border: 1.5px dashed var(--surface-border);
  box-shadow: none;
  color: var(--fg-subtle);
  font-size: 0.82rem;
}

.wb-involved__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.06rem;
}

.wb-involved__name {
  overflow: hidden;
  color: var(--fg-default);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-involved__name--empty {
  color: var(--fg-subtle);
  font-style: italic;
  font-weight: 400;
}

.wb-involved__role {
  color: var(--accent);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.wb-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

:deep(.wb-row-actions .p-button) {
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
}

:deep(.wb-row-actions .p-button-icon) {
  font-size: 0.78rem;
}

:deep(.wb-actions-header) {
  text-align: center !important;
}

.wb-empty {
  display: flex;
  min-height: 18rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  color: var(--fg-muted);
  text-align: center;
}

.wb-empty--standalone {
  min-height: 320px;
}

.wb-empty .pi {
  color: var(--fg-subtle);
  font-size: 2.25rem;
}

.wb-empty h3 {
  margin: 0;
  color: var(--fg-default);
  font-size: 1rem;
}

.wb-empty p {
  margin: 0;
  max-width: 24rem;
  font-size: 0.82rem;
}

.wb-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-raised);
}

:deep(.wb-footer .p-paginator) {
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: none;
  font-size: 0.78rem;
}

:deep(.wb-footer .p-paginator .p-paginator-current) {
  color: var(--fg-subtle);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.matters-dt-region :deep([data-pc-name='datatable']) {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.matters-dt-region--scrolled :deep([data-pc-section='tablecontainer']) {
  box-shadow: inset 0 10px 14px -12px color-mix(in srgb, #000 14%, transparent);
}

:deep(.wb-table .p-datatable-table-container),
:deep(.wb-table [data-pc-section='tablecontainer']) {
  overflow-x: hidden !important;
  min-width: 0;
}

:deep(.wb-table table) {
  table-layout: fixed;
  width: 100%;
}

@media (hover: hover) {
  :deep(.wb-table .p-datatable-tbody > tr:hover) {
    background: color-mix(in srgb, var(--accent-soft) 50%, var(--surface-raised));
  }
}

@media (prefers-reduced-motion: reduce) {
  .wb-signal,
  :deep(.wb-table .p-datatable-tbody > tr) {
    transition: none;
  }
}

@container (max-width: 640px) {
  .wb-toolbar__primary {
    min-height: 0;
  }

  :deep(.wb-scope-select .p-selectbutton) {
    width: 100%;
    flex-wrap: wrap;
    min-height: 0;
  }

  :deep(.wb-scope-select .p-togglebutton) {
    flex: 1 1 auto;
    min-height: 2.5rem;
  }

  .wb-toolbar__row--main {
    flex-direction: column;
    align-items: stretch;
  }

  .wb-search {
    max-width: none;
    width: 100%;
  }

  .wb-count {
    margin-left: 0;
  }
}

/* Expediente v2.1 — anillo expediente + botón cliente (reutilizado en celda wb) */
.matters-wb-matter__client-btn {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.matters-wb-matter__client-btn:hover {
  color: var(--accent);
}
.matters-wb-matter__client-btn:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
  border-radius: 2px;
}
.matters-wb-expediente-ring {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px dashed var(--fg-subtle);
  color: var(--fg-subtle);
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    color 0.12s ease;
}
.matters-wb-expediente-ring:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.matters-wb-expediente-ring:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 55%, var(--surface-border));
  outline-offset: 2px;
}
.matters-wb-expediente-ring--readonly {
  border-color: var(--surface-border);
  cursor: default;
}
/* Workbench: scope tabs edge-to-edge (papelera / sin permiso) */
.matters-workbench-scope {
  container-type: inline-size;
}
.matters-workbench-scope-tabs :deep(.p-selectbutton) {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  gap: 0;
}
.matters-workbench-scope-tabs :deep(.p-togglebutton),
.matters-workbench-scope-tabs :deep(.p-togglebutton:first-child),
.matters-workbench-scope-tabs :deep(.p-togglebutton:last-child) {
  align-self: stretch;
  flex: 0 0 auto;
  min-height: 2.75rem;
  height: auto;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  color: var(--fg-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  padding-inline: 1.1rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.matters-workbench-scope-tabs :deep(.p-togglebutton-checked),
.matters-workbench-scope-tabs :deep(.p-togglebutton-checked:first-child),
.matters-workbench-scope-tabs :deep(.p-togglebutton-checked:last-child) {
  background: var(--surface-raised);
  color: var(--fg-default);
  box-shadow: inset 0 -2px 0 0 var(--accent);
}
@media (hover: hover) {
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
