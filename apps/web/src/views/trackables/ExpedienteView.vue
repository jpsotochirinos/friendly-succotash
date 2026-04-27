<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-app)]">
    <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-border)] bg-[var(--surface-raised)]">
      <Dropdown
        :model-value="trackableId"
        :options="switcherOptions"
        option-label="title"
        option-value="id"
        filter
        filter-placeholder="Buscar expediente..."
        placeholder="Seleccionar expediente"
        :disabled="trackablesSwitcherLoading"
        class="min-w-[min(24rem,50vw)] max-w-xl flex-shrink"
        @update:model-value="onTrackableSwitch"
      />
      <div class="flex gap-2 flex-wrap justify-end">
        <Button
          icon="pi pi-refresh"
          label="Recargar"
          size="small"
          outlined
          @click="refreshCurrentTab"
        />
        <Button
          icon="pi pi-history"
          label="Bitácora"
          size="small"
          outlined
          @click="openActivityDrawer"
        />
        <Button
          v-tooltip.bottom="'Atajos (Ctrl+K)'"
          icon="pi pi-bolt"
          label="Acciones"
          size="small"
          outlined
          @click="commandPaletteVisible = true"
        />
        <Button
          v-if="activeTab === 1"
          icon="pi pi-plus"
          label="Nueva actividad"
          size="small"
          @click="() => openRootCreateDialog()"
        />
      </div>
    </div>

    <TabView v-model:activeIndex="activeTab" class="trackable-tabs flex min-h-0 flex-1 flex-col">
      <!-- Tab Resumen (portada) -->
      <TabPanel :value="0" header="Resumen">
        <div class="min-h-0 flex-1 overflow-auto p-4 md:p-6 space-y-6">
          <div class="flex flex-wrap gap-2">
            <Button
              icon="pi pi-plus"
              label="Nueva actividad"
              size="small"
              :disabled="!canCreateWorkflowItem"
              @click="quickNewActuacion"
            />
            <Button
              icon="pi pi-calendar-plus"
              label="Agendar audiencia"
              size="small"
              severity="secondary"
              outlined
              :disabled="!canCreateWorkflowItem"
              @click="openScheduleHearingDialog"
            />
            <Button
              icon="pi pi-folder-open"
              label="Documentos"
              size="small"
              severity="secondary"
              outlined
              @click="goToDocumentosTab"
            />
            <Button
              icon="pi pi-cloud-download"
              size="small"
              severity="secondary"
              outlined
              class="shrink-0"
              v-tooltip.bottom="'SINOE y fuentes externas'"
              aria-label="SINOE y fuentes externas"
              @click="openSinoeQuickDialog"
            />
          </div>

          <!-- Hero: carátula ejecutiva del expediente -->
          <div
            class="exp-hero-entrance relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-md md:p-6"
          >
            <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
            <div
              class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#0F6E7A]/10 blur-3xl dark:bg-emerald-300/10"
            />
            <div class="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div class="min-w-0">
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge :status="caseForm.status" />
                  <span
                    v-if="caseForm.expedientNumber?.trim()"
                    class="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--surface-border)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--fg-muted)] dark:bg-white/5"
                  >
                    <i class="pi pi-hashtag text-[10px]" />
                    <span class="truncate">{{ caseForm.expedientNumber.trim() }}</span>
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-full bg-[#0F6E7A]/10 px-2.5 py-1 text-xs font-medium text-[#0F6E7A] dark:bg-emerald-300/10 dark:text-emerald-200">
                    <i class="pi pi-briefcase text-[10px]" />
                    {{ caseDisplayMatterLabel }}
                  </span>
                </div>
                <h2 class="m-0 text-2xl font-semibold leading-tight text-[var(--fg-default)] md:text-3xl">
                  {{ caseForm.title || 'Sin título' }}
                </h2>
                <p class="m-0 mt-2 text-sm text-[var(--fg-muted)]">
                  <i class="pi pi-building-columns mr-1 text-xs" />
                  {{ caseForm.court?.trim() || 'Órgano jurisdiccional pendiente' }}
                </p>

                <div class="mt-5 grid gap-3 md:grid-cols-3">
                  <div class="rounded-xl border border-[var(--surface-border)] bg-white/65 p-3 dark:bg-white/5">
                    <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Cliente</p>
                    <p class="m-0 mt-1 truncate text-sm font-medium text-[var(--fg-default)]">{{ caseDisplayClientName }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--surface-border)] bg-white/65 p-3 dark:bg-white/5">
                    <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Contraparte</p>
                    <p class="m-0 mt-1 truncate text-sm font-medium text-[var(--fg-default)]">
                      {{ caseForm.counterpartyName?.trim() || '—' }}
                    </p>
                  </div>
                  <div class="rounded-xl border border-[var(--surface-border)] bg-white/65 p-3 dark:bg-white/5">
                    <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Abogado a cargo</p>
                    <p class="m-0 mt-1 truncate text-sm font-medium text-[var(--fg-default)]">{{ caseDisplayAssignee }}</p>
                  </div>
                </div>
              </div>

              <aside class="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900/70 dark:text-amber-100/70">
                      Próxima actuación clave
                    </p>
                    <template v-if="nextHearing">
                      <h3 class="m-0 mt-2 text-base font-semibold leading-snug text-amber-950 dark:text-amber-50">
                        {{ nextHearing.title }}
                      </h3>
                      <p class="m-0 mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
                        {{ nextHearingLabel(nextHearing) }}
                        <span v-if="nextHearing.dueDate"> · {{ formatDate(String(nextHearing.dueDate)) }}</span>
                      </p>
                    </template>
                    <p v-else class="m-0 mt-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                      Sin audiencia ni plazo legal próximo en el flujo.
                    </p>
                  </div>
                  <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-900 dark:bg-amber-300/15 dark:text-amber-100">
                    <i class="pi pi-calendar-clock text-sm" />
                  </span>
                </div>
                <div class="mt-4 flex items-center justify-end gap-1">
                  <Button
                    v-if="canEditTrackable"
                    icon="pi pi-pencil"
                    text
                    rounded
                    severity="secondary"
                    v-tooltip.bottom="'Editar ficha (desplaza al panel)'"
                    aria-label="Editar ficha"
                    @click="scrollToFichaAndEdit"
                  />
                  <Button icon="pi pi-refresh" text rounded v-tooltip.bottom="'Actualizar métricas'" aria-label="Actualizar métricas" @click="loadDashboardData" />
                </div>
              </aside>
            </div>
          </div>

          <!-- Ficha del expediente (datos generales y partes) -->
          <div
            ref="fichaSectionRef"
            class="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm overflow-hidden scroll-mt-6"
          >
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                @click="fichaSectionOpen = !fichaSectionOpen"
              >
                <span class="text-sm font-semibold text-[var(--fg-default)]">Ficha del expediente</span>
                <i
                  class="pi pi-chevron-down ficha-chevron text-[var(--fg-subtle)]"
                  :class="{ 'is-open': fichaSectionOpen }"
                  aria-hidden="true"
                />
              </button>
              <div
                class="ficha-collapse" :class="{ 'is-open': fichaSectionOpen }"
              >
              <div class="overflow-hidden">
              <div
                class="px-4 pb-6 pt-0 border-t border-[var(--surface-border)] space-y-6"
              >
              <div class="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6 shadow-sm mt-4">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 class="text-base font-semibold text-[var(--fg-default)]">
                    Datos generales
                  </h2>
                  <div class="flex flex-wrap items-center gap-2">
                    <Button
                      v-if="canEditTrackable && !caseGeneralEditing"
                      label="Editar"
                      icon="pi pi-pencil"
                      size="small"
                      outlined
                      @click="caseGeneralEditing = true"
                    />
                    <template v-else-if="canEditTrackable && caseGeneralEditing">
                      <Button
                        label="Cancelar"
                        icon="pi pi-times"
                        size="small"
                        text
                        :disabled="caseSaving"
                        @click="cancelEditCaseGeneral"
                      />
                      <Button
                        label="Guardar"
                        icon="pi pi-check"
                        size="small"
                        :loading="caseSaving"
                        @click="saveCase"
                      />
                    </template>
                  </div>
                </div>

                <div v-if="!caseGeneralEditing" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div class="md:col-span-2">
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Nombre del expediente</p>
                    <p class="text-[var(--fg-default)] font-medium">{{ caseForm.title || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">N.º de expediente</p>
                    <p class="text-[var(--fg-default)]">{{ caseForm.expedientNumber?.trim() || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Juzgado / órgano</p>
                    <p class="text-[var(--fg-default)]">{{ caseForm.court?.trim() || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Jurisdicción</p>
                    <p class="text-[var(--fg-default)]">{{ caseForm.jurisdiction?.trim() || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Cliente</p>
                    <p class="text-[var(--fg-default)]">{{ caseDisplayClientName }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Contraparte</p>
                    <p class="text-[var(--fg-default)]">{{ caseForm.counterpartyName?.trim() || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Tipo de servicio</p>
                    <p class="text-[var(--fg-default)]">{{ caseDisplayMatterLabel }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Abogado a cargo</p>
                    <p class="text-[var(--fg-default)]">{{ caseDisplayAssignee }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Tipo</p>
                    <p class="text-[var(--fg-default)]">{{ caseDisplayType }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Estado</p>
                    <StatusBadge :status="caseForm.status" />
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Vencimiento</p>
                    <p v-if="caseForm.dueDate" class="text-[var(--fg-default)]">
                      {{
                        new Date(caseForm.dueDate).toLocaleDateString('es-PE', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }}
                    </p>
                    <p v-else class="text-[var(--fg-subtle)]">—</p>
                  </div>
                  <div class="md:col-span-2">
                    <p class="text-xs font-medium text-[var(--fg-muted)] mb-1">Resumen del caso</p>
                    <p class="text-[var(--fg-default)] whitespace-pre-wrap">{{ caseForm.description?.trim() || '—' }}</p>
                  </div>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2 space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]" for="case-title">Nombre del expediente</label>
                    <InputText
                      id="case-title"
                      v-model="caseForm.title"
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]" for="case-expedient">N.º de expediente</label>
                    <InputText
                      id="case-expedient"
                      v-model="caseForm.expedientNumber"
                      class="w-full"
                      placeholder="Ej. 01234-2024-0-1234-JR-LA-01"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]" for="case-court">Juzgado / órgano</label>
                    <InputText
                      id="case-court"
                      v-model="caseForm.court"
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]" for="case-jurisdiction">Jurisdicción (código)</label>
                    <InputText
                      id="case-jurisdiction"
                      v-model="caseForm.jurisdiction"
                      class="w-full"
                      maxlength="8"
                      placeholder="PE"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]">Cliente</label>
                    <Dropdown
                      v-model="caseForm.clientId"
                      :options="clientsOptions"
                      option-label="name"
                      option-value="id"
                      placeholder="Seleccionar cliente"
                      filter
                      show-clear
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]" for="case-counterparty">Contraparte</label>
                    <InputText
                      id="case-counterparty"
                      v-model="caseForm.counterpartyName"
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]">Tipo de servicio</label>
                    <Dropdown
                      v-model="caseForm.matterType"
                      :options="matterTypeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]">Abogado a cargo</label>
                    <Dropdown
                      v-model="caseForm.assignedToId"
                      :options="userOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Sin asignar"
                      filter
                      show-clear
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]">Tipo</label>
                    <Dropdown
                      v-model="caseForm.type"
                      :options="typeSelectOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]">Estado</label>
                    <Dropdown
                      v-model="caseForm.status"
                      :options="trackableStatusEditOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]">Fecha de vencimiento</label>
                    <Calendar
                      v-model="caseForm.dueDate"
                      date-format="dd/mm/yy"
                      placeholder="dd/mm/aaaa"
                      show-icon
                      class="w-full"
                    />
                  </div>
                  <div class="md:col-span-2 space-y-2">
                    <label class="text-sm font-medium text-[var(--fg-muted)]" for="case-desc">Resumen del caso</label>
                    <Textarea
                      id="case-desc"
                      v-model="caseForm.description"
                      class="w-full"
                      rows="4"
                      auto-resize
                    />
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 class="text-sm font-semibold text-[var(--fg-default)] m-0">Partes del expediente</h3>
                  <Button
                    v-if="canEditTrackable"
                    icon="pi pi-plus"
                    label="Añadir parte"
                    size="small"
                    @click="openPartyDialog()"
                  />
                </div>
                <p v-if="partiesLoading" class="text-sm text-[var(--fg-muted)]">Cargando partes…</p>
                <p v-else-if="!trackableParties.length" class="text-sm text-[var(--fg-muted)] m-0">
                  No hay partes adicionales registradas. El cliente de la firma y la contraparte siguen en «Datos generales».
                </p>
                <DataTable v-else :value="trackableParties" size="small" striped-rows>
                  <Column field="role" header="Rol">
                    <template #body="{ data }">
                      {{ partyRoleLabel(data.role) }}
                    </template>
                  </Column>
                  <Column field="partyName" header="Nombre" />
                  <Column field="documentId" header="Documento" />
                  <Column header="Acciones">
                    <template #body="{ data }">
                      <Button
                        v-if="canEditTrackable"
                        icon="pi pi-pencil"
                        text
                        rounded
                        size="small"
                        @click="openPartyDialog(data)"
                      />
                      <Button
                        v-if="canEditTrackable"
                        icon="pi pi-trash"
                        text
                        rounded
                        severity="danger"
                        size="small"
                        @click="deletePartyRow(data)"
                      />
                    </template>
                  </Column>
                </DataTable>
              </div>
            </div>
          </div>
          </div>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="(card, cardIdx) in summaryCards"
              :key="card.id"
              class="exp-summary-card group relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              :style="{ '--stagger-delay': `${cardIdx * 60}ms` }"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100"
                :class="card.tone"
              />
              <div class="relative flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="m-0 text-xs font-medium text-[var(--fg-muted)]">{{ card.label }}</p>
                  <p class="m-0 mt-2 text-3xl font-semibold tracking-tight text-[var(--fg-default)] tabular-nums">
                    {{ card.value }}
                  </p>
                  <p v-if="card.hint" class="m-0 mt-1.5 text-xs font-medium leading-snug text-[var(--fg-muted)]">
                    {{ card.hint }}
                  </p>
                </div>
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/75 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10"
                  :class="card.tone"
                >
                  <i :class="card.icon" class="text-sm" />
                </span>
              </div>
            </div>
          </div>

          <!-- Avance general (misma lógica que el pie del tab Actividades / ProcessStageBoardView) -->
          <div
            class="relative w-full overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-md md:p-6"
          >
            <div
              class="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#3FB58C]/10 via-[#0F6E7A]/5 to-transparent"
            />
            <div class="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:items-center">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F6E7A]/10 text-[#0F6E7A] dark:bg-emerald-300/10 dark:text-emerald-300"
                  >
                    <i class="pi pi-balance-scale text-sm" />
                  </span>
                  <div class="min-w-0">
                    <p class="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">
                      {{ t('trackables.expedienteSummary.legalControl') }}
                    </p>
                    <h3 class="m-0 text-lg font-semibold text-[var(--fg-default)]">
                      {{ t('trackables.expedienteSummary.avanceTitle') }}
                    </h3>
                  </div>
                </div>
                <p class="m-0 mt-3 max-w-3xl text-sm leading-relaxed text-[var(--fg-muted)]">
                  <template v-if="expedienteActivityMetrics.total > 0">
                    {{ t('trackables.expedienteSummary.legalControlSubtitle') }}
                  </template>
                  <template v-else>
                    {{ t('trackables.expedienteSummary.avanceEmpty') }}
                  </template>
                </p>
              </div>

              <div
                v-if="expedienteActivityMetrics.total > 0"
                class="grid gap-2 sm:grid-cols-3 xl:grid-cols-1"
              >
                <div class="rounded-xl border border-[var(--surface-border)] bg-white/70 px-3 py-2 dark:bg-white/5">
                  <p class="m-0 text-[11px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">
                    {{ t('trackables.expedienteSummary.completedPct', { n: expedienteActivityMetrics.donePct }) }}
                  </p>
                  <div
                    class="mt-2 relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700/80"
                  >
                    <div
                      class="absolute inset-y-0 left-0 h-full rounded-full bg-slate-400/45 dark:bg-slate-500/35 transition-[width]"
                      :style="{ width: expedienteActivityMetrics.globalActivePct + '%' }"
                    />
                    <div
                      class="absolute inset-y-0 left-0 h-full rounded-full transition-[width]"
                      :style="{
                        width: expedienteActivityMetrics.donePct + '%',
                        background: 'linear-gradient(90deg, #0F6E7A 0%, #2D3FBF 50%, #3FB58C 100%)',
                      }"
                      role="progressbar"
                      :aria-valuenow="expedienteActivityMetrics.donePct"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      :aria-label="t('trackables.expedienteSummary.avanceTitle')"
                    />
                  </div>
                </div>
                <div
                  class="rounded-xl border px-3 py-2"
                  :class="
                    expedienteActivityMetrics.overdue
                      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100'
                  "
                >
                  <p class="m-0 text-[11px] font-medium uppercase tracking-wide opacity-75">
                    {{ t('trackables.expedienteSummary.overdue') }}
                  </p>
                  <p class="m-0 mt-1 text-sm font-semibold">
                    <i
                      class="pi mr-1 text-xs"
                      :class="expedienteActivityMetrics.overdue ? 'pi-exclamation-triangle' : 'pi-check-circle'"
                    />
                    {{
                      expedienteActivityMetrics.overdue
                        ? t('trackables.expedienteSummary.criticalOverdue', { n: expedienteActivityMetrics.overdue })
                        : t('trackables.expedienteSummary.noCriticalOverdue')
                    }}
                  </p>
                </div>
                <div class="rounded-xl border border-[var(--surface-border)] bg-white/70 px-3 py-2 dark:bg-white/5">
                  <p class="m-0 text-[11px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">
                    {{ t('trackables.expedienteSummary.next14Days') }}
                  </p>
                  <p class="m-0 mt-1 text-sm font-semibold text-[var(--fg-default)]">
                    {{ t('trackables.expedienteSummary.nextDeadlinesShort', { n: dashboardDeadlines.length }) }}
                  </p>
                </div>
              </div>
            </div>

            <ul
              v-if="expedienteActivityMetrics.total > 0"
              class="relative m-0 mt-5 flex list-none flex-wrap gap-x-5 gap-y-2 border-t border-[var(--surface-border)] pt-4 pl-0 text-xs text-[var(--fg-muted)]"
            >
              <li class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 shrink-0 rounded-full bg-[#3FB58C]" />
                <span>{{ expedienteActivityMetrics.done }} {{ t('trackables.expedienteSummary.legendDone') }}</span>
              </li>
              <li class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 shrink-0 rounded-full bg-[#E8A33D]" />
                <span>{{ expedienteActivityMetrics.inProgress }} {{ t('trackables.expedienteSummary.legendInProgress') }}</span>
              </li>
              <li
                v-if="expedienteActivityMetrics.overdue"
                class="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-200"
              >
                <i class="pi pi-exclamation-triangle text-xs" />
                <span>{{ expedienteActivityMetrics.overdue }} {{ t('trackables.expedienteSummary.legendOverdue') }}</span>
              </li>
              <li class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                <span>{{ expedienteActivityMetrics.total }} {{ t('trackables.expedienteSummary.legendTotal') }}</span>
              </li>
            </ul>
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div class="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm">
              <div class="flex flex-wrap items-center gap-2 border-b border-[var(--surface-border)] px-4 py-3">
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
                  <i class="pi pi-gavel text-sm" />
                </span>
                <div class="min-w-0 flex-1">
                  <h3 class="m-0 text-sm font-semibold text-[var(--fg-default)]">Agenda procesal y plazos</h3>
                  <p class="m-0 mt-0.5 text-xs text-[var(--fg-muted)]">Prioriza vencidos, hoy y próximos hitos legales.</p>
                </div>
                <Tag v-if="dashboardOverdueCount > 0" :value="`${dashboardOverdueCount} vencidos`" severity="danger" />
                <Tag value="Plazo legal" severity="danger" class="text-[10px]" />
              </div>
              <div class="p-2">
                <Accordion multiple :value="['0', '1', '2', '3']">
                  <AccordionPanel value="0">
                    <AccordionHeader>
                      <span class="flex items-center gap-2 w-full">
                        <span class="text-red-600 dark:text-red-400 font-medium">Vencidos</span>
                        <Tag :value="String(deadlineGroups.overdue.length)" severity="danger" rounded />
                      </span>
                    </AccordionHeader>
                    <AccordionContent>
                      <DataTable
                        v-if="deadlineGroups.overdue.length"
                        :value="deadlineGroups.overdue"
                        striped-rows
                        size="small"
                        class="text-sm"
                      >
                        <Column field="title" header="Actividad" />
                        <Column field="due_date" header="Vencimiento">
                          <template #body="{ data }">
                            <span class="text-red-600 font-semibold">{{ formatDate(data.due_date) }}</span>
                          </template>
                        </Column>
                        <Column field="assigned_to_name" header="Asignado" />
                        <Column header="" class="w-[4rem]">
                          <template #body="{ data }">
                            <Button label="Abrir" size="small" link @click="openDeadlineRow(data)" />
                          </template>
                        </Column>
                      </DataTable>
                      <p v-else class="text-sm text-[var(--fg-muted)] m-0 py-3 px-2">Ninguno</p>
                    </AccordionContent>
                  </AccordionPanel>
                  <AccordionPanel value="1">
                    <AccordionHeader>
                      <span class="flex items-center gap-2 w-full">
                        <span class="text-orange-700 dark:text-orange-300 font-medium">Hoy</span>
                        <Tag :value="String(deadlineGroups.today.length)" severity="warn" rounded />
                      </span>
                    </AccordionHeader>
                    <AccordionContent>
                      <DataTable
                        v-if="deadlineGroups.today.length"
                        :value="deadlineGroups.today"
                        striped-rows
                        size="small"
                        class="text-sm"
                      >
                        <Column field="title" header="Actividad" />
                        <Column field="due_date" header="Vencimiento">
                          <template #body="{ data }">
                            {{ formatDate(data.due_date) }}
                          </template>
                        </Column>
                        <Column field="assigned_to_name" header="Asignado" />
                        <Column header="" class="w-[4rem]">
                          <template #body="{ data }">
                            <Button label="Abrir" size="small" link @click="openDeadlineRow(data)" />
                          </template>
                        </Column>
                      </DataTable>
                      <p v-else class="text-sm text-[var(--fg-muted)] m-0 py-3 px-2">Ninguno</p>
                    </AccordionContent>
                  </AccordionPanel>
                  <AccordionPanel value="2">
                    <AccordionHeader>
                      <span class="flex items-center gap-2 w-full">
                        <span class="text-amber-800 dark:text-amber-200 font-medium">Próx. 7 días</span>
                        <Tag :value="String(deadlineGroups.week.length)" severity="secondary" rounded />
                      </span>
                    </AccordionHeader>
                    <AccordionContent>
                      <DataTable
                        v-if="deadlineGroups.week.length"
                        :value="deadlineGroups.week"
                        striped-rows
                        size="small"
                        class="text-sm"
                      >
                        <Column field="title" header="Actividad" />
                        <Column field="due_date" header="Vencimiento">
                          <template #body="{ data }">
                            {{ formatDate(data.due_date) }}
                          </template>
                        </Column>
                        <Column field="assigned_to_name" header="Asignado" />
                        <Column header="" class="w-[4rem]">
                          <template #body="{ data }">
                            <Button label="Abrir" size="small" link @click="openDeadlineRow(data)" />
                          </template>
                        </Column>
                      </DataTable>
                      <p v-else class="text-sm text-[var(--fg-muted)] m-0 py-3 px-2">Ninguno</p>
                    </AccordionContent>
                  </AccordionPanel>
                  <AccordionPanel value="3">
                    <AccordionHeader>
                      <span class="flex items-center gap-2 w-full">
                        <span class="text-[var(--fg-default)] font-medium">8 – 14 días</span>
                        <Tag :value="String(deadlineGroups.twoWeeks.length)" severity="secondary" rounded />
                      </span>
                    </AccordionHeader>
                    <AccordionContent>
                      <DataTable
                        v-if="deadlineGroups.twoWeeks.length"
                        :value="deadlineGroups.twoWeeks"
                        striped-rows
                        size="small"
                        class="text-sm"
                      >
                        <Column field="title" header="Actividad" />
                        <Column field="due_date" header="Vencimiento">
                          <template #body="{ data }">
                            {{ formatDate(data.due_date) }}
                          </template>
                        </Column>
                        <Column field="assigned_to_name" header="Asignado" />
                        <Column header="" class="w-[4rem]">
                          <template #body="{ data }">
                            <Button label="Abrir" size="small" link @click="openDeadlineRow(data)" />
                          </template>
                        </Column>
                      </DataTable>
                      <p v-else class="text-sm text-[var(--fg-muted)] m-0 py-3 px-2">Ninguno</p>
                    </AccordionContent>
                  </AccordionPanel>
                </Accordion>
              </div>
            </div>

            <div class="space-y-6">
              <div class="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm">
                <div class="border-b border-[var(--surface-border)] px-4 py-3">
                  <h3 class="m-0 text-sm font-semibold text-[var(--fg-default)]">Próximas actuaciones</h3>
                  <p class="m-0 mt-0.5 text-xs text-[var(--fg-muted)]">Trabajo activo o en revisión, ordenado por vencimiento.</p>
                </div>
                <ul v-if="nextActividades.length" class="divide-y divide-[var(--surface-border)] m-0 p-0 list-none">
                  <li
                    v-for="item in nextActividades"
                    :key="item.id"
                    class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-sunken)]/40"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="m-0 truncate text-sm font-medium text-[var(--fg-default)]">{{ item.title }}</p>
                      <div class="flex flex-wrap items-center gap-2 mt-1">
                        <Tag v-if="item.kind" :value="item.kind" severity="secondary" class="text-[10px]" />
                        <span v-if="item.dueDate" class="text-xs text-[var(--fg-muted)]">
                          {{ formatDate(String(item.dueDate)) }}
                        </span>
                        <span v-else class="text-xs text-[var(--fg-subtle)]">Sin fecha</span>
                      </div>
                    </div>
                    <Button label="Abrir" size="small" outlined @click="openSidebar(item)" />
                  </li>
                </ul>
                <p v-else class="text-sm text-[var(--fg-muted)] m-0 px-4 py-6 text-center">No hay actividades activas pendientes.</p>
              </div>

              <div class="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-sm">
                <div class="border-b border-[var(--surface-border)] px-4 py-3">
                  <h3 class="m-0 text-sm font-semibold text-[var(--fg-default)]">Equipo responsable</h3>
                  <p class="m-0 mt-0.5 text-xs text-[var(--fg-muted)]">Carga abierta por abogado o miembro asignado.</p>
                </div>
                <ul v-if="teamMembers.length" class="m-0 p-0 list-none">
                  <li
                    v-for="m in teamMembers"
                    :key="m.userId"
                    class="exp-team-row flex items-center gap-3 px-4 py-3 border-b border-[var(--surface-border)] last:border-0 transition-colors duration-150"
                  >
                    <Avatar :label="m.initials" shape="circle" class="bg-[var(--accent-soft)] text-[var(--accent)] shrink-0" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-[var(--fg-default)] m-0 truncate">{{ m.name }}</p>
                      <p class="text-xs text-[var(--fg-muted)] m-0">
                        Pend. {{ m.pending }} · En curso {{ m.inProgress }} · Revisión {{ m.underReview }}
                        <span class="text-[var(--fg-subtle)]">({{ m.total }} total)</span>
                      </p>
                    </div>
                  </li>
                </ul>
                <p v-else class="text-sm text-[var(--fg-muted)] m-0 px-4 py-6 text-center">Sin asignaciones abiertas.</p>
              </div>
            </div>
          </div>

        </div>
      </TabPanel>

      <!-- Tab Actividades: flujo (etapas) o tablero por estado (hasta reemplazo por vistas híbridas) -->
      <TabPanel :value="1" :header="t('trackables.tabActivities')">
        <div class="flex min-h-0 min-h-[min(58vh,30rem)] flex-1 flex-col overflow-hidden">
          <div
            v-if="primaryProcessTrackId"
            class="flow-first-panel flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <ProcessStageBoardView
              ref="processBoardRef"
              :process-track-id="primaryProcessTrackId"
              :trackable-id="trackableId"
              :upload-folder-id="rootFolderId"
              class="min-h-0 flex-1"
              @open-create-activity="onOpenCreateActivityFromBoard"
              @open-activity="onOpenActivityFromBoard"
            />
          </div>
          <div
            v-else
            class="flow-first-panel flex min-h-0 min-h-[min(40vh,20rem)] flex-1 flex-col items-center justify-center gap-4 border-b border-[var(--surface-border)] p-8 text-center"
          >
            <p class="max-w-md text-sm text-[var(--fg-muted)]">
              {{ t('processTrack.emptyState.body') }}
            </p>
            <Button
              :label="t('processTrack.emptyState.createButton')"
              icon="pi pi-sitemap"
              :loading="creatingProcessTrack"
              :disabled="!canEditTrackable"
              @click="ensureFreeformProcessTrack"
            />
          </div>
        </div>
      </TabPanel>

      <!-- Tab Documentos -->
      <TabPanel :value="2" header="Documentos">
        <div class="flex-1 min-h-0 flex flex-col h-full">
          <FolderBrowserView :trackable-id="trackableId" :user-permissions="userPermissions" />
        </div>
      </TabPanel>

      <!-- Tab Calendario: mismos plazos e hitos que las actividades del expediente -->
      <TabPanel :value="3" header="Calendario">
        <div class="flex flex-col gap-4 min-h-0 flex-1 p-4 md:p-6 overflow-auto">
          <p class="text-sm text-[var(--fg-muted)] m-0">
            Audiencias, plazos y vencimientos vinculados a las
            <button
              type="button"
              class="font-medium text-primary-600 dark:text-primary-400 underline decoration-primary-400/50 hover:decoration-primary-500"
              @click="openActividadesTab"
            >
              actividades
            </button>
            de este expediente.
          </p>
          <div class="flex flex-wrap justify-end gap-2">
            <Button
              icon="pi pi-calendar-plus"
              label="Agendar audiencia"
              size="small"
              :disabled="!canCreateWorkflowItem"
              @click="openScheduleHearingDialog"
            />
          </div>
          <div class="flex flex-col xl:flex-row gap-4 min-h-0">
            <CalendarSidebar
              v-model="calNavDate"
              panel-id="expediente-calendar-sidebar"
              :kpis="calKpiCards"
              :events-by-day="calEventsByDayMap"
              :trackable-options="[]"
              :user-options="calUserOptions"
              :show-assignee-filter="true"
              @select-date="onCalSidebarDate"
            />
            <div class="flex-1 min-w-0 flex flex-col gap-3">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex flex-wrap items-center gap-2 min-w-0">
                  <ButtonGroup>
                    <Button
                      v-tooltip.bottom="t('globalCalendar.navPrev')"
                      icon="pi pi-chevron-left"
                      outlined
                      size="small"
                      type="button"
                      @click="calCalendarPrev"
                    />
                    <Button
                      v-tooltip.bottom="t('globalCalendar.navNext')"
                      icon="pi pi-chevron-right"
                      outlined
                      size="small"
                      type="button"
                      @click="calCalendarNext"
                    />
                    <Button :label="t('globalCalendar.today')" outlined size="small" type="button" @click="calCalendarToday" />
                  </ButtonGroup>
                  <h2 class="text-xl md:text-2xl font-semibold m-0 text-[var(--fg-default)] truncate">
                    {{ calDisplayRangeTitle }}
                  </h2>
                </div>
                <div class="flex flex-wrap gap-2 items-center justify-end">
                  <IconField class="w-full sm:w-auto">
                    <InputIcon class="pi pi-search" />
                    <InputText
                      id="trackable-cal-search-input"
                      v-model="calSearchQ"
                      class="w-full sm:w-64"
                      :placeholder="t('globalCalendar.searchPlaceholder')"
                    />
                  </IconField>
                  <div class="flex flex-wrap gap-1 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-sunken)]/35 p-1">
                    <Button
                      v-for="opt in calViewButtonOptions"
                      :key="opt.value"
                      size="small"
                      :icon="opt.icon"
                      :label="opt.label"
                      :aria-pressed="calViewMode === opt.value"
                      :class="calViewMode === opt.value ? 'shadow-sm' : ''"
                      :severity="calViewMode === opt.value ? 'primary' : 'secondary'"
                      type="button"
                      @click="setCalViewMode(opt.value)"
                    />
                  </div>
                </div>
              </div>
              <DaySummaryBar
                :conflicts="calSummaryConflicts"
                :due-today="calSummaryDueToday"
                :unassigned="calSummaryUnassigned"
                :birthdays="0"
                @open-conflicts="calShowConflictDialog = true"
              />
              <p v-if="calLoadError" class="text-sm text-red-600 dark:text-red-400 m-0">{{ calLoadError }}</p>
              <div
                class="rounded-xl border border-[var(--surface-border)] overflow-hidden bg-[var(--surface-raised)] p-1 min-h-[480px]"
              >
                <FullCalendar v-if="calFcReady" ref="calFcRef" :options="calFcOptions" />
              </div>
            </div>
          </div>
        </div>

        <Dialog
          v-model:visible="calShowConflictDialog"
          :header="t('globalCalendar.drawerConflictTitle')"
          modal
          :style="{ width: 'min(520px, 95vw)' }"
        >
          <ul v-if="calConflictPairs.length" class="m-0 p-0 list-none space-y-2 text-sm">
            <li
              v-for="(pair, idx) in calConflictPairs"
              :key="idx"
              class="rounded-lg border border-[var(--surface-border)] p-2"
            >
              <span class="font-medium">{{ pair.a.title }}</span>
              <span class="text-[var(--fg-muted)]"> · </span>
              <span class="font-medium">{{ pair.b.title }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-[var(--fg-muted)] m-0">{{ t('globalCalendar.summaryNoConflicts') }}</p>
        </Dialog>
      </TabPanel>
    </TabView>

    <Drawer
      v-model:visible="activityDrawerVisible"
      header="Bitácora del expediente"
      position="right"
      class="w-full md:w-[min(40rem,100vw)]"
    >
      <div class="flex flex-col gap-4 h-full">
        <div class="flex flex-wrap gap-2 items-center">
          <label class="text-xs text-[var(--fg-muted)]">Filtrar por acción</label>
          <InputText v-model="activityDrawerActionFilter" placeholder="contiene…" class="flex-1 min-w-[8rem]" />
        </div>
        <div v-if="drawerActivityLoading" class="text-sm text-[var(--fg-muted)] py-8 text-center">Cargando…</div>
        <ul v-else class="space-y-0 flex-1 overflow-y-auto m-0 p-0 list-none">
          <li
            v-for="(log, idx) in filteredDrawerActivityLog"
            :key="log.id"
            class="flex gap-3"
          >
            <div class="flex flex-col items-center shrink-0 w-3 pt-1">
              <span class="h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)] bg-[var(--surface-raised)]" />
              <span
                v-if="idx < filteredDrawerActivityLog.length - 1"
                class="w-px flex-1 min-h-[1.5rem] bg-[var(--surface-border)]"
              />
            </div>
            <div class="flex-1 flex items-start justify-between gap-2 pb-4">
              <div class="min-w-0">
                <p class="text-sm text-[var(--fg-default)]">
                  <span class="font-medium">{{ formatActivityAction(log.action) }}</span>
                  <span class="text-[var(--fg-muted)]"> · {{ formatActivityEntity(log.entityType) }}</span>
                </p>
                <p class="text-xs text-[var(--fg-muted)] mt-0.5">
                  {{ formatDateTime(log.createdAt) }}
                  <span v-if="log.user"> · {{ log.user.firstName || log.user.email }}</span>
                </p>
              </div>
              <Button
                v-if="canOpenActivityLog(log)"
                label="Ver"
                size="small"
                link
                class="shrink-0"
                @click="openActivityLogEntry(log); activityDrawerVisible = false"
              />
            </div>
          </li>
        </ul>
        <p v-if="!drawerActivityLoading && !filteredDrawerActivityLog.length" class="text-sm text-[var(--fg-muted)] py-6 text-center">
          Sin entradas con este filtro
        </p>
      </div>
    </Drawer>

    <Dialog
      v-model:visible="commandPaletteVisible"
      header="Acciones rápidas"
      modal
      :style="{ width: 'min(420px, 96vw)' }"
    >
      <p class="text-xs text-[var(--fg-muted)] m-0 mb-2">Atajo: Ctrl+K o Cmd+K</p>
      <InputText
        v-model="commandPaletteFilter"
        placeholder="Buscar acción…"
        class="w-full mb-3"
        autofocus
      />
      <ul class="m-0 p-0 list-none space-y-1 max-h-[50vh] overflow-y-auto">
        <li v-for="cmd in filteredCommandPalette" :key="cmd.id">
          <button
            type="button"
            class="w-full text-left px-3 py-2 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--surface-sunken)] text-sm flex justify-between gap-2"
            @click="runCommandPalette(cmd)"
          >
            <span>{{ cmd.label }}</span>
            <span class="text-[var(--fg-subtle)] text-xs">{{ cmd.hint }}</span>
          </button>
        </li>
      </ul>
    </Dialog>

    <Dialog
      v-model:visible="partyDialogVisible"
      :header="editingPartyId ? 'Editar parte' : 'Nueva parte'"
      modal
      :style="{ width: 'min(440px, 96vw)' }"
    >
      <div class="flex flex-col gap-3 pt-2">
        <div class="space-y-1">
          <label class="text-sm font-medium">Rol</label>
          <Dropdown
            v-model="partyForm.role"
            :options="partyRoleOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Nombre o razón social</label>
          <InputText v-model="partyForm.partyName" class="w-full" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Documento (DNI/RUC)</label>
          <InputText v-model="partyForm.documentId" class="w-full" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Email</label>
          <InputText v-model="partyForm.email" class="w-full" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Teléfono</label>
          <InputText v-model="partyForm.phone" class="w-full" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Notas</label>
          <Textarea v-model="partyForm.notes" class="w-full" rows="2" auto-resize />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="partyDialogVisible = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="partySaving" :disabled="!partyForm.partyName.trim()" @click="saveParty" />
      </template>
    </Dialog>

    <!-- Detalle de actividad (modal centrado, misma familia que «Nueva actividad») -->
    <Dialog
      :visible="!!editingItem"
      modal
      dismissable-mask
      class="item-detail-dialog"
      :style="{ width: 'min(72rem, 96vw)' }"
      :content-style="itemDetailDialogContentStyle"
      :breakpoints="{ '960px': '95vw' }"
      @update:visible="onDetailDialogVisible"
    >
      <template #header>
        <div class="flex items-center gap-2 w-full min-w-0 pr-1">
          <TicketKey v-if="editingItem?.ticketKey" :label="editingItem.ticketKey" />
          <span class="truncate text-sm font-medium text-[var(--fg-muted)]">
            {{
              canEditWorkflowItem && isEditingDetail ? 'Editando actividad' : 'Detalle de actividad'
            }}
          </span>
          <Tag v-if="!canEditWorkflowItem" value="Solo lectura" severity="warn" class="text-[10px] shrink-0" />
          <div class="ml-auto flex items-center gap-1 shrink-0">
            <Button
              v-if="canEditWorkflowItem && !isEditingDetail"
              icon="pi pi-pencil"
              label="Editar"
              size="small"
              text
              aria-label="Editar actividad"
              @click="enterEditMode"
            />
            <Button
              v-if="canEditWorkflowItem && isEditingDetail"
              icon="pi pi-check"
              label="Guardar"
              size="small"
              :disabled="!editingItemIsDirty"
              :loading="itemSaving"
              aria-label="Guardar cambios"
              @click="saveItem"
            />
            <Button
              v-tooltip.left="'Copiar enlace para compartir'"
              icon="pi pi-share-alt"
              rounded
              text
              severity="secondary"
              type="button"
              aria-label="Copiar enlace de la actividad"
              @click="shareActivityLink"
            />
          </div>
        </div>
      </template>

      <div
        v-if="editingItem"
        class="item-detail-scroll flex flex-1 min-h-0 flex-col gap-6 overflow-hidden lg:flex-row lg:items-stretch -mx-1 px-1"
      >
        <!-- Columna principal (~70%) -->
        <section
          class="item-detail-main flex flex-1 flex-col gap-5 min-w-0 min-h-0 overflow-y-auto pr-1"
          aria-labelledby="item-detail-title"
        >
          <h2
            v-if="!canEditWorkflowItem || !isEditingDetail"
            id="item-detail-title"
            class="item-detail-title-read break-words py-2 text-2xl font-semibold leading-tight text-[var(--fg-default)]"
          >
            {{ editingItem.title?.trim() || 'Sin título' }}
          </h2>
          <InputText
            v-else
            id="item-detail-title"
            v-model="editingItem.title"
            placeholder="Sin título"
            aria-label="Título de la actividad"
            class="item-detail-title-input w-full border-none bg-transparent p-0 py-2 text-2xl font-semibold leading-tight text-[var(--fg-default)] shadow-none transition-shadow duration-200 focus:ring-2 focus:ring-[var(--p-primary-300)] focus:ring-offset-0"
          />

          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Tag
              :value="statusLabel(editingItem.status)"
              :severity="statusSeverity(editingItem.status)"
            />
            <Tag
              v-if="detailAssigneeDisplay"
              severity="secondary"
              class="max-w-[min(18rem,70vw)] min-w-0 py-0 pl-0.5 pr-2 text-xs font-normal"
            >
              <span class="inline-flex min-w-0 items-center gap-1.5">
                <Avatar
                  v-if="editingItem.assignedTo"
                  :image="editingItem.assignedTo.avatarUrl || undefined"
                  :label="editingItem.assignedTo.avatarUrl ? undefined : detailAssigneeInitials"
                  shape="circle"
                  class="!h-3 !w-3 shrink-0 !text-[7px] leading-none bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100"
                />
                <span class="min-w-0 truncate">{{ detailAssigneeDisplay }}</span>
              </span>
            </Tag>
            <Tag v-if="editingItem.priority" :value="priorityLabelForItem(editingItem.priority)" severity="info" class="text-xs" />
            <span
              v-if="editingItem.dueDate"
              class="inline-flex items-center gap-1 text-[var(--fg-muted)]"
            >
              <i class="pi pi-calendar text-[11px]" aria-hidden="true" />
              {{ formatDate(editingItem.dueDate) }}
            </span>
            <Tag v-if="editingItem.isLegalDeadline" value="Plazo legal" severity="danger" class="text-xs" />
          </div>

          <section class="space-y-3">
            <header class="flex items-center justify-between gap-2 border-b border-[var(--surface-border)] pb-2">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-[var(--fg-default)]">
                <i class="pi pi-align-left text-xs text-[var(--fg-muted)]" aria-hidden="true" />
                Descripción
              </h3>
            </header>
            <div
              v-if="!canEditWorkflowItem || !isEditingDetail"
              class="item-detail-description-read rounded-lg border border-transparent px-0 py-1 text-sm leading-relaxed text-[var(--fg-default)]"
            >
              <p
                v-if="!descriptionHasDisplayContent(editingItem.description)"
                class="mb-0 text-[var(--fg-muted)]"
              >
                Sin descripción
              </p>
              <div
                v-else-if="isLikelyHtmlContent(editingItem.description)"
                class="ql-snow ql-editor item-description-html-read border-0 bg-transparent p-0"
                v-html="editingItem.description"
              />
              <p v-else class="mb-0 whitespace-pre-wrap break-words">
                {{ editingItem.description }}
              </p>
            </div>
            <Editor
              v-else
              id="item-detail-description"
              v-model="editingItem.description"
              editor-style="min-height: 12rem; max-height: min(40vh, 22rem);"
              class="item-detail-editor w-full"
              placeholder="Sin descripción"
            />
          </section>

          <section class="space-y-3">
            <header class="flex items-center justify-between gap-2 border-b border-[var(--surface-border)] pb-2">
              <h3 class="text-sm font-semibold text-[var(--fg-default)]">Documentos</h3>
              <div v-if="canEditWorkflowItem && isEditingDetail" class="flex gap-1">
                <Button
                  icon="pi pi-upload"
                  text
                  rounded
                  size="small"
                  v-tooltip="'Subir archivo'"
                  @click="openSidebarUploadFolderModal"
                />
                <Button
                  icon="pi pi-file-edit"
                  text
                  rounded
                  size="small"
                  v-tooltip="'Nuevo documento'"
                  @click="showNewDocDialog = true"
                />
              </div>
            </header>
            <div v-if="documentsLoading" class="py-4 text-center">
              <i class="pi pi-spin pi-spinner text-[var(--fg-muted)]" />
            </div>
            <div
              v-else-if="itemDocuments.length === 0"
              class="py-2 text-center text-sm text-[var(--fg-muted)]"
            >
              Sin documentos vinculados
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="doc in itemDocuments"
                :key="doc.id"
                class="cursor-pointer rounded-lg border border-transparent p-3 text-sm transition-colors hover:border-[var(--surface-border)] hover:bg-[var(--surface-sunken)]"
                @click="router.push(`/documents/${doc.id}/edit`)"
              >
                <div class="mb-1 flex items-center gap-2">
                  <i class="pi pi-file text-xs text-[var(--fg-muted)]" />
                  <span class="truncate font-medium text-[var(--fg-default)]">{{ doc.title }}</span>
                </div>
                <div v-if="doc.reviewStatus" class="text-xs text-[var(--fg-muted)]">
                  {{ doc.reviewStatus }}
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <header class="border-b border-[var(--surface-border)] pb-2">
              <h3 class="text-sm font-semibold text-[var(--fg-default)]">Comentarios</h3>
            </header>
            <div v-if="commentsLoading" class="py-2 text-sm text-[var(--fg-muted)]">Cargando comentarios…</div>
            <div v-else-if="commentsLoadError" class="space-y-3">
              <Message severity="error" :closable="false">
                {{ commentsLoadError }}
              </Message>
              <Button
                label="Reintentar"
                icon="pi pi-refresh"
                size="small"
                outlined
                @click="retryLoadWorkflowItemComments"
              />
            </div>
            <template v-else>
              <div class="max-h-56 space-y-3 overflow-y-auto pr-1">
                <div
                  v-for="c in workflowItemComments"
                  :key="c.id"
                  class="border-b border-[var(--surface-border)] pb-3 last:border-0"
                >
                  <div class="mb-1 text-xs text-[var(--fg-muted)]">
                    {{ formatCommentAuthor(c.user) }} · {{ formatDateTime(c.createdAt) }}
                  </div>
                  <div class="whitespace-pre-wrap text-sm text-[var(--fg-default)]">{{ c.body }}</div>
                </div>
                <p v-if="!workflowItemComments.length" class="text-sm text-[var(--fg-muted)]">
                  Sin comentarios aún.
                </p>
              </div>
              <div v-if="canPostCommentOnOpenActivity" class="mt-4 flex flex-col gap-2">
                <Textarea
                  v-model="newCommentText"
                  rows="2"
                  auto-resize
                  placeholder="Escribe un comentario…"
                  class="w-full"
                />
                <Button
                  label="Publicar comentario"
                  icon="pi pi-send"
                  size="small"
                  :loading="commentPosting"
                  :disabled="!newCommentText.trim()"
                  @click="postWorkflowItemComment"
                />
              </div>
              <p
                v-else-if="(canReadWorkflowItem || canReadTrackableForComments) && userPermissions.length"
                class="mt-4 text-sm text-[var(--fg-muted)]"
              >
                No tienes permiso para publicar comentarios en esta actividad.
              </p>
            </template>
          </section>
        </section>

        <!-- Sidebar: clave | valor (estilo Jira) -->
        <aside
          class="item-detail-sidebar w-full lg:w-[min(22rem,32%)] lg:max-w-sm shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto border-t border-[var(--surface-border)] pt-4 pr-4 sm:pr-5 lg:pt-0 lg:pl-6 lg:pr-5 lg:border-t-0 lg:border-l lg:mt-0"
          aria-label="Detalles de la actividad"
        >
          <p
            v-if="canEditWorkflowItem && !isEditingDetail"
            class="m-0 text-[11px] leading-snug text-[var(--fg-muted)]"
          >
            Pulsa «Editar» en la cabecera para modificar tipo, fechas, asignación y color.
          </p>
          <p
            v-else-if="canEditWorkflowItem && isEditingDetail"
            class="m-0 text-[11px] leading-snug text-[var(--fg-muted)]"
          >
            Cambios en la columna derecha se guardan con «Guardar». Desactiva «Todo el día» para indicar hora.
          </p>

          <Accordion multiple :value="['activity', 'calendar']" class="item-detail-sidebar-accordion w-full border-0 bg-transparent">
            <AccordionPanel value="activity">
              <AccordionHeader class="text-sm font-semibold">{{ t('trackables.itemSidebarSectionActivity') }}</AccordionHeader>
              <AccordionContent>
                <dl class="item-detail-properties grid grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt>Tipo</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingItem.kind"
                      :options="kindOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Fase, diligencia, escrito…"
                      class="w-full"
                      editable
                      show-clear
                      input-id="item-detail-kind-input"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{ kindLabel(editingItem.kind) || '—' }}</span>
                  </dd>

                  <dt>Asignado a</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingAssignedToId"
                      :options="userOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Seleccionar usuario"
                      filter
                      show-clear
                      class="w-full"
                      input-id="item-detail-assignee-input"
                    />
                    <span v-else class="text-[var(--fg-default)]">
                      {{ detailAssigneeDisplay || '—' }}
                    </span>
                  </dd>

                  <dt>Prioridad</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingPriority"
                      :options="priorityOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Opcional"
                      show-clear
                      class="w-full"
                      input-id="item-detail-priority-input"
                    />
                    <Tag
                      v-else-if="editingItem.priority"
                      :value="priorityLabelForItem(editingItem.priority)"
                      severity="info"
                    />
                    <span v-else class="text-[var(--fg-muted)]">—</span>
                  </dd>

                  <dt>Plazo legal</dt>
                  <dd class="min-w-0">
                    <Checkbox
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingItem.isLegalDeadline"
                      binary
                      input-id="legal-dl"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{ editingItem.isLegalDeadline ? 'Sí' : 'No' }}</span>
                  </dd>

                  <dt>Ubicación</dt>
                  <dd class="min-w-0">
                    <InputText
                      v-if="isEditingDetail && canEditWorkflowItem"
                      id="item-detail-location"
                      v-model="editingItem.location"
                      class="w-full"
                      placeholder="Ej. Juzgado, sala…"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{ editingItem.location?.trim() || '—' }}</span>
                  </dd>

                  <dt>Color</dt>
                  <dd class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="h-6 w-6 shrink-0 rounded-full border border-[var(--surface-border)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                        :style="{ backgroundColor: editingItem.accentColor || 'transparent' }"
                        v-tooltip.bottom="'Kanban y línea de tiempo'"
                        :disabled="!isEditingDetail || !canEditWorkflowItem"
                        aria-label="Color de la actividad"
                        @click="(e) => detailAccentPopoverRef?.toggle(e)"
                      />
                      <Popover
                        ref="detailAccentPopoverRef"
                        class="max-w-[16rem] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-2 shadow-lg"
                      >
                        <div class="flex flex-wrap items-center gap-1.5">
                          <button
                            v-for="p in accentPresets"
                            :key="'det-' + p.value"
                            type="button"
                            class="h-7 w-7 shrink-0 rounded-full border-2 border-transparent transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-400)] disabled:opacity-50"
                            :class="
                              editingItem.accentColor === p.value
                                ? 'ring-2 ring-[var(--fg-default)] ring-offset-2 ring-offset-[var(--surface-raised)]'
                                : 'hover:ring-1 hover:ring-[var(--surface-border)]'
                            "
                            :style="{ backgroundColor: p.value }"
                            :title="p.label"
                            :aria-label="`Color ${p.label}`"
                            :disabled="!canEditWorkflowItem"
                            @click="setEditingAccentPreset(p.value)"
                          />
                          <button
                            type="button"
                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--surface-border)] bg-[var(--surface-sunken)] text-[var(--fg-muted)] hover:bg-[var(--surface-app)] disabled:opacity-50"
                            :disabled="!canEditWorkflowItem"
                            title="Quitar color"
                            aria-label="Quitar color de acento"
                            @click="setEditingAccentPreset(null)"
                          >
                            <i class="pi pi-times text-xs" aria-hidden="true" />
                          </button>
                          <label class="sr-only" for="item-detail-accent-custom">Color personalizado</label>
                          <input
                            id="item-detail-accent-custom"
                            :value="accentPickerValue"
                            type="color"
                            class="h-7 w-9 cursor-pointer rounded border border-[var(--surface-border)] bg-transparent p-0 disabled:opacity-50"
                            :disabled="!canEditWorkflowItem"
                            @input="onAccentColorPick"
                          />
                        </div>
                      </Popover>
                    </div>
                  </dd>

                  <dt>Creado</dt>
                  <dd class="text-[var(--fg-muted)]">{{ formatWorkflowItemCreatedLine(editingItem) }}</dd>
                </dl>
              </AccordionContent>
            </AccordionPanel>

            <AccordionPanel value="calendar">
              <AccordionHeader class="text-sm font-semibold">{{ t('trackables.itemSidebarSectionCalendar') }}</AccordionHeader>
              <AccordionContent>
                <dl class="item-detail-properties grid grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt>Todo el día</dt>
                  <dd class="min-w-0">
                    <Checkbox
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingAllDayUi"
                      binary
                      input-id="item-detail-allday"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{ editingItem.allDay !== false ? 'Sí' : 'No' }}</span>
                  </dd>

                  <dt>Inicio</dt>
                  <dd class="min-w-0">
                    <Calendar
                      v-if="isEditingDetail && canEditWorkflowItem"
                      input-id="item-detail-start-input"
                      :model-value="dateFromIso(editingItem.startDate)"
                      date-format="dd/mm/yy"
                      show-icon
                      class="w-full"
                      :show-time="editingShowCalendarTime"
                      hour-format="24"
                      :step-minute="15"
                      @update:model-value="onEditStartDate"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{
                      formatActivityDateDisplay(editingItem.startDate, editingItem.allDay)
                    }}</span>
                  </dd>

                  <dt>Vencimiento</dt>
                  <dd class="min-w-0">
                    <Calendar
                      v-if="isEditingDetail && canEditWorkflowItem"
                      input-id="item-detail-due-input"
                      :model-value="dateFromIso(editingItem.dueDate)"
                      date-format="dd/mm/yy"
                      show-icon
                      class="w-full"
                      :show-time="editingShowCalendarTime"
                      hour-format="24"
                      :step-minute="15"
                      @update:model-value="onEditDueDate"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{
                      formatActivityDateDisplay(editingItem.dueDate, editingItem.allDay)
                    }}</span>
                  </dd>

                  <dt>{{ t('globalCalendar.remindersLabel') }}</dt>
                  <dd class="min-w-0">
                    <MultiSelect
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingItem.reminderMinutesBefore"
                      :options="reminderOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      display="chip"
                      :placeholder="t('globalCalendar.remindersPlaceholder')"
                      :show-clear="true"
                    />
                    <div v-else class="flex flex-wrap gap-1">
                      <template v-if="(editingItem.reminderMinutesBefore?.length ?? 0) > 0">
                        <Tag
                          v-for="m in [...(editingItem.reminderMinutesBefore ?? [])].sort((a, b) => a - b)"
                          :key="m"
                          :value="reminderLabel(m)"
                          severity="secondary"
                        />
                      </template>
                      <span v-else class="text-[var(--fg-muted)]">—</span>
                    </div>
                  </dd>

                  <dt>{{ t('globalCalendar.rruleLabel') }}</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingItem.rrule"
                      :options="rruleOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :show-clear="true"
                    />
                    <span v-else class="text-[var(--fg-default)]">{{ rruleReadLabel(editingItem.rrule) }}</span>
                  </dd>

                  <dt>{{ t('globalCalendar.assignSecondaryLabel') }}</dt>
                  <dd class="min-w-0">
                    <MultiSelect
                      v-if="isEditingDetail && canEditWorkflowItem"
                      v-model="editingSecondaryAssigneeIds"
                      :options="secondaryAssigneeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      display="chip"
                      :placeholder="t('globalCalendar.assignSecondaryPlaceholder')"
                      :show-clear="true"
                      :filter="true"
                    />
                    <div v-else class="flex flex-wrap items-center gap-1">
                      <template v-if="editingSecondaryAssigneeIds.length > 0">
                        <Avatar
                          v-for="uid in editingSecondaryAssigneeIds"
                          :key="uid"
                          v-tooltip.bottom="secondaryAssigneeName(uid)"
                          :label="secondaryAssigneeInitials(uid)"
                          shape="circle"
                          class="h-7 w-7 shrink-0 text-xs"
                        />
                      </template>
                      <span v-else class="text-[var(--fg-muted)]">—</span>
                    </div>
                  </dd>
                </dl>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </aside>
      </div>
    </Dialog>

    <!-- Nueva actividad: mismo layout que detalle (dos columnas) -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      dismissable-mask
      class="item-detail-dialog"
      :style="{ width: 'min(72rem, 96vw)' }"
      :content-style="itemDetailDialogContentStyle"
      :breakpoints="{ '960px': '95vw' }"
    >
      <template #header>
        <div class="flex w-full min-w-0 items-center justify-between gap-2 pr-1">
          <span class="truncate text-sm font-medium text-[var(--fg-muted)]">{{ createDialogTitle }}</span>
          <Button
            icon="pi pi-check"
            label="Crear"
            size="small"
            :disabled="!newItem.title?.trim() || createItemSaving"
            :loading="createItemSaving"
            aria-label="Crear actividad"
            @click="createItem"
          />
        </div>
      </template>

      <div
        class="item-detail-scroll flex flex-1 min-h-0 flex-col gap-6 overflow-hidden lg:flex-row lg:items-stretch -mx-1 px-1"
      >
        <section
          class="item-detail-main flex flex-1 flex-col gap-5 min-w-0 min-h-0 overflow-y-auto pr-1"
          aria-labelledby="create-item-title"
        >
          <p
            v-if="createItemError"
            class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
          >
            {{ createItemError }}
          </p>
          <InputText
            id="create-item-title"
            v-model="newItem.title"
            placeholder="Ej. Presentación de demanda"
            aria-label="Título de la nueva actividad"
            class="item-detail-title-input w-full border-none bg-transparent p-0 py-2 text-2xl font-semibold leading-tight text-[var(--fg-default)] shadow-none transition-shadow duration-200 focus:ring-2 focus:ring-[var(--p-primary-300)] focus:ring-offset-0"
          />

          <div
            v-if="primaryProcessTrackId"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="text-xs text-[var(--fg-muted)]">Columna inicial:</span>
            <Tag :value="createDialogStateColumnLabel" rounded severity="secondary" class="!text-xs" />
          </div>

          <section class="space-y-3">
            <header class="border-b border-[var(--surface-border)] pb-2">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-[var(--fg-default)]">
                <i class="pi pi-align-left text-xs text-[var(--fg-muted)]" aria-hidden="true" />
                Descripción
              </h3>
            </header>
            <Editor
              id="create-item-description"
              v-model="newItem.description"
              editor-style="min-height: 10rem; max-height: min(36vh, 20rem);"
              class="item-detail-editor w-full"
              placeholder="Detalle de la actividad…"
            />
          </section>

          <Message severity="info" :closable="false" class="text-sm">
            Diligencias, entregables, comentarios y documentos estarán disponibles después de crear la actividad.
          </Message>
        </section>

        <aside
          class="item-detail-sidebar w-full lg:w-[min(22rem,32%)] lg:max-w-sm shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto border-t border-[var(--surface-border)] pt-4 pr-4 sm:pr-5 lg:pt-0 lg:pl-6 lg:pr-5 lg:border-t-0 lg:border-l lg:mt-0"
          aria-label="Detalles de la nueva actividad"
        >
          <p class="m-0 text-[11px] leading-snug text-[var(--fg-muted)]">
            Desactiva «Todo el día» en Calendario para fijar hora de inicio y vencimiento.
          </p>
          <Accordion multiple :value="['create-activity', 'create-calendar']" class="item-detail-sidebar-accordion w-full border-0 bg-transparent">
            <AccordionPanel value="create-activity">
              <AccordionHeader class="text-sm font-semibold">{{ t('trackables.itemSidebarSectionActivity') }}</AccordionHeader>
              <AccordionContent>
                <dl class="item-detail-properties grid grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt>Estado</dt>
                  <dd><Tag :value="statusLabel('pending')" severity="warn" class="text-xs" /></dd>

                  <dt>Tipo</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      id="create-item-kind-input"
                      v-model="newItem.kind"
                      :options="kindOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Fase, diligencia, escrito…"
                      class="w-full"
                      editable
                      show-clear
                    />
                  </dd>

                  <dt>Acción</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      id="create-item-action-type"
                      v-model="newItem.actionType"
                      :options="actionTypeOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Sin acción automatizada"
                      show-clear
                      class="w-full"
                    />
                  </dd>

                  <dt>Asignado a</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      id="create-item-assignee-input"
                      v-model="newItem.assignedToId"
                      :options="userOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Seleccionar usuario"
                      filter
                      show-clear
                      class="w-full"
                    />
                  </dd>

                  <dt>Prioridad</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      id="create-item-priority-input"
                      v-model="newItem.priority"
                      :options="priorityOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Opcional"
                      show-clear
                      class="w-full"
                    />
                  </dd>

                  <dt>Plazo legal</dt>
                  <dd>
                    <Checkbox v-model="newItem.isLegalDeadline" binary input-id="create-legal-dl" />
                  </dd>

                  <dt>Ubicación</dt>
                  <dd class="min-w-0">
                    <InputText id="create-item-location" v-model="newItem.location" class="w-full" placeholder="Ej. Juzgado, sala…" />
                  </dd>

                  <dt>Color</dt>
                  <dd class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="h-6 w-6 shrink-0 rounded-full border border-[var(--surface-border)]"
                        :style="{ backgroundColor: newItem.accentColor || 'transparent' }"
                        v-tooltip.bottom="'Kanban y línea de tiempo'"
                        aria-label="Color de la actividad"
                        @click="(e) => createAccentPopoverRef?.toggle(e)"
                      />
                      <Popover
                        ref="createAccentPopoverRef"
                        class="max-w-[16rem] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-2 shadow-lg"
                      >
                        <div class="flex flex-wrap items-center gap-1.5">
                          <button
                            v-for="p in accentPresets"
                            :key="'create-pop-' + p.value"
                            type="button"
                            class="h-7 w-7 shrink-0 rounded-full border-2 border-transparent transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-400)]"
                            :class="
                              newItem.accentColor === p.value
                                ? 'ring-2 ring-[var(--fg-default)] ring-offset-2 ring-offset-[var(--surface-raised)]'
                                : 'hover:ring-1 hover:ring-[var(--surface-border)]'
                            "
                            :style="{ backgroundColor: p.value }"
                            :title="p.label"
                            :aria-label="`Color ${p.label}`"
                            @click="setNewItemAccentPreset(p.value)"
                          />
                          <button
                            type="button"
                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--surface-border)] bg-[var(--surface-sunken)] text-[var(--fg-muted)] hover:bg-[var(--surface-app)]"
                            title="Color por defecto"
                            aria-label="Quitar color de acento"
                            @click="setNewItemAccentDefault"
                          >
                            <i class="pi pi-times text-xs" aria-hidden="true" />
                          </button>
                          <label class="sr-only" for="create-item-accent-custom">Color personalizado</label>
                          <input
                            id="create-item-accent-custom"
                            :value="newItemAccentPickerValue"
                            type="color"
                            class="h-7 w-9 cursor-pointer rounded border border-[var(--surface-border)] bg-transparent p-0"
                            @input="onNewItemAccentColorPick"
                          />
                        </div>
                      </Popover>
                    </div>
                  </dd>

                  <dt>Alta</dt>
                  <dd class="text-[var(--fg-muted)]">Al guardar · {{ currentUserCreationLabel }}</dd>
                </dl>
              </AccordionContent>
            </AccordionPanel>

            <AccordionPanel value="create-calendar">
              <AccordionHeader class="text-sm font-semibold">{{ t('trackables.itemSidebarSectionCalendar') }}</AccordionHeader>
              <AccordionContent>
                <dl class="item-detail-properties grid grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt>Todo el día</dt>
                  <dd>
                    <Checkbox v-model="newItem.allDay" binary input-id="create-allday" />
                  </dd>

                  <dt>Inicio</dt>
                  <dd class="min-w-0">
                    <Calendar
                      id="create-item-start-input"
                      v-model="newItem.startDate"
                      date-format="dd/mm/yy"
                      show-icon
                      class="w-full"
                      :show-time="!newItem.allDay"
                      hour-format="24"
                      :step-minute="15"
                    />
                  </dd>

                  <dt>Vencimiento</dt>
                  <dd class="min-w-0">
                    <Calendar
                      id="create-item-due-input"
                      v-model="newItem.dueDate"
                      date-format="dd/mm/yy"
                      show-icon
                      class="w-full"
                      :show-time="!newItem.allDay"
                      hour-format="24"
                      :step-minute="15"
                    />
                  </dd>

                  <dt>{{ t('globalCalendar.remindersLabel') }}</dt>
                  <dd class="min-w-0">
                    <MultiSelect
                      v-model="newItem.reminderMinutesBefore"
                      :options="reminderOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      display="chip"
                      :placeholder="t('globalCalendar.remindersPlaceholder')"
                      :show-clear="true"
                    />
                  </dd>

                  <dt>{{ t('globalCalendar.rruleLabel') }}</dt>
                  <dd class="min-w-0">
                    <Dropdown
                      v-model="newItem.rrule"
                      :options="rruleOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      :show-clear="true"
                    />
                  </dd>

                  <dt>{{ t('globalCalendar.assignSecondaryLabel') }}</dt>
                  <dd class="min-w-0">
                    <MultiSelect
                      v-model="newItem.secondaryAssigneeIds"
                      :options="newItemSecondaryAssigneeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      display="chip"
                      :placeholder="t('globalCalendar.assignSecondaryPlaceholder')"
                      :show-clear="true"
                      :filter="true"
                    />
                  </dd>
                </dl>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </aside>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="showNewDocDialog"
      header="Nuevo documento"
      :modal="true"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="new-doc-title" class="text-sm font-medium text-[var(--fg-muted)]">Título *</label>
          <InputText id="new-doc-title" v-model="newDocTitle" placeholder="Título del documento" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-muted)]">Carpeta destino</label>
          <Dropdown
            v-model="newDocFolderId"
            :options="folderOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar carpeta"
            :disabled="folderOptions.length === 0"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-muted)]">Plantilla (opcional)</label>
          <div v-if="selectedTemplateDoc" class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <i class="pi pi-file-word text-blue-500" />
            <span class="flex-1 text-sm text-blue-700 dark:text-blue-300 truncate">{{ selectedTemplateDoc.title }}</span>
            <Button icon="pi pi-times" text rounded size="small" severity="secondary" @click="selectedTemplateDoc = null" />
          </div>
          <Button
            v-else
            label="Buscar plantilla"
            icon="pi pi-search"
            outlined
            size="small"
            severity="secondary"
            @click="showTemplateSearch = true"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="closeNewDocDialog" />
        <Button
          label="Crear"
          icon="pi pi-check"
          :disabled="!newDocTitle || !newDocFolderId"
          @click="createDocument"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showUploadFolderDialog"
      header="Subir archivo"
      :modal="true"
      :style="{ width: '440px' }"
    >
      <p class="text-sm text-[var(--fg-muted)] mb-3">
        Elige la carpeta del expediente donde guardar el archivo. Quedará vinculado a esta actividad.
      </p>
      <div class="flex flex-col gap-1">
        <label for="sidebar-upload-folder" class="text-sm font-medium text-[var(--fg-muted)]">Carpeta destino</label>
        <Dropdown
          id="sidebar-upload-folder"
          v-model="uploadFolderPickId"
          :options="folderOptions"
          option-label="label"
          option-value="value"
          placeholder="Seleccionar carpeta"
          :disabled="folderOptions.length === 0"
          class="w-full"
        />
      </div>
      <p v-if="folderOptions.length === 0" class="text-xs text-amber-600 dark:text-amber-400 mt-2">
        No hay carpetas en este expediente. Créalas desde la pestaña Carpetas.
      </p>
      <template #footer>
        <Button label="Cancelar" text @click="cancelUploadFolderModal" />
        <Button
          label="Elegir archivo"
          icon="pi pi-upload"
          :disabled="!uploadFolderPickId"
          @click="confirmUploadFolderAndPickFile"
        />
      </template>
    </Dialog>

    <TemplateSearchDialog
      v-model:visible="showTemplateSearch"
      @select="onTemplateSelected"
      @create-blank="showTemplateSearch = false"
    />

    <Dialog
      v-model:visible="sinoeQuickDialogVisible"
      header="SINOE y fuentes externas"
      modal
      class="w-full max-w-lg"
      :dismissable-mask="true"
      @show="loadSinoePanel"
    >
      <p v-if="sinoePanelLoading" class="text-sm text-[var(--fg-muted)] py-4">Cargando…</p>
      <template v-else>
        <p v-if="!externalSources.length" class="text-sm text-[var(--fg-muted)] m-0 mb-3">
          No hay fuentes externas registradas para este expediente.
        </p>
        <ul v-else class="space-y-2 text-sm m-0 p-0 list-none mb-3">
          <li
            v-for="src in externalSources"
            :key="src.id"
            class="rounded-lg border border-[var(--surface-border)] p-3"
          >
            <span class="font-medium">{{ src.sourceType }}</span>
            <span class="text-[var(--fg-muted)]"> · Última verificación: {{ src.lastCheckedAt ? formatDateTime(src.lastCheckedAt) : '—' }}</span>
            <p v-if="src.lastError" class="text-xs text-red-600 mt-1 m-0">{{ src.lastError }}</p>
          </li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="canTriggerSinoeScrape"
            label="Encolar sincronización SINOE"
            icon="pi pi-cloud-download"
            size="small"
            :loading="sinoeTriggerLoading"
            @click="triggerSinoeScrape"
          />
          <span v-else class="text-xs text-[var(--fg-muted)]">Requiere permiso para disparar scraping o gestionar SINOE.</span>
        </div>
      </template>
      <template #footer>
        <Button label="Cerrar" text @click="sinoeQuickDialogVisible = false" />
      </template>
    </Dialog>

    <input
      ref="uploadInputRef"
      type="file"
      style="display: none"
      @change="handleFileUpload"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Dialog from 'primevue/dialog';
