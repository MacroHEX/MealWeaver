import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`
            px-3 py-2 rounded-xl border text-sm
            bg-white dark:bg-slate-900
            text-slate-900 dark:text-slate-100
            border-slate-300 dark:border-slate-600
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500 focus:ring-red-500" : ""}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
