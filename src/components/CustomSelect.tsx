"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
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
}

export function CustomSelect({ value, onChange, options, placeholder = "Chọn...", className, disabled = false }: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
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
        if (!open) return;
        function updatePosition() {
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                setDropdownStyle({
                    position: 'fixed',
                    top: `${rect.bottom}px`,
                    left: `${rect.left}px`,
                    width: `${Math.max(rect.width, 200)}px`, // minimum width
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

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={cn(
                    "flex items-center justify-between gap-1.5 sm:gap-3 rounded-lg sm:rounded-xl border border-zinc-200/80 bg-white px-2 py-1.5 text-[11px] sm:px-4 sm:py-2.5 sm:text-[13px] font-normal shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 outline-none cursor-pointer",
                    disabled && "opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-zinc-900",
                    className
                )}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={cn("h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-zinc-400 transition-transform", open ? "rotate-180" : "")} />
            </button>

            {mounted && open && createPortal(
                <div 
                    ref={dropdownRef} 
                    style={dropdownStyle} 
                    className="mt-2 max-w-[300px] origin-top-right rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100"
                >
                    <div className="max-h-64 overflow-auto py-1 custom-scrollbar">
                        <button
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className={cn(
                                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors relative mb-1",
                                value === ""
                                    ? "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                                    : "font-normal text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                            )}
                        >
                            {value === "" && <Check className="absolute left-3 h-3.5 w-3.5 stroke-[3]" />}
                            <span className={cn("truncate", value === "" ? "ml-6" : "ml-2")}>{placeholder}</span>
                        </button>
                        
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors relative",
                                    value === option.value
                                        ? "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                                        : "font-normal text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                                )}
                            >
                                {value === option.value && <Check className="absolute left-3 h-3.5 w-3.5 stroke-[3]" />}
                                <span className={cn("truncate", value === option.value ? "ml-6" : "ml-2")}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
