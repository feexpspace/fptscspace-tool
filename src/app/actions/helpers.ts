// src/app/actions/helpers.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Channel, Team } from "@/types";

export async function getChannelIdsForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const { data } = await supabaseAdmin.from('channels').select('id').in('user_id', userIds);
    return (data || []).map(c => c.id);
}

export async function getChannelsForUsers(userIds: string[]): Promise<Channel[]> {
    if (userIds.length === 0) return [];
    const { data } = await supabaseAdmin.from('channels').select('*').in('user_id', userIds);
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

export async function getTeamsList(userId: string, role: string): Promise<Team[]> {
    if (role !== 'admin') return [];

    const { data: teamsData } = await supabaseAdmin
        .from('teams').select('id, name, created_at').order('created_at');

    if (!teamsData || teamsData.length === 0) return [];

    const teamIds = teamsData.map(t => t.id);
    const { data: usersData } = await supabaseAdmin
        .from('users').select('id, team_id').in('team_id', teamIds);

    return teamsData.map(team => ({
        id: team.id,
        name: team.name,
        createdAt: new Date(team.created_at),
        members: (usersData || []).filter(u => u.team_id === team.id).map(u => u.id),
    }));
}

export async function getUserIdsForScope(
    role: string,
    userId: string,
    teamId?: string
): Promise<string[]> {
    if (teamId) {
        const { data } = await supabaseAdmin.from('users').select('id').eq('team_id', teamId);
        return (data || []).map(u => u.id);
    }

    // Admin: all users
    const { data } = await supabaseAdmin.from('users').select('id');
    return (data || []).map(u => u.id);
}
