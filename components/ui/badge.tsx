"use client";

import type { ReactNode } from "react";

import { Badge as UntitledBadge } from "@/components/base/badges/badges";
import type { BadgeColors, Sizes } from "@/components/base/badges/badge-types";
import { cx } from "@/lib/utils/cx";

type LegacyVariant =
  | "default"
  | "secondary"
  | "outline"
  | "paid"
  | "unpaid"
  | "overdue"
  | "destructive";

const variantToColor: Record<LegacyVariant, BadgeColors> = {
  default: "brand",
  secondary: "gray",
  outline: "gray",
  paid: "success",
  unpaid: "warning",
  overdue: "error",
  destructive: "error",
};

type BadgeProps = {
  children?: ReactNode;
  className?: string;
  variant?: LegacyVariant;
  color?: BadgeColors;
  size?: Sizes;
  type?: "pill-color" | "color" | "modern";
};

export function Badge({
  children,
  className,
  variant = "default",
  color,
  size = "sm",
  type = "pill-color",
}: BadgeProps) {
  return (
    <UntitledBadge
      type={type}
      size={size}
      color={color ?? variantToColor[variant]}
      className={cx(className)}
    >
      {children}
    </UntitledBadge>
  );
}

export function badgeVariants(options?: { variant?: LegacyVariant; className?: string }) {
  return cx("inline-flex", options?.className);
}
