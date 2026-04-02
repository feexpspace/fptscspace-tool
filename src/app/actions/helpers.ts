// src/app/actions/helpers.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Channel, Team } from "@/types";

/**
 * Lấy danh sách channelIds thuộc 1 team
 */
export async function getChannelIdsForTeam(teamId: string): Promise<string[]> {
    // Members: users with team_id = teamId
    const { data: members } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('team_id', teamId);

    // Managers: from team_managers junction table
    const { data: managers } = await supabaseAdmin
        .from('team_managers')
        .select('user_id')
        .eq('team_id', teamId);

    const memberIds = (members || []).map(u => u.id);
    const managerIds = (managers || []).map(m => m.user_id);
    const allUserIds = Array.from(new Set([...memberIds, ...managerIds]));

    if (allUserIds.length === 0) return [];
    return getChannelIdsForUsers(allUserIds);
}

/**
 * Lấy danh sách channelIds từ danh sách userIds
 */
export async function getChannelIdsForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    const { data } = await supabaseAdmin
        .from('channels')
        .select('id')
        .in('user_id', userIds);

    return (data || []).map(c => c.id);
}

/**
 * Lấy danh sách channels từ danh sách userIds
 */
export async function getChannelsForUsers(userIds: string[]): Promise<Channel[]> {
    if (userIds.length === 0) return [];

    const { data } = await supabaseAdmin
        .from('channels')
        .select('*')
        .in('user_id', userIds);

    return (data || []).map(row => ({
        id: row.id,
        openId: row.open_id,
        unionId: row.union_id,
        avatar: row.avatar,
        displayName: row.display_name,
        username: row.username,
        email: row.email || '',
        isVerified: row.is_verified,
        follower: row.follower,
        following: row.following,
        like: row.likes,
        videoCount: row.video_count,
        userId: row.user_id,
    }));
}

/**
 * Lấy danh sách teams dựa trên role
 */
export async function getTeamsList(userId: string, role: string): Promise<Team[]> {
    if (role === 'admin') {
        const { data } = await supabaseAdmin
            .from('teams')
            .select('*, team_managers(user_id), users(id)')
            .order('created_at');

        return mapTeams(data || []);
    } else if (role === 'manager') {
        const { data: managed } = await supabaseAdmin
            .from('team_managers')
            .select('team_id')
            .eq('user_id', userId);

        const teamIds = (managed || []).map(m => m.team_id);
        if (teamIds.length === 0) return [];

        const { data } = await supabaseAdmin
            .from('teams')
            .select('*, team_managers(user_id), users(id)')
            .in('id', teamIds);

        return mapTeams(data || []);
    }

    return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeams(rows: any[]): Team[] {
    return rows.map(row => ({
        id: row.id,
        name: row.name,
        createdAt: new Date(row.created_at),
        managerIds: (row.team_managers || []).map((m: { user_id: string }) => m.user_id),
        members: (row.users || []).map((u: { id: string }) => u.id),
    }));
}

/**
 * Lấy tất cả user IDs thuộc 1 team hoặc tất cả teams
 */
export async function getUserIdsForScope(
    role: string,
    userId: string,
    teamId?: string
): Promise<string[]> {
    if (teamId) {
        const [{ data: members }, { data: managers }] = await Promise.all([
            supabaseAdmin.from('users').select('id').eq('team_id', teamId),
            supabaseAdmin.from('team_managers').select('user_id').eq('team_id', teamId),
        ]);
        const memberIds = (members || []).map(u => u.id);
        const managerIds = (managers || []).map(m => m.user_id);
        return Array.from(new Set([...memberIds, ...managerIds]));
    }

    if (role === 'admin') {
        const { data } = await supabaseAdmin.from('users').select('id');
        return (data || []).map(u => u.id);
    }

    if (role === 'member') {
        return [userId];
    }

    // manager without teamId — get all teams they manage
    const { data: managed } = await supabaseAdmin
        .from('team_managers')
        .select('team_id')
        .eq('user_id', userId);

    const teamIds = (managed || []).map(m => m.team_id);
    if (teamIds.length === 0) return [];

    const [{ data: members }, { data: managers }] = await Promise.all([
        supabaseAdmin.from('users').select('id').in('team_id', teamIds),
        supabaseAdmin.from('team_managers').select('user_id').in('team_id', teamIds),
    ]);
    const memberIds = (members || []).map(u => u.id);
    const managerIds = (managers || []).map(m => m.user_id);
    return Array.from(new Set([...memberIds, ...managerIds]));
}
