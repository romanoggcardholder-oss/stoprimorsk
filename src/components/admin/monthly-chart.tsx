"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function MonthlyChart({ data }: { data: { month: string; count: number }[] }) {
  if (data.every((item) => item.count === 0)) {
    return <p className="text-sm text-muted-foreground">За последние месяцы обслуживаний ещё нет.</p>
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#E6E8EC" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#6B7280", fontSize: 12 }} width={32} />
          <Tooltip />
          <Bar dataKey="count" name="Обслуживания" fill="#FFC928" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
