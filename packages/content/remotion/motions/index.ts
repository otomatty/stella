import type { ComponentType } from "react";
import { AgeFloor, ageFloorText } from "./age-floor";
import { CallStaff, callStaffText } from "./call-staff";
import { Contacts, contactsText } from "./contacts";
import { EntryForm, entryFormText } from "./entry-form";
import type { MotionId } from "./manifest";
import { OnigiriTimes, onigiriTimesText } from "./onigiri-times";
import { QuoteMarks, quoteMarksText } from "./quote-marks";
import { TestTotal, testTotalText } from "./test-total";
import { VendingChange, vendingText } from "./vending-change";

export type MotionProps = {
  beats: { start: number; end: number }[];
  duration: number;
};

export const motionComponents = {
  "vending-change": { Component: VendingChange, text: vendingText },
  "entry-form": { Component: EntryForm, text: entryFormText },
  "call-staff": { Component: CallStaff, text: callStaffText },
  "quote-marks": { Component: QuoteMarks, text: quoteMarksText },
  contacts: { Component: Contacts, text: contactsText },
  "test-total": { Component: TestTotal, text: testTotalText },
  "onigiri-times": { Component: OnigiriTimes, text: onigiriTimesText },
  "age-floor": { Component: AgeFloor, text: ageFloorText },
} satisfies Record<MotionId, { Component: ComponentType<MotionProps>; text: string }>;
