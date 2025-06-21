/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'

/**
 * Setup why-did-you-render for development
 * This helps track unnecessary re-renders
 * 
 * Usage:
 * 1. Import this file at the top of your _app.tsx or layout.tsx
 * 2. Add Component.whyDidYouRender = true to any component you want to track
 */
// Commented out until @welldone-software/why-did-you-render is installed
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
//   // Dynamically import to avoid issues in production
//   import('@welldone-software/why-did-you-render').then((whyDidYouRender) => {
//     whyDidYouRender.default(React, {
//       trackAllPureComponents: false, // Set to true to track all pure components
//       trackHooks: true,
//       logOwnerReasons: true,
//       collapseGroups: true,
//       include: [
//         // Add component names to track here
//         // /^RecipeCard/,
//         // /^RecipeList/,
//       ],
//       exclude: [
//         // Add component names to exclude here
//         /^DevBoundary/,
//       ],
//     })
//   })
// }

// Helper to mark a component for tracking
export function trackComponent<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  if (process.env.NODE_ENV === 'development') {
    const name = componentName || Component.displayName || Component.name
    ;(Component as any).whyDidYouRender = {
      logOnDifferentValues: true,
      customName: name,
    }
  }
  return Component
}