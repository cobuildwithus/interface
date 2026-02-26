"use client";

import { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <>
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <SidebarTrigger className="-ml-1" />
      </div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground font-content mt-2 max-w-2xl">{description}</p>
          )}
        </div>
        {children}
      </header>
    </>
  );
}
