"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { User, Settings, Check } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/PageTransition";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  preferences: {
    mealsPerDay: 2 | 3;
    restrictions: string[];
  };
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: () => fetch("/api/user").then((r) => r.json()),
  });

  const [name, setName] = useState(profile?.name ?? session?.user?.name ?? "");
  const [mealsPerDay, setMealsPerDay] = useState<2 | 3>(profile?.preferences?.mealsPerDay ?? 3);
  const [restrictionsText, setRestrictionsText] = useState(
    profile?.preferences?.restrictions?.join(", ") ?? ""
  );

  // Sync local state when profile loads
  if (profile && name === "") {
    setName(profile.name);
    setMealsPerDay(profile.preferences.mealsPerDay);
    setRestrictionsText(profile.preferences.restrictions.join(", "));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const restrictions = restrictionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          preferences: { mealsPerDay, restrictions },
        }),
      });
      if (!res.ok) throw new Error("Error guardando");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      update({ name });
      setSaved(true);
      toast.success("Perfil actualizado");
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageTransition className="flex flex-col gap-6 max-w-lg mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
          Mi Perfil
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {session?.user?.email}
        </p>
      </div>

      {/* Personal info */}
      <Card className="p-5 flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <User className="w-4 h-4 text-emerald-500" />
          Información personal
        </h2>
        <Input
          id="profile-name"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
        />
      </Card>

      {/* Preferences */}
      <Card className="p-5 flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Settings className="w-4 h-4 text-emerald-500" />
          Preferencias
        </h2>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Comidas por día
          </span>
          <div className="flex gap-2">
            {([2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMealsPerDay(n)}
                className={`
                  flex-1 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${mealsPerDay === n
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300"}
                `}
              >
                {n} comidas
              </button>
            ))}
          </div>
        </div>

        <Input
          id="profile-restrictions"
          label="Restricciones alimentarias (separadas por coma)"
          placeholder="Ej: sin gluten, sin lactosa, vegetariano"
          value={restrictionsText}
          onChange={(e) => setRestrictionsText(e.target.value)}
        />
      </Card>

      <Button
        onClick={() => mutation.mutate()}
        loading={mutation.isPending}
        className="gap-2 self-start"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Guardado
          </>
        ) : (
          "Guardar cambios"
        )}
      </Button>
    </PageTransition>
  );
}
