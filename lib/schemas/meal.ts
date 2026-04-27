import { z } from "zod";

const MEAL_TYPES = [
  "carne_roja",
  "chancho",
  "pollo",
  "pescado",
  "pasta",
  "arroz",
  "sopa",
  "otro",
] as const;

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  quantity: z.string().trim().default(""),
});

export const mealFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  type: z.enum(MEAL_TYPES),
  isBreakfast: z.boolean().default(false),
  ingredients: z.array(ingredientSchema).default([]),
  description: z.string().max(400).optional().or(z.literal("")),
  instructions: z.string().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().optional(),
  imageKey: z.string().optional(),
});

export type MealFormInput = z.input<typeof mealFormSchema>;
export type MealFormOutput = z.output<typeof mealFormSchema>;
