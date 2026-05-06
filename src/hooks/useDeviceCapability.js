import { useMemo } from 'react'

export function useDeviceCapability() {
  return useMemo(() => {
    const ua = navigator.userAgent
    const isAppleWatch = /Watch/.test(ua)
    const isMobile = /iPhone|Android|iPad|Mobile/i.test(ua) || window.innerWidth < 768
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024
    const isDesktop = window.innerWidth >= 1024
    const isHighEnd = isDesktop && !isMobile && !isAppleWatch

    const textureScale = isAppleWatch ? 0.25 : isMobile ? 0.5 : isTablet ? 0.75 : 1.0
    const pixelRatio = isAppleWatch ? 1 : isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2)
    const fov = isMobile ? 85 : isTablet ? 75 : 60
    const enablePostProcessing = isHighEnd
    const enableBloom = isHighEnd
    const particleCount = isAppleWatch ? 20 : isMobile ? 50 : isTablet ? 150 : 300
    const geometryDetail = isAppleWatch ? 4 : isMobile ? 8 : 16

    return {
      isAppleWatch,
      isMobile,
      isTablet,
      isDesktop,
      isHighEnd,
      textureScale,
      pixelRatio,
      fov,
      enablePostProcessing,
      enableBloom,
      particleCount,
      geometryDetail,
    }
  }, [])
}
