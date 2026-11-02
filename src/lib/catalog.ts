export type CatalogTemplateKey =
  | "engine_oil"
  | "filter"
  | "transmission_oil"
  | "timing"
  | "brake_pads"
  | "fluid"
  | "generic"

export type CatalogCategory = {
  name: string
  slug: string
  templateKey: CatalogTemplateKey
  sortOrder: number
}

/** Начальный справочник работ. Новые категории добавляются в базе, без правки этого списка. */
export const initialServiceCatalog: CatalogCategory[] = [
  { name: "Замена моторного масла", slug: "engine-oil", templateKey: "engine_oil", sortOrder: 10 },
  { name: "Замена масляного фильтра", slug: "oil-filter", templateKey: "filter", sortOrder: 20 },
  { name: "Замена воздушного фильтра", slug: "air-filter", templateKey: "filter", sortOrder: 30 },
  { name: "Замена салонного фильтра", slug: "cabin-filter", templateKey: "filter", sortOrder: 40 },
  { name: "Замена топливного фильтра", slug: "fuel-filter", templateKey: "filter", sortOrder: 50 },
  { name: "Замена масла в АКПП", slug: "atf", templateKey: "transmission_oil", sortOrder: 60 },
  { name: "Замена масла в МКПП", slug: "mtf", templateKey: "transmission_oil", sortOrder: 70 },
  { name: "Замена фильтра трансмиссии", slug: "transmission-filter", templateKey: "filter", sortOrder: 80 },
  { name: "Замена ремня ГРМ", slug: "timing-belt", templateKey: "timing", sortOrder: 90 },
  { name: "Замена роликов ГРМ", slug: "timing-rollers", templateKey: "timing", sortOrder: 100 },
  { name: "Замена передних тормозных колодок", slug: "brake-pads-front", templateKey: "brake_pads", sortOrder: 110 },
  { name: "Замена задних тормозных колодок", slug: "brake-pads-rear", templateKey: "brake_pads", sortOrder: 120 },
  { name: "Замена барабанных тормозных колодок", slug: "brake-shoes", templateKey: "brake_pads", sortOrder: 130 },
  { name: "Замена тормозной жидкости", slug: "brake-fluid", templateKey: "fluid", sortOrder: 140 },
  { name: "Замена охлаждающей жидкости", slug: "coolant", templateKey: "fluid", sortOrder: 150 },
  { name: "Замена жидкости ГУР", slug: "power-steering-fluid", templateKey: "fluid", sortOrder: 160 },
]

export const fuelTypes = [
  { value: "petrol", label: "Бензин" },
  { value: "diesel", label: "Дизель" },
  { value: "hybrid", label: "Гибрид" },
  { value: "electric", label: "Электро" },
  { value: "gas", label: "Газ" },
  { value: "unknown", label: "Не указано" },
] as const

export const transmissionTypes = [
  { value: "manual", label: "МКПП" },
  { value: "automatic", label: "АКПП" },
  { value: "cvt", label: "Вариатор" },
  { value: "robot", label: "Робот" },
  { value: "unknown", label: "Не указано" },
] as const

export type FuelType = (typeof fuelTypes)[number]["value"]
export type TransmissionType = (typeof transmissionTypes)[number]["value"]

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((item) => item.value === value)?.label ?? "Не указано"
}
