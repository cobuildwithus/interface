import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getRoundById } from "@/lib/domains/rounds/rounds";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function truncateTitle(title: string, maxLength = 30): string {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength)}…`;
}

export default async function RoundLayout({ children, params }: LayoutProps) {
  const { id } = await params;

  const round = await getRoundById(id);
  if (!round) notFound();

  const displayTitle = truncateTitle(round.title ?? `Round #${id}`);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator orientation="vertical" className="h-4 md:hidden" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/rounds">Rounds</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/rounds/${id}`}>{displayTitle}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      {children}
    </>
  );
}
