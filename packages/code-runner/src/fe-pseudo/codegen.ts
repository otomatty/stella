/**
 * 擬似言語 AST → JavaScript のコード生成 (#133)。
 *
 * 生成先は QuickJS (`js-runner`)。 `runFunctionTest` が学習者コードの直後に
 * `__jsreview_scope__.<関数名> = <関数名>` を挿し込む前提なので、 関数は必ず
 * トップレベルの `function` 宣言として出す (`const f = () => {}` にはしない)。
 *
 * 実数除算:
 *   \`÷\` は既定で \`__feDiv\` (両辺が整数値なら切り捨て) に落とす。 ただし宣言された型から
 *   実数だと分かる式は \`__feRealDiv\` を選ぶ。 JS の数値は \`10.0\` と \`10\` を区別できず、
 *   実行時の値だけを見ると \`実数型\` の割り算まで切り捨ててしまうため。
 *
 * 変数のスコープ:
 *   擬似言語の変数宣言はブロックではなく手続き全体に効く。 一方 JS の `let` は
 *   ブロックスコープなので、 `if` の中で宣言した変数を `endif` の後で使うコードが
 *   落ちてしまう。 これを避けるため、 宣言はすべて関数 (またはトップレベル) の
 *   先頭に巻き上げ、 宣言文そのものは初期値の代入だけに変換する。
 */

import type { Expr, FuncDecl, Param, Program, Stmt } from "./ast.js";
import { jsUserIdent } from "./names.js";
import { FE_PSEUDO_RUNTIME } from "./runtime.js";

/** 呼び出し名をランタイム関数に読み替える組み込み (教材独自の拡張)。 */
const BUILTIN_CALLS: Record<string, string> = {
  出力: "__feOut",
};

const BINARY_JS_OPS: Record<string, string> = {
  or: "||",
  and: "&&",
  "=": "===",
  "≠": "!==",
  ">": ">",
  "<": "<",
  "≧": ">=",
  "≦": "<=",
  "+": "+",
  "-": "-",
  "×": "*",
};

export function generate(program: Program): string {
  const topLevelStmts = program.body.filter((node): node is Stmt => node.kind !== "func");
  const funcs = program.body.filter((node): node is FuncDecl => node.kind === "func");

  const realReturningFuncs = new Set(
    funcs.filter((f) => isRealType(f.returnType)).map((f) => f.name),
  );
  const generator = new Generator(realReturningFuncs);
  const chunks: string[] = [];

  for (const func of funcs) {
    chunks.push(generator.func(func));
  }
  // トップレベルの宣言も巻き上げる。 関数宣言は JS 側でホイストされるので順序は問わない。
  generator.enterScope([], topLevelStmts);
  chunks.push(generator.block(topLevelStmts, 0));

  return `${FE_PSEUDO_RUNTIME}\n${chunks.join("\n").trimEnd()}\n`;
}

class Generator {
  private tempId = 0;
  /** 現在のスコープで `実数型` と宣言された変数。 実数除算の判定に使う。 */
  private realScalars = new Set<string>();
  /** 現在のスコープで `実数型の配列` と宣言された変数。 */
  private realArrays = new Set<string>();
  /** 現在のスコープで `実数型の配列の配列` (2 次元以上) と宣言された変数。 */
  private realNestedArrays = new Set<string>();

  constructor(private readonly realReturningFuncs: Set<string>) {}

  func(node: FuncDecl): string {
    this.enterScope(node.params, node.body);
    const body = this.block(
      node.body,
      1,
      node.params.map((p) => p.name),
    );
    const params = node.params.map((p) => jsUserIdent(p.name)).join(", ");
    return `function ${jsUserIdent(node.name)}(${params}) {\n${body}}\n`;
  }

  /** スコープに入るとき、 実数として扱う名前を宣言と仮引数から集め直す。 */
  enterScope(params: Param[], stmts: Stmt[]): void {
    this.realScalars = new Set();
    this.realArrays = new Set();
    this.realNestedArrays = new Set();
    for (const param of params) {
      this.registerTypedName(param.typeName, param.name);
    }
    for (const declared of collectDeclarations(stmts)) {
      this.registerTypedName(declared.typeName, declared.name);
    }
  }

  private registerTypedName(typeName: string | undefined, name: string): void {
    if (!isRealType(typeName)) {
      return;
    }
    if (typeName?.includes("の配列")) {
      const depth = (typeName.match(/の配列/g) ?? []).length;
      if (depth >= 2) {
        this.realNestedArrays.add(name);
      } else {
        this.realArrays.add(name);
      }
      return;
    }
    this.realScalars.add(name);
  }

