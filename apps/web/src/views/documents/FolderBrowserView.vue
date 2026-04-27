<template>
  <div
    v-if="!canDocRead"
    class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[var(--fg-muted)] min-h-[12rem]"
  >
    <i class="pi pi-lock text-4xl text-[var(--fg-subtle)]" />
    <p class="max-w-md">No tenés permiso para ver carpetas ni documentos de este expediente.</p>
  </div>
  <div v-else class="flex h-full min-h-0">
    <!-- Folder tree sidebar (colapsable) -->
    <aside
      :class="[
        'folder-sidebar shrink-0 border-r border-[var(--surface-border)] bg-[var(--surface-raised)] flex flex-col overflow-hidden transition-[width] duration-200 ease-out',
        treeCollapsed ? 'w-11' : 'w-[min(17rem,40vw)] max-w-72',
      ]"
    >
      <template v-if="!treeCollapsed">
        <div class="relative flex items-center justify-between gap-1 px-2.5 py-2 border-b border-[var(--surface-border)]">
          <div class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--brand-zafiro)] via-[var(--brand-real)] to-[var(--brand-zafiro)] opacity-70" />
          <span class="text-sm font-semibold text-[var(--fg-default)] truncate">Carpetas</span>
          <div class="flex items-center shrink-0">
            <Button
              v-if="canDocCreate"
              icon="pi pi-plus"
              text
              rounded
              size="small"
              class="add-folder-btn"
              v-tooltip.bottom="'Nueva carpeta'"
              @click="openNewRootFolderDialog"
            />
            <Button
              icon="pi pi-angle-left"
              text
              rounded
              size="small"
              class="text-[var(--fg-subtle)]"
              v-tooltip.bottom="'Ocultar panel'"
              @click="setTreeCollapsed(true)"
            />
          </div>
        </div>

        <div class="folder-tree-scroll flex-1 overflow-y-auto scroll-smooth p-2.5 flex flex-col gap-2 min-h-0 [scrollbar-gutter:stable]">
          <div v-if="foldersLoading" class="text-center py-4">
            <i class="pi pi-spin pi-spinner text-[var(--fg-subtle)]" />
          </div>

          <div v-else-if="folderTree.length === 0" class="folder-empty-state text-xs text-[var(--fg-subtle)] text-center py-6 leading-relaxed rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--surface-sunken)]/30">
            No hay carpetas. Pulsa <i class="pi pi-plus" /> para crear una.
          </div>

          <draggable
            v-else
            :list="folderTree"
            item-key="key"
            handle=".drag-handle"
            ghost-class="opacity-40"
            :disabled="!canDocUpdate"
            @end="onRootReorder"
          >
            <template #item="{ element }">
              <FolderTreeNode
                :node="element"
                :selected-key="activeKey ?? undefined"
                :reorder-enabled="canDocUpdate"
                :emoji-enabled="canDocUpdate"
                @select="onFolderSelect"
                @reorder="onChildReorder"
                @update-emoji="openEmojiPicker"
              />
            </template>
          </draggable>
        </div>
      </template>

      <div
        v-else
        class="flex flex-1 flex-col items-center py-3 gap-2 justify-start"
      >
        <Button
          icon="pi pi-angle-right"
          text
          rounded
          size="small"
          v-tooltip.right="'Mostrar carpetas'"
          @click="setTreeCollapsed(false)"
        />
        <Button
          v-if="canDocCreate"
          icon="pi pi-plus"
          text
          rounded
          size="small"
          severity="secondary"
          v-tooltip.right="'Nueva carpeta'"
          @click="openNewRootFolderDialog"
        />
        <span
          v-if="collapsedStripEmoji"
          class="text-2xl leading-none select-none px-0.5"
          :title="selectedFolder?.name || ''"
          aria-hidden="true"
        >{{ collapsedStripEmoji }}</span>
        <i
          v-else
          class="pi pi-folder text-amber-500/80 text-lg opacity-80"
          aria-hidden="true"
        />
      </div>
    </aside>

    <!-- Documents area -->
    <div class="folder-main-area flex-1 min-w-0 p-4 md:p-5 bg-[var(--surface-app)] overflow-y-auto scroll-smooth [scrollbar-gutter:stable]">
      <div class="folder-main-entrance flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div class="flex items-center gap-2">
          <nav v-if="breadcrumb.length > 0" class="flex items-center gap-1 text-sm text-[var(--fg-subtle)]" aria-label="Ruta de carpetas">
            <span
              v-for="(crumb, i) in breadcrumb"
              :key="crumb.id"
              class="breadcrumb-segment flex items-center gap-1"
            >
              <span
                class="cursor-pointer rounded px-1 py-0.5 transition-colors duration-150 hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                @click="navigateToCrumb(crumb)"
              >{{ crumb.emoji ? crumb.emoji + ' ' : '' }}{{ crumb.name }}</span>
              <i v-if="i < breadcrumb.length - 1" class="pi pi-angle-right text-[10px] text-[var(--fg-subtle)]" />
            </span>
          </nav>
          <h2 v-else class="text-lg font-semibold text-[var(--fg-default)] folder-main-entrance">
            <i class="pi pi-folder-open text-[var(--accent)] mr-2 text-base" />
            Selecciona una carpeta
          </h2>
        </div>
        <div v-if="selectedFolder" class="flex gap-2 flex-wrap">
          <Button
            v-if="canDocCreate"
            label="Nueva subcarpeta"
            icon="pi pi-folder-plus"
            size="small"
            severity="secondary"
            @click="openNewSubfolderDialog"
          />
          <FileUpload
            v-if="canDocCreate"
            mode="basic"
            :auto="true"
            :custom-upload="true"
            @uploader="handleUpload"
            choose-label="Subir archivo"
            class="p-button-sm"
          />
          <Button
            v-if="canDocCreate"
            label="Nuevo documento"
            icon="pi pi-file-edit"
            size="small"
            @click="openCreateDocumentDialog"
          />
        </div>
      </div>

      <div v-if="!selectedFolder" class="folder-no-selection flex flex-col items-center justify-center py-20 text-[var(--fg-subtle)]">
        <div class="folder-no-selection-bg pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div class="h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        </div>
        <div class="folder-empty-icon-wrap mb-4 relative">
          <i class="pi pi-folder-open text-5xl" />
        </div>
        <p class="text-sm relative">Selecciona una carpeta del panel izquierdo para ver sus documentos.</p>
      </div>

      <template v-else>
        <!-- Subfolders grid -->
        <div v-if="subfolders.length > 0" class="mb-5">
          <p class="text-[10px] font-semibold uppercase text-[var(--fg-subtle)] mb-2 tracking-wide">Subcarpetas</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(sf, sfIdx) in subfolders"
              :key="sf.key"
              class="subfolder-card subfolder-entrance flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] text-sm font-medium text-[var(--fg-default)] cursor-pointer"
              :style="{ '--stagger-delay': `${sfIdx * 50}ms` }"
              @click="onFolderSelect(sf)"
            >
              <i class="pi pi-folder text-amber-500 subfolder-icon" />
              <span>{{ sf.data.emoji ? sf.data.emoji + ' ' : '' }}{{ sf.label }}</span>
            </button>
          </div>
        </div>

        <!-- Documents table -->
        <DataTable
          class="folder-browser-doc-table"
          :value="documents"
          :loading="loading"
          paginator
          :rows="20"
          striped-rows
        >
          <template #empty>
            <div class="folder-docs-empty text-center py-12 text-[var(--fg-subtle)] relative overflow-hidden">
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div class="h-40 w-40 rounded-full bg-[var(--accent)]/5 blur-3xl" />
              </div>
              <i class="pi pi-file text-4xl mb-3 block folder-empty-icon-wrap relative" />
              <span class="text-sm relative">No hay documentos en esta carpeta</span>
            </div>
          </template>

          <Column field="title" header="Título" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-2 flex-wrap">
                <i :class="getFileIcon(data.mimeType)" />
                <button
                  type="button"
                  class="doc-title-link font-medium text-left text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer bg-transparent border-0 p-0 transition-colors duration-150"
                  @click.stop="openEditor(data)"
                >
                  {{ data.title }}
                </button>
                <Tag v-if="data.isTemplate" value="Plantilla" severity="info" />
                <Tag
                  v-for="tag in (data.tags || [])"
                  :key="tag"
                  :value="tag"
                  severity="secondary"
                  class="text-xs"
                />
              </div>
            </template>
          </Column>
          <Column field="reviewStatus" header="Estado" sortable>
            <template #body="{ data }">
              <StatusBadge :status="data.reviewStatus" />
            </template>
          </Column>
          <Column field="currentVersion" header="Versión" />
          <Column field="evaluationScore" header="Evaluación">
            <template #body="{ data }">
              <EvaluationBadge v-if="data.evaluationScore != null" :score="data.evaluationScore" />
              <span v-else class="text-[var(--fg-subtle)]">-</span>
            </template>
          </Column>
          <Column field="updatedAt" header="Modificado" sortable>
            <template #body="{ data }">
              {{ new Date(data.updatedAt).toLocaleDateString('es-PE') }}
            </template>
          </Column>
          <Column header="Acciones" class="min-w-[4.5rem] w-[5rem]">
            <template #body="{ data }">
              <div class="folder-doc-actions-wrap">
                <Button
                  icon="pi pi-bars"
                  rounded
                  text
                  severity="secondary"
                  size="small"
                  class="folder-doc-action-btn !w-9 !h-9"
                  type="button"
                  :aria-label="'Acciones del documento: ' + (data.title || data.id)"
                  v-tooltip.left="{
                    value: 'Abrir menú de acciones (vista previa, descarga, actividad, eliminar…)',
                    showDelay: 300,
                  }"
                  @click="openDocActionsMenu($event, data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </div>

    <!-- New Folder Dialog -->
    <Dialog
      v-model:visible="showNewFolder"
      header="Nueva carpeta"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col gap-1">
          <label for="new-folder-name" class="text-sm font-medium">Nombre</label>
          <InputText id="new-folder-name" v-model="newFolderName" placeholder="Nombre de la carpeta" autofocus />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showNewFolder = false" />
        <Button label="Crear" icon="pi pi-check" :disabled="!newFolderName.trim()" @click="createFolder" />
      </template>
    </Dialog>

    <!-- Tag Dialog -->
    <Dialog
      v-model:visible="showTagDialog"
      header="Gestionar etiquetas"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div v-if="tagDoc" class="space-y-3">
        <p class="text-sm text-[var(--fg-muted)]">{{ tagDoc.title }}</p>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="tag in (tagDoc.tags || [])"
            :key="tag"
            :value="tag"
            severity="secondary"
            class="cursor-pointer"
            @click="removeDocTag(tag)"
            v-tooltip.top="'Clic para eliminar'"
          />
          <span v-if="!tagDoc.tags?.length" class="text-sm text-[var(--fg-subtle)]">Sin etiquetas</span>
        </div>
        <div class="flex gap-2">
          <InputText
            v-model="newDocTag"
            placeholder="Nueva etiqueta..."
            class="flex-1"
            @keydown.enter="addDocTag"
          />
          <Button icon="pi pi-plus" :disabled="!newDocTag.trim()" @click="addDocTag" />
        </div>
      </div>
    </Dialog>

    <!-- Emoji Picker Dialog -->
    <Dialog
      v-model:visible="showEmojiPicker"
      header="Elige un emoji para la carpeta"
      :modal="true"
      :style="{ width: '360px' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          <button
            v-for="emoji in emojiList"
            :key="emoji"
            class="text-2xl p-1 rounded hover:bg-[var(--accent-soft)] transition-colors duration-150"
            @click="applyEmoji(emoji)"
          >{{ emoji }}</button>
        </div>
        <div class="flex gap-2 items-center border-t pt-3">
          <InputText v-model="customEmoji" placeholder="O escribe un emoji..." class="flex-1" maxlength="4" />
          <Button label="Aplicar" :disabled="!customEmoji.trim()" @click="applyEmoji(customEmoji)" />
        </div>
        <Button
          label="Quitar emoji"
          text
          severity="secondary"
          icon="pi pi-times"
          @click="applyEmoji('')"
        />
      </div>
    </Dialog>

    <ConfirmDialog />
    <FilePreviewDialog v-model:visible="showPreview" :document="previewDoc" />
    <TemplateSearchDialog
      v-model:visible="showTemplateSearch"
      @select="onTemplateSelected"
      @create-blank="createNewDocumentBlank"
    />

    <WorkflowItemFromDocumentDialog
      v-model="showWorkflowActivityDialog"
      :document="workflowDialogDocument"
      :trackable-id="trackableId"
      :permissions="workflowDialogPermissions"
      @saved="onWorkflowDialogSaved"
      @request-create="onRequestCreateWorkflowFromDialog"
    />
    <NewWorkflowItemLinkDocumentDialog
      v-model="showNewWorkflowLinkDialog"
      :trackable-id="trackableId"
      :default-document-id="newWorkflowDefaultDocumentId"
      @created="onNewWorkflowCreated"
    />

    <Dialog
      v-model:visible="showLinkExistingWorkflowDialog"
      header="Vincular a actuación"
      modal
      :style="{ width: 'min(440px, 96vw)' }"
    >
      <p v-if="linkWorkflowDoc" class="text-sm text-[var(--fg-muted)] m-0 mb-3">
        Documento: <strong>{{ linkWorkflowDoc.title }}</strong>
      </p>
      <div v-if="workflowItemsForLinkLoading" class="text-sm text-[var(--fg-muted)] py-4">Cargando actuaciones…</div>
      <template v-else>
        <label class="text-sm font-medium block mb-2">Actuación del expediente</label>
        <Select
          v-model="selectedWorkflowItemIdForLink"
          :options="workflowItemsForLinkOptions"
          option-label="title"
          option-value="id"
          placeholder="Seleccionar actuación"
          filter
          class="w-full"
        />
      </template>
      <template #footer>
        <Button label="Cancelar" text @click="showLinkExistingWorkflowDialog = false" />
        <Button
          label="Vincular"
          icon="pi pi-check"
          :disabled="!selectedWorkflowItemIdForLink || linkWorkflowSaving"
          :loading="linkWorkflowSaving"
          @click="confirmLinkToWorkflowItem"
        />
      </template>
    </Dialog>

    <Menu
      ref="docActionsMenuRef"
      :model="docActionsMenuItems"
      popup
      append-to="body"
      aria-label="Acciones del documento"
      class="folder-doc-actions-menu min-w-[14rem] max-w-[min(22rem,calc(100vw-2rem))]"
      @hide="onDocActionsMenuHide"
    >
      <template #item="{ item, label, props: p }">
        <a v-bind="(p as MenuItemSlotProps).action" :title="docActionItemTitle(item, label)" class="flex items-center gap-2">
          <span v-if="item.icon" v-bind="(p as MenuItemSlotProps).icon" />
          <span v-bind="(p as MenuItemSlotProps).label">{{ resolveMenuSlotLabel(label) }}</span>
        </a>
      </template>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

