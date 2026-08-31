import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { INTERNAL_ROLES } from '@/shared/constants/roles';
import { RequireRole } from '@/auth/RequireRole';
import { FullPageSpinner } from '@/components/FullPageSpinner';

const LoginPage = lazy(() =>
  import('@/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const AppLayout = lazy(() => import('@/app/AppLayout').then((m) => ({ default: m.AppLayout })));
const DashboardPage = lazy(() =>
  import('@/app/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const PlanningPage = lazy(() =>
  import('@/app/posts/PlanningPage').then((m) => ({ default: m.PlanningPage })),
);
const UsersPage = lazy(() =>
  import('@/app/settings/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const AlertSettingsPage = lazy(() =>
  import('@/app/settings/AlertSettingsPage').then((m) => ({ default: m.AlertSettingsPage })),
);
const SettingsHome = lazy(() =>
  import('@/app/settings/SettingsHome').then((m) => ({ default: m.SettingsHome })),
);
const JobsPage = lazy(() =>
  import('@/app/settings/JobsPage').then((m) => ({ default: m.JobsPage })),
);
const TrashPage = lazy(() => import('@/app/trash/TrashPage').then((m) => ({ default: m.TrashPage })));
const ReviewQueuePage = lazy(() =>
  import('@/app/review/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })),
);
const ClientsPage = lazy(() =>
  import('@/app/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const ClientDetailPage = lazy(() =>
  import('@/app/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })),
);
const CampaignsPage = lazy(() =>
  import('@/app/campaigns/CampaignsPage').then((m) => ({ default: m.CampaignsPage })),
);
const CampaignDetailPage = lazy(() =>
  import('@/app/campaigns/CampaignDetailPage').then((m) => ({ default: m.CampaignDetailPage })),
);
const PortalLayout = lazy(() =>
  import('@/portal/PortalLayout').then((m) => ({ default: m.PortalLayout })),
);
const PortalCalendarPage = lazy(() =>
  import('@/portal/PortalCalendarPage').then((m) => ({ default: m.PortalCalendarPage })),
);
const PortalReviewPage = lazy(() =>
  import('@/portal/PortalReviewPage').then((m) => ({ default: m.PortalReviewPage })),
);
const PortalPublishedPage = lazy(() =>
  import('@/portal/PortalPublishedPage').then((m) => ({ default: m.PortalPublishedPage })),
);
const PortalBriefsPage = lazy(() =>
  import('@/portal/PortalBriefsPage').then((m) => ({ default: m.PortalBriefsPage })),
);
const RequestsPage = lazy(() =>
  import('@/app/requests/RequestsPage').then((m) => ({ default: m.RequestsPage })),
);
const IdeasPage = lazy(() =>
  import('@/app/ideas/IdeasPage').then((m) => ({ default: m.IdeasPage })),
);
const TemplatesPage = lazy(() =>
  import('@/app/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const KeyDatesPage = lazy(() =>
  import('@/app/keydates/KeyDatesPage').then((m) => ({ default: m.KeyDatesPage })),
);
const AlertsPage = lazy(() =>
  import('@/app/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage })),
);

function lazyRoute(node: React.ReactNode) {
  return <Suspense fallback={<FullPageSpinner />}>{node}</Suspense>;
}

export const router = createBrowserRouter(
  [
    { path: '/', element: <Navigate to="/app" replace /> },
    { path: '/login', element: lazyRoute(<LoginPage />) },
    {
      path: '/app',
      element: (
        <RequireRole roles={INTERNAL_ROLES}>{lazyRoute(<AppLayout />)}</RequireRole>
      ),
      children: [
        { index: true, element: lazyRoute(<DashboardPage />) },
        { path: 'planning', element: lazyRoute(<PlanningPage />) },
        { path: 'a-valider', element: lazyRoute(<ReviewQueuePage />) },
        { path: 'alertes', element: lazyRoute(<AlertsPage />) },
        { path: 'demandes', element: lazyRoute(<RequestsPage />) },
        { path: 'idees', element: lazyRoute(<IdeasPage />) },
        { path: 'templates', element: lazyRoute(<TemplatesPage />) },
        { path: 'marronniers', element: lazyRoute(<KeyDatesPage />) },
        { path: 'clients', element: lazyRoute(<ClientsPage />) },
        { path: 'clients/:clientId', element: lazyRoute(<ClientDetailPage />) },
        { path: 'campagnes', element: lazyRoute(<CampaignsPage />) },
        { path: 'campagnes/:campaignId', element: lazyRoute(<CampaignDetailPage />) },
        {
          path: 'corbeille',
          element: (
            <RequireRole roles={['lead', 'admin']}>{lazyRoute(<TrashPage />)}</RequireRole>
          ),
        },
        {
          path: 'parametres',
          element: <RequireRole roles={['admin']}>{lazyRoute(<SettingsHome />)}</RequireRole>,
        },
        {
          path: 'parametres/utilisateurs',
          element: <RequireRole roles={['admin']}>{lazyRoute(<UsersPage />)}</RequireRole>,
        },
        {
          path: 'parametres/alertes',
          element: <RequireRole roles={['admin']}>{lazyRoute(<AlertSettingsPage />)}</RequireRole>,
        },
        {
          path: 'parametres/jobs',
          element: <RequireRole roles={['admin']}>{lazyRoute(<JobsPage />)}</RequireRole>,
        },
      ],
    },
    {
      path: '/portail',
      element: <RequireRole roles={['client']}>{lazyRoute(<PortalLayout />)}</RequireRole>,
      children: [
        { index: true, element: lazyRoute(<PortalCalendarPage />) },
        { path: 'a-valider', element: lazyRoute(<PortalReviewPage />) },
        { path: 'publies', element: lazyRoute(<PortalPublishedPage />) },
        { path: 'briefs', element: lazyRoute(<PortalBriefsPage />) },
      ],
    },
    { path: '*', element: <Navigate to="/app" replace /> },
  ],
  { future: { v7_relativeSplatPath: true } },
);
