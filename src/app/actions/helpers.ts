// src/app/actions/helpers.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Channel, Team } from "@/types";
import { chunkArray } from "@/lib/utils";

/**
 * Lấy danh sách channelIds thuộc 1 team (thông qua members + managers → channels)
 */
export async function getChannelIdsForTeam(teamId: string): Promise<string[]> {
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) return [];

    const data = teamDoc.data()!;
    const members: string[] = Array.isArray(data.members) ? data.members : [];
    const managers: string[] = Array.isArray(data.managerIds) ? data.managerIds : [];
    const allUserIds = Array.from(new Set([...members, ...managers]));

    if (allUserIds.length === 0) return [];

    return getChannelIdsForUsers(allUserIds);
}

/**
 * Lấy danh sách channelIds từ danh sách userIds
 */
export async function getChannelIdsForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    const userChunks = chunkArray(userIds, 10);
    const channelPromises = userChunks.map(chunk =>
        adminDb.collection("channels").where("userId", "in", chunk).get()
    );
    const snapshots = await Promise.all(channelPromises);

    return snapshots.flatMap(snap => snap.docs.map(doc => doc.id));
}

/**
 * Lấy danh sách channels từ danh sách userIds (trả về full Channel objects)
 */
export async function getChannelsForUsers(userIds: string[]): Promise<Channel[]> {
    if (userIds.length === 0) return [];

    const userChunks = chunkArray(userIds, 10);
    const channelPromises = userChunks.map(chunk =>
        adminDb.collection("channels").where("userId", "in", chunk).get()
    );
    const snapshots = await Promise.all(channelPromises);

    return snapshots.flatMap(snap =>
        snap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
            } as unknown as Channel;
        })
    );
}

/**
 * Lấy danh sách teams dựa trên role
 */
export async function getTeamsList(userId: string, role: string): Promise<Team[]> {
    let teamDocs: FirebaseFirestore.DocumentData[] = [];

    if (role === 'admin') {
        const snap = await adminDb.collection("teams").get();
        teamDocs = snap.docs;
    } else if (role === 'manager') {
        const snap = await adminDb.collection("teams")
            .where("managerIds", "array-contains", userId)
            .get();
        teamDocs = snap.docs;
    } else {
        return [];
    }

    return teamDocs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        } as unknown as Team;
    });
}

/**
 * Lấy tất cả user IDs thuộc 1 team hoặc tất cả teams
 */
export async function getUserIdsForScope(
    role: string,
    userId: string,
    teamId?: string
): Promise<string[]> {
    const allUserIds = new Set<string>();

    if (teamId) {
        const teamDoc = await adminDb.collection("teams").doc(teamId).get();
        if (teamDoc.exists) {
            const data = teamDoc.data()!;
            const members: string[] = data.members || [];
            const managers: string[] = data.managerIds || [];
            members.forEach(id => allUserIds.add(id));
            managers.forEach(id => allUserIds.add(id));
        }
    } else if (role === 'admin') {
        const snap = await adminDb.collection("teams").get();
        snap.docs.forEach(doc => {
            const data = doc.data();
            (data.members || []).forEach((id: string) => allUserIds.add(id));
            (data.managerIds || []).forEach((id: string) => allUserIds.add(id));
        });
    } else if (role === 'member') {
        allUserIds.add(userId);
    }

    return Array.from(allUserIds);
}
