import Link from "next/link";

import { ClientForm } from "@/components/client-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewClientPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to clients
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-foreground">New client</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add someone you invoice.</p>
      <div className="mt-8">
        <ClientForm mode="create" />
      </div>
    </div>
  );
}
