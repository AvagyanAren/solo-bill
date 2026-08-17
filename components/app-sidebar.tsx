"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LayoutLeft, LogOut01 } from "@untitledui/icons";
import { Heading } from "react-aria-components";

import { logoutAction } from "@/app/actions/logout";
import { APP_NAV_ITEMS } from "@/components/app-nav-items";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cx } from "@/lib/utils/cx";

const STORAGE_KEY = "solobill-sidebar-collapsed";
const SIDEBAR_STORAGE_EVENT = "solobill-sidebar-storage";

function subscribeToCollapsedState(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, callback);
  };
}

function getCollapsedState() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerCollapsedState() {
  return false;
}

type AppNavLinksProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  navId?: string;
};

export function AppNavLinks({ collapsed = false, onNavigate, navId }: AppNavLinksProps) {
  const pathname = usePathname();
  const showLabels = !collapsed;

  return (
    <nav
      id={navId}
      aria-label="Main"
      className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
    >
      {APP_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cx(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              collapsed ? "justify-center px-2" : "",
              active
                ? "bg-brand-solid text-primary_on-brand"
                : "text-secondary hover:bg-primary_hover hover:text-secondary_hover",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {showLabels ? <span className="truncate">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

type AppNavFooterProps = {
  userEmail: string;
  collapsed?: boolean;
};

export function AppNavFooter({ userEmail, collapsed = false }: AppNavFooterProps) {
  const showLabels = !collapsed;

  return (
    <div className="mt-auto shrink-0 border-t border-secondary p-2">
      {showLabels ? (
        <p className="mb-2 truncate px-3 text-xs text-tertiary" title={userEmail}>
          {userEmail}
        </p>
      ) : null}
      <div className="grid gap-1">
        <ThemeToggle collapsed={collapsed} showLabel={showLabels} />
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size={collapsed ? "icon" : "default"}
            className={cx(
              "w-full border-secondary bg-transparent text-secondary hover:bg-primary_hover hover:text-secondary_hover",
              collapsed ? "size-11" : "min-h-11 justify-start gap-2",
            )}
            aria-label="Log out"
            iconLeading={collapsed ? LogOut01 : undefined}
          >
            {!collapsed ? (
              <>
                <LogOut01 className="size-5 shrink-0" aria-hidden />
                {showLabels ? <span>Log out</span> : null}
              </>
            ) : null}
          </Button>
        </form>
      </div>
    </div>
  );
}

type AppSidebarProps = {
  userEmail: string;
};

/** Desktop sticky sidebar (hidden below lg by the layout). */
export function AppSidebar({ userEmail }: AppSidebarProps) {
  const collapsed = useSyncExternalStore(
    subscribeToCollapsedState,
    getCollapsedState,
    getServerCollapsedState,
  );

  function toggleCollapsed() {
    localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  }

  return (
    <aside
      className={cx(
        "sticky top-0 flex h-svh shrink-0 flex-col border-r border-secondary bg-secondary text-secondary transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[3.75rem]" : "w-60",
      )}
      aria-label="Application"
    >
      <div
        className={cx(
          "flex shrink-0 border-b border-secondary",
          collapsed
            ? "flex-col items-center gap-1 px-2 py-3"
            : "h-14 items-center justify-between px-3",
        )}
      >
        <Link
          href="/dashboard"
          className={cx(
            "rounded-lg font-semibold text-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            collapsed
              ? "flex size-11 items-center justify-center text-sm hover:bg-primary_hover"
              : "truncate text-sm",
          )}
          aria-label={collapsed ? "SoloBill home" : undefined}
        >
          {collapsed ? "SB" : "SoloBill"}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 shrink-0 text-secondary hover:bg-primary_hover hover:text-secondary_hover"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar-nav"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          iconLeading={LayoutLeft}
        />
      </div>

      <AppNavLinks collapsed={collapsed} navId="app-sidebar-nav" />
      <AppNavFooter userEmail={userEmail} collapsed={collapsed} />
    </aside>
  );
}

type MobileNavPanelProps = {
  userEmail: string;
  onNavigate?: () => void;
};

/** Full-label nav panel for the mobile drawer dialog. */
export function MobileNavPanel({ userEmail, onNavigate }: MobileNavPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-secondary text-secondary">
      <div className="flex h-14 shrink-0 items-center border-b border-secondary px-4">
        <Heading slot="title" className="text-sm font-semibold text-secondary">
          SoloBill
        </Heading>
      </div>
      <AppNavLinks onNavigate={onNavigate} navId="app-mobile-nav" />
      <AppNavFooter userEmail={userEmail} />
    </div>
  );
}
