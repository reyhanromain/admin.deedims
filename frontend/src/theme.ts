import type { OrderStatus, PayStatus, PoStatus, Screen } from './types'

/** Brand constants — used directly regardless of light/dark. */
export const BRAND = {
  terracotta: '#C8472B',
  terracottaDark: '#A93A22',
  bamboo: '#2E5A43',
  bambooDark: '#244836',
}

export const LOW_STOCK_THRESHOLD = 10

export interface Theme {
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  rowBorder: string
  ink: string
  muted: string
  faint: string
  inputBg: string
  inputBorder: string
  sideBg: string
  sideBorder: string
  sideInk: string
  sideMuted: string
  sideText: string
  toastBg: string
  toastColor: string
  scheme: 'light' | 'dark'
  shadow: string
  green: string
  warnBg: string
  warnColor: string
  dangerBg: string
  dangerBorder: string
  dangerInk: string
  dangerSub: string
  chipBg: string
  chipColor: string
  solidBg: string
  solidColor: string
  red: string
  itemBg: string
  itemBgAddon: string
  cancelRowBg: string
}

const LIGHT: Theme = {
  bg: '#F6EFE5', surface: '#FFFFFF', surfaceAlt: '#FDFAF5', border: '#EFE3D5', rowBorder: '#F5EDE2',
  ink: '#3B2A20', muted: '#8A7263', faint: '#A99681', inputBg: '#FDFAF5', inputBorder: '#E4D5C3',
  sideBg: '#2B1D12', sideBorder: 'rgba(246,239,229,0.12)', sideInk: '#F6EFE5', sideMuted: 'rgba(246,239,229,0.55)', sideText: 'rgba(246,239,229,0.78)',
  toastBg: '#2B1D12', toastColor: '#F6EFE5', scheme: 'light', shadow: '0 10px 30px rgba(43,29,18,0.18)',
  green: '#2E5A43', warnBg: '#FBF0DC', warnColor: '#9A6516',
  dangerBg: '#FBEAE4', dangerBorder: '#F0CDBF', dangerInk: '#B0421F', dangerSub: '#8A5240',
  chipBg: '#FBEAE4', chipColor: '#B0421F', solidBg: '#3B2A20', solidColor: '#FFFFFF',
  red: '#C8472B', itemBg: '#F8F2E9', itemBgAddon: '#FDFAF5', cancelRowBg: '#FDF3EF',
}

const DARK: Theme = {
  bg: '#191210', surface: '#251B16', surfaceAlt: '#2B201A', border: '#3A2C23', rowBorder: '#33271F',
  ink: '#F2E8DC', muted: '#B49E8C', faint: '#8C7A6B', inputBg: '#1E1611', inputBorder: '#4A392C',
  sideBg: '#120D0A', sideBorder: 'rgba(242,232,220,0.1)', sideInk: '#F2E8DC', sideMuted: 'rgba(242,232,220,0.5)', sideText: 'rgba(242,232,220,0.72)',
  toastBg: '#F2E8DC', toastColor: '#2B1D12', scheme: 'dark', shadow: '0 10px 30px rgba(0,0,0,0.55)',
  green: '#6FB389', warnBg: '#3E2F12', warnColor: '#E5B25C',
  dangerBg: '#3A1F16', dangerBorder: '#5A3326', dangerInk: '#E89070', dangerSub: '#C49A85',
  chipBg: '#43221A', chipColor: '#E89070', solidBg: '#5A4636', solidColor: '#F2E8DC',
  red: '#E06A4A', itemBg: '#2B201A', itemBgAddon: '#251B16', cancelRowBg: '#36211A',
}

export function getTheme(dark: boolean): Theme {
  return dark ? DARK : LIGHT
}

export interface Badge {
  label: string
  bg: string
  color: string
}

export function orderStatusBadge(dark: boolean): Record<OrderStatus, Badge> {
  return dark
    ? {
        submitted: { label: 'Menunggu konfirmasi', bg: '#3E2F12', color: '#E5B25C' },
        confirmed: { label: 'Dikonfirmasi', bg: '#173733', color: '#7CC4B8' },
        ready: { label: 'Siap', bg: '#43221A', color: '#E89070' },
        completed: { label: 'Selesai', bg: '#1E3326', color: '#8CC4A0' },
        cancelled: { label: 'Dibatalkan', bg: '#332B24', color: '#A8937F' },
      }
    : {
        submitted: { label: 'Menunggu konfirmasi', bg: '#FBF0DC', color: '#9A6516' },
        confirmed: { label: 'Dikonfirmasi', bg: '#E2F0EE', color: '#27695F' },
        ready: { label: 'Siap', bg: '#FBEAE4', color: '#B0421F' },
        completed: { label: 'Selesai', bg: '#E6F0E9', color: '#3E6B4D' },
        cancelled: { label: 'Dibatalkan', bg: '#EEE9E2', color: '#8A7263' },
      }
}

export function payBadge(dark: boolean): Record<PayStatus, { label: string; color: string }> {
  return dark
    ? {
        pending: { label: 'Belum dibayar', color: '#E5B25C' },
        paid: { label: 'Sudah dibayar', color: '#8CC4A0' },
        cancelled: { label: 'Dibatalkan', color: '#A8937F' },
      }
    : {
        pending: { label: 'Belum dibayar', color: '#9A6516' },
        paid: { label: 'Sudah dibayar', color: '#3E6B4D' },
        cancelled: { label: 'Dibatalkan', color: '#8A7263' },
      }
}

export function poStatusBadge(dark: boolean): Record<PoStatus, { bg: string; color: string }> {
  return {
    draft: dark ? { bg: '#332B24', color: '#A8937F' } : { bg: '#EEE9E2', color: '#8A7263' },
    open: dark ? { bg: '#1E3326', color: '#8CC4A0' } : { bg: '#E6F0E9', color: '#2E5A43' },
    closed: dark ? { bg: '#3E2F12', color: '#E5B25C' } : { bg: '#FBF0DC', color: '#9A6516' },
    completed: dark ? { bg: '#173733', color: '#7CC4B8' } : { bg: '#E2F0EE', color: '#27695F' },
    cancelled: dark ? { bg: '#43221A', color: '#E89070' } : { bg: '#FBEAE4', color: '#B0421F' },
  }
}

/** Neutral "inactive" pill background, shared by reminder/subscriber badges. */
export function inactiveBadge(dark: boolean): { bg: string; color: string } {
  return dark ? { bg: '#332B24', color: '#B49E8C' } : { bg: '#EEE9E2', color: '#8A7263' }
}

export const ICONS: Record<Screen, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  preorders: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  orders: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12',
  customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  menus: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  stock: 'M21 8v13H3V8 M1 3h22v5H1z M10 12h4',
  subscribers: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  botMessages: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z M8 9h8 M8 13h5',
  users: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  settings: 'M21 4h-7 M10 4H3 M21 12h-9 M8 12H3 M21 20h-5 M12 20H3 M14 2v4 M8 10v4 M16 18v4',
}

export const SCREEN_TITLES: Record<Screen, string> = {
  dashboard: 'Dashboard',
  preorders: 'Pre-order Batches',
  orders: 'Orders',
  customers: 'Customers',
  menus: 'Menus & Add-ons',
  stock: 'Stock Items',
  subscribers: 'Reminder Subscribers',
  botMessages: 'Bot Messages',
  users: 'Admin Users',
  settings: 'Bot Settings',
}

export const SCREEN_NAV: { id: Screen; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'preorders', label: 'Pre-orders' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'menus', label: 'Menus' },
  { id: 'stock', label: 'Stock' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'botMessages', label: 'Bot Messages' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
]
