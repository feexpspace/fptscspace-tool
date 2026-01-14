// src/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Loader2, LayoutDashboard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Channel, Statistic, Team } from "@/types";
import { ChannelSpecificReport } from "@/components/ChannelSpecificReport";
import Image from "next/image";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [teamChannels, setTeamChannels] = useState<Channel[]>([]);
  const [allStats, setAllStats] = useState<Statistic[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- State cho Tabs Chính (Overview vs Các kênh) ---
  const [activeTab, setActiveTab] = useState("overview");

  // --- State cho Tab Tổng quan (Overview) ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthTab, setSelectedMonthTab] = useState(currentMonth); // State mới để chọn tháng hiển thị

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // --- LOGIC AUTH ---
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
      } else if (user.role === 'member') {
        router.push("/teams");
      }
    }
  }, [user, loading, router]);

  // --- LOGIC FETCH DATA (Manager Only) ---
  useEffect(() => {
    const fetchManagerData = async () => {
      if (!user || user.role === 'member') return;
      setIsLoadingData(true);

      try {
        // 1. Lấy Team do Manager quản lý
        const qTeam = query(collection(db, "teams"), where("managerId", "==", user.id));
        const teamSnap = await getDocs(qTeam);

        if (teamSnap.empty) {
          setIsLoadingData(false);
          return;
        }

        const myTeam = { id: teamSnap.docs[0].id, ...teamSnap.docs[0].data() } as Team;
        setTeam(myTeam);

        // 2. Lấy members
        const memberIds = myTeam.members || [];
        if (!memberIds.includes(user.id)) memberIds.push(user.id);

        if (memberIds.length === 0) {
          setIsLoadingData(false);
          return;
        }

        // 3. Lấy Channels
        const channelsRef = collection(db, "channels");
        const channelChunks = [];
        for (let i = 0; i < memberIds.length; i += 10) {
          channelChunks.push(memberIds.slice(i, i + 10));
        }

        let allChannels: Channel[] = [];
        for (const chunk of channelChunks) {
          const qChannel = query(channelsRef, where("userId", "in", chunk));
          const snap = await getDocs(qChannel);
          const chunkChannels = snap.docs.map(d => ({ id: d.id, ...d.data() } as Channel));
          allChannels = [...allChannels, ...chunkChannels];
        }
        setTeamChannels(allChannels);

        // 4. Lấy Statistics
        if (allChannels.length > 0) {
          const statsRef = collection(db, "statistics");
          const channelIds = allChannels.map(c => c.id);

          const statChunks = [];
          for (let i = 0; i < channelIds.length; i += 10) {
            statChunks.push(channelIds.slice(i, i + 10));
          }

          let allStatsData: Statistic[] = [];
          for (const chunk of statChunks) {
            const qStat = query(statsRef, where("channelId", "in", chunk));
            const snap = await getDocs(qStat);
            const chunkStats = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
              } as Statistic;
            });
            allStatsData = [...allStatsData, ...chunkStats];
          }
          setAllStats(allStatsData);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchManagerData();
  }, [user]);

  // --- TÍNH TOÁN DỮ LIỆU TAB 1 (OVERVIEW) ---

  // 1. Data Phần 1 (Snapshot mới nhất - Tích lũy)
  const overviewFixedData = useMemo(() => {
    return teamChannels.map((channel, index) => {
      const cStats = allStats.filter(s => s.channelId === channel.id);
      cStats.sort((a, b) => b.date.getTime() - a.date.getTime());
      const latestStat = cStats[0];

      return {
        stt: index + 1,
        id: channel.id,
        name: channel.displayName,
        username: channel.username,
        avatar: channel.avatar,
        followers: channel.follower,
        videos: channel.videoCount,
        views: latestStat ? latestStat.totalViews : 0,
        interactions: latestStat ? latestStat.totalInteractions : (channel.like),
      };
    });
  }, [teamChannels, allStats]);

  // 2. Data Phần 2 (Monthly - Chỉ tính toán cho tháng đang được chọn tab)
  const monthlyDataForTab = useMemo(() => {
    // Tìm stats cho các kênh trong tháng đang chọn (selectedMonthTab) của năm (selectedYear)
    return teamChannels.map(channel => {
      const stats = allStats.filter(s =>
        s.channelId === channel.id &&
        s.date.getFullYear() === selectedYear &&
        (s.date.getMonth() + 1) === selectedMonthTab
      );

      // Lấy snapshot cuối cùng của tháng đó
      stats.sort((a, b) => b.date.getTime() - a.date.getTime());
      const finalStat = stats[0];

      return {
        channelId: channel.id,
        channelName: channel.displayName,
        hasData: !!finalStat,
        followers: finalStat?.followerCount || 0,
        videos: finalStat?.videoCount || 0,
        views: finalStat?.totalViews || 0,
        interactions: finalStat?.totalInteractions || 0,
      };
    });
  }, [teamChannels, allStats, selectedYear, selectedMonthTab]);


  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!user || user.role === 'member') return null;

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between border-b border-zinc-200 px-6 bg-white dark:bg-black dark:border-zinc-800 shrink-0">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Manager Dashboard
            </h1>
          </div>
          {team && <div className="text-sm font-medium text-zinc-500">Team: <span className="text-black dark:text-white">{team.name}</span></div>}
        </header>

        {/* Main Tabs Navigation (Overview | Kênh A | Kênh B...) */}
        <div className="bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800 px-6 pt-4 flex items-center gap-6 overflow-x-auto shrink-0 no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "pb-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === "overview"
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            Tổng quan Team
          </button>
          {teamChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveTab(channel.id)}
              className={cn(
                "pb-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2",
                activeTab === channel.id
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
            >
              <div className="h-5 w-5 rounded-full bg-zinc-200 relative overflow-hidden">
                {channel.avatar && <Image src={channel.avatar} alt="" fill className="object-cover" />}
              </div>
              {channel.displayName}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950">
          {isLoadingData ? (
            <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-8 w-8 text-zinc-400" /></div>
          ) : (
            <>
              {/* --- TAB 1: OVERVIEW --- */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">

                  {/* Phần 1: Tổng hợp cố định (Snapshot mới nhất) */}
                  <div className="bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <h3 className="font-bold text-base">Tổng hợp Kênh (Tích lũy)</h3>
                      <p className="text-xs text-zinc-500">Số liệu mới nhất được cập nhật từ hệ thống.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                          <tr>
                            <th className="px-6 py-3 w-12">STT</th>
                            <th className="px-6 py-3">Tên Kênh</th>
                            <th className="px-6 py-3 text-right">Followers</th>
                            <th className="px-6 py-3 text-right">Videos (Tổng)</th>
                            <th className="px-6 py-3 text-right">Views (Tổng)</th>
                            <th className="px-6 py-3 text-right">Tương tác (Tổng)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {overviewFixedData.map((row) => (
                            <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                              <td className="px-6 py-4 text-zinc-500">{row.stt}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-zinc-200 relative overflow-hidden">
                                    {row.avatar && <Image src={row.avatar} alt="" fill className="object-cover" />}
                                  </div>
                                  <div>
                                    <div className="font-bold">{row.name}</div>
                                    <div className="text-xs text-zinc-500">@{row.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-right">{row.followers.toLocaleString()}</td>
                              <td className="px-6 py-4 font-medium text-right">{row.videos.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-bold tabular-nums text-blue-600">{row.views.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-bold tabular-nums text-green-600">{row.interactions.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Phần 2: Chi tiết theo tháng (Dạng Tabs) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">Chi tiết theo tháng</h3>

                      {/* Chọn Năm */}
                      <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-lg border border-zinc-200 dark:bg-black dark:border-zinc-800 shadow-sm">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="bg-transparent outline-none text-sm font-bold cursor-pointer"
                        >
                          {years.map(y => <option key={y} value={y} className="bg-zinc-900 text-white">Năm {y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                      {/* Tabs Tháng */}
                      <div className="flex overflow-x-auto border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50
                        [&::-webkit-scrollbar]:h-2
                        [&::-webkit-scrollbar-track]:bg-zinc-100
                        dark:[&::-webkit-scrollbar-track]:bg-zinc-950
                        [&::-webkit-scrollbar-thumb]:bg-zinc-300
                        dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400
                        dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600
                      ">
                        {months.map((m) => (
                          <button
                            key={m}
                            onClick={() => setSelectedMonthTab(m)}
                            className={cn(
                              "px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                              selectedMonthTab === m
                                ? "border-black text-black bg-white dark:bg-zinc-800 dark:border-white dark:text-white"
                                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            Tháng {m}
                          </button>
                        ))}
                      </div>

                      {/* Bảng dữ liệu của Tháng đang chọn */}
                      <div className="overflow-x-auto p-0">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                            <tr>
                              <th className="px-6 py-3 font-semibold w-12">#</th>
                              <th className="px-6 py-3 font-semibold">Tên Kênh</th>
                              <th className="px-6 py-3 font-semibold text-right">Followers</th>
                              <th className="px-6 py-3 font-semibold text-right">Videos</th>
                              <th className="px-6 py-3 font-semibold text-right">Views</th>
                              <th className="px-6 py-3 font-semibold text-right">Tương tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {monthlyDataForTab.map((c, idx) => (
                              <tr key={c.channelId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                <td className="px-6 py-4 text-zinc-400">{idx + 1}</td>
                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{c.channelName}</td>
                                <td className="px-6 py-4 text-right text-zinc-500">
                                  {c.hasData ? c.followers.toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right text-zinc-500">
                                  {c.hasData ? c.videos.toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium">
                                  {c.hasData ? c.views.toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-500">
                                  {c.hasData ? c.interactions.toLocaleString() : "-"}
                                </td>
                              </tr>
                            ))}
                            {monthlyDataForTab.every(d => !d.hasData) && (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 italic">
                                  Chưa có dữ liệu thống kê cho Tháng {selectedMonthTab}/{selectedYear}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB CHI TIẾT TỪNG KÊNH (GIỮ NGUYÊN) --- */}
              {teamChannels.map(channel => (
                activeTab === channel.id && (
                  <div key={channel.id} className="animate-in fade-in slide-in-from-right-4">
                    <ChannelSpecificReport channel={channel} user={user} />
                  </div>
                )
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}