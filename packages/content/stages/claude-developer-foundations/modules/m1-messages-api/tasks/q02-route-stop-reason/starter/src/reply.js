/**
 * 応答の止まった理由 (stop_reason) から、アプリが次にすることを決める。
 * @param {{ content: object[], stop_reason: string, stop_details?: { explanation?: string | null } | null }} response
 *   Messages API の応答
 * @returns {object} 次にすること (README の表を参照)
 */
export function readReply(response) {
  return { kind: "unexpected", stopReason: response.stop_reason };
}
