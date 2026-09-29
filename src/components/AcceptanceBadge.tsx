import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { AcceptanceStatus } from "@/types";

export function AcceptanceBadge({ status }: { status?: AcceptanceStatus | null }) {
    if (status === 'approved') {
        return (
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3" /> Đã duyệt
            </span>
        );
    }
    if (status === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 whitespace-nowrap">
                <XCircle className="h-3 w-3" /> Không duyệt
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
            <Clock className="h-3 w-3" /> Chưa duyệt
        </span>
    );
}
