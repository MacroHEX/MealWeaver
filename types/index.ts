export type MealType =
  | "carne_roja"
  | "pollo"
  | "pescado"
  | "pasta"
  | "arroz"
  | "sopa"
  | "otro";

export type MealTime = "breakfast" | "lunch" | "dinner";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface UserPreferences {
  theme: "light" | "dark";
  restrictions: string[];
  mealsPerDay: 2 | 3;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meal {
  _id: string;
  userId: string;
  name: string;
  type: MealType;
  ingredients: Ingredient[];
  isBreakfast?: boolean;
  description?: string;
  imageUrl?: string;
  imageKey?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DayMenu {
  dayOfWeek: DayOfWeek;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  notes?: string;
}

export interface WeeklyMenu {
  _id: string;
  userId: string;
  year: number;
  week: number;
  days: DayMenu[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyMenu {
  _id: string;
  userId: string;
  year: number;
  month: number;
  weeks: WeeklyMenu[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProteinStats {
  carneRoja: number;
  pollo: number;
  pescado: number;
  pasta: number;
  arroz: number;
  sopa: number;
  otro: number;
}

export interface MenuGeneratorOptions {
  mealsPerDay: 2 | 3;
  avoidRecentMeals?: string[];
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  carne_roja: "Carne Roja",
  pollo: "Pollo",
  pescado: "Pescado/Mariscos",
  pasta: "Pasta/Fideos",
  arroz: "Arroz/Granos",
  sopa: "Sopa/Guiso",
  otro: "Otro",
};

export const MEAL_TYPE_COLORS: Record<MealType, string> = {
  carne_roja: "bg-red-100 text-red-700",
  pollo: "bg-yellow-100 text-yellow-700",
  pescado: "bg-blue-100 text-blue-700",
  pasta: "bg-orange-100 text-orange-700",
  arroz: "bg-green-100 text-green-700",
  sopa: "bg-purple-100 text-purple-700",
  otro: "bg-gray-100 text-gray-700",
};

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};
