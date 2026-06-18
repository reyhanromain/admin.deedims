import { useEffect, useState } from 'react'

export const MOBILE_QUERY = '(max-width: 759px)'

export function useMediaQuery(query: string): boolean {
  const getInitial = () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState(getInitial)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)

    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
