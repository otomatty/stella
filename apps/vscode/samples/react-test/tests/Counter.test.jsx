import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { Counter } from "../src/Counter.jsx";

describe("Counter", () => {
  test("最初は initial の数を表示する", () => {
    render(<Counter initial={3} />);
    expect(screen.getByLabelText("現在の数")).toHaveTextContent("3");
  });

  test("ボタンを押すと 1 増える", async () => {
    const user = userEvent.setup();
    render(<Counter />);
    await user.click(screen.getByRole("button", { name: "1 増やす" }));
    expect(screen.getByLabelText("現在の数")).toHaveTextContent("1");
  });
});
