"use client"

import { useActionState } from "react"
import { cancelService, createCustomer, deleteDraft, saveCategory, saveInterval, saveSettings, saveVehicle, updateCustomer, uploadAttachment, uploadVehicleImage } from "@/lib/actions/workshop"
import { controlClass, fieldError, Field } from "@/components/ui-extra/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fuelTypes, transmissionTypes } from "@/lib/catalog"
import type { WorkshopInfo } from "@/lib/config"
import type { ActionResult } from "@/lib/errors"
import { templateOptions } from "@/lib/service-templates"
import type { Profile, ServiceCategory, Vehicle } from "@/lib/types"

const initial: ActionResult = { ok: true }

export function InviteForm() {
  const [state, action, pending] = useActionState(createCustomer, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <h2 className="font-display text-xl">Новый клиент</h2>
      <p className="text-sm text-muted-foreground">
        Клиент не регистрируется сам. Пароль не создаётся для входа и никому не показывается. Ссылку на книжку выдайте в карточке.
      </p>
      <Message state={state} />
      <Field label="Имя" htmlFor="firstName" error={fieldError(state.fieldErrors, "firstName")}>
        <Input id="firstName" name="firstName" required />
      </Field>
      <Field label="Фамилия" htmlFor="lastName" error={fieldError(state.fieldErrors, "lastName")}>
        <Input id="lastName" name="lastName" required />
      </Field>
      <Field label="Телефон" htmlFor="phone" error={fieldError(state.fieldErrors, "phone")}>
        <Input id="phone" name="phone" required />
      </Field>
      <Field label="Почта" htmlFor="email" error={fieldError(state.fieldErrors, "email")}>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Добавить клиента"}</Button>
    </form>
  )
}