import Drawer from 'primevue/drawer';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import Editor from 'primevue/editor';
import 'quill/dist/quill.snow.css';
import '@/assets/styles/item-detail-dialog.css';
import Checkbox from 'primevue/checkbox';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Message from 'primevue/message';
import Popover from 'primevue/popover';
import Avatar from 'primevue/avatar';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { CalendarOptions, DatesSetArg, EventClickArg, EventDropArg, EventApi } from '@fullcalendar/core';
import {
  apiEventToFullCalendar,
  parseActivityIdFromEventId,
  parseWorkflowItemIdFromEventId,
  type ApiCalendarEvent,
} from '@/composables/useCalendarAdapter';
import { matchesCalendarFilters, classifyApiEvent, type CalendarFilterKind } from '@/composables/calendarEventKind';
import { countHearingOverlapPairs, listHearingOverlapPairs } from '@/composables/calendarOverlap';
import { buildPeruHolidayEvents } from '@/composables/peruPublicHolidays';
import { setAssistantCalendarViewportFromFc } from '@/utils/assistant-calendar-context';
import { useCalendarStore } from '@/stores/calendar.store';
import CalendarSidebar from '@/views/calendar/components/CalendarSidebar.vue';
import DaySummaryBar from '@/views/calendar/components/DaySummaryBar.vue';
import { getRecent, recordVisit } from '@/composables/useRecentTrackableViews';
import * as Shared from '@tracker/shared';
import { flattenWorkflowTree } from '@/utils/flow-transformer';
import { flattenProcessTrackToWorkflowItems } from '@/utils/process-track-activity-mapper';
import TemplateSearchDialog from '@/components/documents/TemplateSearchDialog.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import FolderBrowserView from '@/views/documents/FolderBrowserView.vue';
import TicketKey from '@/components/kanban/TicketKey.vue';
import { createProcessTrack, createCustomActivity, patchProcessTrackActivity } from '@/api/process-tracks';
import { useProcessTrackData } from '@/composables/useProcessTrackData';
import ProcessStageBoardView from '@/components/expediente-v2/ProcessStageBoardView.vue';

