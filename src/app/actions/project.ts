'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Project } from "@/types";

export async function getProjects(): Promise<Project[]> {
    try {
        const { data } = await supabaseAdmin
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        return (data || []).map(p => ({
            id: p.id,
            name: p.name,
            status: p.status as 'active' | 'ended',
            createdAt: new Date(p.created_at),
        }));
    } catch {
        return [];
    }
}

export async function createProject(name: string): Promise<{ success: boolean; data?: Project; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('projects')
            .insert({ name, status: 'active' })
            .select()
            .single();

        if (error) return { success: false, error: error.message };
        return {
            success: true,
            data: {
                id: data.id,
                name: data.name,
                status: data.status,
                createdAt: new Date(data.created_at),
            },
        };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Lỗi server' };
    }
}

export async function updateProject(
    id: string,
    updates: { name?: string; status?: 'active' | 'ended' }
): Promise<{ success: boolean }> {
    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .update(updates)
            .eq('id', id);
        return { success: !error };
    } catch {
        return { success: false };
    }
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', id);
        return { success: !error };
    } catch {
        return { success: false };
    }
}
