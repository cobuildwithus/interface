/**
 * @vitest-environment happy-dom
 */
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "@/lib/domains/auth/user-response-types";
import { UserProvider } from "@/lib/domains/auth/user-context";
import {
  getAuthIdentityKey,
  getFarcasterSignerQueryKey,
  getLinkedAccountsQueryKey,
  getProfileQueryKey,
} from "@/lib/hooks/query-keys";
import { AuthQueryBoundary } from "./auth-query-boundary";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthQueryBoundary", () => {
  it("does not evict queries on initial mount and removes the previous address identity on change", () => {
    const queryClient = new QueryClient();
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const firstUser = createUser({
      address: `0x${"a".repeat(40)}`,
      farcaster: createFarcasterIdentity(7),
    });
    const secondUser = createUser({
      address: `0x${"b".repeat(40)}`,
      farcaster: createFarcasterIdentity(9),
    });

    const { rerender } = renderWithProviders(queryClient, firstUser);

    expect(removeQueries).not.toHaveBeenCalled();

    rerender(
      <QueryClientProvider client={queryClient}>
        <UserProvider value={secondUser}>
          <AuthQueryBoundary />
        </UserProvider>
      </QueryClientProvider>
    );

    const previousIdentityKey = getAuthIdentityKey({
      address: firstUser.address,
      farcasterFid: firstUser.farcaster?.fid ?? null,
    });

    expect(removeQueries).toHaveBeenCalledTimes(3);
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: getLinkedAccountsQueryKey(previousIdentityKey),
      exact: true,
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: getFarcasterSignerQueryKey(previousIdentityKey),
      exact: true,
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: getProfileQueryKey(firstUser.address!),
      exact: true,
    });
  });

  it("omits profile eviction when the previous identity had no address", () => {
    const queryClient = new QueryClient();
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const farcasterOnlyUser = createUser({
      address: null,
      farcaster: createFarcasterIdentity(11),
    });
    const anonymousUser = createUser({ address: null, farcaster: null });

    const { rerender } = renderWithProviders(queryClient, farcasterOnlyUser);

    rerender(
      <QueryClientProvider client={queryClient}>
        <UserProvider value={anonymousUser}>
          <AuthQueryBoundary />
        </UserProvider>
      </QueryClientProvider>
    );

    expect(removeQueries).toHaveBeenCalledTimes(2);
    expect(removeQueries).toHaveBeenNthCalledWith(1, {
      queryKey: getLinkedAccountsQueryKey("farcaster:11"),
      exact: true,
    });
    expect(removeQueries).toHaveBeenNthCalledWith(2, {
      queryKey: getFarcasterSignerQueryKey("farcaster:11"),
      exact: true,
    });
  });
});

function renderWithProviders(queryClient: QueryClient, user: UserResponse) {
  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider value={user}>
        <AuthQueryBoundary />
      </UserProvider>
    </QueryClientProvider>
  );
}

function createUser(overrides: Partial<UserResponse>): UserResponse {
  return {
    address: null,
    farcaster: null,
    twitter: null,
    ...overrides,
  };
}

function createFarcasterIdentity(
  fid: number,
  source: NonNullable<UserResponse["farcaster"]>["source"] = "privy"
) {
  return {
    fid,
    username: null,
    displayName: null,
    pfp: null,
    neynarScore: null,
    source,
  };
}
