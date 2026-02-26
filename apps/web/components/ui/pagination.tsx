"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/shared/utils";

export type PaginationPage = number | "ellipsis";

type PaginationAllLink = {
  active: boolean;
  label?: string;
  paramKey?: string;
  paramValue?: string;
};

type PaginationNavProps = {
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
  basePath?: string;
  maxVisible?: number;
  pageParamKey?: string;
  label?: string;
  className?: string;
  showAll?: PaginationAllLink;
};

const DEFAULT_MAX_VISIBLE = 7;

export function buildPaginationHref(basePath: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function getPaginationPages(
  totalPages: number,
  currentPage: number,
  maxVisible: number = DEFAULT_MAX_VISIBLE
): PaginationPage[] {
  if (totalPages <= 0) return [];

  const visible = Math.max(1, maxVisible);
  if (totalPages <= visible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: PaginationPage[] = [1];
  if (currentPage > 4) pages.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 3) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

export function PaginationNav({
  page,
  totalPages,
  params,
  basePath,
  maxVisible,
  pageParamKey = "page",
  label = "Pages:",
  className,
  showAll,
}: PaginationNavProps) {
  const pathname = usePathname();
  const resolvedBasePath = basePath ?? pathname;
  const showAllActive = showAll?.active ?? false;

  if (totalPages <= 1 && !showAllActive) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = showAllActive ? 1 : Math.min(Math.max(1, page), safeTotalPages);
  const pages = getPaginationPages(safeTotalPages, currentPage, maxVisible ?? DEFAULT_MAX_VISIBLE);
  const sharedParams = params ?? {};

  const buildPageHref = (pageNumber?: number, extraParams?: Record<string, string | undefined>) =>
    buildPaginationHref(resolvedBasePath, {
      ...sharedParams,
      ...extraParams,
      [pageParamKey]: pageNumber && pageNumber !== 1 ? String(pageNumber) : undefined,
    });

  const showNext = !showAllActive && currentPage < safeTotalPages;

  return (
    <nav
      className={cn("flex items-baseline gap-0.5 text-[15px]", className)}
      aria-label="Pagination"
    >
      <span className="text-muted-foreground font-medium">{label}</span>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="text-muted-foreground px-1">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildPageHref(p)}
            className={cn(
              "px-1 py-px transition-colors",
              !showAllActive && p === page
                ? "text-foreground font-bold"
                : "text-primary hover:text-primary/80 hover:underline"
            )}
          >
            {p}
          </Link>
        )
      )}
      {showNext && (
        <Link
          href={buildPageHref(currentPage + 1)}
          className="text-primary hover:text-primary/80 px-1 py-px transition-colors hover:underline"
        >
          »
        </Link>
      )}
      {showAll && (
        <Link
          href={buildPaginationHref(resolvedBasePath, {
            ...sharedParams,
            [pageParamKey]: undefined,
            [showAll.paramKey ?? "all"]: showAll.paramValue ?? "1",
          })}
          className={cn(
            "ml-0.5 px-1 py-px transition-colors",
            showAllActive
              ? "text-foreground font-bold"
              : "text-primary hover:text-primary/80 hover:underline"
          )}
        >
          {showAll.label ?? "All"}
        </Link>
      )}
    </nav>
  );
}
