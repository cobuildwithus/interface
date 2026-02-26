import { cn } from "@/lib/shared/utils";

type SettingsCardVariant = "default" | "accent";

type SettingsCardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: SettingsCardVariant;
};

type SettingsCardHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

const GRADIENT_VARIANTS: Record<SettingsCardVariant, string> = {
  default: "bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_55%)]",
  accent: "bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.04),_transparent_50%)]",
};

export function SettingsCard({ children, className, variant = "default" }: SettingsCardProps) {
  return (
    <div className={cn("bg-card relative overflow-hidden rounded-xl border p-5", className)}>
      <div className={cn("pointer-events-none absolute inset-0", GRADIENT_VARIANTS[variant])} />
      <div className="relative space-y-6">{children}</div>
    </div>
  );
}

export function SettingsCardHeader({ title, description, action }: SettingsCardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="leading-none font-medium">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
