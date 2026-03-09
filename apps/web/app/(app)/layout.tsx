import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getSession } from "@/lib/domains/auth/session";
import { getUnreadNotificationsCount } from "@/lib/domains/notifications/queries";
import { NotificationsUnreadProvider } from "@/lib/domains/notifications/unread-context";
import { getProfile } from "@/lib/domains/profile/get-profile";
import { getUserResponse } from "@/lib/server/user-response";
import { UserProvider } from "@/lib/domains/auth/user-context";
import { WalletIdentityGuard } from "@/components/features/auth/wallet-identity-guard";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: LayoutProps) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const session = await getSession();
  const address = session.address ?? null;

  const [profile, unreadNotificationsCount] = await Promise.all([
    address ? getProfile(address) : Promise.resolve(undefined),
    address ? getUnreadNotificationsCount(address) : Promise.resolve(0),
  ]);
  const user = getUserResponse(session);

  return (
    <div className="mx-auto min-h-screen">
      <UserProvider value={user}>
        <WalletIdentityGuard />
        <NotificationsUnreadProvider initialCount={unreadNotificationsCount}>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar
              address={session.address}
              profile={profile}
              unreadNotificationsCount={unreadNotificationsCount}
            />
            <SidebarInset className="min-w-0">{children}</SidebarInset>
          </SidebarProvider>
        </NotificationsUnreadProvider>
      </UserProvider>
    </div>
  );
}
