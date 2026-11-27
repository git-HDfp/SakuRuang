export interface MathEvaluationResult {
  valid: boolean;
  value: number;
  normalizedExpression: string;
  hasOperator: boolean;
}

type Token =
  | { type: "number"; value: number }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

function normalizeInputExpression(raw: string): string {
  return raw
    .replace(/×/g, "*")
    .replace(/x/gi, "*")
    .replace(/÷/g, "/")
    .replace(/:/g, "/")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
}

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (ch >= "0" && ch <= "9") {
      let numStr = "";
      while (i < expr.length && expr[i] >= "0" && expr[i] <= "9") {
        numStr += expr[i];
        i++;
      }
      const parsed = Number(numStr);
      if (!Number.isFinite(parsed)) return null;
      tokens.push({ type: "number", value: parsed });
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      // Handle leading unary minus
      if (
        ch === "-" &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === "operator" ||
          (tokens[tokens.length - 1].type === "paren" &&
            tokens[tokens.length - 1].value === "("))
      ) {
        tokens.push({ type: "number", value: 0 });
      }
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
}

function precedence(op: "+" | "-" | "*" | "/"): number {
  return op === "*" || op === "/" ? 2 : 1;
}

export function evaluateMathExpression(raw: string): MathEvaluationResult {
  const clean = normalizeInputExpression(raw);

  if (!clean) {
    return {
      valid: true,
      value: 0,
      normalizedExpression: "0",
      hasOperator: false,
    };
  }

  // Strip trailing operator for live preview while user is still typing
  const trimmed = clean.replace(/[+\-*/]+$/, "");
  if (!trimmed) {
    return {
      valid: true,
      value: 0,
      normalizedExpression: "0",
      hasOperator: false,
    };
  }

  const hasOperator = /[+\-*/]/.test(trimmed);
  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) {
    return {
      valid: false,
      value: 0,
      normalizedExpression: raw,
      hasOperator,
    };
  }

  // Shunting-yard algorithm to RPN
  const outputQueue: Token[] = [];
  const operatorStack: Token[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      outputQueue.push(token);
    } else if (token.type === "operator") {
      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1];
        if (
          top.type === "operator" &&
          precedence(top.value) >= precedence(token.value)
        ) {
          outputQueue.push(operatorStack.pop()!);
        } else {
          break;
        }
      }
      operatorStack.push(token);
    } else if (token.type === "paren" && token.value === "(") {
      operatorStack.push(token);
    } else if (token.type === "paren" && token.value === ")") {
      let foundOpen = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop()!;
        if (top.type === "paren" && top.value === "(") {
          foundOpen = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundOpen) {
        return {
          valid: false,
          value: 0,
          normalizedExpression: raw,
          hasOperator,
        };
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === "paren") {
      return {
        valid: false,
        value: 0,
        normalizedExpression: raw,
        hasOperator,
      };
    }
    outputQueue.push(top);
  }

  // Evaluate RPN
  const evalStack: number[] = [];
  for (const token of outputQueue) {
    if (token.type === "number") {
      evalStack.push(token.value);
    } else if (token.type === "operator") {
      if (evalStack.length < 2) {
        return {
          valid: false,
          value: 0,
          normalizedExpression: raw,
          hasOperator,
        };
      }
      const b = evalStack.pop()!;
      const a = evalStack.pop()!;
      let res = 0;
      if (token.value === "+") res = a + b;
      else if (token.value === "-") res = a - b;
      else if (token.value === "*") res = a * b;
      else if (token.value === "/") {
        if (b === 0) {
          return {
            valid: false,
            value: 0,
            normalizedExpression: raw,
            hasOperator,
          };
        }
        res = a / b;
      }
      evalStack.push(res);
    }
  }

  if (evalStack.length !== 1 || !Number.isFinite(evalStack[0])) {
    return {
      valid: false,
      value: 0,
      normalizedExpression: raw,
      hasOperator,
    };
  }

  const rounded = Math.max(0, Math.round(evalStack[0]));
  return {
    valid: true,
    value: rounded,
    normalizedExpression: formatDisplayExpression(clean),
    hasOperator,
  };
}

export function formatDisplayExpression(raw: string): string {
  const clean = normalizeInputExpression(raw);
  if (!clean) return "0";

  return clean
    .replace(/\d+/g, (num) => Number(num).toLocaleString("id-ID"))
    .replace(/\+/g, " + ")
    .replace(/-/g, " - ")
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ");
}
