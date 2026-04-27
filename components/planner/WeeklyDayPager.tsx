"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion";
import { Meal, DayOfWeek, DAY_LABELS, DAYS_OF_WEEK } from "@/types";
import type { IDayMenu } from "@/lib/db/models/WeeklyMenu";
import { Card } from "@/components/ui/Card";
import { MealSlot, slotConfig, type Slot } from "@/components/planner/MealSlot";

const SHORT_LABELS: Record<DayOfWeek, string> = {
  Monday: "Lun",
  Tuesday: "Mar",
  Wednesday: "Mié",
  Thursday: "Jue",
  Friday: "Vie",
  Saturday: "Sáb",
  Sunday: "Dom",
};

const JS_DAY_TO_DOW: Record<number, DayOfWeek> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
};

interface Props {
  days: IDayMenu[];
  mealsMap: Record<string, Meal>;
  mealsPerDay: 2 | 3;
  onChangeMeal: (day: DayOfWeek, slot: Slot) => void;
  onToggleCooked: (day: DayOfWeek, slot: Slot) => void;
}

export function WeeklyDayPager({ days, mealsMap, mealsPerDay, onChangeMeal, onToggleCooked }: Props) {
  const reduceMotion = useReducedMotion();

  const dayMenuMap = useMemo(() => {
    const m: Partial<Record<DayOfWeek, IDayMenu>> = {};
    for (const d of days) m[d.dayOfWeek] = d;
    return m;
  }, [days]);

  const todayDow = JS_DAY_TO_DOW[new Date().getDay()];
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDow);
  const [direction, setDirection] = useState<1 | -1>(1);

  const slots: Slot[] = mealsPerDay === 3 ? ["breakfast", "lunch", "dinner"] : ["lunch", "dinner"];
  const activeIndex = DAYS_OF_WEEK.indexOf(activeDay);
  const activeMenu = dayMenuMap[activeDay];

  function go(dir: 1 | -1) {
    const next = activeIndex + dir;
    if (next < 0 || next >= DAYS_OF_WEEK.length) return;
    setDirection(dir);
    setActiveDay(DAYS_OF_WEEK[next]);
  }

  function handleSelectDay(day: DayOfWeek) {
    const idx = DAYS_OF_WEEK.indexOf(day);
    setDirection(idx > activeIndex ? 1 : -1);
    setActiveDay(day);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -300) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 300) go(-1);
  }

  return (
    <div className="md:hidden flex flex-col gap-3">
      {/* Day tabs */}
      <div className="relative flex gap-1 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
        {DAYS_OF_WEEK.map((day) => {
          const isActive = day === activeDay;
          const isToday = day === todayDow;
          return (
            <button
              key={day}
              onClick={() => handleSelectDay(day)}
              aria-current={isActive ? "true" : undefined}
              aria-label={DAY_LABELS[day]}
              className={`relative shrink-0 snap-start min-w-[56px] px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive
                  ? "text-white"
                  : isToday
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="weekly-day-tab-active"
                  className="absolute inset-0 bg-emerald-500 rounded-xl shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative">{SHORT_LABELS[day]}</span>
            </button>
          );
        })}
      </div>

      {/* Active day card with swipe */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={activeDay}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -direction * 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            drag={reduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            <Card className="p-4 flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  {DAY_LABELS[activeDay]}
                  {activeDay === todayDow && (
                    <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Hoy
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-400">
                  Día {activeIndex + 1} de 7
                </span>
              </div>

              {slots.map((slot) => {
                const { label, icon: SlotIcon, color } = slotConfig[slot];
                const isCooked = activeMenu?.cooked?.includes(slot) ?? false;
                return (
                  <div key={slot} className="flex flex-col gap-1.5">
                    <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
                      <SlotIcon className="w-3.5 h-3.5" />
                      {label}
                    </p>
                    <MealSlot
                      mealId={activeMenu?.[slot]}
                      mealsMap={mealsMap}
                      isCooked={isCooked}
                      size="comfortable"
                      onChangeMeal={() => onChangeMeal(activeDay, slot)}
                      onToggleCooked={() => onToggleCooked(activeDay, slot)}
                    />
                  </div>
                );
              })}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
