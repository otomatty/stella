/**
 * 擬似言語 (基本情報技術者試験 科目B) の構文解析 (#133)。
 *
 * 対応する構文は `SYNTAX.md` に明記したサブセットのみ。 サブセット外は
 * 黙って誤動作させず、 行番号つきの日本語エラー (`FePseudoError`) で弾く。
 *
 * ブロックの閉じ方は 3 通りある:
 * - `endif` / `endwhile` / `endfor` … 終端キーワードで閉じる (大半)
 * - 関数本体 … `○` の行より深いインデントが本体。 デデントか次の `○` で終わる
 * - `do 〜 while` … `do` と同じ深さまで戻った `while` が終端 (ネストした while と区別)
 */

import type {
  Declarator,
  Expr,
  ForStmt,
  FuncDecl,
  IdentExpr,
  IfBranch,
  IndexExpr,
  Param,
  Program,
  Stmt,
  TopLevel,
} from "./ast.js";
import { feError } from "./errors.js";
import { FORBIDDEN_CALLEES } from "./names.js";
import { tokenize, type Token } from "./lexer.js";

/** 生成後の JS で衝突する名前は、 学習者の識別子として使わせない。 */
const JS_RESERVED = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "await",
  "arguments",
  "eval",
  "Function",
  "undefined",
  "NaN",
  "Infinity",
]);

/** 型注釈トークンの判定。 `整数型` `論理型の配列` などにマッチする。 */
function isTypeToken(token: Token): boolean {
  return token.kind === "ident" && /型(の配列)*$/.test(token.value);
}

export function parse(source: string): Program {
  return new Parser(tokenize(source)).parseProgram();
}

class Parser {
  private index = 0;
  /** 括弧の内側では改行を読み飛ばす (配列リテラルや引数リストの折り返しを許す)。 */
  private depth = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Program {
    const body: TopLevel[] = [];
    this.skipNewlines();
    while (!this.atEof()) {
      body.push(this.peek().value === "○" ? this.parseFunc() : this.parseStmt());
      this.skipNewlines();
    }
    return { body };
  }

  // ── トークン操作 ────────────────────────────────────────────────

  private peek(offset = 0): Token {
    let i = this.index;
    let remaining = offset;
    for (;;) {
      const token = this.tokens[i];
      if (this.depth > 0 && token.kind === "newline") {
        i += 1;
        continue;
      }
      if (remaining === 0) {
        return token;
      }
      remaining -= 1;
      i += 1;
    }
  }

  private next(): Token {
    const token = this.peek();
    this.index = this.tokens.indexOf(token, this.index) + 1;
    if (token.kind === "punct") {
      if (token.value === "(" || token.value === "[" || token.value === "{") {
        this.depth += 1;
      } else if (token.value === ")" || token.value === "]" || token.value === "}") {
        this.depth = Math.max(0, this.depth - 1);
      }
    }
    return token;
  }

  private atEof(): boolean {
    return this.peek().kind === "eof";
  }

  private check(kind: Token["kind"], value?: string): boolean {
    const token = this.peek();
    return token.kind === kind && (value === undefined || token.value === value);
  }

  private accept(kind: Token["kind"], value?: string): Token | null {
    return this.check(kind, value) ? this.next() : null;
  }

  private expect(kind: Token["kind"], value: string, what: string): Token {
    if (!this.check(kind, value)) {
      const token = this.peek();
      throw feError(
        `${what}が必要です (見つかったのは ${this.describe(token)})`,
        token.line,
        token.column,
      );
    }
    return this.next();
  }

  private describe(token: Token): string {
    if (token.kind === "eof") {
      return "プログラムの終わり";
    }
    if (token.kind === "newline") {
      return "行の終わり";
    }
    return "`" + token.value + "`";
  }

  private skipNewlines(): void {
    while (this.tokens[this.index]?.kind === "newline") {
      this.index += 1;
    }
  }

