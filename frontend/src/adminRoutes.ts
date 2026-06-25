import type { Screen } from './types'

export const SCREEN_PATHS: Record<Screen, string> = {
  dashboard: '/dashboard',
  preorders: '/preorders',
  orders: '/orders',
  customers: '/customers',
  menus: '/menus',
  stock: '/stock',
  subscribers: '/subscribers',
  botMessages: '/bot-messages',
  users: '/users',
  settings: '/settings',
}

const PATH_SCREENS = Object.fromEntries(Object.entries(SCREEN_PATHS).map(([screen, route]) => [route, screen])) as Record<string, Screen>

export function screenToPath(screen: Screen): string {
  return SCREEN_PATHS[screen]
}

export function pathToScreen(pathname: string): Screen | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return 'dashboard'
  return PATH_SCREENS[path] ?? null
}

export function currentAdminScreen(): Screen {
  if (typeof window === 'undefined') return 'dashboard'
  return pathToScreen(window.location.pathname) ?? 'dashboard'
}

export function replaceInvalidAdminPath(): void {
  if (typeof window === 'undefined') return
  if (pathToScreen(window.location.pathname)) return
  window.history.replaceState(null, '', screenToPath('dashboard'))
}

export function pushAdminScreen(screen: Screen): void {
  if (typeof window === 'undefined') return
  const nextPath = screenToPath(screen)
  if (window.location.pathname === nextPath) return
  window.history.pushState(null, '', nextPath)
}

export function replaceAdminScreen(screen: Screen): void {
  if (typeof window === 'undefined') return
  const nextPath = screenToPath(screen)
  if (window.location.pathname === nextPath) return
  window.history.replaceState(null, '', nextPath)
}