interface AssignedUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string | null;
}

interface WorkflowItem {
  id: string;
  title: string;
  kind?: string | null;
  status: string;
  workflowId?: string | null;
  currentStateId?: string | null;
  stateKey?: string | null;
  /** WorkflowStateCategory (todo, in_progress, in_review, done, cancelled) desde API */
  stateCategory?: string | null;
  ticketKey?: string | null;
  itemNumber?: number | null;
  description?: string;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: AssignedUser | null;
  metadata?: Record<string, unknown>;
  actionType?: string;
  isLegalDeadline?: boolean;
  requiresDocument?: boolean;
  parentId?: string | null;
  children?: WorkflowItem[];
  sortOrder?: number;
  depth?: number;
  /** Color de acento (#RRGGBB) */
  accentColor?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | null;
  location?: string | null;
  allDay?: boolean;
  reminderMinutesBefore?: number[] | null;
  rrule?: string | null;
  /** Fila vía process track / ActivityInstance (no legacy WorkflowItem). */
  isProcessTrackActivity?: boolean;
  processTrackId?: string;
  stageInstanceId?: string;
}

const DEFAULT_ACCENT = '#64748b';

const accentPresets = [
  { label: 'Slate', value: '#64748b' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Ámbar', value: '#f59e0b' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Cian', value: '#06b6d4' },
];

interface WorkflowItemCommentRow {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; email?: string; firstName?: string; lastName?: string } | null;
}

