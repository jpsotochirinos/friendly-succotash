import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import AppLayout from '../layouts/AppLayout.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth',
      children: [
        { path: 'login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
        { path: 'register', name: 'register', component: () => import('../views/auth/RegisterView.vue') },
        { path: 'callback', name: 'auth-callback', component: () => import('../views/auth/AuthCallback.vue') },
        { path: 'magic-link', name: 'magic-link', component: () => import('../views/auth/MagicLinkVerify.vue') },
      ],
      meta: { public: true },
    },
    {
      path: '/documents/:id/edit',
      name: 'document-editor',
      component: () => import('../views/documents/DocumentEditorView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/trackables' },
        {
          path: 'trackables',
          name: 'trackables',
          component: () => import('../views/trackables/TrackablesListView.vue'),
        },
        {
          path: 'trackables/:id/flow',
          name: 'trackable-flow',
          component: () => import('../views/trackables/TrackableFlowView.vue'),
          props: true,
        },
        {
          path: 'reviews',
          name: 'reviews',
          component: () => import('../views/reviews/ReviewQueueView.vue'),
        },
        {
          path: 'templates',
          name: 'templates',
          component: () => import('../views/documents/TemplateSearchView.vue'),
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('../views/admin/RolesView.vue'),
        },
        {
          path: 'trash',
          name: 'trash',
          component: () => import('../views/documents/TrashView.vue'),
        },
        {
          path: 'onboarding',
          name: 'onboarding',
          component: () => import('../views/onboarding/OnboardingWizard.vue'),
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (to.meta.public) return true;

  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (!authStore.user) {
    await authStore.fetchMe();
  }

  return true;
});
