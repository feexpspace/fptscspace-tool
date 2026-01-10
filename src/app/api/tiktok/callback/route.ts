// src/app/api/tiktok/callback/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { Channel } from "@/types";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const redirectUriEnv = process.env.TIKTOK_REDIRECT_URI!;
    const baseUrl = new URL(redirectUriEnv).origin;

    if (error || !code || !state) {
        return NextResponse.redirect(`${baseUrl}/channels?error=auth_failed`);
    }

    const userId = state;

    try {
        // 1. Đổi Code lấy Access Token
        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            console.error("Token Error:", tokenData);
            throw new Error(tokenData.error_description);
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;
        const expiresIn = tokenData.expires_in; // Giây
        const refreshExpiresIn = tokenData.refresh_expires_in; // Giây
        const openId = tokenData.open_id;

        const fields = "open_id,union_id,avatar_url_100,display_name,username,follower_count,following_count,likes_count,video_count,is_verified";
        const userResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        const userDataRes = await userResponse.json();

        if (userDataRes.error && userDataRes.error.code !== "ok") {
            console.error("TikTok API Error:", userDataRes.error);
            throw new Error("Failed to fetch user info from TikTok");
        }

        const tiktokUser = userDataRes.data.user;

        const newChannelData: Omit<Channel, 'id'> = {
            openId: tiktokUser.open_id,
            unionId: tiktokUser.union_id || "",
            avatar: tiktokUser.avatar_url_100,
            displayName: tiktokUser.display_name,
            username: tiktokUser.username || tiktokUser.display_name.replace(/\s+/g, '').toLowerCase(),
            email: "", // API thường không trả email
            isVerified: tiktokUser.is_verified || false,
            follower: tiktokUser.follower_count || 0,
            following: tiktokUser.following_count || 0,
            like: tiktokUser.likes_count || 0,
            videoCount: tiktokUser.video_count || 0,
            userId: userId,
        };

        // 4. Lưu vào Firestore
        // Kiểm tra xem kênh này đã tồn tại chưa (dựa vào openId) để update hoặc create
        const channelsRef = collection(db, "channels");
        const q = query(channelsRef, where("openId", "==", newChannelData.openId));
        const querySnapshot = await getDocs(q);

        let channelId = "";

        if (!querySnapshot.empty) {
            // Đã tồn tại -> Update
            const docSnapshot = querySnapshot.docs[0];
            channelId = docSnapshot.id;
            await updateDoc(querySnapshot.docs[0].ref, newChannelData);
        } else {
            // Chưa tồn tại -> Create
            const docRef = await addDoc(channelsRef, newChannelData);
            channelId = docRef.id;
        }

        const tokenPayload = {
            channelId: channelId,
            openId: openId,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            refreshExpiresIn: refreshExpiresIn,
            updatedAt: Timestamp.now() // Lưu thời gian để tính ngày hết hạn sau này
        };

        const tokensRef = collection(db, "tokens");
        // Kiểm tra xem token của channel này đã có chưa để update đè lên
        const qToken = query(tokensRef, where("channelId", "==", channelId));
        const tokenSnapshot = await getDocs(qToken);

        if (!tokenSnapshot.empty) {
            // Đã có token -> Update
            await updateDoc(tokenSnapshot.docs[0].ref, tokenPayload);
        } else {
            // Chưa có -> Tạo mới
            await addDoc(tokensRef, tokenPayload);
        }

        // 5. Thành công -> Quay về trang Channels
        return NextResponse.redirect(`${baseUrl}/channels?success=true`);

    } catch (err) {
        console.error(err);
        return NextResponse.redirect(`${baseUrl}/channels?error=processing_failed`);
    }
}