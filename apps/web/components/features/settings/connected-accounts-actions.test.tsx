/**
 * @vitest-environment happy-dom
 */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConnectedAccountsActions } from "./connected-accounts-actions";

describe("ConnectedAccountsActions", () => {
  it("does not evaluate linked-account hooks during server render", () => {
    expect(() =>
      renderToString(
        <ConnectedAccountsActions
          address={`0x${"1".repeat(40)}`}
          farcasterAccount={null}
          twitterAccount={null}
          signerStatus={{
            fid: null,
            hasSigner: false,
            signerPermissions: null,
            neynarPermissions: null,
            neynarStatus: null,
            neynarError: null,
            updatedAt: null,
          }}
          initialLinkedAccountsResponse={{
            address: `0x${"1".repeat(40)}`,
            accounts: [],
          }}
          initialSignerIdentityKey="test-identity"
        />
      )
    ).not.toThrow();
  });
});
