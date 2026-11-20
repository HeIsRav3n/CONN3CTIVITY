import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { colourPolyhedronFaces } from '../../lib/gemFaces';

// Decisive pass (PR #2, 2026-11-20): the old tetrahedron has 4 faces, so
// viewed face-on it IS a single flat triangle by definition — no palette
// or lighting tweak could fix that. The gem must have many faces and no
// two adjacent faces may share a tone, or it collapses to one flat tone
// at some rotation angles.
describe('GoldPrism gem geometry', () => {
  it('has 20 faces, not 4', () => {
    const geometry = new THREE.IcosahedronGeometry(1.15, 0);
    const { faceCount } = colourPolyhedronFaces(geometry);
    expect(faceCount).toBe(20);
    geometry.dispose();
  });

  it('no two adjacent faces share a tone', () => {
    const geometry = new THREE.IcosahedronGeometry(1.15, 0);
    const { faceCount, toneOf, neighbours } = colourPolyhedronFaces(geometry);
    for (let f = 0; f < faceCount; f++) {
      for (const n of neighbours[f]) {
        expect(toneOf[n]).not.toBe(toneOf[f]);
      }
    }
    geometry.dispose();
  });

  it('uses at least 4 distinct tones across the faces', () => {
    const geometry = new THREE.IcosahedronGeometry(1.15, 0);
    const { toneOf } = colourPolyhedronFaces(geometry);
    expect(new Set(toneOf).size).toBeGreaterThanOrEqual(4);
    geometry.dispose();
  });
});
