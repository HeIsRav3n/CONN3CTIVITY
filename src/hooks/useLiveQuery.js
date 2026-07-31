import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LIVE_BACKGROUND_POLL_MS,
  LIVE_POLL_MS,
  resolveDataStatus,
} from '../lib/api'

/**
 * Initial fetch + optional Supabase Realtime subscription + adaptive polling fallback.
 *
 * @param {object} options
 * @param {() => Promise<any>} options.fetcher
 * @param {(data: any) => string|null|undefined} [options.getUpdatedAt]
 * @param {string} [options.table] - Supabase table for postgres_changes
 * @param {(payload: object, prev: any) => any} [options.applyRealtime]
 * @param {any} [options.initial]
 * @param {boolean} [options.enabled]
 */
export function useLiveQuery({
  fetcher,
  getUpdatedAt = (data) => data?.updated_at ?? null,
  table = null,
  applyRealtime = null,
  initial = null,
  enabled = true,
}) {
  const [data, setData] = useState(initial)
  const [status, setStatus] = useState(initial != null ? 'cached' : 'offline')
  const [realtime, setRealtime] = useState(false)
  const dataRef = useRef(initial)
  const realtimeRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  const applyRef = useRef(applyRealtime)
  const getUpdatedAtRef = useRef(getUpdatedAt)

  useEffect(() => { fetcherRef.current = fetcher }, [fetcher])
  useEffect(() => { applyRef.current = applyRealtime }, [applyRealtime])
  useEffect(() => { getUpdatedAtRef.current = getUpdatedAt }, [getUpdatedAt])
  useEffect(() => { dataRef.current = data }, [data])

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false
    let timer = null
    let channel = null

    async function load() {
      try {
        const next = await fetcherRef.current()
        if (cancelled) return
        // Keep object identity stable when payload is unchanged so consumers
        // (map, hero stats, MVC card) skip re-renders on no-op polls.
        const prev = dataRef.current
        const unchanged =
          prev != null && next != null && JSON.stringify(prev) === JSON.stringify(next)
        if (!unchanged) {
          dataRef.current = next
          setData(next)
        }
        const hasData = Array.isArray(next) ? next.length > 0 : next != null
        const updatedAt = getUpdatedAtRef.current(next)
        setStatus(resolveDataStatus(updatedAt, { fetchedOk: true, hasData }))
      } catch {
        if (cancelled) return
        const hasData = Array.isArray(dataRef.current)
          ? dataRef.current.length > 0
          : dataRef.current != null
        setStatus(resolveDataStatus(null, { fetchedOk: false, hasData }))
      }
    }

    const schedule = () => {
      // When Realtime is connected, poll slowly as a safety net only
      const delay = realtimeRef.current
        ? LIVE_BACKGROUND_POLL_MS * 3
        : (document.hidden ? LIVE_BACKGROUND_POLL_MS : LIVE_POLL_MS)
      timer = setTimeout(async () => {
        await load()
        if (!cancelled) schedule()
      }, delay)
    }

    const forceRefresh = () => {
      if (cancelled) return
      clearTimeout(timer)
      load().finally(() => {
        if (!cancelled) schedule()
      })
    }

    load().finally(() => {
      if (!cancelled) schedule()
    })

    document.addEventListener('visibilitychange', forceRefresh)
    window.addEventListener('online', forceRefresh)

    if (supabase && table) {
      channel = supabase
        .channel(`live:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            if (cancelled) return
            realtimeRef.current = true
            setRealtime(true)
            setStatus('live')
            if (typeof applyRef.current === 'function') {
              const next = applyRef.current(payload, dataRef.current)
              dataRef.current = next
              setData(next)
            } else {
              forceRefresh()
            }
          },
        )
        .subscribe((subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
            realtimeRef.current = true
            setRealtime(true)
          }
          if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT' || subStatus === 'CLOSED') {
            realtimeRef.current = false
            setRealtime(false)
          }
        })
    }

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', forceRefresh)
      window.removeEventListener('online', forceRefresh)
      if (channel) supabase?.removeChannel(channel)
    }
  }, [enabled, table])

  return { data, status, realtime, setData }
}
