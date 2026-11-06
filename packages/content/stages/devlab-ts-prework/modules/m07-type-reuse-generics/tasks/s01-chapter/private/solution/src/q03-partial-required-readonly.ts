export type Profile = { name: string; email: string; bio: string; age: number };

const KEYS: readonly (keyof Profile)[] = ["name", "email", "bio", "age"];

export function updateProfile(profile: Profile, patch: Partial<Profile>): Profile {
  return { ...profile, ...patch };
}

export function completeProfile(draft: Partial<Profile>): Required<Profile> {
  const { name, email, bio, age } = draft;
  if (name === undefined) {
    throw new Error("name がありません");
  }
  if (email === undefined) {
    throw new Error("email がありません");
  }
  if (bio === undefined) {
    throw new Error("bio がありません");
  }
  if (age === undefined) {
    throw new Error("age がありません");
  }
  return { name, email, bio, age };
}

export function freezeProfile(profile: Profile): Readonly<Profile> {
  return Object.freeze({ ...profile });
}

export function changedKeys(before: Profile, after: Profile): (keyof Profile)[] {
  return KEYS.filter((key) => before[key] !== after[key]);
}
