import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { LikeButton } from "./solution.jsx";

test("empieza en cero sin props", () => {
  render(<LikeButton />);
  expect(screen.getByRole("button").textContent).toBe("Me gusta (0)");
});

test("Inde le da like a la foto de Claire y suma uno", async () => {
  render(<LikeButton initial={41} />);
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("Me gusta (42)");
});

test("cuenta varios clicks", async () => {
  render(<LikeButton />);
  const button = screen.getByRole("button");
  await userEvent.click(button);
  await userEvent.click(button);
  await userEvent.click(button);
  expect(button.textContent).toBe("Me gusta (3)");
});

test("aria-pressed cambia a true con el primer like", async () => {
  render(<LikeButton initial={5} />);
  const button = screen.getByRole("button");
  expect(button.getAttribute("aria-pressed")).toBe("false");
  await userEvent.click(button);
  expect(button.getAttribute("aria-pressed")).toBe("true");
});
