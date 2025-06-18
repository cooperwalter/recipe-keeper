import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delay function execution', () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn('test')
    expect(mockFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should cancel previous calls when called multiple times', () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn('first')
    vi.advanceTimersByTime(50)
    debouncedFn('second')
    vi.advanceTimersByTime(50)
    debouncedFn('third')
    
    vi.advanceTimersByTime(100)
    
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('third')
  })

  it('should pass all arguments to the debounced function', () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn('arg1', 'arg2', 'arg3')
    vi.advanceTimersByTime(100)
    
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })

  it('should allow multiple independent debounced functions', () => {
    const mockFn1 = vi.fn()
    const mockFn2 = vi.fn()
    const debouncedFn1 = debounce(mockFn1, 100)
    const debouncedFn2 = debounce(mockFn2, 200)

    debouncedFn1('fn1')
    debouncedFn2('fn2')
    
    vi.advanceTimersByTime(100)
    expect(mockFn1).toHaveBeenCalledWith('fn1')
    expect(mockFn2).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(100)
    expect(mockFn2).toHaveBeenCalledWith('fn2')
  })
})