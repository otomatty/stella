export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

// 問1
export function shapeArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius;
    case "square":
      return shape.size * shape.size;
    case "rect":
      return shape.width * shape.height;
  }
}

// 問2
export function shapeName(shape: Shape): "円" | "正方形" | "長方形" {
  switch (shape.kind) {
    case "circle":
      return "円";
    case "square":
      return "正方形";
    case "rect":
      return "長方形";
  }
}

// 問3
export function shapePerimeter(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return 2 * Math.PI * shape.radius;
    case "square":
      return shape.size * 4;
    case "rect":
      return (shape.width + shape.height) * 2;
  }
}

// 問4
export function isRound(shape: Shape): boolean {
  return shape.kind === "circle";
}

// 問5
export function scaleShape(shape: Shape, k: number): Shape {
  switch (shape.kind) {
    case "circle":
      return { kind: "circle", radius: shape.radius * k };
    case "square":
      return { kind: "square", size: shape.size * k };
    case "rect":
      return { kind: "rect", width: shape.width * k, height: shape.height * k };
  }
}

// 問6
export function paymentLabel(payment: Payment): string {
  switch (payment.method) {
    case "cash":
      return "現金";
    case "card":
      return `カード（末尾${payment.cardNumber.slice(-4)}）`;
    case "bank":
      return `振込（${payment.bankName}）`;
  }
}

// 問7
export function needsConfirmation(payment: Payment): boolean {
  return payment.method !== "cash";
}

// 問8
export function lastFour(payment: Payment): string | undefined {
  if (payment.method === "card") {
    return payment.cardNumber.slice(-4);
  }
  return undefined;
}

// 問9
export function noticeText(notice: Notice): string {
  switch (notice.type) {
    case "info":
      return `[情報] ${notice.message}`;
    case "warning":
      return `[注意Lv${notice.level}] ${notice.message}`;
    case "error":
      return `[エラー${notice.code}] ${notice.message}`;
  }
}

// 問10
export function isSerious(notice: Notice): boolean {
  switch (notice.type) {
    case "info":
      return false;
    case "warning":
      return notice.level >= 3;
    case "error":
      return true;
  }
}

// 問11
export function errorCode(notice: Notice): number | undefined {
  return notice.type === "error" ? notice.code : undefined;
}

// 問12
export type Animal = { kind: "dog"; name: string } | { kind: "cat"; name: string };

export function cry(animal: Animal): string {
  return `${animal.name}: ${animal.kind === "dog" ? "ワン" : "ニャー"}`;
}

// 問13
export type Vehicle = { type: "car"; seats: number } | { type: "bike" };

export function capacity(vehicle: Vehicle): number {
  return vehicle.type === "car" ? vehicle.seats : 1;
}

// 問14
export type UserAction = { kind: "click"; x: number; y: number } | { kind: "key"; key: string };

export function actionText(event: UserAction): string {
  return event.kind === "click" ? `click(${event.x}, ${event.y})` : `key(${event.key})`;
}

// 問15
export type Media =
  { type: "image"; width: number; height: number } | { type: "video"; seconds: number };

export function mediaInfo(media: Media): string {
  return media.type === "image" ? `画像 ${media.width}×${media.height}` : `動画 ${media.seconds}秒`;
}

// 問16
export type ApiResponse = { ok: true; data: string } | { ok: false; status: number };

export function responseText(response: ApiResponse): string {
  return response.ok ? response.data : `エラー ${response.status}`;
}

// 問17
export type Account = { plan: "free" } | { plan: "paid"; until: string };

export function accountText(account: Account): string {
  return account.plan === "free" ? "無料" : `有料（${account.until}まで）`;
}

// 問18
export type Token = { type: "number"; value: number } | { type: "plus" } | { type: "minus" };

export function tokenText(token: Token): string {
  switch (token.type) {
    case "number":
      return String(token.value);
    case "plus":
      return "+";
    case "minus":
      return "-";
  }
}

// 問19
export type Contact = { by: "email"; address: string } | { by: "phone"; number: string };

export function contactText(contact: Contact): string {
  return contact.by === "email" ? `メール: ${contact.address}` : `電話: ${contact.number}`;
}

// 問20
export type Reading = { unit: "C"; value: number } | { unit: "F"; value: number };

export function toCelsius(reading: Reading): number {
  const celsius = reading.unit === "C" ? reading.value : ((reading.value - 32) * 5) / 9;
  return Math.round(celsius * 10) / 10;
}
