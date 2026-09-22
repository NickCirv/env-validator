# env-validator — research record

## Revision and scope

- Repository: [NickCirv/env-validator](https://github.com/NickCirv/env-validator)
- Commit: `6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c`
- Tree: `32a0ca4de6895afc80f9c252f16eaabffb9281e5`
- Captured: 6 of 6 eligible text files (all eligible text files).
- Recursive tree truncated: `False`.
- Runtime verification: **unverified**; no repository code, installation or test command was executed.

The captured file inventory is broader than the semantic review. Authoring inspected package metadata, entrypoint/argument handling and implementation paths relevant to the claims below, plus test declarations. This is documentation research, not a line-by-line security audit. Generated/binary artifacts, lockfiles and file types outside the acquisition filter were not inspected.

## Claim and evidence

| Claim | Pinned evidence | Status |
| --- | --- | --- |
| Runtime requirement and executable mapping | [package.json](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/package.json) | verified in manifest; installation unverified |
| Validate environment values against a small text schema. | [implementation](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/index.js) | partially verified by static implementation review |
| Operational limits and side effects | [implementation](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/index.js) and source map in [reference](REFERENCE.md) | partially verified; runtime unverified |
| Test command definition | [package.json](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/package.json) | verified as a declaration only |

## Findings carried into the rewrite

Inference is based on current values and cannot recover all business constraints. This is a project-specific schema grammar, not JSON Schema or shell evaluation. Treat generated rules as a draft.

No runtime checks were executed for this documentation review. The committed smoke test checks entrypoint JavaScript syntax; it does not exercise the command behavior.

## Documentation inventory and disposition

| Existing document | Disposition |
| --- | --- |
| [README.md](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/README.md) | Rewritten overview; historical copy remains at this pinned URL. |

New supporting documents: `docs/REFERENCE.md` and `docs/RESEARCH.md`. No original source or protected legal/security file was changed.

## Protected-file evidence

- `LICENSE` SHA-256 `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d`.

## Remaining verification

Clean installation, useful-command execution, malformed input, side-effect boundaries, platform compatibility and end-to-end tests remain unverified. Package-registry availability and live API destinations were not checked. No performance, customer-adoption, compliance or production-readiness claim is made.

## Captured evidence index

- [LICENSE](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/LICENSE) · blob `05b804beeec7d1a6c933d087387ba4adf6463d93`.
- [README.md](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/README.md) · blob `41c68b7361038f12ce6e4219aae841955862da0f`.
- [package.json](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/package.json) · blob `bc8fad692464057dc49bfbfa58d4a872e40e215f`.
- [.github/workflows/ci.yml](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/.github/workflows/ci.yml) · blob `44515034a394670de44454a7a1bd2c7ef0c9836e`.
- [index.js](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/index.js) · blob `6092996c005da5c878431a2e03dbde5a188fa338`.
- [test/smoke.test.js](https://github.com/NickCirv/env-validator/blob/6ca038bcd5d1cf15c7f6c1d6b6e11834daf3a67c/test/smoke.test.js) · blob `ebbccaaf2583b4850575f835313e4b0afd21bff7`.

## Tree files outside the captured text set

These paths were mapped but their contents were not acquired in this research pass:

- `.gitignore`
