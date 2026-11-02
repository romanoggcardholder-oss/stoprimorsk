import { createHash, randomBytes } from "node:crypto"

const tokenPattern = /^[A-Za-z0-9_-]{43}$/

export function createBookToken() {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashBookToken(token) }
}

export function hashBookToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function isBookToken(value: string) {
  return tokenPattern.test(value)
}
