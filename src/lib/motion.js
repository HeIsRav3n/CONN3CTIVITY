export const luxuryEase = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 36, filter: 'blur(12px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, ease: luxuryEase },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.7, ease: luxuryEase } },
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
}

export const viewportOnce = { once: true, margin: '-72px 0px' }
