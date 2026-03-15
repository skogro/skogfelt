import dayjs from "dayjs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DateField from "../src/components/DateField";
import NumericTextField from "../src/components/NumericTextField";
import SelectField from "../src/components/SelectField";
import StringTextField from "../src/components/StringTextField";

vi.mock("@mui/icons-material/Clear", () => ({
  default: () => <span>clear</span>,
}));

vi.mock("@mui/material", () => ({
  Stack: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
  InputAdornment: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  TextField: ({ label, value, onChange, onBlur, select, children, helperText, InputProps }: any) =>
    select ? (
      <label>
        {label}
        <select aria-label={label} value={value || ""} onChange={onChange} onBlur={onBlur}>
          {children}
        </select>
        {helperText ? <span>{helperText}</span> : null}
        {InputProps?.endAdornment ?? null}
      </label>
    ) : (
      <label>
        {label}
        <input aria-label={label} value={value || ""} onChange={onChange} onBlur={onBlur} />
        {helperText ? <span>{helperText}</span> : null}
        {InputProps?.endAdornment ?? null}
      </label>
    ),
  MenuItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock("@mui/x-date-pickers", () => ({
  DatePicker: ({ label, value, onChange, disabled }: any) => (
    <input
      aria-label={label}
      disabled={disabled}
      value={value ? value.format("YYYY-MM-DD") : ""}
      onChange={event => onChange(event.target.value ? dayjs(event.target.value) : null)}
    />
  ),
}));

describe("component behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("StringTextField saves debounced text changes", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <StringTextField
        value=""
        name="fullName"
        label="Full Name"
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Ada Lovelace" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("Ada Lovelace");
      expect(saveChange).toHaveBeenCalledWith("Ada Lovelace");
    });
  });

  it("StringTextField debounces and keeps only latest typed value", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <StringTextField
        value=""
        name="fullName"
        label="Full Name"
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Ada" } });
    fireEvent.change(input, { target: { value: "Ada Lovelace" } });

    vi.advanceTimersByTime(999);
    expect(onChange).not.toHaveBeenCalled();
    expect(saveChange).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(saveChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Ada Lovelace");
    expect(saveChange).toHaveBeenCalledWith("Ada Lovelace");
  });

  it("StringTextField validates required values", () => {
    render(<StringTextField value="" name="fullName" label="Full Name" required />);
    expect(screen.getByText("Full Name is required")).toBeTruthy();
  });

  it("StringTextField supports erase action and disabled save mode", async () => {
    const onErase = vi.fn(async () => undefined);
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <StringTextField
        value="Original"
        name="fullName"
        label="Full Name"
        showErase
        onErase={onErase}
        saveOnChange={false}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onErase).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Ignored Save" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
      expect(saveChange).not.toHaveBeenCalled();
    });
  });

  it("StringTextField renders save errors", async () => {
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });

    render(<StringTextField value="1" name="fullName" label="Full Name" onChange={failing} />);
    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Will Fail" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("Save failed. Keep typing to retry.")).toBeTruthy();
    });
  });

  it("StringTextField handles non-Error throws", async () => {
    const onChange = vi.fn(async () => {
      throw "boom";
    });

    render(<StringTextField value="1" name="fullName" label="Full Name" onChange={onChange} />);
    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Will Fail" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("Save failed. Keep typing to retry.")).toBeTruthy();
    });
  });

  it("StringTextField flushes pending saves on pagehide", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "flush-me" } });
    window.dispatchEvent(new Event("pagehide"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("flush-me");
      expect(saveChange).toHaveBeenCalledWith("flush-me");
    });
  });

  it("StringTextField flushes pending saves on hidden visibility", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);
    const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

    render(<StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "flush-hidden" } });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("flush-hidden");
      expect(saveChange).toHaveBeenCalledWith("flush-hidden");
    });

    if (descriptor) {
      Object.defineProperty(document, "visibilityState", descriptor);
    }
  });

  it("StringTextField clears pending timer on unmount", () => {
    const { unmount } = render(<StringTextField value="" name="fullName" label="Full Name" />);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "teardown" } });
    expect(() => unmount()).not.toThrow();
  });

  it("StringTextField keeps typed value when save finishes before prop sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <StringTextField
        value=""
        name="fullName"
        label="Full Name"
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    const input = screen.getByLabelText("Full Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "kept-value" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("kept-value");
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();

    // Simulate stale parent value before provider cache catches up.
    rerender(
      <StringTextField
        value=""
        name="fullName"
        label="Full Name"
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText("Full Name") as HTMLInputElement).value).toBe("kept-value");
    });
  });

  it("StringTextField clears awaiting sync when parent catches up", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "synced-value" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
      expect(saveChange).toHaveBeenCalledWith("synced-value");
    });

    resolveSave?.();
    await Promise.resolve();

    rerender(
      <StringTextField
        value="synced-value"
        name="fullName"
        label="Full Name"
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("StringTextField remains editable while awaiting external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    const input = screen.getByLabelText("Full Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "first" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("first");
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();

    // Parent/provider still stale after save completion.
    rerender(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    // Field should still allow typing and reflect new input.
    const staleInput = screen.getByLabelText("Full Name") as HTMLInputElement;
    fireEvent.change(staleInput, { target: { value: "first second" } });

    await waitFor(() => {
      expect((screen.getByLabelText("Full Name") as HTMLInputElement).value).toBe("first second");
    });
  });

  it("StringTextField does not double-save on blur while awaiting external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "first-pass" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    resolveSave?.();

    // Keep parent stale to preserve awaiting external sync state.
    rerender(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    fireEvent.blur(screen.getByLabelText("Full Name"));

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  it("StringTextField skips stale queued saves", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />);
    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "first" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "second" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("second");
      expect(saveChange).toHaveBeenCalledWith("second");
    });
  });

  it("StringTextField avoids state updates after unmount on successful save", async () => {
    let resolveSave: (() => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { unmount } = render(
      <StringTextField value="" name="fullName" label="Full Name" saveChange={saveChange} />
    );
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "teardown" } });
    fireEvent.blur(screen.getByLabelText("Full Name"));
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    unmount();
    resolveSave?.();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("StringTextField avoids state updates after unmount on failed save", async () => {
    let rejectSave: ((reason?: unknown) => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        })
    );

    const { unmount } = render(
      <StringTextField value="" name="fullName" label="Full Name" saveChange={saveChange} />
    );
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "teardown" } });
    fireEvent.blur(screen.getByLabelText("Full Name"));
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    unmount();
    rejectSave?.(new Error("boom"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("StringTextField does not flush while awaiting matching external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "hold" } });
    fireEvent.blur(screen.getByLabelText("Full Name"));
    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
    });

    resolveSave?.();
    rerender(
      <StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );

    fireEvent.blur(screen.getByLabelText("Full Name"));
    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
    });
  });

  it("StringTextField skips blur flush immediately after unresolved external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    render(<StringTextField value="" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "pending" } });
    fireEvent.blur(screen.getByLabelText("Full Name"));

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    await Promise.resolve();
    await Promise.resolve();

    fireEvent.blur(screen.getByLabelText("Full Name"));
    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  it("StringTextField shows saving and saved states", async () => {
    let resolveSave: (() => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );
    const onChange = vi.fn(async () => undefined);

    const { rerender } = render(
      <StringTextField value="x" name="fullName" label="Full Name" onChange={onChange} saveChange={saveChange} />
    );
    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Saving Case" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    rerender(
      <StringTextField
        value="Saving Case"
        name="fullName"
        label="Full Name"
        onChange={onChange}
        saveChange={saveChange}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("NumericTextField parses and saves numbers", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<NumericTextField value={1} label="Amount" onChange={onChange} saveChange={saveChange} />);

    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(42);
      expect(saveChange).toHaveBeenCalledWith(42);
    });
  });

  it("NumericTextField debounces and keeps only the latest typed value", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<NumericTextField value={1} label="Amount" onChange={onChange} saveChange={saveChange} />);

    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.change(input, { target: { value: "123" } });

    vi.advanceTimersByTime(999);
    expect(onChange).not.toHaveBeenCalled();
    expect(saveChange).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(saveChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(123);
    expect(saveChange).toHaveBeenCalledWith(123);
  });

  it("NumericTextField validates non-numeric and required values", () => {
    const { rerender } = render(<NumericTextField value={null} label="Amount" required />);
    expect(screen.getByText("Amount is required")).toBeTruthy();

    rerender(<NumericTextField value={null} label="Amount" required />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "abc" } });
    expect(screen.getByText("Amount must be a number")).toBeTruthy();
  });

  it("NumericTextField validates min/max and negative constraints", () => {
    const { rerender } = render(<NumericTextField value={1} label="Amount" min={3} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "2" } });
    expect(screen.getByText("Amount must be greater than 3")).toBeTruthy();

    rerender(<NumericTextField value={1} label="Amount" max={10} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12" } });
    expect(screen.getByText("Amount must be less than 10")).toBeTruthy();

    rerender(<NumericTextField value={1} label="Amount" />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "-1" } });
    expect(screen.getByText("Amount must be greater than 0")).toBeTruthy();
  });

  it("NumericTextField handles saveOnChange false and erase", async () => {
    const onErase = vi.fn(async () => undefined);
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <NumericTextField
        value={12}
        label="Amount"
        showErase
        onErase={onErase}
        saveOnChange={false}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onErase).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
      expect(saveChange).not.toHaveBeenCalled();
    });
  });

  it("NumericTextField flushes pending saves on hidden visibility", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);
    const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

    render(<NumericTextField value={1} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "55" } });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(55);
      expect(saveChange).toHaveBeenCalledWith(55);
    });

    if (descriptor) {
      Object.defineProperty(document, "visibilityState", descriptor);
    }
  });

  it("NumericTextField supports negative values when enabled", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <NumericTextField
        value={1}
        label="Amount"
        allowNegative
        onChange={onChange}
        saveChange={saveChange}
      />
    );
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "-5" } });
    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(-5);
      expect(saveChange).toHaveBeenCalledWith(-5);
    });
  });

  it("NumericTextField handles non-Error throws", async () => {
    const onChange = vi.fn(async () => {
      throw "boom";
    });

    render(<NumericTextField value={1} label="Amount" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "8" } });
    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(screen.getByText("Save failed. Keep typing to retry.")).toBeTruthy();
    });
  });

  it("NumericTextField clears pending timer on unmount", () => {
    const { unmount } = render(<NumericTextField value={1} label="Amount" />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "22" } });
    expect(() => unmount()).not.toThrow();
  });

  it("NumericTextField shows saving and saved states", async () => {
    let resolveSave: (() => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );
    const onChange = vi.fn(async () => undefined);

    const { rerender } = render(
      <NumericTextField value={3} label="Amount" onChange={onChange} saveChange={saveChange} />
    );
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "44" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    rerender(<NumericTextField value={44} label="Amount" onChange={onChange} saveChange={saveChange} />);

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("NumericTextField keeps typed value when save finishes before prop sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />
    );

    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith(42);
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();

    // Simulate stale parent value before provider cache catches up.
    rerender(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);

    await waitFor(() => {
      expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("42");
    });
  });

  it("NumericTextField clears awaiting sync when parent catches up", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42" } });
    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
      expect(saveChange).toHaveBeenCalledWith(42);
    });

    resolveSave?.();
    await Promise.resolve();

    rerender(<NumericTextField value={42} label="Amount" onChange={onChange} saveChange={saveChange} />);

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("NumericTextField remains editable while awaiting external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />
    );

    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith(42);
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();

    // Parent/provider still stale after save completion.
    rerender(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);

    const staleInput = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(staleInput, { target: { value: "43" } });

    await waitFor(() => {
      expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("43");
    });
  });

  it("NumericTextField does not double-save on blur while awaiting external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />
    );

    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(saveChange).toHaveBeenCalledWith(42);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    resolveSave?.();

    // Keep parent stale to preserve awaiting external sync state.
    rerender(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);

    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  it("NumericTextField skips stale queued saves", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "41" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(42);
      expect(saveChange).toHaveBeenCalledWith(42);
    });
  });

  it("NumericTextField does not save invalid blur values", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<NumericTextField value={1} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "abc" } });
    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(screen.getByText("Amount must be a number")).toBeTruthy();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(saveChange).not.toHaveBeenCalled();
  });

  it("NumericTextField avoids state updates after unmount on successful save", async () => {
    let resolveSave: (() => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { unmount } = render(<NumericTextField value={1} label="Amount" saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "99" } });
    fireEvent.blur(screen.getByLabelText("Amount"));
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    unmount();
    resolveSave?.();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("NumericTextField avoids state updates after unmount on failed save", async () => {
    let rejectSave: ((reason?: unknown) => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        })
    );

    const { unmount } = render(<NumericTextField value={1} label="Amount" saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "99" } });
    fireEvent.blur(screen.getByLabelText("Amount"));
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    unmount();
    rejectSave?.(new Error("boom"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("NumericTextField does not flush while awaiting matching external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42" } });
    fireEvent.blur(screen.getByLabelText("Amount"));
    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
    });

    resolveSave?.();
    rerender(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  it("NumericTextField skips blur flush immediately after unresolved external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    render(<NumericTextField value={null} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42" } });
    fireEvent.blur(screen.getByLabelText("Amount"));

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    await Promise.resolve();
    await Promise.resolve();

    fireEvent.blur(screen.getByLabelText("Amount"));
    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  it("NumericTextField flushes pending saves on pagehide", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<NumericTextField value={1} label="Amount" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "77" } });
    window.dispatchEvent(new Event("pagehide"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(77);
      expect(saveChange).toHaveBeenCalledWith(77);
    });
  });

  it("SelectField calls save pipeline on selection changes", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("large");
      expect(saveChange).toHaveBeenCalledWith("large");
    });
  });

  it("SelectField supports default value and optional save behavior", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <SelectField
        value=""
        defaultValue="small"
        label="Size"
        saveOnChange={false}
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("large");
      expect(saveChange).not.toHaveBeenCalled();
    });
  });

  it("SelectField renders null for missing options", () => {
    const { container } = render(
      <SelectField
        value="small"
        label="Size"
        options={null as any}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("DateField emits Date values and saves", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);

    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-14" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.any(Date));
      expect(saveChange).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  it("DateField supports saveOnChange false", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <DateField value={new Date("2026-03-13")} label="Start Date" onChange={onChange} saveChange={saveChange} saveOnChange={false} />
    );
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-15" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.any(Date));
      expect(saveChange).not.toHaveBeenCalled();
    });
  });

  it("DateField handles clearing to null", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<DateField value={new Date("2026-03-13")} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(null);
      expect(saveChange).toHaveBeenCalledWith(null);
    });
  });

  it("DateField renders saving state while save is in progress", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-16" } });

    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    rerender(
      <DateField
        value={new Date(2026, 2, 16)}
        label="Start Date"
        onChange={onChange}
        saveChange={saveChange}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("DateField surfaces save failures", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => {
      throw new Error("boom");
    });

    render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-16" } });

    await waitFor(() => {
      expect(screen.getByText("Save failed. Pick another date to retry.")).toBeTruthy();
    });
  });

  it("DateField ignores invalid date input", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "not-a-date" } });

    await waitFor(() => {
      expect(screen.getByText("Save failed. Pick another date to retry.")).toBeTruthy();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(saveChange).not.toHaveBeenCalled();
  });

  it("DateField only saves the latest rapid selection", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    const input = screen.getByLabelText("Start Date");

    fireEvent.change(input, { target: { value: "2026-03-10" } });
    fireEvent.change(input, { target: { value: "2026-03-11" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(saveChange).toHaveBeenCalledTimes(1);
    });

    const savedDate = saveChange.mock.calls[0][0] as Date | null;
    expect(savedDate?.toISOString().slice(0, 10)).toBe("2026-03-11");
  });

  it("DateField handles non-Error throws", async () => {
    const onChange = vi.fn(async () => {
      throw "boom";
    });

    render(<DateField value={null} label="Start Date" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-16" } });

    await waitFor(() => {
      expect(screen.getByText("Save failed. Pick another date to retry.")).toBeTruthy();
    });
  });

  it("DateField avoids state updates after unmount on successful save", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { unmount } = render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-20" } });
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    unmount();
    expect(() => resolveSave?.()).not.toThrow();
    await Promise.resolve();
  });

  it("DateField avoids state updates after unmount on failed save", async () => {
    let rejectSave: ((reason?: unknown) => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        })
    );

    const { unmount } = render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-20" } });
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    unmount();
    expect(() => rejectSave?.(new Error("boom"))).not.toThrow();
    await Promise.resolve();
  });

  it("DateField clears awaiting external sync after parent reconciliation", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-03-19" } });

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith(expect.any(Date));
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    // Keep parent stale first so component enters awaiting external sync mode.
    rerender(<DateField value={null} label="Start Date" onChange={onChange} saveChange={saveChange} />);
    await waitFor(() => {
      expect((screen.getByLabelText("Start Date") as HTMLInputElement).value).toBe("2026-03-19");
    });

    // Then reconcile to saved value.
    rerender(
      <DateField
        value={new Date(2026, 2, 19)}
        label="Start Date"
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("SelectField keeps selected value while awaiting external sync", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("large");
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();

    // Parent/provider still stale after save completion.
    rerender(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText("Size") as HTMLSelectElement).value).toBe("large");
    });
  });

  it("SelectField clears dirty state when parent syncs saved value", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { rerender } = render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("large");
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });

    resolveSave?.();
    // Keep parent stale first so component enters awaiting external sync mode.
    rerender(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );
    await waitFor(() => {
      expect((screen.getByLabelText("Size") as HTMLSelectElement).value).toBe("large");
    });

    rerender(
      <SelectField
        value="large"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("SelectField clears dirty state immediately when parent value already matches", async () => {
    const saveChange = vi.fn(async () => undefined);

    function SelectHarness() {
      const [value, setValue] = useState("small");
      return (
        <SelectField
          value={value}
          label="Size"
          options={[
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
          ]}
          onChange={async nextValue => {
            setValue(nextValue);
          }}
          saveChange={saveChange}
        />
      );
    }

    render(<SelectHarness />);
    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("large");
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("SelectField resolves in-flight save after immediate parent sync", async () => {
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 0);
        })
    );

    function SelectSyncHarness() {
      const [value, setValue] = useState("small");
      return (
        <SelectField
          value={value}
          label="Size"
          options={[
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
          ]}
          onChange={async nextValue => {
            setValue(nextValue);
          }}
          saveChange={saveChange}
        />
      );
    }

    render(<SelectSyncHarness />);
    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("large");
      expect(screen.getByText("Saved.")).toBeTruthy();
    });
  });

  it("SelectField surfaces save failures", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => {
      throw new Error("boom");
    });

    render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(screen.getByText("Save failed. Pick another option to retry.")).toBeTruthy();
    });
  });

  it("SelectField only saves the latest rapid selection", async () => {
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(async () => undefined);

    render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    const select = screen.getByLabelText("Size");
    fireEvent.change(select, { target: { value: "medium" } });
    fireEvent.change(select, { target: { value: "large" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(saveChange).toHaveBeenCalledTimes(1);
      expect(saveChange).toHaveBeenCalledWith("large");
    });
  });

  it("SelectField supports showSave false", async () => {
    let resolveSave: (() => void) | undefined;
    const onChange = vi.fn(async () => undefined);
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    render(
      <SelectField
        value="small"
        label="Size"
        showSave={false}
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(saveChange).toHaveBeenCalledWith("large");
    });
    expect(screen.queryByText("Saving Change...")).toBeNull();
    expect(screen.queryByText("Saved.")).toBeNull();

    resolveSave?.();
  });

  it("SelectField handles non-Error throws", async () => {
    const onChange = vi.fn(async () => {
      throw "boom";
    });

    render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });

    await waitFor(() => {
      expect(screen.getByText("Save failed. Pick another option to retry.")).toBeTruthy();
    });
  });

  it("SelectField avoids state updates after unmount on successful save", async () => {
    let resolveSave: (() => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        })
    );

    const { unmount } = render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });
    unmount();
    expect(() => resolveSave?.()).not.toThrow();
    await Promise.resolve();
  });

  it("SelectField avoids state updates after unmount on failed save", async () => {
    let rejectSave: ((reason?: unknown) => void) | undefined;
    const saveChange = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        })
    );

    const { unmount } = render(
      <SelectField
        value="small"
        label="Size"
        options={[
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
        ]}
        saveChange={saveChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "large" } });
    await waitFor(() => {
      expect(screen.getByText("Saving Change...")).toBeTruthy();
    });
    unmount();
    expect(() => rejectSave?.(new Error("boom"))).not.toThrow();
    await Promise.resolve();
  });
});
