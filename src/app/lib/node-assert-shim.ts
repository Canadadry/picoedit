function fail(message: string | Error | undefined, fallback: string): never {
  if (message instanceof Error) {
    throw message;
  }
  throw new Error(message ?? fallback);
}

function ok(value: unknown, message?: string | Error): void {
  if (!value) {
    fail(message, "Assertion failed");
  }
}

function equal(actual: unknown, expected: unknown, message?: string | Error): void {
  if (actual !== expected) {
    fail(message, `Expected ${String(actual)} to strictly equal ${String(expected)}`);
  }
}

const assert = Object.assign(ok, { ok, equal });

export default assert;
