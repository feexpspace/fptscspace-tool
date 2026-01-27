/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import admin from "firebase-admin";
import { Firestore } from "firebase-admin/firestore";
import { Auth } from "firebase/auth";

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Chỉ khởi tạo khi chưa có App nào chạy
if (!admin.apps.length) {
    // Chỉ thực hiện khi các biến quan trọng CÓ GIÁ TRỊ (Runtime)
    // Lúc Build, privateKey sẽ là undefined nên code trong block này sẽ bị bỏ qua
    if (privateKey && clientEmail) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        } catch (error) {
            // Vẫn nên giữ console.error ở đây để debug nếu config sai format
            console.error("Firebase Init Error:", error);
        }
    }
}

// Export an toàn: Nếu chưa init (lúc build), trả về null
export const adminDb = (admin.apps.length ? admin.firestore() : {}) as Firestore;
export const adminAuth = (admin.apps.length ? admin.auth() : {}) as Auth;