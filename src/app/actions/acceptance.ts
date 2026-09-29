// src/app/actions/acceptance.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { AcceptanceStatus } from "@/types";

// Xác thực người gọi từ access token (không tin userId gửi từ client)
async function getCaller(accessToken: string) {
    if (!accessToken) return null;
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return null;
    const { data } = await supabaseAdmin
        .from('users')
        .select('id, role, status, can_approve')
        .eq('id', user.id)
        .maybeSingle();
    if (!data || data.status !== 'approved') return null;
    return { id: data.id as string, isAdmin: data.role === 'admin', canApprove: data.role === 'admin' && !!data.can_approve };
}

export async function setVideoAcceptance(
    accessToken: string,
    videoIds: string[],
    updates: { status?: AcceptanceStatus | null; note?: string | null }
): Promise<{ success: boolean; error?: string }> {
    try {
        const caller = await getCaller(accessToken);
        if (!caller?.canApprove) return { success: false, error: "Bạn không có quyền duyệt nghiệm thu." };
        if (videoIds.length === 0) return { success: true };

        const dbUpdates: Record<string, unknown> = {};
        if ('status' in updates) {
            dbUpdates.acceptance_status = updates.status || null;
            dbUpdates.acceptance_by = updates.status ? caller.id : null;
            dbUpdates.acceptance_at = updates.status ? new Date().toISOString() : null;
        }
        if ('note' in updates) dbUpdates.acceptance_note = updates.note?.trim() || null;

        const { error } = await supabaseAdmin
            .from('videos')
            .update(dbUpdates)
            .in('id', videoIds);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("setVideoAcceptance error:", error);
        return { success: false, error: "Lỗi server khi lưu duyệt nghiệm thu." };
    }
}

export async function setUserCanApprove(
    accessToken: string,
    userId: string,
    canApprove: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const caller = await getCaller(accessToken);
        if (!caller?.isAdmin) return { success: false, error: "Chỉ admin mới được cấp quyền." };

        const { error } = await supabaseAdmin
            .from('users')
            .update({ can_approve: canApprove })
            .eq('id', userId)
            .eq('role', 'admin');

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("setUserCanApprove error:", error);
        return { success: false, error: "Lỗi server khi cấp quyền duyệt." };
    }
}
