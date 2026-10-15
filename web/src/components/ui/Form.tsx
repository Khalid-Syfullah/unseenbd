"use client";

import {
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type ComponentProps,
} from "react";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";
import { Button, IconButton } from "./Button";
import { cn } from "./cn";
import { arrowTarget } from "./keyboard";
import { Chevron, Icon, type IconName } from "./Icon";

/* DESIGN.md §4.6 */

const CONTROL =
  "h-12 w-full rounded-sm border border-subtle bg-sunken text-base text-text placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-[var(--dur-1)] ease-standard " +
  "hover:border-text/40 focus-visible:border-focus disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-danger";

/** A label, the control, then an optional hint or error line. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  hideLabel = false,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor: string;
  hideLabel?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className={hideLabel ? "sr-only" : "text-sm font-semibold"}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: IconName;
  invalid?: boolean;
};

/** Text input: 48 px, sunken, optional leading icon. */
export function TextInput({ icon, invalid, className, ...rest }: TextInputProps) {
  return (
    <div className="relative w-full">
      {icon ? (
        <Icon
          name={icon}
          size={20}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        />
      ) : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn(CONTROL, icon ? "pr-3 pl-10" : "px-3", className)}
        {...rest}
      />
    </div>
  );
}

export type TextAreaProps = ComponentProps<"textarea"> & {
  invalid?: boolean;
  /** Shows "n / max" under the box (needs `maxLength`). */
  counter?: boolean;
};

