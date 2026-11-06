// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough
//
// 次の20個の関数を、switch 文で書いてください。引数と戻り値には型注釈を付けること。
// 同じ処理にしたい case は、case 3: case 4: case 5: のように並べる。
// 引数がユニオン型なら、すべての case を書く（ESLint の switch-exhaustiveness-check）。数値や文字列なら default を書く。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 0〜6 を "日"〜"土" にする。それ以外は "?"
//     例: dayName(1) → "月"
export function dayName() {}

// 問2 月から季節を返す。3〜5 は "春"、6〜8 は "夏"、9〜11 は "秋"、12〜2 は "冬"。それ以外は Error を投げる
//     例: seasonOfMonth(4) → "春"
export function seasonOfMonth() {}

// 問3 op が "+"、"-"、"*"、"/" のどれかで、a と b を計算する
//     例: calc(6, "/", 3) → 2
export function calc() {}

// 問4 200 は "OK"、201 は "Created"、404 は "Not Found"、500 は "Internal Server Error"、それ以外は "Unknown"
//     例: httpMessage(404) → "Not Found"
export function httpMessage() {}

// 問5 プラン "free"、"pro"、"team" の利用人数の上限を返す。1、10、100
//     例: planLimit("pro") → 10
export function planLimit() {}

// 問6 "red"、"green"、"blue" を "#ff0000"、"#00ff00"、"#0000ff" にする
//     例: colorHex("blue") → "#0000ff"
export function colorHex() {}

// 問7 方角 "N"、"E"、"S"、"W" を、左に90度回った方角にする。N → W → S → E → N
//     例: turnLeft("N") → "W"
export function turnLeft() {}

// 問8 1〜5 をローマ数字 "I"〜"V" にする。それ以外は空の文字列
//     例: romanDigit(4) → "IV"
export function romanDigit() {}

// 問9 成績 "A"、"B"、"C"、"D"、"F" を 4、3、2、1、0 にする
//     例: gradePoint("B") → 3
export function gradePoint() {}

// 問10 単位 "mm"、"cm"、"m"、"km" が何メートルかを返す。0.001、0.01、1、1000
//     例: metersPer("km") → 1000
export function metersPer() {}

// 問11 サイズ "S"、"M"、"L"、"XL" を 1、2、3、4 にする
//     例: sizeOrder("L") → 3
export function sizeOrder() {}

// 問12 "月"〜"金" は "平日"、"土" と "日" は "週末"、それ以外は Error を投げる
//     例: dayKind("土") → "週末"
export function dayKind() {}

// 問13 月（1〜12）が第何四半期かを返す。1〜3月は 1、4〜6月は 2、7〜9月は 3、10〜12月は 4。それ以外は Error を投げる
//     例: quarterOf(5) → 2
export function quarterOf() {}

// 問14 気分 "happy"、"sad"、"angry" を "😊"、"😢"、"😠" にする
//     例: moodEmoji("sad") → "😢"
export function moodEmoji() {}

// 問15 拡張子 "png"、"jpg"、"gif" は "画像"、"mp4"、"mov" は "動画"、"pdf"、"docx" は "文書"、それ以外は "その他"
//     例: fileKind("jpg") → "画像"
export function fileKind() {}

// 問16 英小文字1文字が a、e、i、o、u なら "母音"、それ以外は "子音"
//     例: letterKind("e") → "母音"
export function letterKind() {}

// 問17 信号 "red"、"yellow"、"green" を "止まれ"、"注意"、"進め" にする
//     例: signalAction("yellow") → "注意"
export function signalAction() {}

// 問18 キーの番号 13 は "Enter"、27 は "Escape"、32 は "Space"、それ以外は "Other"
//     例: keyName(13) → "Enter"
export function keyName() {}

// 問19 星座 "牡羊"、"獅子"、"射手" は "火"、"牡牛"、"乙女"、"山羊" は "地" を返す
//     例: elementOf("乙女") → "地"
export function elementOf() {}

// 問20 優先度 "high"、"middle"、"low" を 3、2、1 にする
//     例: priorityWeight("middle") → 2
export function priorityWeight() {}
