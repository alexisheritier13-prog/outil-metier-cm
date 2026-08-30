import { createBrowserRouter, Navigate } from 'react-router-dom';
import { INTERNAL_ROLES } from '@/shared/constants/roles';
import { RequireRole } from '@/auth/RequireRole';
import { LoginPage } from '@/auth/LoginPage';
import { AppHome } from '@/app/AppHome';
import { PortalHome } from '@/portal/PortalHome';

export const router = createBrowserRouter(
  [
    { path: '/', element: <Navigate to="/app" replace /> },
    { path: '/login', element: <LoginPage /> },
    {
      path: '/app/*',
      element: (
        <RequireRole roles={INTERNAL_ROLES}>
          <AppHome />
        </RequireRole>
      ),
    },
    {
      path: '/portail/*',
      element: (
        <RequireRole roles={['client']}>
          <PortalHome />
        </RequireRole>
      ),
    },
    { path: '*', element: <Navigate to="/app" replace /> },
  ],
  { future: { v7_relativeSplatPath: true } },
);
