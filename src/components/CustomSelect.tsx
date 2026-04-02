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

export function CustomSelect({ value, onChange, options, placeholder = "Chọn...", className, disabled = false, searchable = true }: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!open) {
            const timeout = setTimeout(() => setSearchQuery(""), 150);
            return () => clearTimeout(timeout);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function updatePosition() {
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                const dropdownHeight = 320; // approximate max height + search
                const dropdownWidth = Math.max(rect.width, 220);

                let topStyle = 'auto';
                let bottomStyle = 'auto';
                let originStyle = 'top left';
                
                if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                    bottomStyle = `${window.innerHeight - rect.top + 8}px`;
                    originStyle = 'bottom left';
                } else {
                    topStyle = `${rect.bottom + 8}px`;
                    originStyle = 'top left';
                }

                let leftStyle = 'auto';
                let rightStyle = 'auto';

                if (rect.left + dropdownWidth > window.innerWidth) {
                    rightStyle = `${window.innerWidth - rect.right}px`;
                    originStyle = originStyle.replace('left', 'right');
                } else {
                    leftStyle = `${rect.left}px`;
                }

                setDropdownStyle({
                    position: 'fixed',
                    top: topStyle,
                    bottom: bottomStyle,
                    left: leftStyle,
                    right: rightStyle,
                    width: `${dropdownWidth}px`,
                    transformOrigin: originStyle,
                    zIndex: 99999
                });
            }
        }
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open]);

    const filteredOptions = searchable 
        ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const noResults = searchable && searchQuery && filteredOptions.length === 0;

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={cn(
                    "flex items-center justify-between gap-1.5 sm:gap-3 rounded-lg sm:rounded-xl border border-zinc-200/80 bg-white px-2 py-1.5 text-[11px] sm:px-4 sm:py-2.5 sm:text-[13px] font-normal shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 outline-none cursor-pointer focus:border-zinc-300 dark:focus:border-zinc-700",
                    disabled && "opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-zinc-900",
                    className
                )}
            >
                <span className="truncate flex-1 text-left">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={cn("h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-zinc-400 transition-transform", open ? "rotate-180" : "")} />
            </button>

            {mounted && open && createPortal(
                <div 
                    ref={dropdownRef} 
                    style={dropdownStyle} 
                    className="max-w-[320px] rounded-xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-zinc-800 dark:bg-[#1C1C1C] animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden"
                >
                    {searchable && options.length > 5 && (
                        <div className="px-3 border-b border-zinc-100 dark:border-zinc-800/80 sticky top-0 bg-white dark:bg-[#1C1C1C] z-10 shrink-0">
                            <div className="flex items-center">
                                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                                <input
                                    type="text"
                                    className="w-full bg-transparent border-none px-2 py-3 text-[13px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0"
                                    placeholder="Tìm kiếm..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery("")}
                                        className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <X className="w-3 h-3 text-zinc-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
                        {!searchQuery && (
                            <button
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                }}
                                className={cn(
                                    "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors relative",
                                    value === ""
                                        ? "bg-zinc-100/50 font-bold text-zinc-900 dark:bg-zinc-800/50 dark:text-white"
                                        : "font-normal text-zinc-700 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                                )}
                            >
                                <span className="truncate">{placeholder}</span>
                                {value === "" && <Check className="h-4 w-4 shrink-0 text-zinc-900 dark:text-white stroke-[2.5]" />}
                            </button>
                        )}
                        
                        {filteredOptions.length > 0 ? (
                            <>
                                {searchQuery && <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{filteredOptions.length} kết quả</div>}
                                {filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-[13px] transition-colors relative",
                                            value === option.value
                                                ? "bg-zinc-100/50 font-bold text-zinc-900 dark:bg-zinc-800/50 dark:text-white"
                                                : "font-normal text-zinc-700 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                                        )}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {value === option.value && <Check className="h-4 w-4 shrink-0 text-zinc-900 dark:text-white stroke-[2.5]" />}
                                    </button>
                                ))}
                            </>
                        ) : noResults ? (
                            <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
                                    <Search className="h-5 w-5 text-zinc-400" />
                                </div>
                                <p className="text-[13px] font-bold text-zinc-900 dark:text-white mb-1">Không thấy kết quả</p>
                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 max-w-[200px]">Không có lựa chọn nào phù hợp với "{searchQuery}"</p>
                            </div>
                        ) : null}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