/** Multi-line text input in the same style; grows with `rows`, optional character counter. */
export function TextArea({
  invalid,
  counter,
  className,
  maxLength,
  value,
  ...rest
}: TextAreaProps) {
  const lang = contentLocale(useLocale());
  const length = typeof value === "string" ? value.length : 0;
  return (
    <div className="flex w-full flex-col gap-1">
      <textarea
        aria-invalid={invalid || undefined}
        maxLength={maxLength}
        value={value}
        className={cn(CONTROL, "h-auto min-h-24 resize-y px-3 py-2.5 leading-relaxed", className)}
        {...rest}
      />
      {counter && maxLength ? (
        <span
          aria-hidden
          className={cn(
            "num self-end text-xs",
            length >= maxLength ? "font-semibold text-danger" : "text-muted",
          )}
        >
          {formatNumber(length, lang)} / {formatNumber(maxLength, lang)}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Search box: leading search icon, a clear button once there is text, submits on Enter. On wide
 * screens a primary Search button is attached; on narrow ones an icon button takes its place.
 * With `action` it is a GET form (`?q=`) that works without JavaScript.
 */
export function SearchInput({
  name = "q",
  defaultValue = "",
  value: controlled,
  onValueChange,
  onSearch,
  action,
  label,
  placeholder,
  submitLabel,
  className,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Called on submit (the form is not sent when this is given without `action`). */
  onSearch?: (value: string) => void;
  action?: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
}) {
  const t = useT();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const setValue = (next: string) => {
    if (controlled === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const searchLabel = submitLabel ?? t("common.search");

  return (
    <form
      role="search"
      action={action}
      method="get"
      onSubmit={(e) => {
        if (onSearch) {
          if (!action) e.preventDefault();
          onSearch(value);
        }
      }}
      className={cn("flex w-full items-stretch gap-2", className)}
    >
      <label htmlFor={id} className="sr-only">
        {label ?? searchLabel}
      </label>
      <div className="relative flex-1">
        <Icon
          name="search"
          size={20}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? t("common.searchPlaceholder")}
          enterKeyHint="search"
          autoComplete="off"
          className={cn(
            CONTROL,
            "pr-24 pl-10 md:pr-12 [&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {value ? (
            <IconButton
              icon="close"
              label={t("ui.clear")}
              iconSize={18}
              className="text-muted"
              onClick={() => {
                setValue("");
                inputRef.current?.focus();
              }}
            />
          ) : null}
          <IconButton
            icon="search"
            type="submit"
            label={searchLabel}
            className="text-primary md:hidden"
          />
        </div>
      </div>
      <Button type="submit" className="h-12 max-md:hidden">
        {searchLabel}
      </Button>
    </form>
  );
}

const SELECT =
  "h-12 w-full cursor-pointer appearance-none rounded-sm border border-subtle bg-sunken pr-10 pl-3 text-base text-text " +
  "transition-[border-color] duration-[var(--dur-1)] ease-standard hover:border-text/40 focus-visible:border-focus " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectGroup = { label: string; options: SelectOption[] };

/** Native select styled like the input, with a chevron. Long lists use `groups` (<optgroup>). */
export function Select({
  options,
  groups,
  placeholder,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options?: SelectOption[];
  groups?: SelectGroup[];
  /** A first, empty option ("All districts"). */
  placeholder?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <select className={SELECT} {...rest}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {groups?.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <Chevron
        size={18}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

/** Districts grouped by division, as `listDistrictsByDivision()` returns them. */
export type DivisionGroup = {
  slug: string;
  name: string;
  districts: { slug: string; name: string }[];
};

/** The 64 districts in one select, grouped by division. Values are district slugs. */
export function DistrictSelect({
  divisions,
  ...rest
}: Omit<Parameters<typeof Select>[0], "groups" | "options"> & { divisions: DivisionGroup[] }) {
  return (
    <Select
      groups={divisions.map((d) => ({
        label: d.name,
        options: d.districts.map((x) => ({ value: x.slug, label: x.name })),
      }))}
      {...rest}
    />
  );
}

const STEP_BUTTON =
  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-raised text-text " +
  "transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40";

/** `[−] value [+]` with 44 px buttons; min and max are enforced. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={`${t("ui.decrease")}: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Icon name="minus" size={20} />
      </button>
      <output aria-live="polite" className="num min-w-10 text-center text-lg font-semibold">
        {formatNumber(value, lang)}
      </output>
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={`${t("ui.increase")}: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}

export type SegmentOption<V extends string> = { value: V; label: string; hint?: string };

/**
 * Segmented control (budget level, card type): a radio group on a `--surface-2` track; the
 * selected segment is raised with primary text. The helper line shows the selected option's hint.
 * Arrow keys move the selection.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  const hintId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const hint = options[index]?.hint;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const next = arrowTarget(e.key, index, options.length);
    if (next === null) return;
    e.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        onKeyDown={onKeyDown}
        className="flex w-full gap-1 rounded-md bg-surface-2 p-1"
      >
        {options.map((o, i) => {
          const selected = i === index;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-11 flex-1 rounded-sm px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-[var(--dur-1)] ease-standard",
                selected
                  ? "bg-raised text-primary shadow-1"
                  : "text-muted hover:bg-raised/50 hover:text-text",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {hint ? (
        <p id={hintId} aria-live="polite" className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Toggle switch: 44×26 track, primary when on. Pass `label` for a visible label beside it. */
export function Switch({
  checked,
  onChange,
  label,
  hideLabel = false,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group/switch relative inline-flex min-h-11 items-center gap-3 rounded-sm text-left disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-block h-[26px] w-11 shrink-0 rounded-pill transition-colors duration-[var(--dur-1)] ease-standard",
          checked ? "bg-primary" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-5 rounded-pill bg-raised shadow-1 transition-transform duration-[var(--dur-1)] ease-standard",
            checked && "translate-x-[18px]",
          )}
        />
      </span>
      {hideLabel ? null : <span className="text-base">{label}</span>}
    </button>
  );
}

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: ReactNode;
};

const CHOICE_ROW =
  "relative flex min-h-11 cursor-pointer items-center gap-3 py-1 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

/** Checkbox: 20 px, radius 6, primary when checked, with its label (44 px row). */
export function Checkbox({ label, hint, className, ...rest }: ChoiceProps) {
  return (
    <label className={cn(CHOICE_ROW, className)}>
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-subtle bg-raised transition-colors duration-[var(--dur-1)] ease-standard checked:border-primary checked:bg-primary disabled:cursor-not-allowed"
          {...rest}
        />
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute top-[3px] left-[3px] size-3.5 text-on-primary opacity-0 peer-checked:opacity-100"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="flex flex-col">
        <span>{label}</span>
        {hint ? <span className="text-sm text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Radio: 20 px round, primary ring and dot when checked, with its label (44 px row). */
export function Radio({ label, hint, className, ...rest }: ChoiceProps) {
  return (
    <label className={cn(CHOICE_ROW, className)}>
      <input
        type="radio"
        className="size-5 shrink-0 cursor-pointer appearance-none rounded-pill border-[1.5px] border-subtle bg-raised transition-[border] duration-[var(--dur-1)] ease-standard checked:border-[6px] checked:border-primary disabled:cursor-not-allowed"
        {...rest}
      />
      <span className="flex flex-col">
        <span>{label}</span>
        {hint ? <span className="text-sm text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
