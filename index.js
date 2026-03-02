#!/usr/bin/env node
/**
 * env-validator — Validate .env files against a schema contract.
 * Zero dependencies. Node 18+. MIT License.
 * SECURITY: Never logs or prints actual env values — only var names.
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, basename } from 'path'

// ── ANSI Colors ──────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
}

const isTTY = process.stdout.isTTY
const col = (color, text) => isTTY ? `${color}${text}${c.reset}` : text
const bold  = (t) => col(c.bold, t)
const dim   = (t) => col(c.dim, t)
const green = (t) => col(c.green, t)
const red   = (t) => col(c.red, t)
const yellow = (t) => col(c.yellow, t)
const cyan  = (t) => col(c.cyan, t)

// ── .env Parser ──────────────────────────────────────────────────────────────
/**
 * Parse a .env file into a Map<key, value>.
 * Handles: comments (#), quoted values, multiline (backslash), empty lines.
 * NEVER exposes values outside this module's return value.
 */
function parseEnvFile(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const vars = new Map()
  const lines = raw.split('\n')
  let i = 0

  while (i < lines.length) {
    let line = lines[i].trimEnd()
    i++

    // Skip empty lines and comments
    if (!line || line.trimStart().startsWith('#')) continue

    // Multiline continuation (trailing backslash)
    while (line.endsWith('\\') && i < lines.length) {
      line = line.slice(0, -1) + lines[i].trimEnd()
      i++
    }

    // KEY=value
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue

    const key = line.slice(0, eqIdx).trim()
    if (!key || key.includes(' ')) continue

    let value = line.slice(eqIdx + 1).trim()

    // Strip inline comments (only if not inside quotes)
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    } else {
      // Remove inline comment
      const commentIdx = value.indexOf(' #')
      if (commentIdx !== -1) value = value.slice(0, commentIdx).trim()
    }

    vars.set(key, value)
  }

  return vars
}

// ── Schema Parser ─────────────────────────────────────────────────────────────
/**
 * Parse a .env.schema file into Map<key, rules[]>.
 * Format: KEY=rule1,rule2,...
 * Lines starting with # are comments.
 */
function parseSchemaFile(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const schema = new Map()

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue

    const key = trimmed.slice(0, eqIdx).trim()
    const rulesRaw = trimmed.slice(eqIdx + 1).trim()
    if (!key) continue

    const rules = rulesRaw ? rulesRaw.split(',').map(r => r.trim()).filter(Boolean) : []
    schema.set(key, rules)
  }

  return schema
}

// ── Type Validators ───────────────────────────────────────────────────────────
/**
 * All validators receive the raw string value and return { ok, message }.
 * SECURITY: No validator logs or echoes the value back in a way that could
 * expose secrets. Error messages reference the KEY name only.
 */

function validateUrl(value) {
  try { new URL(value); return { ok: true } }
  catch { return { ok: false, message: 'not a valid URL' } }
}

function validateEmail(value) {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  return ok ? { ok: true } : { ok: false, message: 'not a valid email' }
}

function validateNumber(value) {
  const ok = !isNaN(parseFloat(value)) && isFinite(value)
  return ok ? { ok: true } : { ok: false, message: 'not a number' }
}

function validateBoolean(value) {
  const ok = ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())
  return ok ? { ok: true } : { ok: false, message: 'not a boolean (expected true/false/1/0/yes/no)' }
}

function validateMin(value, n) {
  // Works for both string length and numeric min
  const numVal = parseFloat(value)
  if (!isNaN(numVal) && isFinite(numVal)) {
    return numVal >= n ? { ok: true } : { ok: false, message: `below minimum value ${n}` }
  }
  return value.length >= n ? { ok: true } : { ok: false, message: `below minimum length ${n}` }
}

function validateMax(value, n) {
  const numVal = parseFloat(value)
  if (!isNaN(numVal) && isFinite(numVal)) {
    return numVal <= n ? { ok: true } : { ok: false, message: `above maximum value ${n}` }
  }
  return value.length <= n ? { ok: true } : { ok: false, message: `above maximum length ${n}` }
}

function validateEnum(value, choices) {
  const ok = choices.includes(value)
  return ok ? { ok: true } : { ok: false, message: `not in allowed values [${choices.join('|')}]` }
}

function validateRegex(value, pattern) {
  try {
    const ok = new RegExp(pattern).test(value)
    return ok ? { ok: true } : { ok: false, message: `does not match pattern ${pattern}` }
  } catch {
    return { ok: false, message: `invalid regex pattern: ${pattern}` }
  }
}

