"use client";

import { useMemo, useState } from "react";
import { parseDate, type CalendarDate, type DateValue } from "@internationalized/date";

import { Button } from "@/components/ui/button";
import {
  CalendarPopoverFrame,
  SoloRangeCalendar,
} from "@/components/calendar-ui";
import { endOfWeekSunday, startOfWeekMonday, toDateInputValue } from "@/lib/invoice-period";

type InvoiceRangeCalendarProps = {
  initialFrom?: string;
  initialTo?: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
};

type DateRangeValue = {
  start: DateValue;
  end: DateValue;
};

function toCalendarDate(value: string | undefined): CalendarDate | null {
  if (!value) {
    return null;
  }
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function dateValueToInput(value: DateValue): string {
  return value.toString();
}

function calendarDateToLocalDate(value: DateValue): Date {
  return new Date(`${value.toString()}T00:00:00`);
}

export function InvoiceRangeCalendar({
  initialFrom,
  initialTo,
  onApply,
  onClose,
}: InvoiceRangeCalendarProps) {
  const initialRange = useMemo<DateRangeValue | null>(() => {
    const start = toCalendarDate(initialFrom);
    const end = toCalendarDate(initialTo);
    if (start && end) {
      return { start, end };
    }
    if (start) {
      return { start, end: start };
    }
    return null;
  }, [initialFrom, initialTo]);

  const [range, setRange] = useState<DateRangeValue | null>(initialRange);

  function apply() {
    if (range?.start && range.end) {
      onApply(dateValueToInput(range.start), dateValueToInput(range.end));
      onClose();
      return;
    }
    if (range?.start) {
      const startLocal = calendarDateToLocalDate(range.start);
      const weekStart = startOfWeekMonday(startLocal);
      const weekEnd = endOfWeekSunday(weekStart);
      onApply(toDateInputValue(weekStart), toDateInputValue(weekEnd));
      onClose();
    }
  }

  return (
    <CalendarPopoverFrame className="border-0 p-0 shadow-none">
      <SoloRangeCalendar value={range} onChange={setRange} aria-label="Invoice date range" />
      <div className="mt-4 flex justify-end gap-2 border-t border-secondary pt-3">
        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="sm" className="min-h-11" onClick={apply} disabled={!range?.start}>
          Apply
        </Button>
      </div>
    </CalendarPopoverFrame>
  );
}
