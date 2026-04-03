"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    searchable?: boolean;
}

export function CustomSelect({
    value,
    onChange,
    options,
    placeholder = "Chọn...",
    className,
    disabled = false,
    searchable = true,
}: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    // Use ref for position — avoids extra state-driven re-render that causes flicker
    const positionStyleRef = useRef<CSSProperties>({});
    const [mounted, setMounted] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => { setMounted(true); }, []);

    const selectedOption = options.find(o => o.value === value);

    // Compute position synchronously — call BEFORE setOpen(true)
    const computePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownW = Math.max(rect.width, 200);
        const dropdownMaxH = 320;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < dropdownMaxH && spaceAbove > spaceBelow;

        const overflowsRight = rect.left + dropdownW > window.innerWidth;

        positionStyleRef.current = {
            position: "fixed",
            top: openUp ? "auto" : `${rect.bottom + 6}px`,
            bottom: openUp ? `${window.innerHeight - rect.top + 6}px` : "auto",
            left: overflowsRight ? "auto" : `${rect.left}px`,
            right: overflowsRight ? `${window.innerWidth - rect.right}px` : "auto",
            width: `${dropdownW}px`,
            zIndex: 99999,
        };
    }, []);

    const openDropdown = useCallback(() => {
        if (disabled) return;
        clearTimeout(closeTimerRef.current);
        computePosition(); // sync computation before paint
        setOpen(true);
        // Animate in after browser paints the open=true frame
        requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    }, [disabled, computePosition]);

    const closeDropdown = useCallback(() => {
        setIsVisible(false);
        closeTimerRef.current = setTimeout(() => setOpen(false), 160);
    }, []);

    // Update position on scroll/resize while open
    useEffect(() => {
        if (!open) return;
        const update = () => computePosition();
        window.addEventListener("scroll", update, { passive: true, capture: true });
        window.addEventListener("resize", update, { passive: true });
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [open, computePosition]);

    // Outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return;
            closeDropdown();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, closeDropdown]);

    // Clear search when closed
    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => setSearchQuery(""), 180);
            return () => clearTimeout(t);
        }
    }, [open]);

    // Auto-focus search
    useEffect(() => {
        if (open && searchable && options.length > 5) {
            const t = setTimeout(() => searchRef.current?.focus(), 30);
            return () => clearTimeout(t);
        }
    }, [open, searchable, options.length]);

    const handleSelect = (val: string) => {
        onChange(val);
        closeDropdown();
    };

    const filteredOptions = searchable && searchQuery
        ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const noResults = searchable && searchQuery.length > 0 && filteredOptions.length === 0;
    const showSearch = searchable && options.length > 5;

    return (
        <div className="relative inline-block text-left w-full">
            {/* Trigger — ref on the button itself, no wrapper div */}
            <button
                ref={triggerRef}
                type="button"
                onClick={open ? closeDropdown : openDropdown}
                disabled={disabled}
                className={cn(
                    "flex w-full h-[34px] items-center justify-between gap-2 rounded-lg border bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors focus:outline-none",
                    open ? "border-zinc-300 dark:border-zinc-600" : "border-zinc-200 dark:border-zinc-700/80",
                    "hover:border-zinc-300 dark:hover:border-zinc-600",
                    "dark:bg-zinc-900 dark:text-zinc-200",
                    disabled && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                <span className="truncate flex-1 text-left">
                    {selectedOption
                        ? selectedOption.label
                        : <span className="text-zinc-400 dark:text-zinc-500">{placeholder}</span>
                    }
                </span>
                <ChevronDown className={cn(
                    "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200",
                    open && "rotate-180"
                )} />
            </button>

            {/* Portal dropdown */}
            {mounted && open && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        ...positionStyleRef.current,
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(-5px)",
                        transition: "opacity 160ms ease, transform 160ms ease",
                    }}
                    className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-700/80 dark:bg-[#1c1c1e] flex flex-col overflow-hidden"
                >
                    {showSearch && (
                        <div className="px-2 pt-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 px-2.5 py-2">
                                <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    className="flex-1 bg-transparent text-[12px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                                    placeholder="Tìm kiếm..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        onMouseDown={e => { e.preventDefault(); setSearchQuery(""); }}
                                        className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                    >
                                        <X className="h-2.5 w-2.5 text-zinc-500 dark:text-zinc-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                        {/* Placeholder clear option */}
                        {!searchQuery && (
                            <button
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => handleSelect("")}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] transition-colors",
                                    value === ""
                                        ? "bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-white"
                                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <span className="flex-1 truncate">{placeholder}</span>
                                {value === "" && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />}
                            </button>
                        )}

                        {filteredOptions.map(option => (
                            <button
                                key={option.value}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] transition-colors",
                                    value === option.value
                                        ? "bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-white"
                                        : "font-normal text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100"
                                )}
                            >
                                <span className="flex-1 truncate">{option.label}</span>
                                {value === option.value && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5] text-zinc-700 dark:text-zinc-300" />}
                            </button>
                        ))}

                        {noResults && (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2.5">
                                    <Search className="h-4 w-4 text-zinc-400" />
                                </div>
                                <p className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">Không có kết quả</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Thử từ khóa khác</p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
