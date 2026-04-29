<template>
  <div class="flex flex-col gap-6">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <template v-else-if="!canTrackableRead">
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
        <i class="pi pi-lock text-4xl opacity-60" />
        <p class="m-0">{{ t('clients.noPermission') }}</p>
      </div>
    </template>
    <template v-else>
      <ConfirmDialogBase
        v-model:visible="showDeleteConfirm"
        variant="danger"
        :title="t('clients.deleteTitle')"
        :subject="deleteTarget ? `«${deleteTarget.name}»` : ''"
        :message="t('clients.deleteMessage')"
        :consequences-title="t('common.consequencesTitle')"
        :consequences="deleteConsequences"
        :typed-confirm-phrase="t('clients.deleteTypedPhrase')"
        :typed-confirm-hint="t('clients.deleteTypedHint')"
        :typed-confirm-label="t('common.typedConfirmLabel')"
        :confirm-label="t('clients.deleteConfirmButton')"
        :cancel-label="t('common.cancel')"
        :loading="deleting"
        @hide="onDeleteConfirmHide"
        @confirm="onDeleteConfirm"
      />

      <PageHeader :title="t('clients.title')" :subtitle="t('clients.pageSubtitle')">
        <template #actions>
          <Button
            v-if="canTrackableCreate"
            :label="t('clients.newClient')"
            icon="pi pi-plus"
            size="small"
            @click="openCreate"
          />
        </template>
      </PageHeader>

      <div
        class="app-card clients-cockpit-card flex max-h-[min(82vh,calc(100dvh-11rem))] min-h-0 flex-col overflow-hidden shadow-sm"
      >
        <div
          class="clients-command-toolbar flex flex-shrink-0 flex-col gap-3 border-b border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-2.5 sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-3"
          role="toolbar"
          :aria-label="t('clients.toolbarCommandBarAria')"
        >
          <IconField ref="searchFieldRef" class="toolbar-iconfield min-w-0 flex-1">
            <InputIcon class="pi pi-search text-[var(--fg-subtle)]" />
            <InputText
              v-model="filters.search"
              :placeholder="t('clients.searchPlaceholder')"
              class="toolbar-search w-full min-w-0 rounded-xl"
              :aria-label="t('common.search')"
              autocomplete="off"
              @input="debouncedLoad"
            />
          </IconField>
          <div
            class="flex min-w-0 shrink-0 items-center gap-2 border-t border-[var(--surface-border)] pt-3 text-sm tabular-nums text-[var(--fg-default)] sm:border-t-0 sm:pt-0 md:border-l md:border-t-0 md:pl-5"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{{ t('clients.toolbarResults', { n: totalRecords }) }}</span>
          </div>
        </div>

        <div
          v-if="clientsShowSkeleton"
          class="clients-skeleton-shell flex-1 min-h-[420px] overflow-x-auto overscroll-x-contain"
          :aria-label="t('clients.loadingTable')"
        >
          <div class="min-w-[760px]">
            <div
              class="grid grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(7.5rem,0.6fr)] gap-4 border-b border-[var(--surface-border)] px-4 py-3"
            >
              <Skeleton v-for="col in 5" :key="`cl-head-${col}`" height="0.75rem" />
            </div>
            <div
              v-for="row in 8"
              :key="`cl-sk-${row}`"
              class="grid grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(7.5rem,0.6fr)] items-center gap-4 border-b border-[var(--surface-border)] px-4 py-4 last:border-0"
            >
              <div class="flex min-w-0 items-center gap-3">
                <Skeleton shape="circle" size="2.25rem" />
                <div class="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton height="0.9rem" width="80%" />
                  <Skeleton height="0.7rem" width="55%" />
                </div>
              </div>
              <Skeleton height="0.8rem" width="85%" />
              <Skeleton height="0.8rem" width="70%" />
              <Skeleton height="0.8rem" width="60%" />
              <div class="flex justify-center gap-2">
                <Skeleton shape="circle" size="2.25rem" />
                <Skeleton shape="circle" size="2.25rem" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="clients-dt-region relative flex min-h-0 flex-1 flex-col">
          <DataTable
            class="clients-data-table min-h-0 flex-1"
            :value="clients"
            :loading="false"
            data-key="id"
            size="small"
            scrollable
            scroll-height="flex"
            row-hover
            responsive-layout="scroll"
            :table-props="{ 'aria-label': t('clients.tableAriaLabel') }"
          >
            <template #empty>
              <div
                v-if="!loading"
                class="flex flex-col items-center justify-center gap-2 py-16 text-center"
              >
                <i class="pi pi-users text-4xl text-[var(--fg-subtle)]" aria-hidden="true" />
                <p class="m-0 text-base font-medium text-[var(--fg-default)]">
                  {{
                    filters.search.trim()
                      ? t('clients.tableEmptyTitle')
                      : t('clients.tableEmptyZeroTitle')
                  }}
                </p>
                <p class="m-0 max-w-sm text-sm text-[var(--fg-muted)]">
                  {{
                    filters.search.trim()
                      ? t('clients.tableEmptySubtitle')
                      : t('clients.tableEmptyZeroSubtitle')
                  }}
                </p>
              </div>
            </template>

            <Column field="name" :header="t('clients.name')">
              <template #body="{ data }">
                <div class="client-title-cell flex min-w-0 items-start gap-3 py-1">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    aria-hidden="true"
                  >
                    <i
                      :class="data.clientKind === 'legal' ? 'pi pi-building' : 'pi pi-user'"
                      class="text-lg"
                    />
                  </span>
                  <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="line-clamp-2 font-semibold leading-snug text-[var(--fg-default)]">
                      {{ data.name }}
                    </span>
                    <p class="m-0 line-clamp-1 text-xs text-[var(--fg-subtle)]">
                      {{ clientKindLabelFromRow(data) }}
                    </p>
                  </div>
                </div>
              </template>
            </Column>
            <Column field="email" :header="t('clients.email')">
              <template #body="{ data }">
                <span class="text-sm text-[var(--fg-muted)]">{{ data.email?.trim() || t('clients.valueEmpty') }}</span>
              </template>
            </Column>
            <Column field="phone" :header="t('clients.phone')">
              <template #body="{ data }">
                <span class="text-sm text-[var(--fg-muted)]">{{ data.phone?.trim() || t('clients.valueEmpty') }}</span>
              </template>
            </Column>
            <Column field="documentId" :header="t('clients.documentId')">
              <template #body="{ data }">
                <span class="text-sm text-[var(--fg-muted)] tabular-nums">{{
                  data.documentId?.trim() || t('clients.valueEmpty')
                }}</span>
              </template>
            </Column>
            <Column
              v-if="rowHasClientActions"
              :header="t('common.actions')"
              header-class="client-actions-header"
              body-class="client-actions-cell"
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
                    size="small"
                    severity="secondary"
                    class="matter-action matter-action--edit"
                    :aria-label="t('common.edit')"
                    v-tooltip.top="t('common.edit')"
                    @click="openEdit(data)"
                  />
                  <Button
                    v-if="canTrackableDelete"
                    type="button"
                    icon="pi pi-trash"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="danger"
                    class="matter-action matter-action--danger"
                    :aria-label="t('common.delete')"
                    v-tooltip.top="t('common.delete')"
                    @click="openDeleteDialog(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <div
          v-if="!clientsShowSkeleton && totalRecords > 0"
          class="flex-shrink-0 border-t border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5"
        >
          <Paginator
            :first="first"
            :rows="rows"
            :total-records="totalRecords"
            :rows-per-page-options="[10, 20, 50]"
            :current-page-report-template="t('clients.tablePageReport')"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            @page="onPaginatorPage"
          />
        </div>
      </div>

      <Dialog
        v-model:visible="dialogVisible"
        :modal="true"
        :draggable="false"
        :dismissable-mask="!saving && !formDialogBlockedByDirty"
        :closable="false"
        :close-on-escape="!saving && !formDialogBlockedByDirty"
        :style="{ width: dialogShellWidth }"
        :pt="{
          mask: { class: 'alega-confirm-mask' },
          root: {
            class:
              'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible',
          },
        }"
        @hide="onFormDialogHide"
      >
        <template #container>
          <div
            class="matter-dialog-shell matter-dialog-shell--client flex max-h-[min(88vh,720px)] min-h-0 flex-col"
          >
            <template v-if="!editingId">
              <header
                class="matter-dialog-header flex flex-col gap-2 border-b border-[var(--surface-border)] px-5 py-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <div
                      class="matter-dialog-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    >
                      <i
                        class="pi pi-user-plus text-xl text-[var(--brand-zafiro)] dark:text-[var(--accent)]"
                      />
                    </div>
                    <div class="flex min-w-0 flex-col gap-0.5">
                      <span class="matter-dialog-eyebrow text-brand-gradient">
                        {{ t('clients.wizardEyebrow') }}
                      </span>
                      <h2
                        class="matter-dialog-title text-lg font-semibold leading-tight text-[var(--fg-default)]"
                      >
                        {{ t('clients.formNewTitle') }}
                      </h2>
                      <p class="m-0 text-[0.8125rem] text-[var(--fg-muted)]">
                        {{ t('clients.wizardNewHint') }}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    icon="pi pi-times"
                    text
                    rounded
                    size="small"
                    :disabled="saving"
                    :aria-label="t('common.close')"
                    class="shrink-0"
                    @click="attemptCloseFormDialog"
                  />
                </div>
              </header>
              <div
                class="client-wizard-steps flex min-h-0 items-center gap-2 border-b border-[var(--surface-border)] bg-[var(--surface-sunken)] px-5 py-2.5"
                role="navigation"
                :aria-label="t('clients.wizardStepsAria')"
              >
                <template v-for="(label, idx) in createStepLabels" :key="`cstep-${idx}`">
                  <div class="flex min-w-0 items-center gap-2">
                    <div
                      class="client-wizard-step__circle"
                      :class="{
                        'client-wizard-step__circle--done': idx < wizardStep,
                        'client-wizard-step__circle--active': idx === wizardStep,
                      }"
                    >
                      <i v-if="idx < wizardStep" class="pi pi-check text-[10px]" />
                      <span v-else>{{ idx + 1 }}</span>
                    </div>
                    <span
                      class="min-w-0 truncate text-xs font-medium"
                      :class="
                        idx === wizardStep ? 'text-[var(--fg-default)]' : 'text-[var(--fg-subtle)]'
                      "
                    >
                      {{ label }}
                    </span>
                  </div>
                  <div
                    v-if="idx < createStepLabels.length - 1"
                    class="client-wizard-step__line min-w-[1rem] flex-1"
                    :class="{ 'client-wizard-step__line--done': idx < wizardStep }"
                  />
                </template>
              </div>
              <form
                class="flex min-h-0 flex-1 flex-col"
                novalidate
                @submit.prevent="onFormSubmit"
                @keydown="onFormKeydown"
              >
                <div
                  class="client-wizard-body matter-dialog-body flex min-h-0 max-h-[min(52vh,480px)] flex-1 flex-col overflow-hidden"
                >
                  <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <Transition :name="stepTransitionName" mode="out-in">
                      <section v-if="wizardStep === 0" key="w0" class="matter-form-section">
                        <h3 class="matter-form-section__title">
                          <span class="matter-form-section__title-text text-brand-gradient">{{
                            t('clients.sectionIdentity')
                          }}</span>
                        </h3>
                        <div class="flex flex-col gap-4">
                          <div class="flex flex-col gap-1.5">
                            <span
                              class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                            >
                              {{ t('clients.clientKind') }}
                              <span class="text-red-600 dark:text-red-400">*</span>
                            </span>
                            <SelectButton
                              v-model="form.clientKind"
                              :options="naturalLegalKindOptions"
                              option-label="label"
                              option-value="value"
                              :disabled="saving"
                              :allow-empty="false"
                              :aria-label="t('clients.clientKind')"
                            />
                            <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                              {{ t('clients.clientKindCreateHelp') }}
                            </small>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label
                              for="client-wizard-doc"
                              class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                            >
                              {{ form.clientKind === ClientKind.NATURAL ? t('clients.dni') : t('clients.ruc') }}
                              <span class="text-red-600 dark:text-red-400">*</span>
                            </label>
                            <InputText
                              id="client-wizard-doc"
                              ref="firstFieldRef"
                              v-model="form.documentId"
                              :placeholder="
                                form.clientKind === ClientKind.NATURAL
                                  ? t('clients.dniPlaceholder')
                                  : t('clients.rucPlaceholder')
                              "
                              :invalid="!!errors.documentId"
                              :disabled="saving"
                              inputmode="numeric"
                              autocomplete="off"
                              @input="onDocumentInput"
                            />
                            <small
                              v-if="errors.documentId"
                              class="matter-field-error text-xs text-red-600 dark:text-red-300"
                            >
                              {{ errors.documentId }}
                            </small>
                            <small
                              v-else
                              class="matter-field-help text-xs text-[var(--fg-subtle)]"
                            >
                              {{ t('clients.fieldDocumentCreateHelp') }}
                            </small>
                            <Button
                              type="button"
                              :label="t('clients.identityConsultButton')"
                              :loading="identityLoading"
                              :disabled="saving"
                              class="w-full sm:w-auto"
                              size="small"
                              severity="secondary"
                              variant="outlined"
                              @click="onIdentityConsult"
                            />
                          </div>
                        </div>
                      </section>
                      <section v-else key="w1" class="matter-form-section">
                        <h3 class="matter-form-section__title">
                          <span class="matter-form-section__title-text text-brand-gradient">
                            {{ t('clients.sectionContact') }}
                          </span>
                        </h3>
                        <div class="flex flex-col gap-4">
                          <div class="flex flex-col gap-1">
                            <label
                              for="client-wizard-name"
                              class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                            >
                              {{ t('clients.name') }}
                              <span class="text-red-600 dark:text-red-400">*</span>
                            </label>
                            <InputText
                              id="client-wizard-name"
                              v-model="form.name"
                              :placeholder="t('clients.fieldNamePlaceholder')"
                              :invalid="!!errors.name"
                              :disabled="saving"
                              autocomplete="organization"
                              @blur="validateField('name')"
                              @input="errors.name = ''"
                            />
                            <small
                              v-if="errors.name"
                              class="matter-field-error text-xs text-red-600 dark:text-red-300"
                            >
                              {{ errors.name }}
                            </small>
                            <small v-else class="matter-field-help text-xs text-[var(--fg-subtle)]">
                              {{ t('clients.fieldNameHelp') }}
                            </small>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label
                              for="client-wizard-email"
                              class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                            >
                              {{ t('clients.email') }}
                            </label>
                            <InputText
                              id="client-wizard-email"
                              v-model="form.email"
                              type="email"
                              :placeholder="t('clients.fieldEmailPlaceholder')"
                              :disabled="saving"
                              autocomplete="email"
                            />
                            <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                              {{ t('clients.fieldEmailHelp') }}
                            </small>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label
                              for="client-wizard-phone"
                              class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                            >
                              {{ t('clients.phone') }}
                            </label>
                            <InputText
                              id="client-wizard-phone"
                              v-model="form.phone"
                              :placeholder="t('clients.fieldPhonePlaceholder')"
                              :disabled="saving"
                              autocomplete="tel"
                            />
                            <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                              {{ t('clients.fieldPhoneHelp') }}
                            </small>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label
                              for="client-wizard-notes"
                              class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                            >
                              {{ t('clients.notes') }}
                            </label>
                            <Textarea
                              id="client-wizard-notes"
                              v-model="form.notes"
                              rows="3"
                              class="w-full"
                              :placeholder="t('clients.fieldNotesPlaceholder')"
                              :disabled="saving"
                            />
                            <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                              {{ t('clients.fieldNotesHelp') }}
                            </small>
                          </div>
                        </div>
                      </section>
                    </Transition>
                  </div>
                </div>
                <footer
                  class="matter-dialog-footer flex flex-wrap items-center justify-between gap-2 border-t border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-raised)_92%,var(--surface-page))] px-5 py-3"
                >
                  <Button
                    type="button"
                    :label="t('common.cancel')"
                    text
                    :disabled="saving"
                    @click="attemptCloseFormDialog"
                  />
                  <div class="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      v-if="wizardStep > 0"
                      type="button"
                      :label="t('common.back')"
                      severity="secondary"
                      variant="outlined"
                      icon="pi pi-arrow-left"
                      :disabled="saving"
                      @click="prevWizardStep"
                    />
                    <Button
                      v-if="wizardStep < 1"
                      type="button"
                      :label="t('common.next')"
                      icon="pi pi-arrow-right"
                      icon-pos="right"
                      :disabled="!canGoNextWizardStep"
                      @click="nextWizardStep"
                    />
                    <Button
                      v-else
                      type="button"
                      :label="t('common.create')"
                      icon="pi pi-check"
                      :loading="saving"
                      :disabled="!canSubmitCreate"
                      @click="onFormSubmit"
                    />
                  </div>
                </footer>
              </form>
            </template>
            <template v-else>
              <header
                class="matter-dialog-header flex flex-col gap-2 border-b border-[var(--surface-border)] px-5 py-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <div
                      class="matter-dialog-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    >
                      <i
                        :class="form.clientKind === ClientKind.LEGAL ? 'pi pi-building' : 'pi pi-user'"
                        class="text-xl text-[var(--brand-zafiro)] dark:text-[var(--accent)]"
                      />
                    </div>
                    <div class="flex min-w-0 flex-col gap-0.5">
                      <span class="matter-dialog-eyebrow text-brand-gradient">
                        {{ t('clients.formEyebrow') }}
                      </span>
                      <h2
                        class="matter-dialog-title text-lg font-semibold leading-tight text-[var(--fg-default)]"
                      >
                        {{ t('clients.formEditTitle') }}
                      </h2>
                      <p class="m-0 text-[0.8125rem] text-[var(--fg-muted)]">
                        {{ t('clients.formEditHint') }}
                      </p>
                      <p
                        v-if="editIsDirty"
                        class="m-0 flex items-center gap-1.5 text-[0.8125rem] text-amber-700 dark:text-amber-300"
                      >
                        <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {{ t('clients.formDirtyHint') }}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    icon="pi pi-times"
                    text
                    rounded
                    size="small"
                    :disabled="saving"
                    :aria-label="t('common.close')"
                    class="shrink-0"
                    @click="attemptCloseFormDialog"
                  />
                </div>
              </header>
              <form
                class="matter-dialog-body flex max-h-[min(52vh,420px)] flex-col gap-0 overflow-y-auto px-5 py-4"
                novalidate
                @submit.prevent="onFormSubmit"
                @keydown="onFormKeydown"
              >
                <section class="matter-form-section">
                  <h3 class="matter-form-section__title">
                    <span class="matter-form-section__title-text text-brand-gradient">
                      {{ t('clients.sectionContact') }}
                    </span>
                  </h3>
                  <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                      <label
                        for="client-form-kind"
                        class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                      >
                        {{ t('clients.clientKind') }}
                      </label>
                      <Select
                        id="client-form-kind"
                        v-model="form.clientKind"
                        :options="clientKindEditOptions"
                        option-label="label"
                        option-value="value"
                        :disabled="saving"
                        :placeholder="t('clients.clientKind')"
                        :aria-label="t('clients.clientKind')"
                        class="w-full"
                      />
                      <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                        {{ t('clients.clientKindEditHelp') }}
                      </small>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        for="client-form-name"
                        class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                      >
                        {{ t('clients.name') }}
                        <span class="text-red-600 dark:text-red-400">*</span>
                      </label>
                      <InputText
                        id="client-form-name"
                        ref="firstFieldRef"
                        v-model="form.name"
                        :placeholder="t('clients.fieldNamePlaceholder')"
                        :invalid="!!errors.name"
                        :disabled="saving"
                        autocomplete="organization"
                        @blur="validateField('name')"
                        @input="errors.name = ''"
                      />
                      <small
                        v-if="errors.name"
                        class="matter-field-error text-xs text-red-600 dark:text-red-300"
                      >
                        {{ errors.name }}
                      </small>
                      <small v-else class="matter-field-help text-xs text-[var(--fg-subtle)]">
                        {{ t('clients.fieldNameHelp') }}
                      </small>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        for="client-form-email"
                        class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                      >
                        {{ t('clients.email') }}
                      </label>
                      <InputText
                        id="client-form-email"
                        v-model="form.email"
                        type="email"
                        :placeholder="t('clients.fieldEmailPlaceholder')"
                        :disabled="saving"
                        autocomplete="email"
                      />
                      <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                        {{ t('clients.fieldEmailHelp') }}
                      </small>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        for="client-form-phone"
                        class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                      >
                        {{ t('clients.phone') }}
                      </label>
                      <InputText
                        id="client-form-phone"
                        v-model="form.phone"
                        :placeholder="t('clients.fieldPhonePlaceholder')"
                        :disabled="saving"
                        autocomplete="tel"
                      />
                      <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                        {{ t('clients.fieldPhoneHelp') }}
                      </small>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        for="client-form-doc"
                        class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                      >
                        {{ t('clients.documentId') }}
                      </label>
                      <InputText
                        id="client-form-doc"
                        v-model="form.documentId"
                        :placeholder="t('clients.fieldDocumentPlaceholder')"
                        :disabled="saving"
                      />
                      <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                        {{ t('clients.fieldDocumentHelp') }}
                      </small>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        for="client-form-notes"
                        class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]"
                      >
                        {{ t('clients.notes') }}
                      </label>
                      <Textarea
                        id="client-form-notes"
                        v-model="form.notes"
                        rows="3"
                        class="w-full"
                        :placeholder="t('clients.fieldNotesPlaceholder')"
                        :disabled="saving"
                      />
                      <small class="matter-field-help text-xs text-[var(--fg-subtle)]">
                        {{ t('clients.fieldNotesHelp') }}
                      </small>
                    </div>
                  </div>
                </section>
              </form>
              <footer
                class="matter-dialog-footer flex flex-wrap items-end justify-end gap-2 border-t border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-raised)_92%,var(--surface-page))] px-5 py-3"
              >
                <Button
                  type="button"
                  :label="t('common.cancel')"
                  text
                  :disabled="saving"
                  @click="attemptCloseFormDialog"
                />
                <Button
                  type="button"
                  :label="t('common.save')"
                  icon="pi pi-check"
                  :loading="saving"
                  :disabled="!canSubmitForm"
                  @click="onFormSubmit"
                />
              </footer>
            </template>
          </div>
        </template>
      </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import Paginator from 'primevue/paginator';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { ClientKind } from '@tracker/shared';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import PageHeader from '@/components/common/PageHeader.vue';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';