/** Props passed to Menu `#item` slot (PrimeVue mergeProps shape). */
type MenuItemSlotProps = {
  action: Record<string, unknown>;
  icon: { class?: string | string[] };
  label: { class?: string | string[] };
};
import FileUpload from 'primevue/fileupload';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ConfirmDialog from 'primevue/confirmdialog';
import StatusBadge from '@/components/common/StatusBadge.vue';
import EvaluationBadge from '@/components/documents/EvaluationBadge.vue';
import FilePreviewDialog from '@/components/documents/FilePreviewDialog.vue';
import TemplateSearchDialog from '@/components/documents/TemplateSearchDialog.vue';
import WorkflowItemFromDocumentDialog from '@/components/workflow/WorkflowItemFromDocumentDialog.vue';
import NewWorkflowItemLinkDocumentDialog from '@/components/workflow/NewWorkflowItemLinkDocumentDialog.vue';
import { apiClient } from '@/api/client';
import type { DocRow } from '@/components/workflow/WorkflowItemFromDocumentDialog.vue';
import { usePermissions } from '@/composables/usePermissions';

const props = withDefaults(
  defineProps<{
    trackableId?: string;
    userPermissions?: string[];
  }>(),
  {
    userPermissions: () => [],
  },
);

const { can } = usePermissions();
const canDocRead = computed(() => can('document:read'));
const canDocCreate = computed(() => can('document:create'));
const canDocUpdate = computed(() => can('document:update'));
const canDocDelete = computed(() => can('document:delete'));