// ── Core Validation Logic ─────────────────────────────────────────────────────
/**
 * Validate a single env var against its rules.
 * Returns { status: 'pass'|'fail'|'warn'|'default', label, note }
 * SECURITY: `value` is used for validation only — never returned or logged.
 */
function validateVar(key, value, rules, defaultValues) {
  const isRequired = rules.includes('required')
  const isOptional = rules.includes('optional') || !isRequired

  // Check default
  const defaultRule = rules.find(r => r.startsWith('default:'))
  const defaultValue = defaultRule ? defaultRule.slice(8) : null

  // Missing value handling
  if (value === undefined || value === '') {
    if (defaultValue !== null) {
      defaultValues.set(key, defaultValue)
      return { status: 'pass', label: 'default used', note: `default: ${defaultValue}` }
    }
    if (isRequired) {
      return { status: 'fail', label: 'missing', note: 'required' }
    }
    return { status: 'warn', label: 'not set', note: 'optional' }
  }

  // Run type validators
  const errors = []
  let typeLabels = []

  for (const rule of rules) {
    if (rule === 'required' || rule === 'optional') continue
    if (rule.startsWith('default:')) continue

    if (rule === 'url') {
      const r = validateUrl(value)
      if (!r.ok) errors.push(r.message)
      else typeLabels.push('url')
    } else if (rule === 'email') {
      const r = validateEmail(value)
      if (!r.ok) errors.push(r.message)
      else typeLabels.push('email')
    } else if (rule === 'number') {
      const r = validateNumber(value)
      if (!r.ok) errors.push(r.message)
      else typeLabels.push('number')
    } else if (rule === 'boolean') {
      const r = validateBoolean(value)
      if (!r.ok) errors.push(r.message)
      else typeLabels.push('boolean')
    } else if (rule.startsWith('min:')) {
      const n = parseFloat(rule.slice(4))
      const r = validateMin(value, n)
      if (!r.ok) errors.push(r.message)
    } else if (rule.startsWith('max:')) {
      const n = parseFloat(rule.slice(4))
      const r = validateMax(value, n)
      if (!r.ok) errors.push(r.message)
    } else if (rule.startsWith('enum:')) {
      const choices = rule.slice(5).split('|')
      const r = validateEnum(value, choices)
      if (!r.ok) errors.push(r.message)
      else typeLabels.push(`enum`)
    } else if (rule.startsWith('regex:')) {
      const pattern = rule.slice(6)
      const r = validateRegex(value, pattern)
      if (!r.ok) errors.push(r.message)
    }
  }

  if (errors.length > 0) {
    return { status: 'fail', label: 'invalid', note: errors.join(', ') }
  }

  const typeStr = typeLabels.length > 0 ? typeLabels.join(', ') : 'present'
  return { status: 'pass', label: `valid ${typeStr}`.trim(), note: null }
}

// ── Schema Inference (generate command) ──────────────────────────────────────
function inferType(value) {
  if (!value) return 'optional'

  const rules = []

  if (['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
    rules.push('boolean')
  } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
    rules.push('number')
  } else {
    try { new URL(value); rules.push('url') } catch {}
    if (!rules.length && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      rules.push('email')
    }
  }

  return rules.length ? rules.join(',') : 'optional'
}

// ── Output Formatters ─────────────────────────────────────────────────────────
function formatResult(key, result, outputFmt, quiet) {
  if (quiet && result.status !== 'fail') return null

  if (outputFmt === 'json') return null // handled separately

  const icon = result.status === 'pass' ? green('✓') :
               result.status === 'fail' ? red('✗') : yellow('~')

  const keyPad = key.padEnd(24)
  const labelColor = result.status === 'pass' ? green(result.label) :
                     result.status === 'fail' ? red(result.label) : yellow(result.label)

  const note = result.note ? dim(` (${result.note})`) : ''
  return `  ${icon} ${bold(keyPad)} ${labelColor}${note}`
}

// ── Schema Auto-Detect ────────────────────────────────────────────────────────
function findSchema(dir) {
  const candidates = ['.env.schema', '.env.example', '.env.template']
  for (const c of candidates) {
    const p = resolve(dir, c)
    if (existsSync(p)) return p
  }
  return null
}

function findEnvFile(dir) {
  const candidates = ['.env', '.env.local']
  for (const c of candidates) {
    const p = resolve(dir, c)
    if (existsSync(p)) return p
  }
  return null
}

