export type AppRole = "client" | "admin"

export function canReadVehicle(input: { role: AppRole; userId: string; ownerId: string }) {
  return input.role === "admin" || input.ownerId === input.userId
}

export function canReadServiceRecord(input: {
  role: AppRole
  userId: string
  status: "draft" | "published" | "cancelled"
  customerId: string
  ownerId: string
}) {
  if (input.role === "admin") return true
  return (
    input.status === "published" &&
    input.customerId === input.userId &&
    input.ownerId === input.userId
  )
}

export function canManageOfficialRecords(role: AppRole) {
  return role === "admin"
}

export function canManageOwnNote(input: { userId: string; noteUserId: string }) {
  return input.userId === input.noteUserId
}

export function roleHome(role: AppRole) {
  return role === "admin" ? "/admin" : "/client"
}