const { t } = useI18n();
const toast = useToast();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const authReady = computed(() => user.value != null);
const canTrackableRead = computed(() => can('trackable:read'));
const canTrackableCreate = computed(() => can('trackable:create'));
const canTrackableUpdate = computed(() => can('trackable:update'));
const canTrackableDelete = computed(() => can('trackable:delete'));
const rowHasClientActions = computed(() => canTrackableUpdate.value || canTrackableDelete.value);

interface ClientRow {
  id: string;
  name: string;
  clientKind?: string;
  email?: string;
  phone?: string;
  documentId?: string;
  notes?: string;
}

const clients = ref<ClientRow[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const first = ref(0);
const rows = ref(20);

const filters = ref({ search: '' });

const clientsShowSkeleton = computed(() => loading.value);

const searchFieldRef = ref<InstanceType<typeof IconField> | null>(null);
const firstFieldRef = ref<InstanceType<typeof InputText> | null>(null);

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
function debouncedLoad() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    first.value = 0;
    loadClients(1);
  }, 320);
}

function focusSearch() {
  const root = (searchFieldRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
  const input = root?.querySelector('input');
  input?.focus();
}

function onGlobalSearchHotkey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    focusSearch();
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalSearchHotkey));
onUnmounted(() => window.removeEventListener('keydown', onGlobalSearchHotkey));

