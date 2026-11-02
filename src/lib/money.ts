/** Деньги хранятся и считаются в целых копейках, без двоичной плавающей точки. */

export function parseDecimalToInt(input: string, scale: number): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const [whole, fractionRaw = ""] = normalized.split(".")
  let fraction = fractionRaw
  if (fraction.length > scale) {
    if (!/^0+$/.test(fraction.slice(scale))) return null
    fraction = fraction.slice(0, scale)
  }
  const factor = 10 ** scale
  const value = Number(whole) * factor + Number(fraction.padEnd(scale, "0"))
  if (!Number.isSafeInteger(value)) return null
  return value
}

export function parseMoneyToKopecks(input: string): number | null {
  if (input.trim() === "") return null
  return parseDecimalToInt(input, 2)
}

export function kopecksToDb(kopecks: number): string {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) {
    throw new Error("Сумма должна быть неотрицательным целым числом копеек")
  }
  const rubles = Math.floor(kopecks / 100)
  const fraction = kopecks % 100
  return `${rubles}.${fraction.toString().padStart(2, "0")}`
}

export function dbAmountToKopecks(value: string | number): number {
  const text = typeof value === "number" ? value.toFixed(2) : value.trim()
  const parsed = parseDecimalToInt(text, 2)
  if (parsed == null) {
    throw new Error("Некорректная денежная сумма")
  }
  return parsed
}

export function formatKopecks(kopecks: number): string {
  const negative = kopecks < 0
  const absolute = Math.abs(kopecks)
  const rubles = Math.floor(absolute / 100)
  const fraction = absolute % 100
  const formatted = new Intl.NumberFormat("ru-RU").format(rubles)
  return `${negative ? "−" : ""}${formatted},${fraction.toString().padStart(2, "0")} ₽`
}

export function amountToInput(value: string | number | null | undefined): string {
  if (value == null || value === "") return ""
  const kopecks = dbAmountToKopecks(value)
  const rubles = Math.floor(kopecks / 100)
  const fraction = kopecks % 100
  return fraction === 0 ? String(rubles) : `${rubles},${fraction.toString().padStart(2, "0")}`
}

export function formatDbAmount(value: string | number | null | undefined): string {
  if (value == null || value === "") return formatKopecks(0)
  return formatKopecks(dbAmountToKopecks(value))
}

export function addKopecks(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
}

/** quantity — десятичная строка до 3 знаков, priceKopecks — цена за единицу. */
export function lineTotalKopecks(quantity: string, priceKopecks: number): number | null {
  const milli = parseDecimalToInt(quantity, 3)
  if (milli == null || milli <= 0 || priceKopecks < 0) return null
  return Math.round((milli * priceKopecks) / 1000)
}
