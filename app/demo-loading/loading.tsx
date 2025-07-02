import { Skeleton } from '@/components/ui/skeleton'

export default function DemoLoadingState() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <Skeleton className="h-10 w-64" />
      
      <Skeleton className="h-20 w-full" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-md" />
          
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>

          <div className="flex gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  )
}