  /** 文の終わり (改行か EOF) を消費する。 1 行に 2 文を書かせない。 */
  private expectStatementEnd(): void {
    if (this.atEof()) {
      return;
    }
    if (this.tokens[this.index]?.kind === "newline") {
      this.skipNewlines();
      return;
    }
    const token = this.peek();
    throw feError(
      `1 行に 1 文だけ書いてください (${this.describe(token)} が余っています)`,
      token.line,
      token.column,
    );
  }

  private declareName(token: Token, what: string): string {
    const name = token.value;
    if (JS_RESERVED.has(name)) {
      throw feError(
        "`" + name + "` は予約語のため" + what + "に使えません",
        token.line,
        token.column,
      );
    }
    if (name.startsWith("__fe")) {
      throw feError(
        "`__fe` で始まる名前は擬似言語ランナーが使うため" + what + "に使えません",
        token.line,
        token.column,
      );
    }
    return name;
  }

  /** eval / Function / __fe* などサンドボックス回避の呼び出しを拒否する。 */
  private rejectForbiddenCallee(name: string, what: string, token: Token): void {
    if (FORBIDDEN_CALLEES.has(name)) {
      throw feError(
        "`" + name + "` は擬似言語から呼び出せません (" + what + ")",
        token.line,
        token.column,
      );
    }
    if (name.startsWith("__fe")) {
      throw feError(
        "`__fe` で始まる名前は擬似言語ランナー内部用のため" + what + "に使えません",
        token.line,
        token.column,
      );
    }
  }

  // ── 宣言 ───────────────────────────────────────────────────────

  private parseFunc(): FuncDecl {
    const circle = this.expect("punct", "○", "関数定義の `○`");
    const funcIndent = circle.indent ?? 0;

    // 戻り値の型は任意 (手続きには無い)。 実数除算の判定に使うので捨てずに持つ。
    let returnType: string | undefined;
    if (isTypeToken(this.peek()) && this.peek(1).value === ":") {
      returnType = this.next().value;
      this.next();
    }

    const nameToken = this.peek();
    if (nameToken.kind !== "ident") {
      throw feError(
        `関数名が必要です (見つかったのは ${this.describe(nameToken)})`,
        nameToken.line,
        nameToken.column,
      );
    }
    this.next();
    const name = this.declareName(nameToken, "関数名");

    const params: Param[] = [];
    this.expect("punct", "(", "引数リストの `(`");
    if (!this.check("punct", ")")) {
      do {
        let paramType: string | undefined;
        if (isTypeToken(this.peek()) && this.peek(1).value === ":") {
          paramType = this.next().value;
          this.next();
        }
        const paramToken = this.peek();
        if (paramToken.kind !== "ident") {
          throw feError(
            `引数名が必要です (見つかったのは ${this.describe(paramToken)})`,
            paramToken.line,
            paramToken.column,
          );
        }
        this.next();
        const paramName = this.declareName(paramToken, "引数名");
        params.push(
          paramType === undefined ? { name: paramName } : { name: paramName, typeName: paramType },
        );
      } while (this.accept("punct", ",") !== null);
    }
    this.expect("punct", ")", "引数リストの `)`");
    this.expectStatementEnd();

    const body = this.parseStmtsWhile(() => {
      const token = this.peek();
      // デデント (`○` と同じ深さまで戻った) か、 次の関数定義で本体は終わり。
      return (token.indent ?? 0) > funcIndent && token.value !== "○";
    });
    if (body.length === 0) {
      // 本体が空でも、 続きが無い (EOF) か次の関数定義なら「まだ書いていない骨組み」として通す。
      // 課題のスターターファイルは本体がコメントだけのことがあり、 未編集のまま採点しても
      // 構文エラーではなくテスト不合格として返したい。
      // 一方、 インデントしていない文が続く場合はインデントの誤りなので明示的に落とす
      // (黙ってトップレベルの文として実行すると、 関数が空のまま気付けない)。
      const next = this.peek();
      if (next.kind !== "eof" && next.value !== "○") {
        throw feError(
          "関数 `" + name + "` の本体は `○` の行より深くインデントしてください",
          next.line,
          next.column,
        );
      }
    }
    return returnType === undefined
      ? { kind: "func", name, params, body, line: circle.line }
      : { kind: "func", name, params, returnType, body, line: circle.line };
  }

