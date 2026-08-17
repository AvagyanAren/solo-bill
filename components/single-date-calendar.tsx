"use client";

import { useMemo } from "react";
import { parseDate, type DateValue } from "@internationalized/date";

import { CalendarPopoverFrame, SoloCalendar } from "@/components/calendar-ui";

type SingleDateCalendarProps = {
  value?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

function toCalendarDate(value: string | undefined) {
  if (!value) {
    return null;
  }
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

export function SingleDateCalendar({ value, onSelect, onClose }: SingleDateCalendarProps) {
  const dateValue = useMemo(() => toCalendarDate(value), [value]);

  return (
    <CalendarPopoverFrame>
      <SoloCalendar
        aria-label="Select date"
        value={dateValue}
        onChange={(next: DateValue) => {
          onSelect(next.toString());
          onClose();
        }}
      />
    </CalendarPopoverFrame>
  );
}
