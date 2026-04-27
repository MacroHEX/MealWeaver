"use client";

import { Meal, DayOfWeek, DAY_LABELS, DAYS_OF_WEEK } from "@/types";
import type { IDayMenu } from "@/lib/db/models/WeeklyMenu";
import { Card } from "@/components/ui/Card";
import { MealSlot, slotConfig, type Slot } from "@/components/planner/MealSlot";
import { WeeklyDayPager } from "@/components/planner/WeeklyDayPager";

interface WeeklyGridProps {
  days: IDayMenu[];
  mealsMap: Record<string, Meal>;
  mealsPerDay: 2 | 3;
  onChangeMeal: (day: DayOfWeek, slot: Slot) => void;
  onToggleCooked: (day: DayOfWeek, slot: Slot) => void;
}

export function WeeklyGrid({ days, mealsMap, mealsPerDay, onChangeMeal, onToggleCooked }: WeeklyGridProps) {
  const dayMenuMap: Partial<Record<DayOfWeek, IDayMenu>> = {};
  for (const d of days) dayMenuMap[d.dayOfWeek] = d;

  const slots: Slot[] = mealsPerDay === 3
    ? ["breakfast", "lunch", "dinner"]
    : ["lunch", "dinner"];

  return (
    <>
      {/* Mobile: day-by-day pager with tabs and swipe */}
      <WeeklyDayPager
        days={days}
        mealsMap={mealsMap}
        mealsPerDay={mealsPerDay}
        onChangeMeal={onChangeMeal}
        onToggleCooked={onToggleCooked}
      />

      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid grid-cols-7 gap-3">
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
                <div key={slot} className="flex flex-col gap-1">
                  <p className={`flex items-center gap-1 text-xs font-medium ${color}`}>
                    <SlotIcon className="w-3 h-3" />
                    {label}
                  </p>
                  <MealSlot
                    mealId={dayMenu?.[slot]}
                    mealsMap={mealsMap}
                    isCooked={isCooked}
                    size="compact"
                    onChangeMeal={() => onChangeMeal(day, slot)}
                    onToggleCooked={() => onToggleCooked(day, slot)}
                  />
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </>
  );
}