  // ── 文 ─────────────────────────────────────────────────────────

  private parseStmtsWhile(shouldContinue: () => boolean): Stmt[] {
    const stmts: Stmt[] = [];
    this.skipNewlines();
    while (!this.atEof() && shouldContinue()) {
      stmts.push(this.parseStmt());
      this.skipNewlines();
    }
    return stmts;
  }

  /** 終端キーワードのいずれかに達するまで文を読む (終端キーワードは消費しない)。 */
  private parseBlockUntil(terminators: string[]): Stmt[] {
    return this.parseStmtsWhile(() => !terminators.includes(this.peek().value));
  }

  private parseStmt(): Stmt {
    const token = this.peek();

    if (token.kind === "keyword") {
      switch (token.value) {
        case "if":
          return this.parseIf();
        case "while":
          return this.parseWhile();
        case "do":
          return this.parseDoWhile();
        case "for":
          return this.parseFor();
        case "return":
          return this.parseReturn();
        case "endif":
        case "endwhile":
        case "endfor":
        case "elseif":
        case "else":
          throw feError(
            "対応する開始行が無い `" + token.value + "` です",
            token.line,
            token.column,
          );
        default:
          break;
      }
    }

    if (token.value === "○") {
      throw feError("関数定義 `○` は他の文の内側には書けません", token.line, token.column);
    }

    if (isTypeToken(token) && this.peek(1).value === ":") {
      return this.parseDeclare();
    }

    return this.parseAssignOrExpr();
  }

  private parseDeclare(): Stmt {
    const typeToken = this.next();
    this.expect("punct", ":", "型と変数名を区切る `:`");

    const declarators: Declarator[] = [];
    do {
      const nameToken = this.peek();
      if (nameToken.kind !== "ident") {
        throw feError(
          `変数名が必要です (見つかったのは ${this.describe(nameToken)})`,
          nameToken.line,
          nameToken.column,
        );
      }
      this.next();
      const declarator: Declarator = {
        name: this.declareName(nameToken, "変数名"),
        line: nameToken.line,
      };
      if (this.accept("op", "←") !== null) {
        declarator.init = this.parseExpression();
      }
      declarators.push(declarator);
    } while (this.accept("punct", ",") !== null);

    this.expectStatementEnd();
    return { kind: "declare", typeName: typeToken.value, declarators, line: typeToken.line };
  }

  private parseAssignOrExpr(): Stmt {
    const start = this.peek();
    const expr = this.parseExpression();

    if (this.accept("op", "←") !== null) {
      if (expr.kind !== "ident" && expr.kind !== "index") {
        throw feError("`←` の左辺には変数か配列の要素だけを書けます", start.line, start.column);
      }
      const target: IdentExpr | IndexExpr = expr;
      const value = this.parseExpression();
      this.expectStatementEnd();
      return { kind: "assign", target, value, line: start.line };
    }

    if (expr.kind !== "call") {
      throw feError(
        "文になっていません (代入は `←`、 手続き呼び出しは `名前(引数)` と書きます)",
        start.line,
        start.column,
      );
    }
    this.expectStatementEnd();
    return { kind: "expr", expr, line: start.line };
  }

  private parseIf(): Stmt {
    const start = this.expect("keyword", "if", "`if`");
    const branches: IfBranch[] = [];

    branches.push({
      test: this.parseCondition(),
      body: this.parseBlockUntil(["elseif", "else", "endif"]),
    });

    while (this.check("keyword", "elseif")) {
      this.next();
      branches.push({
        test: this.parseCondition(),
        body: this.parseBlockUntil(["elseif", "else", "endif"]),
      });
    }

    let elseBody: Stmt[] | undefined;
    if (this.accept("keyword", "else") !== null) {
      this.expectStatementEnd();
      elseBody = this.parseBlockUntil(["endif"]);
    }

    this.expectEndKeyword("endif", "if", start);
    return elseBody === undefined
      ? { kind: "if", branches, line: start.line }
      : { kind: "if", branches, elseBody, line: start.line };
  }

