"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types/index';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    role: UserRole | null;
    isAdmin: boolean;
    isManager: boolean;
    isMember: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    role: null,
    isAdmin: false,
    isManager: false,
    isMember: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (userId: string) => {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setUser({
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role as UserRole,
                teamId: data.team_id || '',
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const role = user?.role || null;
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isMember = role === 'member';

    return (
        <AuthContext.Provider value={{ user, loading, role, isAdmin, isManager, isMember }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
