'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Clock, RotateCcw, Eye, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import type { RecipeVersion } from '@/lib/db/schema'

interface VersionHistoryProps {
  recipeId: string
  currentVersion?: number
}

export function VersionHistory({ recipeId, currentVersion = 1 }: VersionHistoryProps) {
  const [versions, setVersions] = useState<RecipeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<RecipeVersion | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showAllVersionsDialog, setShowAllVersionsDialog] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const { toast } = useToast()

  // Show max 3 versions in the card, rest in dialog
  const MAX_VISIBLE_VERSIONS = 3

  useEffect(() => {
    fetchVersionHistory()
  }, [recipeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVersionHistory = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/versions`)
      if (!response.ok) throw new Error('Failed to fetch version history')
      const data = await response.json()
      setVersions(data)
    } catch (error) {
      console.error('Error fetching version history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedVersion) return

    setRestoring(true)
    try {
      const response = await fetch(
        `/api/recipes/${recipeId}/versions/${selectedVersion.versionNumber}/restore`,
        { method: 'POST' }
      )

      if (!response.ok) throw new Error('Failed to restore version')

      toast({
        title: 'Success',
        description: `Recipe restored to version ${selectedVersion.versionNumber}`,
      })

      // Refresh the page to show updated recipe
      window.location.reload()
    } catch (error) {
      console.error('Error restoring version:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore version',
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
      setShowRestoreDialog(false)
    }
  }

  const handleViewComparison = (version: RecipeVersion) => {
    // Open version comparison with current version
    window.open(`/protected/recipes/${recipeId}/versions/compare?v1=${currentVersion}&v2=${version.versionNumber}`, '_blank')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Track all changes made to this recipe over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Skeleton for version items */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start justify-between py-3 border-b last:border-0">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" /> {/* Version number */}
                  <Skeleton className="h-5 w-20" /> {/* Badge */}
                </div>
                <Skeleton className="h-4 w-3/4" /> {/* Change summary */}
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-32" /> {/* Date */}
                  <Skeleton className="h-3 w-24" /> {/* User */}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Skeleton className="h-9 w-20" /> {/* View button */}
                <Skeleton className="h-9 w-24" /> {/* Restore button */}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Track all changes made to this recipe over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No version history available yet.</p>
              <p className="text-sm">Versions are created when you update the recipe.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const visibleVersions = versions.slice(0, MAX_VISIBLE_VERSIONS)
  const hasMoreVersions = versions.length > MAX_VISIBLE_VERSIONS

  const VersionItem = ({ version }: { version: RecipeVersion }) => (
    <div 
      className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
        version.versionNumber !== currentVersion ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
      }`}
      onClick={() => version.versionNumber !== currentVersion && handleViewComparison(version)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={version.versionNumber === currentVersion ? 'default' : 'secondary'}>
            Version {version.versionNumber}
          </Badge>
          {version.versionNumber === currentVersion && (
            <Badge variant="outline">Current</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          {version.changeSummary || 'Recipe updated'}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(version.changedAt), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {version.versionNumber !== currentVersion && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleViewComparison(version)
              }}
              title="Compare with current version"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedVersion(version)
                setShowRestoreDialog(true)
              }}
              title="Restore this version"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Track all changes made to this recipe over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleVersions.map((version) => (
              <VersionItem key={version.id} version={version} />
            ))}
            {hasMoreVersions && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAllVersionsDialog(true)}
              >
                View all {versions.length} versions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Recipe Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this recipe to version{' '}
              {selectedVersion?.versionNumber}? This will create a new version with the
              contents from the selected version.
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="py-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-1">Version {selectedVersion.versionNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVersion.changeSummary || 'Recipe updated'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(selectedVersion.changedAt), 'MMMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Restore Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllVersionsDialog} onOpenChange={setShowAllVersionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Complete Version History</DialogTitle>
            <DialogDescription>
              All {versions.length} versions of this recipe
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {versions.map((version) => (
                <VersionItem key={version.id} version={version} />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}