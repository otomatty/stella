import type { Env } from "../env.js";
import { libraryEnabled } from "./library-authz.js";

/** No provider calls or book data reads. Bound the service check even during an outage. */
export async function libraryRuntimeStatus(env: Env) {
  const enabled = libraryEnabled(env.LIBRARY_ENABLED);
  const unavailable = {
    libraryEnabled: enabled,
    narratorAvailable: false,
    processingAvailable: false,
  };
  if (!env.NARRATOR) return unavailable;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const capabilities = await Promise.race([
      env.NARRATOR.capabilities(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 3_000);
      }),
    ]);
    if (!capabilities) return unavailable;
    return {
      libraryEnabled: enabled,
      narratorAvailable: true,
      processingAvailable:
        enabled && Boolean(env.LIBRARY_BUCKET) && capabilities.configured === true,
    };
  } catch {
    return unavailable;
  } finally {
    clearTimeout(timer);
  }
}

export async function processingAvailable(env: Env): Promise<boolean> {
  return (await libraryRuntimeStatus(env)).processingAvailable;
}
