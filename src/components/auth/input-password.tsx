"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface InputPasswordProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly className?: string;
}

const InputPassword = (props: InputPasswordProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const generatedId = useId();
  const inputId = props.id ?? generatedId;

  return (
    <div className={cn("w-full space-y-2", props.className)}>
      <Label htmlFor={inputId}>{props.label ?? "Password"}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={isVisible ? "text" : "password"}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder ?? "Password"}
          autoComplete={props.autoComplete}
          disabled={props.disabled}
          className="pr-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible((prevState) => !prevState)}
          disabled={props.disabled}
          className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
        >
          {isVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          <span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
        </Button>
      </div>
    </div>
  );
};

export { InputPassword };
export default InputPassword;
