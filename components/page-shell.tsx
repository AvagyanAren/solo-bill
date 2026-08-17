import type { ReactNode } from "react";

import { cx } from "@/lib/utils/cx";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  "aria-busy"?: boolean | "true" | "false";
  "aria-live"?: "off" | "assertive" | "polite";
};

/** Shared page width + spacing for dashboard and invoice surfaces. */
export function PageContainer({
  children,
  className,
  "aria-busy": ariaBusy,
  "aria-live": ariaLive,
}: PageContainerProps) {
  return (
    <div
      className={cx(
        "mx-auto w-full max-w-container px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
        className,
      )}
      aria-busy={ariaBusy}
      aria-live={ariaLive}
    >
      {children}
    </div>
  );
}

type PageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Optional content above the title row (e.g. back link). */
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Consistent page header (title, description, actions) inside PageContainer.
 * Content spacing defaults to mt-8; override with contentClassName when needed.
 */
export function PageShell({
  title,
  description,
  actions,
  lead,
  children,
  className,
  contentClassName,
}: PageShellProps) {
  return (
    <PageContainer className={className}>
      {lead ? <div className="mb-6">{lead}</div> : null}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-primary">{title}</h1>
          {description ? (
            typeof description === "string" ? (
              <p className="mt-1 text-sm text-tertiary">{description}</p>
            ) : (
              <div className="mt-1 text-sm text-tertiary">{description}</div>
            )
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children != null ? (
        <div className={cx("mt-8", contentClassName)}>{children}</div>
      ) : null}
    </PageContainer>
  );
}