  private parseWhile(): Stmt {
    const start = this.expect("keyword", "while", "`while`");
    const test = this.parseCondition();
    const body = this.parseBlockUntil(["endwhile"]);
    this.expectEndKeyword("endwhile", "while", start);
    return { kind: "while", test, body, line: start.line };
  }

  private parseDoWhile(): Stmt {
    const start = this.expect("keyword", "do", "`do`");
    const doIndent = start.indent ?? 0;
    this.expectStatementEnd();

    // 本体より浅い (= `do` と同じ深さまで戻った) `while` が終端。 深い `while` は
    // 本体の中のループなので終端にしない。
    const body = this.parseStmtsWhile(() => {
      const token = this.peek();
      return !(
        token.kind === "keyword" &&
        token.value === "while" &&
        (token.indent ?? 0) <= doIndent
      );
    });

    if (!this.check("keyword", "while")) {
      throw feError("`do` に対応する `while` がありません", start.line, start.column);
    }
    if (body.length === 0) {
      throw feError(
        "`do` の本体が空です (本体は `do` より深くインデントしてください)",
        start.line,
        start.column,
      );
    }
    this.next();
    const test = this.parseExpression();
    this.expectStatementEnd();
    return { kind: "doWhile", body, test, line: start.line };
  }

  private parseFor(): Stmt {
    const start = this.expect("keyword", "for", "`for`");
    this.expect("punct", "(", "`for` の `(`");

    const varToken = this.peek();
    if (varToken.kind !== "ident") {
      throw feError(
        `繰り返しに使う変数名が必要です (見つかったのは ${this.describe(varToken)})`,
        varToken.line,
        varToken.column,
      );
    }
    this.next();
    const varName = this.declareName(varToken, "変数名");

    this.expectParticle("を", start);
    const from = this.parseExpression();
    this.expectParticle("から", start);
    const to = this.parseExpression();
    this.expectParticle("まで", start);
    const step = this.parseExpression();

    // `ずつ増やす` は `ずつ 増やす` と分かち書きされることがあるので、
    // `)` までのトークンを連結して判定する。
    let tail = "";
    while (!this.check("punct", ")") && !this.atEof()) {
      tail += this.next().value;
    }
    let direction: ForStmt["direction"];
    if (tail === "ずつ増やす") {
      direction = "up";
    } else if (tail === "ずつ減らす") {
      direction = "down";
    } else {
      throw feError(
        "`for` の終わりは `ずつ増やす` か `ずつ減らす` で書きます",
        start.line,
        start.column,
      );
    }

    this.expect("punct", ")", "`for` の `)`");
    this.expectStatementEnd();

    const body = this.parseBlockUntil(["endfor"]);
    this.expectEndKeyword("endfor", "for", start);
    return { kind: "for", varName, from, to, step, direction, body, line: start.line };
  }

  private parseReturn(): Stmt {
    const start = this.expect("keyword", "return", "`return`");
    if (this.atEof() || this.tokens[this.index]?.kind === "newline") {
      this.expectStatementEnd();
      return { kind: "return", line: start.line };
    }
    const value = this.parseExpression();
    this.expectStatementEnd();
    return { kind: "return", value, line: start.line };
  }

  private parseCondition(): Expr {
    const test = this.parseExpression();
    this.expectStatementEnd();
    return test;
  }

  private expectParticle(particle: string, start: Token): void {
    if (!this.check("particle", particle)) {
      throw feError(
        "`for` の書き方は `for (i を 1 から n まで 1 ずつ増やす)` です (`" +
          particle +
          "` が見つかりません)",
        start.line,
        start.column,
      );
    }
    this.next();
  }

  private expectEndKeyword(keyword: string, opener: string, start: Token): void {
    if (!this.check("keyword", keyword)) {
      throw feError(
        "`" + opener + "` に対応する `" + keyword + "` がありません",
        start.line,
        start.column,
      );
    }
    this.next();
    this.expectStatementEnd();
  }

  // ── 式 ─────────────────────────────────────────────────────────

  private parseExpression(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.check("keyword", "or")) {
      const token = this.next();
      left = { kind: "binary", op: "or", left, right: this.parseAnd(), line: token.line };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseComparison();
    while (this.check("keyword", "and")) {
      const token = this.next();
      left = { kind: "binary", op: "and", left, right: this.parseComparison(), line: token.line };
    }
    return left;
  }

