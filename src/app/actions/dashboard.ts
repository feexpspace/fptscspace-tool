// src/app/actions/dashboard.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Channel, Statistic, Team, MonthlyStatistic } from "@/types";
import { syncTikTokVideos } from "./report";

// Hàm chia nhỏ mảng để tránh giới hạn query 'in' của Firestore (max 30 items)
// Hàm chia nhỏ mảng để tránh giới hạn query 'in' của Firestore (max 30 items)
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

/**
 * Lấy dữ liệu Dashboard.
 * - Nếu có `teamId`: Lấy dữ liệu của team đó.
 * - Nếu không có `teamId`:
 * + Nếu `role` là 'admin': Lấy tất cả team.
 * + Nếu `role` là 'manager': Lấy các team mà user quản lý.
 */
export async function getDashboardData(
    year: number,
    teamId?: string,
    userId?: string,
    role?: string
) {
    try {
        let teamDocs: FirebaseFirestore.DocumentData[] = [];
        let targetTeam: Team | null = null;

        // 1. Xác định danh sách Team cần lấy dữ liệu
        if (teamId) {
            // TRƯỜNG HỢP 1: Chọn 1 Team cụ thể
            const docSnap = await adminDb.collection("teams").doc(teamId).get();
            if (docSnap.exists) {
                teamDocs = [docSnap];
                const data = docSnap.data();
                if (data) {
                    targetTeam = {
                        id: docSnap.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    } as unknown as Team;
                }
            }
        } else {
            // TRƯỜNG HỢP 2: Chọn "Tất cả" (hoặc mặc định)
            if (role === 'admin') {
                // Admin thấy hết
                const snap = await adminDb.collection("teams").get();
                teamDocs = snap.docs;
            } else if (role === 'manager' && userId) {
                // Manager thấy các team mình quản lý
                const snap = await adminDb.collection("teams")
                    .where("managerIds", "array-contains", userId)
                    .get();
                teamDocs = snap.docs;
            }
            // Member thường chỉ xem được team mình thuộc về (xử lý tương tự manager nếu cần)
        }

        if (teamDocs.length === 0) {
            return { team: null, channels: [], latestStats: [], monthlyStats: [] };
        }

        // 2. Gộp ID của tất cả Members và Managers từ (các) team đã tìm thấy
        const allUserIds = new Set<string>();

        teamDocs.forEach(doc => {
            const data = doc.data() || {}; // Handle potential undefined data
            const members: string[] = Array.isArray(data.members) ? data.members : [];
            const managers: string[] = Array.isArray(data.managerIds) ? data.managerIds : [];

            members.forEach(id => allUserIds.add(id));
            managers.forEach(id => allUserIds.add(id));
        });

        const uniqueUserIds = Array.from(allUserIds);

        if (uniqueUserIds.length === 0) {
            return { team: targetTeam, channels: [], latestStats: [], monthlyStats: [] };
        }

        // 3. Query Channels dựa trên danh sách user
        // Channel thuộc về User nào nằm trong Team đó thì sẽ được lấy về
        const userChunks = chunkArray(uniqueUserIds, 10);
        const channelPromises = userChunks.map(chunk =>
            adminDb.collection("channels").where("userId", "in", chunk).get()
        );
        const channelSnapshots = await Promise.all(channelPromises);

        const channels: Channel[] = channelSnapshots.flatMap(snap =>
            snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : undefined,
                    updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : undefined,
                } as unknown as Channel;
            })
        );

        if (channels.length === 0) {
            return { team: targetTeam, channels: [], latestStats: [], monthlyStats: [] };
        }

        const channelIds = channels.map(c => c.id);

        // 4. Lấy Statistics mới nhất (Overview)
        const statsChunks = chunkArray(channelIds, 10);
        const statsPromises = statsChunks.map(chunk =>
            adminDb.collection("statistics").where("channelId", "in", chunk).get()
        );
        const statsSnapshots = await Promise.all(statsPromises);

        const latestStats: Statistic[] = statsSnapshots.flatMap(snap =>
            snap.docs.map(doc => {
                const d = doc.data();
                return { id: doc.id, ...d, updatedAt: d.updatedAt?.toDate() } as unknown as Statistic;
            })
        );

        // 5. Lấy Monthly Stats theo Năm (Chart)
        const startMonth = `${year}-01`;
        const endMonth = `${year}-12`;
        const monthlyPromises = statsChunks.map(chunk =>
            adminDb.collection("monthly_statistics")
                .where("channelId", "in", chunk)
                .where("month", ">=", startMonth)
                .where("month", "<=", endMonth)
                .get()
        );
        const monthlySnapshots = await Promise.all(monthlyPromises);
        const monthlyStats: MonthlyStatistic[] = monthlySnapshots.flatMap(snap =>
            snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MonthlyStatistic))
        );

        return {
            team: targetTeam, // Trả về null nếu xem chế độ "All Teams", trả về object nếu xem 1 team
            channels,
            latestStats,
            monthlyStats
        };

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return { team: null, channels: [], latestStats: [], monthlyStats: [] };
    }
}

