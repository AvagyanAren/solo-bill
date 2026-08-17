import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cx } from "@/lib/utils/cx";
import { isPublicDemoMode } from "@/lib/public-demo";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  const publicDemo = isPublicDemoMode();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-primary p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-display-xs font-semibold tracking-tight">SoloBill</CardTitle>
          <CardDescription>
            Local-first invoicing for freelancers: draft from plain text with AI, export PDFs,
            track payments manually, and send mock or manual reminders — no Stripe or automatic
            cron required.
            {publicDemo && session
              ? " This deployment is a public demo: open the dashboard without signing in."
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {session ? (
            <Link href="/dashboard" className={cx(buttonVariants(), "w-full justify-center")}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={cx(buttonVariants(), "w-full justify-center")}>
                Sign in
              </Link>
              <Link
                href="/register"
                className={cx(buttonVariants({ variant: "outline" }), "w-full justify-center")}
              >
                Create account
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
