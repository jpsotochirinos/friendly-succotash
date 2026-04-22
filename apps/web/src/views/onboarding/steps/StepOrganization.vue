<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-5 pt-2">
    <h3 :id="headingId" class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">
      {{ $t('onboarding.stepOrgHeading') }}
    </h3>
    <FloatLabel variant="on">
      <InputText :id="`${idPrefix}-org-name`" v-model="nameModel" class="w-full" required />
      <label :for="`${idPrefix}-org-name`">{{ $t('onboarding.orgName') }}</label>
    </FloatLabel>
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-brand-hielo" :for="`${idPrefix}-org-desc`">
        {{ $t('onboarding.orgDescription') }}
      </label>
      <Textarea :id="`${idPrefix}-org-desc`" v-model="descriptionModel" rows="3" class="w-full" auto-resize />
    </div>
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-brand-hielo">{{ $t('onboarding.logoUpload') }}</label>
      <p class="text-xs" :style="{ color: 'var(--fg-muted)' }">{{ $t('onboarding.logoHint') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <input
          ref="fileRef"
          type="file"
          class="sr-only"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="onFile"
        />
        <Button type="button" outlined :label="$t('onboarding.chooseFile')" icon="pi pi-upload" @click="fileRef?.click()" />
        <Button
          v-if="logoFile || logoPreviewUrl"
          type="button"
          text
          severity="danger"
          :label="$t('onboarding.removeLogo')"
          @click="clearLogo"
        />
      </div>
      <div v-if="logoPreviewUrl" class="mt-2">
        <img :src="logoPreviewUrl" alt="" class="h-16 w-auto rounded-lg border object-contain" :style="{ borderColor: 'var(--surface-border)' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';

const props = defineProps<{
  modelValue: { name: string; description: string };
  logoFile: File | null;
  idPrefix?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: { name: string; description: string }];
  'update:logoFile': [file: File | null];
}>();

const headingId = 'onboarding-step-org-heading';
const idPrefix = computed(() => props.idPrefix ?? 'onb');
const fileRef = ref<HTMLInputElement | null>(null);
const logoPreviewUrl = ref<string | null>(null);

const nameModel = computed({
  get: () => props.modelValue.name,
  set: (v) => emit('update:modelValue', { ...props.modelValue, name: v }),
});
const descriptionModel = computed({
  get: () => props.modelValue.description,
  set: (v) => emit('update:modelValue', { ...props.modelValue, description: v }),
});

function syncPreviewFromFile(f: File | null) {
  if (logoPreviewUrl.value) {
    URL.revokeObjectURL(logoPreviewUrl.value);
    logoPreviewUrl.value = null;
  }
  if (f) logoPreviewUrl.value = URL.createObjectURL(f);
}

watch(
  () => props.logoFile,
  (f) => {
    if (!f) {
      if (logoPreviewUrl.value) {
        URL.revokeObjectURL(logoPreviewUrl.value);
        logoPreviewUrl.value = null;
      }
    } else {
      syncPreviewFromFile(f);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (logoPreviewUrl.value) URL.revokeObjectURL(logoPreviewUrl.value);
});

function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  emit('update:logoFile', f);
  syncPreviewFromFile(f);
}

function clearLogo() {
  emit('update:logoFile', null);
  if (logoPreviewUrl.value) {
    URL.revokeObjectURL(logoPreviewUrl.value);
    logoPreviewUrl.value = null;
  }
}

</script>
