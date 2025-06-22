import { NextRequest } from 'next/server'
import { expect } from 'vitest'

/**
 * API testing utilities
 */

export function createAuthenticatedRequest(
  url: string,
  options?: RequestInit & { params?: Record<string, string> }
) {
  const request = new NextRequest(url, options)
  
  // If params are provided, we need to return them in a way that Next.js API routes expect
  if (options?.params) {
    return { request, params: options.params }
  }
  
  return request
}

export function createUnauthenticatedRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options)
}

export function createMockApiContext(params?: Record<string, string>) {
  return {
    params: params || {},
  }
}

export async function expectAuthError(response: Response) {
  expect(response.status).toBe(401)
  const data = await response.json()
  expect(data.error).toMatch(/unauthorized|authentication required/i)
}

export async function expectValidationError(response: Response, field?: string) {
  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error).toBeDefined()
  
  if (field) {
    expect(data.error.toLowerCase()).toContain(field.toLowerCase())
  }
}

export async function expectSuccess(response: Response, status = 200) {
  expect(response.status).toBe(status)
  const data = await response.json()
  expect(data.error).toBeUndefined()
  return data
}

export async function expectError(response: Response, status: number, errorMessage?: string | RegExp) {
  expect(response.status).toBe(status)
  const data = await response.json()
  expect(data.error).toBeDefined()
  
  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      expect(data.error).toContain(errorMessage)
    } else {
      expect(data.error).toMatch(errorMessage)
    }
  }
  
  return data
}

export function createFormDataRequest(url: string, data: Record<string, string | number | boolean | File | Blob | object>) {
  const formData = new FormData()
  
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value)
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  })
  
  return new NextRequest(url, {
    method: 'POST',
    body: formData,
  })
}

export function createJsonRequest(url: string, data: unknown, method = 'POST') {
  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

export function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  return response.json()
}

export function createMockFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): File {
  const blob = new Blob([content], { type: mimeType })
  return new File([blob], filename, { type: mimeType })
}

export function createMockImageFile(filename: string = 'test.jpg'): File {
  // Create a minimal valid JPEG
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  const blob = new Blob([jpegHeader], { type: 'image/jpeg' })
  return new File([blob], filename, { type: 'image/jpeg' })
}