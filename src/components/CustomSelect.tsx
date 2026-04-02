"use client";

import { useState, useRef, useEffect } from "react";
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
}

export function CustomSelect({ value, onChange, options, placeholder = "Chọn...", className }: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <button
                type="button"
                className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-[13px] font-normal shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all dark:border-zinc-800 dark:bg-[#121212] dark:text-white hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] outline-none",
                    className
                )}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open ? "rotate-180" : "")} />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 min-w-[220px] max-w-[300px] origin-top-right rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-[#1a1a1a] animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-64 overflow-auto py-1 custom-scrollbar">
                        <button
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors relative mb-1",
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
                                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors relative",
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
                </div>
            )}
        </div>
    );
}