const authStore = useAuthStore();

const currentUserCreationLabel = computed(() => {
  const u = authStore.user;
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
});

const userPermissions = ref<string[]>([]);
const canCreateWorkflowItem = computed(() => userPermissions.value.includes('workflow_item:create'));
const canEditWorkflowItem = computed(() => userPermissions.value.includes('workflow_item:update'));
const canCommentWorkflowItem = computed(
  () =>
    userPermissions.value.includes('workflow_item:comment') ||
    userPermissions.value.includes('workflow_item:update'),
);
/** Incluye actividades v2 (ProcessTrack) con `trackable:update`, alineado al POST de comentarios. */
const canPostCommentOnOpenActivity = computed(() => {
  const e = editingItem.value as (WorkflowItem & { isProcessTrackActivity?: boolean }) | null;
  if (e?.isProcessTrackActivity) {
    return (
      userPermissions.value.includes('trackable:update') ||
      userPermissions.value.includes('workflow_item:comment') ||
      userPermissions.value.includes('workflow_item:update')
    );
  }
  return canCommentWorkflowItem.value;
});
const canReadWorkflowItem = computed(() => userPermissions.value.includes('workflow_item:read'));
const canReadTrackableForComments = computed(() => userPermissions.value.includes('trackable:read'));
const canEditTrackable = computed(() => userPermissions.value.includes('trackable:update'));
const canReadBlueprints = computed(() => userPermissions.value.includes('blueprint:read'));

/** Motor configurable (workflow + transiciones vía API). Sin esto el drag Kanban está deshabilitado. */
const useConfigurableWorkflowsEnabled = computed(
  () => authStore.organization?.featureFlags?.useConfigurableWorkflows === true,
);

const trackableDetail = ref<Record<string, unknown> | null>(null);

/** Motor v2: tab Actividades = ProcessTrack (tiene precedencia sobre flujos configurables). */
const primaryProcessTrackId = computed(() => {
  const raw = trackableDetail.value?.processTracks as { id: string; role: string }[] | undefined;
  if (!Array.isArray(raw) || !raw.length) return null as string | null;
  const primary = raw.find((p) => (p.role || '').toLowerCase() === 'primary');
  return primary?.id ?? raw[0]!.id;
});

const {
  load: loadProcessTrack,
  loadSilent: loadProcessTrackSilent,
  pt: processTrackRef,
  currentStageInstanceId: ptCurrentStageId,
} = useProcessTrackData(() => primaryProcessTrackId.value ?? '');
const caseForm = ref({
  title: '',
  description: '',
  counterpartyName: '',
  expedientNumber: '',
  court: '',
  jurisdiction: 'PE',
  matterType: 'other',
  clientId: null as string | null,
  assignedToId: null as string | null,
  type: null as string | null,
  status: 'created' as string,
  dueDate: null as Date | null,
});
const clientsOptions = ref<Array<{ id: string; name: string }>>([]);
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

const typeOptions = ['case', 'process', 'project', 'audit'];
const typeSelectOptions = computed(() =>
  typeOptions.map((value) => ({ value, label: t(`trackables.types.${value}`) })),
);
const trackableStatusEditOptions = [
  { label: 'Creado', value: 'created' },
  { label: 'Activo', value: 'active' },
  { label: 'En revisión', value: 'under_review' },
  { label: 'Completado', value: 'completed' },
  { label: 'Archivado', value: 'archived' },
];

const caseActivityLog = ref<Array<{
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user?: { firstName?: string; email?: string } | null;
}>>([]);
const caseActivityLoading = ref(false);
const caseSaving = ref(false);
/** Solo en modo edición se muestran inputs en «Datos generales». */
const caseGeneralEditing = ref(false);

