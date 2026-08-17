import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils/cx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cx("text-lg font-semibold text-primary", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx("text-sm text-tertiary", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cx("flex items-center p-6 pt-0", className)}>{children}</div>;
}
