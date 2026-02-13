import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function GoalPageLayout({ children, sidebar }: Props) {
  return (
    <main className="w-full p-4 md:px-6 md:py-4">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1">{children}</section>
        <aside className="flex w-full flex-col gap-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:w-[320px] lg:self-start lg:overflow-y-auto">
          {sidebar}
        </aside>
      </div>
    </main>
  );
}
