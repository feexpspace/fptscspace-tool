// src/app/api/cron/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { syncTikTokVideos } from "@/app/actions/report";

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Lấy tất cả channels
        const channelsSnap = await adminDb.collection("channels").get();

        if (channelsSnap.empty) {
            return NextResponse.json({ success: true, message: "No channels to sync", count: 0 });
        }

        const syncTasks = channelsSnap.docs.map(doc => {
            const data = doc.data();
            const channelId = doc.id;
            const userId = data.userId;

            if (!userId) return Promise.resolve({ status: 'skipped', channelId });

            return syncTikTokVideos(userId, channelId)
                .then(result => ({ status: 'fulfilled', channelId, ...result }))
                .catch(error => ({ status: 'rejected', channelId, error: String(error) }));
        });

        const results = await Promise.allSettled(syncTasks);

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`Cron sync completed: ${succeeded} succeeded, ${failed} failed out of ${channelsSnap.size} channels`);

        return NextResponse.json({
            success: true,
            total: channelsSnap.size,
            succeeded,
            failed,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error("Cron sync error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
