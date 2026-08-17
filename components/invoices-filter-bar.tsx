"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar, ChevronLeft, ChevronRight, User01 } from "@untitledui/icons";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";

import { InvoiceRangeCalendar } from "@/components/invoice-range-calendar";
import { calendarPopoverClassName } from "@/components/calendar-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Select } from "@/components/base/select/select";
import { cx } from "@/lib/utils/cx";
import {
  formatPeriodToolbarLabel,
  shiftAnchorByWeeks,
  shiftCustomRange,
  type InvoiceDateRange,
} from "@/lib/invoice-period";
import { INVOICE_STATUSES } from "@/lib/billing/lifecycle";

export type InvoiceClientOption = {
  id: string;
  name: string;
  email: string;
};

type InvoicesFilterBarProps = {
  clients: InvoiceClientOption[];
  range: InvoiceDateRange;
  clientId: string | null;
  status: string | null;
  overdue: boolean;
  query: string;
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  ...INVOICE_STATUSES.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
  })),
];

const ALL_CLIENTS_KEY = "all";

export function InvoicesFilterBar({
  clients,
  range,
  clientId,
  status,
  overdue,
  query,
}: InvoicesFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(query);
  const [prevQuery, setPrevQuery] = useState(query);

  if (query !== prevQuery) {
    setPrevQuery(query);
    setSearchValue(query);
  }

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const periodLabel = formatPeriodToolbarLabel(range);

  const clientItems = [
    { id: ALL_CLIENTS_KEY, label: "All clients" },
    ...clients.map((client) => ({
      id: client.id,
      label: client.name,
      supportingText: client.email,
    })),
  ];

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    startTransition(() => {
      router.push(`/dashboard/invoices?${params.toString()}`);
    });
  }

  function shiftPeriod(deltaWeeks: number) {
    if (range.preset === "custom" && range.fromInput && range.toInput) {
      const shifted = shiftCustomRange(range.fromInput, range.toInput, deltaWeeks);
      pushParams({
        period: "custom",
        from: shifted.from,
        to: shifted.to,
        anchor: undefined,
      });
      return;
    }
    if (range.preset === "all") {
      return;
    }
    pushParams({
      period: "week",
      anchor: shiftAnchorByWeeks(range.anchorInput, deltaWeeks),
      from: undefined,
      to: undefined,
    });
  }

  function applyCustomRange(from: string, to: string) {
    pushParams({ period: "custom", from, to, anchor: undefined });
    setCalendarOpen(false);
  }

  function selectClient(id: string | null) {
    pushParams({ clientId: id ?? undefined });
  }

  function clearFilters() {
    startTransition(() => {
      router.push("/dashboard/invoices");
    });
  }

  const canShiftPeriod = range.preset !== "all";
  const hasActiveFilters =
    Boolean(clientId) ||
    Boolean(status) ||
    overdue ||
    Boolean(query) ||
    range.preset !== "all";

  return (
    <div className="space-y-4 border-b border-secondary pb-4" aria-label="Invoice filters">
      <div className="flex flex-wrap items-end gap-3" role="toolbar" aria-label="Invoice search and status">
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <Input
            label="Search"
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Title, number, client…"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                pushParams({ q: searchValue.trim() || undefined });
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={pending}
          onClick={() => pushParams({ q: searchValue.trim() || undefined })}
        >
          Search
        </Button>
        <div className="min-w-[10rem]">
          <NativeSelect
            label="Status"
            value={status ?? ""}
            options={STATUS_OPTIONS}
            onChange={(event) =>
              pushParams({
                status: event.target.value || undefined,
                overdue: undefined,
              })
            }
            selectClassName="min-h-11"
          />
        </div>
        <Button
          type="button"
          variant={overdue ? "default" : "outline"}
          className="min-h-11"
          disabled={pending}
          aria-pressed={overdue}
          onClick={() =>
            pushParams({
              overdue: overdue ? undefined : "1",
              status: undefined,
            })
          }
        >
          Overdue
        </Button>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={pending}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center rounded-lg border border-secondary bg-primary">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-11 min-w-11 rounded-l-lg rounded-r-none"
            disabled={pending || !canShiftPeriod}
            onClick={() => shiftPeriod(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <AriaDialogTrigger isOpen={calendarOpen} onOpenChange={setCalendarOpen}>
            <AriaButton
              isDisabled={pending}
              className="flex min-h-11 items-center gap-2 border-x border-secondary px-3 py-2 text-sm font-medium text-primary outline-none transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset disabled:opacity-50 pressed:bg-secondary/50"
            >
              <Calendar className="size-4 shrink-0 text-tertiary" aria-hidden />
              <span className="whitespace-nowrap">{periodLabel}</span>
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className={(state) =>
                cx(calendarPopoverClassName(state), "w-auto max-w-[calc(100vw-1rem)] p-0")
              }
            >
              <AriaDialog className="outline-hidden" aria-label="Select date range">
                {({ close }) => (
                  <div className="rounded-xl border border-secondary bg-primary p-2 shadow-lg">
                    <div className="mb-2 flex flex-wrap gap-2 px-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => {
                          pushParams({
                            period: "all",
                            from: undefined,
                            to: undefined,
                            anchor: undefined,
                          });
                          close();
                        }}
                      >
                        All time
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => {
                          pushParams({
                            period: "week",
                            from: undefined,
                            to: undefined,
                          });
                          close();
                        }}
                      >
                        This week
                      </Button>
                    </div>
                    <InvoiceRangeCalendar
                      initialFrom={range.fromInput || undefined}
                      initialTo={range.toInput || undefined}
                      onApply={applyCustomRange}
                      onClose={close}
                    />
                  </div>
                )}
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-11 min-w-11 rounded-l-none rounded-r-lg"
            disabled={pending || !canShiftPeriod}
            onClick={() => shiftPeriod(1)}
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {selectedClient ? (
          <p className="text-sm text-tertiary">
            Client is <span className="text-primary">{selectedClient.name}</span>
          </p>
        ) : null}

        <div className="ml-auto min-w-[11rem]">
          <Select
            aria-label="Filter by client"
            selectedKey={clientId ?? ALL_CLIENTS_KEY}
            isDisabled={pending}
            placeholder="Client"
            items={clientItems}
            onSelectionChange={(key) => {
              if (key == null || key === ALL_CLIENTS_KEY) {
                selectClient(null);
                return;
              }
              selectClient(String(key));
            }}
            className="gap-0 [&_button]:min-h-11"
            popoverClassName="min-w-[14rem]"
            icon={User01}
          >
            {(item) => <Select.Item id={item.id} label={item.label} supportingText={item.supportingText} />}
          </Select>
        </div>
      </div>
    </div>
  );
}
