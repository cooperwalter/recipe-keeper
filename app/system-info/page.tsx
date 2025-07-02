import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChefHat, GitBranch, Globe, Server, Package, Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getBuildId } from '@/lib/build-info'

// Get build-time values
const buildTime = new Date().toISOString()
const nodeVersion = process.version

export default function SystemInfoPage() {
  // Vercel environment variables
  const vercelEnv = process.env.VERCEL_ENV || 'development'
  const vercelUrl = process.env.VERCEL_URL || 'localhost'
  const vercelRegion = process.env.VERCEL_REGION || 'local'
  const vercelGitCommitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const vercelGitCommitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || 'Local development'
  const vercelGitCommitAuthor = process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME || 'Local developer'
  const vercelGitBranch = process.env.VERCEL_GIT_REPO_SLUG || 'local'
  const vercelGitProvider = process.env.VERCEL_GIT_PROVIDER || 'git'
  
  // Get the actual Next.js build ID
  const buildId = getBuildId()
  
  
  // Database URL (masked for security)
  const databaseUrl = process.env.DATABASE_URL
  const maskedDbUrl = databaseUrl 
    ? databaseUrl.replace(/:[^:@]+@/, ':****@').replace(/\?.*$/, '?****')
    : 'Not configured'

  // Supabase configuration (masked)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // API Keys status (never show actual keys)
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY
  const hasSentryDsn = !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">System Information</h1>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Build Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Build Information
            </CardTitle>
            <CardDescription>Current deployment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Build ID</p>
                <p className="font-mono text-sm">{buildId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Build Time</p>
                <p className="font-mono text-sm">{buildTime}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Environment</p>
                <Badge variant={vercelEnv === 'production' ? 'default' : 'secondary'}>
                  {vercelEnv}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Node Version</p>
                <p className="font-mono text-sm">{nodeVersion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Deployment Information
            </CardTitle>
            <CardDescription>Vercel deployment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">URL</p>
                <p className="font-mono text-sm truncate">{vercelUrl}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="font-mono text-sm">{vercelRegion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Git Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Git Information
            </CardTitle>
            <CardDescription>Source control details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Commit SHA</p>
                <p className="font-mono text-sm">{vercelGitCommitSha.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commit Message</p>
                <p className="text-sm">{vercelGitCommitMessage}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Author</p>
                <p className="text-sm">{vercelGitCommitAuthor}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Repository</p>
                  <p className="font-mono text-sm">{vercelGitBranch}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-mono text-sm">{vercelGitProvider}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuration Status
            </CardTitle>
            <CardDescription>Environment configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <p className="font-mono text-xs truncate">{maskedDbUrl}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supabase URL</p>
                <p className="font-mono text-xs truncate">{supabaseUrl}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">API Keys Status</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={hasSupabaseKey ? 'default' : 'destructive'}>
                    Supabase: {hasSupabaseKey ? 'Configured' : 'Missing'}
                  </Badge>
                  <Badge variant={hasAnthropicKey ? 'default' : 'destructive'}>
                    Anthropic: {hasAnthropicKey ? 'Configured' : 'Missing'}
                  </Badge>
                  <Badge variant={hasOpenAIKey ? 'default' : 'secondary'}>
                    OpenAI: {hasOpenAIKey ? 'Configured' : 'Not configured'}
                  </Badge>
                  <Badge variant={hasSentryDsn ? 'default' : 'secondary'}>
                    Sentry: {hasSentryDsn ? 'Configured' : 'Not configured'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Shield className="h-5 w-5" />
              Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page contains system information and should only be accessed by authorized personnel. 
              No sensitive credentials or API keys are displayed. All sensitive values are masked or 
              shown as configuration status only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}