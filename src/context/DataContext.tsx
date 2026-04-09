"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getAllVideos } from "@/app/actions/videos";
import { getAllChannelStats, ChannelStat } from "@/app/actions/stats";
import { getTeamsList } from "@/app/actions/helpers";
import { getProjects } from "@/app/actions/project";
import { syncAllChannels, syncMyChannels, getMyChannels } from "@/app/actions/report";
import { Video, Team, Project } from "@/types";

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
    projects: Project[];
    myChannels: ChannelInfo[];
    myChannelAvatar: string | null;
    hasChannel: boolean | null;
    // Granular loading states
    metaLoading: boolean;
    videosLoading: boolean;
    dataLoading: boolean;
    syncing: boolean;
    syncMsg: string;
    doSync: () => Promise<void>;
    updateVideoLocal: (videoId: string, updates: Partial<Video>) => void;
}

const DataContext = createContext<DataContextType>({
    allVideos: [],
    channelTeamMap: {},
    allStats: [],
    teams: [],
    projects: [],
    myChannels: [],
    myChannelAvatar: null,
    hasChannel: null,
    metaLoading: true,
    videosLoading: true,
    dataLoading: true,
    syncing: false,
    syncMsg: "",
    doSync: async () => {},
    updateVideoLocal: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user, role, isAdmin, isPending } = useAuth();
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [channelTeamMap, setChannelTeamMap] = useState<Record<string, string>>({});
    const [allStats, setAllStats] = useState<ChannelStat[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [myChannels, setMyChannels] = useState<ChannelInfo[]>([]);
    const [hasChannel, setHasChannel] = useState<boolean | null>(null);
    const [metaLoading, setMetaLoading] = useState(false);
    const [videosLoading, setVideosLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState("");
    const loadedForRef = useRef<string | null>(null);

    const fetchData = useCallback(async (uid: string, userRole: string, admin: boolean) => {
        setMetaLoading(true);
        setVideosLoading(true);

        const [statsData, teamsData, channels, projectsData] = await Promise.all([
            getAllChannelStats(uid, userRole),
            admin ? getTeamsList(uid, "admin") : Promise.resolve([]),
            getMyChannels(uid),
            getProjects(),
        ]);
        setAllStats(statsData);
        setTeams(teamsData);
        setMyChannels(channels);
        setHasChannel(channels.length > 0);
        setProjects(projectsData);
        setMetaLoading(false);

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

    const updateVideoLocal = useCallback((videoId: string, updates: Partial<Video>) => {
        setAllVideos(prev => prev.map(v => v.id === videoId ? { ...v, ...updates } : v));
    }, []);

    const dataLoading = metaLoading || videosLoading;
    const myChannelAvatar = myChannels[0]?.avatar ?? null;

    return (
        <DataContext.Provider value={{
            allVideos, channelTeamMap, allStats, teams, projects, myChannels, myChannelAvatar, hasChannel,
            metaLoading, videosLoading, dataLoading, syncing, syncMsg, doSync, updateVideoLocal,
        }}>
            {children}
        </DataContext.Provider>
    );
}

export const useData = () => useContext(DataContext);