export function CancelRecordForm({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(cancelService, initial)
  return (
    <form
      action={action}
      className="grid gap-3 rounded-3xl bg-white p-5"
      onSubmit={(event) => {
        if (!confirm("Отменить эту запись обслуживания? Она останется в истории со статусом «отменена».")) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={recordId} />
      <h2 className="font-medium">Отменить запись</h2>
      <Message state={state} />
      <Textarea name="reason" placeholder="Причина отмены" required />
      {fieldError(state.fieldErrors, "reason") ? (
        <p className="text-sm text-destructive">{fieldError(state.fieldErrors, "reason")}</p>
      ) : null}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Отменяем…" : "Отменить обслуживание"}
      </Button>
    </form>
  )
}

export function DeleteDraftForm({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(deleteDraft, initial)
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("Удалить черновик? Это действие нельзя отменить.")) event.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={recordId} />
      <Message state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Удаляем…" : "Удалить черновик"}
      </Button>
    </form>
  )
}

function Message({ state }: { state: ActionResult }) {
  if (!state.message) return null
  return <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p>
}

export function VehicleForm({ vehicle, ownerId }: { vehicle?: Vehicle; ownerId?: string }) {
  const [state, action, pending] = useActionState(saveVehicle, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <input type="hidden" name="id" value={vehicle?.id ?? ""} />
      <Message state={state} />
      <Field label="ID владельца" htmlFor="ownerId" hint="Его можно скопировать из карточки клиента." error={fieldError(state.fieldErrors, "ownerId")}>
        <Input id="ownerId" name="ownerId" defaultValue={vehicle?.ownerId ?? ownerId ?? ""} required />
      </Field>
      <Field label="Марка" htmlFor="make" error={fieldError(state.fieldErrors, "make")}>
        <Input id="make" name="make" defaultValue={vehicle?.make ?? ""} required />
      </Field>
      <Field label="Модель" htmlFor="model" error={fieldError(state.fieldErrors, "model")}>
        <Input id="model" name="model" defaultValue={vehicle?.model ?? ""} required />
      </Field>
      <Field label="Год" htmlFor="year">
        <Input id="year" name="year" defaultValue={vehicle?.year ?? ""} inputMode="numeric" />
      </Field>
      <Field label="VIN" htmlFor="vin" hint="Необязательно">
        <Input id="vin" name="vin" defaultValue={vehicle?.vin ?? ""} />
      </Field>
      <Field label="Госномер" htmlFor="licensePlate" hint="Необязательно">
        <Input id="licensePlate" name="licensePlate" defaultValue={vehicle?.licensePlate ?? ""} />
      </Field>
      <Field label="Двигатель" htmlFor="engineInfo">
        <Input id="engineInfo" name="engineInfo" defaultValue={vehicle?.engineInfo ?? ""} />
      </Field>
      <Field label="Топливо" htmlFor="fuelType">
        <select id="fuelType" name="fuelType" className={controlClass} defaultValue={vehicle?.fuelType ?? "unknown"}>
          {fuelTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Трансмиссия" htmlFor="transmissionType">
        <select id="transmissionType" name="transmissionType" className={controlClass} defaultValue={vehicle?.transmissionType ?? "unknown"}>
          {transmissionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Пробег" htmlFor="currentMileage" error={fieldError(state.fieldErrors, "currentMileage")}>
        <Input id="currentMileage" name="currentMileage" defaultValue={vehicle?.currentMileage ?? 0} inputMode="numeric" required />
      </Field>
      <Field label="Комментарий" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={vehicle?.notes ?? ""} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить автомобиль"}</Button>
    </form>
  )
}

export function VehicleImageForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(uploadVehicleImage, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="Фотография" htmlFor="file">
        <Input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" />
      </Field>
      <Message state={state} />
      <Button type="submit" disabled={pending}>Загрузить фото</Button>
    </form>
  )
}

export function AttachmentForm({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(uploadAttachment, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <input type="hidden" name="recordId" value={recordId} />
      <Field label="Фото или документ к заказ-наряду" htmlFor="attachment">
        <Input id="attachment" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
      </Field>
      <Message state={state} />
      <Button type="submit" disabled={pending}>Прикрепить</Button>
    </form>
  )
}

export function CategoryForm({ category }: { category?: ServiceCategory }) {
  const [state, action, pending] = useActionState(saveCategory, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <Field label="Название" htmlFor="name">
        <Input id="name" name="name" defaultValue={category?.name ?? ""} required />
      </Field>
      <Field label="Описание" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={category?.description ?? ""} />
      </Field>
      <Field label="Шаблон дополнительных полей" htmlFor="templateKey">
        <select id="templateKey" name="templateKey" className={controlClass} defaultValue={category?.templateKey ?? "generic"}>
          {templateOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={category?.isActive ?? true} />
        Категория активна
      </label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{category ? "Сохранить" : "Добавить категорию"}</Button>
    </form>
  )
}

export function CustomerEditForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateCustomer, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <input type="hidden" name="id" value={profile.id} />
      <Field label="Имя" htmlFor="customer-first">
        <Input id="customer-first" name="firstName" defaultValue={profile.firstName} />
      </Field>
      <Field label="Фамилия" htmlFor="customer-last">
        <Input id="customer-last" name="lastName" defaultValue={profile.lastName} />
      </Field>
      <Field label="Телефон" htmlFor="customer-phone">
        <Input id="customer-phone" name="phone" defaultValue={profile.phone ?? ""} />
      </Field>
      <p className="text-xs text-muted-foreground">Почта: {profile.email || "не указана"}. Роль и пароль здесь не меняются.</p>
      <Message state={state} />
      <Button type="submit" disabled={pending}>Сохранить клиента</Button>
    </form>
  )
}

export function IntervalForm({ vehicleId, categories }: { vehicleId: string; categories: ServiceCategory[] }) {
  const [state, action, pending] = useActionState(saveInterval, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <h2 className="font-medium">Интервал только для этого автомобиля</h2>
      <select name="categoryId" className={controlClass} defaultValue="">
        <option value="">Без категории</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
      <Input name="nextMileage" inputMode="numeric" placeholder="Следующий пробег, км" />
      <Input name="nextDate" type="date" />
      <Input name="note" placeholder="Комментарий" />
      <Message state={state} />
      <Button type="submit" disabled={pending}>Назначить интервал</Button>
    </form>
  )
}

export function SettingsForm({ info }: { info: WorkshopInfo }) {
  const [state, action, pending] = useActionState(saveSettings, initial)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <Field label="Телефон" htmlFor="phoneDisplay">
        <Input id="phoneDisplay" name="phoneDisplay" defaultValue={info.phoneDisplay} />
      </Field>
      <Field label="Ссылка вызова" htmlFor="phoneHref" hint="Формат tel:+79897680707">
        <Input id="phoneHref" name="phoneHref" defaultValue={info.phoneHref} />
      </Field>
      <Field label="Адрес" htmlFor="address">
        <Input id="address" name="address" defaultValue={info.address} />
      </Field>
      <Field label="Ссылка маршрута" htmlFor="mapUrl">
        <Input id="mapUrl" name="mapUrl" defaultValue={info.mapUrl} />
      </Field>
      <Field label="Описание" htmlFor="about">
        <Textarea id="about" name="about" defaultValue={info.about} />
      </Field>
      <Message state={state} />
      <Button type="submit" disabled={pending}>Сохранить настройки</Button>
    </form>
  )
}
