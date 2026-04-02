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

export interface ChannelStat {
    channelId: string;
    channelOwnerName: string;
    channelUsername: string;
    followerCount: number;
}

export async function getAllChannelStats(userId: string, role: string): Promise<ChannelStat[]> {
    try {
        let channelIds: string[];
        if (role === 'member') {
            channelIds = await getChannelIdsForUsers([userId]);
        } else {
            const userIds = await getUserIdsForScope(role, userId);
            channelIds = await getChannelIdsForUsers(userIds);
        }
        if (channelIds.length === 0) return [];

        const { data: channelsData } = await supabaseAdmin
            .from('channels')
            .select('id, display_name, username, follower, user_id')
            .in('id', channelIds);

        const userIds2 = [...new Set((channelsData || []).map(c => c.user_id).filter(Boolean))];
        const { data: usersData } = await supabaseAdmin
            .from('users').select('id, name').in('id', userIds2);

        const userNameMap = Object.fromEntries((usersData || []).map(u => [u.id, u.name]));

        return (channelsData || []).map(c => ({
            channelId: c.id,
            channelOwnerName: userNameMap[c.user_id] || c.display_name || '',
            channelUsername: c.username || '',
            followerCount: c.follower || 0,
        }));
    } catch {
        return [];
    }
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
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1).toISOString();
    const endDate = new Date(year, mon, 0, 23, 59, 59).toISOString();

    const [{ data: videos }, { data: latestStats }] = await Promise.all([
        supabaseAdmin
            .from('videos')
            .select('channel_id, channel_display_name, channel_username, view_count, like_count, comment_count, share_count')
            .in('channel_id', channelIds)
            .gte('create_time', startDate)
            .lte('create_time', endDate),
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

    // Aggregate videos by channel
    const byChannel = new Map<string, { views: number; comments: number; shares: number; videos: number; displayName: string; username: string }>();
    for (const v of videos || []) {
        const existing = byChannel.get(v.channel_id);
        if (existing) {
            existing.views += v.view_count || 0;
            existing.comments += v.comment_count || 0;
            existing.shares += v.share_count || 0;
            existing.videos += 1;
        } else {
            byChannel.set(v.channel_id, {
                views: v.view_count || 0,
                comments: v.comment_count || 0,
                shares: v.share_count || 0,
                videos: 1,
                displayName: v.channel_display_name || '',
                username: v.channel_username || '',
            });
        }
    }

    let totalViews = 0, totalComments = 0, totalShares = 0, totalFollowers = 0, totalVideos = 0;
    const channelBreakdown: ChannelBreakdown[] = [];

    latestStatsMap.forEach(s => { totalFollowers += s.followerCount; });

    byChannel.forEach((agg, channelId) => {
        totalViews += agg.views;
        totalComments += agg.comments;
        totalShares += agg.shares;
        totalVideos += agg.videos;

        const latest = latestStatsMap.get(channelId);
        channelBreakdown.push({
            channelId,
            channelName: latest?.channelOwnerName || agg.displayName,
            channelUsername: latest?.channelUsername || agg.username,
            followerCount: latest?.followerCount || 0,
            videoCount: agg.videos,
            totalViews: agg.views,
            totalComments: agg.comments,
            totalShares: agg.shares,
        });
    });

    return {
        totalViews, totalComments, totalShares, totalFollowers, totalVideos,
        activeChannels: byChannel.size,
        channelBreakdown,
    };
}
