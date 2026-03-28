"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Meal,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_COLORS,
  DAY_LABELS,
  DayOfWeek,
  DAYS_OF_WEEK,
} from "@/types";
import type { IWeeklyMenu } from "@/lib/db/models/WeeklyMenu";
import { getWeekNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import {
  CalendarDays,
  UtensilsCrossed,
  Sunrise,
  Utensils,
  Moon,
  ChevronRight,
  Wand2,
  ShoppingCart,
  CheckCircle2,
  ListMinus,
  ChefHat,
} from "lucide-react";

const TODAY = new Date();
const JS_DAY_TO_DOW: Record<number, DayOfWeek> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};
const TODAY_DOW = JS_DAY_TO_DOW[TODAY.getDay()];
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_WEEK = getWeekNumber(TODAY);

function getGreeting() {
  const h = TODAY.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Color placeholder cuando no hay imagen, por grupo proteico
const TYPE_GRADIENT: Record<string, string> = {
  carne_roja: "from-red-900 to-red-700",
  chancho: "from-pink-900 to-pink-700",
  pollo: "from-amber-800 to-amber-600",
  pescado: "from-blue-900 to-blue-700",
  pasta: "from-orange-800 to-orange-600",
  arroz: "from-emerald-900 to-emerald-700",
  sopa: "from-purple-900 to-purple-700",
  otro: "from-slate-800 to-slate-600",
};

interface TodayMealCardProps {
  meal: Meal | undefined;
  breakfast: Meal | undefined;
  cooked: boolean;
  breakfastCooked: boolean;
}

function TodayMealCard({ meal, breakfast, cooked, breakfastCooked }: TodayMealCardProps) {
  const gradient = meal ? (TYPE_GRADIENT[meal.type] ?? TYPE_GRADIENT.otro) : TYPE_GRADIENT.otro;

  return (
    <div className="flex flex-col gap-3">
      {/* Desayuno — fila pequeña si existe */}
      {breakfast && (
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
            breakfastCooked
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <Sunrise
            className={`w-4 h-4 flex-shrink-0 ${
              breakfastCooked ? "text-emerald-500" : "text-amber-400"
            }`}
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Desayuno
            </span>
            <p
              className={`text-sm font-medium leading-tight truncate ${
                breakfastCooked
                  ? "line-through text-slate-400 dark:text-slate-500"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {breakfast.name}
            </p>
          </div>
          {breakfastCooked && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
        </div>
      )}

      {/* Comida principal — almuerzo / cena */}
      <Card className="overflow-hidden">
        {meal ? (
          <>
            {/* Imagen o placeholder con gradiente */}
            <div className="relative h-52 sm:h-64 w-full">
              {meal.imageUrl ? (
                <img
                  src={meal.imageUrl}
                  alt={meal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
              )}

              {/* Gradiente de texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              {/* Cocinada badge */}
              {cooked && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cocinada
                </div>
              )}

              {/* Nombre y labels superpuestos */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex items-center gap-1 text-xs font-medium text-white/70">
                    <Utensils className="w-3 h-3" />
                    Almuerzo
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-white/70">
                    <Moon className="w-3 h-3" />
                    Cena
                  </span>
                </div>
                <h3
                  className={`text-xl sm:text-2xl font-bold text-white leading-tight ${
                    cooked ? "line-through opacity-60" : ""
                  }`}
                >
                  {meal.name}
                </h3>
                <span
                  className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${MEAL_TYPE_COLORS[meal.type]}`}
                >
                  {MEAL_TYPE_LABELS[meal.type]}
                </span>
              </div>
            </div>

            {/* Ingredientes y descripción */}
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              {meal.ingredients.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <ListMinus className="w-3.5 h-3.5" />
                    Ingredientes
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {meal.ingredients.map((ing, i) => (
                      <li
                        key={i}
                        className="flex items-baseline gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-medium">{ing.name}</span>
                        {ing.quantity && (
                          <span className="text-slate-400 dark:text-slate-500">· {ing.quantity}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meal.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {meal.description}
                </p>
              )}

              {meal.instructions && (
                <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <ChefHat className="w-3.5 h-3.5" />
                    Preparación
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {meal.instructions}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
            <Utensils className="w-8 h-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin comida planificada para hoy</p>
            <Link href="/weekly">
              <Button size="sm" variant="outline" className="mt-1 gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Ir al planificador
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const { data: meals = [] } = useQuery<Meal[]>({
    queryKey: ["meals"],
    queryFn: () => fetch("/api/meals").then((r) => r.json()),
  });

  const { data: menu, isLoading: menuLoading } = useQuery<IWeeklyMenu | null>({
    queryKey: ["weekly-menu", CURRENT_YEAR, CURRENT_WEEK],
    queryFn: () =>
      fetch(`/api/menus/weekly?year=${CURRENT_YEAR}&week=${CURRENT_WEEK}`).then((r) => r.json()),
  });

  const mealsMap = Object.fromEntries(meals.map((m) => [m._id, m]));

  const todayMenu = menu?.days?.find((d) => d.dayOfWeek === TODAY_DOW);
  const todayIndex = DAYS_OF_WEEK.indexOf(TODAY_DOW);
  const upcomingDays = (menu?.days ?? []).filter(
    (d) => DAYS_OF_WEEK.indexOf(d.dayOfWeek) > todayIndex
  );

  const todayLunch = todayMenu?.lunch ? mealsMap[todayMenu.lunch] : undefined;
  const todayBreakfast = todayMenu?.breakfast ? mealsMap[todayMenu.breakfast] : undefined;
  const lunchCooked = !!(todayMenu?.cooked?.includes("lunch") || todayMenu?.cooked?.includes("dinner"));
  const breakfastCooked = !!todayMenu?.cooked?.includes("breakfast");

  const dateStr = TODAY.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Greeting */}
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{dateStr}</p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {/* Today's meal */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Hoy</h2>
          <Link
            href="/weekly"
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5 transition-colors"
          >
            Ver semana <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {menuLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
          </div>
        ) : !menu ? (
          <Card className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
            <CalendarDays
              className="w-10 h-10 text-slate-300 dark:text-slate-600"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No hay menú planificado esta semana
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Genera uno para empezar</p>
            </div>
            <Link href="/weekly">
              <Button size="sm" className="gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Planificar semana
              </Button>
            </Link>
          </Card>
        ) : (
          <TodayMealCard
            meal={todayLunch}
            breakfast={todayBreakfast}
            cooked={lunchCooked}
            breakfastCooked={breakfastCooked}
          />
        )}
      </section>

      {/* Upcoming days */}
      {upcomingDays.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Próximos días
          </h2>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            {upcomingDays.map((day) => {
              const lunch = day.lunch ? mealsMap[day.lunch] : undefined;
              const dinner = day.dinner ? mealsMap[day.dinner] : undefined;
              const sameMeal = day.lunch && day.lunch === day.dinner;

              return (
                <div
                  key={day.dayOfWeek}
                  className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-20 flex-shrink-0">
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>

                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {lunch ? (
                      <>
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                          {lunch.name}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${MEAL_TYPE_COLORS[lunch.type]}`}
                        >
                          {MEAL_TYPE_LABELS[lunch.type]}
                        </span>
                      </>
                    ) : dinner && !sameMeal ? (
                      <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                        {dinner.name}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Sin planificar</span>
                    )}
                  </div>

                  {/* Thumbnail si tiene imagen */}
                  {lunch?.imageUrl && (
                    <img
                      src={lunch.imageUrl}
                      alt={lunch.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link href="/meals" className="block">
            <Card hover className="flex flex-col items-center gap-2.5 py-5 px-3 text-center h-full">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <UtensilsCrossed className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Mis comidas
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {meals.length} registrada{meals.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Card>
          </Link>

          <Link href="/weekly" className="block">
            <Card hover className="flex flex-col items-center gap-2.5 py-5 px-3 text-center h-full">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Planificador
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Esta semana</p>
              </div>
            </Card>
          </Link>

          <Link href="/shopping" className="block col-span-2 sm:col-span-1">
            <Card hover className="flex flex-col items-center gap-2.5 py-5 px-3 text-center h-full">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30">
                <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Lista de compras
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Ver ingredientes</p>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}