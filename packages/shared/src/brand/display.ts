/**
 * Display-layer brand strings shown to humans.
 *
 * Package scope and runtime identifiers use STELLA. Legacy names are read only
 * by migration adapters and documented in the migration guides.
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
