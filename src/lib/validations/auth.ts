import { z } from "zod"

const passwordSchema = z
  .string()
  .min(8, { error: "Пароль должен быть не короче 8 символов" })
  .regex(/[A-Za-zА-Яа-я]/, { error: "Добавьте хотя бы одну букву" })
  .regex(/[0-9]/, { error: "Добавьте хотя бы одну цифру" })

export const loginSchema = z.object({
  email: z.email({ error: "Укажите корректную электронную почту" }),
  password: z.string().min(1, { error: "Введите пароль" }),
  next: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Укажите корректную электронную почту" }),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string().min(1, { error: "Повторите пароль" }),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    error: "Пароли не совпадают",
  })

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, { error: "Укажите имя" }).max(80),
  lastName: z.string().trim().min(2, { error: "Укажите фамилию" }).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{10,20}$/, { error: "Укажите телефон" }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ProfileInput = z.infer<typeof profileSchema>
