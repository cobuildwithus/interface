"use client";

import { LogIn } from "lucide-react";
import { AuthButton } from "@/components/ui/auth-button";

export function SidebarUserMenuConnectButton() {
  return (
    <AuthButton className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-full md:size-11 lg:h-11 lg:w-full">
      <span className="md:hidden lg:inline">Connect</span>
      <LogIn className="hidden size-5 md:block lg:hidden" />
    </AuthButton>
  );
}
