"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu01, XClose } from "@untitledui/icons";

import { AppSidebar, MobileNavPanel } from "@/components/app-sidebar";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils/cx";

type AuthenticatedLayoutProps = {
  userEmail: string;
  children: React.ReactNode;
};

export function AuthenticatedLayout({ userEmail, children }: AuthenticatedLayoutProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navPathname, setNavPathname] = useState(pathname);

  // Close the drawer when the route changes (e.g. nav link or browser history).
  if (pathname !== navPathname) {
    setNavPathname(pathname);
    if (mobileNavOpen) {
      setMobileNavOpen(false);
    }
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-brand-solid focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary_on-brand focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-brand"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-secondary bg-secondary px-4 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-secondary hover:bg-primary_hover hover:text-secondary_hover"
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="app-mobile-nav"
          onClick={() => setMobileNavOpen(true)}
          iconLeading={Menu01}
        />
        <Link
          href="/dashboard"
          className="rounded-lg text-sm font-semibold text-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          SoloBill
        </Link>
      </header>

      <div className="hidden lg:block">
        <AppSidebar userEmail={userEmail} />
      </div>

      <ModalOverlay
        isOpen={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        isDismissable
        className={cx(
          "items-stretch justify-start p-0 sm:items-stretch sm:justify-start sm:p-0",
          "[--modal-pb:0px] [--modal-pt:0px] sm:[--modal-pb:0px] sm:[--modal-pt:0px]",
        )}
      >
        <Modal
          className={cx(
            "h-full max-h-none w-[min(100%,20rem)] max-w-none rounded-none shadow-xl sm:rounded-none",
            "max-sm:overflow-y-auto",
          )}
        >
          <Dialog className="relative flex h-full max-h-none flex-col outline-hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-2 z-10 size-11 text-secondary hover:bg-primary_hover hover:text-secondary_hover"
              aria-label="Close navigation menu"
              onClick={() => setMobileNavOpen(false)}
              iconLeading={XClose}
            />
            <MobileNavPanel
              userEmail={userEmail}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </Dialog>
        </Modal>
      </ModalOverlay>

      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto outline-none">
        {children}
      </main>
    </div>
  );
}
