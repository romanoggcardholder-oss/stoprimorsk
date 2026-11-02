import type { FuelType, TransmissionType } from "@/lib/catalog"
import type { AppRole } from "@/lib/access"

export type Profile = {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  role: AppRole
  isDemo: boolean
  createdAt: string
}

export type Vehicle = {
  id: string
  ownerId: string
  make: string
  model: string
  year: number | null
  vin: string | null
  licensePlate: string | null
  engineInfo: string | null
  fuelType: FuelType
  transmissionType: TransmissionType
  currentMileage: number
  imagePath: string | null
  imageUrl: string | null
  notes: string | null
  isDemo: boolean
  createdAt: string
  ownerName?: string
  ownerPhone?: string | null
  ownerEmail?: string | null
}

export type ServiceCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  templateKey: string
  isActive: boolean
  sortOrder: number
}

export type PartView = {
  id: string
  itemId: string | null
  name: string
  manufacturer: string | null
  articleNumber: string | null
  quantity: string
  unit: string
  unitPrice: string
  totalPrice: string
}

export type ServiceItemView = {
  id: string
  categoryId: string | null
  categoryName: string | null
  templateKey: string | null
  serviceName: string
  description: string | null
  technicalDetails: Record<string, string>
  isCompleted: boolean
  totalPrice: string
}

export type AttachmentView = {
  id: string
  fileName: string
  contentType: string
  url: string | null
}

export type ServiceRecordView = {
  id: string
  vehicleId: string
  customerId: string
  serviceDate: string
  mileage: number
  workOrderNumber: string | null
  performedBy: string | null
  generalComment: string | null
  status: "draft" | "published" | "cancelled"
  laborTotal: string
  partsTotal: string
  grandTotal: string
  nextServiceMileage: number | null
  nextServiceDate: string | null
  masterRecommendations: string | null
  cancellationReason: string | null
  publishedAt: string | null
  isDemo: boolean
  vehicleLabel?: string
  licensePlate?: string | null
  customerName?: string
  items: ServiceItemView[]
  parts: PartView[]
  attachments: AttachmentView[]
}

export type VehicleNote = {
  id: string
  vehicleId: string
  userId: string | null
  title: string
  content: string
  status: "active" | "done"
  createdAt: string
  updatedAt: string
  vehicleLabel?: string
}

export type VehicleClaim = {
  id: string
  userId: string
  make: string
  model: string
  year: number | null
  vin: string | null
  licensePlate: string | null
  comment: string | null
  status: "pending" | "approved" | "rejected"
  createdAt: string
  userName?: string
}

export type ServiceInterval = {
  id: string
  vehicleId: string
  categoryId: string | null
  categoryName: string | null
  nextMileage: number | null
  nextDate: string | null
  note: string | null
}

export type PageResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}
