import * as React from "react";
import { cn } from "./button";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "border-transparent bg-slate-900 text-white",
        variant === "secondary" && "border-transparent bg-slate-100 text-slate-900",
        variant === "outline" && "text-slate-950",
        className
      )}
      {...props}
    />
  );
}

