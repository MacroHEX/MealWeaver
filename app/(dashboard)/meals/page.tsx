"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Meal, MealType, MEAL_TYPE_LABELS } from "@/types";
import { MealCard } from "@/components/meals/MealCard";
import { MealForm } from "@/components/meals/MealForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UtensilsCrossed, Plus } from "lucide-react";
import { toast } from "sonner";
import { MealCardSkeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/common/PageTransition";
import { motion, AnimatePresence } from "framer-motion";

async function fetchMeals(type?: string, search?: string): Promise<Meal[]> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search) params.set("search", search);
  const res = await fetch(`/api/meals?${params}`);
  if (!res.ok) throw new Error("Error cargando comidas");
  return res.json();
}

export default function MealsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<MealType | "">("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Partial<Meal> | undefined>();
  const [formLoading, setFormLoading] = useState(false);

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ["meals", filterType, search],
    queryFn: () => fetchMeals(filterType || undefined, search || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error eliminando");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      toast.success("Comida eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditingMeal(undefined);
    setModalOpen(true);
  }

  function openEdit(meal: Meal) {
    setEditingMeal(meal);
    setModalOpen(true);
  }

  async function handleFormSubmit(data: Partial<Meal>) {
    setFormLoading(true);
    const isEdit = !!editingMeal?._id;
    try {
      const url = isEdit ? `/api/meals/${editingMeal._id}` : "/api/meals";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error guardando comida");
      await queryClient.invalidateQueries({ queryKey: ["meals"] });
      setModalOpen(false);
      toast.success(isEdit ? "Comida actualizada" : "Comida creada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error guardando comida");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <PageTransition className="flex flex-col gap-6 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Mis Comidas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {meals.length} comida{meals.length !== 1 ? "s" : ""} registrada{meals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} size="md" className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva comida
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap snap-x">
          <button
            onClick={() => setFilterType("")}
            className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterType === ""
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
          >
            Todas
          </button>
          {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterType === type
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MealCardSkeleton key={i} />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400">
          <UtensilsCrossed className="w-12 h-12" strokeWidth={1} />
          <p className="text-sm">
            {search || filterType
              ? "No se encontraron comidas con ese filtro"
              : "Aún no tienes comidas. ¡Agrega tu primera!"}
          </p>
          {!search && !filterType && (
            <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Agregar comida
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {meals.map((meal) => (
              <motion.div
                key={meal._id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <MealCard
                  meal={meal}
                  onEdit={openEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMeal?._id ? "Editar comida" : "Nueva comida"}
      >
        <MealForm
          initial={editingMeal}
          onSubmit={handleFormSubmit}
          onCancel={() => setModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </PageTransition>
  );
}
