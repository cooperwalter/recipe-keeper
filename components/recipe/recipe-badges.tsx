import { cn } from '@/lib/utils'
import { getBadgeInfo, getBadgeClasses, type RecipeBadge } from '@/lib/utils/recipe-badges'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Leaf,
  Wheat,
  Milk,
  Activity,
  TrendingDown,
  Mountain,
  CheckCircle,
  AlertTriangle,
  Egg,
  Square,
  Droplet,
  Badge,
  Nut,
  LucideIcon
} from 'lucide-react'

interface RecipeBadgesProps {
  badges: string[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showTooltip?: boolean
}

// Map icon names to Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  'leaf': Leaf,
  'wheat-off': Wheat,  // Using Wheat icon with strikethrough styling
  'milk-off': Milk,    // Using Milk icon with strikethrough styling
  'activity': Activity,
  'trending-down': TrendingDown,
  'mountain': Mountain,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  'egg-off': Egg,      // Using Egg icon with strikethrough styling
  'candy-off': Square,  // Using Square icon (sugar cube) with strikethrough styling
  'droplet': Droplet,
  'nut-off': Nut      // Using Nut icon with strikethrough styling for nut-free
}

export function RecipeBadges({ 
  badges, 
  size = 'md', 
  className,
  showTooltip = true 
}: RecipeBadgesProps) {
  if (!badges || badges.length === 0) return null

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  }
  
  // Smaller icon sizes for "no" badges to make room for the cross
  const smallerIconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  }
  
  // Larger cross container sizes for better visibility
  const crossContainerSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const renderBadge = (badge: string) => {
    const badgeInfo = getBadgeInfo(badge as RecipeBadge)
    if (!badgeInfo) return null

    // Get the icon component, fallback to Badge icon if not found
    const IconComponent = badgeInfo.icon ? iconMap[badgeInfo.icon] || Badge : Badge
    
    // Check if this is a "-off" icon that needs special styling
    const isOffIcon = badgeInfo.icon?.includes('-off')

    const badgeElement = (
      <span
        key={badge}
        className={cn(
          'inline-flex items-center rounded-full font-medium border transition-colors',
          sizeClasses[size],
          getBadgeClasses(badge as RecipeBadge),
          // Add border color that matches the badge theme
          'border-current/20',
          // Add hover effect
          'hover:border-current/40'
        )}
      >
        <div className={cn(
          "relative inline-flex items-center justify-center",
          isOffIcon ? crossContainerSizes[size] : 'w-auto'
        )}>
          <IconComponent className={cn(
            isOffIcon ? smallerIconSizes[size] : iconSizes[size], 
            'flex-shrink-0',
            isOffIcon && 'opacity-80'
          )} />
          {isOffIcon && (
            <>
              {/* Diagonal line with white border for better visibility */}
              <div 
                className="absolute bg-white dark:bg-gray-900"
                style={{
                  width: '110%',
                  height: size === 'sm' ? '2px' : size === 'md' ? '2.5px' : '3px',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'center',
                  left: '-5%',
                  top: '50%',
                  marginTop: size === 'sm' ? '-1px' : size === 'md' ? '-1.25px' : '-1.5px',
                  borderRadius: '0.5px'
                }}
              />
              <div 
                className="absolute bg-current"
                style={{
                  width: '110%',
                  height: size === 'sm' ? '1px' : size === 'md' ? '1.5px' : '2px',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'center',
                  left: '-5%',
                  top: '50%',
                  marginTop: size === 'sm' ? '-0.5px' : size === 'md' ? '-0.75px' : '-1px',
                  borderRadius: '0.5px'
                }}
              />
            </>
          )}
        </div>
        {badgeInfo.label}
      </span>
    )

    if (!showTooltip) return badgeElement

    return (
      <Tooltip key={badge}>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{badgeInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {badges.map(badge => renderBadge(badge))}
    </div>
  )
}