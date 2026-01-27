// src/app/api/tiktok/callback/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin"; // Use Admin SDK
import { Channel } from "@/types";
// No need to import Client SDK functions like addDoc, updateDoc, etc.

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This contains the userId
    const error = searchParams.get("error");

    const redirectUriEnv = process.env.TIKTOK_REDIRECT_URI!;
    const baseUrl = new URL(redirectUriEnv).origin;

    if (error || !code || !state) {
        return NextResponse.redirect(`${baseUrl}/channels?error=auth_failed`);
    }

    const userId = state;

    try {
        // 1. Exchange Code for Access Token
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
        const expiresIn = tokenData.expires_in;
        const refreshExpiresIn = tokenData.refresh_expires_in;
        const openId = tokenData.open_id;

        // 2. Fetch User Info from TikTok
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

        // 3. Prepare Channel Data
        const newChannelData: Omit<Channel, 'id'> = {
            openId: tiktokUser.open_id,
            unionId: tiktokUser.union_id || "",
            avatar: tiktokUser.avatar_url_100,
            displayName: tiktokUser.display_name,
            username: tiktokUser.username || tiktokUser.display_name.replace(/\s+/g, '').toLowerCase(),
            email: "",
            isVerified: tiktokUser.is_verified || false,
            follower: tiktokUser.follower_count || 0,
            following: tiktokUser.following_count || 0,
            like: tiktokUser.likes_count || 0,
            videoCount: tiktokUser.video_count || 0,
            userId: userId,
        };

        // 4. Save/Update Channel in Firestore using Admin SDK
        const channelsRef = adminDb.collection("channels");

        // Check if channel exists by openId
        const querySnapshot = await channelsRef.where("openId", "==", newChannelData.openId).get();

        let channelId = "";

        if (!querySnapshot.empty) {
            // Update existing channel
            const docSnapshot = querySnapshot.docs[0];
            channelId = docSnapshot.id;
            await docSnapshot.ref.update(newChannelData);
        } else {
            // Create new channel
            const docRef = await channelsRef.add({
                ...newChannelData,
                createdAt: new Date(), // Admin SDK handles native Date objects well
                updatedAt: new Date()
            });
            channelId = docRef.id;
        }

        // 5. Save/Update Token
        const tokenPayload = {
            channelId: channelId,
            openId: openId,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            refreshExpiresIn: refreshExpiresIn,
            updatedAt: new Date() // Use simple Date object for Admin SDK
        };

        const tokensRef = adminDb.collection("tokens");
        const tokenQuerySnapshot = await tokensRef.where("channelId", "==", channelId).get();

        if (!tokenQuerySnapshot.empty) {
            await tokenQuerySnapshot.docs[0].ref.update(tokenPayload);
        } else {
            await tokensRef.add(tokenPayload);
        }

        // 6. Success Redirect
        return NextResponse.redirect(`${baseUrl}/channels?success=true`);

    } catch (err) {
        console.error("TikTok Callback Error:", err);
        return NextResponse.redirect(`${baseUrl}/channels?error=processing_failed`);
    }
}