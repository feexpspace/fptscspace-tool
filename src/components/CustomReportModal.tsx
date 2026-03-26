"use client";

import { useState } from "react";
import { Search, X, CheckSquare, Square } from "lucide-react";
import { Channel } from "@/types";

interface CustomReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    channels: Channel[];
    selectedYear: number;
}

export function CustomReportModal({ isOpen, onClose, channels, selectedYear }: CustomReportModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    if (!isOpen) return null;

    const filteredChannels = channels.filter(c =>
        c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelection = (id: string) => {
        setSelectedChannels(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const handleGenerateReport = () => {
        if (selectedChannels.length === 0) return;
        const url = `/custom-report?ids=${selectedChannels.join(',')}&year=${selectedYear}`;
        window.open(url, '_blank');
        onClose();
        // Reset state
        setSearchQuery("");
        setSelectedChannels([]);
    };

    const handleClose = () => {
        setSearchQuery("");
        setSelectedChannels([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg p-6 relative flex flex-col max-h-[85vh]">
                <button onClick={handleClose} className="absolute top-4 right-4 text-zinc-400 hover:text-black dark:hover:text-white">
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-xl font-bold mb-2">Tạo Báo Cáo Tùy Chỉnh</h2>
                <p className="text-sm text-zinc-500 mb-6">Chọn các kênh bạn muốn đưa vào báo cáo tổng hợp.</p>

                <div className="relative mb-4 shrink-0">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm kênh..."
                        className="w-full rounded-lg border pl-9 p-2.5 text-sm outline-none focus:ring-2 border-zinc-300 focus:ring-black bg-white dark:bg-zinc-950 dark:border-zinc-700"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 space-y-1 mb-4">
                    {filteredChannels.length === 0 ? (
                        <div className="text-center py-8 text-sm text-zinc-500 italic">Không tìm thấy kênh nào.</div>
                    ) : (
                        filteredChannels.map(channel => {
                            const isSelected = selectedChannels.includes(channel.id);
                            return (
                                <div
                                    key={channel.id}
                                    onClick={() => toggleSelection(channel.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                                >
                                    <div className="text-zinc-400">
                                        {isSelected ? <CheckSquare className="h-5 w-5 text-black dark:text-white" /> : <Square className="h-5 w-5" />}
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-zinc-500">{channel.displayName.charAt(0)}</span>
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-sm truncate">{channel.displayName}</div>
                                        <div className="text-xs text-zinc-500 truncate">@{channel.username}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex items-center justify-between shrink-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Đã chọn: <span className="font-bold text-black dark:text-white">{selectedChannels.length}</span> kênh
                    </span>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm">
                            Hủy
                        </button>
                        <button onClick={handleGenerateReport} disabled={selectedChannels.length === 0} className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium hover:opacity-80 disabled:opacity-50 text-sm">
                            Mở Báo Cáo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}