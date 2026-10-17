import * as React from "react";
import { cn } from "./button";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white text-slate-950 shadow",
        className
      )}
      {...props}
    />
  );
}

