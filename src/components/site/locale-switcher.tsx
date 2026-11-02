"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LocaleSwitcherProps {
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<{ readonly code: string; readonly label: string }>;
  readonly onChange: (code: string) => void;
}

export function LocaleSwitcher({ label, value, options, onChange }: LocaleSwitcherProps) {
  return (
    <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
      <span aria-hidden>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-8 w-auto gap-1.5 px-2 text-xs text-foreground md:text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
