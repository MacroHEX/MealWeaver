"use client";

import { Meal, MEAL_TYPE_LABELS, MEAL_TYPE_COLORS } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pencil, Trash2, ListMinus } from "lucide-react";

interface MealCardProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
}

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  return (
    <Card hover className="flex flex-col p-4 gap-3">
      {meal.imageUrl && (
        <img
          src={meal.imageUrl}
          alt={meal.name}
          className="w-full h-36 object-cover rounded-xl"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
            {meal.name}
          </h3>
          {meal.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
              {meal.description}
            </p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${MEAL_TYPE_COLORS[meal.type]}`}>
          {MEAL_TYPE_LABELS[meal.type]}
        </span>
      </div>

      {meal.ingredients.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <ListMinus className="w-3.5 h-3.5 shrink-0" />
            Ingredientes
          </p>
          <ul className="flex flex-wrap gap-1">
            {meal.ingredients.map((ing, i) => (
              <li
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                {ing.name}
                {ing.quantity && (
                  <span className="text-slate-400 dark:text-slate-500 ml-1">
                    · {ing.quantity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-700 mt-auto">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => onEdit(meal)}>
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </Button>
        <Button variant="danger" size="sm" className="gap-1.5" onClick={() => onDelete(meal._id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}
