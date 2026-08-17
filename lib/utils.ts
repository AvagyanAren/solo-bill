import { clsx, type ClassValue } from "clsx";

import { cx } from "@/lib/utils/cx";

export function cn(...inputs: ClassValue[]) {
  return cx(clsx(inputs));
}

export { cx } from "@/lib/utils/cx";
