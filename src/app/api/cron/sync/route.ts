// src/app/api/cron/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { syncTikTokVideos } from "@/app/actions/report";

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: channels } = await supabaseAdmin
            .from('channels')
            .select('id, user_id');

        if (!channels || channels.length === 0) {
            return NextResponse.json({ success: true, message: "No channels to sync", count: 0 });
        }

        const syncTasks = channels.map(channel => {
            const { id: channelId, user_id: userId } = channel;
            if (!userId) return Promise.resolve({ status: 'skipped', channelId });

            return syncTikTokVideos(userId, channelId)
                .then(result => ({ status: 'fulfilled', channelId, ...result }))
                .catch(error => ({ status: 'rejected', channelId, error: String(error) }));
        });

        const results = await Promise.allSettled(syncTasks);
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`Cron sync completed: ${succeeded} succeeded, ${failed} failed out of ${channels.length} channels`);

        return NextResponse.json({
            success: true,
            total: channels.length,
            succeeded,
            failed,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Cron sync error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
