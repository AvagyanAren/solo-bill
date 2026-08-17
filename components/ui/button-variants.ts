import { cx } from "@/lib/utils/cx";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const common =
  "group relative inline-flex h-max cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-semibold outline-brand transition duration-100 ease-linear before:absolute focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-brand-solid text-primary_on-brand shadow-xs-skeuomorphic ring-1 ring-transparent ring-inset hover:bg-brand-solid_hover",
  outline:
    "bg-primary text-secondary shadow-xs-skeuomorphic ring-1 ring-primary ring-inset hover:bg-primary_hover hover:text-secondary_hover",
  secondary:
    "bg-primary text-secondary shadow-xs-skeuomorphic ring-1 ring-primary ring-inset hover:bg-primary_hover hover:text-secondary_hover",
  ghost: "text-tertiary hover:bg-primary_hover hover:text-tertiary_hover",
  destructive:
    "bg-error-solid text-primary_on-brand shadow-xs-skeuomorphic ring-1 ring-transparent outline-error ring-inset hover:bg-error-solid_hover",
  link: "justify-normal rounded p-0! text-brand-secondary hover:text-brand-secondary_hover",
};

const sizes: Record<ButtonSize, string> = {
  default: "gap-1 rounded-lg px-3.5 py-2.5 text-sm",
  xs: "gap-1 rounded-lg px-2.5 py-1.5 text-sm",
  sm: "gap-1 rounded-lg px-3 py-2 text-sm",
  lg: "gap-1.5 rounded-lg px-4 py-2.5 text-md",
  icon: "p-2.5",
  "icon-xs": "p-2",
  "icon-sm": "p-2",
  "icon-lg": "p-3",
};

export function buttonVariants(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cx(
    common,
    variants[options?.variant ?? "default"],
    sizes[options?.size ?? "default"],
    options?.className,
  );
}
