"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types/index';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
            setFirebaseUser(fUser);

            if (fUser) {
                // Nếu đã đăng nhập, lấy thêm thông tin chi tiết (role, teamId) từ Firestore
                try {
                    const userDoc = await getDoc(doc(db, "users", fUser.uid));
                    if (userDoc.exists()) {
                        setUser(userDoc.data() as User);
                    }
                } catch (error) {
                    console.error("Lỗi khi lấy thông tin user:", error);
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Hook để sử dụng AuthContext nhanh
export const useAuth = () => useContext(AuthContext);