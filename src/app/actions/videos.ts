// src/app/actions/videos.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Video } from "@/types";
import { getChannelIdsForUsers, getUserIdsForScope } from "./helpers";

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

export async function getVideoList(
    userId: string,
    role: string,
    filters: VideoFilters
): Promise<VideoListResult> {
    try {
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 50;

        let channelIds: string[] = [];

        if (filters.channelId) {
            channelIds = [filters.channelId];
        } else if (role === 'member') {
            channelIds = await getChannelIdsForUsers([userId]);
        } else {
            const userIds = await getUserIdsForScope(role, userId, filters.teamId);
            channelIds = await getChannelIdsForUsers(userIds);
        }

        if (channelIds.length === 0) {
            return { videos: [], total: 0, page, pageSize };
        }

        let query = supabaseAdmin
            .from('videos')
            .select('*', { count: 'exact' })
            .in('channel_id', channelIds)
            .order('create_time', { ascending: false });

        if (filters.month) {
            const [year, month] = filters.month.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
            query = query.gte('create_time', startDate).lte('create_time', endDate);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count } = await query.range(from, to);

        const videos: Video[] = (data || []).map(row => ({
            id: row.id,
            videoId: row.video_id,
            createTime: new Date(row.create_time),
            coverImage: row.cover_image,
            title: row.title,
            description: row.description,
            link: row.link,
            duration: row.duration,
            channelId: row.channel_id,
            channelUsername: row.channel_username,
            channelDisplayName: row.channel_display_name,
            stats: {
                view: row.view_count,
                like: row.like_count,
                comment: row.comment_count,
                share: row.share_count,
            },
            editorId: row.editor_id,
            editorName: row.editor_name,
        }));

        return { videos, total: count || 0, page, pageSize };
    } catch (error) {
        console.error("Error fetching videos:", error);
        return { videos: [], total: 0, page: 1, pageSize: 50 };
    }
}
