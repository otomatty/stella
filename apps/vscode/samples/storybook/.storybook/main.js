/** @type {import("@storybook/react-vite").StorybookConfig} */
const config = {
  stories: ["../src/**/*.stories.jsx"],
  framework: "@storybook/react-vite",
  // 受講者の端末から利用状況を送らない。
  core: { disableTelemetry: true },
};

export default config;
