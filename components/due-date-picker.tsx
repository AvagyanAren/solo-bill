"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import { parseDate, type DateValue } from "@internationalized/date";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";

import {
  CalendarPopoverFrame,
  SoloCalendar,
  calendarPopoverClassName,
} from "@/components/calendar-ui";
import { Label } from "@/components/base/input/label";
import { cx } from "@/lib/utils/cx";

type DueDatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
};

function formatDueDateLabel(value: string): string {
  if (!value) {
    return "Select due date";
  }
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function toCalendarDate(value: string) {
  if (!value) {
    return null;
  }
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

export function DueDatePicker({
  id,
  value,
  onChange,
  required,
  label = "Due date",
}: DueDatePickerProps) {
  const [open, setOpen] = useState(false);
  const dateValue = useMemo(() => toCalendarDate(value), [value]);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} isRequired={required}>
        {label}
      </Label>
      <AriaDialogTrigger isOpen={open} onOpenChange={setOpen}>
        <AriaButton
          id={id}
          aria-required={required || undefined}
          className={cx(
            "flex min-h-11 w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-left text-sm font-medium text-primary shadow-xs ring-1 ring-primary transition-colors outline-none ring-inset hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-brand pressed:bg-secondary/50",
            !value && "text-tertiary",
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-tertiary" aria-hidden />
          <span>{formatDueDateLabel(value)}</span>
        </AriaButton>
        <AriaPopover
          placement="bottom start"
          offset={8}
          className={(state) => cx(calendarPopoverClassName(state), "w-auto max-w-[calc(100vw-2rem)]")}
        >
          <AriaDialog className="outline-hidden" aria-label="Choose due date">
            {({ close }) => (
              <CalendarPopoverFrame>
                <SoloCalendar
                  aria-label="Due date"
                  value={dateValue}
                  onChange={(next: DateValue) => {
                    onChange(next.toString());
                    close();
                  }}
                />
              </CalendarPopoverFrame>
            )}
          </AriaDialog>
        </AriaPopover>
      </AriaDialogTrigger>
    </div>
  );
}
