'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import './LoadingSpinner.css'

export default function GlobalLoading() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setLoading(true)
      const timeout = setTimeout(() => setLoading(false), 700)
      prevPath.current = pathname
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  return loading ? <LoadingSpinner /> : null
}