const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);

const createStepLabels = computed(() => [t('clients.wizardStepIdentity'), t('clients.wizardStepContact')]);

const naturalLegalKindOptions = computed(() => [
  { label: t('clients.kindNatural'), value: ClientKind.NATURAL },
  { label: t('clients.kindLegal'), value: ClientKind.LEGAL },
]);

const clientKindEditOptions = computed(() => [
  { label: t('clients.kindUnknown'), value: ClientKind.UNKNOWN },
  { label: t('clients.kindNatural'), value: ClientKind.NATURAL },
  { label: t('clients.kindLegal'), value: ClientKind.LEGAL },
]);

const dialogShellWidth = computed(() =>
  editingId.value ? 'min(520px, 96vw)' : 'min(640px, 96vw)',
);
const wizardStep = ref(0);
const stepDirection = ref<'forward' | 'backward'>('forward');
const stepTransitionName = computed(() => (stepDirection.value === 'forward' ? 'step-fwd' : 'step-back'));
const identityLoading = ref(false);
const createSnapshot = ref('');

const form = ref({
  clientKind: ClientKind.NATURAL as ClientKind,
  name: '',
  email: '',
  phone: '',
  documentId: '',
  notes: '',
});

const editSnapshot = ref('');
const editIsDirty = computed(() => {
  if (!editingId.value) return false;
  return JSON.stringify(form.value) !== editSnapshot.value;
});

