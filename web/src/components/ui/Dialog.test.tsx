import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../../test/i18n";
import { Button } from "./Button";
import { Dialog, Sheet } from "./Dialog";

function Demo({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <button type="button">Outside</button>
      <Dialog
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Send a tip"
        footer={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button>Send</Button>
          </>
        }
      >
        <label>
          Message <input />
        </label>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens with focus inside, labelled by its title", async () => {
    const user = userEvent.setup();
    renderWithI18n(<Demo />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Send a tip" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // The close button is the first focusable element.
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("traps focus: Tab and Shift+Tab cycle inside the dialog", async () => {
    const user = userEvent.setup();
    renderWithI18n(<Demo />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Close" });
    const input = within(dialog).getByRole("textbox", { name: "Message" });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const send = within(dialog).getByRole("button", { name: "Send" });

    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(send).toHaveFocus();
    await user.tab(); // wraps to the first element, never reaches "Outside"
    expect(close).toHaveFocus();
    await user.tab({ shift: true }); // and back to the last
    expect(send).toHaveFocus();
    expect(screen.getByRole("button", { name: "Outside" })).not.toHaveFocus();
  });

  it("closes on Esc and returns focus to the opener", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithI18n(<Demo onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    renderWithI18n(<Demo />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Sheet", () => {
  it("traps focus and closes on Esc", async () => {
    function SheetDemo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Menu
          </button>
          <Sheet open={open} onClose={() => setOpen(false)} title="Menu panel">
            <a href="https://example.com/explore">Explore</a>
          </Sheet>
        </>
      );
    }
    const user = userEvent.setup();
    renderWithI18n(<SheetDemo />);
    const opener = screen.getByRole("button", { name: "Menu" });
    await user.click(opener);
    const sheet = screen.getByRole("dialog", { name: "Menu panel" });
    expect(within(sheet).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab();
    expect(within(sheet).getByRole("link", { name: "Explore" })).toHaveFocus();
    await user.tab();
    expect(within(sheet).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
