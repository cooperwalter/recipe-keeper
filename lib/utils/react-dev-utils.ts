/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Development utilities for finding React components in the browser
 * Add this to your app's initialization in development mode
 */

declare global {
  interface Window {
    findReactComponent: (dom: Element) => any
    findAllByProp: (propName: string, propValue: any) => any[]
    highlightComponents: (componentName: string) => void
    inspectComponent: (dom: Element) => void
  }
}

export function initializeReactDevUtils() {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return
  }

  // Find React's internal fiber node
  function findReactFiber(dom: Element): any {
    const key = Object.keys(dom).find(key => 
      key.startsWith('__reactFiber$') || 
      key.startsWith('__reactInternalInstance$')
    )
    return key ? (dom as any)[key] : null
  }

  // Find the React component instance from a DOM element
  window.findReactComponent = function(dom: Element) {
    let fiber = findReactFiber(dom)
    if (!fiber) return null

    // Traverse up to find the nearest component
    while (fiber && !fiber.stateNode) {
      fiber = fiber.return
    }

    return fiber?.stateNode || fiber?.memoizedProps
  }

  // Find all components with a specific prop
  window.findAllByProp = function(propName: string, propValue: any) {
    const results: any[] = []
    const allElements = document.querySelectorAll('*')
    
    allElements.forEach(element => {
      const fiber = findReactFiber(element)
      if (fiber?.memoizedProps?.[propName] === propValue) {
        results.push({
          element,
          props: fiber.memoizedProps,
          component: fiber.type?.name || 'Unknown'
        })
      }
    })
    
    return results
  }

  // Highlight all instances of a component
  window.highlightComponents = function(componentName: string) {
    const elements = document.querySelectorAll(`[data-component="${componentName}"]`)
    
    elements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.outline = '2px solid red'
      htmlEl.style.outlineOffset = '2px'
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        htmlEl.style.outline = ''
        htmlEl.style.outlineOffset = ''
      }, 3000)
    })
    
    console.log(`Found ${elements.length} instances of ${componentName}`)
    return elements
  }

  // Inspect a component by clicking on it
  window.inspectComponent = function(dom: Element) {
    const component = window.findReactComponent(dom)
    const fiber = findReactFiber(dom)
    
    console.group('React Component Inspector')
    console.log('DOM Element:', dom)
    console.log('Component:', fiber?.type?.name || 'Unknown')
    console.log('Props:', fiber?.memoizedProps)
    console.log('State:', fiber?.memoizedState)
    console.log('Fiber:', fiber)
    console.groupEnd()
    
    return component
  }

  // Add click-to-inspect functionality
  let inspectMode = false
  
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+C to toggle inspect mode
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault()
      inspectMode = !inspectMode
      document.body.style.cursor = inspectMode ? 'crosshair' : ''
      console.log(`React inspect mode: ${inspectMode ? 'ON' : 'OFF'}`)
    }
  })

  document.addEventListener('click', (e) => {
    if (inspectMode) {
      e.preventDefault()
      e.stopPropagation()
      window.inspectComponent(e.target as Element)
      inspectMode = false
      document.body.style.cursor = ''
    }
  })

  console.log('🔧 React DevUtils loaded! Available commands:')
  console.log('- findReactComponent(element)')
  console.log('- findAllByProp(propName, propValue)')  
  console.log('- highlightComponents(componentName)')
  console.log('- inspectComponent(element)')
  console.log('- Press Ctrl+Shift+C to toggle click-to-inspect mode')
}

// Usage: Import and call this in your app's entry point
// import { initializeReactDevUtils } from '@/lib/utils/react-dev-utils'
// if (process.env.NODE_ENV === 'development') {
//   initializeReactDevUtils()
// }