const createIsDirty = computed(() => {
  if (editingId.value || !dialogVisible.value) return false;
  return JSON.stringify(form.value) !== createSnapshot.value;
});

const formDialogBlockedByDirty = computed(
  () => (editingId.value != null && editIsDirty.value) || (!editingId.value && createIsDirty.value),
);

const errors = ref({ name: '', documentId: '' });

function clientKindFromApi(v: string | undefined): ClientKind {
  if (v === ClientKind.NATURAL || v === 'natural') return ClientKind.NATURAL;
  if (v === ClientKind.LEGAL || v === 'legal') return ClientKind.LEGAL;
  return ClientKind.UNKNOWN;
}

function clientKindLabelFromRow(row: ClientRow): string {
  const k = row.clientKind;
  if (k === ClientKind.NATURAL || k === 'natural') return t('clients.kindNatural');
  if (k === ClientKind.LEGAL || k === 'legal') return t('clients.kindLegal');
  return t('clients.kindUnknown');
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function validateField(field: 'name' | 'documentId') {
  if (field === 'name' && !form.value.name?.trim()) {
    errors.value.name = t('clients.fieldNameRequired');
  }
  if (field === 'documentId') {
    const d = digitsOnly(form.value.documentId);
    if (form.value.clientKind === ClientKind.NATURAL) {
      if (d.length !== 8) {
        errors.value.documentId = t('clients.errorDniLength');
        return;
      }
    } else if (form.value.clientKind === ClientKind.LEGAL) {
      if (d.length !== 11) {
        errors.value.documentId = t('clients.errorRucLength');
        return;
      }
    }
    errors.value.documentId = '';
  }
}

const canGoNextWizardStep = computed(() => {
  if (form.value.clientKind !== ClientKind.NATURAL && form.value.clientKind !== ClientKind.LEGAL) {
    return false;
  }
  const d = digitsOnly(form.value.documentId);
  if (form.value.clientKind === ClientKind.NATURAL) return d.length === 8;
  if (form.value.clientKind === ClientKind.LEGAL) return d.length === 11;
  return false;
});

const canSubmitCreate = computed(() => !!form.value.name?.trim() && canGoNextWizardStep.value);

function onDocumentInput() {
  errors.value.documentId = '';
  const raw = form.value.documentId;
  const d = digitsOnly(raw);
  form.value.documentId = d;
}

function nextWizardStep() {
  validateField('documentId');
  if (errors.value.documentId) return;
  if (!canGoNextWizardStep.value) return;
  stepDirection.value = 'forward';
  wizardStep.value = 1;
  void nextTick(() => {
    const nameInput = document.getElementById('client-wizard-name') as HTMLInputElement | null;
    nameInput?.focus();
  });
}

function prevWizardStep() {
  if (wizardStep.value <= 0) return;
  stepDirection.value = 'backward';
  wizardStep.value = 0;
}

async function onIdentityConsult() {
  identityLoading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 450));
    toast.add({
      severity: 'info',
      summary: t('clients.identityConsultStubTitle'),
      detail: t('clients.identityConsultStubDetail'),
      life: 4500,
    });
  } finally {
    identityLoading.value = false;
  }
}

