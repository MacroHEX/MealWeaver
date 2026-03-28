"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ShoppingItem } from "@/app/api/shopping-list/route";
import type { IWeeklyMenu } from "@/lib/db/models/WeeklyMenu";
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

function checkedKey(year: number, week: number) {
  return `shopping-checked-${year}-${week}`;
}
function loadChecked(year: number, week: number): Set<string> {
  try {
    const raw = localStorage.getItem(checkedKey(year, week));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

export default function ShoppingPage() {
  const [year, setYear] = useState(currentYear);
  const [week, setWeek] = useState(currentWeek);
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(currentYear, currentWeek));
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist checked in localStorage
  useEffect(() => {
    try { localStorage.setItem(checkedKey(year, week), JSON.stringify([...checked])); } catch {}
  }, [checked, year, week]);

  useEffect(() => {
    setChecked(loadChecked(year, week));
  }, [year, week]);

  const { start, end } = getWeekStartEnd(year, week);

  const { data: items = [], isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ["shopping-list", year, week],
    queryFn: () => fetch(`/api/shopping-list?year=${year}&week=${week}`).then((r) => r.json()),
  });

  // Load prices from DB when menu loads
  const { data: menu } = useQuery<IWeeklyMenu | null>({
    queryKey: ["weekly-menu", year, week],
    queryFn: () => fetch(`/api/menus/weekly?year=${year}&week=${week}`).then((r) => r.json()),
  });

  useEffect(() => {
    if (menu?.prices) {
      setPrices(menu.prices as unknown as Record<string, number>);
    } else {
      setPrices({});
    }
  }, [menu]);

  function toggleItem(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handlePriceChange(name: string, value: string) {
    const num = parseInt(value, 10) || 0;
    const updated = { ...prices, [name]: num };
    setPrices(updated);

    // Debounced save to DB
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch("/api/menus/weekly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, week, prices: updated }),
      });
    }, 600);
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
  const totalAll = items.reduce((sum, i) => sum + (prices[i.name] || 0), 0);
  const totalSpent = items
    .filter((i) => checked.has(i.name))
    .reduce((sum, i) => sum + (prices[i.name] || 0), 0);
  const hasPrices = totalAll > 0;

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
              <div
                key={item.name}
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${done ? "opacity-50" : ""}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleItem(item.name)}
                  className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                    done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-500"
                  }`}
                >
                  {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>

                {/* Name + quantity */}
                <button onClick={() => toggleItem(item.name)} className="flex-1 min-w-0 text-left">
                  <span className={`text-sm font-medium ${done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                    {item.name}
                  </span>
                  {item.quantities.length > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                      {item.quantities.join(" + ")}
                    </span>
                  )}
                </button>

                {/* Price input */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-medium text-slate-400">₲</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={prices[item.name] || ""}
                    onChange={(e) => handlePriceChange(item.name, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-28 px-2 py-1 text-sm text-right rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Totals */}
      {hasPrices && (
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Comprado</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              ₲ {totalSpent.toLocaleString("es-PY")}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700 pt-1.5">
            <span>Total estimado</span>
            <span>₲ {totalAll.toLocaleString("es-PY")}</span>
          </div>
        </div>
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