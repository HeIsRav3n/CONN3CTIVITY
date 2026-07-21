import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveDataStatus, STALE_MS } from './api'

describe('resolveDataStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns offline when fetch failed and no data', () => {
    expect(resolveDataStatus(null, { fetchedOk: false, hasData: false })).toBe('offline')
  })

  it('returns cached when fetch failed but data exists', () => {
    expect(resolveDataStatus(null, { fetchedOk: false, hasData: true })).toBe('cached')
  })

  it('returns live for fresh timestamps', () => {
    const updatedAt = new Date(Date.now() - 60_000).toISOString()
    expect(resolveDataStatus(updatedAt, { fetchedOk: true, hasData: true })).toBe('live')
  })

  it('returns stale when older than STALE_MS', () => {
    const updatedAt = new Date(Date.now() - STALE_MS - 1).toISOString()
    expect(resolveDataStatus(updatedAt, { fetchedOk: true, hasData: true })).toBe('stale')
  })

  it('returns live when fetched ok but timestamp missing', () => {
    expect(resolveDataStatus(null, { fetchedOk: true, hasData: true })).toBe('live')
  })
})
