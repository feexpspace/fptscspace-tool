/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/actions/report.ts
'use client'

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, Timestamp, orderBy, getDoc } from "firebase/firestore";
import { Statistic, Video } from "@/types";
import { getAccessToken, getValidTikTokToken } from "./tiktok-token";

/**
 * Hàm gọi API TikTok lấy TOÀN BỘ video và lưu vào Firestore
 */

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

export async function syncTikTokVideos(userId: string, channelId: string) {
    try {
        const accessToken = await getAccessToken(channelId);
        if (!accessToken) throw new Error("Không lấy được Access Token");

        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            throw new Error("Không tìm thấy User trong Database");
        }

        const userData = userDoc.data();

        const channelDocRef = doc(db, "channels", channelId);
        const channelDoc = await getDoc(channelDocRef);
        if (!channelDoc.exists()) {
            throw new Error("Không tìm thấy Channel trong Database");
        }

        const channelData = channelDoc.data();

        // Lấy dữ liệu định danh từ DB
        const ownerName = userData.name || "Unknown User";
        const currentDisplayName = userData.channelName || userData.name || "Unknown Channel";
        const currentFollowers = Number(userData.followers) || 0;

        let cursor: number | null = 0;
        let hasMore = true;
        let totalSynced = 0;

        let aggTotalViews = 0;
        let aggTotalInteractions = 0;

        // TikTok API endpoint
        const url = "https://open.tiktokapis.com/v2/video/list/";
        // Các trường cần lấy: ID, Ngày tạo, Ảnh bìa, Tiêu đề, Link, Thống kê
        const fields = "id,create_time,cover_image_url,video_description,title,duration,share_url,like_count,comment_count,share_count,view_count";

        while (hasMore) {
            const response: Response = await fetch(`${url}?fields=${fields}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    max_count: 20, // TikTok cho tối đa 20 video mỗi lần gọi
                    cursor: cursor
                })
            });

            const res: TikTokApiResponse = await response.json();

            if (res.error && res.error.code !== "ok") {
                console.error("TikTok API Error:", res.error);
                break;
            }

            const videos = res.data.videos || [];

            // Lưu danh sách video vào Firestore
            // Sử dụng Promise.all để lưu song song cho nhanh
            await Promise.all(videos.map(async (v: any) => {
                // TikTok trả về create_time là Unix Timestamp (giây) -> Convert sang Date
                const createTime = new Date(v.create_time * 1000);

                const viewCount = Number(v.view_count) || 0;
                const likeCount = Number(v.like_count) || 0;
                const commentCount = Number(v.comment_count) || 0;
                const shareCount = Number(v.share_count) || 0;

                aggTotalViews += viewCount;
                aggTotalInteractions += (likeCount + commentCount + shareCount);

                const videoData: Omit<Video, 'id'> = {
                    videoId: v.id,
                    createTime: createTime,
                    coverImage: v.cover_image_url,
                    title: v.title || "No Title",
                    description: v.video_description || "",
                    link: v.share_url,
                    duration: v.duration || 0, // API list cơ bản không trả duration
                    channelId: channelId,
                    channelUsername: "", // Có thể update sau nếu cần
                    channelDisplayName: "",
                    stats: {
                        like: v.like_count || 0,
                        comment: v.comment_count || 0,
                        share: v.share_count || 0,
                        view: v.view_count || 0
                    }
                };

                // Lưu vào collection 'videos', dùng videoId làm Document ID để tránh trùng lặp
                await setDoc(doc(db, "videos", v.id), {
                    ...videoData,
                    // Lưu timestamp firestore để dễ query
                    createTime: Timestamp.fromDate(createTime)
                }, { merge: true });
            }));

            totalSynced += videos.length;

            // Kiểm tra phân trang
            hasMore = res.data.has_more;
            cursor = res.data.cursor;

            // An toàn: Nếu cursor trả về không hợp lệ thì dừng
            if (!hasMore || typeof cursor !== 'number') {
                break;
            }
        }
        const today = new Date();
        const dateId = today.toISOString().split('T')[0];
        const statId = `${channelId}_${dateId}`;

        const statisticData: Statistic = {
            id: statId,
            channelId: channelId,
            userId: userId, // Link với User ID
            channelUsername: channelData.username || "",
            channelOwnerName: ownerName,
            date: today,
            followerCount: channelData.follower || 0, // Lấy từ DB Channel
            videoCount: totalSynced,         // Tổng video quét được từ API
            totalViews: aggTotalViews,       // Tổng view tính toán
            totalInteractions: aggTotalInteractions // Tổng tương tác tính toán
        };

        // Lưu vào collection channel_statistics
        await setDoc(doc(db, "statistics", statId), {
            ...statisticData,
            date: Timestamp.fromDate(today)
        }, { merge: true });

        // --- BƯỚC 4: Cập nhật ngược lại User Profile ---
        // Chỉ cập nhật các chỉ số tính toán được (View, Video Count, Last Synced)
        // Không cập nhật Followers vì không gọi API lấy mới, tránh ghi đè dữ liệu cũ
        await setDoc(userDocRef, {
            views: aggTotalViews,
            videosCount: totalSynced,
            lastSyncedAt: Timestamp.fromDate(new Date())
        }, { merge: true });

        return { success: true, count: totalSynced };

    } catch (error) {
        console.error("Sync Error:", error);
        return { success: false, error: "Lỗi đồng bộ video" };
    }
}

/**
 * Hàm lấy video từ Firestore theo Năm và Tháng
 */
export async function getVideosFromDB(channelId: string, year: number, month: number) { // month: 1-12
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const videosRef = collection(db, "videos");
        const q = query(
            videosRef,
            where("channelId", "==", channelId),
            where("createTime", ">=", Timestamp.fromDate(startDate)),
            where("createTime", "<=", Timestamp.fromDate(endDate)),
            orderBy("createTime", "desc")
        );

        const snapshot = await getDocs(q);

        const videos = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Timestamp về Date object để Client Component dùng được
                createTime: data.createTime.toDate()
            } as Video;
        });

        return videos;
    } catch (error) {
        console.error("Get Videos Error:", error);
        return [];
    }
}