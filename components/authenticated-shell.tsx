import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/logout";
import { Button } from "@/components/ui/button";
import { getPublicDemoConfig } from "@/lib/public-demo";
import { getSession } from "@/lib/session";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { showBanner, demoEmail } = getPublicDemoConfig();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {showBanner ? (
        <div
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-950 dark:text-amber-100 md:px-8"
          role="status"
        >
          <strong>Public demo:</strong> you&apos;re using the shared <span className="font-mono">{demoEmail}</span>{" "}
          account with no sign-in. Data is visible to all visitors. Not for private use.
        </div>
      ) : null}
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
