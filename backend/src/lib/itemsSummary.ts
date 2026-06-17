/** Ringkasan item order untuk tampilan list: "Dimsum Mix Isi 6 x2, Saus Sambal Extra x1". */
export function itemsSummary(items: { menuNameSnapshot: string; quantity: number }[]): string {
  return items.map((it) => `${it.menuNameSnapshot} x${it.quantity}`).join(', ')
}