function applyTrackableToCaseForm(data: Record<string, unknown>) {
  const c = data.client as { id?: string; name?: string } | undefined;
  const a = data.assignedTo as { id?: string } | undefined;
  const dueRaw = data.dueDate as string | undefined;
  caseForm.value = {
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    counterpartyName: (data.counterpartyName as string) ?? '',
    expedientNumber: (data.expedientNumber as string) ?? '',
    court: (data.court as string) ?? '',
    jurisdiction: (data.jurisdiction as string) ?? 'PE',
    matterType: (data.matterType as string) ?? 'other',
    clientId: c?.id ?? null,
    assignedToId: a?.id ?? null,
    type: (data.type as string) ?? null,
    status: (data.status as string) ?? 'created',
    dueDate: dueRaw ? new Date(dueRaw) : null,
  };
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

async function loadCaseTabExtras() {
  if (!trackableId.value) return;
  caseActivityLoading.value = true;
  try {
    const logRes = await apiClient.get(`/activity-log/trackable/${trackableId.value}`, { params: { limit: 40 } });
    const logPayload = logRes.data;
    caseActivityLog.value = Array.isArray(logPayload?.data) ? logPayload.data : [];
  } catch {
    caseActivityLog.value = [];
  } finally {
    caseActivityLoading.value = false;
  }
}

async function saveCase() {
  if (!trackableId.value) return;
  caseSaving.value = true;
  try {
    const { data } = await apiClient.patch(`/trackables/${trackableId.value}`, {
      title: caseForm.value.title,
      description: caseForm.value.description || undefined,
      counterpartyName: caseForm.value.counterpartyName || undefined,
      expedientNumber: caseForm.value.expedientNumber?.trim() || undefined,
      court: caseForm.value.court?.trim() || undefined,
      jurisdiction: caseForm.value.jurisdiction?.trim() || 'PE',
      matterType: caseForm.value.matterType,
      clientId: caseForm.value.clientId,
      assignedToId: caseForm.value.assignedToId,
      type: caseForm.value.type,
      status: caseForm.value.status,
      dueDate: caseForm.value.dueDate?.toISOString() || undefined,
    });
    trackableDetail.value = data as Record<string, unknown>;
    applyTrackableToCaseForm(data as Record<string, unknown>);
    const title = (data as { title?: string }).title ?? `Trackable ${trackableId.value}`;
    recordVisit(trackableId.value, title);
    toast.add({ severity: 'success', summary: 'Caso actualizado', life: 2200 });
    caseGeneralEditing.value = false;
    await loadCaseTabExtras();
  } catch (err) {
    const detail = extractApiErrorMessage(err, 'No se pudo guardar el caso.');
    toast.add({ severity: 'error', summary: 'Caso', detail, life: 4500 });
  } finally {
    caseSaving.value = false;
  }
}

function cancelEditCaseGeneral() {
  if (trackableDetail.value) {
    applyTrackableToCaseForm(trackableDetail.value);
  }
  caseGeneralEditing.value = false;
}

function canOpenActivityLog(log: { entityType: string }): boolean {
  const t = (log.entityType || '').toLowerCase();
  return t.includes('workflowitem');
}

async function openActivityLogEntry(log: { entityId: string }) {
  activeTab.value = 1;
  await router.replace({
    name: 'expediente',
    params: { id: trackableId.value },
    query: { ...route.query, workflowItemId: log.entityId },
  });
  await loadItems();
  await nextTick();
  await applyWorkflowItemFromQuery();
}

const workflowItemComments = ref<WorkflowItemCommentRow[]>([]);
const commentsLoading = ref(false);
const commentsLoadError = ref<string | null>(null);
const newCommentText = ref('');
const commentPosting = ref(false);

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t, locale: i18nLocale } = useI18n();

function formatActivityAction(action: string): string {
  const a = (action || '').trim();
  if (!a) return '';
  const key = `activityLog.action.${a}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, ' ');
}

function formatActivityEntity(entityType: string): string {
  const e = (entityType || '').trim().toLowerCase();
  if (!e) return '';
  const key = `activityLog.entity.${e}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return e.charAt(0).toUpperCase() + e.slice(1);
}

const calStore = useCalendarStore();
const { filters: calFilters } = storeToRefs(calStore);
const trackableId = computed(() => String(route.params.id ?? ''));

interface TrackablePickerRow {
  id: string;
  title: string;
}

const trackablesForSwitcher = ref<TrackablePickerRow[]>([]);
const trackablesSwitcherLoading = ref(false);

const switcherOptions = computed((): TrackablePickerRow[] => {
  const byId = new Map(trackablesForSwitcher.value.map((t) => [t.id, t]));
  const recent = getRecent();
  const ordered: TrackablePickerRow[] = [];
  const seen = new Set<string>();

  for (const r of recent) {
    const fromApi = byId.get(r.trackableId);
    if (fromApi) {
      ordered.push(fromApi);
      seen.add(r.trackableId);
    } else {
      ordered.push({
        id: r.trackableId,
        title: r.title ?? `Expediente ${r.trackableId}`,
      });
      seen.add(r.trackableId);
    }
  }

  const rest = trackablesForSwitcher.value
    .filter((row) => !seen.has(row.id))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  return [...ordered, ...rest];
});

async function loadTrackablesForSwitcher() {
  trackablesSwitcherLoading.value = true;
  try {
    const { data } = await apiClient.get('/trackables', { params: { limit: 100 } });
    const list = Array.isArray(data?.data) ? data.data : [];
    trackablesForSwitcher.value = list.map((t: { id: string; title?: string }) => ({
      id: t.id,
      title: t.title ?? `Expediente ${t.id}`,
    }));
  } catch {
    trackablesForSwitcher.value = [];
  } finally {
    trackablesSwitcherLoading.value = false;
  }
}

function onTrackableSwitch(newId: string | null) {
  if (!newId || newId === trackableId.value) return;
  router.push({ name: 'expediente', params: { id: newId } });
}

const activeTab = ref(0);

function openActividadesTab() {
  activeTab.value = 1;
}

/** Resumen: panel Ficha integrado (colapsable); SINOE en modal desde la barra rápida */
const fichaSectionOpen = ref(false);
const fichaSectionRef = ref<HTMLElement | null>(null);
const sinoeQuickDialogVisible = ref(false);

function openSinoeQuickDialog() {
  sinoeQuickDialogVisible.value = true;
}

function scrollToFichaAndEdit() {
  activeTab.value = 0;
  fichaSectionOpen.value = true;
  void nextTick(() => {
    fichaSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (canEditTrackable.value) caseGeneralEditing.value = true;
  });
}

const workflowTree = ref<WorkflowItem[]>([]);
const items = computed((): WorkflowItem[] => {
  const ptId = primaryProcessTrackId.value;
  if (ptId && processTrackRef.value?.stageInstances) {
    const prefix = (processTrackRef.value as { prefix?: string }).prefix || 'P';
    return flattenProcessTrackToWorkflowItems(
      ptId,
      prefix,
      processTrackRef.value as any,
    ) as unknown as WorkflowItem[];
  }
  return flattenWorkflowTree(workflowTree.value as any) as WorkflowItem[];
});
const creatingProcessTrack = ref(false);

async function ensureFreeformProcessTrack() {
  const id = trackableId.value;
  if (!id || !canEditTrackable.value) return;
  creatingProcessTrack.value = true;
  try {
    await createProcessTrack({ trackableId: id });
    await loadTrackable();
    await loadItems();
    toast.add({ severity: 'success', summary: t('common.success'), life: 2500 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('processTrack.emptyState.createError'),
      detail: extractApiErrorMessage(e, t('processTrack.emptyState.createError')),
      life: 5000,
    });
  } finally {
    creatingProcessTrack.value = false;
  }
}

const activityDrawerVisible = ref(false);
const drawerActivityLoading = ref(false);
const fullActivityLogForDrawer = ref<typeof caseActivityLog.value>([]);
const activityDrawerActionFilter = ref('');

const filteredDrawerActivityLog = computed(() => {
  const q = activityDrawerActionFilter.value.trim().toLowerCase();
  let rows = fullActivityLogForDrawer.value;
  if (q) {
    rows = rows.filter(
      (r) =>
        String(r.action).toLowerCase().includes(q) || String(r.entityType).toLowerCase().includes(q),
    );
  }
  return rows;
});

async function openActivityDrawer() {
  activityDrawerVisible.value = true;
  activityDrawerActionFilter.value = '';
  drawerActivityLoading.value = true;
  try {
    const { data } = await apiClient.get(`/activity-log/trackable/${trackableId.value}`, {
      params: { limit: 200 },
    });
    const payload = data;
    fullActivityLogForDrawer.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch {
    fullActivityLogForDrawer.value = [];
  } finally {
    drawerActivityLoading.value = false;
  }
}

const commandPaletteVisible = ref(false);
const commandPaletteFilter = ref('');

const commandPaletteItems = computed(() => [
  { id: 'new-act', label: 'Nueva actividad', hint: 'Actividades', run: () => quickNewActuacion() },
  { id: 'hearing', label: 'Agendar audiencia', hint: 'Actividades / Calendario', run: () => openScheduleHearingDialog() },
  { id: 'docs', label: 'Ir a documentos', hint: 'Documentos', run: () => goToDocumentosTab() },
  { id: 'bitacora', label: 'Abrir bitácora', hint: 'Panel', run: () => void openActivityDrawer() },
  { id: 'edit-ficha', label: 'Editar ficha del caso', hint: 'Resumen', run: () => { scrollToFichaAndEdit(); } },
  { id: 'resumen', label: 'Ir a resumen', hint: 'Resumen', run: () => { activeTab.value = 0; } },
  { id: 'actividades', label: 'Ir a actividades', hint: 'Actividades', run: () => { openActividadesTab(); } },
]);

const filteredCommandPalette = computed(() => {
  const q = commandPaletteFilter.value.trim().toLowerCase();
  const items = commandPaletteItems.value;
  if (!q) return items;
  return items.filter((i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q));
});

function runCommandPalette(item: { run: () => void }) {
  commandPaletteVisible.value = false;
  commandPaletteFilter.value = '';
  item.run();
}

function goToDocumentosTab() {
  activeTab.value = 2;
}

function quickNewActuacion() {
  activeTab.value = 1;
  void nextTick(() => openRootCreateDialog());
}

function openScheduleHearingDialog() {
  createItemError.value = '';
  newItem.value = {
    title: 'Audiencia',
    description: '',
    kind: 'Audiencia',
    actionType: 'schedule_hearing',
    assignedToId: '',
    priority: '',
    location: '',
    allDay: true,
    dueDate: null,
    startDate: null,
    isLegalDeadline: false,
    accentColor: DEFAULT_ACCENT,
    reminderMinutesBefore: [],
    rrule: '',
    secondaryAssigneeIds: [],
    stageInstanceId: ptCurrentStageId.value || '',
    workflowStateCategory: 'todo',
  };
  showCreateDialog.value = true;
}

const externalSources = ref<Array<{ id: string; sourceType: string; lastCheckedAt?: string; lastError?: string }>>([]);
const sinoePanelLoading = ref(false);
const sinoeTriggerLoading = ref(false);

const canTriggerSinoeScrape = computed(
  () =>
    userPermissions.value.includes('scraping:trigger') || userPermissions.value.includes('sinoe:manage'),
);

async function loadSinoePanel() {
  if (!trackableId.value) return;
  sinoePanelLoading.value = true;
  try {
    const { data } = await apiClient.get('/scraping/external-sources', {
      params: { trackableId: trackableId.value },
    });
    externalSources.value = Array.isArray(data) ? data : [];
  } catch {
    externalSources.value = [];
  } finally {
    sinoePanelLoading.value = false;
  }
}

async function triggerSinoeScrape() {
  sinoeTriggerLoading.value = true;
  try {
    if (userPermissions.value.includes('sinoe:manage')) {
      await apiClient.post('/integrations/sinoe/credentials/trigger-scrape');
    } else {
      await apiClient.post('/scraping/trigger', { sourceType: 'sinoe' });
    }
    toast.add({ severity: 'success', summary: 'Sincronización encolada', life: 3000 });
    await loadSinoePanel();
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'SINOE',
      detail: extractApiErrorMessage(e, 'No se pudo encolar la sincronización.'),
      life: 5000,
    });
  } finally {
    sinoeTriggerLoading.value = false;
  }
}

interface TrackablePartyRow {
  id: string;
  role: string;
  partyName: string;
  documentId?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

const trackableParties = ref<TrackablePartyRow[]>([]);
const partiesLoading = ref(false);
const partyDialogVisible = ref(false);
const partySaving = ref(false);
const editingPartyId = ref<string | null>(null);
const partyForm = ref({
  role: 'other',
  partyName: '',
  documentId: '',
  email: '',
  phone: '',
  notes: '',
});

const partyRoleOptions = [
  { label: 'Demandante', value: 'plaintiff' },
  { label: 'Demandado', value: 'defendant' },
  { label: 'Tercero', value: 'third_party' },
  { label: 'Apoderado', value: 'attorney' },
  { label: 'Otro', value: 'other' },
];

function partyRoleLabel(role: string) {
  return partyRoleOptions.find((r) => r.value === role)?.label ?? role;
}

async function loadParties() {
  if (!trackableId.value) return;
  partiesLoading.value = true;
  try {
    const { data } = await apiClient.get(`/trackables/${trackableId.value}/parties`);
    trackableParties.value = Array.isArray(data) ? data : [];
  } catch {
    trackableParties.value = [];
  } finally {
    partiesLoading.value = false;
  }
}

function openPartyDialog(row?: TrackablePartyRow) {
  editingPartyId.value = row?.id ?? null;
  partyForm.value = row
    ? {
        role: row.role,
        partyName: row.partyName,
        documentId: row.documentId ?? '',
        email: row.email ?? '',
        phone: row.phone ?? '',
        notes: row.notes ?? '',
      }
    : {
        role: 'other',
        partyName: '',
        documentId: '',
        email: '',
        phone: '',
        notes: '',
      };
  partyDialogVisible.value = true;
}

async function saveParty() {
  if (!trackableId.value || !partyForm.value.partyName.trim()) return;
  partySaving.value = true;
  try {
    if (editingPartyId.value) {
      await apiClient.patch(`/trackables/${trackableId.value}/parties/${editingPartyId.value}`, {
        ...partyForm.value,
      });
    } else {
      await apiClient.post(`/trackables/${trackableId.value}/parties`, { ...partyForm.value });
    }
    partyDialogVisible.value = false;
    await loadParties();
    toast.add({ severity: 'success', summary: 'Parte guardada', life: 2200 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Parte',
      detail: extractApiErrorMessage(e, 'No se pudo guardar.'),
      life: 4500,
    });
  } finally {
    partySaving.value = false;
  }
}

async function deletePartyRow(row: TrackablePartyRow) {
  if (!trackableId.value) return;
  try {
    await apiClient.delete(`/trackables/${trackableId.value}/parties/${row.id}`);
    await loadParties();
    toast.add({ severity: 'success', summary: 'Parte eliminada', life: 2200 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Parte',
      detail: extractApiErrorMessage(e, 'No se pudo eliminar.'),
      life: 4500,
    });
  }
}

const selectedItem = ref<WorkflowItem | null>(null);
const editingItem = ref<WorkflowItem | null>(null);
/** Solo hojas pueden cambiar de workflow en backend. */
const sidebarItemHasChildren = computed(() => {
  if (!editingItem.value) return false;
  return items.value.some((i) => i.parentId === editingItem.value!.id);
});
/** Modo edición explícito en el diálogo de detalle (solo con permiso workflow_item:update). */
const isEditingDetail = ref(false);
const editingItemSnapshot = ref<string | null>(null);
const detailAccentPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const createAccentPopoverRef = ref<InstanceType<typeof Popover> | null>(null);

/** Texto visible sin marcas (p. ej. `<p><br></p>` → vacío). */
function stripTagsToPlain(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionHasDisplayContent(raw?: string | null): boolean {
  if (raw == null) return false;
  const t = String(raw).trim();
  if (!t) return false;
  return stripTagsToPlain(t).length > 0;
}

/** HTML enriquecido (Quill) vs texto plano heredado. */
function isLikelyHtmlContent(raw?: string | null): boolean {
  if (raw == null || !String(raw).trim()) return false;
  return /<[a-z][\s\S]*/i.test(String(raw).trim());
}

function dateFromIso(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function onEditStartDate(d: unknown) {
  if (!editingItem.value) return;
  const v = d instanceof Date ? d : null;
  editingItem.value.startDate = v ? v.toISOString() : undefined;
}

function onEditDueDate(d: unknown) {
  if (!editingItem.value) return;
  const v = d instanceof Date ? d : null;
  editingItem.value.dueDate = v ? v.toISOString() : undefined;
}
const itemSaving = ref(false);
const detailWorkflowName = ref<string | null>(null);
const workflowDefinitionsPicker = ref<Array<{ id: string; name: string; slug: string; isSystem: boolean }>>([]);
const workflowPickerValue = ref<string | null>(null);
const workflowChangeLoading = ref(false);
/** Altura máxima del cuerpo del diálogo; el scroll queda en columnas Principal / Detalles. */
const itemDetailDialogContentStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  maxHeight: 'min(80vh, 48rem)',
  overflow: 'hidden',
};
const showCreateDialog = ref(false);
const processBoardRef = ref<InstanceType<typeof ProcessStageBoardView> | null>(null);

/** `useProcessTrackData` vive en este view y otra instancia en ProcessStageBoardView; al mutar comentarios/archivos hay que actualizar ambos `pt` para el sidebar y el Kanban. */
function refreshProcessTrackDataInUI() {
  void loadProcessTrackSilent();
  const board = processBoardRef.value as { refresh?: () => Promise<unknown> } | null;
  if (board?.refresh) void board.refresh();
}
const createItemSaving = ref(false);
const createItemError = ref('');
const users = ref<Array<{ id: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string | null }>>([]);

watch(showCreateDialog, (open) => {
  if (open) {
    createItemError.value = '';
  }
});

function formatWorkflowItemCreateError(err: unknown): string {
  const ax = err as {
    response?: { data?: { message?: unknown; error?: string } };
    message?: string;
  };
  const raw = ax.response?.data?.message;
  if (Array.isArray(raw)) return raw.map(String).join(' ');
  if (typeof raw === 'string') return raw;
  if (typeof ax.response?.data?.error === 'string') return ax.response.data.error;
  if (err instanceof Error && err.message) return err.message;
  return 'No se pudo crear la actividad.';
}

const rootFolderId = ref<string | null>(null);
const folders = ref<Array<{ id: string; name: string; emoji?: string; parent?: { id: string } }>>([]);
const newDocFolderId = ref<string | null>(null);
const selectedTemplateDoc = ref<any>(null);
const showTemplateSearch = ref(false);
const itemDocuments = ref<Array<{ id: string; title: string; reviewStatus: string; mimeType?: string }>>([]);
const documentsLoading = ref(false);
const showNewDocDialog = ref(false);
const newDocTitle = ref('');
const uploadInputRef = ref<HTMLInputElement | null>(null);
const showUploadFolderDialog = ref(false);
const uploadFolderPickId = ref<string | null>(null);
/** Carpeta elegida en el modal; se consume al procesar la siguiente subida desde el input oculto. */
const pendingUploadFolderId = ref<string | null>(null);

const folderOptions = computed(() => {
  const options: { label: string; value: string }[] = [];
  function addFolder(folder: any, depth: number) {
    const prefix = '\u00A0\u00A0'.repeat(depth * 2) + (depth > 0 ? '└ ' : '');
    const emoji = folder.emoji ? `${folder.emoji} ` : '';
    options.push({ label: prefix + emoji + folder.name, value: folder.id });
    folders.value
      .filter((f) => f.parent?.id === folder.id)
      .forEach((child) => addFolder(child, depth + 1));
  }
  folders.value.filter((f) => !f.parent).forEach((f) => addFolder(f, 0));
  return options;
});

const statusMap: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  in_progress: 'En progreso',
  under_review: 'En revisión',
  validated: 'Validado',
  closed: 'Cerrado',
  rejected: 'Rechazado',
  skipped: 'Omitido',
};

const kindOptions = [
  { label: 'Fase', value: 'Fase' },
  { label: 'Actividad (ítem)', value: 'Actuacion' },
  { label: 'Diligencia', value: 'Diligencia' },
  { label: 'Escrito', value: 'Escrito' },
  { label: 'Audiencia', value: 'Audiencia' },
  { label: 'Plazo', value: 'Plazo' },
];

const actionTypeOptions = [
  { label: 'Creación de documento', value: 'doc_creation' },
  { label: 'Carga de documento', value: 'doc_upload' },
  { label: 'Aprobación', value: 'approval' },
  { label: 'Ingreso de datos', value: 'data_entry' },
  { label: 'Verificación externa', value: 'external_check' },
  { label: 'Notificación', value: 'notification' },
  { label: 'Presentar escrito', value: 'file_brief' },
  { label: 'Audiencia / vista', value: 'schedule_hearing' },
  { label: 'Pago de tasa judicial', value: 'pay_court_fee' },
  { label: 'Notificar partes', value: 'notify_party' },
  { label: 'Genérico', value: 'generic' },
];

const priorityOptions = [
  { label: 'Urgente', value: 'urgent' },
  { label: 'Alta', value: 'high' },
  { label: 'Normal', value: 'normal' },
  { label: 'Baja', value: 'low' },
];

const reminderOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 h', value: 60 },
  { label: '1 día', value: 1440 },
  { label: '1 semana', value: 10080 },
];

