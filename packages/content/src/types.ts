/**
 * 教材ファイル（practice.md の確認クイズ）から生成する quiz seed 型。
 * DB 行型 (`@falcon/shared` の QuizRow / QuizQuestionRow / QuizOptionRow) へ
 * export-seed-sql.ts が変換する。
 */

export interface QuizOptionSeed {
  /** "A" / "B" / "C" の表示ラベルを除いた選択肢本文 */
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestionSeed {
  /** 設問文（"Q1. " の接頭辞を除いたもの） */
  prompt: string;
  explanation: string;
  options: QuizOptionSeed[];
}

export type CourseColor = "indigo" | "green" | "amber" | "slate";

/** レッスンに紐づくコード演習。id は `@falcon/shared` の Assignment.id。 */
export interface ExerciseRef {
  id: string;
  title: string;
}

/** courses/<slug>/course.json。slug はディレクトリ名。 */
export interface CourseConfig {
  title: string;
  category?: string;
  color?: CourseColor;
  /**
   * 一覧カードのサムネイル画像。講座ディレクトリからの相対パス。
   * 省略時は `thumbnail.webp` / `.png` / `.jpg` を順に探す（無ければ color のストライプ表示）。
   */
  thumbnail?: string;
  description?: string;
  header?: string;
  tenantId?: string;
  modules?: Record<string, string>;
  /** レッスンキー ("1-1" 形式) → VS Code 拡張で解くコード演習 */
  exercises?: Record<string, ExerciseRef[]>;
  /**
   * 前提講座の slug 配列。ここに挙げた講座を **すべてクリアするまで開けない**
   * (スキルツリーのハードロック)。書けるのは `CURRICULUM.md` に「前提講座」として
   * 散文で明記されているものだけ。推奨・任意の受講順はここに書かない
   * (書いた瞬間ゲートになり、受講者が入れなくなる)。
   *
   * 未知 slug・自己参照・循環はビルドで落とす (manifest.ts)。スキルツリー上、
   * 1 つの星から出る枝は **最大 2 本** (AND 合流は枝に数えないが、親側の線には
   * なる)。3 本以上になるなら直列化する。島への橋は線を引かないので数えない。
   *
   * 見た目の複製 (`appearances`) がある講座は、扇ごとの前提を
   * `appearancePrerequisites` に書く。そのときはこの配列は組の **和集合**
   * (グラフ検査・seed 用) で、開く条件は組どうしの OR になる。
   */
  prerequisites?: string[];
  /**
   * スキルツリーで線を引く親 (slug)。`prerequisites` のうちの 1 つ。線・配置・視界は
   * この 1 本で決まり、解放条件は `prerequisites` 全部 (AND) のまま。
   * 前提が 2 つ以上なら必須、1 つなら省略可 (その 1 つが親)、0 なら書けない。
   * `appearances` を持つ講座は扇ごとの親を `appearancePrerequisites` に書くので、これは書けない。
   */
  parent?: string;
  /**
   * 到達説明。「このスキルを身につけた人は◯◯ができる」のホバー表示に使う 1 文。
   * 「〜できる」で終える。誇張しない (資格の合格保証などは書かない)。
   */
  canDo?: string;
  /**
   * 霧の中の星に見せるテーマ名。まだ視界に入っていない講座は、タイトルの代わりに
   * これだけが見える。カテゴリ単位でそろえる (講座ごとに凝った名前を付けない)。
   */
  theme?: string;
  /**
   * スキルツリー上で同じステージを複数の扇に置くときの扇名。実体は 1 講座のまま
   * (クリアは共有)。未設定なら `category` の扇に 1 つ。実行時の正本は
   * `@falcon/shared/skill-map/appearances` で、ここはドキュメント兼検査用。
   */
  appearances?: string[];
  /**
   * 扇ごとの前提 slug。キーは `appearances` と同じ扇名。実体のロックは
   * どれか 1 組を満たせば開く (OR)。実行時の正本は
   * `@falcon/shared/skill-map/appearances` の `SKILL_MAP_APPEARANCE_PREREQUISITES`。
   */
  appearancePrerequisites?: Record<string, string[]>;
}

export interface QuizSeed {
  /** 所属講座。lessonId は講座内でのみ一意なので、seed 照合に両方使う。 */
  courseId: string;
  /** 紐づく lesson の安定キー（manifest が振る Lesson.id と一致させる） */
  lessonId: string;
  passScore: number;
  questions: QuizQuestionSeed[];
  /**
   * 生成元 practice.md の全文（改行 LF 正規化済み）。quiz レッスンは本文列を持たない
   * ため、本文リビジョン (lesson_revisions) と配布 PDF はこれをスナップショット・
   * 生成元にする。
   */
  sourceText: string;
}
