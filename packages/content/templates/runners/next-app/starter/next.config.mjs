/** @type {import("next").NextConfig} */
const nextConfig = {
  // 課題フォルダーをアプリの根にする。学習フォルダーの上の階層に別の lockfile が
  // あっても、そちらを根と取り違えない。
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
