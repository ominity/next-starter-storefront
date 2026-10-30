"use client";

export interface LocaleSwitcherProps {
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<{ readonly code: string; readonly label: string }>;
  readonly onChange: (code: string) => void;
}

export function LocaleSwitcher({ label, value, options, onChange }: LocaleSwitcherProps) {
  return (
    <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
      </select>
    </label>
  );
}
