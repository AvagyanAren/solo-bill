"use client";

import type { ReactNode } from "react";
import {
  DialogTrigger as AriaDialogTrigger,
  Heading,
} from "react-aria-components";

import { Button } from "@/components/base/buttons/button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { cx } from "@/lib/utils/cx";

export function AlertDialog({ children }: { children: ReactNode }) {
  return <AriaDialogTrigger>{children}</AriaDialogTrigger>;
}

export function AlertDialogTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button color="primary-destructive" size="sm" className={className}>
      {children}
    </Button>
  );
}

export function AlertDialogPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AlertDialogBackdrop() {
  return null;
}

export function AlertDialogPopup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ModalOverlay>
      <Modal className={cx("w-full max-w-md p-6", className)}>
        <Dialog>{children}</Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-2 text-left", className)} {...props} />;
}

export function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Heading slot="title" className={cx("text-lg font-semibold text-primary", className)}>
      {children}
    </Heading>
  );
}

export function AlertDialogDescription({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <p className={cx("text-sm text-tertiary", className)}>{children}</p>;
}

export function AlertDialogCancel({
  children,
  disabled,
  className,
}: {
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button color="secondary" size="md" isDisabled={disabled} className={className} slot="close">
      {children}
    </Button>
  );
}

export function AlertDialogAction({
  children,
  disabled,
  className,
  onClick,
}: {
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      color="primary-destructive"
      size="md"
      isDisabled={disabled}
      className={className}
      onPress={onClick}
    >
      {children}
    </Button>
  );
}
