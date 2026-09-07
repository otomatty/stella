/**
 * Display-layer brand strings shown to humans.
 *
 * Package scope is `@stella/*` (Phase B). Runtime identifiers (Worker names,
 * JWT iss/aud, localStorage keys, VS Code extension id) stay on legacy `falcon.*`.
 */
export const PACKAGE_SCOPE = "@stella";
export const DISPLAY_NAME = "STELLA";

/** Command palette / activity bar prefix (e.g. `STELLA: 採点を実行`). */
export const DISPLAY_COMMAND_PREFIX = "STELLA";

/** PWA manifest short label. */
export const DISPLAY_SHORT_NAME = "STELLA";

/** Support mail subject prefix. */
export const supportMailSubjectPrefix = (): string => `【${DISPLAY_NAME}】`;

/** Help drawer heading for the product overview. */
export const helpAboutHeading = (): string => `${DISPLAY_NAME} とは`;
