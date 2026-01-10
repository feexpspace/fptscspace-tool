"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types/index';
import { getValidTikTokToken } from '@/app/actions/tiktok-token';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    tiktokToken: string | null;
    loading: boolean;
    refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    tiktokToken: null,
    loading: true,
    refreshAccessToken: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [tiktokToken, setTiktokToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTikTokToken = async (userId: string) => {
        const token = await getValidTikTokToken(userId);
        if (token) {
            setTiktokToken(token);
            console.log("TikTok Access Token synced to Context");
        }
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
            setFirebaseUser(fUser);

            if (fUser) {
                setLoading(true);
                // 1. Lắng nghe thông tin User từ Firestore
                const unsubscribeFirestore = onSnapshot(doc(db, "users", fUser.uid), async (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data() as User;
                        setUser(userData);

                        // 2. KHI ĐÃ CÓ USER -> GỌI SERVER ACTION LẤY TOKEN
                        // Việc này chạy ngầm và update state sau khi hoàn tất
                        await fetchTikTokToken(userData.id);
                    } else {
                        setUser(null);
                        setTiktokToken(null);
                    }
                    setLoading(false);
                });

                return () => unsubscribeFirestore();
            } else {
                setUser(null);
                setTiktokToken(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            tiktokToken, // Expose token ra ngoài
            loading,
            refreshAccessToken: async () => {
                if (user) await fetchTikTokToken(user.id);
            }
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Hook để sử dụng AuthContext nhanh
export const useAuth = () => useContext(AuthContext);