<template>
  <div class="flex flex-col gap-3">
    <FileUpload
      mode="basic"
      :auto="false"
      :choose-label="t('signatures.uploadChoose')"
      accept="image/png,image/jpeg,image/jpg"
      :maxFileSize="maxBytes"
      :invalidFileSizeMessage="t('signatures.uploadTooBig')"
      :invalidFileTypeMessage="t('signatures.uploadInvalidType')"
      :disabled="!!preview"
      @select="onSelect"
    />
    <p class="m-0 text-xs text-[var(--fg-muted)]">{{ t('signatures.uploadHint') }}</p>
    <div v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>
    <div v-if="preview" class="flex flex-col gap-2">
      <img
        :src="preview"
        alt=""
        class="max-h-48 max-w-full rounded border border-[var(--surface-border)] bg-white object-contain"
      />
      <Button
        type="button"
        size="small"
        text
        severity="danger"
        :label="t('signatures.uploadRemove')"
        @click="remove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload';

const emit = defineEmits<{ (e: 'confirm', dataUrl: string): void; (e: 'clear'): void }>();
const { t } = useI18n();
const maxBytes = 2 * 1024 * 1024;
const error = ref('');
const preview = ref<string | null>(null);

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg']);

function onSelect(e: FileUploadSelectEvent) {
  error.value = '';
  const f = e.files[0] as File | undefined;
  if (!f) return;
  if (!ALLOWED.has(f.type)) {
    error.value = t('signatures.uploadInvalidType');
    return;
  }
  if (f.size > maxBytes) {
    error.value = t('signatures.uploadTooBig');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const u = String(reader.result || '');
    if (u) {
      preview.value = u;
      emit('confirm', u);
    }
  };
  reader.readAsDataURL(f);
}

function remove() {
  preview.value = null;
  error.value = '';
  emit('clear');
}
</script>
