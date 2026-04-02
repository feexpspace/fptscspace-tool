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
    let teamIds: string[];

    if (role === 'admin') {
        const { data } = await supabaseAdmin.from('teams').select('id, name, created_at').order('created_at');
        if (!data || data.length === 0) return [];
        teamIds = data.map(t => t.id);

        const [{ data: managersData }, { data: usersData }] = await Promise.all([
            supabaseAdmin.from('team_managers').select('team_id, user_id').in('team_id', teamIds),
            supabaseAdmin.from('users').select('id, team_id').in('team_id', teamIds),
        ]);

        return data.map(team => ({
            id: team.id,
            name: team.name,
            createdAt: new Date(team.created_at),
            managerIds: (managersData || []).filter(m => m.team_id === team.id).map(m => m.user_id),
            members: (usersData || []).filter(u => u.team_id === team.id).map(u => u.id),
        }));
    } else if (role === 'manager') {
        const { data: managed } = await supabaseAdmin
            .from('team_managers').select('team_id').eq('user_id', userId);

        teamIds = (managed || []).map(m => m.team_id);
        if (teamIds.length === 0) return [];

        const [{ data: teamsData }, { data: managersData }, { data: usersData }] = await Promise.all([
            supabaseAdmin.from('teams').select('id, name, created_at').in('id', teamIds),
            supabaseAdmin.from('team_managers').select('team_id, user_id').in('team_id', teamIds),
            supabaseAdmin.from('users').select('id, team_id').in('team_id', teamIds),
        ]);

        return (teamsData || []).map(team => ({
            id: team.id,
            name: team.name,
            createdAt: new Date(team.created_at),
            managerIds: (managersData || []).filter(m => m.team_id === team.id).map(m => m.user_id),
            members: (usersData || []).filter(u => u.team_id === team.id).map(u => u.id),
        }));
    }

    return [];
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
