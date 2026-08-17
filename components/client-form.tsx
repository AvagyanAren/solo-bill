"use client";

import { useActionState } from "react";

import {
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { Textarea } from "@/components/ui/textarea";

const initial: ClientFormState = {};

export type ClientFormDefaults = {
  name: string;
  email: string;
  companyName: string;
  phone: string;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  taxId: string;
  notes: string;
};

type Props =
  | { mode: "create" }
  | {
      mode: "edit";
      clientId: string;
      defaultValues: ClientFormDefaults;
    };

const emptyDefaults: ClientFormDefaults = {
  name: "",
  email: "",
  companyName: "",
  phone: "",
  billingAddress1: "",
  billingAddress2: "",
  billingCity: "",
  billingState: "",
  billingPostalCode: "",
  billingCountry: "",
  taxId: "",
  notes: "",
};

export function ClientForm(props: Props) {
  const action = props.mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const defaults = props.mode === "edit" ? props.defaultValues : emptyDefaults;

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      {props.mode === "edit" ? <input type="hidden" name="id" value={props.clientId} /> : null}
      {state?.error ? (
        <p
          className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle ring-inset"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Input
        label="Name"
        name="name"
        defaultValue={defaults.name}
        isRequired
        autoComplete="name"
        isInvalid={Boolean(state?.fieldErrors?.name)}
        hint={state?.fieldErrors?.name}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={defaults.email}
        isRequired
        autoComplete="email"
        isInvalid={Boolean(state?.fieldErrors?.email)}
        hint={state?.fieldErrors?.email}
      />
      <Input
        label="Company"
        name="companyName"
        defaultValue={defaults.companyName}
        autoComplete="organization"
        isInvalid={Boolean(state?.fieldErrors?.companyName)}
        hint={state?.fieldErrors?.companyName}
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
      <Input
        label="Billing address"
        name="billingAddress1"
        defaultValue={defaults.billingAddress1}
        autoComplete="address-line1"
      />
      <Input
        label="Address line 2"
        name="billingAddress2"
        defaultValue={defaults.billingAddress2}
        autoComplete="address-line2"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="City"
          name="billingCity"
          defaultValue={defaults.billingCity}
          autoComplete="address-level2"
        />
        <Input
          label="State / region"
          name="billingState"
          defaultValue={defaults.billingState}
          autoComplete="address-level1"
        />
        <Input
          label="Postal code"
          name="billingPostalCode"
          defaultValue={defaults.billingPostalCode}
          autoComplete="postal-code"
        />
        <Input
          label="Country"
          name="billingCountry"
          defaultValue={defaults.billingCountry}
          autoComplete="country-name"
        />
      </div>
      <Input
        label="Tax ID"
        name="taxId"
        defaultValue={defaults.taxId}
        isInvalid={Boolean(state?.fieldErrors?.taxId)}
        hint={state?.fieldErrors?.taxId}
      />
      <Textarea
        label="Notes"
        name="notes"
        defaultValue={defaults.notes}
        rows={4}
        isInvalid={Boolean(state?.fieldErrors?.notes)}
        hint={state?.fieldErrors?.notes}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} isLoading={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Add client" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
