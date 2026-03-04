interface LogContext {
  [key: string]: unknown;
}

type LogLevel = "info" | "warn" | "error";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

function color(text: string, ansiCode: string): string {
  return `${ansiCode}${text}${ANSI.reset}`;
}

function isPrettyLoggingEnabled(): boolean {
  if (typeof process === "undefined") {
    return false;
  }

  if (process.env.LOG_PRETTY === "0") {
    return false;
  }

  if (process.env.NO_COLOR && process.env.FORCE_COLOR !== "1") {
    return false;
  }

  return Boolean(process.stdout?.isTTY);
}

function levelColor(level: LogLevel): string {
  if (level === "error") return ANSI.red;
  if (level === "warn") return ANSI.yellow;
  return ANSI.cyan;
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return ANSI.green;
    case "POST":
      return ANSI.blue;
    case "PUT":
    case "PATCH":
      return ANSI.yellow;
    case "DELETE":
      return ANSI.red;
    default:
      return ANSI.magenta;
  }
}

function statusColor(status: number): string {
  if (status >= 500) return ANSI.red;
  if (status >= 400) return ANSI.yellow;
  if (status >= 300) return ANSI.magenta;
  return ANSI.green;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      sanitized[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

function formatPrettyLine(level: LogLevel, message: string, context?: LogContext): string {
  const ts = color(new Date().toISOString().slice(11, 23), ANSI.gray);
  const levelLabel = color(level.toUpperCase().padEnd(5), levelColor(level));

  if (message === "http.request" && context) {
    const method = String(context.method ?? "GET");
    const path = String(context.path ?? "/");
    const status = Number(context.status ?? 0);
    const durationMs = Number(context.durationMs ?? 0);
    const requestId = String(context.requestId ?? "unknown");

    return `${ts} ${levelLabel} ${color(method, methodColor(method))} ${color(path, ANSI.bold)} ${color(
      String(status),
      statusColor(status),
    )} ${color(`${durationMs}ms`, ANSI.dim)} ${color(`rid=${requestId}`, ANSI.gray)}`;
  }

  const extras =
    context && Object.keys(context).length > 0
      ? ` ${color(JSON.stringify(context), ANSI.gray)}`
      : "";
  return `${ts} ${levelLabel} ${message}${extras}`;
}

function writeLog(level: LogLevel, message: string, context?: LogContext): void {
  const sanitizedContext = sanitizeContext(context);

  if (isPrettyLoggingEnabled()) {
    const output = formatPrettyLine(level, message, sanitizedContext);
    if (level === "error") {
      console.error(output);
      return;
    }
    if (level === "warn") {
      console.warn(output);
      return;
    }
    console.log(output);
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(sanitizedContext ?? {}),
  };

  const output = JSON.stringify(payload);

  if (level === "error") {
    console.error(output);
    return;
  }
  if (level === "warn") {
    console.warn(output);
    return;
  }
  console.log(output);
}

export function logInfo(message: string, context?: LogContext): void {
  writeLog("info", message, context);
}

export function logWarn(message: string, context?: LogContext): void {
  writeLog("warn", message, context);
}

export function logError(message: string, context?: LogContext): void {
  writeLog("error", message, context);
}
