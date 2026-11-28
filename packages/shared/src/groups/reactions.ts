export const GROUP_REACTION_EMOJIS = [
  "👏",
  "🔥",
  "🎉",
  "💪",
  "🙌",
  "✨",
  "👍",
  "🚀",
  "💯",
  "😊",
  "🥳",
  "🌟",
  "⭐",
  "💡",
  "🤝",
  "🙏",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "😄",
  "😆",
  "🤩",
  "😎",
  "🫶",
  "👀",
  "📈",
  "🏆",
  "🥇",
  "🎯",
  "🧠",
  "🌱",
  "☕",
  "🍀",
  "🌈",
  "⚡",
  "🙆",
  "👌",
] as const;

export const MAX_REACTIONS_PER_EVENT_PER_USER = 10;

const reactionEmojis: ReadonlySet<unknown> = new Set(GROUP_REACTION_EMOJIS);

export function isGroupReactionEmoji(
  value: unknown,
): value is (typeof GROUP_REACTION_EMOJIS)[number] {
  return reactionEmojis.has(value);
}
