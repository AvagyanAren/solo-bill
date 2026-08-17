"use client";

import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  RangeCalendar as AriaRangeCalendar,
  type CalendarProps as AriaCalendarProps,
  type DateValue,
  type RangeCalendarProps as AriaRangeCalendarProps,
} from "react-aria-components";

import { cx } from "@/lib/utils/cx";

export function CalendarPopoverFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-xl border border-secondary bg-primary p-4 shadow-lg", className)}>
      {children}
    </div>
  );
}

export function CalendarNavHeader({ className }: { className?: string }) {
  return (
    <header className={cx("mb-4 flex items-center justify-between gap-2", className)}>
      <AriaButton
        slot="previous"
        className="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-lg text-fg-quaternary outline-none hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand pressed:bg-primary_hover"
        aria-label="Previous"
      >
        <ChevronLeft className="size-4" />
      </AriaButton>
      <CalendarHeading className="text-sm font-medium text-primary" />
      <AriaButton
        slot="next"
        className="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-lg text-fg-quaternary outline-none hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand pressed:bg-primary_hover"
        aria-label="Next"
      >
        <ChevronRight className="size-4" />
      </AriaButton>
    </header>
  );
}

function calendarCellClassName({
  isDisabled,
  isFocusVisible,
  isHovered,
  isOutsideMonth,
  isSelected,
  isSelectionEnd,
  isSelectionStart,
  isUnavailable,
}: {
  isDisabled: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  isOutsideMonth: boolean;
  isSelected: boolean;
  isSelectionEnd: boolean;
  isSelectionStart: boolean;
  isUnavailable: boolean;
}) {
  const isRangeEdge = isSelectionStart || isSelectionEnd;
  const isRangeMiddle = isSelected && !isRangeEdge;
  // Single-date calendars only set `isSelected` (no range edges).
  const isSolidSelected = isRangeEdge || (isSelected && !isSelectionStart && !isSelectionEnd);

  return cx(
    "relative my-0.5 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md text-sm outline-none",
    isOutsideMonth && "invisible",
    !isSelected && !isDisabled && "cursor-pointer text-primary",
    isHovered && !isSelected && !isDisabled && "bg-secondary",
    isFocusVisible && "z-10 ring-2 ring-focus-ring ring-inset",
    (isDisabled || isUnavailable) && "cursor-default text-quaternary opacity-40",
    isRangeMiddle && "cursor-pointer rounded-none bg-brand-solid/15 text-primary",
    isSolidSelected && !isRangeMiddle && "cursor-pointer bg-brand-solid text-fg-white",
  );
}

function MonthGrid({
  offset,
}: {
  offset?: { months: number };
}) {
  return (
    <CalendarGrid
      offset={offset}
      weekdayStyle="short"
      className="min-w-[15.5rem] border-separate border-spacing-0"
    >
      <CalendarGridHeader>
        {(day) => (
          <CalendarHeaderCell className="pb-2 text-center text-xs font-medium text-tertiary">
            {day}
          </CalendarHeaderCell>
        )}
      </CalendarGridHeader>
      <CalendarGridBody>
        {(date) => <CalendarCell date={date} className={calendarCellClassName} />}
      </CalendarGridBody>
    </CalendarGrid>
  );
}

export function SoloCalendar<T extends DateValue>({
  className,
  ...props
}: AriaCalendarProps<T>) {
  return (
    <AriaCalendar
      {...props}
      firstDayOfWeek="mon"
      className={(state) =>
        cx("min-w-[15.5rem]", typeof className === "function" ? className(state) : className)
      }
    >
      <CalendarNavHeader />
      <MonthGrid />
    </AriaCalendar>
  );
}

export function SoloRangeCalendar<T extends DateValue>({
  className,
  ...props
}: AriaRangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      {...props}
      firstDayOfWeek="mon"
      visibleDuration={{ months: 2 }}
      className={(state) =>
        cx("w-full", typeof className === "function" ? className(state) : className)
      }
    >
      <CalendarNavHeader />
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <MonthGrid />
        <MonthGrid offset={{ months: 1 }} />
      </div>
    </AriaRangeCalendar>
  );
}

export const calendarPopoverClassName = (state: {
  isEntering: boolean;
  isExiting: boolean;
}) =>
  cx(
    "origin-(--trigger-anchor-point) overflow-x-auto overflow-y-auto rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt outline-hidden will-change-transform",
    state.isEntering &&
      "duration-150 ease-out animate-in fade-in placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
    state.isExiting &&
      "duration-100 ease-in animate-out fade-out placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
  );