const rruleOptions = computed(() => [
  { label: t('globalCalendar.rruleNone'), value: '' },
  { label: t('globalCalendar.rruleDaily'), value: 'FREQ=DAILY' },
  { label: t('globalCalendar.rruleWeekly'), value: 'FREQ=WEEKLY' },
  { label: t('globalCalendar.rruleMonthly'), value: 'FREQ=MONTHLY' },
  { label: t('globalCalendar.rruleYearly'), value: 'FREQ=YEARLY' },
]);

function reminderLabel(minutes: number): string {
  const found = reminderOptions.find((o) => o.value === minutes);
  return found?.label ?? `${minutes} min`;
}

function rruleReadLabel(rrule: string | null | undefined): string {
  if (!rrule?.trim()) return '—';
  const opt = rruleOptions.value.find((o) => o.value === rrule);
  return opt?.label ?? rrule;
}

const editingPriority = computed({
  get: () => editingItem.value?.priority ?? '',
  set: (val: string) => {
    if (!editingItem.value) return;
    editingItem.value.priority = (val || undefined) as WorkflowItem['priority'];
  },
});

const editingAssignedToId = computed({
  get: () => editingItem.value?.assignedTo?.id ?? '',
  set: (val: string) => {
    if (!editingItem.value) return;
    const user = users.value.find((u) => u.id === val);
    editingItem.value.assignedTo = user
      ? {
          id: user.id,
          firstName: user.firstName,
          email: user.email,
          lastName: (user as { lastName?: string }).lastName,
          avatarUrl: (user as { avatarUrl?: string | null }).avatarUrl ?? null,
        }
      : undefined;
  },
});

const editingSecondaryAssigneeIds = computed<string[]>({
  get: () => (editingItem.value?.metadata?.secondaryAssigneeIds as string[] | undefined) ?? [],
  set: (ids) => {
    if (!editingItem.value) return;
    editingItem.value.metadata = { ...(editingItem.value.metadata ?? {}), secondaryAssigneeIds: ids };
  },
});

/** “Todo el día” en UI: solo `allDay === false` activa selector de hora. */
const editingAllDayUi = computed({
  get: () => editingItem.value?.allDay !== false,
  set: (v: boolean) => {
    if (!editingItem.value) return;
    editingItem.value.allDay = v;
  },
});

const editingShowCalendarTime = computed(
  () => !!editingItem.value && editingItem.value.allDay === false,
);

function serializeEditingItem(): string {
  if (!editingItem.value) return '';
  return JSON.stringify({
    title: editingItem.value.title ?? '',
    description: editingItem.value.description ?? '',
    kind: editingItem.value.kind ?? '',
    assignedToId: editingAssignedToId.value || '',
    priority: editingItem.value.priority ?? '',
    startDate: editingItem.value.startDate ?? null,
    dueDate: editingItem.value.dueDate ?? null,
    isLegalDeadline: !!editingItem.value.isLegalDeadline,
    accentColor: editingItem.value.accentColor ?? null,
    location: (editingItem.value.location ?? '').trim(),
    allDay: !!editingItem.value.allDay,
    metadata: editingItem.value.metadata ?? {},
    reminderMinutesBefore: JSON.stringify(
      [...(editingItem.value.reminderMinutesBefore ?? [])].sort((a, b) => a - b),
    ),
    rrule: editingItem.value.rrule ?? '',
    secondaryAssigneeIds: JSON.stringify([...editingSecondaryAssigneeIds.value].sort()),
  });
}

const editingItemIsDirty = computed(() => {
  if (!editingItem.value || editingItemSnapshot.value === null) return false;
  return editingItemSnapshot.value !== serializeEditingItem();
});

const detailAssigneeDisplay = computed(() => {
  const a = editingItem.value?.assignedTo;
  if (!a) return '';
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
  return name || a.email || '';
});

const detailAssigneeInitials = computed(() => {
  const a = editingItem.value?.assignedTo;
  if (!a) return '?';
  const f = a.firstName?.[0] ?? '';
  const l = a.lastName?.[0] ?? '';
  const fromEmail = a.email?.[0]?.toUpperCase() ?? '';
  return (f + l || fromEmail).slice(0, 2).toUpperCase();
});

function secondaryAssigneeName(userId: string): string {
  const u = users.value.find((x) => x.id === userId);
  if (!u) return userId;
  const name = [u.firstName, (u as { lastName?: string }).lastName].filter(Boolean).join(' ');
  return name || u.email || userId;
}

function secondaryAssigneeInitials(userId: string): string {
  const u = users.value.find((x) => x.id === userId);
  if (!u) return '?';
  const f = u.firstName?.[0] ?? '';
  const l = (u as { lastName?: string }).lastName?.[0] ?? '';
  const fromEmail = u.email?.[0]?.toUpperCase() ?? '';
  return (f + l || fromEmail).slice(0, 2).toUpperCase();
}

const newItem = ref({
  title: '',
  description: '',
  kind: '',
  actionType: '',
  assignedToId: '',
  priority: '',
  location: '',
  allDay: true as boolean,
  dueDate: null as Date | null,
  startDate: null as Date | null,
  isLegalDeadline: false,
  accentColor: DEFAULT_ACCENT,
  reminderMinutesBefore: [] as number[],
  rrule: '' as string,
  secondaryAssigneeIds: [] as string[],
  /** Motor v2: etapa y columna al crear desde tablero */
  stageInstanceId: '' as string,
  workflowStateCategory: 'todo' as string,
});

const createDialogStateColumnLabel = computed(() => {
  const c = (newItem.value.workflowStateCategory || 'todo').toLowerCase();
  if (c === 'done') return t('processTrack.activity.state.done');
  if (c === 'in_progress' || c === 'in_review') return t('processTrack.expedienteBoard.colInProgress');
  return t('processTrack.activity.state.todo');
});

const newItemAccentPickerValue = computed(() => {
  const v = newItem.value.accentColor;
  return v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : DEFAULT_ACCENT;
});

const userOptions = computed(() =>
  users.value.map((u) => ({
    label: u.firstName ? `${u.firstName} (${u.email})` : u.email,
    value: u.id,
  })),
);

const secondaryAssigneeOptions = computed(() => {
  const primary = editingAssignedToId.value;
  return userOptions.value.filter((o) => o.value !== primary);
});

const newItemSecondaryAssigneeOptions = computed(() => {
  const primary = newItem.value.assignedToId;
  return userOptions.value.filter((o) => o.value !== primary);
});

const caseDisplayMatterLabel = computed(() => {
  const v = caseForm.value.matterType;
  return matterTypeOptions.find((m) => m.value === v)?.label ?? v ?? '—';
});

const caseDisplayType = computed(() => {
  const v = caseForm.value.type;
  if (!v) return '—';
  const key = `trackables.types.${v}`;
  const translated = t(key);
  return translated === key ? v : translated;
});

const caseDisplayClientName = computed(() => {
  if (!caseForm.value.clientId) return '—';
  return clientsOptions.value.find((c) => c.id === caseForm.value.clientId)?.name ?? '—';
});

const caseDisplayAssignee = computed(() => {
  if (!caseForm.value.assignedToId) return 'Sin asignar';
  return userOptions.value.find((u) => u.value === caseForm.value.assignedToId)?.label ?? '—';
});

const createDialogTitle = computed(() => t('globalCalendar.newActivityDialogTitle'));

function onOpenCreateActivityFromBoard(payload?: { stageInstanceId: string; workflowStateCategory: string }) {
  openRootCreateDialog(payload);
}

function onOpenActivityFromBoard(id: string) {
  const it = items.value.find((i) => i.id === id);
  if (it) void openSidebar(it);
}

function openRootCreateDialog(
  pre?: { stageInstanceId: string; workflowStateCategory: string } | null,
) {
  createItemError.value = '';
  newItem.value = {
    title: '',
    description: '',
    kind: '',
    actionType: '',
    assignedToId: '',
    priority: '',
    location: '',
    allDay: true,
    dueDate: null,
    startDate: null,
    isLegalDeadline: false,
    accentColor: DEFAULT_ACCENT,
    reminderMinutesBefore: [],
    rrule: '',
    secondaryAssigneeIds: [],
    stageInstanceId: pre?.stageInstanceId?.trim() || ptCurrentStageId.value || '',
    workflowStateCategory: (pre?.workflowStateCategory || 'todo').toLowerCase(),
  };
  showCreateDialog.value = true;
}

function statusLabel(status: string): string {
  return statusMap[status] ?? status;
}

function statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (status === 'rejected') return 'danger';
  if (status === 'validated') return 'success';
  if (status === 'pending') return 'warn';
  if (status === 'closed' || status === 'skipped') return 'secondary';
  return 'info';
}

function kindLabel(kind: string | undefined | null): string {
  if (!kind) return '';
  return kindOptions.find((o) => o.value === kind)?.label ?? kind;
}

function priorityLabelForItem(priority: string | undefined | null): string {
  if (!priority) return '';
  return priorityOptions.find((o) => o.value === priority)?.label ?? priority;
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Fecha de alta + origen (usuario, Alega) según metadata del API. */
function formatWorkflowItemCreatedLine(item: WorkflowItem): string {
  if (!item.createdAt) return '—';
  const raw = item.createdAt as string | Date;
  const iso = typeof raw === 'string' ? raw : new Date(raw).toISOString();
  let datePart: string;
  try {
    datePart = formatDate(iso);
  } catch {
    return '—';
  }
  const meta = item.metadata;
  const source = meta?.creationSource as string | undefined;
  const label = typeof meta?.creationActorLabel === 'string' ? meta.creationActorLabel.trim() : '';
  if (source === 'assistant') {
    return label ? `${datePart} · Alega (${label})` : `${datePart} · Alega`;
  }
  if (label) return `${datePart} · ${label}`;
  return datePart;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatActivityDateDisplay(iso: string | null | undefined, allDay?: boolean | null): string {
  if (!iso) return '—';
  if (allDay === false) return formatDateTime(iso);
  return formatDate(iso);
}

function formatCommentAuthor(u: WorkflowItemCommentRow['user']): string {
  if (!u) return 'Usuario';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name || u.email || 'Usuario';
}

const accentPickerValue = computed(() => {
  const v = editingItem.value?.accentColor;
  return v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : DEFAULT_ACCENT;
});

function onAccentColorPick(e: Event) {
  const el = e.target as HTMLInputElement;
  if (!editingItem.value || !el?.value) return;
  editingItem.value.accentColor = el.value.startsWith('#') ? el.value : `#${el.value}`;
}

function setEditingAccent(hex: string | null) {
  if (!editingItem.value) return;
  editingItem.value.accentColor = hex ?? undefined;
}

/** Color guardado que no coincide con ningún preset (p. ej. elegido con la paleta). */
function isCustomAccentValue(hex: string | null | undefined): boolean {
  if (hex == null || String(hex).trim() === '') return false;
  const n = hex.toLowerCase();
  return !accentPresets.some((p) => p.value.toLowerCase() === n);
}

function setEditingAccentPreset(hex: string | null) {
  setEditingAccent(hex);
}

function setNewItemAccentPreset(hex: string) {
  newItem.value.accentColor = hex;
}

function setNewItemAccentDefault() {
  newItem.value.accentColor = DEFAULT_ACCENT;
}

function onNewItemAccentColorPick(e: Event) {
  const el = e.target as HTMLInputElement;
  if (!el?.value) return;
  newItem.value.accentColor = el.value.startsWith('#') ? el.value : `#${el.value}`;
}

async function loadUserPermissions() {
  try {
    const { data } = await apiClient.get('/auth/me');
    userPermissions.value = Array.isArray(data?.permissions) ? data.permissions : [];
  } catch {
    userPermissions.value = [];
  }
}

function shareActivityLink() {
  if (!editingItem.value) return;
  const { href } = router.resolve({
    name: 'expediente',
    params: { id: trackableId.value },
    query: { workflowItemId: editingItem.value.id },
  });
  const url = new URL(href, window.location.origin).href;
  void navigator.clipboard.writeText(url);
  toast.add({ severity: 'success', summary: 'Enlace copiado al portapapeles', life: 2800 });
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: unknown; error?: string } } };
  const raw = ax.response?.data?.message;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map(String).join(' ');
  if (typeof ax.response?.data?.error === 'string') return ax.response.data.error;
  return fallback;
}

function isProcessTrackActivityId(itemId: string | undefined): boolean {
  if (!itemId) return false;
  const row = items.value.find((i) => i.id === itemId) as
    | (WorkflowItem & { isProcessTrackActivity?: boolean })
    | undefined;
  return Boolean(row?.isProcessTrackActivity);
}

function isCurrentEditingProcessTrackItem(): boolean {
  return isProcessTrackActivityId(editingItem.value?.id);
}

async function loadWorkflowItemComments(itemId: string) {
  if (isProcessTrackActivityId(itemId)) {
    const row = items.value.find((i) => i.id === itemId) as
      | (WorkflowItem & { processTrackId?: string; isProcessTrackActivity?: boolean })
      | undefined;
    const ptId = row?.processTrackId ?? primaryProcessTrackId.value;
    if (!ptId) {
      workflowItemComments.value = [];
      commentsLoadError.value = null;
      commentsLoading.value = false;
      return;
    }
    commentsLoading.value = true;
    commentsLoadError.value = null;
    newCommentText.value = '';
    try {
      const { data } = await apiClient.get(`/process-tracks/${ptId}/activities/${itemId}/comments`);
      workflowItemComments.value = Array.isArray(data) ? data : [];
    } catch (err) {
      workflowItemComments.value = [];
      commentsLoadError.value = extractApiErrorMessage(err, 'No se pudieron cargar los comentarios.');
    } finally {
      commentsLoading.value = false;
    }
    return;
  }
  commentsLoading.value = true;
  commentsLoadError.value = null;
  newCommentText.value = '';
  try {
    const { data } = await apiClient.get(`/workflow-items/${itemId}/comments`);
    workflowItemComments.value = Array.isArray(data) ? data : [];
  } catch (err) {
    workflowItemComments.value = [];
    commentsLoadError.value = extractApiErrorMessage(err, 'No se pudieron cargar los comentarios.');
  } finally {
    commentsLoading.value = false;
  }
}

function retryLoadWorkflowItemComments() {
  const id = editingItem.value?.id;
  if (id) void loadWorkflowItemComments(id);
}

async function postWorkflowItemComment() {
  const text = newCommentText.value.trim();
  if (!editingItem.value || !text) return;
  const ptId =
    (editingItem.value as WorkflowItem & { processTrackId?: string }).processTrackId ??
    primaryProcessTrackId.value;
  if (isCurrentEditingProcessTrackItem()) {
    if (!ptId) {
      toast.add({ severity: 'error', summary: 'Comentario', detail: 'No hay proceso vinculado a esta actividad.', life: 4000 });
      return;
    }
    commentPosting.value = true;
    try {
      const { data } = await apiClient.post(
        `/process-tracks/${ptId}/activities/${editingItem.value.id}/comments`,
        { body: text },
      );
      workflowItemComments.value = [...workflowItemComments.value, data];
      newCommentText.value = '';
      commentsLoadError.value = null;
      toast.add({ severity: 'success', summary: 'Comentario publicado', life: 2200 });
      refreshProcessTrackDataInUI();
    } catch (err) {
      const detail = extractApiErrorMessage(err, 'No se pudo publicar el comentario.');
      toast.add({ severity: 'error', summary: 'Comentario', detail, life: 4500 });
    } finally {
      commentPosting.value = false;
    }
    return;
  }
  commentPosting.value = true;
  try {
    const { data } = await apiClient.post(`/workflow-items/${editingItem.value.id}/comments`, { body: text });
    workflowItemComments.value = [...workflowItemComments.value, data];
    newCommentText.value = '';
    commentsLoadError.value = null;
    toast.add({ severity: 'success', summary: 'Comentario publicado', life: 2200 });
    if (primaryProcessTrackId.value) refreshProcessTrackDataInUI();
  } catch (err) {
    const detail = extractApiErrorMessage(err, 'No se pudo publicar el comentario.');
    toast.add({ severity: 'error', summary: 'Comentario', detail, life: 4500 });
  } finally {
    commentPosting.value = false;
  }
}

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadItems() {
  const { data } = await apiClient.get(`/trackables/${trackableId.value}/tree`);
  workflowTree.value = Array.isArray(data) ? data : [];
  if (primaryProcessTrackId.value) {
    await loadProcessTrack();
  }
}

async function loadTrackable() {
  const id = trackableId.value;
  caseGeneralEditing.value = false;
  const { data } = await apiClient.get(`/trackables/${id}`);
  trackableDetail.value = data as Record<string, unknown>;
  applyTrackableToCaseForm(data as Record<string, unknown>);
  const title = data.title ?? `Trackable ${id}`;
  recordVisit(id, title);
  await Promise.all([loadClientsForCase(), loadCaseTabExtras()]);
}

async function loadUsers() {
  const { data } = await apiClient.get('/users', { params: { limit: 100 } });
  users.value = Array.isArray(data) ? data : data.data;
}

async function loadFolders() {
  try {
    const { data } = await apiClient.get(`/folders/trackable/${trackableId.value}`);
    folders.value = Array.isArray(data) ? data : [];
    if (folders.value.length > 0) {
      rootFolderId.value = folders.value[0].id;
      newDocFolderId.value = folders.value[0].id;
    }
  } catch (error) {
    console.error('Error cargando carpetas:', error);
  }
}

async function loadItemDocuments(itemId: string) {
  try {
    documentsLoading.value = true;
    const isPt = items.value.find((i) => i.id === itemId) as
      | (WorkflowItem & { isProcessTrackActivity?: boolean })
      | undefined;
    if (isPt?.isProcessTrackActivity) {
      const { data } = await apiClient.get('/documents', { params: { activityInstanceId: itemId, limit: 50 } });
      const raw = Array.isArray(data) ? data : data.data || [];
      itemDocuments.value = Array.isArray(raw) ? raw : [];
      return;
    }
    const { data } = await apiClient.get('/documents', { params: { workflowItemId: itemId } });
    itemDocuments.value = Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error('Error cargando documentos:', error);
    itemDocuments.value = [];
  } finally {
    documentsLoading.value = false;
  }
}

