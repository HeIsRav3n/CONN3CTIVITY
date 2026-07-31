import { lazy, Suspense } from 'react'

/**
 * Code-split three.js scene backgrounds so React Three Fiber + three
 * stay out of the initial bundle (they're the largest chunk by far).
 * Backgrounds are decorative — render nothing while loading.
 */
const PartnershipsBackgroundImpl = lazy(() =>
  import('./SectionBackgrounds').then(m => ({ default: m.PartnershipsBackground }))
)
const TeamBackgroundImpl = lazy(() =>
  import('./SectionBackgrounds').then(m => ({ default: m.TeamBackground }))
)

export function PartnershipsBackground() {
  return (
    <Suspense fallback={null}>
      <PartnershipsBackgroundImpl />
    </Suspense>
  )
}

export function TeamBackground() {
  return (
    <Suspense fallback={null}>
      <TeamBackgroundImpl />
    </Suspense>
  )
}