// ── Validate One File ─────────────────────────────────────────────────────────
function validateOne({ envPath, schemaPath, strict, quiet, outputFmt }) {
  if (!existsSync(envPath)) {
    console.error(red(`  Error: env file not found: ${envPath}`))
    return { passed: 0, failed: 1, warned: 0 }
  }
  if (!existsSync(schemaPath)) {
    console.error(red(`  Error: schema file not found: ${schemaPath}`))
    return { passed: 0, failed: 1, warned: 0 }
  }

  const envVars = parseEnvFile(envPath)
  const schema = parseSchemaFile(schemaPath)
  const defaultValues = new Map()

  const results = []
  let passed = 0, failed = 0, warned = 0

  // Validate schema keys
  for (const [key, rules] of schema.entries()) {
    const value = envVars.get(key)
    const result = validateVar(key, value, rules, defaultValues)
    results.push({ key, result })
    if (result.status === 'pass') passed++
    else if (result.status === 'fail') failed++
    else warned++
  }

  // Strict mode: extra vars
  const extraKeys = []
  if (strict) {
    for (const key of envVars.keys()) {
      if (!schema.has(key)) {
        extraKeys.push(key)
        warned++
      }
    }
  }

  // Output
  if (outputFmt === 'json') {
    const out = {
      file: basename(envPath),
      schema: basename(schemaPath),
      passed,
      failed,
      warned,
      vars: results.map(({ key, result }) => ({
        key,
        status: result.status,
        label: result.label,
        note: result.note,
      })),
    }
    if (strict && extraKeys.length) out.extra = extraKeys
    console.log(JSON.stringify(out, null, 2))
    return { passed, failed, warned }
  }

  // Text output
  const sep = dim('━'.repeat(40))
  console.log()
  console.log(bold(`env-validator`) + dim(` · ${basename(envPath)} vs ${basename(schemaPath)}`))
  console.log(sep)

  for (const { key, result } of results) {
    const line = formatResult(key, result, outputFmt, quiet)
    if (line) console.log(line)
  }

  if (strict && extraKeys.length) {
    for (const key of extraKeys) {
      const line = formatResult(key, { status: 'warn', label: 'undeclared', note: 'not in schema (--strict)' }, outputFmt, quiet)
      if (line) console.log(line)
    }
  }

  console.log(sep)
  const summary = [
    passed > 0 ? green(`${passed} passed`) : null,
    failed > 0 ? red(`${failed} failed`) : null,
    warned > 0 ? yellow(`${warned} warning${warned > 1 ? 's' : ''}`) : null,
  ].filter(Boolean).join(dim(' · '))
  console.log(summary)
  console.log()

  return { passed, failed, warned }
}

// ── Diff Command ──────────────────────────────────────────────────────────────
function runDiff(envPath, schemaPath) {
  if (!existsSync(envPath)) { console.error(red(`env file not found: ${envPath}`)); process.exit(1) }
  if (!existsSync(schemaPath)) { console.error(red(`schema file not found: ${schemaPath}`)); process.exit(1) }

  const envVars = parseEnvFile(envPath)
  const schema = parseSchemaFile(schemaPath)

  const missing = []  // in schema, not in env
  const extra = []    // in env, not in schema

  for (const key of schema.keys()) {
    if (!envVars.has(key)) missing.push(key)
  }
  for (const key of envVars.keys()) {
    if (!schema.has(key)) extra.push(key)
  }

  console.log()
  console.log(bold('env-validator diff') + dim(` · ${basename(envPath)} vs ${basename(schemaPath)}`))
  console.log(dim('━'.repeat(40)))

  if (missing.length === 0 && extra.length === 0) {
    console.log(green('  ✓ No differences'))
  }

  if (missing.length > 0) {
    console.log(bold(red(`\n  Missing in .env (defined in schema):`)))
    for (const k of missing) console.log(`    ${red('−')} ${k}`)
  }

  if (extra.length > 0) {
    console.log(bold(yellow(`\n  Extra in .env (not in schema):`)))
    for (const k of extra) console.log(`    ${yellow('+')} ${k}`)
  }

  console.log()
  if (missing.length > 0) process.exit(1)
}

// ── Generate Command ──────────────────────────────────────────────────────────
function runGenerate(envPath, outputPath) {
  if (!existsSync(envPath)) { console.error(red(`env file not found: ${envPath}`)); process.exit(1) }

  const envVars = parseEnvFile(envPath)
  const lines = [
    '# Generated by env-validator',
    `# Source: ${basename(envPath)}`,
    '# Edit rules as needed: required, optional, url, number, boolean, email, min:N, max:N, enum:a|b|c',
    '',
  ]

  for (const [key, value] of envVars.entries()) {
    const type = inferType(value)
    lines.push(`${key}=${type}`)
  }

  const content = lines.join('\n') + '\n'

  if (outputPath) {
    import('fs').then(({ writeFileSync }) => {
      writeFileSync(outputPath, content, 'utf8')
      console.log(green(`  ✓ Schema written to ${outputPath}`))
    })
  } else {
    console.log(content)
  }
}

