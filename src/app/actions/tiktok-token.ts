// src/app/actions/tiktok-token.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // Dùng Admin SDK
import { Timestamp } from "firebase-admin/firestore"; // Timestamp Admin
import { Token } from "@/types";

/**
 * Hàm nội bộ: Xử lý logic kiểm tra hạn và refresh token
 */
async function refreshAndReturnToken(tokenDocId: string, tokenData: Token): Promise<string | null> {
    try {
        // 1. Kiểm tra hạn sử dụng
        // Admin SDK trả về Timestamp object, convert sang Millis
        const updatedAtMillis = tokenData.updatedAt instanceof Timestamp
            ? tokenData.updatedAt.toMillis()
            // Fallback nếu dữ liệu cũ lưu dạng string/date
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

        // 2. Nếu hết hạn -> Gọi TikTok API để Refresh
        console.log(`Token ${tokenDocId} expired. Refreshing...`);

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

        // 3. Cập nhật Token mới vào Firestore (Dùng Admin SDK)
        const newPayload = {
            accessToken: refreshData.access_token,
            // TikTok có thể trả về refresh token mới, hoặc giữ cũ. Ưu tiên cái mới.
            refreshToken: refreshData.refresh_token || tokenData.refreshToken,
            expiresIn: refreshData.expires_in,
            refreshExpiresIn: refreshData.refresh_expires_in,
            updatedAt: Timestamp.now()
        };

        await adminDb.collection("tokens").doc(tokenDocId).update(newPayload);
        console.log("Refresh token success!");

        return refreshData.access_token;
    } catch (e) {
        console.error("Internal refresh logic error:", e);
        return null;
    }
}

/**
 * Lấy Access Token hợp lệ dựa trên Channel ID
 */
export async function getAccessToken(channelId: string): Promise<string | null> {
    try {
        const tokensRef = adminDb.collection("tokens");
        const snapshot = await tokensRef.where("channelId", "==", channelId).limit(1).get();

        if (snapshot.empty) {
            console.error(`Token not found for channel: ${channelId}`);
            return null;
        }

        const doc = snapshot.docs[0];
        const tokenData = doc.data() as Token;

        return await refreshAndReturnToken(doc.id, tokenData);
    } catch (error) {
        console.error("Error getAccessToken:", error);
        return null;
    }
}

/**
 * Lấy Access Token hợp lệ dựa trên User ID (Tìm channel của user trước)
 */
export async function getValidTikTokToken(userId: string): Promise<string | null> {
    try {
        // 1. Tìm Channel của User bằng Admin SDK
        const channelsRef = adminDb.collection("channels");
        const channelSnap = await channelsRef.where("userId", "==", userId).limit(1).get();

        if (channelSnap.empty) {
            console.error(`Channel not found for user: ${userId}`);
            return null;
        }

        // Giả sử user có 1 channel chính (lấy cái đầu tiên)
        const channelId = channelSnap.docs[0].id;

        // 2. Gọi lại hàm lấy token theo channelId
        return await getAccessToken(channelId);

    } catch (error) {
        console.error("Error getValidTikTokToken:", error);
        return null;
    }
}