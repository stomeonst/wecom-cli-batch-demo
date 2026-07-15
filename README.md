# WeCom CLI Batch Document Demo

Checked: 2026-07-15

This is a credential-free technical sample for planning repeatable WeCom document and smart-sheet operations. It produces official command previews, idempotency behavior, bounded retry, and structured JSON logs.

## Current official facts

1. Official repository: `WecomTeam/wecom-cli`.
2. Repository license: MIT.
3. Latest checked `main` commit: `9eb7898b959861af879495e211e37431fa908f19`, committed on 2026-07-02.
4. Current npm package checked on 2026-07-15: `@wecom/cli` version `0.1.9`, last modified on 2026-05-27, requiring Node.js 18 or newer.
5. The official CLI uses `wecom-cli <category> <method> '<json_params>'`.
6. Real use requires `wecom-cli init`, an eligible WeCom enterprise account, credentials or QR authorization, and network access. Dynamic command help also requires credentials and network access.

Official sources:

1. https://github.com/WecomTeam/wecom-cli
2. https://github.com/WecomTeam/wecom-cli/blob/main/docs/cli-reference.md
3. https://github.com/WecomTeam/wecom-cli/blob/main/skills/wecomcli-smartsheet/SKILL.md

## Run locally

```bash
npm test
npm run demo
```

The demo intentionally simulates one transient failure on `add-seed-records`. The expected JSON log shows one retry, later success, and a skipped duplicate idempotency key.

## Truthful capability boundary

This sample proves local orchestration logic only. It has not called the real `wecom-cli`, created a WeCom document, accessed a client environment, or demonstrated production deployment. Replace the mock adapter only after the client provides an authorized test enterprise, scoped credentials, a non-production acceptance case, and explicit approval for each operation class.

Delete methods remain blocked in the sample. A real implementation should also resolve returned `docid`, `sheet_id`, field IDs, and record IDs between steps instead of using visible placeholders.
