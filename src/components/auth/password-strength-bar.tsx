import { cn } from "@/lib/utils";

import { resolvePasswordStrength } from "./password-strength";

export interface PasswordStrengthBarProps {
  readonly password: string;
}

export function PasswordStrengthBar(props: PasswordStrengthBarProps) {
  const result = resolvePasswordStrength(props.password);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted",
              level <= result.score && "bg-primary",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: {result.label}
      </p>
    </div>
  );
}
