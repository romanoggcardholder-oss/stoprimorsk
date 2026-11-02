"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { saveService, searchCustomers, vehiclesOfCustomer } from "@/lib/actions/workshop"
import { controlClass, fieldError, Field, invalidClass } from "@/components/ui-extra/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { zodFieldErrors, type FieldErrors } from "@/lib/errors"
import { formatKopecks } from "@/lib/money"
import { serviceIssueLines } from "@/lib/service-issues"
import { estimateTotals, toServiceDraft, type ServiceFormValues } from "@/lib/service-payload"
import { templateFor } from "@/lib/service-templates"
import { serviceDraftSchema, servicePublishSchema } from "@/lib/validations/domain"
import type { ServiceCategory } from "@/lib/types"

const emptyItem = () => ({
  clientKey: crypto.randomUUID(),
  categoryId: "",
  serviceName: "",
  description: "",
  laborPrice: "",
  isCompleted: true,
  technicalDetails: {} as Record<string, string>,
})

export function ServiceForm({
  categories,
  initial,
  status,
  vehicleLabel,
  lastMileage,
}: {
  categories: ServiceCategory[]
  initial: ServiceFormValues
  status: "draft" | "published" | "cancelled" | "new"
  vehicleLabel?: string
  lastMileage?: number | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [people, setPeople] = useState<Awaited<ReturnType<typeof searchCustomers>>>([])
  const [vehicles, setVehicles] = useState<Awaited<ReturnType<typeof vehiclesOfCustomer>>>([])
  const [query, setQuery] = useState("")
  const form = useForm<ServiceFormValues>({ defaultValues: initial })
  const items = useFieldArray({ control: form.control, name: "items" })
  const parts = useFieldArray({ control: form.control, name: "parts" })
  const values = form.watch()
  const totals = estimateTotals(values)
  const locked = status === "cancelled" || status === "published"
  const draftParts = toServiceDraft(values).parts
  const issueLines = serviceIssueLines(fieldErrors, { items: values.items, parts: draftParts })

  function partFieldError(clientKey: string, field: string) {
    const index = draftParts.findIndex((part) => part.clientKey === clientKey)
    if (index < 0) return undefined
    return fieldError(fieldErrors, `parts.${index}.${field}`)
  }

  useEffect(() => {
    if (query.trim().length < 2) return
    const timeout = window.setTimeout(() => {
      searchCustomers(query).then(setPeople).catch(() => setPeople([]))
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return
    document.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  }, [fieldErrors])

  function chooseCustomer(id: string) {
    form.setValue("customerId", id)
    form.setValue("vehicleId", "")
    vehiclesOfCustomer(id).then(setVehicles).catch(() => setVehicles([]))
  }

  function submit(intent: "draft" | "preview" | "publish") {
    const current = form.getValues()
    const parsed = (intent === "publish" ? servicePublishSchema : serviceDraftSchema).safeParse(toServiceDraft(current))
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      setMessage("Проверьте заполнение формы")
      return
    }
    setMessage(null)
    setFieldErrors(undefined)
    startTransition(async () => {
      const result = await saveService(current, intent)
      if (!result.ok || !result.id) {
        setFieldErrors(result.fieldErrors)
        setMessage(result.message ?? "Проверьте форму")
        return
      }
      toast.success(result.message ?? "Сохранено")
      if (intent === "preview") router.push(`/admin/services/${result.id}/preview`)
      else if (intent === "publish") router.push(`/admin/services/${result.id}`)
      else router.replace(`/admin/services/${result.id}`)
      router.refresh()
    })
  }

  return (
    <form className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
      <section
        className={`rounded-3xl bg-white p-5 ${fieldError(fieldErrors, "customerId") || fieldError(fieldErrors, "vehicleId") ? "ring-2 ring-destructive" : ""}`}
        data-invalid={fieldError(fieldErrors, "customerId") || fieldError(fieldErrors, "vehicleId") ? true : undefined}
      >
        <h2 className="font-display text-xl">1. Клиент и автомобиль</h2>
        {vehicleLabel ? <p className="mt-2 text-sm">{vehicleLabel}</p> : null}
        {lastMileage != null ? <p className="text-sm text-muted-foreground">Последний пробег: {lastMileage.toLocaleString("ru-RU")} км</p> : null}
        {status === "new" || status === "draft" ? (
          <div className="mt-3 grid gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск клиента: имя, телефон, почта"
              aria-invalid={fieldError(fieldErrors, "customerId") ? true : undefined}
              className={invalidClass(fieldError(fieldErrors, "customerId"))}
            />
            <div className="flex flex-wrap gap-2">
              {people.map((person) => (
                <Button key={person.id} type="button" variant="outline" onClick={() => chooseCustomer(person.id)}>
                  {person.name}
                </Button>
              ))}
            </div>
            {vehicles.length > 0 ? (
              <select
                className={`${controlClass} ${invalidClass(fieldError(fieldErrors, "vehicleId")) ?? ""}`}
                aria-invalid={fieldError(fieldErrors, "vehicleId") ? true : undefined}
                value={values.vehicleId}
                onChange={(event) => form.setValue("vehicleId", event.target.value)}
              >
                <option value="">Выберите автомобиль</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.license_plate ?? ""} · {vehicle.current_mileage} км
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex flex-wrap gap-2 text-sm">
              <Link className="underline" href="/admin/customers">Добавить клиента</Link>
              <Link className="underline" href="/admin/vehicles">Добавить автомобиль</Link>
            </div>
            {fieldError(fieldErrors, "customerId") ? <p className="text-sm text-destructive">{fieldError(fieldErrors, "customerId")}</p> : null}
            {fieldError(fieldErrors, "vehicleId") ? <p className="text-sm text-destructive">{fieldError(fieldErrors, "vehicleId")}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-3xl bg-white p-5">
        <h2 className="font-display text-xl">2. Основные данные</h2>
        <Field label="Дата и время" htmlFor="serviceDate" error={fieldError(fieldErrors, "serviceDate")}>
          <Input id="serviceDate" type="datetime-local" {...form.register("serviceDate")} />
        </Field>
        <Field label="Пробег, км" htmlFor="mileage" error={fieldError(fieldErrors, "mileage")}>
          <Input id="mileage" inputMode="numeric" {...form.register("mileage")} />
        </Field>
        <Field label="Номер заказ-наряда" htmlFor="workOrderNumber" error={fieldError(fieldErrors, "workOrderNumber")}>
          <Input id="workOrderNumber" {...form.register("workOrderNumber")} />
        </Field>
        <Field label="Мастер" htmlFor="performedBy" error={fieldError(fieldErrors, "performedBy")}>
          <Input id="performedBy" {...form.register("performedBy")} />
        </Field>
        <Field label="Комментарий" htmlFor="generalComment" error={fieldError(fieldErrors, "generalComment")}>
          <Textarea id="generalComment" {...form.register("generalComment")} />
        </Field>
      </section>

      <section
        className={`grid gap-4 ${fieldError(fieldErrors, "items") ? "rounded-3xl p-3 ring-2 ring-destructive" : ""}`}
        data-invalid={fieldError(fieldErrors, "items") ? true : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">3. Выполненные работы</h2>
          <Button type="button" variant="outline" aria-invalid={fieldError(fieldErrors, "items") ? true : undefined} className={invalidClass(fieldError(fieldErrors, "items"))} onClick={() => items.append(emptyItem())}>Добавить работу</Button>
        </div>
        {fieldError(fieldErrors, "items") ? <p className="text-sm text-destructive">{fieldError(fieldErrors, "items")}</p> : null}
        {items.fields.map((field, index) => {
          const category = categories.find((item) => item.id === form.watch(`items.${index}.categoryId`))
          const template = templateFor(category?.templateKey)
          return (
            <article
              key={field.id}
              className={`grid gap-3 rounded-3xl bg-white p-5 ${Object.keys(fieldErrors ?? {}).some((key) => key.startsWith(`items.${index}.`)) ? "ring-2 ring-destructive" : ""}`}
              data-invalid={Object.keys(fieldErrors ?? {}).some((key) => key.startsWith(`items.${index}.`)) ? true : undefined}
            >
              <Field label="Категория" htmlFor={`category-${field.id}`} error={fieldError(fieldErrors, `items.${index}.categoryId`)}>
                <select
                  id={`category-${field.id}`}
                  className={controlClass}
                  value={form.watch(`items.${index}.categoryId`)}
                  onChange={(event) => {
                    const next = categories.find((item) => item.id === event.target.value)
                    form.setValue(`items.${index}.categoryId`, event.target.value)
                    if (next && !form.getValues(`items.${index}.serviceName`)) {
                      form.setValue(`items.${index}.serviceName`, next.name)
                    }
                  }}
                >
                  <option value="">Без категории</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Наименование" htmlFor={`name-${field.id}`} error={fieldError(fieldErrors, `items.${index}.serviceName`)}>
                <Input id={`name-${field.id}`} {...form.register(`items.${index}.serviceName`)} />
              </Field>
              <Field label="Комментарий" htmlFor={`desc-${field.id}`} error={fieldError(fieldErrors, `items.${index}.description`)}>
                <Textarea id={`desc-${field.id}`} {...form.register(`items.${index}.description`)} />
              </Field>
              <Field label="Стоимость работы, ₽" htmlFor={`labor-${field.id}`} error={fieldError(fieldErrors, `items.${index}.laborPrice`)}>
                <Input id={`labor-${field.id}`} inputMode="decimal" {...form.register(`items.${index}.laborPrice`)} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.watch(`items.${index}.isCompleted`)} onChange={(event) => form.setValue(`items.${index}.isCompleted`, event.target.checked)} />
                Работа выполнена
              </label>
              {template.fields.map((extra) => (
                <Field
                  key={extra.key}
                  label={extra.label}
                  htmlFor={`${field.id}-${extra.key}`}
                  hint={extra.key === "material_cost" ? "Необязательно. Попадёт в материалы один раз." : "Можно оставить пустым"}
                  error={
                    extra.key === "material_cost"
                      ? partFieldError(`material-${values.items[index]?.clientKey ?? ""}`, "unitPrice")
                      : extra.key === "quantity"
                        ? partFieldError(`material-${values.items[index]?.clientKey ?? ""}`, "quantity")
                        : undefined
                  }
                >
                  {extra.input === "select" ? (
                    <select
                      id={`${field.id}-${extra.key}`}
                      className={controlClass}
                      value={form.watch(`items.${index}.technicalDetails.${extra.key}`) ?? ""}
                      onChange={(event) => form.setValue(`items.${index}.technicalDetails.${extra.key}`, event.target.value)}
                    >
                      <option value="">Не указано</option>
                      {extra.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`${field.id}-${extra.key}`}
                      placeholder={extra.placeholder}
                      value={form.watch(`items.${index}.technicalDetails.${extra.key}`) ?? ""}
                      onChange={(event) => form.setValue(`items.${index}.technicalDetails.${extra.key}`, event.target.value)}
                    />
                  )}
                </Field>
              ))}
              <Button type="button" variant="outline" onClick={() => items.remove(index)}>Убрать работу</Button>
            </article>
          )
        })}
      </section>

      <section className="grid gap-3 rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">4. Дополнительные запчасти</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              parts.append({
                clientKey: crypto.randomUUID(),
                itemClientKey: "",
                name: "",
                manufacturer: "",
                articleNumber: "",
                quantity: "1",
                unit: "шт.",
                unitPrice: "",
              })
            }
          >
            Добавить
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Материалы из карточки работы добавляются сами. Здесь — то, чего нет в справочнике.</p>
        {parts.fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 border-t pt-3 sm:grid-cols-2">
            <Input placeholder="Наименование" aria-invalid={partFieldError(values.parts[index]?.clientKey ?? "", "name") ? true : undefined} className={invalidClass(partFieldError(values.parts[index]?.clientKey ?? "", "name"))} {...form.register(`parts.${index}.name`)} />
            <Input placeholder="Производитель" aria-invalid={partFieldError(values.parts[index]?.clientKey ?? "", "manufacturer") ? true : undefined} className={invalidClass(partFieldError(values.parts[index]?.clientKey ?? "", "manufacturer"))} {...form.register(`parts.${index}.manufacturer`)} />
            <Input placeholder="Артикул" aria-invalid={partFieldError(values.parts[index]?.clientKey ?? "", "articleNumber") ? true : undefined} className={invalidClass(partFieldError(values.parts[index]?.clientKey ?? "", "articleNumber"))} {...form.register(`parts.${index}.articleNumber`)} />
            <Input placeholder="Количество" aria-invalid={partFieldError(values.parts[index]?.clientKey ?? "", "quantity") ? true : undefined} className={invalidClass(partFieldError(values.parts[index]?.clientKey ?? "", "quantity"))} {...form.register(`parts.${index}.quantity`)} />
            <Input placeholder="Ед." aria-invalid={partFieldError(values.parts[index]?.clientKey ?? "", "unit") ? true : undefined} className={invalidClass(partFieldError(values.parts[index]?.clientKey ?? "", "unit"))} {...form.register(`parts.${index}.unit`)} />
            <Input placeholder="Цена за единицу" aria-invalid={partFieldError(values.parts[index]?.clientKey ?? "", "unitPrice") ? true : undefined} className={invalidClass(partFieldError(values.parts[index]?.clientKey ?? "", "unitPrice"))} {...form.register(`parts.${index}.unitPrice`)} />
            {["name", "quantity", "unit", "unitPrice"].map((key) => {
              const error = partFieldError(values.parts[index]?.clientKey ?? "", key)
              return error ? <p key={key} className="text-sm text-destructive sm:col-span-2">{error}</p> : null
            })}
            <Button type="button" variant="outline" onClick={() => parts.remove(index)}>Убрать</Button>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-secondary p-5">
        <h2 className="font-display text-xl">5. Итог</h2>
        <p className="mt-3 flex justify-between">Работы <span>{formatKopecks(totals.labor)}</span></p>
        <p className="flex justify-between">Материалы <span>{formatKopecks(totals.parts)}</span></p>
        <p className="flex justify-between font-display text-2xl">Итого <span>{formatKopecks(totals.grand)}</span></p>
        {totals.invalid ? <p className="mt-2 text-sm text-destructive">Проверьте количества и цены: отрицательные и некорректные значения не сохранятся.</p> : null}
      </section>

      <section className="grid gap-3 rounded-3xl bg-white p-5">
        <h2 className="font-display text-xl">6. Рекомендации</h2>
        <Field label="Следующий пробег, км" htmlFor="nextMileage" hint="Пустое поле не создаёт дату обслуживания." error={fieldError(fieldErrors, "nextServiceMileage")}>
          <Input id="nextMileage" inputMode="numeric" {...form.register("nextServiceMileage")} />
        </Field>
        <Field label="Следующая дата" htmlFor="nextDate" error={fieldError(fieldErrors, "nextServiceDate")}>
          <Input id="nextDate" type="date" {...form.register("nextServiceDate")} />
        </Field>
        <Field label="Рекомендации мастера" htmlFor="recommendations" error={fieldError(fieldErrors, "masterRecommendations")}>
          <Textarea id="recommendations" {...form.register("masterRecommendations")} />
        </Field>
      </section>

      {issueLines.length > 0 ? (
        <div className="rounded-2xl border border-destructive/40 bg-white p-4 text-sm text-destructive" role="alert">
          <p className="font-medium">Проверьте заполнение формы</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {issueLines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : message ? (
        <p className="text-sm text-destructive" role="alert">{message}</p>
      ) : null}
      {status === "cancelled" ? <p className="text-sm text-destructive">Отменённую запись изменить нельзя.</p> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" disabled={pending || locked && status === "cancelled"} onClick={() => submit("draft")}>
          {pending ? "Сохраняем…" : status === "published" ? "Сохранить изменения" : "Сохранить черновик"}
        </Button>
        <Button type="button" variant="outline" disabled={pending || status === "cancelled"} onClick={() => submit("preview")}>
          Предпросмотр для клиента
        </Button>
        {status !== "published" && status !== "cancelled" ? (
          <Button type="button" disabled={pending} onClick={() => submit("publish")}>
            Опубликовать в сервисной книжке
          </Button>
        ) : null}
      </div>
    </form>
  )
}
