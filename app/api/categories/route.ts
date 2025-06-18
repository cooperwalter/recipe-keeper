import { NextResponse } from 'next/server'
import { CategoryService } from '@/lib/db/categories'

export async function GET() {
  try {
    const categoryService = new CategoryService()
    const categories = await categoryService.getCategories()
    
    // Add cache headers - categories change rarely
    const response = NextResponse.json(categories)
    
    // Cache for 5 minutes with longer revalidation
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}