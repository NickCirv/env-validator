# env-validator — command reference

[Overview](../README.md) · [Research record](RESEARCH.md)

Describes revision `6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c`. Commands are source-inspected; no execution results are asserted.

## Workflow

Supports required values, types, bounds, enumerations and regex rules. diff compares schema keys; generate infers a draft schema. --all checks environment variants and --strict reports undeclared variables.

A positional path after generate writes the inferred schema; otherwise it prints output. Use the committed help/schema examples to author constraints.

```bash
node index.js --file ../your-project/.env --schema ../your-project/.env.schema
```

## Commands and controls

| Control | Behavior in the inspected implementation |
| --- | --- |
| `--file PATH` | Choose the environment input |
| `--schema PATH` | Choose the custom text schema |
| `--strict` | Report undeclared variables |
| `generate` | Infer a draft schema |
| `diff` | Compare schema and environment keys |

## Interpretation and side effects

Inference is based on current values and cannot recover all business constraints. This is a project-specific schema grammar, not JSON Schema or shell evaluation. Treat generated rules as a draft.

## Implementation reference

- [package.json](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/package.json)
- [index.js](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/index.js)
- [test/smoke.test.js](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/test/smoke.test.js)
