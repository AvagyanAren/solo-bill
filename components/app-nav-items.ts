import {
  File06,
  HomeLine,
  Settings01,
  Users01,
} from "@untitledui/icons";

export type AppNavItem = {
  href: string;
  label: string;
  icon: typeof HomeLine;
  match: (pathname: string) => boolean;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: HomeLine,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: Users01,
    match: (pathname) => pathname.startsWith("/dashboard/clients"),
  },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: File06,
    match: (pathname) =>
      pathname.startsWith("/dashboard/invoices") ||
      (pathname.startsWith("/invoice/") && !pathname.startsWith("/invoice/new")),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings01,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
];
