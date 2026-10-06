import { fn } from "storybook/test";
import { Button } from "./Button.jsx";

export default {
  title: "部品/Button",
  component: Button,
  args: { children: "保存する", onClick: fn() },
};

/** いちばんよく使う見た目。 */
export const Primary = {
  args: { variant: "primary" },
};

/** 二番目の操作に使う控えめな見た目。 */
export const Secondary = {
  args: { variant: "secondary" },
};

// TODO: 押せない状態 (Disabled) の見本を足す。押しても onClick が呼ばれないことも確かめる
