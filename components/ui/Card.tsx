import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        rounded-2xl shadow-sm
        ${hover ? "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
