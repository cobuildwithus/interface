import { ReactNode } from "react";

type RevnetBalanceRowProps = {
  label: string;
  value: ReactNode;
};

export function RevnetBalanceRow({ label, value }: RevnetBalanceRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
