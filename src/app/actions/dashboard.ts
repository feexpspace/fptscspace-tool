// src/app/actions/dashboard.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Channel, Statistic, Team, MonthlyStatistic } from "@/types";

export interface ManagerDashboardData {
    team: Team | null;
    channels: Channel[];
    latestStats: Statistic[];
    monthlyStats: MonthlyStatistic[];
}

export async function getManagerDashboardData(managerId: string, year: number): Promise<ManagerDashboardData> {
    try {
        // 1. Lấy Team do Manager quản lý
        const teamSnap = await adminDb.collection("teams")
            .where("managerId", "==", managerId)
            .limit(1)
            .get();

        if (teamSnap.empty) {
            return { team: null, channels: [], latestStats: [], monthlyStats: [] };
        }

        const teamDoc = teamSnap.docs[0];
        const teamData = teamDoc.data();

        // --- FIX LỖI SERIALIZATION CHO TEAM ---
        // Convert Timestamp của Firestore sang Javascript Date
        let teamCreatedAt = new Date();
        if (teamData.createdAt && typeof teamData.createdAt.toDate === 'function') {
            teamCreatedAt = teamData.createdAt.toDate();
        } else if (teamData.createdAt) {
            // Fallback nếu đã là string hoặc Date
            teamCreatedAt = new Date(teamData.createdAt);
        }

        const team = {
            id: teamDoc.id,
            ...teamData,
            createdAt: teamCreatedAt // Ghi đè bằng Date chuẩn
        } as Team;


        // 2. Lấy danh sách Channels
        const memberIds = team.members || [];
        if (!memberIds.includes(managerId)) memberIds.push(managerId);

        if (memberIds.length === 0) {
            return { team, channels: [], latestStats: [], monthlyStats: [] };
        }

        const channelsSnap = await adminDb.collection("channels")
            .where("userId", "in", memberIds.slice(0, 30))
            .get();

        // --- FIX LỖI SERIALIZATION CHO CHANNELS (Nếu Channel có field ngày tháng) ---
        const channels = channelsSnap.docs.map(doc => {
            const cData = doc.data();
            // Nếu channel có field createdAt/updatedAt là Timestamp, cần convert tương tự
            // Ví dụ:
            // const cCreatedAt = cData.createdAt?.toDate ? cData.createdAt.toDate() : new Date();
            return {
                id: doc.id,
                ...cData
                // createdAt: cCreatedAt 
            } as Channel;
        });

        const channelIds = channels.map(c => c.id);

        if (channelIds.length === 0) {
            return { team, channels, latestStats: [], monthlyStats: [] };
        }

        // 3. Lấy Latest Statistics
        const latestStatsPromises = channelIds.map(async (cid) => {
            const snap = await adminDb.collection("statistics")
                .where("channelId", "==", cid)
                .orderBy("updatedAt", "desc")
                .limit(1)
                .get();

            if (!snap.empty) {
                const data = snap.docs[0].data();
                return {
                    id: snap.docs[0].id,
                    ...data,
                    // --- FIX LỖI SERIALIZATION CHO STATISTIC ---
                    updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function'
                        ? data.updatedAt.toDate()
                        : new Date()
                } as Statistic;
            }
            return null;
        });

        const latestStatsRaw = await Promise.all(latestStatsPromises);
        const latestStats = latestStatsRaw.filter((s): s is Statistic => s !== null);

        // 4. Lấy Monthly Statistics
        const startOfYear = `${year}-01`;
        const endOfYear = `${year}-12`;

        const monthlySnap = await adminDb.collection("monthly_statistics")
            .where("channelId", "in", channelIds.slice(0, 30))
            .where("month", ">=", startOfYear)
            .where("month", "<=", endOfYear)
            .get();

        const monthlyStats = monthlySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MonthlyStatistic));

        return {
            team,
            channels,
            latestStats,
            monthlyStats
        };

    } catch (error) {
        console.error("Error getting manager dashboard data:", error);
        throw error;
    }
}