// ── Recursive folder tree node component ──────────────────────────────────────
const FolderTreeNode = defineComponent({
  name: 'FolderTreeNode',
  props: {
    node: { type: Object, required: true },
    selectedKey: { type: String, default: null },
    depth: { type: Number, default: 0 },
    reorderEnabled: { type: Boolean, default: true },
    emojiEnabled: { type: Boolean, default: true },
  },
  emits: ['select', 'reorder', 'update-emoji'],
  setup(props, { emit }) {
    const expanded = ref(true);
    const isSelected = computed(() => props.node.key === props.selectedKey);

    function toggle() { expanded.value = !expanded.value; }

    function onChildReorder(evt: any) {
      emit('reorder', evt);
    }

    return () => {
      const node = props.node;
      const children = node.children ?? [];
      const label = node.data?.emoji ? `${node.data.emoji} ${node.label}` : node.label;

      return h('div', { class: 'select-none' }, [
        h('div', {
          class: [
            'flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors duration-150 group',
            isSelected.value
              ? 'folder-tree-node-selected font-medium'
              : 'folder-tree-node-idle',
          ],
          style: { paddingLeft: `${props.depth * 12 + 8}px` },
        }, [
          props.reorderEnabled
            ? h('i', { class: 'drag-handle pi pi-bars cursor-grab text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150', style: 'color: var(--fg-subtle)' })
            : h('span', { class: 'w-4 shrink-0 mr-1' }),
          children.length > 0
            ? h('i', {
                class: ['pi text-xs', expanded.value ? 'pi-chevron-down' : 'pi-chevron-right'],
                style: 'color: var(--fg-subtle)',
                onClick: (e: Event) => { e.stopPropagation(); toggle(); },
              })
            : h('span', { class: 'w-3' }),
          h('i', { class: 'pi pi-folder text-amber-500 text-sm' }),
          h('span', { class: 'flex-1 truncate', onClick: () => emit('select', node) }, label),
          ...(props.emojiEnabled
            ? [
                h('i', {
                  class: 'pi pi-face-smile text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer hover:text-amber-500',
                  style: 'color: var(--fg-subtle)',
                  onClick: (e: Event) => { e.stopPropagation(); emit('update-emoji', node); },
                }),
              ]
            : []),
        ]),
        children.length > 0 && expanded.value
          ? h(draggable, {
              list: children,
              itemKey: 'key',
              handle: '.drag-handle',
              ghostClass: 'opacity-40',
              disabled: !props.reorderEnabled,
              onEnd: (evt: any) => emit('reorder', { ...evt, parentId: node.key }),
            }, {
              item: ({ element }: { element: any }) => h(FolderTreeNode, {
                node: element,
                selectedKey: props.selectedKey,
                depth: props.depth + 1,
                reorderEnabled: props.reorderEnabled,
                emojiEnabled: props.emojiEnabled,
                onSelect: (n: any) => emit('select', n),
                onReorder: onChildReorder,
                onUpdateEmoji: (n: any) => emit('update-emoji', n),
              }),
            })
          : null,
      ]);
    };
  },
});

