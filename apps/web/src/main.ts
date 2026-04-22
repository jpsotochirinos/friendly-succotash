import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css';
import App from './App.vue';
import { router } from './router/index';
import { i18n } from './i18n/index';
import { AlegaPreset } from './theme/alegaPreset';
import { primeVueLocaleEs } from './config/primeVueLocaleEs';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(PrimeVue, {
  ripple: true,
  locale: primeVueLocaleEs,
  theme: {
    preset: AlegaPreset,
    options: {
      darkModeSelector: '.dark',
    },
  },
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

app.mount('#app');
