<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <Card class="w-full max-w-2xl">
      <template #content>
        <Stepper v-model:active-step="currentStep">
          <StepperPanel header="Organización">
            <div class="space-y-4 p-4">
              <h3 class="text-lg font-semibold">Datos de tu organización</h3>
              <InputText v-model="orgData.name" placeholder="Nombre de la organización" class="w-full" />
              <Textarea v-model="orgData.description" placeholder="Descripción (opcional)" rows="3" class="w-full" />
            </div>
          </StepperPanel>

          <StepperPanel header="Configuración">
            <div class="space-y-4 p-4">
              <h3 class="text-lg font-semibold">Preferencias</h3>
              <div>
                <label class="block text-sm font-medium mb-1">Zona horaria</label>
                <Dropdown v-model="orgData.timezone" :options="timezones" placeholder="Seleccionar" class="w-full" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Idioma principal</label>
                <Dropdown v-model="orgData.language" :options="['Español', 'English']" class="w-full" />
              </div>
            </div>
          </StepperPanel>

          <StepperPanel header="Equipo">
            <div class="space-y-4 p-4">
              <h3 class="text-lg font-semibold">Invita a tu equipo</h3>
              <p class="text-sm text-gray-500">Puedes hacer esto después también.</p>
              <div v-for="(invite, i) in invites" :key="i" class="flex gap-2">
                <InputText v-model="invite.email" placeholder="email@ejemplo.com" class="flex-1" />
                <Dropdown v-model="invite.role" :options="roleOptions" placeholder="Rol" class="w-40" />
                <Button icon="pi pi-times" text severity="danger" @click="invites.splice(i, 1)" />
              </div>
              <Button label="Agregar miembro" icon="pi pi-plus" text size="small" @click="invites.push({ email: '', role: '' })" />
            </div>
          </StepperPanel>

          <StepperPanel header="Listo">
            <div class="text-center p-8">
              <i class="pi pi-check-circle text-6xl text-green-500 mb-4" />
              <h3 class="text-xl font-semibold">¡Todo listo!</h3>
              <p class="text-gray-500 mt-2">Tu organización está configurada. Comienza creando tu primer trackable.</p>
              <Button label="Ir al dashboard" icon="pi pi-arrow-right" class="mt-6" @click="finish" />
            </div>
          </StepperPanel>
        </Stepper>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Stepper from 'primevue/stepper';
import StepperPanel from 'primevue/stepperpanel';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import { apiClient } from '@/api/client';

const router = useRouter();
const currentStep = ref(0);

const orgData = ref({ name: '', description: '', timezone: 'America/Lima', language: 'Español' });
const invites = ref([{ email: '', role: '' }]);
const timezones = ['America/Lima', 'America/Bogota', 'America/Mexico_City', 'America/New_York', 'Europe/Madrid'];
const roleOptions = ['Senior Operator', 'Junior Operator', 'Assistant', 'Administrative'];

async function finish() {
  await apiClient.patch('/organizations/me', {
    settings: {
      timezone: orgData.value.timezone,
      language: orgData.value.language,
      onboardingCompleted: true,
    },
  });
  router.push('/');
}
</script>
