export type Options = { size: number; color: string; bold: boolean };
export type Profile = { name: string; email?: string; age?: number };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

// 問1
export type PartialOptions = Partial<Options>;

// 問2
export type RequiredProfile = Required<Profile>;

// 問3
export type ReadonlyOptions = Readonly<Options>;

// 問4
export type ReadonlyProfile = Readonly<Profile>;

// 問5
export function withDefaults(options: Partial<Options>): Options {
  return { ...DEFAULT_OPTIONS, ...options };
}

// 問6
export function patchOptions(options: Options, patch: Partial<Options>): Options {
  return { ...options, ...patch };
}

// 問7
export function completeProfile(profile: Profile): Required<Profile> {
  return { name: profile.name, email: profile.email ?? "", age: profile.age ?? 0 };
}

// 問8
export function freezeOptions(options: Options): Readonly<Options> {
  return Object.freeze({ ...options });
}

// 問9
export function isComplete(profile: Profile): profile is Required<Profile> {
  return profile.email !== undefined && profile.age !== undefined;
}

// 問10
export function countSet(options: Partial<Options>): number {
  let count = 0;
  if (options.size !== undefined) {
    count++;
  }
  if (options.color !== undefined) {
    count++;
  }
  if (options.bold !== undefined) {
    count++;
  }
  return count;
}

// 問11
export function mergePatches(...patches: Partial<Options>[]): Partial<Options> {
  let result: Partial<Options> = {};
  for (const patch of patches) {
    result = { ...result, ...patch };
  }
  return result;
}

// 問12
export function updateEmail(profile: Readonly<Profile>, email: string): Readonly<Profile> {
  return { ...profile, email };
}

// 問13
export function requireEmail(profile: Profile): string {
  if (profile.email === undefined) {
    throw new Error("email がありません");
  }
  return profile.email;
}

// 問14
export function diffOptions(a: Options, b: Options): Partial<Options> {
  const result: Partial<Options> = {};
  if (a.size !== b.size) {
    result.size = b.size;
  }
  if (a.color !== b.color) {
    result.color = b.color;
  }
  if (a.bold !== b.bold) {
    result.bold = b.bold;
  }
  return result;
}

// 問15
export function toggleBold(options: Readonly<Options>): Options {
  return { ...options, bold: !options.bold };
}

// 問16
export function sizeOr(options: Partial<Options>, fallback: number): number {
  return options.size ?? fallback;
}

// 問17
export function describeOptions(options: Readonly<Options>): string {
  const base = `${options.size}px ${options.color}`;
  return options.bold ? `${base} 太字` : base;
}

// 問18
export function fillProfile(profile: Profile, defaults: Required<Profile>): Required<Profile> {
  return {
    name: profile.name,
    email: profile.email ?? defaults.email,
    age: profile.age ?? defaults.age,
  };
}

// 問19
export function emptyPatch(): Partial<Options> {
  return {};
}

// 問20
export function resetKeys(options: Options, keys: readonly (keyof Options)[]): Options {
  const result = { ...options };
  for (const key of keys) {
    if (key === "size") {
      result.size = DEFAULT_OPTIONS.size;
    } else if (key === "color") {
      result.color = DEFAULT_OPTIONS.color;
    } else {
      result.bold = DEFAULT_OPTIONS.bold;
    }
  }
  return result;
}