function refreshCurrentTab() {
  if (activeTab.value === 0) {
    void loadTrackable();
    void loadDashboardData();
    void loadSinoePanel();
    void loadParties();
  } else if (activeTab.value === 1) {
    void loadItems();
    void loadDashboardData();
  } else if (activeTab.value === 3) {
    void loadItems();
    void calFcRef.value?.getApi()?.refetchEvents();
  } else if (activeTab.value === 2) {
    /* documentos: FolderBrowserView refresca solo al montar */
  }
}

async function ensureWorkflowDefinitionsPicker() {
  if (workflowDefinitionsPicker.value.length) return;
  try {
    const { data } = await apiClient.get<
      Array<{ id: string; name: string; slug: string; isSystem: boolean }>
    >('/workflow-definitions');
    workflowDefinitionsPicker.value = Array.isArray(data) ? data : [];
  } catch {
    workflowDefinitionsPicker.value = [];
  }
}

async function applyWorkflowFromPicker(newWorkflowId: string | null) {
  if (!editingItem.value) return;
  if (newWorkflowId == null || newWorkflowId === '') {
    workflowPickerValue.value = editingItem.value.workflowId ?? null;
    return;
  }
  if (newWorkflowId === (editingItem.value.workflowId ?? null)) return;
  if ((editingItem.value as WorkflowItem & { isProcessTrackActivity?: boolean }).isProcessTrackActivity) {
    const ptId = (editingItem.value as WorkflowItem & { processTrackId?: string }).processTrackId ?? primaryProcessTrackId.value;
    if (!ptId) return;
    workflowChangeLoading.value = true;
    try {
      await patchProcessTrackActivity(ptId, editingItem.value.id, { workflowId: newWorkflowId });
      await loadItems();
      await processBoardRef.value?.refresh();
      const refreshed = items.value.find((i) => i.id === editingItem.value!.id);
      if (refreshed) await openSidebar(refreshed);
      toast.add({ severity: 'success', summary: t('trackables.flow.changeFlowSuccess'), life: 3000 });
    } catch (err: unknown) {
      workflowPickerValue.value = editingItem.value.workflowId ?? null;
      toast.add({
        severity: 'error',
        summary: t('trackables.flow.changeFlowError'),
        detail: extractApiErrorMessage(err, t('trackables.flow.changeFlowError')),
        life: 5000,
      });
    } finally {
      workflowChangeLoading.value = false;
    }
    return;
  }
  if (sidebarItemHasChildren.value) {
    toast.add({
      severity: 'warn',
      summary: t('trackables.flow.changeFlowWarn'),
      detail: t('trackables.flow.changeFlowDisabledChildren'),
      life: 5000,
    });
    workflowPickerValue.value = editingItem.value.workflowId ?? null;
    return;
  }
  workflowChangeLoading.value = true;
  try {
    await apiClient.patch(`/workflow-items/${editingItem.value.id}`, { workflowId: newWorkflowId });
    await loadItems();
    const refreshed = items.value.find((i) => i.id === editingItem.value!.id);
    if (refreshed) await openSidebar(refreshed);
    toast.add({ severity: 'success', summary: t('trackables.flow.changeFlowSuccess'), life: 3000 });
  } catch (err: unknown) {
    workflowPickerValue.value = editingItem.value.workflowId ?? null;
    toast.add({
      severity: 'error',
      summary: t('trackables.flow.changeFlowError'),
      detail: extractApiErrorMessage(err, t('trackables.flow.changeFlowError')),
      life: 5000,
    });
  } finally {
    workflowChangeLoading.value = false;
  }
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
async function openSidebar(item: WorkflowItem) {
  selectedItem.value = item;
  editingItem.value = { ...item, metadata: item.metadata ? { ...item.metadata } : {} };
  if (editingItem.value.allDay === undefined) editingItem.value.allDay = true;
  if (editingItem.value.location === undefined || editingItem.value.location === null) {
    editingItem.value.location = '';
  }
  if (editingItem.value.description === undefined || editingItem.value.description === null) {
    editingItem.value.description = '';
  }
  if (!Array.isArray(editingItem.value.reminderMinutesBefore)) {
    editingItem.value.reminderMinutesBefore = [];
  }
  if (editingItem.value.rrule === undefined || editingItem.value.rrule === null) {
    editingItem.value.rrule = '';
  }
  workflowPickerValue.value = item.workflowId ?? null;
  detailWorkflowName.value = null;
  await ensureWorkflowDefinitionsPicker();

  const wfMetaPromise = item.workflowId
    ? apiClient.get(`/workflow-definitions/${item.workflowId}`).catch(() => null)
    : Promise.resolve(null);
  const wfRes = await wfMetaPromise;
  if (wfRes && wfRes.data) {
    detailWorkflowName.value = (wfRes.data as { name?: string }).name ?? null;
  }

  await Promise.all([loadItemDocuments(item.id), loadWorkflowItemComments(item.id)]);
  isEditingDetail.value = false;
  editingItemSnapshot.value = serializeEditingItem();
}

async function openDeadlineRow(row: { id: string }) {
  const item = items.value.find((i) => i.id === row.id);
  if (item) {
    await openSidebar(item);
    return;
  }
  toast.add({
    severity: 'info',
    summary: 'Actividad no disponible',
    detail: 'Recarga el expediente o abre la pestaña Actividades.',
    life: 4000,
  });
}

function closeSidebar() {
  isEditingDetail.value = false;
  editingItemSnapshot.value = null;
  selectedItem.value = null;
  editingItem.value = null;
  detailWorkflowName.value = null;
  workflowPickerValue.value = null;
  workflowItemComments.value = [];
  commentsLoadError.value = null;
  newCommentText.value = '';
}

async function saveItem() {
  if (!editingItem.value) return;
  try {
    itemSaving.value = true;
    const descRaw = editingItem.value.description ?? '';
    if ((editingItem.value as WorkflowItem & { isProcessTrackActivity?: boolean }).isProcessTrackActivity) {
      const ptId = (editingItem.value as WorkflowItem & { processTrackId?: string }).processTrackId
        ?? primaryProcessTrackId.value;
      if (!ptId) throw new Error('No process track');
      await patchProcessTrackActivity(ptId, editingItem.value.id, {
        title: editingItem.value.title,
        kind: editingItem.value.kind || undefined,
        actionType: editingItem.value.actionType || undefined,
        description: descriptionHasDisplayContent(descRaw) ? descRaw : '',
        assignedToId: editingAssignedToId.value || null,
        startDate: editingItem.value.startDate,
        dueDate: editingItem.value.dueDate,
        isLegalDeadline: editingItem.value.isLegalDeadline,
        metadata: editingItem.value.metadata,
        accentColor: editingItem.value.accentColor ?? null,
        priority: editingItem.value.priority || undefined,
        location: editingItem.value.location?.trim() || null,
        allDay: editingItem.value.allDay,
        reminderMinutesBefore: editingItem.value.reminderMinutesBefore ?? [],
        rrule: (editingItem.value.rrule?.trim() ? editingItem.value.rrule : null) as string | null,
        secondaryAssigneeIds: editingSecondaryAssigneeIds.value,
      });
    } else {
      await apiClient.patch(`/workflow-items/${editingItem.value.id}`, {
        title: editingItem.value.title,
        kind: editingItem.value.kind || undefined,
        description: descriptionHasDisplayContent(descRaw) ? descRaw : '',
        assignedToId: editingAssignedToId.value || undefined,
        startDate: editingItem.value.startDate,
        dueDate: editingItem.value.dueDate,
        isLegalDeadline: editingItem.value.isLegalDeadline,
        metadata: editingItem.value.metadata,
        accentColor: editingItem.value.accentColor ?? null,
        priority: editingItem.value.priority || undefined,
        location: editingItem.value.location?.trim() || undefined,
        allDay: editingItem.value.allDay,
        reminderMinutesBefore: editingItem.value.reminderMinutesBefore ?? [],
        rrule: editingItem.value.rrule ?? '',
        secondaryAssigneeIds: editingSecondaryAssigneeIds.value,
      });
    }
    await loadItems();
    if ((editingItem.value as WorkflowItem & { isProcessTrackActivity?: boolean }).isProcessTrackActivity) {
      await processBoardRef.value?.refresh();
    }
    const refreshed = items.value.find((i) => i.id === editingItem.value!.id);
    if (refreshed) {
      selectedItem.value = refreshed;
      editingItem.value = { ...refreshed, metadata: refreshed.metadata ? { ...refreshed.metadata } : {} };
      if (editingItem.value.description === undefined || editingItem.value.description === null) {
        editingItem.value.description = '';
      }
    }
    toast.add({ severity: 'success', summary: 'Item actualizado', life: 3000 });
    isEditingDetail.value = false;
    editingItemSnapshot.value = serializeEditingItem();
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 });
  } finally {
    itemSaving.value = false;
  }
}

function enterEditMode() {
  if (!canEditWorkflowItem.value) return;
  isEditingDetail.value = true;
  void nextTick(() => {
    document.getElementById('item-detail-title')?.focus();
  });
}

function onDetailDialogVisible(v: boolean) {
  if (v) return;
  if (editingItemIsDirty.value && isEditingDetail.value && canEditWorkflowItem.value) {
    if (!window.confirm('¿Descartar cambios sin guardar?')) return;
  }
  closeSidebar();
}

function emptyNewItem() {
  return {
    title: '',
    description: '',
    kind: '',
    actionType: '',
    assignedToId: '',
    priority: '',
    location: '',
    allDay: true,
    dueDate: null as Date | null,
    startDate: null as Date | null,
    isLegalDeadline: false,
    accentColor: DEFAULT_ACCENT,
    reminderMinutesBefore: [] as number[],
    rrule: '' as string,
    secondaryAssigneeIds: [] as string[],
    stageInstanceId: '' as string,
    workflowStateCategory: 'todo' as string,
  };
}

async function createItem() {
  createItemError.value = '';
  const descRaw = newItem.value.description?.trim() ?? '';
  const ptId = primaryProcessTrackId.value;

  createItemSaving.value = true;
  try {
    if (ptId) {
      const stageId = newItem.value.stageInstanceId?.trim() || ptCurrentStageId.value;
      if (!stageId) {
        throw new Error('Falta etapa. Abre de nuevo o selecciona una etapa en el tablero.');
      }
      const created = await createCustomActivity(ptId, {
        title: newItem.value.title,
        stageInstanceId: stageId,
        workflowStateCategory: newItem.value.workflowStateCategory || 'todo',
        description: descriptionHasDisplayContent(descRaw) ? descRaw : undefined,
        kind: newItem.value.kind || undefined,
        actionType: newItem.value.actionType || undefined,
        assignedToId: newItem.value.assignedToId || null,
        dueDate: newItem.value.dueDate ? newItem.value.dueDate.toISOString() : null,
        startDate: newItem.value.startDate ? newItem.value.startDate.toISOString() : null,
        isLegalDeadline: newItem.value.isLegalDeadline || undefined,
        accentColor:
          newItem.value.accentColor && newItem.value.accentColor !== DEFAULT_ACCENT
            ? newItem.value.accentColor
            : null,
        priority: newItem.value.priority || undefined,
        location: newItem.value.location?.trim() || undefined,
        allDay: newItem.value.allDay,
        reminderMinutesBefore: newItem.value.reminderMinutesBefore.length
          ? newItem.value.reminderMinutesBefore
          : null,
        rrule: newItem.value.rrule || null,
        secondaryAssigneeIds: newItem.value.secondaryAssigneeIds.length
          ? newItem.value.secondaryAssigneeIds
          : undefined,
        metadata: undefined,
      });
      showCreateDialog.value = false;
      newItem.value = emptyNewItem();
      await loadItems();
      await processBoardRef.value?.refresh();
      const createdId = (created as { id?: string } | undefined)?.id;
      if (createdId) {
        const refreshed = items.value.find((i) => i.id === createdId);
        if (refreshed) await openSidebar(refreshed);
      }
    } else {
      const payload: Record<string, unknown> = {
        title: newItem.value.title,
        trackableId: trackableId.value,
      };
      if (descriptionHasDisplayContent(descRaw)) payload.description = descRaw;
      if (newItem.value.kind) payload.kind = newItem.value.kind;
      if (newItem.value.actionType) payload.actionType = newItem.value.actionType;
      if (newItem.value.assignedToId) payload.assignedToId = newItem.value.assignedToId;
      if (newItem.value.dueDate) payload.dueDate = newItem.value.dueDate.toISOString();
      if (newItem.value.startDate) payload.startDate = newItem.value.startDate.toISOString();
      if (newItem.value.isLegalDeadline) payload.isLegalDeadline = true;
      if (newItem.value.accentColor && newItem.value.accentColor !== DEFAULT_ACCENT) {
        payload.accentColor = newItem.value.accentColor;
      }
      if (newItem.value.priority) {
        payload.priority = newItem.value.priority;
      }
      const loc = newItem.value.location?.trim();
      if (loc) payload.location = loc;
      if (newItem.value.allDay === false) payload.allDay = false;
      if (newItem.value.reminderMinutesBefore.length) {
        payload.reminderMinutesBefore = newItem.value.reminderMinutesBefore;
      }
      if (newItem.value.rrule) payload.rrule = newItem.value.rrule;
      if (newItem.value.secondaryAssigneeIds.length) {
        payload.secondaryAssigneeIds = newItem.value.secondaryAssigneeIds;
      }

      const { data: created } = await apiClient.post<WorkflowItem>('/workflow-items', payload);
      showCreateDialog.value = false;
      newItem.value = emptyNewItem();
      await loadItems();
      const createdId = created?.id;
      if (createdId) {
        const refreshed = items.value.find((i) => i.id === createdId);
        if (refreshed) await openSidebar(refreshed);
      }
    }
    toast.add({ severity: 'success', summary: 'Actividad creada', life: 4000 });
  } catch (err) {
    let msg = formatWorkflowItemCreateError(err);
    if (err instanceof Error && err.message?.includes('Falta etapa')) {
      msg = err.message;
    }
    if (/column.*kind|kind.*does not exist/i.test(msg)) {
      msg +=
        ' La base de datos no tiene la migración legal aplicada. En el proyecto ejecuta: pnpm --filter @tracker/db migrate';
    }
    createItemError.value = msg;
    toast.add({ severity: 'error', summary: 'Error al crear actividad', detail: msg, life: 8000 });
  } finally {
    createItemSaving.value = false;
  }
}

// ── File upload & documents ────────────────────────────────────────────────────
function openSidebarUploadFolderModal() {
  pendingUploadFolderId.value = null;
  uploadFolderPickId.value =
    newDocFolderId.value ?? rootFolderId.value ?? folders.value[0]?.id ?? null;
  showUploadFolderDialog.value = true;
}

function cancelUploadFolderModal() {
  showUploadFolderDialog.value = false;
}

