"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al registrarse");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
        Crear cuenta
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="name" label="Nombre" placeholder="Tu nombre" value={form.name} onChange={update("name")} required />
        <Input id="email" label="Email" type="email" placeholder="tu@email.com" value={form.email} onChange={update("email")} required autoComplete="email" />
        <Input id="password" label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={update("password")} required autoComplete="new-password" />
        <Input id="confirm" label="Confirmar contraseña" type="password" placeholder="••••••••" value={form.confirm} onChange={update("confirm")} required autoComplete="new-password" />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </Card>
  );
}
