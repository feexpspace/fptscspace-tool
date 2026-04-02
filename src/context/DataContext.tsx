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
}

interface DataContextType {
    allVideos: Video[];
    channelTeamMap: Record<string, string>;
    allStats: ChannelStat[];
    teams: Team[];
    myChannels: ChannelInfo[]; // channels belonging to current user (for connect check + filter)
    hasChannel: boolean | null;
    dataLoading: boolean;
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
    hasChannel: null,
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
    const [dataLoading, setDataLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState("");
    const loadedForRef = useRef<string | null>(null);

    const fetchData = useCallback(async (uid: string, userRole: string, admin: boolean) => {
        setDataLoading(true);
        const [videosData, statsData, teamsData, channels] = await Promise.all([
            getAllVideos(uid, userRole),
            getAllChannelStats(uid, userRole),
            admin ? getTeamsList(uid, "admin") : Promise.resolve([]),
            getMyChannels(uid), // always check user's own channels
        ]);
        setAllVideos(videosData.videos);
        setChannelTeamMap(videosData.channelTeamMap);
        setAllStats(statsData);
        setTeams(teamsData);
        setMyChannels(channels);
        setHasChannel(channels.length > 0);
        setDataLoading(false);
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

    return (
        <DataContext.Provider value={{ allVideos, channelTeamMap, allStats, teams, myChannels, hasChannel, dataLoading, syncing, syncMsg, doSync }}>
            {children}
        </DataContext.Provider>
    );
}

export const useData = () => useContext(DataContext);
