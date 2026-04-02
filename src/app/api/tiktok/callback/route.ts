// src/app/api/tiktok/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { Channel } from "@/types";

export const dynamic = 'force-dynamic';

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
        // 1. Exchange Code for Access Token
        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            console.error("Token Error:", tokenData);
            throw new Error(tokenData.error_description);
        }

        const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, refresh_expires_in: refreshExpiresIn, open_id: openId } = tokenData;

        // 2. Fetch User Info from TikTok
        const fields = "open_id,union_id,avatar_url_100,display_name,username,follower_count,following_count,likes_count,video_count,is_verified";
        const userResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        const userDataRes = await userResponse.json();
        if (userDataRes.error && userDataRes.error.code !== "ok") {
            throw new Error("Failed to fetch user info from TikTok");
        }

        const tiktokUser = userDataRes.data.user;

        // 3. Prepare Channel Data
        const channelPayload: Omit<Channel, 'id'> & { open_id: string; union_id: string; display_name: string; is_verified: boolean; video_count: number; user_id: string } = {
            openId: tiktokUser.open_id,
            open_id: tiktokUser.open_id,
            unionId: tiktokUser.union_id || "",
            union_id: tiktokUser.union_id || "",
            avatar: tiktokUser.avatar_url_100,
            displayName: tiktokUser.display_name,
            display_name: tiktokUser.display_name,
            username: tiktokUser.username || tiktokUser.display_name.replace(/\s+/g, '').toLowerCase(),
            email: "",
            isVerified: tiktokUser.is_verified || false,
            is_verified: tiktokUser.is_verified || false,
            follower: tiktokUser.follower_count || 0,
            following: tiktokUser.following_count || 0,
            like: tiktokUser.likes_count || 0,
            videoCount: tiktokUser.video_count || 0,
            video_count: tiktokUser.video_count || 0,
            userId: userId,
            user_id: userId,
        };

        // 4. Upsert Channel
        const { data: existingChannels } = await supabaseAdmin
            .from('channels')
            .select('id')
            .eq('open_id', tiktokUser.open_id);

        let channelId: string;

        if (existingChannels && existingChannels.length > 0) {
            channelId = existingChannels[0].id;
            await supabaseAdmin
                .from('channels')
                .update({
                    union_id: channelPayload.union_id,
                    avatar: channelPayload.avatar,
                    display_name: channelPayload.display_name,
                    username: channelPayload.username,
                    is_verified: channelPayload.is_verified,
                    follower: channelPayload.follower,
                    following: channelPayload.following,
                    likes: channelPayload.like,
                    video_count: channelPayload.video_count,
                    user_id: channelPayload.user_id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', channelId);
        } else {
            const { data: newChannel } = await supabaseAdmin
                .from('channels')
                .insert({
                    open_id: channelPayload.open_id,
                    union_id: channelPayload.union_id,
                    avatar: channelPayload.avatar,
                    display_name: channelPayload.display_name,
                    username: channelPayload.username,
                    email: "",
                    is_verified: channelPayload.is_verified,
                    follower: channelPayload.follower,
                    following: channelPayload.following,
                    likes: channelPayload.like,
                    video_count: channelPayload.video_count,
                    user_id: channelPayload.user_id,
                })
                .select('id')
                .single();

            if (!newChannel) throw new Error("Failed to create channel");
            channelId = newChannel.id;
        }

        // 5. Upsert Token
        await supabaseAdmin
            .from('tokens')
            .upsert({
                channel_id: channelId,
                open_id: openId,
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn,
                refresh_expires_in: refreshExpiresIn,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'channel_id' });

        return NextResponse.redirect(`${baseUrl}/?tiktok=connected`);
    } catch (err) {
        console.error("TikTok Callback Error:", err);
        return NextResponse.redirect(`${baseUrl}/?tiktok=error`);
    }
}
