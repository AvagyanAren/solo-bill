"use client";

import type { ReactNode, Ref } from "react";
import React from "react";
import type { TextAreaProps as AriaTextAreaProps, TextFieldProps as AriaTextFieldProps } from "react-aria-components";
import { TextArea as AriaTextArea, TextField as AriaTextField } from "react-aria-components";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import { cx } from "@/lib/utils/cx";

// Mask-based resize handle so the stroke color comes from semantic fg tokens.
const RESIZE_HANDLE_MASK = `url(data:image/svg+xml;base64,${btoa(`<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L2 10" stroke="black" stroke-linecap="round"/><path d="M11 7L7 11" stroke="black" stroke-linecap="round"/></svg>`)})`;

interface TextAreaBaseProps extends AriaTextAreaProps {
    ref?: Ref<HTMLTextAreaElement>;
    size?: "sm" | "md";
}

export const TextAreaBase = ({ className, size = "md", ...props }: TextAreaBaseProps) => {
    return (
        <AriaTextArea
            {...props}
            style={
                {
                    "--resize-handle-mask": RESIZE_HANDLE_MASK,
                } as React.CSSProperties
            }
            className={(state) =>
                cx(
                    "w-full scroll-py-3 rounded-lg bg-primary text-primary shadow-xs ring-1 ring-primary transition duration-100 ease-linear ring-inset placeholder:text-placeholder autofill:rounded-lg autofill:text-primary focus:outline-hidden",

                    size === "sm" && "p-3 text-sm",
                    size === "md" && "px-3.5 py-3 text-md",

                    // Resize handle uses fg-quaternary token (no hardcoded hex).
                    "[&::-webkit-resizer]:bg-fg-quaternary [&::-webkit-resizer]:[mask-image:var(--resize-handle-mask)] [&::-webkit-resizer]:[mask-position:bottom_right] [&::-webkit-resizer]:[mask-repeat:no-repeat] [&::-webkit-resizer]:[mask-size:contain]",

                    state.isFocused && !state.isDisabled && "ring-2 ring-brand",
                    state.isDisabled && "cursor-not-allowed opacity-50",
                    state.isInvalid && "ring-error_subtle",
                    state.isInvalid && state.isFocused && "ring-2 ring-error",

                    typeof className === "function" ? className(state) : className,
                )
            }
        />
    );
};

TextAreaBase.displayName = "TextAreaBase";

interface TextFieldProps extends AriaTextFieldProps {
    /** Label text for the textarea */
    label?: string;
    /** Helper text displayed below the textarea */
    hint?: ReactNode;
    /** Tooltip message displayed after the label. */
    tooltip?: string;
    /** Textarea size. */
    size?: TextAreaBaseProps["size"];
    /** Class name for the textarea wrapper */
    textAreaClassName?: TextAreaBaseProps["className"];
    /** Ref for the textarea wrapper */
    ref?: Ref<HTMLDivElement>;
    /** Ref for the textarea */
    textAreaRef?: TextAreaBaseProps["ref"];
    /** Whether to hide required indicator from label. */
    hideRequiredIndicator?: boolean;
    /** Placeholder text. */
    placeholder?: string;
    /** Visible height of textarea in rows . */
    rows?: number;
    /** Visible width of textarea in columns. */
    cols?: number;
}

export const TextArea = ({
    label,
    hint,
    tooltip,
    textAreaRef,
    hideRequiredIndicator,
    textAreaClassName,
    placeholder,
    className,
    rows,
    cols,
    size = "md",
    ...props
}: TextFieldProps) => {
    return (
        <AriaTextField
            {...props}
            className={(state) =>
                cx("group flex h-max w-full flex-col items-start justify-start gap-1.5", typeof className === "function" ? className(state) : className)
            }
        >
            {({ isInvalid, isRequired }) => (
                <>
                    {label && (
                        <Label isRequired={hideRequiredIndicator ? !hideRequiredIndicator : isRequired} tooltip={tooltip}>
                            {label}
                        </Label>
                    )}

                    <TextAreaBase placeholder={placeholder} className={textAreaClassName} ref={textAreaRef} rows={rows} cols={cols} size={size} />

                    {hint && (
                        <HintText isInvalid={isInvalid} size={size}>
                            {hint}
                        </HintText>
                    )}
                </>
            )}
        </AriaTextField>
    );
};

TextArea.displayName = "TextArea";
