"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Meal, MEAL_TYPE_LABELS, MEAL_TYPE_COLORS, DAY_LABELS, DayOfWeek } from "@/types";
import type { IWeeklyMenu } from "@/lib/db/models/WeeklyMenu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWeekNumber, getWeeksInMonth, getWeekStartEnd, formatMonth } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Wand2, CalendarRange } from "lucide-react";

const today = new Date();

const SLOTS = ["breakfast", "lunch", "dinner"] as const;
const SLOT_LABELS: Record<string, string> = {
  breakfast: "D",
  lunch: "A",
  dinner: "C",
};

export default function MonthlyPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [generating, setGenerating] = useState(false);

  const { data: mealsData = [] } = useQuery<Meal[]>({
    queryKey: ["meals"],
    queryFn: () => fetch("/api/meals").then((r) => r.json()),
  });
  const mealsMap = Object.fromEntries(mealsData.map((m) => [m._id, m]));

  const { data, isLoading } = useQuery<{ weeks: number[]; menus: IWeeklyMenu[] }>({
    queryKey: ["monthly-menus", year, month],
    queryFn: () =>
      fetch(`/api/menus/monthly?year=${year}&month=${month}`).then((r) => r.json()),
  });

  const weeks = data?.weeks ?? getWeeksInMonth(year, month);
  const menuByWeek: Record<number, IWeeklyMenu> = {};
  for (const m of data?.menus ?? []) menuByWeek[m.week] = m;

  async function generateMonth() {
    setGenerating(true);
    try {
      const res = await fetch("/api/menus/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const result = await res.json();
      if (!res.ok) alert(result.error ?? "Error generando menú");
      else queryClient.invalidateQueries({ queryKey: ["monthly-menus", year, month] });
    } finally {
      setGenerating(false);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const currentWeek = getWeekNumber(today);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Planificador Mensual
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
            {formatMonth(year, month)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}>
              <CalendarRange className="w-3.5 h-3.5" />
              Hoy
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={nextMonth}>
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={generateMonth} loading={generating} size="sm" className="gap-1.5">
            <Wand2 className="w-4 h-4" />
            Generar mes
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
        <span><strong className="text-slate-600 dark:text-slate-300">D</strong> Desayuno</span>
        <span><strong className="text-slate-600 dark:text-slate-300">A</strong> Almuerzo</span>
        <span><strong className="text-slate-600 dark:text-slate-300">C</strong> Cena</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {weeks.map((week) => {
            const weekYear = week === 1 && month === 12 ? year + 1 : year;
            const { start, end } = getWeekStartEnd(weekYear, week);
            const menu = menuByWeek[week];
            const isThisWeek = isCurrentMonth && week === currentWeek;

            return (
              <Card
                key={week}
                className={`overflow-hidden ${isThisWeek ? "ring-2 ring-emerald-400" : ""}`}
              >
                {/* Week header */}
                <div className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 ${isThisWeek ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-slate-50 dark:bg-slate-800/50"}`}>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Semana {week}
                    {isThisWeek && (
                      <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">Esta semana</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {start.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} –{" "}
                    {end.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                  </span>
                </div>

                {/* Days grid */}
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 min-w-[700px]">
                    {(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as DayOfWeek[]).map((day, i) => {
                      const dayMenu = menu?.days.find((d) => d.dayOfWeek === day);
                      return (
                        <div key={day} className={`p-2 ${i < 6 ? "border-r border-slate-100 dark:border-slate-700" : ""}`}>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                            {DAY_LABELS[day].slice(0, 3)}
                          </p>
                          <div className="flex flex-col gap-1">
                            {SLOTS.map((slot) => {
                              const mealId = dayMenu?.[slot];
                              const meal = mealId ? mealsMap[mealId] : null;
                              return (
                                <div key={slot} className="flex items-start gap-1 min-h-[22px]">
                                  <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 w-3 shrink-0 mt-0.5">
                                    {SLOT_LABELS[slot]}
                                  </span>
                                  {meal ? (
                                    <span
                                      className={`text-[10px] leading-tight px-1 py-0.5 rounded ${MEAL_TYPE_COLORS[meal.type]}`}
                                      title={meal.name}
                                    >
                                      {meal.name.length > 20 ? meal.name.slice(0, 18) + "…" : meal.name}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">—</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