export async function getTeamsList(userId: string, role: string): Promise<Team[]> {
    try {
        let teamDocs: FirebaseFirestore.DocumentData[] = [];

        if (role === 'admin') {
            // Admin lấy tất cả
            const snap = await adminDb.collection("teams").get();
            teamDocs = snap.docs;
        } else if (role === 'manager') {
            // Manager chỉ lấy team mình quản lý
            const snap = await adminDb.collection("teams")
                .where("managerIds", "array-contains", userId)
                .get();
            teamDocs = snap.docs;
        } else {
            return [];
        }

        // Map dữ liệu và serialize Date object (quan trọng khi gửi từ Server -> Client)
        const teams: Team[] = teamDocs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Chuyển Firestore Timestamp sang Date object hoặc String nếu cần
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            } as unknown as Team;
        });

        return teams;
    } catch (error) {
        console.error("Error fetching teams list:", error);
        return [];
    }
}

export async function syncAllChannels(userId: string, teamId?: string, role?: string) {
    try {
        const channelsToSync: string[] = [];

        // 1. Xác định danh sách Channel ID cần đồng bộ
        if (teamId) {
            // Nếu chọn 1 team cụ thể -> Lấy member của team đó -> Lấy channel của member
            const teamDoc = await adminDb.collection("teams").doc(teamId).get();
            if (teamDoc.exists) {
                const data = teamDoc.data();
                const members = (data?.members || []) as string[];
                const managers = (data?.managerIds || []) as string[];
                const allUserIds = Array.from(new Set([...members, ...managers]));

                if (allUserIds.length > 0) {
                    // Chia nhỏ query nếu quá nhiều user (max 10 cho phép in)
                    const userChunks = chunkArray(allUserIds, 10);
                    const promises = userChunks.map(chunk =>
                        adminDb.collection("channels").where("userId", "in", chunk).get()
                    );
                    const snapshots = await Promise.all(promises);
                    snapshots.forEach(snap => {
                        snap.docs.forEach(doc => channelsToSync.push(doc.id));
                    });
                }
            }
        } else {
            // Nếu chọn "Tất cả"
            if (role === 'admin') {
                // Admin sync hết
                const snap = await adminDb.collection("channels").get();
                snap.docs.forEach(doc => channelsToSync.push(doc.id));
            } else if (role === 'manager') {
                // Manager sync các team mình quản lý
                // (Logic này hơi phức tạp, để đơn giản ta lấy tất cả channel thuộc các team của manager)
                const teamsSnap = await adminDb.collection("teams").where("managerIds", "array-contains", userId).get();
                const allUserIds = new Set<string>();
                teamsSnap.forEach(t => {
                    const d = t.data();
                    (d.members || []).forEach((m: string) => allUserIds.add(m));
                    (d.managerIds || []).forEach((m: string) => allUserIds.add(m));
                });

                const uniqueUsers = Array.from(allUserIds);
                if (uniqueUsers.length > 0) {
                    const userChunks = chunkArray(uniqueUsers, 10);
                    const promises = userChunks.map(chunk =>
                        adminDb.collection("channels").where("userId", "in", chunk).get()
                    );
                    const snapshots = await Promise.all(promises);
                    snapshots.forEach(snap => {
                        snap.docs.forEach(doc => channelsToSync.push(doc.id));
                    });
                }
            }
        }

        if (channelsToSync.length === 0) {
            return { success: true, count: 0 };
        }

        // 2. Thực hiện đồng bộ (Chạy song song nhưng giới hạn để tránh timeout/rate limit)
        // Dùng Promise.allSettled để 1 kênh lỗi không làm chết cả quy trình
        const results = await Promise.allSettled(
            channelsToSync.map(channelId => syncTikTokVideos(userId, channelId))
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Đã đồng bộ ${successCount}/${channelsToSync.length} kênh.`);

        return { success: true, count: successCount, total: channelsToSync.length };

    } catch (error) {
        console.error("Lỗi đồng bộ hàng loạt:", error);
        return { success: false, error: "Có lỗi xảy ra khi đồng bộ." };
    }
}