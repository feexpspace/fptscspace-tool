// src/app/actions/stats.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Statistic, MonthlyStatistic } from "@/types";
import { getChannelIdsForUsers, getUserIdsForScope } from "./helpers";
import { chunkArray } from "@/lib/utils";

interface StatsFilters {
    teamId?: string;
    channelId?: string;
    month?: string; // 'YYYY-MM'
}

export interface ChannelBreakdown {
    channelId: string;
    channelName: string;
    channelUsername: string;
    followerCount: number;
    videoCount: number;
    totalViews: number;
    totalComments: number;
    totalShares: number;
}

export interface StatsResult {
    totalViews: number;
    totalComments: number;
    totalShares: number;
    totalFollowers: number;
    totalVideos: number;
    activeChannels: number;
    channelBreakdown: ChannelBreakdown[];
}

/**
 * Lấy thống kê tổng hợp - cho cả admin và member
 */
export async function getStats(
    userId: string,
    role: string,
    filters: StatsFilters
): Promise<StatsResult> {
    try {
        // Nếu filter theo 1 kênh cụ thể
        if (filters.channelId) {
            return getStatsForChannels([filters.channelId], filters.month);
        }

        // Nếu là member, chỉ xem kênh mình
        if (role === 'member') {
            const channelIds = await getChannelIdsForUsers([userId]);
            return getStatsForChannels(channelIds, filters.month);
        }

        // Admin hoặc filter theo team
        const userIds = await getUserIdsForScope(role, userId, filters.teamId);
        const channelIds = await getChannelIdsForUsers(userIds);
        return getStatsForChannels(channelIds, filters.month);

    } catch (error) {
        console.error("Error fetching stats:", error);
        return { totalViews: 0, totalComments: 0, totalShares: 0, totalFollowers: 0, totalVideos: 0, activeChannels: 0, channelBreakdown: [] };
    }
}

async function getStatsForChannels(channelIds: string[], month?: string): Promise<StatsResult> {
    if (channelIds.length === 0) {
        return { totalViews: 0, totalComments: 0, totalShares: 0, totalFollowers: 0, totalVideos: 0, activeChannels: 0, channelBreakdown: [] };
    }

    // Nếu có filter theo tháng, dùng monthly_statistics
    if (month) {
        return getMonthlyStatsForChannels(channelIds, month);
    }

    // Không filter tháng → dùng statistics (latest snapshot)
    const chunks = chunkArray(channelIds, 10);
    const promises = chunks.map(chunk =>
        adminDb.collection("statistics").where("channelId", "in", chunk).get()
    );
    const snapshots = await Promise.all(promises);

    const stats: Statistic[] = snapshots.flatMap(snap =>
        snap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(),
            } as unknown as Statistic;
        })
    );

    let totalViews = 0, totalComments = 0, totalShares = 0, totalFollowers = 0, totalVideos = 0;
    const channelBreakdown: ChannelBreakdown[] = [];

    for (const s of stats) {
        totalViews += s.totalViews || 0;
        totalComments += s.totalComments || 0;
        totalShares += s.totalShares || 0;
        totalFollowers += s.followerCount || 0;
        totalVideos += s.videoCount || 0;

        channelBreakdown.push({
            channelId: s.channelId,
            channelName: s.channelOwnerName || '',
            channelUsername: s.channelUsername || '',
            followerCount: s.followerCount || 0,
            videoCount: s.videoCount || 0,
            totalViews: s.totalViews || 0,
            totalComments: s.totalComments || 0,
            totalShares: s.totalShares || 0,
        });
    }

    return {
        totalViews,
        totalComments,
        totalShares,
        totalFollowers,
        totalVideos,
        activeChannels: stats.length,
        channelBreakdown,
    };
}

async function getMonthlyStatsForChannels(channelIds: string[], month: string): Promise<StatsResult> {
    const chunks = chunkArray(channelIds, 10);
    const promises = chunks.map(chunk =>
        adminDb.collection("monthly_statistics")
            .where("channelId", "in", chunk)
            .where("month", "==", month)
            .get()
    );
    const snapshots = await Promise.all(promises);

    const monthlyStats: MonthlyStatistic[] = snapshots.flatMap(snap =>
        snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MonthlyStatistic))
    );

    // Cần followerCount từ statistics collection (monthly không cập nhật follower đều)
    const statsPromises = chunks.map(chunk =>
        adminDb.collection("statistics").where("channelId", "in", chunk).get()
    );
    const statsSnapshots = await Promise.all(statsPromises);
    const latestStatsMap = new Map<string, { followerCount: number; channelOwnerName: string; channelUsername: string }>();
    statsSnapshots.forEach(snap => {
        snap.docs.forEach(doc => {
            const d = doc.data();
            latestStatsMap.set(d.channelId, {
                followerCount: d.followerCount || 0,
                channelOwnerName: d.channelOwnerName || '',
                channelUsername: d.channelUsername || '',
            });
        });
    });

    let totalViews = 0, totalComments = 0, totalShares = 0, totalFollowers = 0, totalVideos = 0;
    const channelBreakdown: ChannelBreakdown[] = [];
    const activeChannelIds = new Set<string>();

    for (const ms of monthlyStats) {
        totalViews += ms.totalViews || 0;
        totalComments += ms.totalComments || 0;
        totalShares += ms.totalShares || 0;
        totalVideos += ms.videoCount || 0;

        if (ms.videoCount > 0) {
            activeChannelIds.add(ms.channelId);
        }

        const latest = latestStatsMap.get(ms.channelId);
        channelBreakdown.push({
            channelId: ms.channelId,
            channelName: latest?.channelOwnerName || '',
            channelUsername: latest?.channelUsername || '',
            followerCount: latest?.followerCount || ms.followerCount || 0,
            videoCount: ms.videoCount || 0,
            totalViews: ms.totalViews || 0,
            totalComments: ms.totalComments || 0,
            totalShares: ms.totalShares || 0,
        });
    }

    // Tổng follower lấy từ latest stats
    latestStatsMap.forEach(s => {
        totalFollowers += s.followerCount;
    });

    return {
        totalViews,
        totalComments,
        totalShares,
        totalFollowers,
        totalVideos,
        activeChannels: activeChannelIds.size,
        channelBreakdown,
    };
}
