<div align="center">

# env-validator

**Stop deploying with missing or invalid environment variables**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?labelColor=0B0A09)](LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?labelColor=0B0A09)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green?labelColor=0B0A09)](package.json)

</div>

## Install

```bash
npx github:NickCirv/env-validator
```

## Usage

```bash
# Validate .env against .env.schema
npx github:NickCirv/env-validator

# Validate a specific file pair
npx github:NickCirv/env-validator --file .env.production --schema .env.schema

# Generate a schema from an existing .env
npx github:NickCirv/env-validator generate > .env.schema

# Show what is missing or extra
npx github:NickCirv/env-validator diff

# CI — only show failures, exit 1 on any
npx github:NickCirv/env-validator --quiet
```

| Flag | Description |
|------|-------------|
| `--file <path>` | Env file to validate (default: `.env`) |
| `--schema <path>` | Schema file to use (default: `.env.schema`) |
| `--all` | Validate all `.env.*` files in the directory |
| `--strict` | Fail on vars not declared in schema |
| `--quiet` | Only show failures |
| `--output json` | JSON output — pipe to `jq` |

## Schema format

Create a `.env.schema` next to your `.env`:

```
DATABASE_URL=required,url
PORT=optional,number,default:3000
NODE_ENV=required,enum:development|staging|production
API_KEY=required,min:20
DEBUG=optional,boolean
MAX_RETRIES=optional,number,min:1,max:10
EMAIL_FROM=optional,email
WEBHOOK_SECRET=required,regex:^whsec_
```

Supported rules: `required` · `optional` · `url` · `email` · `number` · `boolean` · `min:N` · `max:N` · `enum:a|b|c` · `regex:pattern` · `default:value`

## What it does

env-validator reads your `.env` and checks every key against a plain-text schema. It validates types, ranges, enums, and regex patterns — then exits with code `1` if any required vars are missing or invalid, making it a drop-in CI gate. The `generate` command bootstraps a schema from an existing `.env` so you can be up and running in one step. It never prints or logs actual env values, only variable names.

---
<sub>Zero dependencies · Node 18+ · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
