"use client";

import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils/cx";

type ThemeToggleProps = {
  collapsed?: boolean;
  showLabel?: boolean;
};

const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

const THEME_CYCLE = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof THEME_CYCLE)[number];

function normalizeTheme(theme: string | undefined): ThemeChoice {
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }
  return "system";
}

export function ThemeToggle({ collapsed = false, showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );

  const current = normalizeTheme(theme);
  const label = !hydrated
    ? "Theme"
    : current === "system"
      ? "System theme"
      : current === "dark"
        ? "Dark mode"
        : "Light mode";
  const Icon = !hydrated
    ? Monitor01
    : current === "system"
      ? Monitor01
      : current === "dark"
        ? Moon01
        : Sun;

  function cycleTheme() {
    const index = THEME_CYCLE.indexOf(current);
    const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={collapsed && hydrated ? "icon" : "default"}
      className={cx(
        "w-full border-secondary bg-transparent text-secondary hover:bg-primary_hover hover:text-secondary_hover",
        collapsed && hydrated ? "size-11" : "min-h-11 justify-start gap-2",
      )}
      onClick={cycleTheme}
      aria-label={`Theme: ${label}. Click to change.`}
      title={collapsed && hydrated ? label : undefined}
      iconLeading={collapsed && hydrated ? Icon : undefined}
    >
      {!(collapsed && hydrated) ? (
        <>
          <Icon className="size-5 shrink-0" aria-hidden />
          {showLabel ? <span>{label}</span> : null}
        </>
      ) : null}
    </Button>
  );
}
