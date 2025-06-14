import { NextResponse } from 'next/server'
import { CategoryService } from '@/lib/db/categories'

export async function GET() {
  try {
    const categoryService = new CategoryService()
    const categories = await categoryService.getCategories()
    
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}