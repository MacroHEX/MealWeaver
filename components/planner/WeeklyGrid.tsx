"use client";

import { Meal, DayOfWeek, DAY_LABELS, DAYS_OF_WEEK, MEAL_TYPE_COLORS, MEAL_TYPE_LABELS } from "@/types";
import type { IDayMenu } from "@/lib/db/models/WeeklyMenu";
import { Card } from "@/components/ui/Card";
import { Sunrise, UtensilsCrossed, Moon, Plus, CheckCircle2, Circle } from "lucide-react";

interface WeeklyGridProps {
  days: IDayMenu[];
  mealsMap: Record<string, Meal>;
  mealsPerDay: 2 | 3;
  onChangeMeal: (day: DayOfWeek, slot: "breakfast" | "lunch" | "dinner") => void;
  onToggleCooked: (day: DayOfWeek, slot: "breakfast" | "lunch" | "dinner") => void;
}

const slotConfig = {
  breakfast: { label: "Desayuno",  icon: Sunrise,         color: "text-amber-400"   },
  lunch:     { label: "Almuerzo",  icon: UtensilsCrossed,  color: "text-emerald-500" },
  dinner:    { label: "Cena",      icon: Moon,             color: "text-indigo-400"  },
} as const;

type Slot = "breakfast" | "lunch" | "dinner";

function MealSlot({
  mealId,
  mealsMap,
  isCooked,
  onChangeMeal,
  onToggleCooked,
}: {
  mealId?: string;
  mealsMap: Record<string, Meal>;
  isCooked: boolean;
  onChangeMeal: () => void;
  onToggleCooked: () => void;
}) {
  const meal = mealId ? mealsMap[mealId] : null;

  if (!meal) {
    return (
      <button
        onClick={onChangeMeal}
        className="w-full h-10 flex items-center justify-center gap-1 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar
      </button>
    );
  }

  return (
    <div className={`
      flex items-start gap-1 rounded-lg border transition-colors
      ${isCooked
        ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 opacity-60"
        : "bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"}
    `}>
      {/* Cooked toggle */}
      <button
        onClick={onToggleCooked}
        title={isCooked ? "Marcar como no cocinada" : "Marcar como cocinada"}
        className={`p-1.5 shrink-0 transition-colors ${isCooked ? "text-emerald-500" : "text-slate-300 dark:text-slate-500 hover:text-emerald-400"}`}
      >
        {isCooked
          ? <CheckCircle2 className="w-3.5 h-3.5" />
          : <Circle className="w-3.5 h-3.5" />}
      </button>

      {/* Meal name — click to change */}
      <button
        onClick={onChangeMeal}
        className="flex-1 min-w-0 py-1.5 pr-1.5 text-left"
      >
        <p className={`text-xs font-medium truncate ${isCooked ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
          {meal.name}
        </p>
        <span className={`text-[10px] px-1 py-0.5 rounded-full ${MEAL_TYPE_COLORS[meal.type]}`}>
          {MEAL_TYPE_LABELS[meal.type]}
        </span>
      </button>
    </div>
  );
}

export function WeeklyGrid({ days, mealsMap, mealsPerDay, onChangeMeal, onToggleCooked }: WeeklyGridProps) {
  const dayMenuMap: Partial<Record<DayOfWeek, IDayMenu>> = {};
  for (const d of days) dayMenuMap[d.dayOfWeek] = d;

  const slots: Slot[] = mealsPerDay === 3
    ? ["breakfast", "lunch", "dinner"]
    : ["lunch", "dinner"];

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-3 min-w-[900px]">
        {DAYS_OF_WEEK.map((day) => (
          <Card key={day} className="p-3 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-center text-slate-700 dark:text-slate-200">
              {DAY_LABELS[day]}
            </h3>
            {slots.map((slot) => {
              const { label, icon: SlotIcon, color } = slotConfig[slot];
              const dayMenu = dayMenuMap[day];
              const isCooked = dayMenu?.cooked?.includes(slot) ?? false;
              return (
                <div key={slot}>
                  <p className={`flex items-center gap-1 text-xs mb-1 ${color} font-medium`}>
                    <SlotIcon className="w-3 h-3" />
                    {label}
                  </p>
                  <MealSlot
                    mealId={dayMenu?.[slot]}
                    mealsMap={mealsMap}
                    isCooked={isCooked}
                    onChangeMeal={() => onChangeMeal(day, slot)}
                    onToggleCooked={() => onToggleCooked(day, slot)}
                  />
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}
