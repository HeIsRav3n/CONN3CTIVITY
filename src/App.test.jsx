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

  it('scroll cue is legible from first paint (no delayed fade-in)', () => {
    // Live preview defect (PR #2, 2026-11-20): the cue faded in from
    // opacity 0 after a 2.5s delay, so live screenshots caught it
    // mid-fade as faint dark grey despite the gold colour measuring
    // 8.8:1. It must render at full opacity immediately, in solid gold,
    // at a weight/size whose strokes survive antialiasing.
    const { getByText } = render(<App />);
    const cue = getByText('SCROLL TO EXPLORE');
    expect(cue.style.color).toBe('rgb(201, 169, 110)');
    expect(cue.style.fontWeight).toBe('600');
    expect(cue.style.fontSize).toBe('0.75rem');
    expect(cue.style.opacity).toBe('');
    expect(cue.parentElement.style.opacity).toBe('');
  });
});
