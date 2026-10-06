import { expect, fn, userEvent, within } from "storybook/test";
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

/** 押せない状態。押しても onClick が呼ばれないことを確かめる。 */
export const Disabled = {
  args: { disabled: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "保存する" });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
