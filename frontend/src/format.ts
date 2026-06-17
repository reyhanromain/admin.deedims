export function fmt(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function fmtDate(iso: string): string {
  if (!iso) return 'TBD'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
