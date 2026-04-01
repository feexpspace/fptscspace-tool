import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Hàm tiện ích để gộp các class Tailwind CSS
 * Giúp xử lý logic điều kiện và ghi đè class trùng lặp
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Chia nhỏ mảng để tránh giới hạn query 'in' của Firestore (max 30 items)
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}