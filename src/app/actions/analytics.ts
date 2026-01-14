// src/app/actions/analytics.ts
'use server'

import { adminDb } from '@/lib/firebase-admin'; // Sử dụng Admin SDK
import { Timestamp } from 'firebase-admin/firestore'; // Type Timestamp của Admin
import { Video } from '@/types/index';

/**
 * Interface cho kết quả trả về để UI dễ sử dụng
 */
interface AnalyticsSummary {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    videoCount: number;
}

interface ChannelAnalyticsResponse {
    summary: AnalyticsSummary;
    videos: Video[];
}

/**
 * HÀM 1: Lấy thống kê chi tiết của MỘT kênh (có thể lọc theo tháng)
 * Sử dụng Admin SDK để bypass security rules và chạy trên Server
 */
export async function getChannelAnalytics(
    channelId: string,
    month?: number,
    year?: number
): Promise<ChannelAnalyticsResponse> {
    try {
        let query = adminDb.collection('videos').where('channelId', '==', channelId);

        // Nếu có lọc theo tháng/năm
        if (month !== undefined && year !== undefined) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            query = query
                .where('createTime', '>=', Timestamp.fromDate(startDate))
                .where('createTime', '<=', Timestamp.fromDate(endDate));
        }

        // Sắp xếp
        query = query.orderBy('createTime', 'desc');

        const snapshot = await query.get();

        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;

        const videos: Video[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();

            // Convert data từ Firestore sang type Video
            // Admin SDK trả về Timestamp, cần convert sang Date
            const videoData = {
                id: doc.id,
                ...data,
                // Kiểm tra an toàn xem có phải là Timestamp object không trước khi gọi toDate()
                createTime: (data.createTime && typeof data.createTime.toDate === 'function')
                    ? data.createTime.toDate()
                    : new Date(data.createTime),
            } as Video;

            // Cộng dồn chỉ số
            if (videoData.stats) {
                totalViews += Number(videoData.stats.view) || 0;
                totalLikes += Number(videoData.stats.like) || 0;
                totalComments += Number(videoData.stats.comment) || 0;
                totalShares += Number(videoData.stats.share) || 0;
            }

            videos.push(videoData);
        });

        return {
            summary: {
                totalViews,
                totalLikes,
                totalComments,
                totalShares,
                videoCount: videos.length,
            },
            videos,
        };

    } catch (error) {
        console.error('Error fetching channel analytics:', error);
        return {
            summary: { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, videoCount: 0 },
            videos: []
        };
    }
}

/**
 * HÀM 2: Lấy tổng quan thống kê của TẤT CẢ các kênh (Dành cho Dashboard Manager)
 */
export async function getTeamOverview(channelIds: string[]): Promise<AnalyticsSummary> {
    if (!channelIds || channelIds.length === 0) {
        return { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, videoCount: 0 };
    }

    try {
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let videoCount = 0;

        // Query song song từng channelId sử dụng Admin SDK
        await Promise.all(channelIds.map(async (channelId) => {
            const snapshot = await adminDb.collection('videos')
                .where('channelId', '==', channelId)
                .get();

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.stats) {
                    totalViews += Number(data.stats.view) || 0;
                    totalLikes += Number(data.stats.like) || 0;
                    totalComments += Number(data.stats.comment) || 0;
                    totalShares += Number(data.stats.share) || 0;
                }
                videoCount++;
            });
        }));

        return {
            totalViews,
            totalLikes,
            totalComments,
            totalShares,
            videoCount
        };

    } catch (error) {
        console.error('Error fetching team overview:', error);
        return { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, videoCount: 0 };
    }
}