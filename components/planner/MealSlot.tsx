"use client";

import { Meal, MEAL_TYPE_COLORS, MEAL_TYPE_LABELS } from "@/types";
import { Sunrise, UtensilsCrossed, Moon, Plus, CheckCircle2, Circle, type LucideIcon } from "lucide-react";

export type Slot = "breakfast" | "lunch" | "dinner";

export const slotConfig: Record<Slot, { label: string; icon: LucideIcon; color: string }> = {
  breakfast: { label: "Desayuno", icon: Sunrise, color: "text-amber-400" },
  lunch:     { label: "Almuerzo", icon: UtensilsCrossed, color: "text-emerald-500" },
  dinner:    { label: "Cena",     icon: Moon, color: "text-indigo-400" },
};

interface MealSlotProps {
  mealId?: string;
  mealsMap: Record<string, Meal>;
  isCooked: boolean;
  size?: "compact" | "comfortable";
  onChangeMeal: () => void;
  onToggleCooked: () => void;
}

export function MealSlot({
  mealId,
  mealsMap,
  isCooked,
  size = "compact",
  onChangeMeal,
  onToggleCooked,
}: MealSlotProps) {
  const meal = mealId ? mealsMap[mealId] : null;
  const minH = size === "comfortable" ? "min-h-[64px]" : "min-h-[44px]";
  const textSize = size === "comfortable" ? "text-sm" : "text-xs";
  const iconSize = size === "comfortable" ? "w-4 h-4" : "w-3.5 h-3.5";

  if (!meal) {
    return (
      <button
        onClick={onChangeMeal}
        className={`w-full ${minH} flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors ${textSize}`}
      >
        <Plus className={iconSize} />
        Agregar
      </button>
    );
  }

  return (
    <div
      className={`flex items-start gap-1.5 rounded-xl border transition-colors ${minH} ${
        isCooked
          ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 opacity-60"
          : "bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
      }`}
    >
      <button
        onClick={onToggleCooked}
        aria-label={isCooked ? "Marcar como no cocinada" : "Marcar como cocinada"}
        title={isCooked ? "Marcar como no cocinada" : "Marcar como cocinada"}
        className={`p-2 shrink-0 transition-colors ${
          isCooked ? "text-emerald-500" : "text-slate-300 dark:text-slate-500 hover:text-emerald-400"
        }`}
      >
        {isCooked ? <CheckCircle2 className={iconSize} /> : <Circle className={iconSize} />}
      </button>

      <button onClick={onChangeMeal} className="flex-1 min-w-0 py-2 pr-2 text-left">
        <p
          className={`${textSize} font-medium truncate ${
            isCooked ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"
          }`}
        >
          {meal.name}
        </p>
        <span
          className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${MEAL_TYPE_COLORS[meal.type]}`}
        >
          {MEAL_TYPE_LABELS[meal.type]}
        </span>
      </button>
    </div>
  );
}
