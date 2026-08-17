"use client";

import type { ReactNode } from "react";

import {
  Button as UntitledButton,
  type ButtonProps as UntitledButtonProps,
  type CommonProps,
} from "@/components/base/buttons/button";
import { cx } from "@/lib/utils/cx";

type LegacyVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type LegacySize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

const variantToColor: Record<LegacyVariant, NonNullable<CommonProps["color"]>> = {
  default: "primary",
  outline: "secondary",
  secondary: "secondary",
  ghost: "tertiary",
  destructive: "primary-destructive",
  link: "link-color",
};

const sizeToSize: Record<LegacySize, NonNullable<CommonProps["size"]>> = {
  default: "md",
  xs: "xs",
  sm: "sm",
  lg: "lg",
  icon: "md",
  "icon-xs": "xs",
  "icon-sm": "sm",
  "icon-lg": "lg",
};

export type ButtonProps = Omit<UntitledButtonProps, "color" | "size" | "isDisabled"> & {
  variant?: LegacyVariant;
  size?: LegacySize;
  disabled?: boolean;
  children?: ReactNode;
  onClick?: () => void;
  title?: string;
  tabIndex?: number;
};

export function Button({
  variant = "default",
  size = "default",
  disabled,
  className,
  children,
  onClick,
  onPress,
  isLoading,
  title,
  tabIndex,
  ...props
}: ButtonProps) {
  const mappedSize = sizeToSize[size];

  return (
    <UntitledButton
      {...props}
      color={variantToColor[variant]}
      size={mappedSize}
      isDisabled={disabled}
      isLoading={isLoading}
      className={cx(className)}
      onPress={onPress ?? onClick}
      // React Aria Button forwards unknown DOM props via spread in practice; keep a11y attrs.
      {...({ title, tabIndex } as object)}
    >
      {children}
    </UntitledButton>
  );
}