// ── Validate All .env.* ────────────────────────────────────────────────────────
function runAll({ dir, schemaPath, strict, quiet, outputFmt }) {
  const files = readdirSync(dir).filter(f => /^\.env(\..+)?$/.test(f) && !f.includes('schema') && !f.includes('example') && !f.includes('template'))

  if (files.length === 0) {
    console.error(yellow('  No .env.* files found in current directory'))
    process.exit(0)
  }

  let totalFailed = 0
  for (const file of files) {
    const envPath = resolve(dir, file)
    const { failed } = validateOne({ envPath, schemaPath, strict, quiet, outputFmt })
    totalFailed += failed
  }

  if (totalFailed > 0) process.exit(1)
}

// ── Help ──────────────────────────────────────────────────────────────────────
function showHelp() {
  console.log(`
${bold('env-validator')} ${dim('v1.0.0')}
Validate .env files against a schema contract.

${bold('USAGE')}
  ${cyan('env-validator')} [command] [options]

${bold('COMMANDS')}
  ${cyan('(default)')}               Validate .env against .env.schema
  ${cyan('generate')}                Generate .env.schema from existing .env
  ${cyan('diff')}                    Show missing/extra vars between .env and schema

${bold('OPTIONS')}
  ${cyan('--file <path>')}           Env file to validate (default: .env)
  ${cyan('--schema <path>')}         Schema file to use (default: .env.schema)
  ${cyan('--all')}                   Validate all .env.* files in directory
  ${cyan('--strict')}                Fail on vars not declared in schema
  ${cyan('--quiet')}                 Only show failures
  ${cyan('--output <json|text>')}    Output format (default: text)
  ${cyan('--help')}                  Show this help

${bold('SCHEMA FORMAT')} ${dim('(.env.schema)')}
  DATABASE_URL=required,url
  PORT=optional,number,default:3000
  NODE_ENV=required,enum:development|staging|production
  API_KEY=required,min:20
  DEBUG=optional,boolean
  MAX_RETRIES=optional,number,min:1,max:10

${bold('VALIDATION TYPES')}
  required, optional, url, number, boolean, email
  min:N, max:N, enum:a|b|c, regex:pattern, default:value

${bold('EXAMPLES')}
  npx env-validator
  npx env-validator --file .env.production --schema .env.schema
  npx env-validator --all --quiet
  npx env-validator generate > .env.schema
  npx env-validator diff
  npx env-validator --output json | jq .

${dim('Zero dependencies · Node 18+ · MIT License')}
`)
}

// ── CLI Entry Point ───────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  const cwd = process.cwd()

  // Parse flags
  const fileIdx = args.indexOf('--file')
  const schemaIdx = args.indexOf('--schema')
  const outputIdx = args.indexOf('--output')

  const fileFlag    = fileIdx !== -1 ? args[fileIdx + 1] : null
  const schemaFlag  = schemaIdx !== -1 ? args[schemaIdx + 1] : null
  const outputFlag  = outputIdx !== -1 ? args[outputIdx + 1] : 'text'
  const strict      = args.includes('--strict')
  const quiet       = args.includes('--quiet')
  const all         = args.includes('--all')

  const command = args.find(a => !a.startsWith('-') && a !== fileFlag && a !== schemaFlag && a !== outputFlag)

  // ── generate ──
  if (command === 'generate') {
    const envPath = resolve(cwd, fileFlag || '.env')
    const outFlag = args[args.indexOf('generate') + 1]
    const outputPath = outFlag && !outFlag.startsWith('-') ? resolve(cwd, outFlag) : null
    runGenerate(envPath, outputPath)
    return
  }

  // ── diff ──
  if (command === 'diff') {
    const envPath = resolve(cwd, fileFlag || findEnvFile(cwd) || '.env')
    const schemaPath = resolve(cwd, schemaFlag || findSchema(cwd) || '.env.schema')
    runDiff(envPath, schemaPath)
    return
  }

  // Resolve schema
  const schemaPath = resolve(cwd, schemaFlag || findSchema(cwd) || '.env.schema')

  // ── --all ──
  if (all) {
    runAll({ dir: cwd, schemaPath, strict, quiet, outputFmt: outputFlag })
    return
  }

  // ── default: validate single file ──
  const envPath = resolve(cwd, fileFlag || findEnvFile(cwd) || '.env')
  const { failed } = validateOne({ envPath, schemaPath, strict, quiet, outputFmt: outputFlag })
  if (failed > 0) process.exit(1)
}

main()
