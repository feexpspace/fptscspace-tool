// src/lib/auth-service.ts
import { supabase } from "./supabase";
import { UserRole } from "@/types/index";

export const registerUser = async (email: string, pass: string, name: string, role: UserRole = 'member') => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Không tạo được tài khoản");

        // Tạo record trong bảng users
        const { error: insertError } = await supabase.from("users").insert({
            id: data.user.id,
            email,
            name,
            role,
        });

        if (insertError) throw insertError;

        await supabase.auth.signOut();
        return { user: { id: data.user.id, email, name, role, team_id: null }, error: null };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra";
        return { user: null, error: msg };
    }
};

export const loginUser = async (email: string, pass: string) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });

        if (error) throw error;
        return { user: data.user, error: null };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra";
        return { user: null, error: msg };
    }
};

export const logoutUser = async () => {
    await supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};
