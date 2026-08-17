import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cx } from "@/lib/utils/cx";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cx("w-full caption-bottom text-sm text-primary", className)} {...props} />
    </div>
  );
}

export function TableCaption({
  className,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption className={cx("mt-4 text-sm text-tertiary", className)} {...props} />
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cx("[&_tr]:border-b [&_tr]:border-secondary", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cx("border-b border-secondary transition-colors hover:bg-secondary", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  scope = "col",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cx("h-11 px-4 text-left align-middle text-xs font-medium text-tertiary", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("px-4 py-3 align-middle", className)} {...props} />;
}
