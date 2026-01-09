import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Hàm tiện ích để gộp các class Tailwind CSS
 * Giúp xử lý logic điều kiện và ghi đè class trùng lặp
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}