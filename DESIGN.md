# WeCom CLI Batch Demo Design

Date: 2026-07-15

## Objective

Demonstrate a safe, repeatable batch-document workflow that can later be connected to the official `wecom-cli` after a client supplies a test enterprise, authorized credentials, and acceptance criteria.

## Architecture

1. A JSON plan describes approved document and smart-sheet operations.
2. A validator permits only a small non-destructive method allowlist.
3. A command builder produces the exact official CLI argument shape without starting the real binary.
4. A runner adds idempotency, bounded retry, and structured JSON event logs.
5. A mock adapter simulates success and transient failure locally.

## Safety boundary

The demo never runs `wecom-cli`, never reads a WeCom credential, and never connects to an enterprise account. Delete operations are rejected. A real adapter remains intentionally unimplemented until a client provides a test environment and explicit authorization.

## Verification

1. Unit test the official command shape.
2. Unit test a transient failure followed by one successful retry.
3. Unit test duplicate idempotency keys so the duplicate operation is skipped.
4. Unit test rejection of destructive methods.
5. Run the sample plan and inspect the JSON event log.
