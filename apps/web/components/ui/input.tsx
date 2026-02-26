import * as React from "react";

import { cn } from "@/lib/shared/utils";

type InputVariant = "default" | "amount";

const variantStyles: Record<InputVariant, string> = {
  default:
    "h-9 px-3 py-1 text-sm border-input shadow-xs rounded-md border dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  amount:
    "h-full px-4 text-4xl font-mono font-bold tracking-tight border-none shadow-none bg-transparent focus-visible:ring-0",
};

type InputProps = React.ComponentProps<"input"> & {
  variant?: InputVariant;
};

function Input({ className, type, variant = "default", ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-1p-ignore
      data-lpignore="true"
      data-form-type="other"
      data-bwignore="true"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 bg-transparent transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Input };
