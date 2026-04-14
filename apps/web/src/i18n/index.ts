import { createI18n } from 'vue-i18n';

const messages = {
  es: {
    app: { name: 'Alega', loading: 'Cargando...' },
    auth: {
      login: 'Iniciar sesión',
      register: 'Registrarse',
      magicLink: 'Enlace mágico',
    },
    nav: {
      dashboard: 'Dashboard',
      trackables: 'Clientes',
      documents: 'Documentos',
      templates: 'Plantillas',
      logout: 'Cerrar sesión',
    },
  },
  en: {
    app: { name: 'Alega', loading: 'Loading...' },
    auth: {
      login: 'Log in',
      register: 'Register',
      magicLink: 'Magic link',
    },
    nav: {
      dashboard: 'Dashboard',
      trackables: 'Clientes',
      documents: 'Documents',
      templates: 'Templates',
      logout: 'Logout',
    },
  },
};

export const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'en',
  messages,
});
