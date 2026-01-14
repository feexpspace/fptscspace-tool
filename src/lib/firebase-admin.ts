import "server-only";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Dùng lại ID public cũng được
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Quan trọng: Thay thế ký tự \n để key hợp lệ
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export const adminDb = admin.firestore();