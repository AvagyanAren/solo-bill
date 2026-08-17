import { BASIS_POINTS_SCALE } from "@/lib/billing/money";

export function percentageToBasisPoints(percentage: number): number {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("Tax percentage must be between 0 and 100.");
  }
  return Math.round(percentage * 100);
}

export function basisPointsToPercentage(basisPoints: number): number {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > BASIS_POINTS_SCALE) {
    throw new RangeError("Tax basis points must be between 0 and 10,000.");
  }
  return basisPoints / 100;
}
