// src/app/actions/team.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { User, Team } from "@/types/index";
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
            }));

        return users;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

export async function searchManagers(searchTerm: string) {
    try {
        const { data } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('role', 'manager');

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
            }));

        return users;
    } catch (error) {
        console.error("Error searching managers:", error);
        return [];
    }
}

export async function createNewTeam(
    teamName: string,
    managerIds: string[],
    memberIds: string[]
) {
    try {
        // Create team
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({ name: teamName })
            .select('id')
            .single();

        if (teamError || !team) throw teamError || new Error("Failed to create team");

        const teamId = team.id;

        // Insert team_managers
        if (managerIds.length > 0) {
            await supabaseAdmin
                .from('team_managers')
                .insert(managerIds.map(uid => ({ team_id: teamId, user_id: uid })));

            // Promote managers (skip admins)
            const { data: managers } = await supabaseAdmin
                .from('users')
                .select('id, role')
                .in('id', managerIds);

            const toPromote = (managers || []).filter(u => u.role !== 'admin').map(u => u.id);
            if (toPromote.length > 0) {
                await supabaseAdmin
                    .from('users')
                    .update({ role: 'manager' })
                    .in('id', toPromote);
            }
        }

        // Assign members to team
        if (memberIds.length > 0) {
            await supabaseAdmin
                .from('users')
                .update({ team_id: teamId })
                .in('id', memberIds);
        }

        revalidatePath('/teams');
        return { success: true, teamId };
    } catch (error) {
        console.error("Create Team Error:", error);
        return { success: false, error: "Không thể tạo team. Vui lòng thử lại." };
    }
}

export async function deleteTeam(teamId: string) {
    try {
        // Get managers before deleting
        const { data: managers } = await supabaseAdmin
            .from('team_managers')
            .select('user_id')
            .eq('team_id', teamId);

        const managerIds = (managers || []).map(m => m.user_id);

        // Remove team_id from members
        await supabaseAdmin
            .from('users')
            .update({ team_id: null })
            .eq('team_id', teamId);

        // Delete team (CASCADE removes team_managers)
        await supabaseAdmin.from('teams').delete().eq('id', teamId);

        // Downgrade managers who no longer manage any team
        for (const mgrId of managerIds) {
            const { data: otherTeams } = await supabaseAdmin
                .from('team_managers')
                .select('team_id')
                .eq('user_id', mgrId);

            if (!otherTeams || otherTeams.length === 0) {
                const { data: user } = await supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('id', mgrId)
                    .single();

                if (user && user.role !== 'admin') {
                    await supabaseAdmin
                        .from('users')
                        .update({ role: 'member' })
                        .eq('id', mgrId);
                }
            }
        }

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Delete Team Error:", error);
        return { success: false, error: "Không thể giải tán team. Lỗi server." };
    }
}

export async function addMemberToTeam(teamId: string, userId: string) {
    try {
        await supabaseAdmin
            .from('users')
            .update({ team_id: teamId })
            .eq('id', userId);

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

export async function addManagerToTeam(teamId: string, userId: string) {
    try {
        // Check role before promoting
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (user && user.role !== 'admin') {
            await supabaseAdmin
                .from('users')
                .update({ role: 'manager' })
                .eq('id', userId);
        }

        await supabaseAdmin
            .from('team_managers')
            .upsert({ team_id: teamId, user_id: userId });

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Add Manager Error:", error);
        return { success: false, error: "Không thể thêm quản lý." };
    }
}

export async function removeManagerFromTeam(teamId: string, userId: string) {
    try {
        await supabaseAdmin
            .from('team_managers')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);

        // Check if still managing other teams
        const { data: otherTeams } = await supabaseAdmin
            .from('team_managers')
            .select('team_id')
            .eq('user_id', userId);

        if (!otherTeams || otherTeams.length === 0) {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (user && user.role !== 'admin') {
                await supabaseAdmin
                    .from('users')
                    .update({ role: 'member' })
                    .eq('id', userId);
            }
        }

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Remove Manager Error:", error);
        return { success: false, error: "Không thể xóa quản lý khỏi team." };
    }
}

export async function updateTeamName(teamId: string, newName: string) {
    try {
        if (!newName || newName.trim() === "") {
            return { success: false, error: "Tên team không được để trống." };
        }

        await supabaseAdmin
            .from('teams')
            .update({ name: newName.trim() })
            .eq('id', teamId);

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Update Team Name Error:", error);
        return { success: false, error: "Không thể đổi tên team. Lỗi server." };
    }
}

