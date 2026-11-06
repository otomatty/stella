export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

export type Light = { state: "off" } | { state: "on"; brightness: number };

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

// 問1
export function closeDoor(door: Door): Door {
  return door.state === "open" ? { state: "closed" } : door;
}

// 問2
export function openDoor(door: Door): Door {
  return door.state === "closed" ? { state: "open" } : door;
}

// 問3
export function lockDoor(door: Door, key: string): Door {
  return door.state === "closed" ? { state: "locked", key } : door;
}

// 問4
export function unlockDoor(door: Door, key: string): Door {
  if (door.state === "locked" && door.key === key) {
    return { state: "closed" };
  }
  return door;
}

// 問5
export function doorText(door: Door): string {
  switch (door.state) {
    case "open":
      return "開いている";
    case "closed":
      return "閉まっている";
    case "locked":
      return "鍵がかかっている";
  }
}

// 問6
export function turnOn(light: Light): Light {
  return light.state === "off" ? { state: "on", brightness: 100 } : light;
}

// 問7
export function turnOff(light: Light): Light {
  return light.state === "on" ? { state: "off" } : light;
}

// 問8
export function dim(light: Light, amount: number): Light {
  if (light.state === "off") {
    return light;
  }
  const brightness = light.brightness - amount;
  return brightness <= 0 ? { state: "off" } : { state: "on", brightness };
}

// 問9
export function lightText(light: Light): string {
  return light.state === "off" ? "消灯" : `点灯（${light.brightness}%）`;
}

// 問10
export function startTimer(timer: Timer, now: number): Timer {
  switch (timer.state) {
    case "idle":
      return { state: "running", startedAt: now };
    case "paused":
      return { state: "running", startedAt: now - timer.elapsed };
    case "running":
      return timer;
  }
}

// 問11
export function pauseTimer(timer: Timer, now: number): Timer {
  if (timer.state === "running") {
    return { state: "paused", elapsed: now - timer.startedAt };
  }
  return timer;
}

// 問12
export function resetTimer(timer: Timer): Timer {
  return timer.state === "idle" ? timer : { state: "idle" };
}

// 問13
export function elapsedOf(timer: Timer, now: number): number {
  switch (timer.state) {
    case "idle":
      return 0;
    case "running":
      return now - timer.startedAt;
    case "paused":
      return timer.elapsed;
  }
}

// 問14
export function assignTicket(ticket: Ticket, assignee: string): Ticket {
  if (ticket.status === "closed") {
    return ticket;
  }
  return { status: "assigned", title: ticket.title, assignee };
}

// 問15
export function closeTicket(ticket: Ticket, resolution: string): Ticket {
  if (ticket.status === "closed") {
    return ticket;
  }
  return { status: "closed", title: ticket.title, resolution };
}

// 問16
export function reopen(ticket: Ticket): Ticket {
  return ticket.status === "closed" ? { status: "open", title: ticket.title } : ticket;
}

// 問17
export function assigneeOf(ticket: Ticket): string | undefined {
  return ticket.status === "assigned" ? ticket.assignee : undefined;
}

// 問18
export function ticketText(ticket: Ticket): string {
  switch (ticket.status) {
    case "open":
      return `[未対応] ${ticket.title}`;
    case "assigned":
      return `[担当: ${ticket.assignee}] ${ticket.title}`;
    case "closed":
      return `[完了: ${ticket.resolution}] ${ticket.title}`;
  }
}

// 問19
export function canEdit(ticket: Ticket): boolean {
  return ticket.status !== "closed";
}

// 問20
export function countUnfinished(tickets: readonly Ticket[]): number {
  return tickets.filter((ticket) => ticket.status !== "closed").length;
}
