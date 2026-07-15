#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import {
  MockWecomAdapter,
  createJsonLogger,
  runPlan,
} from "./runner.mjs";

function readArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--plan" || current === "--simulate-transient") {
      values[current.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unknown argument: ${current}`);
    }
  }
  return values;
}

const args = readArgs(process.argv.slice(2));
if (!args.plan) {
  throw new Error("usage: node src/cli.mjs --plan <file> [--simulate-transient <operation-id>]");
}

const plan = JSON.parse(await readFile(args.plan, "utf8"));
const transientFailures = args["simulate-transient"]
  ? { [args["simulate-transient"]]: 1 }
  : {};

const adapter = new MockWecomAdapter({ transientFailures });
const results = await runPlan({
  plan,
  adapter,
  log: createJsonLogger(),
});

console.log(
  JSON.stringify({
    event: "plan_completed",
    execution_mode: "mock",
    operations_in_plan: plan.operations.length,
    result_events: results.length,
    adapter_calls: adapter.calls.length,
    real_wecom_calls: 0,
  }),
);
