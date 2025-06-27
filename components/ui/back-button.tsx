'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  href: string
  label?: string
  className?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function BackButton({ 
  href, 
  label = 'Back', 
  className,
  variant = 'outline',
  size = 'default'
}: BackButtonProps) {
  return (
    <Link href={href}>
      <Button 
        variant={variant}
        size={size}
        className={cn(
          'group hover:bg-primary hover:text-primary-foreground transition-all duration-200',
          className
        )}
      >
        <ChevronLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
        {label}
      </Button>
    </Link>
  )
}