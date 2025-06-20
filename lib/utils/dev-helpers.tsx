import { ReactElement, cloneElement } from 'react'

/**
 * Adds data-component attribute to elements in development
 * This helps identify which React component rendered each DOM element
 */
export function withComponentName<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name

  if (process.env.NODE_ENV === 'production') {
    return Component
  }

  const WrappedComponent = (props: P) => {
    const element = <Component {...props} />
    
    // For function components that return a single element
    if (element && typeof element === 'object' && 'props' in element) {
      return cloneElement(element as ReactElement, {
        'data-component': name,
        ...element.props
      })
    }
    
    // For other cases, wrap in a div
    return <div data-component={name}>{element}</div>
  }

  WrappedComponent.displayName = `withComponentName(${name})`
  
  return WrappedComponent
}

/**
 * Hook to add component name to any element
 */
export function useComponentName(name: string) {
  if (process.env.NODE_ENV === 'production') {
    return {}
  }
  
  return {
    'data-component': name
  }
}

/**
 * Helper to add source location in development
 */
export function useSourceLocation(fileName?: string) {
  if (process.env.NODE_ENV === 'production') {
    return {}
  }
  
  // Get stack trace to find actual source location
  const stack = new Error().stack
  const caller = stack?.split('\n')[2] // Adjust based on call depth
  
  return {
    'data-source': fileName || caller?.trim()
  }
}

/**
 * Development-only wrapper that shows component boundaries
 */
export function DevBoundary({ 
  name, 
  children,
  showBorder = false 
}: { 
  name: string
  children: React.ReactNode
  showBorder?: boolean 
}) {
  if (process.env.NODE_ENV === 'production') {
    return <>{children}</>
  }

  return (
    <div 
      data-component={name}
      className={showBorder ? 'ring-1 ring-blue-500/20 relative' : ''}
      title={`Component: ${name}`}
    >
      {showBorder && (
        <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-1 py-0.5 rounded">
          {name}
        </div>
      )}
      {children}
    </div>
  )
}