import raw from "./questions.json";
import type { InterviewQuestion } from "./types.js";

/** 想定質問バンク (197 問)。 正本は questions.json。 */
export const INTERVIEW_QUESTIONS = raw as InterviewQuestion[];
