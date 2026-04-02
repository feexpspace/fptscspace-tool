// src/app/actions/editor.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Editor, Video } from "@/types";

export async function getEditors() {
    try {
        const { data } = await supabaseAdmin
            .from('editors')
            .select('*')
            .order('name');

        return (data || []) as Editor[];
    } catch (error) {
        console.error("Lỗi lấy danh sách editor:", error);
        return [];
    }
}

export async function createEditor(data: { name: string; email?: string }) {
    try {
        const { error } = await supabaseAdmin
            .from('editors')
            .insert({ name: data.name, email: data.email || '' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Lỗi tạo editor:", error);
        return { success: false, error: "Không thể tạo Editor." };
    }
}

export async function updateEditor(id: string, data: { name: string; email?: string }) {
    try {
        const { error } = await supabaseAdmin
            .from('editors')
            .update({ name: data.name, email: data.email || '' })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Lỗi cập nhật editor:", error);
        return { success: false, error: "Lỗi cập nhật." };
    }
}

export async function deleteEditor(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('editors')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa editor:", error);
        return { success: false, error: "Không thể xóa editor." };
    }
}

export async function getEditorStats(editorId: string, year: number) {
    try {
        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();

        const { data } = await supabaseAdmin
            .from('videos')
            .select('*')
            .eq('editor_id', editorId)
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

        const overview = videos.reduce((acc, curr) => ({
            totalVideos: acc.totalVideos + 1,
            totalViews: acc.totalViews + (curr.stats?.view || 0),
            totalEngagement: acc.totalEngagement + (curr.stats?.like || 0) + (curr.stats?.comment || 0) + (curr.stats?.share || 0),
        }), { totalVideos: 0, totalViews: 0, totalEngagement: 0 });

        const groupsMap = new Map<number, { videos: Video[], monthView: number }>();
        videos.forEach(video => {
            const month = video.createTime.getMonth() + 1;
            if (!groupsMap.has(month)) {
                groupsMap.set(month, { videos: [], monthView: 0 });
            }
            const group = groupsMap.get(month)!;
            group.videos.push(video);
            group.monthView += (video.stats?.view || 0);
        });

        const monthlyGroups = Array.from(groupsMap.entries())
            .map(([month, data]) => ({
                month,
                videos: data.videos,
                totalViews: data.monthView,
            }))
            .sort((a, b) => b.month - a.month);

        return { overview, monthlyGroups };
    } catch (error) {
        console.error("Lỗi lấy thống kê editor:", error);
        return {
            overview: { totalVideos: 0, totalViews: 0, totalEngagement: 0 },
            monthlyGroups: [],
        };
    }
}
