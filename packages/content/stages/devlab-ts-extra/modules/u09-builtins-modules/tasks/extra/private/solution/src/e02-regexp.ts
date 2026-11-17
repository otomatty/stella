export type LogLine = { level: "INFO" | "WARN" | "ERROR"; time: string; message: string };

export function isPostalCode(text: string): boolean {
  return /^\d{3}-\d{4}$/.test(text);
}

export function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#([^\s#]+)/g)].map((m) => m[1] ?? "");
}

export function maskPhone(text: string): string {
  return text.replace(/\b(\d{3})-\d{4}-(\d{4})\b/g, "$1-****-$2");
}

const LOG_LINE =
  /^\[(?<level>INFO|WARN|ERROR)\] (?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?<message>.+)$/;

function isLevel(value: string): value is LogLine["level"] {
  return value === "INFO" || value === "WARN" || value === "ERROR";
}

export function parseLogLine(line: string): LogLine | null {
  const groups = LOG_LINE.exec(line)?.groups;
  const level = groups?.level;
  const time = groups?.time;
  const message = groups?.message;
  if (level === undefined || time === undefined || message === undefined || !isLevel(level)) {
    return null;
  }
  return { level, time, message };
}

export function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
