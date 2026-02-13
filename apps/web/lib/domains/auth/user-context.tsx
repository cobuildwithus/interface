"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserResponse } from "@/lib/domains/auth/user-response-types";

const UserContext = createContext<UserResponse | null>(null);

type UserProviderProps = {
  value: UserResponse;
  children?: ReactNode;
};

export function UserProvider({ value, children }: UserProviderProps) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  return useContext(UserContext);
}
