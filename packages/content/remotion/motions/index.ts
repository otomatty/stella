import type { ComponentType } from "react";
import { AgeFloor, ageFloorText } from "./age-floor";
import { Beads, beadsText } from "./beads";
import { BusSeats, busSeatsText } from "./bus-seats";
import { CallStaff, callStaffText } from "./call-staff";
import { CandyRest, candyRestText } from "./candy-rest";
import { Contacts, contactsText } from "./contacts";
import { EntryForm, entryFormText } from "./entry-form";
import { FoldPaper, foldPaperText } from "./fold-paper";
import { FruitCount, fruitCountText } from "./fruit-count";
import { JumpRope, jumpRopeText } from "./jump-rope";
import { Laps, lapsText } from "./laps";
import { LetterCards, letterCardsText } from "./letter-cards";
import type { MotionId } from "./manifest";
import { OnigiriTimes, onigiriTimesText } from "./onigiri-times";
import { PiggyBank, piggyBankText } from "./piggy-bank";
import { PizzaShare, pizzaShareText } from "./pizza-share";
import { PlatformSign, platformSignText } from "./platform-sign";
import { QuoteMarks, quoteMarksText } from "./quote-marks";
import { RocketCountdown, rocketCountdownText } from "./rocket-countdown";
import { RouteSearch, routeSearchText } from "./route-search";
import { Scoreboard, scoreboardText } from "./scoreboard";
import { ShoppingOrder, shoppingOrderText } from "./shopping-order";
import { StackPlates, stackPlatesText } from "./stack-plates";
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
  scoreboard: { Component: Scoreboard, text: scoreboardText },
  "piggy-bank": { Component: PiggyBank, text: piggyBankText },
  laps: { Component: Laps, text: lapsText },
  "fold-paper": { Component: FoldPaper, text: foldPaperText },
  "rocket-countdown": { Component: RocketCountdown, text: rocketCountdownText },
  beads: { Component: Beads, text: beadsText },
  "jump-rope": { Component: JumpRope, text: jumpRopeText },
  "letter-cards": { Component: LetterCards, text: letterCardsText },
  "fruit-count": { Component: FruitCount, text: fruitCountText },
  "stack-plates": { Component: StackPlates, text: stackPlatesText },
} satisfies Record<MotionId, { Component: ComponentType<MotionProps>; text: string }>;
