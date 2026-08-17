import Link from "next/link";

import { ClientForm } from "@/components/client-form";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import { cx } from "@/lib/utils/cx";

export default function NewClientPage() {
  return (
    <PageShell
      title="New client"
      description="Add someone you invoice."
      lead={
        <Link
          href="/dashboard/clients"
          className={cx(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}
        >
          ← Back to clients
        </Link>
      }
    >
      <ClientForm mode="create" />
    </PageShell>
  );
}