function confirmUploadFolderAndPickFile() {
  if (!uploadFolderPickId.value || !editingItem.value) return;
  pendingUploadFolderId.value = uploadFolderPickId.value;
  showUploadFolderDialog.value = false;
  void nextTick(() => {
    uploadInputRef.value?.click();
  });
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const uploadFolderId = pendingUploadFolderId.value ?? rootFolderId.value;
  pendingUploadFolderId.value = null;
  if (!file || !editingItem.value || !uploadFolderId) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('folderId', uploadFolderId);
    formData.append('trackableId', trackableId.value);
    if ((editingItem.value as WorkflowItem & { isProcessTrackActivity?: boolean }).isProcessTrackActivity) {
      formData.append('activityInstanceId', editingItem.value.id);
    } else {
      formData.append('workflowItemId', editingItem.value.id);
    }

    await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    await loadItemDocuments(editingItem.value.id);
    if ((editingItem.value as WorkflowItem & { isProcessTrackActivity?: boolean }).isProcessTrackActivity) {
      refreshProcessTrackDataInUI();
    }
    toast.add({ severity: 'success', summary: 'Archivo subido', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al subir archivo', life: 3000 });
  }

  input.value = '';
}

function onTemplateSelected(template: any) {
  selectedTemplateDoc.value = template;
  if (!newDocTitle.value) {
    newDocTitle.value = template.title;
  }
}

function closeNewDocDialog() {
  showNewDocDialog.value = false;
  newDocTitle.value = '';
  selectedTemplateDoc.value = null;
  if (folders.value.length > 0) {
    newDocFolderId.value = folders.value[0].id;
  }
}

async function createDocument() {
  if (!newDocTitle.value || !editingItem.value || !newDocFolderId.value) return;

  try {
    let docId: string;
    const isPt = (editingItem.value as WorkflowItem & { isProcessTrackActivity?: boolean }).isProcessTrackActivity;

    if (selectedTemplateDoc.value) {
      const { data } = await apiClient.post(`/documents/${selectedTemplateDoc.value.id}/copy`, {
        targetFolderId: newDocFolderId.value,
        ...(isPt
          ? { targetActivityInstanceId: editingItem.value.id }
          : { targetWorkflowItemId: editingItem.value.id }),
        trackableId: trackableId.value,
      });
      docId = data.id;
      await apiClient.patch(`/documents/${docId}`, { title: newDocTitle.value });
    } else {
      const { data } = await apiClient.post('/documents/create-blank', {
        title: newDocTitle.value,
        folderId: newDocFolderId.value,
        trackableId: trackableId.value,
        ...(isPt ? { activityInstanceId: editingItem.value.id } : { workflowItemId: editingItem.value.id }),
      });
      docId = data.id;
    }

    closeNewDocDialog();
    await loadItemDocuments(editingItem.value.id);
    if (isPt) refreshProcessTrackDataInUI();
    router.push(`/documents/${docId}/edit`);
    toast.add({ severity: 'success', summary: 'Documento creado', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al crear documento', life: 3000 });
  }
}

// ── Calendar tab (FullCalendar, alineado con vista global) ────────────────────
const calFcRef = ref<InstanceType<typeof FullCalendar> | null>(null);
const calFcReady = ref(false);
const calNavDate = ref(new Date());
const calSearchQ = ref('');
const calLoadError = ref<string | null>(null);
const calRawEvents = ref<ApiCalendarEvent[]>([]);
const calRangeTitle = ref('');
const calShowConflictDialog = ref(false);

type CalGridViewMode = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
const calViewMode = ref<CalGridViewMode>('dayGridMonth');

function calYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calAddDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const calDisplayRangeTitle = computed(() => calRangeTitle.value);

const calViewButtonOptions = computed((): Array<{ label: string; value: CalGridViewMode; icon: string }> => [
  { label: t('globalCalendar.viewMonth'), value: 'dayGridMonth', icon: 'pi pi-th-large' },
  { label: t('globalCalendar.viewWeek'), value: 'timeGridWeek', icon: 'pi pi-calendar' },
  { label: t('globalCalendar.viewDay'), value: 'timeGridDay', icon: 'pi pi-circle' },
  { label: t('globalCalendar.viewAgenda'), value: 'listWeek', icon: 'pi pi-list' },
]);

const calEventsByDayMap = computed(() => {
  const m: Record<string, CalendarFilterKind[]> = {};
  for (const e of calRawEvents.value) {
    const day = e.start.slice(0, 10);
    if (!m[day]) m[day] = [];
    m[day].push(classifyApiEvent(e));
  }
  return m;
});

const calKpiCards = computed(() => {
  const todayStr = calYmd(new Date());
  const tmr = calYmd(calAddDays(new Date(), 1));
  const limit = calYmd(calAddDays(new Date(), 3));
  let hearings = 0;
  let deadlinesToday = 0;
  let deadlinesNext3 = 0;
  for (const e of calRawEvents.value) {
    if (e.source !== 'workflow') continue;
    const d = e.start.slice(0, 10);
    if (classifyApiEvent(e) === 'hearing' && d === todayStr) hearings += 1;
    if (e.extendedProps?.isLegalDeadline) {
      const due = e.end?.slice(0, 10) || e.start.slice(0, 10);
      if (due === todayStr) deadlinesToday += 1;
      if (due >= tmr && due <= limit) deadlinesNext3 += 1;
    }
  }
  return { hearings, deadlinesToday, deadlinesNext3 };
});

const calDayYmd = computed(() => calYmd(calNavDate.value));

const calSummaryConflicts = computed(() => countHearingOverlapPairs(calDayYmd.value, calRawEvents.value));

const calSummaryDueToday = computed(() => {
  let n = 0;
  for (const e of calRawEvents.value) {
    if (e.source !== 'workflow' || !e.extendedProps?.isLegalDeadline) continue;
    const due = e.end?.slice(0, 10) || e.start.slice(0, 10);
    if (due === calDayYmd.value) n += 1;
  }
  return n;
});

const calSummaryUnassigned = computed(() => {
  let n = 0;
  for (const e of calRawEvents.value) {
    if (e.source !== 'workflow') continue;
    if (e.start.slice(0, 10) !== calDayYmd.value) continue;
    const aid = e.extendedProps?.assignedToId as string | undefined;
    if (!aid) n += 1;
  }
  return n;
});

const calConflictPairs = computed(() => listHearingOverlapPairs(calDayYmd.value, calRawEvents.value));

const calUserOptions = computed(() => {
  const map = new Map<string, string>();
  for (const it of items.value) {
    const u = it.assignedTo;
    const id = u?.id;
    if (id) {
      const label = u.firstName ? `${u.firstName} (${u.email})` : u.email;
      map.set(id, label);
    }
  }
  const cur = authStore.user;
  if (cur?.id && !map.has(cur.id)) {
    const label = cur.firstName ? `${cur.firstName} (${cur.email})` : cur.email;
    map.set(cur.id, label);
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
});

function filterCalEventsBySearch(e: ApiCalendarEvent): boolean {
  const q = calSearchQ.value.trim().toLowerCase();
  if (!q) return true;
  return e.title.toLowerCase().includes(q);
}

function filterCalEvents(list: ApiCalendarEvent[]): ApiCalendarEvent[] {
  return list.filter((e) => matchesCalendarFilters(e, calFilters.value) && filterCalEventsBySearch(e));
}

async function fetchCalEventsRange(from: Date, toExclusive: Date) {
  calLoadError.value = null;
  const to = new Date(toExclusive.getTime() - 86400000);
  if (!trackableId.value) {
    calRawEvents.value = [];
    return;
  }
  try {
    const { data } = await apiClient.get<{ events: ApiCalendarEvent[] }>('/calendar/events', {
      params: {
        from: calYmd(from),
        to: calYmd(to),
        scope: 'team',
        trackableId: trackableId.value,
        includeBirthdays: false,
        includeExternal: true,
      },
    });
    const base = Array.isArray(data?.events) ? data.events : [];
    const pe = buildPeruHolidayEvents(from, toExclusive);
    calRawEvents.value = [...base, ...pe];
  } catch (e: unknown) {
    calLoadError.value = e instanceof Error ? e.message : String(e);
    calRawEvents.value = [];
  }
}

async function setCalViewMode(v: CalGridViewMode) {
  calViewMode.value = v;
  await nextTick();
  let api = calFcRef.value?.getApi();
  let attempts = 0;
  while (!api && attempts < 25) {
    await nextTick();
    api = calFcRef.value?.getApi();
    attempts++;
  }
  if (api) {
    api.changeView(v);
    await nextTick();
    api.updateSize();
    api.gotoDate(calNavDate.value);
    await nextTick();
    api.updateSize();
  }
}

watch(calSearchQ, () => {
  calFcRef.value?.getApi()?.refetchEvents();
});

watch(
  calFilters,
  () => {
    calFcRef.value?.getApi()?.refetchEvents();
  },
  { deep: true },
);

const calFcOptions = computed((): CalendarOptions => {
  const initial =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'listWeek' : 'dayGridMonth';
  return {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: initial,
    headerToolbar: false,
    locale: i18nLocale.value.startsWith('es') ? esLocale : 'en',
    height: 'auto',
    editable: canEditWorkflowItem.value,
    eventStartEditable: canEditWorkflowItem.value,
    eventDurationEditable: canEditWorkflowItem.value,
    selectable: canCreateWorkflowItem.value,
    selectMirror: true,
    dayMaxEvents: true,
    events: (info, successCallback, failureCallback) => {
      void (async () => {
        try {
          await fetchCalEventsRange(info.start, info.end);
          successCallback(filterCalEvents(calRawEvents.value).map(apiEventToFullCalendar));
        } catch (e: unknown) {
          failureCallback(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    },
    datesSet: (arg: DatesSetArg) => {
      calRangeTitle.value = arg.view.title;
      calNavDate.value = arg.view.calendar.getDate();
      setAssistantCalendarViewportFromFc(arg);
    },
    eventClick: (info: EventClickArg) => {
      const evId = String(info.event.id);
      const parsed = parseActivityIdFromEventId(evId);
      if (parsed?.kind === 'ai') {
        activeTab.value = 1;
        toast.add({
          severity: 'info',
          summary: t('processTrack.activities'),
          detail: t('processTrack.expedienteBoard.openActivityInTab'),
          life: 3000,
        });
        return;
      }
      const wiId = parseWorkflowItemIdFromEventId(evId);
      if (wiId) {
        const found = items.value.find((x) => x.id === wiId);
        if (found) {
          void openSidebar(found);
          return;
        }
        toast.add({
          severity: 'info',
          summary: t('globalCalendar.pageTitle'),
          detail: 'Sincronizando actividades…',
          life: 2000,
        });
        void loadItems().then(() => {
          const after = items.value.find((x) => x.id === wiId);
          if (after) void openSidebar(after);
        });
        return;
      }
      if (info.event.title) {
        toast.add({ severity: 'info', summary: info.event.title, life: 2200 });
      }
    },
    select: (arg) => {
      if (!canCreateWorkflowItem.value) {
        arg.view.calendar.unselect();
        return;
      }
      const start = arg.start;
      const end = arg.end ? new Date(arg.end.getTime() - 1) : start;
      createItemError.value = '';
      newItem.value = {
        title: '',
        description: '',
        kind: '',
        actionType: '',
        assignedToId: '',
        priority: '',
        location: '',
        allDay: true,
        dueDate: end,
        startDate: start,
        isLegalDeadline: false,
        accentColor: DEFAULT_ACCENT,
        reminderMinutesBefore: [],
        rrule: '',
        secondaryAssigneeIds: [],
        stageInstanceId: ptCurrentStageId.value || '',
        workflowStateCategory: 'todo',
      };
      showCreateDialog.value = true;
      arg.view.calendar.unselect();
    },
    eventDrop: async (arg: EventDropArg) => {
      await handleCalReschedule(arg);
    },
    eventResize: async (arg) => {
      await handleCalReschedule(arg as unknown as EventDropArg);
    },
  };
});

async function handleCalReschedule(arg: EventDropArg | { event: EventApi; revert: () => void }) {
  const raw = String(arg.event.id);
  if (
    !parseActivityIdFromEventId(raw)
    && !parseWorkflowItemIdFromEventId(raw)
    && !/^[0-9a-f-]{36}$/i.test(raw)
  ) {
    arg.revert();
    return;
  }
  try {
    await apiClient.patch(`/calendar/events/${encodeURIComponent(raw)}/reschedule`, {
      startDate: arg.event.start?.toISOString(),
      dueDate: arg.event.end?.toISOString(),
      allDay: arg.event.allDay,
    });
    await loadItems();
    await calFcRef.value?.getApi()?.refetchEvents();
  } catch {
    arg.revert();
  }
}

function calCalendarPrev() {
  calFcRef.value?.getApi()?.prev();
}

function calCalendarNext() {
  calFcRef.value?.getApi()?.next();
}

function calCalendarToday() {
  calNavDate.value = new Date();
  calFcRef.value?.getApi()?.today();
}

function onCalSidebarDate(d: Date) {
  calNavDate.value = d;
  calFcRef.value?.getApi()?.gotoDate(d);
}

// ── Dashboard / Resumen tab ────────────────────────────────────────────────────
const dashboardDeadlines = ref<any[]>([]);
const dashboardOverdue = ref<any[]>([]);
const dashboardWorkload = ref<any[]>([]);

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function teamMemberInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f.length >= 2) return f.slice(0, 2).toUpperCase();
  if (f.length === 1) return (f + (l[0] || '')).toUpperCase();
  const e = (email || '').trim();
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return '?';
}

function nextHearingLabel(item: WorkflowItem): string {
  if (item.isLegalDeadline) return 'Próximo plazo legal';
  if (item.actionType === 'schedule_hearing') return 'Próxima audiencia';
  return 'Próximo hito';
}

const dashboardOverdueCount = computed(() => dashboardOverdue.value.length);

/** Orden y actividades alineados con ProcessStageBoardView (excl. canceladas). */
const expedienteOrderedStages = computed(() => {
  const list = processTrackRef.value?.stageInstances ?? [];
  return [...list].sort((a, b) => a.order - b.order);
});

/** Etapas del track principal: total y en estado activo (misma noción que el tablero). */
const expedienteStagesSummary = computed(() => {
  const stages = expedienteOrderedStages.value;
  const total = stages.length;
  const active = stages.filter((s) => (s.status || '').toLowerCase() === 'active').length;
  return { total, active };
});

const expedienteActivityMetrics = computed(() => {
  const all: Array<{ workflowStateCategory: string; dueDate?: string | null }> = [];
  for (const st of expedienteOrderedStages.value) {
    for (const a of st.activities ?? []) {
      if ((a.workflowStateCategory || '').toLowerCase() === 'cancelled') continue;
      all.push({ workflowStateCategory: a.workflowStateCategory, dueDate: a.dueDate });
    }
  }
  const total = all.length;
  const done = all.filter((a) => (a.workflowStateCategory || '').toLowerCase() === 'done').length;
  const inProgress = all.filter((a) => {
    const c = (a.workflowStateCategory || '').toLowerCase();
    return c === 'in_progress' || c === 'in_review';
  }).length;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const overdue = all.filter((a) => {
    if ((a.workflowStateCategory || '').toLowerCase() === 'done') return false;
    if (!a.dueDate) return false;
    const d = new Date(a.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < start.getTime();
  }).length;
  const donePct = !total ? 0 : Math.min(100, Math.round((done / total) * 100));
  const globalActivePct = !total
    ? 0
    : Math.min(100, Math.round(((done + inProgress) / total) * 100));
  return { total, done, inProgress, overdue, donePct, globalActivePct };
});

const summaryCards = computed(() => [
  {
    id: 'stagesActive',
    label: t('trackables.expedienteSummary.stagesActive'),
    value: expedienteStagesSummary.value.active,
    hint:
      expedienteStagesSummary.value.total > 0
        ? t('trackables.expedienteSummary.stagesTotalHint', { total: expedienteStagesSummary.value.total })
        : '',
    icon: 'pi pi-th-large',
    tone: 'from-[#0F6E7A]/12 to-[#0F6E7A]/3 text-[#0F6E7A] dark:from-emerald-300/12 dark:to-emerald-300/5 dark:text-emerald-200',
  },
  {
    id: 'totalActivities',
    label: t('trackables.expedienteSummary.totalActivities'),
    value: expedienteActivityMetrics.value.total,
    icon: 'pi pi-list-check',
    tone: 'from-[#2D3FBF]/12 to-[#2D3FBF]/3 text-[#2D3FBF] dark:from-blue-300/12 dark:to-blue-300/5 dark:text-blue-200',
  },
  {
    id: 'next14',
    label: t('trackables.expedienteSummary.next14Days'),
    value: dashboardDeadlines.value.length,
    icon: 'pi pi-calendar-clock',
    tone: 'from-amber-400/18 to-amber-400/5 text-amber-700 dark:from-amber-300/12 dark:to-amber-300/5 dark:text-amber-200',
  },
  {
    id: 'overdue',
    label: t('trackables.expedienteSummary.overdue'),
    value: dashboardOverdueCount.value,
    icon: 'pi pi-exclamation-triangle',
    tone: 'from-red-500/14 to-red-500/5 text-red-700 dark:from-red-300/12 dark:to-red-300/5 dark:text-red-200',
  },
]);

const deadlineGroups = computed(() => {
  const map = new Map<string, any>();
  for (const r of dashboardOverdue.value) map.set(String(r.id), r);
  for (const r of dashboardDeadlines.value) map.set(String(r.id), r);
  const all = [...map.values()];
  const today = startOfLocalDay(new Date());
  const overdue: any[] = [];
  const day0: any[] = [];
  const week: any[] = [];
  const two: any[] = [];
  for (const row of all) {
    const dueRaw = row.due_date;
    if (!dueRaw) continue;
    const d0 = startOfLocalDay(new Date(dueRaw));
    const diff = Math.round((d0.getTime() - today.getTime()) / 86400000);
    if (diff < 0) overdue.push(row);
    else if (diff === 0) day0.push(row);
    else if (diff >= 1 && diff <= 7) week.push(row);
    else if (diff >= 8 && diff <= 14) two.push(row);
  }
  const sortByDue = (a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  overdue.sort(sortByDue);
  day0.sort(sortByDue);
  week.sort(sortByDue);
  two.sort(sortByDue);
  return { overdue, today: day0, week, twoWeeks: two };
});

const nextActividades = computed(() => {
  const active = new Set(['active', 'in_progress', 'under_review']);
  const list = items.value.filter((i) => active.has(i.status));
  const withDue = (a: WorkflowItem, b: WorkflowItem) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.title.localeCompare(b.title, 'es');
  };
  return [...list].sort(withDue).slice(0, 5);
});

const teamMembers = computed(() =>
  dashboardWorkload.value
    .filter((w: any) => Number(w.total_assigned) > 0)
    .map((w: any) => ({
      userId: w.user_id,
      name: [w.first_name, w.last_name].filter(Boolean).join(' ').trim() || w.email || 'Usuario',
      email: w.email,
      initials: teamMemberInitials(w.first_name, w.last_name, w.email),
      pending: Number(w.pending_count) || 0,
      inProgress: Number(w.in_progress_count) || 0,
      underReview: Number(w.under_review_count) || 0,
      total: Number(w.total_assigned) || 0,
    })),
);

const nextHearing = computed((): WorkflowItem | null => {
  const closed = new Set(['closed', 'skipped', 'validated']);
  const candidates = items.value.filter(
    (i) =>
      !closed.has(i.status) &&
      i.dueDate &&
      (i.actionType === 'schedule_hearing' || i.isLegalDeadline === true),
  );
  if (!candidates.length) return null;
  const todayStart = startOfLocalDay(new Date()).getTime();
  const sorted = [...candidates].sort(
    (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
  );
  const future = sorted.find(
    (i) => startOfLocalDay(new Date(i.dueDate!)).getTime() >= todayStart,
  );
  return future ?? sorted[0] ?? null;
});

async function loadDashboardData() {
  const params = { trackableId: trackableId.value };
  const [dl, overdue, wl] = await Promise.all([
    apiClient.get('/dashboard/upcoming-deadlines', { params }),
    apiClient.get('/dashboard/overdue', { params }),
    apiClient.get('/dashboard/workload', { params }),
  ]);
  dashboardDeadlines.value = dl.data;
  dashboardOverdue.value = overdue.data;
  dashboardWorkload.value = wl.data;
}

const dashboardLoaded = ref(false);
watch(activeTab, (newTab) => {
  if (newTab === 0 && trackableId.value) {
    void loadCaseTabExtras();
    void loadParties();
    void loadSinoePanel();
    if (!dashboardLoaded.value) {
      dashboardLoaded.value = true;
      void loadDashboardData();
    }
  }
  if (newTab === 1 && trackableId.value) {
    void loadItems();
    void loadDashboardData();
  }
  if (newTab === 3) {
    calStore.setFilters({ trackables: [] });
    void nextTick(() => {
      calFcRef.value?.getApi()?.updateSize();
    });
  }
});

async function applyWorkflowItemFromQuery() {
  const targetItemId = route.query.workflowItemId as string | undefined;
  if (targetItemId) {
    const target = items.value.find((i) => i.id === targetItemId);
    if (target) {
      await openSidebar(target);
    }
  }
  const fromCal = route.query.tab as string | undefined;
  const actId = route.query.activityInstanceId as string | undefined;
  if (actId || fromCal === '1') {
    activeTab.value = 1;
  }
}

watch(trackableId, async (id, prev) => {
  if (!id || id === prev) return;
  caseGeneralEditing.value = false;
  fichaSectionOpen.value = false;
  closeSidebar();
  dashboardLoaded.value = false;
  await loadTrackable();
  await Promise.all([loadItems(), loadFolders(), loadTrackablesForSwitcher()]);
  await applyWorkflowItemFromQuery();
  if (activeTab.value === 0) {
    await loadDashboardData();
    dashboardLoaded.value = true;
  }
  void loadSinoePanel();
  void loadParties();
  void calFcRef.value?.getApi()?.refetchEvents();
});

// ── Mount ──────────────────────────────────────────────────────────────────────
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    commandPaletteVisible.value = true;
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onGlobalKeydown);
  await loadTrackable();
  await Promise.all([
    loadItems(),
    loadUsers(),
    loadFolders(),
    loadTrackablesForSwitcher(),
    loadUserPermissions(),
  ]);

  dashboardLoaded.value = true;
  await loadDashboardData();
  await loadSinoePanel();
  await loadParties();

  await applyWorkflowItemFromQuery();
  calFcReady.value = true;
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<style scoped>
.trackable-tabs :deep(.p-tabview-panels) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.trackable-tabs :deep(.p-tabview-panel) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.trackable-tabs :deep(.p-tabview-nav) {
  padding: 0 1.5rem;
}

/* Tab Actividades (2.º): resalta modos de vista */
.trackable-tabs :deep(.p-tabview-nav li:nth-child(2) .p-tabview-nav-link) {
  font-size: 1.0625rem;
  font-weight: 600;
  padding: 0.75rem 1.35rem;
}

.trackable-tabs :deep(.flow-view-toggle .p-button) {
  padding: 0.5rem 0.9rem;
  font-size: 0.9375rem;
}

/* Actividades: tablero/etapas con scroll interno. */
.flow-first-panel {
  flex: 1 1 0%;
  min-height: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.status-pill:disabled {
  cursor: default;
}

.kanban-col-header {
  isolation: isolate;
  background-color: var(--surface-raised);
  box-shadow:
    0 4px 6px -2px rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(0, 0, 0, 0.04);
}

/* ── Animations ── */

/* Hero entrance */
.exp-hero-entrance {
  animation: expFadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* Summary cards stagger entrance */
.exp-summary-card {
  animation: expFadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--stagger-delay, 0ms);
}

/* Ficha expand/collapse (CSS Grid trick) */
.ficha-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;
}

.ficha-collapse.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

/* Ficha chevron rotation */
.ficha-chevron {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.ficha-chevron.is-open {
  transform: rotate(180deg);
}

/* Team row hover */
@media (hover: hover) {
  .exp-team-row:hover {
    background-color: var(--surface-sunken);
  }
}

/* ── Keyframes ── */
@keyframes expFadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .exp-hero-entrance,
  .exp-summary-card {
    animation: none !important;
  }

  .ficha-collapse {
    transition: none !important;
  }

  .ficha-chevron {
    transition: none !important;
  }

}
</style>
