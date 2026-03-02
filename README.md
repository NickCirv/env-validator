# env-validator
> Validate .env files against a schema. Stop shipping with missing environment variables.

```bash
npx env-validator
```

```
env-validator · .env vs .env.schema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  DATABASE_URL             ✓ valid url
  PORT                     ✓ valid number (default used: 3000)
  NODE_ENV                 ✓ valid enum [production]
  API_KEY                  ✗ missing (required)
  DEBUG                    ✓ valid boolean
  MAX_RETRIES              ✗ invalid: "fifteen" is not a number

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4 passed · 2 failed
```

## Commands
| Command | Description |
|---------|-------------|
| `env-validator` | Validate .env against .env.schema |
| `--file <path>` | Specify env file |
| `--schema <path>` | Specify schema file |
| `--all` | Validate all .env.* files |
| `generate` | Generate schema from existing .env |
| `diff` | Show missing/extra vars |
| `--strict` | Fail on undeclared vars |
| `--quiet` | Only show failures |

## Schema Format

Create a `.env.schema` file next to your `.env`:

```
# .env.schema
DATABASE_URL=required,url
PORT=optional,number,default:3000
NODE_ENV=required,enum:development|staging|production
API_KEY=required,min:20
DEBUG=optional,boolean
MAX_RETRIES=optional,number,min:1,max:10
EMAIL_FROM=optional,email
WEBHOOK_SECRET=required,regex:^whsec_
```

## Validation Types

| Type | Description |
|------|-------------|
| `required` | Var must be present and non-empty |
| `optional` | Var may be absent |
| `url` | Must be a valid URL |
| `email` | Must be a valid email address |
| `number` | Must be numeric |
| `boolean` | Must be true/false/1/0/yes/no |
| `min:N` | Min value (number) or min length (string) |
| `max:N` | Max value (number) or max length (string) |
| `enum:a\|b\|c` | Must be one of the listed values |
| `regex:pattern` | Must match the regex pattern |
| `default:value` | Use this value if var is absent |

## Usage Examples

```bash
# Validate .env against auto-detected schema
npx env-validator

# Validate a specific env file
npx env-validator --file .env.production --schema .env.schema

# Validate all .env.* files in the directory
npx env-validator --all

# Only show failures (great for CI logs)
npx env-validator --quiet

# Fail on any vars not declared in schema
npx env-validator --strict

# JSON output (pipe to jq)
npx env-validator --output json | jq '.vars[] | select(.status == "fail")'

# Generate a schema from your existing .env
npx env-validator generate > .env.schema

# See what's missing or extra
npx env-validator diff
```

## CI Integration

env-validator exits with code `1` when validation fails — works natively with GitHub Actions, GitLab CI, and any CI system.

```yaml
# .github/workflows/validate-env.yml
- name: Validate environment
  run: npx env-validator --schema .env.schema --file .env.example --quiet
```

Or validate before deploy:

```bash
npx env-validator --quiet || exit 1
```

## Security

env-validator **never** prints or logs actual env values. Output only shows variable names and whether they passed/failed validation. Safe to run in CI with verbose logging enabled.

## Install

```bash
# Run without installing
npx env-validator

# Install globally
npm install -g env-validator

# Then use either alias
env-validator
envv
```

## Schema Auto-Detection

env-validator looks for schema files in this order:
1. `.env.schema`
2. `.env.example`
3. `.env.template`

Env file auto-detection order:
1. `.env`
2. `.env.local`

---
**Zero dependencies** · **Node 18+** · Made by [NickCirv](https://github.com/NickCirv) · MIT
