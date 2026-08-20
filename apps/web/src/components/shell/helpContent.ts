import type { FileRouteTypes } from "@/routeTree.gen";

/**
 * 画面連動ヘルプの静的定義。 Topbar の「?」で開く HelpDrawer が
 * 現在のパスに対応するトピックを findHelpTopic で引く。
 * route を routeTree の型に縛ることで、 ルート改名時は tsc が検出する。
 */
export interface HelpSection {
  heading: string;
  /** 表示は whitespace-pre-line。 改行と「・」で簡単な箇条書きを表現する。 */
  body: string;
}

export interface HelpTopic {
  route: FileRouteTypes["to"];
  title: string;
  sections: HelpSection[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    route: "/",
    title: "ダッシュボードの使い方",
    sections: [
      {
        heading: "この画面でできること",
        body: "学習状況の確認と、前回の続きからの学習再開ができます。上部には連続学習・完了レッスン・学習時間がまとまっています。",
      },
      {
        heading: "続きから学習",
        body: "「続きから学習」を押すと、直前に学習していたレッスンがそのまま開きます。迷ったらまずここから再開してください。",
      },
      {
        heading: "各カードの見方",
        body: "・コース進捗: 受講中コースの進み具合\n・提出・添削履歴: 課題の提出と添削の状況\n・お知らせ: 講師・運営からの連絡\n・週間学習時間: 日別の学習時間の記録",
      },
    ],
  },
  {
    route: "/courses",
    title: "コース一覧の使い方",
    sections: [
      {
        heading: "コースを選ぶ",
        body: "受講登録されたコースがカードで並んでいます。カードを押すとコースの詳細（レッスン一覧）が開きます。",
      },
      {
        heading: "受講の進め方",
        body: "コース詳細からレッスンを開いて学習を進めます。進捗は自動で記録されるので、途中でやめても続きから再開できます。新しいコースの追加（受講登録）は管理者が行います。",
      },
    ],
  },
  {
    route: "/courses/$courseId",
    title: "コース詳細の使い方",
    sections: [
      {
        heading: "レッスンの進め方",
        body: "レッスンは上から順に進めるのがおすすめです。完了したレッスンにはチェックが付きます。",
      },
      {
        heading: "進捗と修了",
        body: "進捗バーはコース全体の完了率です。全レッスンの完了（コースによっては小テストや課題の合格も条件）でコース修了となり、修了証の発行対象になります。修了条件はこの画面で確認できます。",
      },
      {
        heading: "教材のダウンロード",
        body: "配布教材があるコースでは、「教材をダウンロード」からファイルを取得できます。",
      },
    ],
  },
  {
    route: "/courses/$courseId/lessons/$lessonId",
    title: "レッスン画面の使い方",
    sections: [
      {
        heading: "教材の種類",
        body: "レッスンには動画・ドキュメント・クイズ（小テスト）の教材があります。画面の指示に沿って進めてください。視聴・閲覧すると進捗が記録されます。",
      },
      {
        heading: "レッスンの移動",
        body: "目次（レッスン一覧）から他のレッスンへ移動できます。画面が広いときは左側に常に表示され、狭いときは上部の目次ボタンから開けます。",
      },
      {
        heading: "クイズ（小テスト）",
        body: "回答して提出すると自動で採点されます。結果はその場で確認できます。",
      },
      {
        heading: "コード演習（VS Code で開く）",
        body: "コード演習のあるレッスンでは「VS Code で開く」ボタンを押すと VS Code が起動し、拡張機能が課題を開きます。初回は拡張機能のインストールが必要です。課題の実行・採点・提出は VS Code 内で行います。",
      },
    ],
  },
  {
    route: "/submissions/$submissionId",
    title: "提出物の見方",
    sections: [
      {
        heading: "提出物の状態",
        body: "提出した課題はまず「添削待ち」になり、講師の添削後に「合格」「再提出」「不合格」のいずれかで返却されます。現在の状態はこの画面で確認できます。",
      },
      {
        heading: "レビュー結果",
        body: "添削が完了すると、講師のコメントと採点結果がこの画面に表示されます。「再提出」の場合はコメントを反映して再度提出してください。",
      },
    ],
  },
  {
    route: "/certificates",
    title: "修了証の使い方",
    sections: [
      {
        heading: "発行条件",
        body: "コースの修了条件（全レッスンの完了。コースによっては小テストや課題の合格も含む）を満たすと修了証を発行できます。コースの設定によっては、発行に講師の承認が必要です。",
      },
      {
        heading: "修了証の検証",
        body: "発行された修了証には検証用のリンクが付きます。リンクを共有すると、第三者が修了証の真正性を確認できます。",
      },
    ],
  },
  {
    route: "/settings",
    title: "設定画面の使い方",
    sections: [
      {
        heading: "設定できること",
        body: "プロフィールなどのアカウント情報を確認・変更できます。画面の配色（ライト / ダーク）は右上の月・太陽アイコンからいつでも切り替えられます。",
      },
    ],
  },
];

/** どのトピックにも一致しない画面 (講師・管理者画面など) で出す汎用ヘルプ。 */
export const GENERIC_HELP: { title: string; sections: HelpSection[] } = {
  title: "このアプリについて",
  sections: [
    {
      heading: "FALCON INFORMAL とは",
      body: "動画・ドキュメント・クイズ・コード演習で学ぶ研修プラットフォームです。学習はダッシュボードまたはコース一覧から始められます。",
    },
    {
      heading: "画面ごとのヘルプ",
      body: "ダッシュボード・コース・レッスンなどの画面では、この「?」ボタンからその画面の使い方を表示します。",
    },
  ],
};

/**
 * 現在のパスに対応するヘルプトピックを返す。 一致なしは null (呼び出し側で
 * GENERIC_HELP にフォールバックする)。 `$` 始まりのセグメントは任意の
 * 1 セグメントにマッチし、 末尾スラッシュは無視する。
 */
export function findHelpTopic(pathname: string): HelpTopic | null {
  const segments = pathname.split("/").filter(Boolean);
  return (
    HELP_TOPICS.find((topic) => {
      const pattern = topic.route.split("/").filter(Boolean);
      if (pattern.length !== segments.length) return false;
      return pattern.every((part, i) => part.startsWith("$") || part === segments[i]);
    }) ?? null
  );
}
