"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ShoppingItem } from "@/app/api/shopping-list/route";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWeekNumber, getWeekStartEnd, formatDate } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Check,
  Copy,
  CalendarDays,
} from "lucide-react";

const today = new Date();
const currentYear = today.getFullYear();
const currentWeek = getWeekNumber(today);

function storageKey(year: number, week: number) {
  return `shopping-checked-${year}-${week}`;
}

function loadChecked(year: number, week: number): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(year, week));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(year: number, week: number, checked: Set<string>) {
  try {
    localStorage.setItem(storageKey(year, week), JSON.stringify([...checked]));
  } catch {
    // ignore
  }
}

export default function ShoppingPage() {
  const [year, setYear] = useState(currentYear);
  const [week, setWeek] = useState(currentWeek);
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(currentYear, currentWeek));
  const [copied, setCopied] = useState(false);

  // Persist checked state on every change
  useEffect(() => {
    saveChecked(year, week, checked);
  }, [checked, year, week]);

  // Load persisted state when week changes
  useEffect(() => {
    setChecked(loadChecked(year, week));
  }, [year, week]);

  const { start, end } = getWeekStartEnd(year, week);

  const { data: items = [], isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ["shopping-list", year, week],
    queryFn: () =>
      fetch(`/api/shopping-list?year=${year}&week=${week}`).then((r) => r.json()),
  });

  function toggleItem(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function copyToClipboard() {
    const pending = items.filter((i) => !checked.has(i.name));
    const text = pending
      .map((i) => {
        const qty = i.quantities.length > 0 ? ` (${i.quantities.join(" + ")})` : "";
        return `• ${i.name}${qty}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function prevWeek() {
    if (week === 1) { setYear(y => y - 1); setWeek(52); }
    else setWeek(w => w - 1);
  }
  function nextWeek() {
    if (week === 52) { setYear(y => y + 1); setWeek(1); }
    else setWeek(w => w + 1);
  }

  const pendingCount = items.filter((i) => !checked.has(i.name)).length;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Lista de Compras
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDate(start)} – {formatDate(end)} · Semana {week}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setYear(currentYear); setWeek(currentWeek); }}>
            <CalendarDays className="w-3.5 h-3.5" />
            Hoy
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {items.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={copyToClipboard}>
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${((items.length - pendingCount) / items.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
            {items.length - pendingCount}/{items.length}
          </span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 dark:text-slate-500">
          <ShoppingCart className="w-12 h-12" strokeWidth={1} />
          <p className="text-sm">No hay menú generado para esta semana.</p>
        </div>
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((item) => {
            const done = checked.has(item.name);
            return (
              <button
                key={item.name}
                onClick={() => toggleItem(item.name)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors
                  ${done ? "opacity-50" : ""}
                `}
              >
                {/* Checkbox */}
                <div className={`
                  flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors
                  ${done
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300 dark:border-slate-500"}
                `}>
                  {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>

                {/* Name + quantity */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                    {item.name}
                  </span>
                  {item.quantities.length > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                      {item.quantities.join(" + ")}
                    </span>
                  )}
                </div>

                {/* Used in */}
                <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px] text-right hidden sm:block">
                  {item.mealNames.slice(0, 2).join(", ")}
                  {item.mealNames.length > 2 && ` +${item.mealNames.length - 2}`}
                </span>
              </button>
            );
          })}
        </Card>
      )}

      {checked.size > 0 && (
        <button
          onClick={() => setChecked(new Set())}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors self-start"
        >
          Desmarcar todo
        </button>
      )}
    </div>
  );
}
