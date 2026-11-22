import type { ComponentType } from "react";
import type { MotionId } from "./manifest";
import { VendingChange, vendingText } from "./vending-change";

export type MotionProps = {
  beats: { start: number; end: number }[];
  duration: number;
};

export const motionComponents = {
  "vending-change": { Component: VendingChange, text: vendingText },
} satisfies Record<MotionId, { Component: ComponentType<MotionProps>; text: string }>;
