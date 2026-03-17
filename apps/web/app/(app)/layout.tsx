import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getSession } from "@/lib/domains/auth/session";
import { getUnreadNotificationsState } from "@/lib/domains/notifications/queries";
import { NotificationsUnreadProvider } from "@/lib/domains/notifications/unread-context";
import { getProfile } from "@/lib/domains/profile/get-profile";
import { getUserResponse } from "@/lib/server/user-response";
import { AuthQueryBoundary } from "@/lib/domains/auth/auth-query-boundary";
import { UserProvider } from "@/lib/domains/auth/user-context";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: LayoutProps) {
  const cookieStorePromise = cookies();
  const sessionPromise = getSession();

  const cookieStore = await cookieStorePromise;
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const session = await sessionPromise;
  const address = session.address ?? null;

  const [profile, unreadNotificationsState] = await Promise.all([
    address ? getProfile(address) : Promise.resolve(undefined),
    address ? getUnreadNotificationsState(address) : Promise.resolve({ count: 0, watermark: "0" }),
  ]);
  const user = getUserResponse(session);

  return (
    <div className="mx-auto min-h-screen">
      <UserProvider value={user}>
        <AuthQueryBoundary />
        <NotificationsUnreadProvider
          key={`notifications:${address ?? "anon"}`}
          initialCount={unreadNotificationsState.count}
          initialWatermark={unreadNotificationsState.watermark}
        >
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar address={session.address} profile={profile} />
            <SidebarInset className="min-w-0">{children}</SidebarInset>
          </SidebarProvider>
        </NotificationsUnreadProvider>
      </UserProvider>
    </div>
  );
}
