import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/logout";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-4 md:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold">
            SoloBill
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/dashboard/clients" className="hover:text-foreground">
              Clients
            </Link>
            <Link href="/invoice/new" className="hover:text-foreground">
              New invoice
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{session.email}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
