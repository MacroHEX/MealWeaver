"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { UtensilsCrossed, CalendarDays, CalendarRange, LogOut, Leaf, Home, ShoppingCart, UserCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HouseholdModal } from "@/components/common/HouseholdModal";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/meals", label: "Comidas", icon: UtensilsCrossed },
  { href: "/weekly", label: "Semana", icon: CalendarDays },
  { href: "/monthly", label: "Mes", icon: CalendarRange },
  { href: "/shopping", label: "Compras", icon: ShoppingCart },
  { href: "/profile", label: "Perfil", icon: UserCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [householdOpen, setHouseholdOpen] = useState(false);

  const inHousehold = !!session?.user?.householdId;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500">
              <Leaf className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              MealWeaver
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
                    ${
                      active
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHouseholdOpen(true)}
              aria-label={inHousehold ? "Administrar hogar" : "Crear o unirse a un hogar"}
              title={inHousehold ? "Administrar hogar" : "Crear o unirse a un hogar"}
              className={`
                relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors
                ${
                  inHousehold
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }
              `}
            >
              <Home className="w-4 h-4" />
              {inHousehold && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </button>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-500 gap-1.5"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav (fixed) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`
                  relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5
                  transition-colors active:bg-slate-100 dark:active:bg-slate-800
                  ${
                    active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                  }
                `}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-emerald-500" />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <HouseholdModal open={householdOpen} onClose={() => setHouseholdOpen(false)} />
    </>
  );
}
