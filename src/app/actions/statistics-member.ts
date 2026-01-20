// src/app/actions/statistic.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Channel, Statistic } from "@/types";

export interface MemberOverview {
    totalFollowers: number;
    totalLikes: number;
    totalVideos: number;
    totalViews: number;
    totalInteractions: number;
    channelCount: number;
    channels: (Channel & { views: number; interactions: number })[];
}

export async function getMemberOverview(userId: string): Promise<MemberOverview> {
    try {
        // 1. Lấy tất cả kênh của User
        const channelsSnap = await adminDb.collection("channels")
            .where("userId", "==", userId)
            .get();

        const channels = channelsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : null,
                updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : null,
            } as unknown as Channel; // Ép kiểu để tránh lỗi TS
        });

        // 2. Lấy thống kê chi tiết (Statistic) để lấy số View (vì Channel thường không lưu tổng view realtime)
        // Chúng ta sẽ lấy Statistic tương ứng với từng ChannelId
        const enrichedChannels = await Promise.all(channels.map(async (channel) => {
            let views = 0;
            let interactions = 0;

            const statSnap = await adminDb.collection("statistics").doc(channel.id).get();

            if (statSnap.exists) {
                const statData = statSnap.data();
                views = statData?.totalViews || 0;
                interactions = statData?.totalInteractions || 0; // <--- Lấy interactions
            } else {
                // Fallback cho query cũ (nếu chưa migrate hết)
                const querySnap = await adminDb.collection("statistics")
                    .where("channelId", "==", channel.id)
                    .limit(1)
                    .get();
                if (!querySnap.empty) {
                    const statData = querySnap.docs[0].data();
                    views = statData.totalViews || 0;
                    interactions = statData.totalInteractions || 0;
                }
            }

            return {
                ...channel,
                views,
                interactions
            };
        }));

        // 3. Tính tổng
        const overview = enrichedChannels.reduce((acc, curr) => ({
            totalFollowers: acc.totalFollowers + (curr.follower || 0),
            totalLikes: acc.totalLikes + (curr.like || 0),
            totalVideos: acc.totalVideos + (curr.videoCount || 0),
            totalViews: acc.totalViews + curr.views,
            totalInteractions: acc.totalInteractions + curr.interactions,
        }), {
            totalFollowers: 0,
            totalLikes: 0,
            totalVideos: 0,
            totalViews: 0,
            totalInteractions: 0
        });

        return {
            ...overview,
            channelCount: channels.length,
            channels: enrichedChannels
        };

    } catch (e) {
        console.error("Lỗi lấy thống kê member:", e);
        return {
            totalFollowers: 0,
            totalLikes: 0,
            totalVideos: 0,
            totalViews: 0,
            totalInteractions: 0,
            channelCount: 0,
            channels: []
        };
    }
}