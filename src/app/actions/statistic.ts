'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Statistic, MonthlyStatistic } from "@/types";

export async function getDailyStatistics(
    channelId: string,
    startDate: Date,
    endDate: Date
): Promise<Statistic[]> {
    try {
        const { data } = await supabaseAdmin
            .from('statistics')
            .select('*')
            .eq('channel_id', channelId)
            .gte('updated_at', startDate.toISOString())
            .lte('updated_at', endDate.toISOString())
            .order('updated_at', { ascending: true });

        return (data || []).map(row => ({
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            channelUsername: row.channel_username,
            channelOwnerName: row.channel_owner_name,
            updatedAt: new Date(row.updated_at),
            followerCount: row.follower_count,
            videoCount: row.video_count,
            totalViews: row.total_views,
            totalLikes: row.total_likes,
            totalComments: row.total_comments,
            totalShares: row.total_shares,
        }));
    } catch (error) {
        console.error("Error getting daily statistics:", error);
        return [];
    }
}

export async function getMonthlyStatistics(
    channelId: string,
    year: number
): Promise<MonthlyStatistic[]> {
    try {
        const { data } = await supabaseAdmin
            .from('monthly_statistics')
            .select('*')
            .eq('channel_id', channelId)
            .gte('month', `${year}-01`)
            .lte('month', `${year}-12`)
            .order('month', { ascending: true });

        return (data || []).map(row => ({
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            month: row.month,
            followerCount: row.follower_count,
            videoCount: row.video_count,
            totalViews: row.total_views,
            totalLikes: row.total_likes,
            totalComments: row.total_comments,
            totalShares: row.total_shares,
        }));
    } catch (error) {
        console.error("Error getting monthly statistics:", error);
        return [];
    }
}

export async function getLatestStatsForTeam(userIds: string[]): Promise<Statistic[]> {
    if (userIds.length === 0) return [];

    try {
        const { data } = await supabaseAdmin
            .from('statistics')
            .select('*')
            .in('user_id', userIds);

        return (data || []).map(row => ({
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            channelUsername: row.channel_username,
            channelOwnerName: row.channel_owner_name,
            updatedAt: new Date(row.updated_at),
            followerCount: row.follower_count,
            videoCount: row.video_count,
            totalViews: row.total_views,
            totalLikes: row.total_likes,
            totalComments: row.total_comments,
            totalShares: row.total_shares,
        }));
    } catch (error) {
        console.error("Error getting latest stats for team:", error);
        return [];
    }
}
