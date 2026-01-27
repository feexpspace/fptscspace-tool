// src/components/ModeToggle.tsx
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface ModeToggleProps {
    isCollapsed?: boolean
}

export function ModeToggle({ isCollapsed }: ModeToggleProps) {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        // Render một placeholder có kích thước tương đương để tránh nhảy layout
        return <div className="h-[44px] w-full" />
    }

    const toggleTheme = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    const isDark = resolvedTheme === "dark"

    return (
        <button
            onClick={toggleTheme}
            title={isCollapsed ? (isDark ? "Light Mode" : "Dark Mode") : ""}
            className={cn(
                // Base styles: Copy y nguyên từ Sidebar item
                "flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                // Hover & Text colors
                "text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white",
                // Collapsed logic: Copy y nguyên từ Sidebar item
                isCollapsed ? "justify-center px-0" : "gap-3 px-2"
            )}
        >
            <div className="relative h-5 w-5 shrink-0">
                <Moon className={cn(
                    "absolute h-5 w-5 transition-all duration-300",
                    isDark ? "scale-0 -rotate-90" : "scale-100 rotate-0"
                )} />
                <Sun className={cn(
                    "absolute h-5 w-5 transition-all duration-300",
                    isDark ? "scale-100 rotate-0" : "scale-0 rotate-90"
                )} />
            </div>

            <span className={cn(
                "transition-all duration-200 whitespace-nowrap overflow-hidden text-left",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
        </button>
    )
}