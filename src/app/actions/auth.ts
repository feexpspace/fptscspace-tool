'use server'

import { supabaseAdmin } from "@/lib/supabase-server";

export async function registerUserAction(email: string, password: string, name: string) {
    try {
        // Create auth user via admin API — skips email confirmation entirely
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Không tạo được tài khoản");

        // Insert user profile with pending status
        const { error: insertError } = await supabaseAdmin.from("users").insert({
            id: data.user.id,
            email,
            name,
            role: 'member',
            status: 'pending',
        });

        if (insertError) {
            // Rollback: delete the auth user if profile insert fails
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            throw insertError;
        }

        return { success: true, error: null };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra";
        return { success: false, error: msg };
    }
}
