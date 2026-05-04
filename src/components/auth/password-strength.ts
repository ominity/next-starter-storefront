export interface PasswordStrengthResult {
  readonly score: 0 | 1 | 2 | 3 | 4;
  readonly label: string;
}

function hasLowerCase(value: string): boolean {
  return /[a-z]/.test(value);
}

function hasUpperCase(value: string): boolean {
  return /[A-Z]/.test(value);
}

function hasNumber(value: string): boolean {
  return /[0-9]/.test(value);
}

function hasSymbol(value: string): boolean {
  return /[^A-Za-z0-9]/.test(value);
}

export function resolvePasswordStrength(password: string): PasswordStrengthResult {
  if (password.length === 0) {
    return {
      score: 0,
      label: "Empty",
    };
  }

  let score = 0;
  if (password.length >= 8) {
    score += 1;
  }
  if (password.length >= 12) {
    score += 1;
  }
  if (hasLowerCase(password) && hasUpperCase(password)) {
    score += 1;
  }
  if (hasNumber(password) && hasSymbol(password)) {
    score += 1;
  }

  const bounded = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;
  if (bounded <= 1) {
    return { score: bounded, label: "Weak" };
  }
  if (bounded === 2) {
    return { score: bounded, label: "Fair" };
  }
  if (bounded === 3) {
    return { score: bounded, label: "Strong" };
  }

  return { score: bounded, label: "Very strong" };
}
