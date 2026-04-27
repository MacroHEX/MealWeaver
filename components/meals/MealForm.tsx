"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Meal, MealType, MEAL_TYPE_LABELS } from "@/types";
import { mealFormSchema, type MealFormInput, type MealFormOutput } from "@/lib/schemas/meal";
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

function buildDefaults(initial?: Partial<Meal>): MealFormInput {
  return {
    name: initial?.name ?? "",
    type: (initial?.type as MealType) ?? "pollo",
    isBreakfast: initial?.isBreakfast ?? false,
    ingredients: initial?.ingredients ?? [],
    description: initial?.description ?? "",
    instructions: initial?.instructions ?? "",
    imageUrl: initial?.imageUrl,
    imageKey: initial?.imageKey,
  };
}

export function MealForm({ initial, onSubmit, onCancel, loading }: MealFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MealFormInput, unknown, MealFormOutput>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: buildDefaults(initial),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });

  useEffect(() => {
    reset(buildDefaults(initial));
  }, [initial, reset]);

  const isBreakfast = watch("isBreakfast");
  const imageUrl = watch("imageUrl");
  const imageKey = watch("imageKey");

  const onValid = async (values: MealFormOutput) => {
    const cleanIngredients = values.ingredients.filter((ing) => ing.name.trim() !== "");
    await onSubmit({ ...values, ingredients: cleanIngredients });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
      <Input
        id="meal-name"
        label="Nombre de la comida *"
        placeholder="Ej: Pollo al horno con papas"
        {...register("name")}
        error={errors.name?.message}
      />

      <Select
        id="meal-type"
        label="Tipo *"
        {...register("type")}
        error={errors.type?.message}
      >
        {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>

      {/* Breakfast toggle (real checkbox under the hood for a11y) */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="sr-only"
          {...register("isBreakfast")}
        />
        <span
          aria-hidden
          className={`relative w-10 h-6 rounded-full transition-colors ${
            isBreakfast ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              isBreakfast ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
        <span>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Es desayuno</span>
          <span className="block text-xs text-slate-400">Solo se usará en el slot de desayuno</span>
        </span>
      </label>

      {/* Ingredients list */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Ingredientes
          </span>
          <button
            type="button"
            onClick={() => append({ name: "", quantity: "" })}
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>

        {fields.length === 0 ? (
          <button
            type="button"
            onClick={() => append({ name: "", quantity: "" })}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 dark:hover:border-emerald-500 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar ingrediente
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Column headers — desktop only */}
            <div className="hidden sm:grid grid-cols-[1fr_140px_40px] gap-2 px-1">
              <span className="text-xs text-slate-400">Ingrediente</span>
              <span className="text-xs text-slate-400">Cantidad</span>
            </div>

            {fields.map((field, i) => (
              <div
                key={field.id}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_140px_40px] gap-2 sm:items-center rounded-xl sm:rounded-none p-2 sm:p-0 bg-slate-50 dark:bg-slate-800/40 sm:bg-transparent"
              >
                <input
                  type="text"
                  placeholder="Ej: Pollo"
                  {...register(`ingredients.${i}.name` as const)}
                  className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ej: 500g"
                    {...register(`ingredients.${i}.quantity` as const)}
                    className="flex-1 sm:flex-none sm:w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
                    aria-label="Eliminar ingrediente"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => append({ name: "", quantity: "" })}
              className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium transition-colors mt-1 self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              Otro ingrediente
            </button>
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
          {...register("description")}
          className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="meal-instructions" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Instrucciones de preparación
        </label>
        <textarea
          id="meal-instructions"
          rows={4}
          placeholder={"1. Calentar aceite en la sartén...\n2. Agregar los ingredientes...\n3. Cocinar por 20 minutos..."}
          {...register("instructions")}
          className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
        />
      </div>

      <Controller
        control={control}
        name="imageUrl"
        render={() => (
          <ImageUpload
            currentUrl={imageUrl}
            currentKey={imageKey}
            onUpload={(url, key) => {
              setValue("imageUrl", url, { shouldDirty: true });
              setValue("imageKey", key, { shouldDirty: true });
            }}
            onRemove={() => {
              setValue("imageUrl", undefined, { shouldDirty: true });
              setValue("imageKey", undefined, { shouldDirty: true });
            }}
          />
        )}
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
