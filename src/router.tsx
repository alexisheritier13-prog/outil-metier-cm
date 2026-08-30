import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { INTERNAL_ROLES } from '@/shared/constants/roles';
import { RequireRole } from '@/auth/RequireRole';
import { FullPageSpinner } from '@/components/FullPageSpinner';

const LoginPage = lazy(() =>
  import('@/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const AppLayout = lazy(() => import('@/app/AppLayout').then((m) => ({ default: m.AppLayout })));
const PlanningPage = lazy(() =>
  import('@/app/posts/PlanningPage').then((m) => ({ default: m.PlanningPage })),
);
const UsersPage = lazy(() =>
  import('@/app/settings/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const TrashPage = lazy(() => import('@/app/trash/TrashPage').then((m) => ({ default: m.TrashPage })));
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
const PortalHome = lazy(() =>
  import('@/portal/PortalHome').then((m) => ({ default: m.PortalHome })),
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
        { index: true, element: lazyRoute(<PlanningPage />) },
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
          path: 'parametres/utilisateurs',
          element: <RequireRole roles={['admin']}>{lazyRoute(<UsersPage />)}</RequireRole>,
        },
      ],
    },
    {
      path: '/portail/*',
      element: <RequireRole roles={['client']}>{lazyRoute(<PortalHome />)}</RequireRole>,
    },
    { path: '*', element: <Navigate to="/app" replace /> },
  ],
  { future: { v7_relativeSplatPath: true } },
);
