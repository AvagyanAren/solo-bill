import { redirect } from "next/navigation";

import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { getPublicDemoConfig } from "@/lib/public-demo";
import { getSession } from "@/lib/session";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { showBanner, demoEmail } = getPublicDemoConfig();

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      {showBanner ? (
        <div
          className="shrink-0 border-b border-fg-warning-secondary bg-warning-primary px-4 py-2.5 text-center text-sm text-primary md:px-8"
          role="status"
        >
          <strong className="text-warning-primary">Public demo:</strong> you&apos;re using the shared{" "}
          <span className="font-mono text-secondary">{demoEmail}</span> account with no sign-in. Data is
          visible to all visitors. Not for private use.
        </div>
      ) : null}
      <AuthenticatedLayout userEmail={session.email}>{children}</AuthenticatedLayout>
    </div>
  );
}
