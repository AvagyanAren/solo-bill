"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  upsertBusinessSettingsAction,
  type SettingsFormState,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/providers/toast-provider";

const initial: SettingsFormState = {};

export type BusinessSettingsDefaults = {
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  defaultCurrency: string;
  locale: string;
  defaultTaxRatePercent: number;
  defaultPaymentTermsDays: number;
  invoicePrefix: string;
  nextInvoiceSequence: number;
  remindersEnabled: boolean;
  reminderDaysAfterDue: number;
  reminderSubject: string;
  reminderBody: string;
};

const CURRENCY_OPTIONS = [
  { label: "USD — US Dollar", value: "USD" },
  { label: "EUR — Euro", value: "EUR" },
  { label: "GBP — British Pound", value: "GBP" },
  { label: "CAD — Canadian Dollar", value: "CAD" },
  { label: "AUD — Australian Dollar", value: "AUD" },
];

const LOCALE_OPTIONS = [
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "English (CA)", value: "en-CA" },
  { label: "French (FR)", value: "fr-FR" },
  { label: "German (DE)", value: "de-DE" },
];

type BusinessSettingsFormProps = {
  defaults: BusinessSettingsDefaults;
};

export function BusinessSettingsForm({ defaults }: BusinessSettingsFormProps) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(
    upsertBusinessSettingsAction,
    initial,
  );
  const lastAnnounced = useRef<SettingsFormState | null>(null);

  useEffect(() => {
    if (!state || state === lastAnnounced.current) {
      return;
    }
    if (state.ok) {
      toast({
        title: "Settings saved",
        description: "Your business profile and reminder defaults were updated.",
        tone: "success",
      });
      lastAnnounced.current = state;
      return;
    }
    if (state.error) {
      toast({
        title: "Could not save settings",
        description: state.error,
        tone: "error",
      });
      lastAnnounced.current = state;
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-10">
      <section className="space-y-4" aria-labelledby="business-identity-heading">
        <div>
          <h2 id="business-identity-heading" className="text-base font-semibold text-primary">
            Business identity
          </h2>
          <p className="mt-1 text-sm text-tertiary">
            Shown on invoices, PDFs, and mock email delivery.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Legal name"
            name="legalName"
            defaultValue={defaults.legalName}
            autoComplete="organization"
            isInvalid={Boolean(state?.fieldErrors?.legalName)}
            hint={state?.fieldErrors?.legalName}
          />
          <Input
            label="Display name"
            name="displayName"
            defaultValue={defaults.displayName}
            autoComplete="organization"
            isInvalid={Boolean(state?.fieldErrors?.displayName)}
            hint={state?.fieldErrors?.displayName}
          />
          <Input
            label="Business email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            autoComplete="email"
            isInvalid={Boolean(state?.fieldErrors?.email)}
            hint={state?.fieldErrors?.email}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={defaults.phone}
            autoComplete="tel"
            isInvalid={Boolean(state?.fieldErrors?.phone)}
            hint={state?.fieldErrors?.phone}
          />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="business-address-heading">
        <div>
          <h2 id="business-address-heading" className="text-base font-semibold text-primary">
            Address
          </h2>
          <p className="mt-1 text-sm text-tertiary">Optional billing address for invoices.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Address line 1"
              name="addressLine1"
              defaultValue={defaults.addressLine1}
              autoComplete="address-line1"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address line 2"
              name="addressLine2"
              defaultValue={defaults.addressLine2}
              autoComplete="address-line2"
            />
          </div>
          <Input label="City" name="city" defaultValue={defaults.city} autoComplete="address-level2" />
          <Input
            label="State / region"
            name="state"
            defaultValue={defaults.state}
            autoComplete="address-level1"
          />
          <Input
            label="Postal code"
            name="postalCode"
            defaultValue={defaults.postalCode}
            autoComplete="postal-code"
          />
          <Input
            label="Country code"
            name="countryCode"
            defaultValue={defaults.countryCode}
            placeholder="US"
            autoComplete="country"
            hint={state?.fieldErrors?.countryCode ?? "Two-letter ISO code (e.g. US)."}
            isInvalid={Boolean(state?.fieldErrors?.countryCode)}
          />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="billing-defaults-heading">
        <div>
          <h2 id="billing-defaults-heading" className="text-base font-semibold text-primary">
            Billing defaults
          </h2>
          <p className="mt-1 text-sm text-tertiary">
            Currency, locale, tax, payment terms, and invoice numbering.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NativeSelect
            label="Default currency"
            name="defaultCurrency"
            defaultValue={defaults.defaultCurrency}
            options={CURRENCY_OPTIONS}
            selectClassName="min-h-11"
          />
          <NativeSelect
            label="Locale"
            name="locale"
            defaultValue={defaults.locale}
            options={LOCALE_OPTIONS}
            selectClassName="min-h-11"
          />
          <Input
            label="Default tax rate (%)"
            name="defaultTaxRatePercent"
            type="number"
            defaultValue={String(defaults.defaultTaxRatePercent)}
            isInvalid={Boolean(state?.fieldErrors?.defaultTaxRatePercent)}
            hint={state?.fieldErrors?.defaultTaxRatePercent}
          />
          <Input
            label="Payment terms (days)"
            name="defaultPaymentTermsDays"
            type="number"
            defaultValue={String(defaults.defaultPaymentTermsDays)}
            isInvalid={Boolean(state?.fieldErrors?.defaultPaymentTermsDays)}
            hint={state?.fieldErrors?.defaultPaymentTermsDays}
          />
          <Input
            label="Invoice prefix"
            name="invoicePrefix"
            defaultValue={defaults.invoicePrefix}
            isInvalid={Boolean(state?.fieldErrors?.invoicePrefix)}
            hint={state?.fieldErrors?.invoicePrefix}
          />
          <Input
            label="Next invoice sequence"
            name="nextInvoiceSequence"
            type="number"
            defaultValue={String(defaults.nextInvoiceSequence)}
            isInvalid={Boolean(state?.fieldErrors?.nextInvoiceSequence)}
            hint={state?.fieldErrors?.nextInvoiceSequence}
          />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="reminders-heading">
        <div>
          <h2 id="reminders-heading" className="text-base font-semibold text-primary">
            Payment reminders
          </h2>
          <p className="mt-1 text-sm text-tertiary">
            Defaults for manual mock reminders. No automatic cron or Stripe billing is enabled.
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg ring-1 ring-secondary ring-inset px-3 py-3">
          <input
            type="checkbox"
            name="remindersEnabled"
            value="true"
            defaultChecked={defaults.remindersEnabled}
            className="mt-1 size-4 rounded border-secondary text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <span>
            <span className="block text-sm font-medium text-primary">Enable reminder defaults</span>
            <span className="mt-0.5 block text-sm text-tertiary">
              Prefill reminder subject/body when sending from an invoice.
            </span>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Days after due"
            name="reminderDaysAfterDue"
            type="number"
            defaultValue={String(defaults.reminderDaysAfterDue)}
            isInvalid={Boolean(state?.fieldErrors?.reminderDaysAfterDue)}
            hint={state?.fieldErrors?.reminderDaysAfterDue}
          />
          <div className="sm:col-span-2">
            <Input
              label="Reminder subject"
              name="reminderSubject"
              defaultValue={defaults.reminderSubject}
              isInvalid={Boolean(state?.fieldErrors?.reminderSubject)}
              hint={state?.fieldErrors?.reminderSubject}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Reminder body"
              name="reminderBody"
              defaultValue={defaults.reminderBody}
              rows={6}
              isInvalid={Boolean(state?.fieldErrors?.reminderBody)}
              hint={state?.fieldErrors?.reminderBody}
            />
          </div>
        </div>
      </section>

      {state?.error && !state.ok ? (
        <p
          className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle ring-inset"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} isLoading={pending} className="min-h-11">
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
