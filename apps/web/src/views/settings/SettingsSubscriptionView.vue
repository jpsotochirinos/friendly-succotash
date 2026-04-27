<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <TabView
      v-model:activeIndex="activeTab"
      class="settings-merged-tabs flex min-h-0 flex-1 flex-col [&_.p-tabview-panels]:min-h-0 [&_.p-tabview-panels]:flex-1 [&_.p-tabview-panel]:min-h-0"
    >
      <TabPanel :value="0" :header="t('settings.sections.plan')">
        <SettingsPlanView embedded />
      </TabPanel>
      <TabPanel :value="1" :header="t('settings.sections.credits')">
        <SettingsCreditsView embedded />
      </TabPanel>
      <TabPanel :value="2" :header="t('settings.sections.billing')">
        <SettingsBillingView embedded />
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
import SettingsPlanView from './SettingsPlanView.vue';
import SettingsCreditsView from './SettingsCreditsView.vue';
import SettingsBillingView from './SettingsBillingView.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const activeTab = ref(0);

function tabIndexFromQuery(): number {
  if (route.query.tab === 'credits') return 1;
  if (route.query.tab === 'billing') return 2;
  return 0;
}

watch(
  () => route.query.tab,
  () => {
    activeTab.value = tabIndexFromQuery();
  },
  { immediate: true },
);

watch(activeTab, (idx) => {
  const cur = route.query.tab;
  if (idx === 0 && (cur == null || cur === '')) return;
  if (idx === 1 && cur === 'credits') return;
  if (idx === 2 && cur === 'billing') return;

  const q = { ...route.query } as Record<string, string | string[] | undefined>;
  if (idx === 0) delete q.tab;
  else if (idx === 1) q.tab = 'credits';
  else q.tab = 'billing';
  void router.replace({ path: route.path, query: q as Record<string, string | string[]> });
});
</script>
