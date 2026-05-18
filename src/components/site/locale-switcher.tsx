"use client";

export interface SwitcherOption {
  readonly code: string;
  readonly label: string;
}

interface LocaleSwitcherProps {
  readonly languageLabel: string;
  readonly languageValue: string;
  readonly languageOptions: ReadonlyArray<SwitcherOption>;
  readonly onLanguageChange: (nextLanguage: string) => void;
  readonly countryLabel?: string;
  readonly countryValue?: string;
  readonly countryOptions?: ReadonlyArray<SwitcherOption>;
  readonly onCountryChange?: (nextCountry: string) => void;
}

export function LocaleSwitcher(props: LocaleSwitcherProps) {
  const hasCountrySwitcher = typeof props.countryLabel === "string"
    && typeof props.countryValue === "string"
    && Array.isArray(props.countryOptions)
    && typeof props.onCountryChange === "function"
    && props.countryOptions.length > 0;

  return (
    <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
      <label className="flex items-center gap-2">
        <span>{props.languageLabel}</span>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
          aria-label={props.languageLabel}
          value={props.languageValue}
          onChange={(event) => props.onLanguageChange(event.currentTarget.value)}
        >
          {props.languageOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {hasCountrySwitcher && (
        <label className="flex items-center gap-2">
          <span>{props.countryLabel}</span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
            aria-label={props.countryLabel}
            value={props.countryValue}
            onChange={(event) => props.onCountryChange!(event.currentTarget.value)}
          >
            {props.countryOptions!.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
