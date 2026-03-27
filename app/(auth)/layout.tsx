import { Leaf } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900 mb-4">
            <Leaf className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            MealWeaver
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Planificador inteligente de menús
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
