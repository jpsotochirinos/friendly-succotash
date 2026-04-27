<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <TabView
      v-model:activeIndex="activeTab"
      class="settings-merged-tabs flex min-h-0 flex-1 flex-col [&_.p-tabview-panels]:min-h-0 [&_.p-tabview-panels]:flex-1 [&_.p-tabview-panel]:min-h-0"
    >
      <TabPanel :value="0" :header="t('settings.sections.general')">
        <SettingsGeneralView embedded />
      </TabPanel>
      <TabPanel :value="1" :header="t('settings.sections.account')">
        <SettingsAccountView embedded />
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { useI18n } from 'vue-i18n';
import SettingsGeneralView from './SettingsGeneralView.vue';
import SettingsAccountView from './SettingsAccountView.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const activeTab = ref(0);

function tabIndexFromQuery(): number {
  return route.query.tab === 'account' ? 1 : 0;
}

watch(
  () => route.query.tab,
  () => {
    activeTab.value = tabIndexFromQuery();
  },
  { immediate: true },
);

watch(activeTab, (idx) => {
  const wantAccount = idx === 1;
  const isAccount = route.query.tab === 'account';
  if (wantAccount === isAccount) return;
  const q = { ...route.query } as Record<string, string | string[] | undefined>;
  if (wantAccount) q.tab = 'account';
  else delete q.tab;
  void router.replace({ path: route.path, query: q as Record<string, string | string[]> });
});
</script>
