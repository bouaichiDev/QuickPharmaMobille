import { createContext } from 'react';
import type { platformApi } from './api';
/** Only the development gallery supplies an isolated in-memory API. */
export const PlatformContext = createContext<{
  api: typeof platformApi;
  permissions: string[];
  scope: string;
  navigate?: (view: string) => void;
} | null>(null);
