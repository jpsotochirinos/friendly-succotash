import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import AppLayout from '../layouts/AppLayout.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Sandbox — public, no auth, no AppLayout, no API
    {
      path: '/sandbox',
      component: () => import('../sandbox/SandboxLayout.vue'),
      meta: { public: true },
      children: [
        {
          path: '',
          name: 'sandbox-home',
          component: () => import('../sandbox/SandboxHome.vue'),
          meta: { public: true },
        },
        // ── Foundations ──────────────────────────────────────────────────
        {
          path: 'foundations/typography',
          name: 'sandbox-typography',
          component: () => import('../sandbox/foundations/Typography/TypographySandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'foundations/tokens',
          name: 'sandbox-tokens',
          component: () => import('../sandbox/foundations/Tokens/TokensSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'foundations/layout',
          name: 'sandbox-layout',
          component: () => import('../sandbox/foundations/Layout/LayoutSandbox.vue'),
          meta: { public: true },
        },
        // ── Components ────────────────────────────────────────────────────
        {
          path: 'components/confirm-dialog',
          name: 'sandbox-confirm-dialog',
          component: () => import('../sandbox/components/ConfirmDialog/ConfirmDialogSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/dialog',
          name: 'sandbox-dialog',
          component: () => import('../sandbox/components/Dialog/DialogSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/informational-dialog',
          name: 'sandbox-informational-dialog',
          component: () =>
            import('../sandbox/components/InformationalDialog/InformationalDialogSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/button',
          name: 'sandbox-button',
          component: () => import('../sandbox/components/Button/ButtonSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/selectbutton-toggle',
          name: 'sandbox-selectbutton-toggle',
          component: () => import('../sandbox/components/SelectButtonToggle/SelectButtonToggleSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/tooltip',
          name: 'sandbox-tooltip',
          component: () => import('../sandbox/components/Tooltip/TooltipSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/loading',
          name: 'sandbox-loading',
          component: () => import('../sandbox/components/Loading/LoadingSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/tag-chip-badge',
          name: 'sandbox-tag-chip-badge',
          component: () => import('../sandbox/components/TagChipBadge/TagChipBadgeSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/avatar',
          name: 'sandbox-avatar',
          component: () => import('../sandbox/components/Avatar/AvatarSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/menu-popover',
          name: 'sandbox-menu-popover',
          component: () => import('../sandbox/components/MenuPopover/MenuPopoverSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/feedback',
          name: 'sandbox-feedback',
          component: () => import('../sandbox/components/Feedback/FeedbackSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/inputs',
          name: 'sandbox-inputs',
          component: () => import('../sandbox/components/Inputs/InputsSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/select',
          name: 'sandbox-select',
          component: () => import('../sandbox/components/Select/SelectSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/toggle',
          name: 'sandbox-toggle',
          component: () => import('../sandbox/components/Toggle/ToggleSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/calendar',
          name: 'sandbox-calendar',
          component: () => import('../sandbox/components/Calendar/CalendarSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'components/slider',
          name: 'sandbox-slider',
          component: () => import('../sandbox/components/Slider/SliderSandbox.vue'),
          meta: { public: true },
        },
        // ── Patterns ──────────────────────────────────────────────────────
        {
          path: 'patterns/type-chip',
          name: 'sandbox-type-chip',
          component: () => import('../sandbox/patterns/TypeChip/TypeChipSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'patterns/kpi-card',
          name: 'sandbox-kpi-card',
          component: () => import('../sandbox/patterns/KpiCard/KpiCardSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'patterns/activity-stat',
          name: 'sandbox-activity-stat',
          component: () => import('../sandbox/patterns/ActivityStat/ActivityStatSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'patterns/misc-pills',
          name: 'sandbox-misc-pills',
          component: () => import('../sandbox/patterns/MiscPills/MiscPillsSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'patterns/hierarchical-involved',
          name: 'sandbox-hierarchical-involved',
          component: () =>
            import('../sandbox/patterns/HierarchicalInvolved/HierarchicalInvolvedSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'patterns/workbench-assignee-filter',
          name: 'sandbox-workbench-assignee-filter',
          component: () =>
            import('../sandbox/patterns/WorkbenchAssigneeFilter/WorkbenchAssigneeFilterSandbox.vue'),
          meta: { public: true },
        },
        // ── Recipes ───────────────────────────────────────────────────────
        {
          path: 'recipes/trackables-cockpit',
          name: 'sandbox-trackables-cockpit',
          component: () =>
            import('../sandbox/recipes/TrackablesCockpit/TrackablesCockpitSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'recipes/expediente-v21',
          name: 'sandbox-expediente-v21',
          component: () =>
            import('../sandbox/recipes/ExpedienteV21/ExpedienteV21Sandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'recipes/data-table-functional',
          name: 'sandbox-data-table-functional',
          component: () =>
            import('../sandbox/recipes/DataTableFunctional/DataTableFunctionalSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'recipes/data-table-informational',
          name: 'sandbox-data-table-informational',
          component: () =>
            import('../sandbox/recipes/DataTableInformational/DataTableInformationalSandbox.vue'),
          meta: { public: true },
        },
        {
          path: 'recipes/calendar-redesign',
          name: 'sandbox-calendar-redesign',
          component: () =>
            import('../sandbox/recipes/CalendarRedesign/CalendarRedesignSandbox.vue'),
          meta: { public: true },
        },
      ],
    },
    {
      path: '/auth',
      children: [
        { path: 'login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
        { path: 'register', name: 'register', component: () => import('../views/auth/RegisterView.vue') },
        { path: 'callback', name: 'auth-callback', component: () => import('../views/auth/AuthCallback.vue') },
        { path: 'magic-link', name: 'magic-link', component: () => import('../views/auth/MagicLinkVerify.vue') },
        { path: 'invite', name: 'invite-accept', component: () => import('../views/auth/InviteAcceptView.vue') },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('../views/auth/ForgotPasswordView.vue'),
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('../views/auth/ResetPasswordView.vue'),
        },
      ],
      meta: { public: true },
    },
    {
      path: '/sign',
      name: 'signature-external-sign',
      component: () => import('../views/signatures/SignatureExternalView.vue'),
      meta: { public: true },
    },
    {
      path: '/verify-req/:id',
      name: 'verify-req',
      component: () => import('../views/signatures/SignatureVerifyView.vue'),
      props: true,
      meta: { public: true },
    },
    {
      path: '/verify/:hash',
      name: 'verify-hash',
      component: () => import('../views/signatures/SignatureVerifyView.vue'),
      props: true,
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
          path: 'sinoe-proposals',
          name: 'sinoe-proposals',
          component: () => import('../views/sinoe/SinoeInboxView.vue'),
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
          path: 'signatures',
          name: 'signatures',
          component: () => import('../views/signatures/SignatureRequestsView.vue'),
          meta: { requiresPermission: 'signature:sign' },
        },
        {
          path: 'signatures/:requestId/sign',
          name: 'signature-sign',
          component: () => import('../views/signatures/SignatureSignView.vue'),
          props: true,
          meta: { requiresPermission: 'signature:sign' },
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
              path: 'blueprints',
              name: 'settings-blueprints',
              component: () => import('../views/blueprints/BlueprintsListView.vue'),
              meta: { requiresPermission: 'blueprint:read' },
            },
            {
              path: 'blueprints/:id/edit',
              name: 'settings-blueprint-editor',
              component: () => import('../views/blueprints/BlueprintEditorView.vue'),
              props: true,
              meta: { requiresPermission: 'blueprint:manage' },
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
  // Sandbox is dev-only and always public — bypass ALL auth logic
  if (to.path.startsWith('/sandbox')) return true;

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