const canSubmitForm = computed(() => {
  if (!editingId.value) return false;
  const nameOk = !!form.value.name?.trim();
  return nameOk && editIsDirty.value;
});

function resetForm() {
  form.value = {
    clientKind: ClientKind.NATURAL,
    name: '',
    email: '',
    phone: '',
    documentId: '',
    notes: '',
  };
  editingId.value = null;
  errors.value = { name: '', documentId: '' };
  editSnapshot.value = '';
  createSnapshot.value = '';
  wizardStep.value = 0;
  stepDirection.value = 'forward';
}

function openCreate() {
  if (!canTrackableCreate.value) return;
  resetForm();
  dialogVisible.value = true;
  void nextTick(() => {
    createSnapshot.value = JSON.stringify(form.value);
    const el = firstFieldRef.value as unknown as { $el?: HTMLElement } | undefined;
    el?.$el?.querySelector?.('input')?.focus?.();
  });
}

function openEdit(row: ClientRow) {
  if (!canTrackableUpdate.value) return;
  editingId.value = row.id;
  errors.value = { name: '', documentId: '' };
  form.value = {
    clientKind: clientKindFromApi(row.clientKind),
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    documentId: row.documentId || '',
    notes: row.notes || '',
  };
  dialogVisible.value = true;
  void nextTick(() => {
    editSnapshot.value = JSON.stringify(form.value);
    const el = firstFieldRef.value as unknown as { $el?: HTMLElement } | undefined;
    el?.$el?.querySelector?.('input')?.focus?.();
  });
}

