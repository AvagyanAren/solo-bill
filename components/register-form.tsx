"use client";

import { useActionState } from "react";

import { registerAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="grid gap-4" autoComplete="on">
      <Input
        id="register-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        spellCheck="false"
        isRequired
        isInvalid={Boolean(state?.error)}
        aria-describedby={state?.error ? "register-error" : undefined}
      />
      <Input
        id="register-password"
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        isRequired
        minLength={8}
        isInvalid={Boolean(state?.error)}
        hint="At least 8 characters."
      />
      {state?.error ? (
        <p id="register-error" className="text-sm text-error-primary" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} isLoading={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
