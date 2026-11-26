import { describe, expect, it } from 'vitest'
import { createRegistry } from './registry.js'
import { createSession } from './session.js'

describe('dispatch', () => {
  it('returns ok:false for an unknown command', () => {
    const reg = createRegistry()
    const result = reg.dispatch(createSession(), 'does.not.exist', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('unknown-command')
  })

  it('returns ok:false for an empty command id', () => {
    const reg = createRegistry()
    expect(reg.dispatch(createSession(), '', {}).error.code).toBe('unknown-command')
  })

  it('rejects a non-object params value', () => {
    const reg = createRegistry()
    reg.register({ id: 'test', run: () => null })
    expect(reg.dispatch(createSession(), 'test', 42).error.code).toBe('invalid-params')
  })

  it('rejects a missing required parameter', () => {
    const reg = createRegistry()
    reg.register({ id: 'test', params: ['x'], run: () => null })
    const result = reg.dispatch(createSession(), 'test', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('missing-param')
    expect(result.error.details.missing).toEqual(['x'])
  })

  it('does not run a disabled command', () => {
    const reg = createRegistry()
    let ran = false
    reg.register({
      id: 'never.run',
      enabled: () => false,
      run: () => {
        ran = true
      },
    })
    const result = reg.dispatch(createSession(), 'never.run', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
    expect(ran).toBe(false)
  })

  it('converts a thrown error into an error result instead of throwing', () => {
    const reg = createRegistry()
    reg.register({
      id: 'boom',
      run: () => {
        throw new Error('kaboom')
      },
    })
    const result = reg.dispatch(createSession(), 'boom', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-failed')
    expect(result.error.message).toBe('kaboom')
  })

  it('runs a registered command and returns its result', () => {
    const reg = createRegistry()
    const session = createSession()
    reg.register({
      id: 'test.set',
      run: (s, params) => {
        s.mode = params.value
        return { mode: s.mode }
      },
    })
    const result = reg.dispatch(session, 'test.set', { value: 'card' })
    expect(result.ok).toBe(true)
    expect(result.result).toEqual({ mode: 'card' })
    expect(session.mode).toBe('card')
  })

  it('refuses to register duplicate ids', () => {
    const reg = createRegistry()
    const spec = { id: 'dup', run: () => null }
    reg.register(spec)
    expect(() => reg.register(spec)).toThrow(/duplicate command id/)
  })
})
