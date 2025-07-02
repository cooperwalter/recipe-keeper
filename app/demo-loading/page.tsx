import Link from 'next/link'
import { NavLink } from '@/components/ui/nav-link'
import { Button } from '@/components/ui/button'

// Simulate a slow loading page
async function slowDataFetch() {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { message: 'Data loaded successfully!' }
}

export default async function DemoLoadingPage() {
  const data = await slowDataFetch()

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Demo Loading Page</h1>
      
      <div className="bg-green-100 dark:bg-green-900 p-4 rounded">
        <p className="text-green-800 dark:text-green-200">{data.message}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation Examples</h2>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Click any link below to see the immediate loading feedback:
          </p>
          
          <div className="flex gap-4">
            <NavLink href="/" className="text-blue-600 hover:underline">
              Home (with NavLink)
            </NavLink>
            
            <Link href="/" className="text-blue-600 hover:underline">
              Home (regular Link)
            </Link>
          </div>

          <div className="flex gap-4">
            <NavLink href="/protected/recipes">
              <Button variant="outline">
                View Recipes (NavLink Button)
              </Button>
            </NavLink>

            <Link href="/protected/recipes">
              <Button variant="outline">
                View Recipes (Regular Button)
              </Button>
            </Link>
          </div>

          <div className="mt-4">
            <NavLink href="/demo-loading" className="text-blue-600 hover:underline">
              Reload this slow page
            </NavLink>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>This page intentionally loads slowly (2 seconds) to demonstrate the loading improvements.</p>
        <p>The top loading bar appears immediately when you click any navigation link.</p>
      </div>
    </div>
  )
}