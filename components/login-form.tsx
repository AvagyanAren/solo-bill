"use client";

import { useActionState } from "react";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4" autoComplete="on">
      <Input
        id="login-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        spellCheck="false"
        isRequired
        isInvalid={Boolean(state?.error)}
        aria-describedby={state?.error ? "login-error" : undefined}
      />
      <Input
        id="login-password"
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        isRequired
        minLength={8}
        isInvalid={Boolean(state?.error)}
      />
      {state?.error ? (
        <p id="login-error" className="text-sm text-error-primary" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} isLoading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
