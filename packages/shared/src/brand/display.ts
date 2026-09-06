/**
 * Phase A display-layer brand strings shown to humans.
 *
 * Machine-readable identifiers (`@falcon/*`, `falcon.*`, localStorage keys, Worker
 * names, JWT claims) stay unchanged until Phase B.
 */
export const DISPLAY_NAME = "STELLA";

/** Command palette / activity bar prefix (e.g. `STELLA: 採点を実行`). */
export const DISPLAY_COMMAND_PREFIX = "STELLA";

/** PWA manifest short label. */
export const DISPLAY_SHORT_NAME = "STELLA";

/** Support mail subject prefix. */
export const supportMailSubjectPrefix = (): string => `【${DISPLAY_NAME}】`;

/** Help drawer heading for the product overview. */
export const helpAboutHeading = (): string => `${DISPLAY_NAME} とは`;
