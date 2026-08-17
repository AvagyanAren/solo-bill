"use client";

import type { ComponentProps, ReactNode } from "react";

import { InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { HintText } from "@/components/base/input/hint-text";
import { cx } from "@/lib/utils/cx";

type InputBaseProps = ComponentProps<typeof InputBase>;

export type InputProps = Omit<InputBaseProps, "size" | "onChange" | "value" | "defaultValue"> & {
  label?: string;
  hint?: ReactNode;
  size?: InputBaseProps["size"];
  isRequired?: boolean;
  isInvalid?: boolean;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function Input({
  className,
  label,
  hint,
  id,
  name,
  size = "md",
  isRequired,
  isInvalid,
  defaultValue,
  value,
  onChange,
  ...props
}: InputProps) {
  return (
    <TextField
      id={id}
      name={name}
      isRequired={isRequired}
      isInvalid={isInvalid}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      size={size}
      className={typeof className === "string" ? className : undefined}
    >
      {({ isRequired: required, isInvalid: invalid }) => (
        <>
          {label ? (
            <Label isRequired={required} isInvalid={invalid}>
              {label}
            </Label>
          ) : null}
          <InputBase
            {...props}
            size={size}
            className={cx("w-full")}
            aria-label={!label ? props["aria-label"] ?? props.placeholder : props["aria-label"]}
          />
          {hint ? <HintText isInvalid={invalid}>{hint}</HintText> : null}
        </>
      )}
    </TextField>
  );
}

export { InputBase };
