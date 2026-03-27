"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseña incorrectos");
    } else {
      router.push("/meals");
      router.refresh();
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
        Iniciar sesión
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
          Ingresar
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
          Regístrate
        </Link>
      </p>
    </Card>
  );
}
