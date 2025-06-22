import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom variants for dashboard
        success:
          "border-transparent bg-green-500 text-green-50 hover:bg-green-500/80 dark:bg-green-600 dark:text-green-50 dark:hover:bg-green-600/90",
        warning:
          "border-transparent bg-yellow-500 text-yellow-50 hover:bg-yellow-500/80 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-600/90",
        info_processed:
          "border-transparent bg-blue-500 text-blue-50 hover:bg-blue-500/80 dark:bg-blue-600 dark:text-blue-50 dark:hover:bg-blue-600/90",
        blue: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", // For type badges
        green: "border-transparent bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", // For type badges
        purple: "border-transparent bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", // For type badges
        orange: "border-transparent bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", // For type badges (if needed)
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