function attemptCloseFormDialog() {
  if (saving.value) return;
  if (formDialogBlockedByDirty.value && !window.confirm(t('common.discardChangesConfirm'))) return;
  dialogVisible.value = false;
}

function onFormDialogHide() {
  if (saving.value) return;
  resetForm();
}

function onFormKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || (e.target as HTMLElement)?.tagName?.toLowerCase() === 'textarea') return;
  if (saving.value) return;
  if (editingId.value) {
    if (!canSubmitForm.value) return;
    e.preventDefault();
    void saveClient();
    return;
  }
  if (wizardStep.value === 0) {
    if (!canGoNextWizardStep.value) return;
    e.preventDefault();
    nextWizardStep();
    return;
  }
  if (!canSubmitCreate.value) return;
  e.preventDefault();
  void saveClient();
}

function onFormSubmit() {
  if (!editingId.value) {
    if (wizardStep.value === 0) {
      nextWizardStep();
      return;
    }
    validateField('name');
    if (errors.value.name) return;
    void saveClient();
    return;
  }
  validateField('name');
  if (errors.value.name) return;
  void saveClient();
}

async function loadClients(page = 1) {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/clients', {
      params: {
        page,
        limit: rows.value,
        search: filters.value.search?.trim() || undefined,
      },
    });
    clients.value = data.data ?? [];
    totalRecords.value = data.total ?? 0;
  } catch {
    clients.value = [];
    totalRecords.value = 0;
  } finally {
    loading.value = false;
  }
}