  /**
   * 文の並びを 1 つのスコープとして出力する。
   * `declaredOutside` は仮引数など、 巻き上げ対象から外す名前。
   */
  block(stmts: Stmt[], depth: number, declaredOutside: string[] = []): string {
    const hoisted = collectDeclaredNames(stmts).filter((n) => !declaredOutside.includes(n));
    const indent = "  ".repeat(depth);
    const lines: string[] = [];
    if (hoisted.length > 0) {
      lines.push(`${indent}let ${hoisted.map(jsUserIdent).join(", ")};`);
    }
    for (const stmt of stmts) {
      lines.push(this.stmt(stmt, depth));
    }
    return lines.length > 0 ? `${lines.join("\n")}\n` : "";
  }

  /** ブロックの中身だけを出す (宣言の巻き上げは外側のスコープが済ませている)。 */
  private innerBlock(stmts: Stmt[], depth: number): string {
    const lines = stmts.map((stmt) => this.stmt(stmt, depth));
    return lines.length > 0 ? `${lines.join("\n")}\n` : "";
  }

  private stmt(node: Stmt, depth: number): string {
    const indent = "  ".repeat(depth);

    switch (node.kind) {
      case "declare": {
        // 宣言そのものは巻き上げ済み。 初期値があるものだけ代入に落とす。
        const assignments = node.declarators
          .filter((d) => d.init !== undefined)
          .map((d) => `${indent}${jsUserIdent(d.name)} = ${this.expr(d.init as Expr)};`);
        return assignments.length > 0 ? assignments.join("\n") : `${indent}// (宣言)`;
      }
      case "assign": {
        if (node.target.kind === "index") {
          const target = this.expr(node.target.target);
          const index = this.expr(node.target.index);
          return `${indent}__feSet(${target}, ${index}, ${this.expr(node.value)});`;
        }
        return `${indent}${jsUserIdent(node.target.name)} = ${this.expr(node.value)};`;
      }
      case "expr":
        return `${indent}${this.expr(node.expr)};`;
      case "return":
        return node.value === undefined
          ? `${indent}return;`
          : `${indent}return ${this.expr(node.value)};`;
      case "if": {
        const parts: string[] = [];
        node.branches.forEach((branch, i) => {
          const head = i === 0 ? "if" : "} else if";
          parts.push(`${indent}${head} (${this.expr(branch.test)}) {`);
          parts.push(this.innerBlock(branch.body, depth + 1).trimEnd());
        });
        if (node.elseBody !== undefined) {
          parts.push(`${indent}} else {`);
          parts.push(this.innerBlock(node.elseBody, depth + 1).trimEnd());
        }
        parts.push(`${indent}}`);
        return parts.filter((line) => line.length > 0).join("\n");
      }
      case "while":
        return [
          `${indent}while (${this.expr(node.test)}) {`,
          this.innerBlock(node.body, depth + 1).trimEnd(),
          `${indent}}`,
        ]
          .filter((line) => line.length > 0)
          .join("\n");
      case "doWhile":
        return [
          `${indent}do {`,
          this.innerBlock(node.body, depth + 1).trimEnd(),
          `${indent}} while (${this.expr(node.test)});`,
        ]
          .filter((line) => line.length > 0)
          .join("\n");
      case "for": {
        // 上限と増分はループ開始時に 1 度だけ評価する (擬似言語の for の解釈)。
        const id = ++this.tempId;
        const to = `__feTo${id}`;
        const step = `__feStep${id}`;
        const compare = node.direction === "up" ? "<=" : ">=";
        const update = node.direction === "up" ? "+=" : "-=";
        const loopVar = jsUserIdent(node.varName);
        return [
          `${indent}{`,
          `${indent}  const ${to} = ${this.expr(node.to)};`,
          `${indent}  const ${step} = ${this.expr(node.step)};`,
          `${indent}  for (${loopVar} = ${this.expr(node.from)}; ${loopVar} ${compare} ${to}; ${loopVar} ${update} ${step}) {`,
          this.innerBlock(node.body, depth + 2).trimEnd(),
          `${indent}  }`,
          `${indent}}`,
        ]
          .filter((line) => line.length > 0)
          .join("\n");
      }
      default: {
        const exhaustive: never = node;
        return exhaustive;
      }
    }
  }

