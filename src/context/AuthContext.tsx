"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types/index';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    role: UserRole | null;
    isAdmin: boolean;
    isMember: boolean;
    isPending: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    role: null,
    isAdmin: false,
    isMember: false,
    isPending: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const lastUserIdRef = useRef<string | null>(null);

    const fetchUserProfile = async (userId: string) => {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (data) {
            // Preserve object reference if nothing changed — prevents unnecessary re-renders
            setUser(prev => {
                if (
                    prev?.id === data.id &&
                    prev?.role === data.role &&
                    prev?.status === data.status &&
                    prev?.teamId === (data.team_id || '')
                ) return prev;
                return {
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: data.role as UserRole,
                    teamId: data.team_id || '',
                    status: data.status || 'pending',
                };
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const uid = session?.user?.id || null;
            lastUserIdRef.current = uid;
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes — skip TOKEN_REFRESHED for same user
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const uid = session?.user?.id || null;
            if (uid === lastUserIdRef.current) return; // Same user, no need to re-fetch
            lastUserIdRef.current = uid;
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
    const isMember = role === 'member';
    const isPending = user?.status === 'pending';

    return (
        <AuthContext.Provider value={{ user, loading, role, isAdmin, isMember, isPending }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
