import type { ComponentType } from "react";
import { AgeFloor, ageFloorText } from "./age-floor";
import { BusSeats, busSeatsText } from "./bus-seats";
import { CallStaff, callStaffText } from "./call-staff";
import { CandyRest, candyRestText } from "./candy-rest";
import { Contacts, contactsText } from "./contacts";
import { EntryForm, entryFormText } from "./entry-form";
import type { MotionId } from "./manifest";
import { OnigiriTimes, onigiriTimesText } from "./onigiri-times";
import { PizzaShare, pizzaShareText } from "./pizza-share";
import { PlatformSign, platformSignText } from "./platform-sign";
import { QuoteMarks, quoteMarksText } from "./quote-marks";
import { RouteSearch, routeSearchText } from "./route-search";
import { ShoppingOrder, shoppingOrderText } from "./shopping-order";
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
  "pizza-share": { Component: PizzaShare, text: pizzaShareText },
  "bus-seats": { Component: BusSeats, text: busSeatsText },
  "route-search": { Component: RouteSearch, text: routeSearchText },
  "shopping-order": { Component: ShoppingOrder, text: shoppingOrderText },
  "candy-rest": { Component: CandyRest, text: candyRestText },
  "platform-sign": { Component: PlatformSign, text: platformSignText },
} satisfies Record<MotionId, { Component: ComponentType<MotionProps>; text: string }>;
