/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/auth-service.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase"; // Sử dụng auth và db từ file firebase.ts đã có
import { User, UserRole } from "@/types/index";

/**
 * Đăng ký tài khoản mới và lưu thông tin vào Firestore
 */
export const registerUser = async (email: string, pass: string, name: string, role: UserRole = 'member') => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;

        // Cập nhật Display Name trong Firebase Auth
        await updateProfile(firebaseUser, { displayName: name });

        // Tạo document user trong Firestore theo cấu trúc đã định nghĩa
        const userData: User = {
            id: firebaseUser.uid,
            email: email,
            name: name,
            role: role,
            teamId: "" // Sẽ cập nhật sau khi join team
        };

        await setDoc(doc(db, "users", firebaseUser.uid), userData);
        await signOut(auth);
        return { user: userData, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
};

/**
 * Đăng nhập
 */
export const loginUser = async (email: string, pass: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return { user: userCredential.user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
};

/**
 * Đăng xuất
 */
export const logoutUser = async () => {
    await signOut(auth);
};