/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/actions/report.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Video } from "@/types";
import { getAccessToken } from "./tiktok-token";

interface TikTokApiResponse {
    data: {
        videos: any[];
        has_more: boolean;
        cursor: number | null;
    };
    error: {
        code: string;
        message: string;
    };
}

interface TikTokUserInfoResponse {
    data: {
        user: {
            avatar_url_100: string;
            display_name: string;
            username: string;
            follower_count: number;
            following_count: number;
            likes_count: number;
            video_count: number;
            is_verified: boolean;
        }
    };
    error: {
        code: string;
        message: string;
    };
}

const targetHashtags = ["#fptstudentcreativespace", "#fpteducreativespace"];

export async function syncTikTokVideos(userId: string, channelId: string) {
    try {
        const accessToken = await getAccessToken(channelId);
        if (!accessToken) throw new Error("Không lấy được Access Token");

        // Fetch user info from TikTok
        const userFields = "avatar_url_100,display_name,username,follower_count,following_count,likes_count,video_count,is_verified";
        const userInfoResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${userFields}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const userInfoData: TikTokUserInfoResponse = await userInfoResponse.json();
        const tiktokUser = userInfoData.data?.user;

        if (tiktokUser) {
            await supabaseAdmin
                .from('channels')
                .update({
                    avatar: tiktokUser.avatar_url_100,
                    display_name: tiktokUser.display_name,
                    username: tiktokUser.username,
                    follower: tiktokUser.follower_count,
                    following: tiktokUser.following_count,
                    likes: tiktokUser.likes_count,
                    video_count: tiktokUser.video_count,
                    is_verified: tiktokUser.is_verified,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', channelId);
        }

        const currentUsername = tiktokUser?.username ?? "";
        const currentDisplayName = tiktokUser?.display_name ?? "";

        // Fetch all videos from TikTok
        let cursor: number | null = 0;
        let hasMore = true;
        let totalSynced = 0;

        const url = "https://open.tiktokapis.com/v2/video/list/";
        const fields = "id,create_time,cover_image_url,video_description,title,duration,share_url,like_count,comment_count,share_count,view_count";

        while (hasMore) {
            const response = await fetch(`${url}?fields=${fields}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ max_count: 20, cursor })
            });

            const res: TikTokApiResponse = await response.json();

            if (res.error && res.error.code !== "ok") {
                console.error("TikTok API Error:", res.error);
                break;
            }

            const rawVideos = res.data.videos || [];
            const filteredVideos = rawVideos.filter((v: any) => {
                const textContent = (v.title || v.video_description || "").toLowerCase();
                return targetHashtags.some(hashtag => textContent.includes(hashtag));
            });

            // Upsert videos
            const videoRows = filteredVideos.map((v: any) => {
                const createTime = new Date(v.create_time * 1000);
                return {
                    id: v.id,
                    video_id: v.id,
                    create_time: createTime.toISOString(),
                    cover_image: v.cover_image_url,
                    title: v.title || "No Title",
                    description: v.video_description || "",
                    link: v.share_url,
                    duration: v.duration || 0,
                    channel_id: channelId,
                    channel_username: currentUsername,
                    channel_display_name: currentDisplayName,
                    view_count: Number(v.view_count) || 0,
                    like_count: Number(v.like_count) || 0,
                    comment_count: Number(v.comment_count) || 0,
                    share_count: Number(v.share_count) || 0,
                };
            });

            if (videoRows.length > 0) {
                await supabaseAdmin
                    .from('videos')
                    .upsert(videoRows, { onConflict: 'id' });
            }

            totalSynced += filteredVideos.length;
            hasMore = res.data.has_more;
            cursor = res.data.cursor;
            if (!hasMore || typeof cursor !== 'number') break;
        }

        return { success: true, count: totalSynced };
    } catch (error) {
        console.error("Sync Error:", error);
        return { success: false, error: "Lỗi đồng bộ video" };
    }
}

export async function getMyChannels(userId: string): Promise<{ id: string; displayName: string; username: string }[]> {
    const { data } = await supabaseAdmin
        .from('channels')
        .select('id, display_name, username')
        .eq('user_id', userId);
    return (data || []).map(c => ({ id: c.id, displayName: c.display_name, username: c.username }));
}

export async function syncAllChannels(): Promise<{ success: boolean; message: string }> {
    try {
        const { data: channels } = await supabaseAdmin
            .from('channels')
            .select('id, user_id');

        if (!channels || channels.length === 0) {
            return { success: false, message: "Chưa có kênh nào trong hệ thống." };
        }

        const results = await Promise.all(
            channels
                .filter(c => c.user_id)
                .map(c => syncTikTokVideos(c.user_id, c.id))
        );
        const synced = results.filter(r => r.success).length;
        return { success: true, message: `Đồng bộ ${synced}/${channels.length} kênh thành công.` };
    } catch (error) {
        console.error("syncAllChannels error:", error);
        return { success: false, message: "Lỗi khi đồng bộ toàn bộ." };
    }
}

export async function syncMyChannels(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data: channels } = await supabaseAdmin
            .from('channels')
            .select('id')
            .eq('user_id', userId);

        if (!channels || channels.length === 0) {
            return { success: false, message: "Chưa kết nối kênh TikTok nào." };
        }

        const results = await Promise.all(
            channels.map(c => syncTikTokVideos(userId, c.id))
        );
        const synced = results.filter(r => r.success).length;
        return { success: true, message: `Đồng bộ thành công ${synced}/${channels.length} kênh.` };
    } catch (error) {
        console.error("syncMyChannels error:", error);
        return { success: false, message: "Lỗi khi đồng bộ." };
    }
}

export async function getVideosFromDB(channelId: string, year: number, month: number) {
    try {
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const { data } = await supabaseAdmin
            .from('videos')
            .select('*')
            .eq('channel_id', channelId)
            .gte('create_time', startDate)
            .lte('create_time', endDate)
            .order('create_time', { ascending: false });

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

        return videos;
    } catch (error) {
        console.error("Get Videos Error:", error);
        return [];
    }
}

export async function getMonthlyStatistics(channelId: string, year: number, month: number) {
    try {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const { data } = await supabaseAdmin
            .from('monthly_statistics')
            .select('*')
            .eq('channel_id', channelId)
            .eq('month', monthKey)
            .single();

        return data || null;
    } catch (error) {
        console.error("Lỗi lấy thống kê tháng:", error);
        return null;
    }
}
