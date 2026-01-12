// src/app/actions/tiktok-token.ts
'use server'

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, Timestamp, doc } from "firebase/firestore";
import { Token, Channel } from "@/types";

export async function getValidTikTokToken(userId: string): Promise<string | null> {
    try {
        // 1. Tìm Channel của User
        const channelsRef = collection(db, "channels");
        const qChannel = query(channelsRef, where("userId", "==", userId));
        const channelSnap = await getDocs(qChannel);

        if (channelSnap.empty) return null;

        // Giả sử user có 1 channel chính (lấy cái đầu tiên)
        const channelId = channelSnap.docs[0].id;

        // 2. Lấy Token từ bảng tokens
        const tokensRef = collection(db, "tokens");
        const qToken = query(tokensRef, where("channelId", "==", channelId));
        const tokenSnap = await getDocs(qToken);

        if (tokenSnap.empty) return null;

        const tokenDoc = tokenSnap.docs[0];
        const tokenData = tokenDoc.data() as Token;

        // 3. Kiểm tra hạn sử dụng
        // updatedAt là Timestamp của Firestore, cần convert sang milliseconds
        const updatedAtMillis = tokenData.updatedAt instanceof Timestamp
            ? tokenData.updatedAt.toMillis()
            : new Date(tokenData.updatedAt).getTime();

        const expiresInMillis = tokenData.expiresIn * 1000;
        const expiryTime = updatedAtMillis + expiresInMillis;
        const now = Date.now();

        // Trừ hao 5 phút (300,000ms) để đảm bảo an toàn
        const isExpired = now >= (expiryTime - 300000);

        if (!isExpired) {
            // Token còn hạn -> Trả về luôn
            return tokenData.accessToken;
        }

        // 4. Nếu hết hạn -> Gọi TikTok API để Refresh
        console.log("Token expired, refreshing...");

        const refreshResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: tokenData.refreshToken,
            }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.error) {
            console.error("Failed to refresh token:", refreshData);
            return null;
        }

        // 5. Cập nhật Token mới vào Firestore
        const newPayload = {
            accessToken: refreshData.access_token,
            refreshToken: refreshData.refresh_token, // TikTok có thể trả về refresh token mới
            expiresIn: refreshData.expires_in,
            refreshExpiresIn: refreshData.refresh_expires_in,
            updatedAt: Timestamp.now()
        };

        await updateDoc(tokenDoc.ref, newPayload);

        // 6. Trả về Access Token mới
        return refreshData.access_token;

    } catch (error) {
        console.error("Error in getValidTikTokToken:", error);
        return null;
    }
}

export async function getAccessToken(channelId: string): Promise<string | null> {
    try {
        // 1. Tìm Token trong bảng 'tokens' khớp với channelId
        const tokensRef = collection(db, "tokens");
        const qToken = query(tokensRef, where("channelId", "==", channelId));
        const tokenSnap = await getDocs(qToken);

        if (tokenSnap.empty) {
            console.error(`Không tìm thấy token cho channelId: ${channelId}`);
            return null;
        }

        const tokenDoc = tokenSnap.docs[0];
        const tokenData = tokenDoc.data() as Token;

        // 2. Kiểm tra hạn sử dụng
        // updatedAt là Timestamp của Firestore, cần convert sang milliseconds
        const updatedAtMillis = tokenData.updatedAt instanceof Timestamp
            ? tokenData.updatedAt.toMillis()
            : new Date(tokenData.updatedAt).getTime();

        const expiresInMillis = tokenData.expiresIn * 1000;
        const expiryTime = updatedAtMillis + expiresInMillis;
        const now = Date.now();

        // Trừ hao 5 phút (300,000ms) để đảm bảo an toàn
        const isExpired = now >= (expiryTime - 300000);

        if (!isExpired) {
            // Token còn hạn -> Trả về luôn
            return tokenData.accessToken;
        }

        // 3. Nếu hết hạn -> Gọi TikTok API để Refresh
        console.log(`Token cho channel ${channelId} đã hết hạn. Đang refresh...`);

        const refreshResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: tokenData.refreshToken,
            }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.error) {
            console.error("Lỗi khi refresh token:", refreshData);
            return null;
        }

        // 4. Cập nhật Token mới vào Firestore
        // TikTok có thể trả về refresh_token mới hoặc giữ nguyên cái cũ
        const newPayload = {
            accessToken: refreshData.access_token,
            refreshToken: refreshData.refresh_token || tokenData.refreshToken,
            expiresIn: refreshData.expires_in,
            refreshExpiresIn: refreshData.refresh_expires_in,
            updatedAt: Timestamp.now()
        };

        await updateDoc(tokenDoc.ref, newPayload);

        console.log("Đã refresh token thành công!");
        return refreshData.access_token;

    } catch (error) {
        console.error("Error in getAccessToken:", error);
        return null;
    }
}