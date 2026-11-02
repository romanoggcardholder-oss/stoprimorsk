import { workshopConfig } from "@/lib/config"

export type ReminderLevel = "upcoming" | "due"

export type ServiceReminder = {
  id: string
  title: string
  level: ReminderLevel
  message: string
}

export type ReminderInput = {
  id: string
  title: string
  currentMileage: number | null
  nextMileage: number | null
  nextDate: string | null
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Напоминание появляется только если администратор явно указал
 * следующий пробег или дату. Интервал не вычисляется автоматически.
 */
export function buildReminders(
  inputs: ReminderInput[],
  today: Date,
  thresholds: { mileageKm: number; days: number } = {
    mileageKm: workshopConfig.reminderMileageKm,
    days: workshopConfig.reminderDays,
  },
): ServiceReminder[] {
  const reminders: ServiceReminder[] = []
  const currentDay = startOfDay(today)

  for (const input of inputs) {
    if (input.nextMileage == null && !input.nextDate) continue

    if (input.nextMileage != null && input.currentMileage != null) {
      const delta = input.nextMileage - input.currentMileage
      if (delta <= thresholds.mileageKm) {
        reminders.push({
          id: `${input.id}:mileage`,
          title: input.title,
          level: delta < 0 ? "due" : "upcoming",
          message:
            delta < 0
              ? `Пробег уже больше назначенных ${input.nextMileage.toLocaleString("ru-RU")} км`
              : `До обслуживания по пробегу осталось ${delta.toLocaleString("ru-RU")} км`,
        })
      }
    }

    if (input.nextDate) {
      const target = parseDateOnly(input.nextDate)
      if (!target) continue
      const dayDelta = Math.round((startOfDay(target).getTime() - currentDay.getTime()) / 86_400_000)
      if (dayDelta <= thresholds.days) {
        reminders.push({
          id: `${input.id}:date`,
          title: input.title,
          level: dayDelta < 0 ? "due" : "upcoming",
          message:
            dayDelta < 0
              ? "Назначенная дата обслуживания уже прошла"
              : dayDelta === 0
                ? "Обслуживание назначено на сегодня"
                : `До назначенной даты осталось ${dayDelta} дн.`,
        })
      }
    }
  }

  return reminders
}
