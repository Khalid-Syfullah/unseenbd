import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../../test/i18n";
import { BangladeshMap, MAP_DISTRICTS } from "./BangladeshMap";
import { WorldMap, WORLD_COUNTRIES, type WorldStatus } from "./WorldMap";

const [first, second, third] = MAP_DISTRICTS;

function Visited({ onToggle }: { onToggle?: (slug: string, on: boolean) => void }) {
  const [visited, setVisited] = useState<string[]>([]);
  return (
    <BangladeshMap
      visited={visited}
      onToggle={(slug, on) => {
        onToggle?.(slug, on);
        setVisited((v) => (on ? [...v, slug] : v.filter((x) => x !== slug)));
      }}
    />
  );
}

describe("BangladeshMap", () => {
  it("renders all 64 districts as buttons named with their division", () => {
    renderWithI18n(<Visited />);
    const map = screen.getByRole("group", { name: "Map of the 64 districts of Bangladesh" });
    const buttons = within(map).getAllByRole("button");
    expect(buttons).toHaveLength(64);
    expect(within(map).getByRole("button", { name: "Dhaka, Dhaka" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(map).getByRole("button", { name: "Sylhet, Sylhet" })).toBeInTheDocument();
  });

  it("is one tab stop; arrow keys move between districts in list order", async () => {
    const user = userEvent.setup();
    renderWithI18n(<Visited />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.filter((b) => b.getAttribute("tabindex") === "0")).toHaveLength(1);

    await user.tab();
    expect(buttons[0]).toHaveFocus();
    expect(buttons[0]).toHaveAccessibleName(`${first!.name_en}, Dhaka`);

    await user.keyboard("{ArrowRight}");
    expect(buttons[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(buttons[2]).toHaveFocus();
    expect(buttons[2]).toHaveAccessibleName(new RegExp(`^${third!.name_en},`));
    await user.keyboard("{ArrowLeft}");
    expect(buttons[1]).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(buttons[63]).toHaveFocus(); // wraps round
    await user.keyboard("{Home}");
    expect(buttons[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(buttons[63]).toHaveFocus();

    // The roving tab stop follows focus.
    expect(buttons[63]).toHaveAttribute("tabindex", "0");
    expect(buttons[0]).toHaveAttribute("tabindex", "-1");
  });

  it("toggles visited with Enter and Space", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderWithI18n(<Visited onToggle={onToggle} />);
    const buttons = screen.getAllByRole("button");

    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(buttons[1]).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenLastCalledWith(second!.slug, true);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("data-state", "visited");

    await user.keyboard(" ");
    expect(onToggle).toHaveBeenLastCalledWith(second!.slug, false);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("toggles on click and shows a tooltip on focus", async () => {
    const user = userEvent.setup();
    renderWithI18n(<Visited />, { locale: "bn" });
    const sylhet = screen.getByRole("button", { name: "সিলেট, সিলেট" });
    await user.click(sylhet);
    expect(sylhet).toHaveAttribute("aria-pressed", "true");
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("সিলেট");
    expect(tip).toHaveTextContent("Sylhet");
    expect(sylhet).toHaveAttribute("aria-describedby", tip.id);
  });

  it("selects a district with onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithI18n(<BangladeshMap onSelect={onSelect} selected="khulna" />);
    // The selected district holds the tab stop.
    await user.tab();
    expect(screen.getByRole("button", { name: "Khulna, Khulna" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Khulna, Khulna" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is a plain image without handlers", () => {
    renderWithI18n(<BangladeshMap visited={["dhaka"]} />);
    expect(
      screen.getByRole("img", { name: "Map of the 64 districts of Bangladesh" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("WorldMap", () => {
  it("marks and clears countries from the keyboard", async () => {
    function Demo() {
      const [value, setValue] = useState<Record<string, WorldStatus>>({});
      return (
        <WorldMap
          value={value}
          mark="wish"
          onChange={(key, status) =>
            setValue((v) => {
              const next = { ...v };
              if (status) next[key] = status;
              else delete next[key];
              return next;
            })
          }
        />
      );
    }
    const user = userEvent.setup();
    renderWithI18n(<Demo />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(WORLD_COUNTRIES.length);

    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(buttons[1]).toHaveAttribute("data-state", "wish");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAccessibleName(`${WORLD_COUNTRIES[1]!.nameEn}: Want to go`);
    await user.keyboard("{Enter}");
    expect(buttons[1]).not.toHaveAttribute("data-state");
  });
});
