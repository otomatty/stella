// wrangler が .wasm をコンパイル済みのモジュールとして取り込む(wrangler.jsonc の rules)
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}
