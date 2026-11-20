import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { RadialBubbleMap } from './RadialBubbleMap'

/**
 * Regression test for the blank-map defect (PR #2 preview, 2026-11-20):
 * the Phase 2 render loop never re-scheduled requestAnimationFrame inside
 * step(), so the canvas ran at most one frame per wake — and a membership
 * change replaced the state with asleep:false while no frame was pending,
 * making every later wake() a no-op. The map stayed an empty dark
 * gradient even though member data loaded fine.
 *
 * These tests drive the loop with a manual rAF queue and a stubbed 2d
 * context, and prove: (1) bubbles are actually painted, (2) the loop
 * keeps scheduling frames, and (3) after the loop sleeps, a membership
 * change wakes it and it paints again.
 */

function makeMembers(n, prefix = 'm') {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    name: `Member ${i}`,
    discordHandle: `member${i}`,
    xHandle: null,
    color: '#C9A96E',
    avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
  }))
}

function createCtxStub() {
  const calls = { arc: [], fillRect: [], drawImage: [], fillText: [] }
  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    setTransform: vi.fn(),
    fillRect: vi.fn((...a) => calls.fillRect.push(a)),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn((...a) => calls.arc.push(a)),
    fill: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn((...a) => calls.drawImage.push(a)),
    fillText: vi.fn((...a) => calls.fillText.push(a)),
  }
  return ctx
}

describe('RadialBubbleMap render loop', () => {
  let ctx
  let rafQueue
  let rafId
  let origGetContext
  let origRaf
  let origCancelRaf
  let origHidden

  beforeEach(() => {
    ctx = createCtxStub()
    origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600,
    }))

    rafQueue = []
    rafId = 0
    origRaf = global.requestAnimationFrame
    origCancelRaf = global.cancelAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      rafId += 1
      rafQueue.push({ id: rafId, cb })
      return rafId
    })
    global.cancelAnimationFrame = vi.fn((id) => {
      const i = rafQueue.findIndex((f) => f.id === id)
      if (i >= 0) rafQueue.splice(i, 1)
    })

    origHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext
    global.requestAnimationFrame = origRaf
    global.cancelAnimationFrame = origCancelRaf
    if (origHidden) Object.defineProperty(Document.prototype, 'hidden', origHidden)
    else delete document.hidden
    vi.restoreAllMocks()
  })

  // Run the next queued frame with the given rAF timestamp.
  function runFrame(now) {
    const frame = rafQueue.shift()
    expect(frame, 'expected a scheduled animation frame').toBeTruthy()
    frame.cb(now)
  }

  it('paints bubbles and keeps scheduling frames', () => {
    render(
      <RadialBubbleMap
        members={makeMembers(5)}
        width={800}
        height={600}
        active
      />,
    )

    // The render-loop effect schedules the first frame on mount.
    expect(rafQueue.length).toBe(1)

    // Run 10 frames: each frame must schedule the next one, or the
    // loop is dead after a single paint (the original defect).
    for (let i = 0; i < 10; i++) {
      runFrame(1000 + i * 16)
      expect(rafQueue.length, `frame ${i} did not schedule a next frame`).toBe(1)
    }

    // Bubbles were painted: background fills plus the fallback gold
    // fillRect for every ring-0 bubble (avatars are not loaded in jsdom),
    // and an arc per bubble plus the hub.
    expect(ctx.calls.fillRect.length).toBeGreaterThanOrEqual(5)
    expect(ctx.calls.arc.length).toBeGreaterThanOrEqual(10)
  })

  it('restarts and paints again after the loop sleeps and members change', () => {
    const { rerender } = render(
      <RadialBubbleMap
        members={makeMembers(5)}
        width={800}
        height={600}
        active
      />,
    )
    runFrame(1000)
    runFrame(1016)
    const arcsAfterFirstPaint = ctx.calls.arc.length
    expect(arcsAfterFirstPaint).toBeGreaterThan(0)

    // Simulate the map scrolling out of view: the next frame must put
    // the loop to sleep and stop scheduling.
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    runFrame(1032)
    expect(rafQueue.length, 'loop kept scheduling while hidden').toBe(0)

    // Live data arrives while the loop sleeps (the preview scenario:
    // /api/conn3ctors returns after load). The membership change must
    // wake the loop — previously the fresh state reset asleep to false
    // while no frame was pending, so wake() was a no-op and the map
    // stayed blank forever.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    rerender(
      <RadialBubbleMap
        members={makeMembers(5, 'n')}
        width={800}
        height={600}
        active
      />,
    )
    expect(rafQueue.length, 'membership change did not wake the sleeping loop').toBe(1)
    runFrame(2000)
    expect(ctx.calls.arc.length).toBeGreaterThan(arcsAfterFirstPaint)
    expect(rafQueue.length, 'woken loop did not keep scheduling').toBe(1)
  })

  it('plain wheel scrolls the page (not captured) and Ctrl+wheel zooms the map', () => {
    // Live preview defect (PR #2, 2026-11-20): every wheel event over the
    // canvas was preventDefaulted and zoomed the map, so the page could
    // not be scrolled past it. Plain wheel must reach the browser;
    // Ctrl/Cmd+wheel (what trackpad pinch sends) is the zoom gesture.
    const { container } = render(
      <RadialBubbleMap members={makeMembers(5)} width={800} height={600} active />,
    )
    const canvas = container.querySelector('canvas')

    const plain = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
    canvas.dispatchEvent(plain)
    expect(plain.defaultPrevented, 'plain wheel must not be captured — the page has to scroll').toBe(false)

    const ctrl = new WheelEvent('wheel', { deltaY: -120, ctrlKey: true, cancelable: true, bubbles: true })
    canvas.dispatchEvent(ctrl)
    expect(ctrl.defaultPrevented, 'Ctrl+wheel must be captured to zoom the map').toBe(true)
  })

  it('a click on an overlay control does not re-select a member', () => {
    // Live preview defect (PR #2, 2026-11-20): clicking Reset changed the
    // open profile from one member to another. The tap-select handler
    // listened on window and hit-tested every pointerup, including clicks
    // on the HTML controls layered over the canvas (Reset, zoom, profile
    // card), so it selected whatever bubble sat under the button.
    // Tap-select must only fire when the gesture started on the canvas.
    const onSelect = vi.fn()
    const onHubClick = vi.fn()
    const { container } = render(
      <RadialBubbleMap
        members={makeMembers(5)}
        width={800}
        height={600}
        active
        onSelect={onSelect}
        onHubClick={onHubClick}
      />,
    )
    const canvas = container.querySelector('canvas')

    // Pointerdown on a control (not the canvas), pointerup over the hub.
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 400, clientY: 300 }))
    expect(onHubClick, 'pointerup without a canvas pointerdown must not select').not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()

    // A genuine tap on the canvas still selects the hub.
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 400, clientY: 300 }))
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 400, clientY: 300 }))
    expect(onHubClick, 'a real tap on the hub must still select it').toHaveBeenCalledTimes(1)
  })
})
