"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types/index';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    role: UserRole | null;
    isAdmin: boolean;
    isManager: boolean;
    isMember: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    role: null,
    isAdmin: false,
    isManager: false,
    isMember: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeFirestore: Unsubscribe | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
            setFirebaseUser(fUser);

            if (unsubscribeFirestore) {
                (unsubscribeFirestore as Unsubscribe)();
                unsubscribeFirestore = null;
            }

            if (fUser) {
                setLoading(true);

                unsubscribeFirestore = onSnapshot(
                    doc(db, "users", fUser.uid),
                    (docSnapshot) => {
                        if (docSnapshot.exists()) {
                            const userData = docSnapshot.data() as User;
                            setUser(userData);
                        } else {
                            setUser(null);
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
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) {
                (unsubscribeFirestore as Unsubscribe)();
            }
        };
    }, []);

    const role = user?.role || null;
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const isMember = role === 'member';

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
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
