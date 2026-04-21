"use client";

import { useActionState } from "react";

import {
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ClientFormState = {};

type Props =
  | { mode: "create" }
  | {
      mode: "edit";
      clientId: string;
      defaultValues: { name: string; email: string };
    };

export function ClientForm(props: Props) {
  const action = props.mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const defaults =
    props.mode === "edit" ? props.defaultValues : { name: "", email: "" };

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      {props.mode === "edit" ? <input type="hidden" name="id" value={props.clientId} /> : null}
      {state?.error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults.name}
          required
          autoComplete="organization"
          aria-invalid={!!state?.fieldErrors?.name}
          aria-describedby={state?.fieldErrors?.name ? "client-name-error" : undefined}
        />
        {state?.fieldErrors?.name ? (
          <p id="client-name-error" className="text-sm text-destructive" role="alert">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaults.email}
          required
          autoComplete="email"
          aria-invalid={!!state?.fieldErrors?.email}
          aria-describedby={state?.fieldErrors?.email ? "client-email-error" : undefined}
        />
        {state?.fieldErrors?.email ? (
          <p id="client-email-error" className="text-sm text-destructive" role="alert">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Add client" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