  private expr(node: Expr): string {
    switch (node.kind) {
      case "number":
        return String(node.value);
      case "string":
        return JSON.stringify(node.value);
      case "bool":
        return node.value ? "true" : "false";
      case "ident":
        return jsUserIdent(node.name);
      case "array":
        return `[${node.elements.map((e) => this.expr(e)).join(", ")}]`;
      case "length":
        return `__feLen(${this.expr(node.target)})`;
      case "index": {
        if (node.index2 !== undefined) {
          const target = this.expr(node.target);
          const row = this.expr(node.index);
          const col = this.expr(node.index2);
          return `__feIdx(__feIdx(${target}, ${row}), ${col})`;
        }
        return `__feIdx(${this.expr(node.target)}, ${this.expr(node.index)})`;
      }
      case "call": {
        const callee = BUILTIN_CALLS[node.callee] ?? jsUserIdent(node.callee);
        return `${callee}(${node.args.map((a) => this.expr(a)).join(", ")})`;
      }
      case "unary": {
        if (node.op === "not") {
          return `(!${this.expr(node.arg)})`;
        }
        return `(${node.op}${this.expr(node.arg)})`;
      }
      case "binary": {
        const left = this.expr(node.left);
        const right = this.expr(node.right);
        if (node.op === "÷") {
          const helper =
            this.isReal(node.left) || this.isReal(node.right) ? "__feRealDiv" : "__feDiv";
          return `${helper}(${left}, ${right})`;
        }
        if (node.op === "%") {
          return `__feMod(${left}, ${right})`;
        }
        return `(${left} ${BINARY_JS_OPS[node.op]} ${right})`;
      }
      default: {
        const exhaustive: never = node;
        return exhaustive;
      }
    }
  }

  /**
   * 宣言された型から「実数として扱う式」かを静的に判定する。
   * 判断がつかないものは false (= 整数として扱い `__feDiv` で切り捨てる)。
   */
  private isReal(node: Expr): boolean {
    switch (node.kind) {
      case "number":
        return node.raw.includes(".");
      case "ident":
        return this.realScalars.has(node.name);
      case "index":
        if (node.index2 !== undefined) {
          return node.target.kind === "ident" && this.realNestedArrays.has(node.target.name);
        }
        if (node.target.kind === "ident") {
          if (this.realArrays.has(node.target.name)) {
            return true;
          }
          if (this.realNestedArrays.has(node.target.name)) {
            return false;
          }
        }
        if (
          node.target.kind === "index" &&
          node.target.index2 === undefined &&
          node.target.target.kind === "ident" &&
          this.realNestedArrays.has(node.target.target.name)
        ) {
          return true;
        }
        return false;
      case "call":
        return this.realReturningFuncs.has(node.callee);
      case "unary":
        return node.op !== "not" && this.isReal(node.arg);
      case "binary":
        // 実数が伝播するのは算術演算だけ。 比較・論理は真偽値、 `%` は整数。
        if (node.op === "+" || node.op === "-" || node.op === "×" || node.op === "÷") {
          return this.isReal(node.left) || this.isReal(node.right);
        }
        return false;
      default:
        return false;
    }
  }
}

/** `実数型` / `実数型の配列` かどうか。 */
function isRealType(typeName: string | undefined): boolean {
  return typeName?.startsWith("実数型") ?? false;
}

/** 宣言された変数を型名つきで集める (実数除算の判定用)。 */
function collectDeclarations(stmts: Stmt[]): Array<{ name: string; typeName: string }> {
  const found: Array<{ name: string; typeName: string }> = [];

  const walk = (list: Stmt[]): void => {
    for (const stmt of list) {
      switch (stmt.kind) {
        case "declare":
          for (const declarator of stmt.declarators) {
            found.push({ name: declarator.name, typeName: stmt.typeName });
          }
          break;
        case "if":
          for (const branch of stmt.branches) {
            walk(branch.body);
          }
          if (stmt.elseBody !== undefined) {
            walk(stmt.elseBody);
          }
          break;
        case "while":
        case "doWhile":
        case "for":
          walk(stmt.body);
          break;
        default:
          break;
      }
    }
  };

  walk(stmts);
  return found;
}

/**
 * 手続き全体で見える変数名を集める。
 * 擬似言語の宣言はブロックスコープを作らないので、 入れ子のブロックも辿る。
 */
function collectDeclaredNames(stmts: Stmt[]): string[] {
  const names: string[] = [];

  const walk = (list: Stmt[]): void => {
    for (const stmt of list) {
      switch (stmt.kind) {
        case "declare":
          for (const declarator of stmt.declarators) {
            if (!names.includes(declarator.name)) {
              names.push(declarator.name);
            }
          }
          break;
        case "if":
          for (const branch of stmt.branches) {
            walk(branch.body);
          }
          if (stmt.elseBody !== undefined) {
            walk(stmt.elseBody);
          }
          break;
        case "while":
        case "doWhile":
        case "for":
          walk(stmt.body);
          break;
        default:
          break;
      }
    }
  };

  walk(stmts);
  return names;
}
