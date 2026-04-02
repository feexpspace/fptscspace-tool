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

        // Get user info from DB
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('name')
            .eq('id', userId)
            .single();

        if (!userData) throw new Error("Không tìm thấy User trong Database");

        const ownerName = userData.name || "Unknown User";
        const currentFollowers = tiktokUser?.follower_count ?? 0;
        const currentUsername = tiktokUser?.username ?? "";
        const currentDisplayName = tiktokUser?.display_name ?? "";

        // Fetch all videos from TikTok
        let cursor: number | null = 0;
        let hasMore = true;
        let totalSynced = 0;
        let aggTotalViews = 0, aggTotalLikes = 0, aggTotalComments = 0, aggTotalShares = 0;

        const monthlyBuckets = new Map<string, {
            newVideoCount: number;
            newViews: number;
            newLikes: number;
            newComments: number;
            newShares: number;
        }>();

        let earliestDate: Date | null = null;

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

                if (!earliestDate || createTime < earliestDate) earliestDate = createTime;

                const viewCount = Number(v.view_count) || 0;
                const likeCount = Number(v.like_count) || 0;
                const commentCount = Number(v.comment_count) || 0;
                const shareCount = Number(v.share_count) || 0;

                aggTotalViews += viewCount;
                aggTotalLikes += likeCount;
                aggTotalComments += commentCount;
                aggTotalShares += shareCount;

                const monthKey = createTime.toISOString().slice(0, 7);
                if (!monthlyBuckets.has(monthKey)) {
                    monthlyBuckets.set(monthKey, { newVideoCount: 0, newViews: 0, newLikes: 0, newComments: 0, newShares: 0 });
                }
                const bucket = monthlyBuckets.get(monthKey)!;
                bucket.newVideoCount += 1;
                bucket.newViews += viewCount;
                bucket.newLikes += likeCount;
                bucket.newComments += commentCount;
                bucket.newShares += shareCount;

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
                    view_count: viewCount,
                    like_count: likeCount,
                    comment_count: commentCount,
                    share_count: shareCount,
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

        // Upsert statistics
        await supabaseAdmin
            .from('statistics')
            .upsert({
                channel_id: channelId,
                user_id: userId,
                channel_username: currentUsername,
                channel_owner_name: ownerName,
                follower_count: currentFollowers,
                video_count: totalSynced,
                total_views: aggTotalViews,
                total_likes: aggTotalLikes,
                total_comments: aggTotalComments,
                total_shares: aggTotalShares,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'channel_id' });

        // Upsert monthly statistics
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const firstDate: Date | null = earliestDate as Date | null;
        if (firstDate !== null) {
            const currentDateIterator = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
            const now = new Date();
            const monthlyRows = [];

            while (currentDateIterator <= now) {
                const monthKey = `${currentDateIterator.getFullYear()}-${String(currentDateIterator.getMonth() + 1).padStart(2, '0')}`;
                const bucket = monthlyBuckets.get(monthKey);

                monthlyRows.push({
                    channel_id: channelId,
                    user_id: userId,
                    month: monthKey,
                    video_count: bucket?.newVideoCount ?? 0,
                    total_views: bucket?.newViews ?? 0,
                    total_likes: bucket?.newLikes ?? 0,
                    total_comments: bucket?.newComments ?? 0,
                    total_shares: bucket?.newShares ?? 0,
                    ...(bucket ? {} : { follower_count: currentFollowers, channel_username: currentUsername }),
                });

                currentDateIterator.setMonth(currentDateIterator.getMonth() + 1);
            }

            if (monthlyRows.length > 0) {
                await supabaseAdmin
                    .from('monthly_statistics')
                    .upsert(monthlyRows, { onConflict: 'channel_id,month' });
            }
        }

        return { success: true, count: totalSynced };
    } catch (error) {
        console.error("Sync Error:", error);
        return { success: false, error: "Lỗi đồng bộ video" };
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
