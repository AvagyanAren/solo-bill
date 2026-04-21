import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">SoloBill</CardTitle>
          <CardDescription>
            AI-powered invoicing for freelancers — from plain text to PDF, with payment tracking and
            reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {session ? (
            <Link href="/dashboard" className={cn(buttonVariants(), "w-full justify-center")}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants(), "w-full justify-center")}>
                Sign in
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
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
