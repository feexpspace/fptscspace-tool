// src/app/actions/team.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { User } from "@/types/index";
import { revalidatePath } from "next/cache";

export async function searchAvailableUsers(searchTerm: string) {
    try {
        const { data } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('role', 'member')
            .is('team_id', null);

        const lowerTerm = searchTerm.toLowerCase();
        const users: User[] = (data || [])
            .filter(u =>
                u.email.toLowerCase().includes(lowerTerm) ||
                u.name.toLowerCase().includes(lowerTerm)
            )
            .map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                teamId: u.team_id || '',
                status: u.status || 'approved',
            }));

        return users;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

export async function createNewTeam(teamName: string, memberIds: string[]) {
    try {
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({ name: teamName })
            .select('id')
            .single();

        if (teamError || !team) throw teamError || new Error("Failed to create team");

        if (memberIds.length > 0) {
            await supabaseAdmin
                .from('users')
                .update({ team_id: team.id })
                .in('id', memberIds);
        }

        revalidatePath('/teams');
        return { success: true, teamId: team.id };
    } catch (error) {
        console.error("Create Team Error:", error);
        return { success: false, error: "Không thể tạo team. Vui lòng thử lại." };
    }
}

export async function deleteTeam(teamId: string) {
    try {
        await supabaseAdmin.from('users').update({ team_id: null }).eq('team_id', teamId);
        await supabaseAdmin.from('teams').delete().eq('id', teamId);
        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Delete Team Error:", error);
        return { success: false, error: "Không thể giải tán team. Lỗi server." };
    }
}

export async function addMemberToTeam(teamId: string, userId: string) {
    try {
        await supabaseAdmin.from('users').update({ team_id: teamId }).eq('id', userId);
        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Add Member Error:", error);
        return { success: false, error: "Không thể thêm thành viên. Lỗi server." };
    }
}

export async function removeMemberFromTeam(teamId: string, userId: string) {
    try {
        await supabaseAdmin
            .from('users')
            .update({ team_id: null })
            .eq('id', userId)
            .eq('team_id', teamId);
        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Remove Member Error:", error);
        return { success: false, error: "Không thể xóa thành viên." };
    }
}

export async function assignUserToTeam(userId: string, teamId: string | null) {
    try {
        await supabaseAdmin.from('users').update({ team_id: teamId }).eq('id', userId);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Assign Team Error:", error);
        return { success: false, error: "Không thể xếp Mảng." };
    }
}

export async function updateTeamName(teamId: string, newName: string) {
    try {
        if (!newName || newName.trim() === "") {
            return { success: false, error: "Tên team không được để trống." };
        }
        await supabaseAdmin.from('teams').update({ name: newName.trim() }).eq('id', teamId);
        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Update Team Name Error:", error);
        return { success: false, error: "Không thể đổi tên team. Lỗi server." };
    }
}
