import type { CatalogTemplateKey } from "@/lib/catalog"

export type TemplateField = {
  key: string
  label: string
  placeholder?: string
  input?: "text" | "select"
  options?: { value: string; label: string }[]
}

export type ServiceTemplate = {
  key: CatalogTemplateKey
  label: string
  fields: TemplateField[]
}

const materialCostNote = "Стоимость материала попадёт в список запчастей и в сумму материалов."

export const serviceTemplates: Record<CatalogTemplateKey, ServiceTemplate> = {
  engine_oil: {
    key: "engine_oil",
    label: "Моторное масло",
    fields: [
      { key: "manufacturer", label: "Производитель" },
      { key: "product_name", label: "Название или линейка" },
      { key: "viscosity", label: "Вязкость", placeholder: "5W-30" },
      { key: "approval", label: "Допуск производителя" },
      { key: "volume", label: "Объём", placeholder: "4,5 л" },
      { key: "article", label: "Артикул" },
      { key: "quantity", label: "Количество" },
      { key: "material_cost", label: "Стоимость материала", placeholder: materialCostNote },
    ],
  },
  filter: {
    key: "filter",
    label: "Фильтр",
    fields: [
      { key: "manufacturer", label: "Производитель" },
      { key: "product_name", label: "Название" },
      { key: "article", label: "Артикул" },
      { key: "quantity", label: "Количество" },
      { key: "material_cost", label: "Стоимость материала" },
    ],
  },
  transmission_oil: {
    key: "transmission_oil",
    label: "Трансмиссионное масло",
    fields: [
      {
        key: "transmission_type",
        label: "Тип трансмиссии",
        input: "select",
        options: [
          { value: "automatic", label: "АКПП" },
          { value: "manual", label: "МКПП" },
          { value: "cvt", label: "Вариатор" },
          { value: "robot", label: "Робот" },
        ],
      },
      { key: "manufacturer", label: "Производитель" },
      { key: "product_name", label: "Название" },
      { key: "specification", label: "Вязкость или спецификация" },
      { key: "volume", label: "Объём" },
      { key: "article", label: "Артикул" },
      { key: "material_cost", label: "Стоимость материала" },
    ],
  },
  timing: {
    key: "timing",
    label: "Ремень или ролики ГРМ",
    fields: [
      { key: "manufacturer", label: "Производитель" },
      { key: "product_name", label: "Наименование" },
      { key: "article", label: "Артикул" },
      { key: "quantity", label: "Количество" },
      { key: "material_cost", label: "Стоимость материала" },
    ],
  },
  brake_pads: {
    key: "brake_pads",
    label: "Тормозные колодки",
    fields: [
      {
        key: "axle",
        label: "Ось",
        input: "select",
        options: [
          { value: "front", label: "Передняя" },
          { value: "rear", label: "Задняя" },
        ],
      },
      { key: "pad_type", label: "Тип колодок" },
      { key: "manufacturer", label: "Производитель" },
      { key: "article", label: "Артикул" },
      { key: "quantity", label: "Количество комплектов" },
      { key: "material_cost", label: "Стоимость материала" },
    ],
  },
  fluid: {
    key: "fluid",
    label: "Техническая жидкость",
    fields: [
      { key: "manufacturer", label: "Производитель" },
      { key: "product_name", label: "Название" },
      { key: "specification", label: "Спецификация" },
      { key: "volume", label: "Объём" },
      { key: "article", label: "Артикул" },
      { key: "material_cost", label: "Стоимость материала" },
    ],
  },
  generic: {
    key: "generic",
    label: "Без дополнительных полей",
    fields: [],
  },
}

export const templateOptions = Object.values(serviceTemplates).map((template) => ({
  value: template.key,
  label: template.label,
}))

export function templateFor(key: string | null | undefined): ServiceTemplate {
  if (key && key in serviceTemplates) return serviceTemplates[key as CatalogTemplateKey]
  return serviceTemplates.generic
}

export function detailLabel(key: string) {
  for (const template of Object.values(serviceTemplates)) {
    const field = template.fields.find((item) => item.key === key)
    if (field) return field.label
  }
  return key
}

export function optionLabel(templateKey: string, fieldKey: string, value: string) {
  const field = templateFor(templateKey).fields.find((item) => item.key === fieldKey)
  return field?.options?.find((option) => option.value === value)?.label ?? value
}