  private parseComparison(): Expr {
    const COMPARISONS = ["=", "≠", ">", "<", "≧", "≦"];
    let left = this.parseAdditive();
    while (this.peek().kind === "op" && COMPARISONS.includes(this.peek().value)) {
      const token = this.next();
      const op = token.value as "=" | "≠" | ">" | "<" | "≧" | "≦";
      left = { kind: "binary", op, left, right: this.parseAdditive(), line: token.line };
    }
    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (this.peek().kind === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const token = this.next();
      const op = token.value as "+" | "-";
      left = { kind: "binary", op, left, right: this.parseMultiplicative(), line: token.line };
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      const isSymbolOp = token.kind === "op" && ["×", "÷", "%"].includes(token.value);
      const isModKeyword = token.kind === "keyword" && token.value === "mod";
      if (!isSymbolOp && !isModKeyword) {
        return left;
      }
      this.next();
      const op = isModKeyword ? "%" : (token.value as "×" | "÷" | "%");
      left = { kind: "binary", op, left, right: this.parseUnary(), line: token.line };
    }
  }

  private parseUnary(): Expr {
    const token = this.peek();
    if (token.kind === "keyword" && token.value === "not") {
      this.next();
      return { kind: "unary", op: "not", arg: this.parseUnary(), line: token.line };
    }
    if (token.kind === "op" && (token.value === "-" || token.value === "+")) {
      this.next();
      const op = token.value as "-" | "+";
      return { kind: "unary", op, arg: this.parseUnary(), line: token.line };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let expr = this.parsePrimary();
    for (;;) {
      if (this.check("punct", "[")) {
        const token = this.next();
        const index = this.parseExpression();
        if (this.accept("punct", ",") !== null) {
          const index2 = this.parseExpression();
          this.expect("punct", "]", "添字の `]`");
          expr = { kind: "index", target: expr, index, index2, line: token.line };
        } else {
          this.expect("punct", "]", "添字の `]`");
          expr = { kind: "index", target: expr, index, line: token.line };
        }
        continue;
      }
      if (this.check("particle", "の要素数")) {
        const token = this.next();
        expr = { kind: "length", target: expr, line: token.line };
        continue;
      }
      return expr;
    }
  }

  private parsePrimary(): Expr {
    const token = this.peek();

    if (token.kind === "number") {
      this.next();
      return { kind: "number", value: Number(token.value), raw: token.value, line: token.line };
    }
    if (token.kind === "string") {
      this.next();
      return { kind: "string", value: token.value, line: token.line };
    }
    if (token.kind === "keyword" && (token.value === "true" || token.value === "false")) {
      this.next();
      return { kind: "bool", value: token.value === "true", line: token.line };
    }
    if (token.kind === "ident") {
      this.next();
      if (this.check("punct", "(")) {
        this.rejectForbiddenCallee(token.value, "関数呼び出し", token);
        this.next();
        const args: Expr[] = [];
        if (!this.check("punct", ")")) {
          do {
            args.push(this.parseExpression());
          } while (this.accept("punct", ",") !== null);
        }
        this.expect("punct", ")", "引数リストの `)`");
        return { kind: "call", callee: token.value, args, line: token.line };
      }
      return { kind: "ident", name: token.value, line: token.line };
    }
    if (token.kind === "punct" && token.value === "(") {
      this.next();
      const inner = this.parseExpression();
      this.expect("punct", ")", "`)`");
      return inner;
    }
    if (token.kind === "punct" && token.value === "{") {
      this.next();
      const elements: Expr[] = [];
      if (!this.check("punct", "}")) {
        do {
          elements.push(this.parseExpression());
        } while (this.accept("punct", ",") !== null);
      }
      this.expect("punct", "}", "配列リテラルの `}`");
      return { kind: "array", elements, line: token.line };
    }

    throw feError(
      `式が必要です (見つかったのは ${this.describe(token)})`,
      token.line,
      token.column,
    );
  }
}
