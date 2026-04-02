// src/app/actions/stats.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { getChannelIdsForUsers, getUserIdsForScope } from "./helpers";

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

export async function getStats(
    userId: string,
    role: string,
    filters: StatsFilters
): Promise<StatsResult> {
    try {
        let channelIds: string[];

        if (filters.channelId) {
            channelIds = [filters.channelId];
        } else if (role === 'member') {
            channelIds = await getChannelIdsForUsers([userId]);
        } else {
            const userIds = await getUserIdsForScope(role, userId, filters.teamId);
            channelIds = await getChannelIdsForUsers(userIds);
        }

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

    if (month) {
        return getMonthlyStatsForChannels(channelIds, month);
    }

    const { data: stats } = await supabaseAdmin
        .from('statistics')
        .select('*')
        .in('channel_id', channelIds);

    let totalViews = 0, totalComments = 0, totalShares = 0, totalFollowers = 0, totalVideos = 0;
    const channelBreakdown: ChannelBreakdown[] = [];

    for (const s of stats || []) {
        totalViews += s.total_views || 0;
        totalComments += s.total_comments || 0;
        totalShares += s.total_shares || 0;
        totalFollowers += s.follower_count || 0;
        totalVideos += s.video_count || 0;

        channelBreakdown.push({
            channelId: s.channel_id,
            channelName: s.channel_owner_name || '',
            channelUsername: s.channel_username || '',
            followerCount: s.follower_count || 0,
            videoCount: s.video_count || 0,
            totalViews: s.total_views || 0,
            totalComments: s.total_comments || 0,
            totalShares: s.total_shares || 0,
        });
    }

    return {
        totalViews, totalComments, totalShares, totalFollowers, totalVideos,
        activeChannels: (stats || []).length,
        channelBreakdown,
    };
}

async function getMonthlyStatsForChannels(channelIds: string[], month: string): Promise<StatsResult> {
    const [{ data: monthlyStats }, { data: latestStats }] = await Promise.all([
        supabaseAdmin
            .from('monthly_statistics')
            .select('*')
            .in('channel_id', channelIds)
            .eq('month', month),
        supabaseAdmin
            .from('statistics')
            .select('channel_id, follower_count, channel_owner_name, channel_username')
            .in('channel_id', channelIds),
    ]);

    const latestStatsMap = new Map<string, { followerCount: number; channelOwnerName: string; channelUsername: string }>();
    (latestStats || []).forEach(s => {
        latestStatsMap.set(s.channel_id, {
            followerCount: s.follower_count || 0,
            channelOwnerName: s.channel_owner_name || '',
            channelUsername: s.channel_username || '',
        });
    });

    let totalViews = 0, totalComments = 0, totalShares = 0, totalFollowers = 0, totalVideos = 0;
    const channelBreakdown: ChannelBreakdown[] = [];
    const activeChannelIds = new Set<string>();

    for (const ms of monthlyStats || []) {
        totalViews += ms.total_views || 0;
        totalComments += ms.total_comments || 0;
        totalShares += ms.total_shares || 0;
        totalVideos += ms.video_count || 0;

        if (ms.video_count > 0) activeChannelIds.add(ms.channel_id);

        const latest = latestStatsMap.get(ms.channel_id);
        channelBreakdown.push({
            channelId: ms.channel_id,
            channelName: latest?.channelOwnerName || '',
            channelUsername: latest?.channelUsername || '',
            followerCount: latest?.followerCount || ms.follower_count || 0,
            videoCount: ms.video_count || 0,
            totalViews: ms.total_views || 0,
            totalComments: ms.total_comments || 0,
            totalShares: ms.total_shares || 0,
        });
    }

    latestStatsMap.forEach(s => { totalFollowers += s.followerCount; });

    return {
        totalViews, totalComments, totalShares, totalFollowers, totalVideos,
        activeChannels: activeChannelIds.size,
        channelBreakdown,
    };
}
