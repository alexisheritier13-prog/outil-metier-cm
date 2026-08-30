import { createBrowserRouter } from 'react-router-dom';
import { Canary } from '@/app/Canary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Canary />,
  },
]);
