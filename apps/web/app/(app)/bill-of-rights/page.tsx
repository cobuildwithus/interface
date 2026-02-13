import { buildPageMetadata } from "@/lib/shared/page-metadata";
import BillOfRightsClient from "./BillOfRightsClient";

export const metadata = buildPageMetadata({
  title: "Cobuild Bill of Rights",
  description:
    "A constitution for open, fair, and verifiable coordination across Cobuild communities.",
});

export default function BillOfRightsPage() {
  return <BillOfRightsClient />;
}
