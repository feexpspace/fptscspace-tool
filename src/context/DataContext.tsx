"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getAllVideos } from "@/app/actions/videos";
import { getAllChannelStats, ChannelStat } from "@/app/actions/stats";
import { getTeamsList } from "@/app/actions/helpers";
import { syncAllChannels, syncMyChannels, getMyChannels } from "@/app/actions/report";
import { Video, Team } from "@/types";

export interface ChannelInfo {
    id: string;
    displayName: string;
    username: string;
    avatar?: string;
}

interface DataContextType {
    allVideos: Video[];
    channelTeamMap: Record<string, string>;
    allStats: ChannelStat[];
    teams: Team[];
    myChannels: ChannelInfo[];
    myChannelAvatar: string | null; // avatar của kênh TikTok đầu tiên
    hasChannel: boolean | null;
    // Granular loading states
    metaLoading: boolean;   // teams, stats, channels — loads first (fast)
    videosLoading: boolean; // videos — loads second (can be slow)
    dataLoading: boolean;   // combined: true if either is loading
    syncing: boolean;
    syncMsg: string;
    doSync: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
    allVideos: [],
    channelTeamMap: {},
    allStats: [],
    teams: [],
    myChannels: [],
    myChannelAvatar: null,
    hasChannel: null,
    metaLoading: true,
    videosLoading: true,
    dataLoading: true,
    syncing: false,
    syncMsg: "",
    doSync: async () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user, role, isAdmin, isPending } = useAuth();
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [channelTeamMap, setChannelTeamMap] = useState<Record<string, string>>({});
    const [allStats, setAllStats] = useState<ChannelStat[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [myChannels, setMyChannels] = useState<ChannelInfo[]>([]);
    const [hasChannel, setHasChannel] = useState<boolean | null>(null);
    const [metaLoading, setMetaLoading] = useState(false);
    const [videosLoading, setVideosLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState("");
    const loadedForRef = useRef<string | null>(null);

    const fetchData = useCallback(async (uid: string, userRole: string, admin: boolean) => {
        // Phase 1: Load meta (stats, teams, channels) — fast, show immediately
        setMetaLoading(true);
        setVideosLoading(true);

        const [statsData, teamsData, channels] = await Promise.all([
            getAllChannelStats(uid, userRole),
            admin ? getTeamsList(uid, "admin") : Promise.resolve([]),
            getMyChannels(uid),
        ]);
        setAllStats(statsData);
        setTeams(teamsData);
        setMyChannels(channels);
        setHasChannel(channels.length > 0);
        setMetaLoading(false);

        // Phase 2: Load videos — can be slow, show skeleton in UI meanwhile
        const videosData = await getAllVideos(uid, userRole);
        setAllVideos(videosData.videos);
        setChannelTeamMap(videosData.channelTeamMap);
        setVideosLoading(false);
    }, []);

    useEffect(() => {
        if (!user || !role || isPending) return;
        if (loadedForRef.current === user.id) return;
        loadedForRef.current = user.id;
        fetchData(user.id, role, isAdmin);
    }, [user?.id, role, isPending, isAdmin, fetchData]);

    const doSync = useCallback(async () => {
        if (!user || !role) return;
        setSyncing(true);
        setSyncMsg("");
        const result = isAdmin ? await syncAllChannels() : await syncMyChannels(user.id);
        setSyncMsg(result.message);
        if (result.success) {
            loadedForRef.current = null;
            await fetchData(user.id, role, isAdmin);
        }
        setSyncing(false);
    }, [user?.id, role, isAdmin, fetchData]);

    const dataLoading = metaLoading || videosLoading;
    // Avatar từ kênh TikTok đầu tiên (member)
    const myChannelAvatar = myChannels[0]?.avatar ?? null;

    return (
        <DataContext.Provider value={{
            allVideos, channelTeamMap, allStats, teams, myChannels, myChannelAvatar, hasChannel,
            metaLoading, videosLoading, dataLoading, syncing, syncMsg, doSync,
        }}>
            {children}
        </DataContext.Provider>
    );
}

export const useData = () => useContext(DataContext);
