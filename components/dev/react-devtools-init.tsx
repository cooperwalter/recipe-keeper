'use client'

import { useEffect } from 'react'
import { initializeReactDevUtils } from '@/lib/utils/react-dev-utils'

export function ReactDevToolsInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initializeReactDevUtils()
    }
  }, [])

  return null
}