// src/app/actions/account.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { User, Channel } from "@/types";
import { revalidatePath } from "next/cache";

export type UserWithChannels = User & { channels: Channel[] };

export async function getAllUsersWithChannels(): Promise<{ success: boolean, data?: UserWithChannels[], error?: string }> {
    try {
        const [{ data: usersData }, { data: channelsData }] = await Promise.all([
            supabaseAdmin.from('users').select('*'),
            supabaseAdmin.from('channels').select('*'),
        ]);

        const users: User[] = (usersData || []).map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            teamId: u.team_id || '',
            status: u.status || 'pending',
        }));

        const channels: Channel[] = (channelsData || []).map(c => ({
            id: c.id,
            openId: c.open_id,
            unionId: c.union_id,
            avatar: c.avatar,
            displayName: c.display_name,
            username: c.username,
            email: c.email || '',
            isVerified: c.is_verified,
            follower: c.follower,
            following: c.following,
            like: c.likes,
            videoCount: c.video_count,
            userId: c.user_id || '',
        }));

        const usersWithChannels: UserWithChannels[] = users.map(user => ({
            ...user,
            channels: channels.filter(c => c.userId === user.id),
        }));

        const roleOrder = { admin: 1, member: 2 };
        usersWithChannels.sort((a, b) => (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9));

        return { success: true, data: usersWithChannels };
    } catch (error) {
        console.error("Lỗi lấy danh sách user:", error);
        return { success: false, error: "Lỗi server khi lấy dữ liệu người dùng." };
    }
}

export async function approveUser(userId: string) {
    try {
        await supabaseAdmin
            .from('users')
            .update({ status: 'approved' })
            .eq('id', userId);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Lỗi duyệt user:", error);
        return { success: false, error: "Lỗi server khi duyệt tài khoản." };
    }
}

export async function changeUserRole(userId: string, newRole: 'admin' | 'member') {
    try {
        await supabaseAdmin
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        revalidatePath('/accounts');
        return { success: true };
    } catch (error) {
        console.error("Lỗi đổi role:", error);
        return { success: false, error: "Lỗi server khi đổi phân quyền." };
    }
}

export async function deleteUserAccount(userId: string) {
    try {
        // Unassign channels (user_id → null)
        await supabaseAdmin
            .from('channels')
            .update({ user_id: null })
            .eq('user_id', userId);

        // Delete user from DB (CASCADE removes team_managers)
        await supabaseAdmin.from('users').delete().eq('id', userId);

        // Delete from Supabase Auth
        await supabaseAdmin.auth.admin.deleteUser(userId);

        revalidatePath('/accounts');
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa user:", error);
        return { success: false, error: "Lỗi server khi xóa người dùng." };
    }
}

// Ngắt kết nối TikTok: Chỉ xóa token, giữ channel + video cũ
export async function disconnectTikTokToken(channelId: string) {
    try {
        await supabaseAdmin.from('tokens').delete().eq('channel_id', channelId);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Lỗi ngắt kết nối TikTok (token):", error);
        return { success: false, error: "Lỗi server khi ngắt kết nối." };
    }
}

// Ngắt kết nối TikTok: Xóa hoàn toàn token + channel + video
export async function disconnectTikTokFull(channelId: string) {
    try {
        await supabaseAdmin.from('tokens').delete().eq('channel_id', channelId);
        await supabaseAdmin.from('videos').delete().eq('channel_id', channelId);
        await supabaseAdmin.from('channels').delete().eq('id', channelId);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Lỗi ngắt kết nối TikTok (full):", error);
        return { success: false, error: "Lỗi server khi xóa kênh." };
    }
}
