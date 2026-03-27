"use client";

import { useState, useEffect } from "react";
import { Meal, MealType, Ingredient, MEAL_TYPE_LABELS } from "@/types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, X } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface MealFormProps {
  initial?: Partial<Meal>;
  onSubmit: (data: Partial<Meal>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const defaultForm: Partial<Meal> = {
  name: "",
  type: "pollo",
  ingredients: [],
  description: "",
  notes: "",
};

export function MealForm({ initial, onSubmit, onCancel, loading }: MealFormProps) {
  const [form, setForm] = useState<Partial<Meal>>({ ...defaultForm, ...initial });
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients ?? []
  );

  useEffect(() => {
    setForm({ ...defaultForm, ...initial });
    setIngredients(initial?.ingredients ?? []);
  }, [initial]);

  function update<K extends keyof Meal>(key: K, value: Meal[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "", quantity: "" }]);
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanIngredients = ingredients.filter((ing) => ing.name.trim() !== "");
    await onSubmit({ ...form, ingredients: cleanIngredients });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="meal-name"
        label="Nombre de la comida *"
        placeholder="Ej: Pollo al horno con papas"
        value={form.name ?? ""}
        onChange={(e) => update("name", e.target.value)}
        required
      />

      <Select
        id="meal-type"
        label="Tipo *"
        value={form.type}
        onChange={(e) => update("type", e.target.value as MealType)}
        required
      >
        {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>

      {/* Breakfast toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => update("isBreakfast", !form.isBreakfast)}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            form.isBreakfast ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              form.isBreakfast ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Es desayuno</p>
          <p className="text-xs text-slate-400">Solo se usará en el slot de desayuno</p>
        </div>
      </label>

      {/* Ingredients list */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Ingredientes
          </span>
          <button
            type="button"
            onClick={addIngredient}
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>

        {ingredients.length === 0 ? (
          <button
            type="button"
            onClick={addIngredient}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 dark:hover:border-emerald-500 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar ingrediente
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-1">
              <span className="text-xs text-slate-400">Ingrediente</span>
              <span className="text-xs text-slate-400">Cantidad</span>
            </div>

            {ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ej: Pollo"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Ej: 500g"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                  className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  aria-label="Eliminar ingrediente"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {ingredients.length > 0 && (
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium transition-colors mt-1 self-start"
              >
                <Plus className="w-3.5 h-3.5" />
                Otro ingrediente
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="meal-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Descripción
        </label>
        <textarea
          id="meal-description"
          rows={2}
          placeholder="Descripción breve de la comida..."
          value={form.description ?? ""}
          onChange={(e) => update("description", e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
      </div>

      <ImageUpload
        currentUrl={form.imageUrl}
        currentKey={form.imageKey}
        onUpload={(url, key) => {
          update("imageUrl", url);
          update("imageKey", key);
        }}
        onRemove={() => {
          update("imageUrl", undefined);
          update("imageKey", undefined);
        }}
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {initial?._id ? "Guardar cambios" : "Agregar comida"}
        </Button>
      </div>
    </form>
  );
}
