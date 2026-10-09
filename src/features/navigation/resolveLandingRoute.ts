import { crmModules } from '@/features/crm/modules';

/** Map the backend landing page to its existing native screen. Home handles each dashboard kind. */
export function resolveLandingRoute(defaultRoute?: string | null): string {
  const path = (defaultRoute ?? '').split(/[?#]/)[0]?.replace(/\/$/, '') ?? '';
  if (path.startsWith('/services-crm/')) {
    const key = path.slice('/services-crm/'.length);
    const module = crmModules.find(
      (item) => item.key === (key === 'settings' ? 'form-builder' : key),
    );
    if (module) return `/crm/${module.key}`;
  }
  const routes: Record<string, string> = {
    '/products': '/stock',
    '/stock': '/stock',
    '/categories': '/categories',
    '/plans': '/plans',
    '/plans/selection': '/plans',
  };
  return routes[path] ?? '/home';
}
