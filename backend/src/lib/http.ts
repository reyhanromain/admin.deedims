/** Error dengan status + kode untuk envelope response yang konsisten. */
export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, message: string, code = 'ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface Envelope<T> {
  data: T | null
  meta: Record<string, unknown> | null
  error: { message: string; code: string } | null
}

/** Bungkus payload sukses: { data, meta, error:null }. */
export function ok<T>(data: T, meta: Record<string, unknown> | null = null): Envelope<T> {
  return { data, meta, error: null }
}

/** Metadata pagination untuk `meta` (opsional `extra`, mis. counts). */
export function pageMeta(total: number, page: number, limit: number, extra?: Record<string, unknown>) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), ...(extra ?? {}) }
}
