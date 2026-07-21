import { useCallback, useRef } from 'react';

let audioCtx = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export function useSoundEffects() {
  const lastHoverTime = useRef(0);

  const playHover = useCallback(() => {
    try {
      const now = Date.now();
      // Throttle hover sounds so they don't spam if dragging across many items
      if (now - lastHoverTime.current < 50) return;
      lastHoverTime.current = now;

      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // High-tech short blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // AudioContext may be blocked until a user gesture
    }
  }, []);

  const playClick = useCallback(() => {
    try {
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Deeper mechanical/digital click
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      // Add a slight filter for warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // AudioContext may be blocked until a user gesture
    }
  }, []);

  return { playHover, playClick };
}
