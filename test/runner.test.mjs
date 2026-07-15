import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryIdempotencyStore,
  MockWecomAdapter,
  buildWecomCommand,
  runPlan,
  validatePlan,
} from "../src/runner.mjs";

function operation(overrides = {}) {
  return {
    id: "create-table",
    idempotency_key: "create-table-v1",
    category: "doc",
    method: "create_doc",
    params: { doc_type: 10, doc_name: "测试表" },
    ...overrides,
  };
}

test("builds the official wecom-cli command shape", () => {
  const command = buildWecomCommand(operation());
  assert.deepEqual(command.slice(0, 3), ["wecom-cli", "doc", "create_doc"]);
  assert.deepEqual(JSON.parse(command[3]), {
    doc_type: 10,
    doc_name: "测试表",
  });
});
test("retries one transient failure and then records success", async () => {
  const events = [];
  const adapter = new MockWecomAdapter({
    transientFailures: { "create-table": 1 },
  });

  const results = await runPlan({
    plan: { version: 1, operations: [operation()] },
    adapter,
    log: (event) => events.push(event),
  });

  assert.equal(adapter.calls.length, 2);
  assert.equal(events.some((event) => event.event === "operation_retrying"), true);
  assert.equal(results[0].event, "operation_succeeded");
  assert.equal(results[0].attempt, 2);
});

test("skips a duplicate idempotency key", async () => {
  const adapter = new MockWecomAdapter();
  const store = new MemoryIdempotencyStore();
  const duplicate = operation({ id: "duplicate-create-table" });

  const results = await runPlan({
    plan: { version: 1, operations: [operation(), duplicate] },
    adapter,
    store,
    log: () => {},
  });

  assert.equal(adapter.calls.length, 1);
  assert.equal(results[1].event, "operation_skipped");
});

test("rejects destructive methods", () => {
  assert.throws(
    () =>
      validatePlan({
        version: 1,
        operations: [operation({ method: "smartsheet_delete_records" })],
      }),
    /non-destructive allowlist/,
  );
});
