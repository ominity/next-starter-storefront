"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/** Radix items cannot have an empty value, so the "none" option uses this key and posts as "". */
const EMPTY = "__empty__";

export interface FormSelectProps {
  readonly name: string;
  readonly defaultValue?: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly "aria-label": string;
  readonly className?: string;
}

/** A select for plain (GET) forms, such as filters on server-rendered pages; its value is posted under `name`. */
export function FormSelect({ name, defaultValue = "", options, className, ...props }: FormSelectProps) {
  const [value, setValue] = useState(defaultValue || EMPTY);

  return (
    <>
      <input type="hidden" name={name} value={value === EMPTY ? "" : value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label={props["aria-label"]} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value || EMPTY} value={option.value || EMPTY}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );
}
