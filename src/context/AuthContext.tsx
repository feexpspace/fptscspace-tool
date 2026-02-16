"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types/index';
import { getValidTikTokToken } from '@/app/actions/tiktok-token';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    tiktokToken: string | null;
    loading: boolean;
    refreshAccessToken: () => Promise<void>;
    role: UserRole | null;
    isAdmin: boolean;
    isManager: boolean;
    isMember: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    tiktokToken: null,
    loading: true,
    refreshAccessToken: async () => { },
    role: null,
    isAdmin: false,
    isManager: false,
    isMember: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [tiktokToken, setTiktokToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTikTokToken = async (userId: string) => {
        try {
            const token = await getValidTikTokToken(userId);
            if (token) {
                setTiktokToken(token);
                console.log("TikTok Access Token synced");
            }
        } catch (error) {
            console.error("Error fetching TikTok token:", error);
        }
    };

    useEffect(() => {
        let unsubscribeFirestore: Unsubscribe | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
            setFirebaseUser(fUser);

            // 1. Luôn hủy lắng nghe Firestore cũ trước khi xử lý user mới (tránh memory leak)
            if (unsubscribeFirestore) {
                (unsubscribeFirestore as Unsubscribe)();
                unsubscribeFirestore = null;
            }

            if (fUser) {
                setLoading(true);

                unsubscribeFirestore = onSnapshot(
                    doc(db, "users", fUser.uid),
                    async (docSnapshot) => {
                        if (docSnapshot.exists()) {
                            const userData = docSnapshot.data() as User;
                            setUser(userData);
                            fetchTikTokToken(userData.id);
                        } else {
                            setUser(null);
                            setTiktokToken(null);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Firestore error:", error);
                        setUser(null);
                        setLoading(false);
                    }
                );
            } else {
                setUser(null);
                setTiktokToken(null);
                setLoading(false);
            }
        });

        // Cleanup function của useEffect: Chạy khi component unmount
        return () => {
            unsubscribeAuth(); // Ngắt auth listener
            if (unsubscribeFirestore) {
                (unsubscribeFirestore as Unsubscribe)(); // Ngắt firestore listener nếu đang chạy
            }
        };
    }, []); // Chỉ chạy 1 lần khi mount

    const role = user?.role || null;
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isMember = role === 'member';

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            tiktokToken,
            loading,
            refreshAccessToken: async () => {
                if (user) await fetchTikTokToken(user.id);
            },
            role,
            isAdmin,
            isManager,
            isMember
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);