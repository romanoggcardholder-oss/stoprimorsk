import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"
import { cn } from "cn"
import { Label } from "@/components/ui/label"

export const controlClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive"

export const invalidControlClass = "border-destructive ring-2 ring-destructive"

export function invalidClass(error?: string) {
  return error ? invalidControlClass : undefined
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  const control = markInvalid(children, error)
  return (
    <div className="grid gap-1.5" data-invalid={error ? true : undefined}>
      <Label htmlFor={htmlFor} className={error ? "text-destructive" : undefined}>{label}</Label>
      {control}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-white px-5 py-10 text-center">
      <h2 className="font-display text-lg">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function fieldError(errors: Record<string, string[]> | undefined, key: string) {
  return errors?.[key]?.[0]
}

function markInvalid(children: ReactNode, error?: string) {
  if (!error || !isValidElement(children)) return children
  const child = children as ReactElement<{ className?: string; "aria-invalid"?: boolean }>
  return cloneElement(child, {
    "aria-invalid": true,
    className: cn(child.props.className, invalidControlClass),
  })
}