function onPaginatorPage(event: { first: number; rows: number }) {
  first.value = event.first;
  rows.value = event.rows;
  loadClients(Math.floor(event.first / event.rows) + 1);
}

async function saveClient() {
  const name = form.value.name.trim();
  if (!name) {
    errors.value.name = t('clients.fieldNameRequired');
    return;
  }
  if (!editingId.value) {
    if (wizardStep.value !== 1) return;
    validateField('documentId');
    if (errors.value.documentId) return;
    if (!canTrackableCreate.value) return;
  } else {
    if (!canSubmitForm.value) return;
    if (!canTrackableUpdate.value) return;
  }
  saving.value = true;
  try {
    const docNorm = digitsOnly(form.value.documentId);
    const payload = {
      name,
      clientKind: form.value.clientKind,
      email: form.value.email.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      documentId: docNorm || undefined,
      notes: form.value.notes.trim() || undefined,
    };
    if (editingId.value) {
      await apiClient.patch(`/clients/${editingId.value}`, payload);
      toast.add({ severity: 'success', summary: t('clients.saved'), life: 2200 });
    } else {
      await apiClient.post('/clients', payload);
      toast.add({ severity: 'success', summary: t('clients.created'), life: 2200 });
    }
    dialogVisible.value = false;
    resetForm();
    await loadClients(Math.floor(first.value / rows.value) + 1);
  } catch {
    toast.add({ severity: 'error', summary: t('clients.saveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

const showDeleteConfirm = ref(false);
const deleteTarget = ref<ClientRow | null>(null);
const deleting = ref(false);

const deleteConsequences = computed(() => [
  t('clients.deleteConsequence1'),
  t('clients.deleteConsequence2'),
]);

function openDeleteDialog(row: ClientRow) {
  if (!canTrackableDelete.value) return;
  deleteTarget.value = row;
  showDeleteConfirm.value = true;
}

function onDeleteConfirmHide() {
  deleteTarget.value = null;
}

async function onDeleteConfirm() {
  const row = deleteTarget.value;
  if (!row || !canTrackableDelete.value) return;
  deleting.value = true;
  try {
    await apiClient.delete(`/clients/${row.id}`);
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
    toast.add({ severity: 'success', summary: t('clients.deleted'), life: 2200 });
    first.value = 0;
    await loadClients(1);
  } catch {
    toast.add({ severity: 'error', summary: t('clients.deleteError'), life: 4000 });
  } finally {
    deleting.value = false;
  }
}

watch(
  [authReady, canTrackableRead],
  ([ready, read]) => {
    if (ready && read) loadClients(1);
  },
  { immediate: true },
);

watch(
  () => form.value.clientKind,
  () => {
    errors.value.documentId = '';
  },
);
</script>

<style scoped>
.clients-command-toolbar {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--brand-zafiro) 6%, transparent);
}
.toolbar-iconfield {
  width: 100%;
}
.toolbar-iconfield :deep(.p-inputtext),
.toolbar-search :deep(.p-inputtext) {
  width: 100%;
  border-radius: 0.75rem;
}
:deep(.client-actions-header) {
  text-align: center !important;
}
:deep(.client-actions-cell) {
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
  margin: 0 !important;
}
:deep(.matter-action.p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}
:deep(.matter-action .p-button-icon) {
  font-size: 0.875rem;
}
.clients-dt-region :deep([data-pc-name='datatable']) {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}
.clients-data-table {
  min-width: 760px;
}
.clients-data-table :deep([data-pc-section='thead'] > tr > th) {
  background: var(--surface-raised);
  border-bottom: 1px solid var(--surface-border);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-muted);
}
:deep(.matter-dialog-root.p-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}
.matter-dialog-shell--client {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 14%, var(--surface-border));
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  /* Degradado de marca en el panel (alineado con cabeceras tipo matter-edit / confirm) */
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-hielo) 16%, var(--surface-raised)) 0%,
      var(--surface-raised) 40%,
      color-mix(in srgb, var(--brand-zafiro) 7%, var(--surface-raised)) 100%
    ),
    var(--surface-raised);
}
.matter-dialog-shell--client::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, #ffffff 26%, transparent) 0%,
    transparent 32%
  );
}
:global(html.dark) .matter-dialog-shell--client {
  border-color: color-mix(in srgb, var(--brand-hielo) 22%, var(--surface-border));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-zafiro) 18%, var(--surface-raised)) 0%,
      var(--surface-raised) 48%,
      color-mix(in srgb, var(--brand-abismo) 35%, var(--surface-raised)) 100%
    ),
    var(--surface-raised);
}
:global(html.dark) .matter-dialog-shell--client::before {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-hielo) 12%, transparent) 0%,
    transparent 36%
  );
}
.matter-dialog-shell--client .matter-dialog-header--client {
  position: relative;
  z-index: 1;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised)) 0%,
    color-mix(in srgb, var(--surface-raised) 88%, transparent) 100%
  );
}
:global(html.dark) .matter-dialog-shell--client .matter-dialog-header--client {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 14%, var(--surface-raised)) 0%,
    transparent 100%
  );
}
.matter-dialog-shell--client .matter-dialog-body,
.matter-dialog-shell--client .matter-dialog-footer {
  position: relative;
  z-index: 1;
}
.matter-dialog-icon {
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
}
/*
 * Eyebrow: degradado explícito aquí (el Dialog va a body; a veces la utility global no gana
 * en especificidad frente a estilos del panel).
 */
