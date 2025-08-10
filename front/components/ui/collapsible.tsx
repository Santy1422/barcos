"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ children, open: controlledOpen, onOpenChange, className, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(false)
    
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    
    const setOpen = React.useCallback((newOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    }, [isControlled, onOpenChange])
    
    return (
      <CollapsibleContext.Provider value={{ open, setOpen }}>
        <div ref={ref} className={cn("", className)} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, onClick, className, ...props }, ref) => {
    const { open, setOpen } = React.useContext(CollapsibleContext)
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn("", className)}
        onClick={() => {
          setOpen(!open)
          onClick?.()
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className, ...props }, ref) => {
    const { open } = React.useContext(CollapsibleContext)
    
    if (!open) return null
    
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }