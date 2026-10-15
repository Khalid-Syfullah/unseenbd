import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithI18n } from "../../../test/i18n";
import { ChipRow, DistrictChip, FilterChip } from "./Chip";

function KindFilter() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (k: string) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  return (
    <ChipRow label="Type">
      <FilterChip selected={selected.length === 0} onClick={() => setSelected([])}>
        All
      </FilterChip>
      <FilterChip
        icon="kinds/beach"
        selected={selected.includes("beach")}
        onClick={() => toggle("beach")}
      >
        Beaches
      </FilterChip>
      <FilterChip
        icon="kinds/hill"
        selected={selected.includes("hill")}
        onClick={() => toggle("hill")}
      >
        Hills
      </FilterChip>
    </ChipRow>
  );
}

describe("FilterChip", () => {
  it("toggles selection with aria-pressed", async () => {
    const user = userEvent.setup();
    renderWithI18n(<KindFilter />);
    const group = screen.getByRole("group", { name: "Type" });
    expect(group).toBeInTheDocument();

    const all = screen.getByRole("button", { name: "All" });
    const beaches = screen.getByRole("button", { name: "Beaches" });
    const hills = screen.getByRole("button", { name: "Hills" });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(beaches).toHaveAttribute("aria-pressed", "false");

    await user.click(beaches);
    expect(beaches).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");

    await user.click(hills);
    expect(hills).toHaveAttribute("aria-pressed", "true");
    expect(beaches).toHaveAttribute("aria-pressed", "true");

    await user.click(beaches);
    expect(beaches).toHaveAttribute("aria-pressed", "false");

    await user.click(all);
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(hills).toHaveAttribute("aria-pressed", "false");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    renderWithI18n(<KindFilter />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Beaches" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Beaches" })).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Beaches" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders a link with aria-current when given href", () => {
    renderWithI18n(
      <>
        <FilterChip href="/en/explore?kind=hill" selected>
          Hills
        </FilterChip>
        <FilterChip href="/en/explore?kind=beach">Beaches</FilterChip>
      </>,
    );
    expect(screen.getByRole("link", { name: "Hills" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Beaches" })).not.toHaveAttribute("aria-current");
  });
});

describe("DistrictChip", () => {
  it("shows a check and aria-pressed when visited", async () => {
    function Demo() {
      const [visited, setVisited] = useState(false);
      return (
        <DistrictChip visited={visited} onClick={() => setVisited((v) => !v)}>
          Sylhet
        </DistrictChip>
      );
    }
    const user = userEvent.setup();
    renderWithI18n(<Demo />);
    const chip = screen.getByRole("button", { name: "Sylhet" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip.querySelector("svg")).toBeNull();
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip.querySelector("svg")).not.toBeNull();
  });
});
