'use client'

import Link, { LinkProps } from 'next/link'
import { useRouter } from 'next/navigation'
import { forwardRef, MouseEvent, KeyboardEvent, useTransition } from 'react'
import { cn } from '@/lib/utils'

interface NavLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  children: React.ReactNode
  showLoadingState?: boolean
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ children, href, onClick, className, showLoadingState = true, ...props }, ref) => {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // Call original onClick if provided
      if (onClick) {
        onClick(e)
      }

      // If default was prevented, don't navigate
      if (e.defaultPrevented) {
        return
      }

      // Handle modifier keys (let browser handle these normally)
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
        return
      }

      // Prevent default and use router.push for same-origin navigation
      const url = new URL(href.toString(), window.location.href)
      if (url.origin === window.location.origin) {
        e.preventDefault()
        startTransition(() => {
          router.push(href.toString())
        })
      }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
      // Handle Enter key for accessibility
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        const url = new URL(href.toString(), window.location.href)
        if (url.origin === window.location.origin) {
          startTransition(() => {
            router.push(href.toString())
          })
        }
      }
    }

    return (
      <Link
        ref={ref}
        href={href}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          className,
          showLoadingState && isPending && 'opacity-70 cursor-wait'
        )}
        {...props}
      >
        {children}
      </Link>
    )
  }
)

NavLink.displayName = 'NavLink'