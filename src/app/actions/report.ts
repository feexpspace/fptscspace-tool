/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/actions/report.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // Dùng Admin SDK
import { Timestamp } from "firebase-admin/firestore"; // Timestamp của Admin SDK
import { MonthlyStatistic, Statistic, Video } from "@/types";
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

function getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() trả về 0-11
    return `${year}-${month.toString().padStart(2, '0')}`;
}

export async function syncTikTokVideos(userId: string, channelId: string) {
    try {
        const accessToken = await getAccessToken(channelId);
        if (!accessToken) throw new Error("Không lấy được Access Token");

        // 1. Lấy thông tin User
        const userDocRef = adminDb.collection("users").doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) throw new Error("Không tìm thấy User trong Database");
        const userData = userDoc.data();

        // 2. Lấy thông tin Channel
        const channelDoc = await adminDb.collection("channels").doc(channelId).get();
        if (!channelDoc.exists) throw new Error("Không tìm thấy Channel trong Database");
        const channelData = channelDoc.data();

        const ownerName = userData?.name || "Unknown User";
        const currentFollowers = channelData?.follower || 0;

        let cursor: number | null = 0;
        let hasMore = true;
        let totalSynced = 0;
        let aggTotalViews = 0;
        let aggTotalInteractions = 0;

        const monthlyBuckets = new Map<string, {
            newVideoCount: number;
            newViews: number;
            newInteractions: number;
        }>();

        let earliestDate: Date | null = null;

        const url = "https://open.tiktokapis.com/v2/video/list/";
        const fields = "id,create_time,cover_image_url,video_description,title,duration,share_url,like_count,comment_count,share_count,view_count";

        while (hasMore) {
            const response: Response = await fetch(`${url}?fields=${fields}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    max_count: 20,
                    cursor: cursor
                })
            });

            const res: TikTokApiResponse = await response.json();

            if (res.error && res.error.code !== "ok") {
                console.error("TikTok API Error:", res.error);
                break;
            }

            const videos = res.data.videos || [];

            // --- TỐI ƯU HÓA: KHÔNG CẦN Promise.all Ở ĐÂY ---
            const batch = adminDb.batch();

            for (const v of videos) {
                const createTime = new Date(v.create_time * 1000);

                if (!earliestDate || createTime < earliestDate) {
                    earliestDate = createTime;
                }

                const viewCount = Number(v.view_count) || 0;
                const likeCount = Number(v.like_count) || 0;
                const commentCount = Number(v.comment_count) || 0;
                const shareCount = Number(v.share_count) || 0;
                const interactions = likeCount + commentCount + shareCount;

                // Cộng dồn chỉ số tổng
                aggTotalViews += viewCount;
                aggTotalInteractions += interactions;

                const monthKey = createTime.toISOString().slice(0, 7); // "YYYY-MM"

                if (!monthlyBuckets.has(monthKey)) {
                    monthlyBuckets.set(monthKey, { newVideoCount: 0, newViews: 0, newInteractions: 0 });
                }
                const bucket = monthlyBuckets.get(monthKey)!;
                bucket.newVideoCount += 1;
                bucket.newViews += viewCount;
                bucket.newInteractions += interactions;

                const videoData: Omit<Video, 'id'> = {
                    videoId: v.id,
                    createTime: createTime,
                    coverImage: v.cover_image_url,
                    title: v.title || "No Title",
                    description: v.video_description || "",
                    link: v.share_url,
                    duration: v.duration || 0,
                    channelId: channelId,
                    channelUsername: "",
                    channelDisplayName: "",
                    stats: {
                        like: likeCount,
                        comment: commentCount,
                        share: shareCount,
                        view: viewCount
                    }
                };

                const videoRef = adminDb.collection("videos").doc(v.id);

                // batch.set là thao tác đồng bộ (queueing), không cần await
                batch.set(videoRef, {
                    ...videoData,
                    createTime: Timestamp.fromDate(createTime)
                }, { merge: true });
            }

            // Ghi batch xuống DB
            await batch.commit();

            totalSynced += videos.length;
            hasMore = res.data.has_more;
            cursor = res.data.cursor;

            if (!hasMore || typeof cursor !== 'number') {
                break;
            }
        }

        // --- GHI THỐNG KÊ (Statistic) ---
        const today = new Date();
        const statId = `${channelId}_${today.toISOString().split('T')[0]}`;

        const statisticData: Statistic = {
            id: statId,
            channelId: channelId,
            userId: userId,
            channelUsername: channelData?.username || "",
            channelOwnerName: ownerName,
            updatedAt: today,
            followerCount: channelData?.follower || 0,
            videoCount: totalSynced,
            totalViews: aggTotalViews,
            totalInteractions: aggTotalInteractions
        };

        await adminDb.collection("statistics").doc(statId).set({
            ...statisticData,
            updatedAt: Timestamp.fromDate(today)
        }, { merge: true });

        if (earliestDate) {
            const monthlyBatch = adminDb.batch();

            // Bắt đầu từ tháng của video cũ nhất
            const currentDateIterator = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
            const now = new Date();

            while (currentDateIterator <= now) {
                const monthKey = getMonthKey(currentDateIterator);

                // Lấy dữ liệu bucket của tháng đó
                const bucket = monthlyBuckets.get(monthKey);

                // --- THAY ĐỔI: KHÔNG CỘNG DỒN NỮA ---
                // Chỉ lấy số liệu của bucket tháng này, nếu không có video thì là 0
                const monthVideoCount = bucket ? bucket.newVideoCount : 0;
                const monthViews = bucket ? bucket.newViews : 0;
                const monthInteractions = bucket ? bucket.newInteractions : 0;

                const monthlyId = `${channelId}_${monthKey}`;
                const monthlyRef = adminDb.collection("monthly_statistics").doc(monthlyId);

                // Logic bảo toàn Follower cũ vẫn giữ nguyên (vì Follower không phải là tổng của video)
                const monthlySnap = await monthlyRef.get();

                const baseMonthlyData = {
                    id: monthlyId,
                    channelId,
                    userId,
                    month: monthKey,
                    videoCount: monthVideoCount,       // Số video TẠO TRONG tháng này
                    totalViews: monthViews,            // Tổng view của các video TẠO TRONG tháng này
                    totalInteractions: monthInteractions // Tổng tương tác của các video TẠO TRONG tháng này
                };

                if (monthlySnap.exists) {
                    monthlyBatch.set(monthlyRef, baseMonthlyData, { merge: true });
                } else {
                    monthlyBatch.set(monthlyRef, {
                        ...baseMonthlyData,
                        followerCount: currentFollowers // Khởi tạo nếu chưa có
                    }, { merge: true });
                }

                currentDateIterator.setMonth(currentDateIterator.getMonth() + 1);
            }

            await monthlyBatch.commit();
        }

        return { success: true, count: totalSynced };

    } catch (error) {
        console.error("Sync Error:", error);
        return { success: false, error: "Lỗi đồng bộ video" };
    }
}

/**
 * Hàm lấy video từ Firestore (Cũng phải dùng Admin SDK vì file này là 'use server')
 */
export async function getVideosFromDB(channelId: string, year: number, month: number) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Admin SDK Query
        const snapshot = await adminDb.collection("videos")
            .where("channelId", "==", channelId)
            .where("createTime", ">=", Timestamp.fromDate(startDate))
            .where("createTime", "<=", Timestamp.fromDate(endDate))
            .orderBy("createTime", "desc")
            .get();

        const videos = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Timestamp về Date object
                createTime: (data.createTime as Timestamp).toDate()
            } as Video;
        });

        return videos;
    } catch (error) {
        console.error("Get Videos Error:", error);
        return [];
    }
}