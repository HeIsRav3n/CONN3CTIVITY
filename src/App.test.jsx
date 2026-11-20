import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

vi.mock('./sections/MapSection', () => ({
  MapSection: () => <div data-testid="mock-map">Map</div>
}));

vi.mock('./components/HandshakeConnect', () => ({
  HandshakeConnect: () => <div data-testid="handshake" />,
}));

vi.mock('./components/GlobalMascots', () => ({
  GlobalMascots: () => null,
}));

vi.mock('./components/three/GoldPrism', () => ({
  GoldPrism: () => null,
}));

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for map / layout observers
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for Navbar
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('App Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('scroll cue is a solid gold pill above every hero overlay, from first paint', () => {
    // Live preview defect (PR #2, 2026-11-20): three rounds saw the cue
    // as faint dark olive-grey even though its colour really was solid
    // #C9A96E at weight 600 with no fade. Root cause was stacking, not
    // colour: the cue had no z-index while the hero's bottom fade mask is
    // z-[1] and the clear-zone/vignette overlays are z-[2], so the cue
    // was painted under ~80%-opaque black. The decisive fix is a design
    // change, not a recolour: a solid gold pill with near-black text, on
    // z-20 above every overlay, so the text sits on a solid contrasting
    // surface and cannot read faint.
    const { getByText } = render(<App />);
    const cue = getByText('SCROLL TO EXPLORE');
    expect(cue.style.background).toBe('rgb(232, 200, 120)');
    expect(cue.style.color).toBe('rgb(11, 10, 8)');
    expect(cue.style.fontWeight).toBe('800');
    expect(cue.style.opacity).toBe('');
    expect(cue.parentElement.style.opacity).toBe('');
    expect(cue.parentElement.className).toContain('z-20');
  });
});
