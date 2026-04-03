"use client";

import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const selectedOption = options.find(o => o.value === value);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                closeDropdown();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Clear search after close animation
    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => setSearchQuery(""), 180);
            return () => clearTimeout(t);
        }
    }, [open]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (open && searchable && options.length > 5) {
            const t = setTimeout(() => searchRef.current?.focus(), 30);
            return () => clearTimeout(t);
        }
    }, [open, searchable, options.length]);

    // Position calculation
    useEffect(() => {
        if (!open) return;
        function updatePosition() {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const dropdownMaxH = 320;
            const dropdownW = Math.max(rect.width, 200);
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUp = spaceBelow < dropdownMaxH && spaceAbove > spaceBelow;

            const top = openUp ? "auto" : `${rect.bottom + 6}px`;
            const bottom = openUp ? `${window.innerHeight - rect.top + 6}px` : "auto";
            const overflowsRight = rect.left + dropdownW > window.innerWidth;
            const left = overflowsRight ? "auto" : `${rect.left}px`;
            const right = overflowsRight ? `${window.innerWidth - rect.right}px` : "auto";

            setDropdownStyle({
                position: "fixed",
                top,
                bottom,
                left,
                right,
                width: `${dropdownW}px`,
                zIndex: 99999,
            });
        }
        updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [open]);

    // Animate-in — use double-rAF to ensure browser paints closed state first
    useEffect(() => {
        if (open) {
            let id: number;
            const r1 = requestAnimationFrame(() => {
                id = requestAnimationFrame(() => setIsVisible(true));
            });
            return () => { cancelAnimationFrame(r1); cancelAnimationFrame(id); };
        } else {
            setIsVisible(false);
        }
    }, [open]);

    const openDropdown = () => {
        if (disabled) return;
        setOpen(true);
    };

    const closeDropdown = () => {
        setIsVisible(false);
        setTimeout(() => setOpen(false), 160);
    };

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
        <div className="relative inline-block text-left w-full" ref={triggerRef}>
            {/* Trigger Button — outline-only state change (no bg shift) to prevent layout jump */}
            <button
                type="button"
                onClick={open ? closeDropdown : openDropdown}
                disabled={disabled}
                className={cn(
                    // Base — consistent text-[12px] everywhere, no shadow
                    "flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-[12px] font-medium text-zinc-700 transition-colors",
                    "focus:outline-none",
                    // Normal border
                    !open && "border-zinc-200 dark:border-zinc-700/80",
                    // Hover
                    "hover:border-zinc-300 dark:hover:border-zinc-600",
                    // Dark bg
                    "dark:bg-zinc-900 dark:text-zinc-200",
                    // Open state — only border color changes, bg stays same to avoid reflow
                    open && "border-zinc-300 dark:border-zinc-600",
                    // Disabled
                    disabled && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                <span className="truncate flex-1 text-left">
                    {selectedOption ? selectedOption.label : (
                        <span className="text-zinc-400 dark:text-zinc-500">{placeholder}</span>
                    )}
                </span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Panel — portal, no shadow */}
            {mounted && open && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        ...dropdownStyle,
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(-5px)",
                        transition: "opacity 160ms ease, transform 160ms ease",
                    }}
                    className="rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-700/80 dark:bg-[#1c1c1e] flex flex-col overflow-hidden"
                >
                    {/* Search Bar */}
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
                            {searchQuery && filteredOptions.length > 0 && (
                                <p className="text-[10px] font-medium text-zinc-400 mt-1.5 px-1">
                                    {filteredOptions.length} kết quả
                                </p>
                            )}
                        </div>
                    )}

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                        {/* Placeholder / clear option */}
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
                                {value === "" && <Check className="h-3.5 w-3.5 shrink-0 text-zinc-700 dark:text-zinc-300 stroke-[2.5]" />}
                            </button>
                        )}

                        {/* Filtered items */}
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
                                {value === option.value && (
                                    <Check className="h-3.5 w-3.5 shrink-0 text-zinc-700 dark:text-zinc-300 stroke-[2.5]" />
                                )}
                            </button>
                        ))}

                        {/* No results */}
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