.matter-dialog-shell--client .matter-dialog-eyebrow.text-brand-gradient {
  display: inline-block;
  max-width: 100%;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background-image: linear-gradient(135deg, var(--brand-zafiro) 0%, var(--brand-real) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
:global(html.dark) .matter-dialog-shell--client .matter-dialog-eyebrow.text-brand-gradient {
  background-image: linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 45%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.matter-form-section__title-text.text-brand-gradient {
  display: inline-block;
  max-width: 100%;
  background-image: linear-gradient(135deg, var(--brand-zafiro) 0%, var(--brand-real) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
:global(html.dark) .matter-dialog-shell--client .matter-form-section__title-text.text-brand-gradient {
  background-image: linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 50%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.matter-form-section__title {
  margin: 0 0 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.client-wizard-step__circle {
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
  transition:
    background-color 220ms ease,
    color 220ms ease;
}
.client-wizard-step__circle--active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.client-wizard-step__circle--done {
  background: #10b981;
  color: #fff;
}
.client-wizard-step__line {
  height: 1px;
  background: var(--surface-border);
  transition: background-color 220ms ease;
}
.client-wizard-step__line--done {
  background: #10b981;
}
.step-fwd-enter-active,
.step-fwd-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition:
    opacity 240ms ease-out,
    transform 240ms ease-out;
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
</style>
