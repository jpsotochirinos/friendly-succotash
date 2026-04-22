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
        { path: 'invite', name: 'invite-accept', component: () => import('../views/auth/InviteAcceptView.vue') },
      ],
      meta: { public: true },
    },
    {
      path: '/documents/:id/edit',
      name: 'document-editor',
      component: () => import('../views/documents/DocumentEditorView.vue'),
      props: true,
      meta: { requiresAuth: true, requiresPermission: 'document:read' },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'trackables',
          name: 'trackables',
          component: () => import('../views/trackables/TrackablesListView.vue'),
          meta: { requiresPermission: 'trackable:read' },
        },
        {
          path: 'trackables/:id',
          name: 'expediente',
          component: () => import('../views/trackables/ExpedienteView.vue'),
          props: true,
          meta: { requiresPermission: 'trackable:read' },
        },
        {
          path: 'trackables/:id/flow',
          redirect: (to) => ({
            name: 'expediente',
            params: { id: to.params.id },
            query: to.query,
            hash: to.hash,
          }),
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('../views/clients/ClientsListView.vue'),
          meta: { requiresPermission: 'trackable:read' },
        },
        {
          path: 'notifications',
          name: 'notifications-inbox',
          component: () => import('../views/notifications/NotificationsInboxView.vue'),
          meta: { requiresPermission: 'trackable:read' },
        },
        {
          path: 'novedades',
          name: 'feed',
          component: () => import('../views/feed/FeedView.vue'),
          meta: { requiresPermission: 'feed:read' },
        },
        {
          path: 'calendar',
          name: 'global-calendar',
          component: () => import('../views/calendar/GlobalCalendarView.vue'),
          meta: { requiresPermission: 'trackable:read' },
        },
        {
          path: 'reviews',
          name: 'reviews',
          component: () => import('../views/reviews/ReviewQueueView.vue'),
          meta: { requiresPermission: 'document:read' },
        },
        {
          path: 'templates',
          name: 'templates',
          component: () => import('../views/documents/TemplateSearchView.vue'),
          meta: { requiresPermission: 'document:read' },
        },
        {
          path: 'workflow-templates/:id/edit',
          name: 'workflow-template-edit',
          component: () => import('../views/templates/WorkflowTemplateEditView.vue'),
          props: true,
        },
        {
          path: 'settings',
          component: () => import('../views/settings/SettingsLayout.vue'),
          redirect: { name: 'settings-general' },
          children: [
            {
              path: 'general',
              name: 'settings-general',
              component: () => import('../views/settings/SettingsGeneralView.vue'),
            },
            {
              path: 'account',
              name: 'settings-account',
              component: () => import('../views/settings/SettingsAccountView.vue'),
            },
            {
              path: 'migration',
              name: 'settings-migration',
              component: () => import('../views/import/ImportMigrationView.vue'),
              meta: { requiresPermission: 'import:manage' },
            },
            {
              path: 'calendar',
              name: 'settings-calendar',
              component: () => import('../views/settings/SettingsCalendarView.vue'),
              meta: { requiresPermission: 'trackable:read' },
            },
            {
              path: 'sinoe',
              name: 'settings-sinoe',
              component: () => import('../views/settings/SettingsSinoeView.vue'),
              meta: { requiresPermission: 'sinoe:manage' },
            },
            {
              path: 'whatsapp',
              name: 'settings-whatsapp',
              component: () => import('../views/settings/SettingsWhatsAppView.vue'),
              meta: { requiresPermission: 'trackable:read' },
            },
            {
              path: 'privacy',
              name: 'settings-privacy',
              component: () => import('../views/settings/SettingsComingSoonView.vue'),
            },
            {
              path: 'billing',
              name: 'settings-billing',
              component: () => import('../views/settings/SettingsBillingView.vue'),
              meta: { requiresPermission: 'billing:read' },
            },
            {
              path: 'credits',
              name: 'settings-credits',
              component: () => import('../views/settings/SettingsCreditsView.vue'),
              meta: { requiresPermission: 'billing:read' },
            },
            {
              path: 'plan',
              name: 'settings-plan',
              component: () => import('../views/settings/SettingsPlanView.vue'),
              meta: { requiresPermission: 'billing:read' },
            },
            {
              path: 'users',
              name: 'settings-users',
              component: () => import('../views/settings/UsersListView.vue'),
            },
            {
              path: 'roles',
              name: 'settings-roles',
              component: () => import('../views/admin/RolesView.vue'),
            },
            {
              path: 'feed-sources',
              name: 'settings-feed-sources',
              component: () => import('../views/settings/SettingsFeedSourcesView.vue'),
              meta: { requiresPermission: 'feed:manage' },
            },
            {
              path: 'workflow-templates',
              name: 'settings-workflow-templates',
              component: () => import('../views/templates/WorkflowTemplatesView.vue'),
            },
            {
              path: 'workflow-rules',
              name: 'settings-workflow-rules',
              component: () => import('../views/settings/SettingsWorkflowRulesView.vue'),
              meta: { requiresPermission: 'workflow:update' },
            },
            {
              path: 'workflows',
              name: 'settings-workflows',
              component: () => import('../views/settings/WorkflowsListView.vue'),
              meta: { requiresPermission: 'workflow:update' },
            },
            {
              path: 'workflows/:id/edit',
              name: 'settings-workflow-edit',
              component: () => import('../views/settings/WorkflowEditView.vue'),
              props: true,
              meta: { requiresPermission: 'workflow:update' },
            },
            { path: 'workflow', redirect: { name: 'settings-workflows' } },
          ],
        },
        { path: 'roles', redirect: { name: 'settings-roles' } },
        { path: 'workflow-templates', redirect: { name: 'settings-workflow-templates' } },
        {
          path: 'trash',
          redirect: { path: '/trackables', query: { scope: 'trash' } },
        },
        {
          path: 'import',
          name: 'import-migration',
          component: () => import('../views/import/ImportMigrationView.vue'),
          meta: { requiresPermission: 'import:manage' },
        },
        {
          path: 'import/oauth-callback',
          name: 'import-oauth-callback',
          component: () => import('../views/import/ImportOAuthCallback.vue'),
          meta: { requiresPermission: 'import:manage' },
        },
        {
          path: 'import/batches/:id/review',
          name: 'import-review',
          component: () => import('../views/import/ImportBatchReviewView.vue'),
          props: true,
          meta: { requiresPermission: 'import:manage' },
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

  await authStore.ensureOrganizationLoaded();

  if (to.name === 'onboarding') {
    if (authStore.organization?.settings?.onboardingCompleted === true) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/';
      return redirect;
    }
    return true;
  }

  if (authStore.needsOnboarding) {
    return { name: 'onboarding', query: { redirect: to.fullPath } };
  }

  const required = (to.meta as { requiresPermission?: string }).requiresPermission;
  if (required) {
    const perms = authStore.user?.permissions ?? [];
    if (!perms.includes(required)) {
      return { name: 'settings-general', query: { missingPermission: required } };
    }
  }

  return true;
});
