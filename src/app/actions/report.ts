/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/actions/report.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // Dùng Admin SDK
import { Timestamp } from "firebase-admin/firestore"; // Timestamp của Admin SDK
import { Statistic, Video } from "@/types";
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
            avatar_url_100: string; // Ảnh đại diện
            display_name: string;   // Tên hiển thị
            username: string;       // TikTok ID (handle)
            follower_count: number;
            following_count: number;
            likes_count: number;    // Tổng số lượt thích
            video_count: number;    // Tổng số video
            is_verified: boolean;   // Trạng thái tích xanh
        }
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

        const userFields = "avatar_url_100,display_name,username,follower_count,following_count,likes_count,video_count,is_verified";
        const userInfoUrl = `https://open.tiktokapis.com/v2/user/info/?fields=${userFields}`;

        const userInfoResponse = await fetch(userInfoUrl, {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        const userInfoData: TikTokUserInfoResponse = await userInfoResponse.json();

        if (userInfoData.error && userInfoData.error.code !== "ok") {
            console.error("TikTok User Info API Error:", userInfoData.error);
        }
        const user = userInfoData.data?.user;

        if (user) {
            await adminDb.collection("channels").doc(channelId).update({
                avatar: user.avatar_url_100,
                displayName: user.display_name,
                username: user.username,
                follower: user.follower_count,
                following: user.following_count,
                like: user.likes_count,
                videoCount: user.video_count,
                isVerified: user.is_verified,
                updatedAt: Timestamp.now()
            });
        }

        const userDocRef = adminDb.collection("users").doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) throw new Error("Không tìm thấy User trong Database");
        const userData = userDoc.data();

        // Lấy thông tin kênh (để fallback nếu API lỗi)
        const channelDoc = await adminDb.collection("channels").doc(channelId).get();
        const channelData = channelDoc.data();

        const ownerName = userData?.name || "Unknown User";

        // Ưu tiên dùng số liệu mới từ API
        const currentFollowers = user?.follower_count ?? (channelData?.follower || 0);
        const currentUsername = user?.username ?? (channelData?.username || "");
        const currentDisplayName = user?.display_name ?? (channelData?.displayName || "");

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

        //Hashtag mục tiêu để lọc video
        const targetHashtags = ["#fptstudentcreativespace", "#fpteducreativespace"];

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

            const rawVideos = res.data.videos || [];

            // LỌC VIDEO CÓ CHỨA 1 TRONG CÁC HASHTAG YÊU CẦU
            const filteredVideos = rawVideos.filter((v: any) => {
                const textContent = (v.title || v.video_description || "").toLowerCase();
                // .some() trả về true nếu textContent chứa ít nhất 1 hashtag trong mảng
                return targetHashtags.some(hashtag => textContent.includes(hashtag));
            });

            const batch = adminDb.batch();

            // Chuyển sang lặp qua mảng đã lọc (filteredVideos) thay vì rawVideos
            for (const v of filteredVideos) {
                const createTime = new Date(v.create_time * 1000);

                if (!earliestDate || createTime < earliestDate) {
                    earliestDate = createTime;
                }

                const viewCount = Number(v.view_count) || 0;
                const likeCount = Number(v.like_count) || 0;
                const commentCount = Number(v.comment_count) || 0;
                const shareCount = Number(v.share_count) || 0;
                const interactions = likeCount + commentCount + shareCount;

                // Cộng dồn chỉ số tổng (chỉ của video hợp lệ)
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
                    channelUsername: currentUsername,
                    channelDisplayName: currentDisplayName,
                    stats: {
                        like: likeCount,
                        comment: commentCount,
                        share: shareCount,
                        view: viewCount
                    }
                };

                const videoRef = adminDb.collection("videos").doc(v.id);

                batch.set(videoRef, {
                    ...videoData,
                    createTime: Timestamp.fromDate(createTime)
                }, { merge: true });
            }

            // Ghi batch xuống DB
            await batch.commit();

            // Chỉ đếm những video đã lọt qua vòng filter
            totalSynced += filteredVideos.length;

            // Cursor và hasMore vẫn dựa trên raw data trả về từ API để duy trì phân trang chính xác
            hasMore = res.data.has_more;
            cursor = res.data.cursor;

            if (!hasMore || typeof cursor !== 'number') {
                break;
            }
        }

        // --- GHI THỐNG KÊ (Statistic) ---
        const today = new Date();
        const statId = channelId;

        const statisticData: Statistic = {
            id: statId,
            channelId: channelId,
            userId: userId,
            channelUsername: currentUsername,
            channelOwnerName: ownerName,
            updatedAt: today,
            followerCount: currentFollowers,
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
                    totalInteractions: monthInteractions, // Tổng tương tác của các video TẠO TRONG tháng này
                };

                if (monthlySnap.exists) {
                    monthlyBatch.set(monthlyRef, baseMonthlyData, { merge: true });
                } else {
                    monthlyBatch.set(monthlyRef, {
                        ...baseMonthlyData,
                        channelUsername: currentUsername,
                        followerCount: currentFollowers

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

export async function getMonthlyStatistics(channelId: string, year: number, month: number) {
    try {
        // Tạo ID theo định dạng đã lưu: CHANNEL_ID_YYYY-MM
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        const docId = `${channelId}_${monthKey}`;

        const docRef = adminDb.collection("monthly_statistics").doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return docSnap.data();
        } else {
            return null; // Không có dữ liệu tháng đó
        }
    } catch (error) {
        console.error("Lỗi lấy thống kê tháng:", error);
        return null;
    }
}

export async function cleanupVideosWithoutHashtag() {
    try {
        // Mảng các hashtag hợp lệ
        const targetHashtags = ["#fptstudentcreativespace", "#fpteducreativespace"];

        const videosSnapshot = await adminDb.collection("videos").get();

        if (videosSnapshot.empty) {
            return { success: true, deletedCount: 0, message: "Không có video nào trong DB." };
        }

        let deletedCount = 0;
        let batch = adminDb.batch();
        let batchCount = 0;

        for (const doc of videosSnapshot.docs) {
            const data = doc.data();
            // Gộp title và description lại để kiểm tra, đưa về chữ thường
            const textContent = `${data.title || ""} ${data.description || ""}`.toLowerCase();

            // Kiểm tra xem text có chứa ít nhất 1 hashtag hợp lệ không
            const hasValidHashtag = targetHashtags.some(hashtag => textContent.includes(hashtag));

            // Nếu KHÔNG chứa bất kỳ hashtag hợp lệ nào -> Xóa
            if (!hasValidHashtag) {
                batch.delete(doc.ref);
                deletedCount++;
                batchCount++;

                // Firestore giới hạn tối đa 500 thao tác cho mỗi Batch
                if (batchCount === 500) {
                    await batch.commit();
                    batch = adminDb.batch(); // Khởi tạo batch mới
                    batchCount = 0;
                }
            }
        }

        // Commit những thao tác còn sót lại (nhỏ hơn 500)
        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`Đã dọn dẹp xong. Xóa thành công ${deletedCount} video không hợp lệ.`);
        return { success: true, deletedCount };

    } catch (error) {
        console.error("Lỗi khi dọn dẹp video:", error);
        return { success: false, error: "Đã xảy ra lỗi khi quét và xóa video." };
    }
}