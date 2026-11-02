import { Badge } from "@/components/ui/badge"
import { detailLabel, optionLabel } from "@/lib/service-templates"
import { formatDate, formatDateTime, formatMileage, formatMoney } from "@/lib/format"
import type { ServiceRecordView } from "@/lib/types"

const statusText = {
  draft: "Черновик",
  published: "Опубликовано",
  cancelled: "Отменено",
} as const

export function ServiceTimeline({
  records,
  preview = false,
}: {
  records: ServiceRecordView[]
  preview?: boolean
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white px-5 py-10 text-center">
        <h2 className="font-display text-lg">Записей пока нет</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Опубликованные обслуживания появятся здесь в хронологическом порядке.
        </p>
      </div>
    )
  }

  return (
    <ol className="relative grid gap-4 border-l-2 border-yellow pl-4">
      {records.map((record, index) => (
        <li key={record.id} className="relative">
          <span className="absolute top-5 -left-[23px] size-3 rounded-full border-2 border-yellow bg-white" />
          <details open={index === 0 || preview} className="rounded-2xl border bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{formatDateTime(record.serviceDate)}</p>
                  <p className="font-display text-2xl tracking-tight">{formatMileage(record.mileage)}</p>
                  <p className="mt-1 text-sm">
                    {record.items.map((item) => item.serviceName).join(" · ") || "Работы не указаны"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={record.status === "cancelled" ? "destructive" : "secondary"}>
                    {statusText[record.status]}
                  </Badge>
                  <p className="mt-2 font-display text-lg">{formatMoney(record.grandTotal)}</p>
                </div>
              </div>
            </summary>
            <div className="grid gap-4 border-t px-4 py-4 text-sm">
              {record.workOrderNumber ? <p>Заказ-наряд: {record.workOrderNumber}</p> : null}
              {record.performedBy ? <p>Мастер: {record.performedBy}</p> : null}
              {record.generalComment ? <p>{record.generalComment}</p> : null}
              <div className="grid gap-3">
                {record.items.map((item) => (
                  <article key={item.id} className="rounded-xl bg-muted/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.serviceName}</p>
                        {item.categoryName ? <p className="text-xs text-muted-foreground">{item.categoryName}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className={item.isCompleted ? "text-success" : "text-muted-foreground"}>
                          {item.isCompleted ? "Выполнено" : "Не выполнено"}
                        </p>
                        <p>{formatMoney(item.totalPrice)}</p>
                      </div>
                    </div>
                    {item.description ? <p className="mt-2">{item.description}</p> : null}
                    {Object.keys(item.technicalDetails).length > 0 ? (
                      <dl className="mt-2 grid gap-1">
                        {Object.entries(item.technicalDetails).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{detailLabel(key)}</dt>
                            <dd>{optionLabel(item.templateKey ?? "generic", key, value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </article>
                ))}
              </div>
              {record.parts.length > 0 ? (
                <div>
                  <h3 className="font-medium">Запчасти и материалы</h3>
                  <ul className="mt-2 grid gap-2">
                    {record.parts.map((part) => (
                      <li key={part.id} className="flex justify-between gap-3">
                        <span>
                          {part.name}
                          {part.manufacturer ? `, ${part.manufacturer}` : ""}
                          {part.articleNumber ? `, арт. ${part.articleNumber}` : ""}
                          <span className="block text-xs text-muted-foreground">
                            {part.quantity} {part.unit} × {formatMoney(part.unitPrice)}
                          </span>
                        </span>
                        <span>{formatMoney(part.totalPrice)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="grid gap-1 rounded-xl bg-secondary px-3 py-3">
                <div className="flex justify-between"><span>Работы</span><span>{formatMoney(record.laborTotal)}</span></div>
                <div className="flex justify-between"><span>Материалы</span><span>{formatMoney(record.partsTotal)}</span></div>
                <div className="flex justify-between font-semibold"><span>Итого</span><span>{formatMoney(record.grandTotal)}</span></div>
              </div>
              {record.masterRecommendations ? <p>Рекомендации мастера: {record.masterRecommendations}</p> : null}
              {record.nextServiceMileage || record.nextServiceDate ? (
                <p>
                  Следующее обслуживание:
                  {record.nextServiceMileage ? ` ${formatMileage(record.nextServiceMileage)}` : ""}
                  {record.nextServiceDate ? ` или ${formatDate(record.nextServiceDate)}` : ""}
                </p>
              ) : null}
              {record.cancellationReason ? <p className="text-destructive">Отмена: {record.cancellationReason}</p> : null}
              {record.attachments.length > 0 ? (
                <ul className="grid gap-2">
                  {record.attachments.map((file) => (
                    <li key={file.id}>
                      {file.url ? (
                        file.contentType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.url} alt={file.fileName} className="max-h-64 rounded-xl object-cover" />
                        ) : (
                          <a className="underline" href={file.url} target="_blank" rel="noreferrer">
                            {file.fileName}
                          </a>
                        )
                      ) : (
                        <span>{file.fileName}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        </li>
      ))}
    </ol>
  )
}
