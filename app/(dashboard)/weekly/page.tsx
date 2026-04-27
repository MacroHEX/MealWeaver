"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Meal, DayOfWeek, MEAL_TYPE_LABELS } from "@/types";
import type { IWeeklyMenu } from "@/lib/db/models/WeeklyMenu";
import { WeeklyGrid } from "@/components/planner/WeeklyGrid";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getWeekNumber, getWeekStartEnd, formatDate } from "@/lib/utils";
import { Wand2, CalendarX, ChevronLeft, ChevronRight, CalendarDays, ShoppingCart, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WeeklyGridSkeleton, WeeklyDaySkeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/common/PageTransition";

const today = new Date();
const currentYear = today.getFullYear();
const currentWeek = getWeekNumber(today);

export default function WeeklyPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(currentYear);
  const [week, setWeek] = useState(currentWeek);
  const [pickModal, setPickModal] = useState<{ day: DayOfWeek; slot: "breakfast" | "lunch" | "dinner" } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const { start, end } = getWeekStartEnd(year, week);

  const { data: meals = [] } = useQuery<Meal[]>({
    queryKey: ["meals"],
    queryFn: () => fetch("/api/meals").then((r) => r.json()),
  });

  const mealsMap = Object.fromEntries(meals.map((m) => [m._id, m]));

  const { data: menu, isLoading } = useQuery<IWeeklyMenu | null>({
    queryKey: ["weekly-menu", year, week],
    queryFn: () =>
      fetch(`/api/menus/weekly?year=${year}&week=${week}`).then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: async (days: IWeeklyMenu["days"]) => {
      const res = await fetch("/api/menus/weekly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, week, days }),
      });
      if (!res.ok) throw new Error("Error guardando menú");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-menu", year, week] }),
  });

  async function generateMenu() {
    setGenerating(true);
    try {
      const res = await fetch("/api/menus/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, week, mealsPerDay: 3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error generando menú");
      } else {
        queryClient.invalidateQueries({ queryKey: ["weekly-menu", year, week] });
        toast.success("Menú generado");
      }
    } catch {
      toast.error("Error de conexión al generar menú");
    } finally {
      setGenerating(false);
    }
  }

  async function generateMenuAI() {
    setGeneratingAI(true);
    try {
      const res = await fetch("/api/menus/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, week, mealsPerDay: 3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error generando menú con IA");
      } else {
        queryClient.invalidateQueries({ queryKey: ["weekly-menu", year, week] });
        toast.success("Menú generado con IA");
      }
    } catch {
      toast.error("Error de conexión con la IA");
    } finally {
      setGeneratingAI(false);
    }
  }

  function handleChangeMeal(day: DayOfWeek, slot: "breakfast" | "lunch" | "dinner") {
    setPickModal({ day, slot });
  }

  function handleToggleCooked(day: DayOfWeek, slot: "breakfast" | "lunch" | "dinner") {
    if (!menu) return;
    const newDays = menu.days.map((d) => {
      if (d.dayOfWeek !== day) return d;
      const cooked = d.cooked ?? [];
      const updated = cooked.includes(slot)
        ? cooked.filter((s) => s !== slot)
        : [...cooked, slot];
      return { ...d, cooked: updated };
    });
    updateMutation.mutate(newDays);
  }

  async function pickMeal(mealId: string) {
    if (!pickModal || !menu) return;
    const newDays = menu.days.map((d) =>
      d.dayOfWeek === pickModal.day ? { ...d, [pickModal.slot]: mealId } : d
    );
    if (!newDays.find((d) => d.dayOfWeek === pickModal.day)) {
      newDays.push({ dayOfWeek: pickModal.day, [pickModal.slot]: mealId });
    }
    await updateMutation.mutateAsync(newDays);
    setPickModal(null);
  }

  function prevWeek() {
    if (week === 1) { setYear(y => y - 1); setWeek(52); }
    else setWeek(w => w - 1);
  }
  function nextWeek() {
    if (week === 52) { setYear(y => y + 1); setWeek(1); }
    else setWeek(w => w + 1);
  }

  // Count cooked meals for the week badge
  const cookedCount = menu?.days.reduce((acc, d) => acc + (d.cooked?.length ?? 0), 0) ?? 0;
  const totalSlots = menu?.days.reduce((acc, d) =>
    acc + (d.breakfast ? 1 : 0) + (d.lunch ? 1 : 0) + (d.dinner ? 1 : 0), 0) ?? 0;

  return (
    <PageTransition className="flex flex-col gap-6 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Planificador Semanal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDate(start)} – {formatDate(end)} · Semana {week}
            {cookedCount > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                · {cookedCount}/{totalSlots} cocinadas
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setYear(currentYear); setWeek(currentWeek); }}>
            <CalendarDays className="w-3.5 h-3.5" />
            Hoy
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={nextWeek}>
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
          {menu && (
            <Link href={`/shopping?year=${year}&week=${week}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ShoppingCart className="w-4 h-4" />
                Compras
              </Button>
            </Link>
          )}
          <Button onClick={generateMenu} loading={generating} variant="outline" size="sm" className="gap-1.5">
            <Wand2 className="w-4 h-4" />
            Generar menú
          </Button>
          <Button onClick={generateMenuAI} loading={generatingAI} size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Sparkles className="w-4 h-4" />
            Generar con IA
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <>
          <WeeklyDaySkeleton />
          <WeeklyGridSkeleton />
        </>
      ) : !menu ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400">
          <CalendarX className="w-12 h-12" strokeWidth={1} />
          <p className="text-sm">No hay menú para esta semana aún.</p>
          <div className="flex gap-2">
            <Button onClick={generateMenu} loading={generating} variant="outline" className="gap-1.5">
              <Wand2 className="w-4 h-4" />
              Generar automático
            </Button>
            <Button onClick={generateMenuAI} loading={generatingAI} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Sparkles className="w-4 h-4" />
              Generar con IA
            </Button>
          </div>
        </div>
      ) : (
        <WeeklyGrid
          days={menu.days}
          mealsMap={mealsMap}
          mealsPerDay={3}
          onChangeMeal={handleChangeMeal}
          onToggleCooked={handleToggleCooked}
        />
      )}

      {/* Meal picker modal */}
      <Modal
        open={!!pickModal}
        onClose={() => setPickModal(null)}
        title="Seleccionar comida"
        size="md"
      >
        <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
          {meals.length === 0 && (
            <p className="text-sm text-slate-500">No tienes comidas registradas.</p>
          )}
          {meals.map((meal) => (
            <button
              key={meal._id}
              onClick={() => pickMeal(meal._id)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{meal.name}</p>
                <p className="text-xs text-slate-400">{MEAL_TYPE_LABELS[meal.type]}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </PageTransition>
  );
}
