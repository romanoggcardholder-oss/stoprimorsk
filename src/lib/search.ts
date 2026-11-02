export function sanitizeSearch(value: string) {
  return value.replace(/[%_,.()"'\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)
}

export function safeNextPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback
  }
  return value
}

export function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

export function pageNumber(value: string | string[] | undefined) {
  const parsed = Number(readParam(value))
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}
