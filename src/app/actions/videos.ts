// src/app/actions/videos.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { Video } from "@/types";
import { getChannelIdsForUsers, getUserIdsForScope } from "./helpers";
import { chunkArray } from "@/lib/utils";

interface VideoFilters {
    teamId?: string;
    channelId?: string;
    month?: string; // 'YYYY-MM'
    page?: number;
    pageSize?: number;
}

export interface VideoListResult {
    videos: Video[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Lấy danh sách video - cho cả admin và member
 */
export async function getVideoList(
    userId: string,
    role: string,
    filters: VideoFilters
): Promise<VideoListResult> {
    try {
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 50;

        // Xác định danh sách channelIds
        let channelIds: string[] = [];

        if (filters.channelId) {
            channelIds = [filters.channelId];
        } else if (role === 'member') {
            channelIds = await getChannelIdsForUsers([userId]);
        } else {
            // Admin
            const userIds = await getUserIdsForScope(role, userId, filters.teamId);
            channelIds = await getChannelIdsForUsers(userIds);
        }

        if (channelIds.length === 0) {
            return { videos: [], total: 0, page, pageSize };
        }

        // Build date range từ month filter
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (filters.month) {
            const [year, month] = filters.month.split('-').map(Number);
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59);
        }

        // Query videos theo chunks
        const chunks = chunkArray(channelIds, 10);
        const allVideos: Video[] = [];

        for (const chunk of chunks) {
            let query: FirebaseFirestore.Query = adminDb.collection("videos")
                .where("channelId", "in", chunk);

            if (startDate && endDate) {
                query = query
                    .where("createTime", ">=", Timestamp.fromDate(startDate))
                    .where("createTime", "<=", Timestamp.fromDate(endDate));
            }

            query = query.orderBy("createTime", "desc");

            const snapshot = await query.get();
            const videos = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createTime: (data.createTime as Timestamp).toDate(),
                } as Video;
            });
            allVideos.push(...videos);
        }

        // Sort tất cả theo createTime desc (vì merge từ nhiều chunks)
        allVideos.sort((a, b) => b.createTime.getTime() - a.createTime.getTime());

        // Pagination
        const total = allVideos.length;
        const start = (page - 1) * pageSize;
        const paginatedVideos = allVideos.slice(start, start + pageSize);

        return {
            videos: paginatedVideos,
            total,
            page,
            pageSize,
        };

    } catch (error) {
        console.error("Error fetching videos:", error);
        return { videos: [], total: 0, page: 1, pageSize: 50 };
    }
}
