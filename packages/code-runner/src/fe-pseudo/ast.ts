/**
 * 擬似言語 (基本情報技術者試験 科目B) の AST 定義 (#133)。
 *
 * 型注釈は codegen で捨てる (擬似言語に静的型検査は無く、 整数除算の切り捨ても
 * 実行時判定で足りるため)。 宣言文が持つのは「名前」と「初期値」だけ。
 */

export interface Program {
  body: TopLevel[];
}

export type TopLevel = FuncDecl | Stmt;

export interface Param {
  name: string;
  /** 宣言された型名 (`整数型` / `実数型の配列` など)。 省略された場合は undefined。 */
  typeName?: string;
}

export interface FuncDecl {
  kind: "func";
  name: string;
  params: Param[];
  /** 戻り値の型名。 手続き (戻り値なし) では undefined。 */
  returnType?: string;
  body: Stmt[];
  line: number;
}

export type Stmt =
  | DeclareStmt
  | AssignStmt
  | IfStmt
  | WhileStmt
  | DoWhileStmt
  | ForStmt
  | ReturnStmt
  | ExprStmt;

export interface Declarator {
  name: string;
  init?: Expr;
  line: number;
}

export interface DeclareStmt {
  kind: "declare";
  /** 宣言された型名。 実数除算の判定 (`codegen.ts`) だけに使う。 */
  typeName: string;
  declarators: Declarator[];
  line: number;
}

export interface AssignStmt {
  kind: "assign";
  target: IdentExpr | IndexExpr;
  value: Expr;
  line: number;
}

export interface IfBranch {
  test: Expr;
  body: Stmt[];
}

export interface IfStmt {
  kind: "if";
  branches: IfBranch[];
  elseBody?: Stmt[];
  line: number;
}

export interface WhileStmt {
  kind: "while";
  test: Expr;
  body: Stmt[];
  line: number;
}

export interface DoWhileStmt {
  kind: "doWhile";
  body: Stmt[];
  test: Expr;
  line: number;
}

export interface ForStmt {
  kind: "for";
  varName: string;
  from: Expr;
  to: Expr;
  step: Expr;
  direction: "up" | "down";
  body: Stmt[];
  line: number;
}

export interface ReturnStmt {
  kind: "return";
  value?: Expr;
  line: number;
}

export interface ExprStmt {
  kind: "expr";
  expr: Expr;
  line: number;
}

export type Expr =
  | NumberExpr
  | StringExpr
  | BoolExpr
  | IdentExpr
  | UnaryExpr
  | BinaryExpr
  | CallExpr
  | IndexExpr
  | ArrayExpr
  | LengthExpr;

export interface NumberExpr {
  kind: "number";
  value: number;
  /** ソース上の表記。 `1.0` のように小数点を持つかで実数リテラルを見分ける。 */
  raw: string;
  line: number;
}

export interface StringExpr {
  kind: "string";
  value: string;
  line: number;
}

export interface BoolExpr {
  kind: "bool";
  value: boolean;
  line: number;
}

export interface IdentExpr {
  kind: "ident";
  name: string;
  line: number;
}

export interface UnaryExpr {
  kind: "unary";
  op: "-" | "+" | "not";
  arg: Expr;
  line: number;
}

export type BinaryOp =
  | "or"
  | "and"
  | "="
  | "≠"
  | ">"
  | "<"
  | "≧"
  | "≦"
  | "+"
  | "-"
  | "×"
  | "÷"
  | "%";

export interface BinaryExpr {
  kind: "binary";
  op: BinaryOp;
  left: Expr;
  right: Expr;
  line: number;
}

export interface CallExpr {
  kind: "call";
  callee: string;
  args: Expr[];
  line: number;
}

export interface IndexExpr {
  kind: "index";
  target: Expr;
  index: Expr;
  /** 公式記法 `配列[i, j]` の列添字 (1 起点)。 */
  index2?: Expr;
  line: number;
}

export interface ArrayExpr {
  kind: "array";
  elements: Expr[];
  line: number;
}

/** `arrayの要素数` (後置の組み込み)。 */
export interface LengthExpr {
  kind: "length";
  target: Expr;
  line: number;
}
