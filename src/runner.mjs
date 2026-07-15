const ALLOWED_METHODS = new Set([
  "create_doc",
  "smartsheet_get_sheet",
  "smartsheet_get_fields",
  "smartsheet_update_fields",
  "smartsheet_add_fields",
  "smartsheet_get_records",
  "smartsheet_add_records",
  "smartsheet_update_records",
]);

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}
export function validatePlan(plan) {
  if (!plan || plan.version !== 1 || !Array.isArray(plan.operations)) {
    throw new Error("plan must use version 1 and include an operations array");
  }

  for (const [index, operation] of plan.operations.entries()) {
    requireNonEmptyString(operation.id, `operations[${index}].id`);
    requireNonEmptyString(
      operation.idempotency_key,
      `operations[${index}].idempotency_key`,
    );

    if (operation.category !== "doc") {
      throw new Error(`operations[${index}].category must be doc`);
    }

    if (!ALLOWED_METHODS.has(operation.method)) {
      throw new Error(
        `operations[${index}].method is not in the non-destructive allowlist`,
      );
    }

    if (
      !operation.params ||
      typeof operation.params !== "object" ||
      Array.isArray(operation.params)
    ) {
      throw new Error(`operations[${index}].params must be an object`);
    }
  }

  return plan;
}

export function buildWecomCommand(operation) {
  return [
    "wecom-cli",
    operation.category,
    operation.method,
    JSON.stringify(operation.params),
  ];
}

export class MemoryIdempotencyStore {
  #completed = new Set();

  has(key) {
    return this.#completed.has(key);
  }

  markCompleted(key) {
    this.#completed.add(key);
  }
}

export class MockWecomAdapter {
  constructor({ transientFailures = {} } = {}) {
    this.transientFailures = new Map(Object.entries(transientFailures));
    this.calls = [];
  }

  async execute(command, operation) {
    this.calls.push({ command, operationId: operation.id });

    const remaining = this.transientFailures.get(operation.id) ?? 0;
    if (remaining > 0) {
      this.transientFailures.set(operation.id, remaining - 1);
      const error = new Error("simulated transient WeCom error");
      error.retryable = true;
      error.code = "MOCK_TRANSIENT";
      throw error;
    }

    return {
      errcode: 0,
      errmsg: "ok",
      mock: true,
      operation_id: operation.id,
      command_preview: command,
    };
  }
}

export function createJsonLogger(write = (line) => console.log(line)) {
  return (event) => write(JSON.stringify(event));
}

export async function runPlan({
  plan,
  adapter,
  store = new MemoryIdempotencyStore(),
  maxAttempts = 2,
  log = createJsonLogger(),
}) {
  validatePlan(plan);

  if (!adapter || typeof adapter.execute !== "function") {
    throw new Error("adapter.execute is required");
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
    throw new Error("maxAttempts must be an integer from 1 to 3");
  }

  const results = [];

  for (const operation of plan.operations) {
    const key = operation.idempotency_key;
    if (store.has(key)) {
      const skipped = {
        event: "operation_skipped",
        operation_id: operation.id,
        idempotency_key: key,
        reason: "already_completed",
      };
      log(skipped);
      results.push(skipped);
      continue;
    }

    const command = buildWecomCommand(operation);
    let completed = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      log({
        event: "operation_started",
        operation_id: operation.id,
        idempotency_key: key,
        attempt,
        command_preview: command,
        execution_mode: "mock",
      });

      try {
        const response = await adapter.execute(command, operation);
        if (response.errcode !== 0) {
          const error = new Error(response.errmsg || "WeCom operation failed");
          error.retryable = true;
          error.code = response.errcode;
          throw error;
        }

        store.markCompleted(key);
        const success = {
          event: "operation_succeeded",
          operation_id: operation.id,
          idempotency_key: key,
          attempt,
          response,
        };
        log(success);
        results.push(success);
        completed = true;
        break;
      } catch (error) {
        const mayRetry = Boolean(error.retryable) && attempt < maxAttempts;
        log({
          event: mayRetry ? "operation_retrying" : "operation_failed",
          operation_id: operation.id,
          idempotency_key: key,
          attempt,
          error_code: error.code ?? "UNKNOWN",
          message: error.message,
        });

        if (!mayRetry) {
          throw error;
        }
      }
    }

    if (!completed) {
      throw new Error(`operation ${operation.id} did not complete`);
    }
  }

  return results;
}
