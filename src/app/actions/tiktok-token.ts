// src/app/actions/tiktok-token.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase-server";
import { Token } from "@/types";

async function refreshAndReturnToken(tokenId: string, tokenData: Token): Promise<string | null> {
    try {
        const updatedAtMillis = new Date(tokenData.updatedAt).getTime();
        const expiresInMillis = tokenData.expiresIn * 1000;
        const expiryTime = updatedAtMillis + expiresInMillis;
        const now = Date.now();
        const isExpired = now >= (expiryTime - 300000); // 5 min buffer

        if (!isExpired) return tokenData.accessToken;

        console.log(`Token ${tokenId} expired. Refreshing...`);

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

        await supabaseAdmin
            .from('tokens')
            .update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || tokenData.refreshToken,
                expires_in: refreshData.expires_in,
                refresh_expires_in: refreshData.refresh_expires_in,
                updated_at: new Date().toISOString(),
            })
            .eq('id', tokenId);

        console.log("Refresh token success!");
        return refreshData.access_token;
    } catch (e) {
        console.error("Internal refresh logic error:", e);
        return null;
    }
}

export async function getAccessToken(channelId: string): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('tokens')
            .select('*')
            .eq('channel_id', channelId)
            .single();

        if (error || !data) {
            console.error(`Token not found for channel: ${channelId}`);
            return null;
        }

        const tokenData: Token = {
            id: data.id,
            channelId: data.channel_id,
            openId: data.open_id,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            refreshExpiresIn: data.refresh_expires_in,
            updatedAt: new Date(data.updated_at),
        };

        return await refreshAndReturnToken(data.id, tokenData);
    } catch (error) {
        console.error("Error getAccessToken:", error);
        return null;
    }
}

export async function getValidTikTokToken(userId: string): Promise<string | null> {
    try {
        const { data: channel } = await supabaseAdmin
            .from('channels')
            .select('id')
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (!channel) {
            console.error(`Channel not found for user: ${userId}`);
            return null;
        }

        return await getAccessToken(channel.id);
    } catch (error) {
        console.error("Error getValidTikTokToken:", error);
        return null;
    }
}