// ── Main view ─────────────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const trackableId = props.trackableId || (route.params.id as string);

const folderTree = ref<any[]>([]);
const rawFolders = ref<any[]>([]);
const activeKey = ref<string | null>(null);
const selectedFolder = ref<any>(null);
const documents = ref<any[]>([]);
const loading = ref(false);
const foldersLoading = ref(false);

/** Panel de árbol colapsable (preferencia en sessionStorage). */
const TREE_COLLAPSED_KEY = 'folderBrowser.treeCollapsed';

function readTreeCollapsed(): boolean {
  try {
    return sessionStorage.getItem(TREE_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

const treeCollapsed = ref(readTreeCollapsed());

function setTreeCollapsed(collapsed: boolean) {
  treeCollapsed.value = collapsed;
  try {
    sessionStorage.setItem(TREE_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const showNewFolder = ref(false);
const newFolderName = ref('');
const newFolderParentId = ref<string | null>(null);

const showPreview = ref(false);
const previewDoc = ref<any>(null);

const showTagDialog = ref(false);
const tagDoc = ref<any>(null);
const newDocTag = ref('');

const showEmojiPicker = ref(false);
const emojiTargetNode = ref<any>(null);
const customEmoji = ref('');

const showTemplateSearch = ref(false);

const showWorkflowActivityDialog = ref(false);
const workflowDialogDocument = ref<DocRow | null>(null);
const showNewWorkflowLinkDialog = ref(false);
const newWorkflowDefaultDocumentId = ref<string | null>(null);

const canReadWorkflowItem = computed(() => props.userPermissions.includes('workflow_item:read'));
const canCreateWorkflowItem = computed(() => props.userPermissions.includes('workflow_item:create'));
const canEditWorkflowItem = computed(() => props.userPermissions.includes('workflow_item:update'));
const canCommentWorkflowItem = computed(
  () =>
    props.userPermissions.includes('workflow_item:comment') ||
    props.userPermissions.includes('workflow_item:update'),
);

const workflowDialogPermissions = computed(() => ({
  read: canReadWorkflowItem.value,
  edit: canEditWorkflowItem.value,
  comment: canCommentWorkflowItem.value,
  create: canCreateWorkflowItem.value,
}));

function openWorkflowActivityDialog(doc: any) {
  workflowDialogDocument.value = {
    id: doc.id,
    title: doc.title,
    workflowItem: doc.workflowItem
      ? {
          id: doc.workflowItem.id,
          title: doc.workflowItem.title,
          kind: doc.workflowItem.kind,
          status: doc.workflowItem.status,
        }
      : null,
  };
  showWorkflowActivityDialog.value = true;
}

function openNewWorkflowForDocument(doc: any) {
  newWorkflowDefaultDocumentId.value = doc.id;
  showNewWorkflowLinkDialog.value = true;
}

function onWorkflowDialogSaved() {
  if (selectedFolder.value) loadDocuments(selectedFolder.value.id);
}

function onNewWorkflowCreated() {
  if (selectedFolder.value) loadDocuments(selectedFolder.value.id);
}

function onRequestCreateWorkflowFromDialog() {
  newWorkflowDefaultDocumentId.value = workflowDialogDocument.value?.id ?? null;
  showWorkflowActivityDialog.value = false;
  showNewWorkflowLinkDialog.value = true;
}

const showLinkExistingWorkflowDialog = ref(false);
const linkWorkflowDoc = ref<any>(null);
const workflowItemsForLinkOptions = ref<Array<{ id: string; title: string }>>([]);
const workflowItemsForLinkLoading = ref(false);
const selectedWorkflowItemIdForLink = ref<string | null>(null);
const linkWorkflowSaving = ref(false);

function flattenWorkflowTreeNodes(nodes: any[]): Array<{ id: string; title: string }> {
  const out: Array<{ id: string; title: string }> = [];
  function walk(n: any) {
    if (n?.id) out.push({ id: n.id, title: n.title || 'Sin título' });
    (n?.children || []).forEach(walk);
  }
  (nodes || []).forEach(walk);
  return out;
}

async function openLinkExistingWorkflowDialogForDoc(doc: any) {
  linkWorkflowDoc.value = doc;
  selectedWorkflowItemIdForLink.value = doc.workflowItem?.id ?? null;
  showLinkExistingWorkflowDialog.value = true;
  workflowItemsForLinkLoading.value = true;
  try {
    const { data } = await apiClient.get(`/trackables/${trackableId}/tree`);
    const tree = Array.isArray(data) ? data : [];
    workflowItemsForLinkOptions.value = flattenWorkflowTreeNodes(tree);
  } catch {
    workflowItemsForLinkOptions.value = [];
    toast.add({ severity: 'error', summary: 'No se pudieron cargar las actuaciones', life: 3000 });
  } finally {
    workflowItemsForLinkLoading.value = false;
  }
}

async function confirmLinkToWorkflowItem() {
  const doc = linkWorkflowDoc.value;
  const wid = selectedWorkflowItemIdForLink.value;
  if (!doc?.id || !wid) return;
  linkWorkflowSaving.value = true;
  try {
    await apiClient.post(`/documents/${doc.id}/link-workflow-item`, { workflowItemId: wid });
    showLinkExistingWorkflowDialog.value = false;
    toast.add({ severity: 'success', summary: 'Documento vinculado', life: 2500 });
    if (selectedFolder.value) loadDocuments(selectedFolder.value.id);
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo vincular', life: 4000 });
  } finally {
    linkWorkflowSaving.value = false;
  }
}

const docActionsMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const docActionsMenuItems = ref<MenuItem[]>([]);

function onDocActionsMenuHide() {
  docActionsMenuItems.value = [];
}

/** Evita ejecutar dos veces el mismo command (Menuitem + handler del Menu). */
function runOnce(fn: () => void) {
  let ran = false;
  return () => {
    if (ran) return;
    ran = true;
    fn();
  };
}

async function openDocActionsMenu(event: Event, doc: any) {
  docActionsMenuItems.value = buildDocActionsMenuItems(doc);
  if (docActionsMenuItems.value.length === 0) return;
  await nextTick();
  docActionsMenuRef.value?.toggle(event);
}

function resolveMenuSlotLabel(label: string | ((...args: unknown[]) => string) | undefined): string {
  if (typeof label === 'function') return label();
  return label ?? '';
}

function docActionItemTitle(
  item: MenuItem,
  label: string | ((...args: unknown[]) => string) | undefined,
) {
  const t = (item as MenuItem & { title?: string }).title;
  if (typeof t === 'string' && t.trim()) return t;
  return resolveMenuSlotLabel(label);
}

const emojiList = [
  '📁','📂','🗂️','📋','📌','📍','🔖','🏷️','📎','🗃️',
  '✅','⚠️','🔴','🟡','🟢','🔵','⭐','🔥','💡','🚀',
  '📊','📈','📉','🗓️','⏰','🔒','🔓','💼','🏢','🌐',
];

// Subfolders of the currently selected folder (for display above documents)
const subfolders = computed(() => {
  if (!selectedFolder.value) return [];
  return folderTree.value.length > 0
    ? getAllSubfolderNodes(folderTree.value, selectedFolder.value.id)
    : [];
});

function getAllSubfolderNodes(nodes: any[], parentId: string): any[] {
  for (const node of nodes) {
    if (node.key === parentId) return node.children ?? [];
    const found = getAllSubfolderNodes(node.children ?? [], parentId);
    if (found.length > 0 || (node.children ?? []).some((c: any) => c.key === parentId)) {
      return found;
    }
  }
  return [];
}

// Breadcrumb trail to selected folder
const breadcrumb = computed(() => {
  if (!selectedFolder.value) return [];
  const trail: any[] = [];
  buildBreadcrumb(folderTree.value, selectedFolder.value.id, trail);
  return trail;
});

/** Emoji de la carpeta seleccionada (franja colapsada). */
const collapsedStripEmoji = computed(() => {
  const raw = selectedFolder.value?.emoji;
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  return null;
});

function buildBreadcrumb(nodes: any[], targetId: string, trail: any[]): boolean {
  for (const node of nodes) {
    trail.push({ id: node.key, name: node.label, emoji: node.data?.emoji, node });
    if (node.key === targetId) return true;
    if (buildBreadcrumb(node.children ?? [], targetId, trail)) return true;
    trail.pop();
  }
  return false;
}

function navigateToCrumb(crumb: any) {
  onFolderSelect(crumb.node);
}

async function loadFolders() {
  if (!canDocRead.value) return;
  foldersLoading.value = true;
  try {
    const { data } = await apiClient.get(`/folders/trackable/${trackableId}`);
    rawFolders.value = data;
    folderTree.value = buildTree(data);

    // Auto-select first folder
    if (folderTree.value.length > 0 && !activeKey.value) {
      onFolderSelect(folderTree.value[0]);
    }
  } finally {
    foldersLoading.value = false;
  }
}

function buildTree(folders: any[]): any[] {
  return folders
    .filter((f: any) => !f.parent)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .map((f: any) => toNode(folders, f));
}

function toNode(all: any[], f: any): any {
  return {
    key: f.id,
    label: f.name,
    data: f,
    icon: 'pi pi-folder',
    children: all
      .filter((c: any) => c.parent?.id === f.id)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
      .map((c: any) => toNode(all, c)),
  };
}

async function loadDocuments(folderId: string) {
  if (!canDocRead.value) return;
  loading.value = true;
  try {
    const { data } = await apiClient.get('/documents', { params: { folderId } });
    documents.value = data.data;
  } finally {
    loading.value = false;
  }
}

function onFolderSelect(node: any) {
  activeKey.value = node.key;
  selectedFolder.value = node.data;
  loadDocuments(node.key);
}

// ── Folder creation ────────────────────────────────────────────────────────────
function openNewRootFolderDialog() {
  if (!canDocCreate.value) return;
  newFolderParentId.value = null;
  newFolderName.value = '';
  showNewFolder.value = true;
}

function openNewSubfolderDialog() {
  if (!canDocCreate.value) return;
  newFolderParentId.value = selectedFolder.value?.id || null;
  newFolderName.value = '';
  showNewFolder.value = true;
}

async function createFolder() {
  if (!canDocCreate.value) return;
  const name = newFolderName.value.trim();
  if (!name) return;
  await apiClient.post('/folders', {
    name,
    trackableId,
    parentId: newFolderParentId.value || undefined,
  });
  newFolderName.value = '';
  newFolderParentId.value = null;
  showNewFolder.value = false;
  await loadFolders();
}

// ── Drag reorder ───────────────────────────────────────────────────────────────
async function onRootReorder() {
  if (!canDocUpdate.value) return;
  const orderedIds = folderTree.value.map((n: any) => n.key);
  await apiClient.patch('/folders/reorder', { orderedIds });
}

async function onChildReorder(evt: any) {
  if (!canDocUpdate.value) return;
  const parentNode = findNode(folderTree.value, evt.parentId);
  if (!parentNode) return;
  const orderedIds = parentNode.children.map((n: any) => n.key);
  await apiClient.patch('/folders/reorder', { orderedIds });
}

function findNode(nodes: any[], key: string): any | null {
  for (const n of nodes) {
    if (n.key === key) return n;
    const found = findNode(n.children ?? [], key);
    if (found) return found;
  }
  return null;
}

// ── Emoji picker ───────────────────────────────────────────────────────────────
function openEmojiPicker(node: any) {
  if (!canDocUpdate.value) return;
  emojiTargetNode.value = node;
  customEmoji.value = '';
  showEmojiPicker.value = true;
}

async function applyEmoji(emoji: string) {
  if (!canDocUpdate.value || !emojiTargetNode.value) return;
  const folderId = emojiTargetNode.value.key;
  await apiClient.patch(`/folders/${folderId}`, { emoji });
  // Update local data
  const raw = rawFolders.value.find((f: any) => f.id === folderId);
  if (raw) raw.emoji = emoji;
  folderTree.value = buildTree(rawFolders.value);
  showEmojiPicker.value = false;
  toast.add({ severity: 'success', summary: emoji ? 'Emoji asignado' : 'Emoji eliminado', life: 2000 });
}

// ── Document creation ──────────────────────────────────────────────────────────
function openCreateDocumentDialog() {
  if (!canDocCreate.value || !selectedFolder.value) return;
  showTemplateSearch.value = true;
}

async function onTemplateSelected(template: any) {
  if (!canDocCreate.value || !selectedFolder.value) return;
  const { data } = await apiClient.post(`/documents/${template.id}/copy`, {
    targetFolderId: selectedFolder.value.id,
    trackableId,
  });
  router.push(`/documents/${data.id}/edit`);
}

async function createNewDocumentBlank() {
  if (!canDocCreate.value || !selectedFolder.value) return;
  const { data } = await apiClient.post('/documents/create-blank', {
    title: 'Nuevo documento',
    folderId: selectedFolder.value.id,
    trackableId,
  });
  router.push(`/documents/${data.id}/edit`);
}

// ── File upload ────────────────────────────────────────────────────────────────
async function handleUpload(event: any) {
  if (!canDocCreate.value) return;
  if (!selectedFolder.value) { alert('Selecciona una carpeta primero'); return; }
  const file = event.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name);
  formData.append('folderId', selectedFolder.value.id);
  formData.append('trackableId', trackableId);
  await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  loadDocuments(selectedFolder.value.id);
}

// ── Document actions ───────────────────────────────────────────────────────────
function openPreview(doc: any) {
  previewDoc.value = doc;
  showPreview.value = true;
}

async function downloadDoc(docId: string) {
  const response = await apiClient.get(`/documents/${docId}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'download';
  a.click();
  URL.revokeObjectURL(url);
}

function openEditor(doc: any) {
  if (isWordDocument(doc)) {
    router.push(`/documents/${doc.id}/edit`);
  } else {
    openPreview(doc);
  }
}

async function deleteDoc(docId: string) {
  if (!canDocDelete.value) return;
  confirm.require({
    message: '¿Enviar este documento a la papelera?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await apiClient.delete(`/documents/${docId}`);
      toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Documento enviado a la papelera', life: 3000 });
      if (selectedFolder.value) loadDocuments(selectedFolder.value.id);
    },
  });
}

async function submitForReview(doc: any) {
  if (!canDocUpdate.value) return;
  try {
    await apiClient.post(`/documents/${doc.id}/submit-review`);
    doc.reviewStatus = 'submitted';
    toast.add({
      severity: 'info',
      summary: 'Enviado a revisión',
      detail: 'El documento se está analizando.',
      life: 4000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo enviar a revisión.',
      life: 4000,
    });
  }
}

async function toggleTemplate(doc: any) {
  if (!canDocUpdate.value) return;
  const newVal = !doc.isTemplate;
  await apiClient.patch(`/documents/${doc.id}`, { isTemplate: newVal });
  doc.isTemplate = newVal;
  toast.add({
    severity: 'success',
    summary: newVal ? 'Marcado como plantilla' : 'Plantilla removida',
    life: 2000,
  });
}

// ── Tags ───────────────────────────────────────────────────────────────────────
function openTagDialog(doc: any) {
  if (!canDocUpdate.value) return;
  tagDoc.value = doc;
  newDocTag.value = '';
  showTagDialog.value = true;
}

async function addDocTag() {
  if (!canDocUpdate.value) return;
  const tag = newDocTag.value.trim().toLowerCase();
  if (!tag || !tagDoc.value) return;
  const current = tagDoc.value.tags || [];
  if (current.includes(tag)) { newDocTag.value = ''; return; }
  const updated = [...current, tag];
  await apiClient.patch(`/documents/${tagDoc.value.id}`, { tags: updated });
  tagDoc.value.tags = updated;
  const idx = documents.value.findIndex((d: any) => d.id === tagDoc.value.id);
  if (idx >= 0) documents.value[idx].tags = updated;
  newDocTag.value = '';
  toast.add({ severity: 'success', summary: 'Etiqueta agregada', life: 2000 });
}

async function removeDocTag(tag: string) {
  if (!canDocUpdate.value || !tagDoc.value) return;
  const updated = (tagDoc.value.tags || []).filter((t: string) => t !== tag);
  await apiClient.patch(`/documents/${tagDoc.value.id}`, { tags: updated });
  tagDoc.value.tags = updated;
  const idx = documents.value.findIndex((d: any) => d.id === tagDoc.value.id);
  if (idx >= 0) documents.value[idx].tags = updated;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isWordDoc(mimeType: string): boolean {
  const m = mimeType || '';
  return (
    m.includes('word') ||
    m.includes('officedocument.wordprocessingml') ||
    m === 'application/msword'
  );
}

/** Editable in SuperDoc: Word MIME or .doc/.docx inferred from title/filename */
function isWordDocument(doc: { mimeType?: string; title?: string; filename?: string }): boolean {
  if (isWordDoc(doc.mimeType || '')) return true;
  const title = (doc.title || '').toLowerCase();
  const filename = (doc.filename || '').toLowerCase();
  const fromName =
    title.endsWith('.doc') ||
    title.endsWith('.docx') ||
    filename.endsWith('.doc') ||
    filename.endsWith('.docx');
  const m = (doc.mimeType || '').trim();
  if (!m || m === 'application/octet-stream') {
    if (fromName) return true;
  }
  return false;
}

/** Menú popup de acciones (mismo conjunto que antes en SpeedDial). Labels cortas; el botón principal tiene tooltip explicativo. */
function buildDocActionsMenuItems(doc: any): MenuItem[] {
  const items: MenuItem[] = [];
  const word = isWordDocument(doc);
  const canSendReview =
    (doc.reviewStatus === 'draft' || doc.reviewStatus === 'revision_needed') && word;

  if (canReadWorkflowItem.value) {
    items.push({
      label: 'Actividad e historial',
      icon: 'pi pi-list',
      title:
        'Ver la actuación vinculada, comentarios e historial de participación en el expediente.',
      command: runOnce(() => openWorkflowActivityDialog(doc)),
    });
  }
  if (canCreateWorkflowItem.value) {
    items.push({
      label: 'Nueva actividad vinculada',
      icon: 'pi pi-plus-circle',
      title: 'Crear una actuación y asociar este u otro documento del expediente.',
      command: runOnce(() => openNewWorkflowForDocument(doc)),
    });
  }
  if (canEditWorkflowItem.value && trackableId) {
    items.push({
      label: 'Vincular a actuación existente',
      icon: 'pi pi-link',
      title: 'Asociar este documento a una actuación ya creada en el expediente.',
      command: runOnce(() => openLinkExistingWorkflowDialogForDoc(doc)),
    });
  }
  if (canDocRead.value) {
    items.push({
      label: 'Vista previa',
      icon: 'pi pi-eye',
      title: 'Ver el contenido en el navegador sin descargar.',
      command: runOnce(() => openPreview(doc)),
    });
    items.push({
      label: 'Descargar',
      icon: 'pi pi-download',
      title: 'Guardar una copia local del archivo.',
      command: runOnce(() => void downloadDoc(doc.id)),
    });
  }
  if (word && canDocRead.value) {
    items.push({
      label: 'Editar',
      icon: 'pi pi-file-edit',
      title: 'Abrir en el editor en línea.',
      command: runOnce(() => openEditor(doc)),
    });
  }
  if (word && canDocUpdate.value) {
    items.push({
      label: doc.isTemplate ? 'Quitar plantilla' : 'Marcar como plantilla',
      icon: doc.isTemplate ? 'pi pi-bookmark-fill' : 'pi pi-bookmark',
      title: doc.isTemplate
        ? 'Dejar de usar este documento como plantilla reutilizable.'
        : 'Reutilizar como base al crear otros documentos.',
      class: doc.isTemplate ? 'menu-action-warn' : undefined,
      command: runOnce(() => void toggleTemplate(doc)),
    });
  }
  if (canSendReview && canDocUpdate.value) {
    items.push({
      label: 'Enviar a revisión',
      icon: 'pi pi-send',
      class: 'menu-action-info',
      title: 'Iniciar evaluación y flujo de revisión del documento.',
      command: runOnce(() => void submitForReview(doc)),
    });
  }
  if (canDocUpdate.value) {
    items.push({
      label: 'Etiquetas',
      icon: 'pi pi-tag',
      title: 'Gestionar etiquetas para clasificar y buscar el documento.',
      command: runOnce(() => openTagDialog(doc)),
    });
  }
  if (canDocDelete.value) {
    items.push({
      label: 'Eliminar',
      icon: 'pi pi-trash',
      class: 'menu-action-danger',
      title: 'Enviar el documento a la papelera del expediente.',
      command: runOnce(() => deleteDoc(doc.id)),
    });
  }

  return items;
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-500';
  if (isWordDoc(mimeType)) return 'pi pi-file-word text-[var(--accent)]';
  if (mimeType?.includes('image')) return 'pi pi-image text-emerald-500';
  return 'pi pi-file text-[var(--fg-subtle)]';
}

onMounted(() => {
  if (canDocRead.value) loadFolders();
});
</script>

<style scoped>
/* ── Layout ── */
.folder-doc-actions-wrap {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 2.5rem;
}

.folder-browser-doc-table :deep(.p-datatable-tbody > tr > td:last-child) {
  overflow: visible;
}

/* ── Sidebar ── */
.folder-sidebar {
  box-shadow:
    inset -1px 0 0 var(--surface-border),
    2px 0 12px -4px color-mix(in srgb, var(--brand-abismo) 6%, transparent);
}

/* ── Folder tree node states ── */
.folder-tree-node-selected {
  background-color: var(--accent-soft);
  color: var(--accent);
}

.folder-tree-node-idle {
  color: var(--fg-default);
}

@media (hover: hover) {
  .folder-tree-node-idle:hover {
    background-color: var(--surface-sunken);
  }
}

/* ── Subfolder cards ── */
.subfolder-card {
  will-change: transform, box-shadow;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s ease-out,
    border-color 0.28s ease;
}

@media (hover: hover) {
  .subfolder-card:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--surface-border));
    box-shadow:
      0 4px 14px color-mix(in srgb, var(--brand-abismo) 8%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent);
  }
}

.subfolder-entrance {
  animation: fadeSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--stagger-delay, 0ms);
}

/* ── Empty state icon pulse ── */
.folder-empty-icon-wrap {
  animation: emptyIconPulse 3s ease-in-out infinite;
}

.folder-empty-state {
  animation: emptyStatePulse 2.8s ease-in-out infinite;
}

/* ── Document title link ── */
.doc-title-link {
  text-decoration: none;
  position: relative;
}

.doc-title-link::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--accent);
  transition: width 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .doc-title-link:hover::after {
    width: 100%;
  }
}

/* ── Add folder button icon ── */
.add-folder-btn :deep(.p-button-icon) {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .add-folder-btn:hover :deep(.p-button-icon) {
    transform: rotate(90deg) scale(1.1);
  }
}

/* ── Keyframes ── */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes emptyIconPulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.75;
    transform: scale(1.04);
  }
}

@keyframes emptyStatePulse {
  0%, 100% {
    border-color: var(--surface-border);
    background-color: color-mix(in srgb, var(--surface-sunken) 25%, transparent);
  }
  50% {
    border-color: color-mix(in srgb, var(--accent) 22%, var(--surface-border));
    background-color: color-mix(in srgb, var(--surface-sunken) 38%, transparent);
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .subfolder-entrance,
  .folder-empty-icon-wrap,
  .folder-empty-state,
  .folder-main-entrance,
  .folder-no-selection,
  .folder-docs-empty {
    animation: none !important;
  }

  .subfolder-card,
  .subfolder-card .subfolder-icon {
    transition: none !important;
    animation: none !important;
  }

  .doc-title-link::after {
    transition: none !important;
  }

  .folder-tree-scroll {
    scroll-behavior: auto;
  }

  .folder-main-area {
    scroll-behavior: auto;
  }

  .add-folder-btn :deep(.p-button-icon),
  .folder-doc-action-btn :deep(.p-button-icon) {
    transition: none !important;
  }

  .folder-browser-doc-table :deep(.p-datatable-tbody > tr) {
    transition: none !important;
  }
}

/* ── Content entrance ── */
.folder-main-entrance {
  animation: fadeSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── No-selection state ── */
.folder-no-selection {
  position: relative;
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Documents empty state ── */
.folder-docs-empty {
  animation: fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Subfolder icon: slight bounce on hover ── */
@media (hover: hover) {
  .subfolder-card:hover .subfolder-icon {
    animation: subfolderIconBounce 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

/* ── DataTable row hover glow ── */
.folder-browser-doc-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

@media (hover: hover) {
  .folder-browser-doc-table :deep(.p-datatable-tbody > tr:hover) {
    box-shadow: inset 3px 0 0 var(--accent);
  }
}

/* ── Action button spin ── */
.folder-doc-action-btn :deep(.p-button-icon) {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .folder-doc-action-btn:hover :deep(.p-button-icon) {
    transform: rotate(90deg);
  }
}

@keyframes subfolderIconBounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.2) rotate(-8deg); }
  70% { transform: scale(0.95) rotate(2deg); }
  100% { transform: scale(1) rotate(0); }
}
</style>

<style scoped>
/* Menú anclado con Portal a body: estilos globales al overlay */
:deep(.folder-doc-actions-menu.p-menu) {
  max-width: min(22rem, calc(100vw - 2rem));
}

:deep(.folder-doc-actions-menu .p-menuitem-link) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

:deep(li.menu-action-danger .p-menuitem-text) {
  color: rgb(220 38 38);
}

:deep(.dark li.menu-action-danger .p-menuitem-text) {
  color: rgb(248 113 113);
}

:deep(li.menu-action-info .p-menuitem-text) {
  color: rgb(37 99 235);
}

:deep(li.menu-action-warn .p-menuitem-text) {
  color: rgb(217 119 6);
}
</style>
