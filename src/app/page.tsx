// src/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Loader2, LayoutDashboard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
// Xóa các import Firestore cũ
import { Channel, Statistic, Team, MonthlyStatistic } from "@/types";
import { ChannelSpecificReport } from "@/components/ChannelSpecificReport";
import Image from "next/image";
// Import Server Action mới
import { getManagerDashboardData } from "@/app/actions/dashboard";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State dữ liệu
  const [team, setTeam] = useState<Team | null>(null);
  const [teamChannels, setTeamChannels] = useState<Channel[]>([]);

  // Thay allStats bằng 2 state riêng biệt rõ ràng hơn
  const [latestStats, setLatestStats] = useState<Statistic[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatistic[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- State UI ---
  const [activeTab, setActiveTab] = useState("overview");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthTab, setSelectedMonthTab] = useState(currentMonth);

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

  // --- LOGIC FETCH DATA (Dùng Server Action) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role === 'member') return;
      setIsLoadingData(true);

      try {
        // Gọi Server Action
        const data = await getManagerDashboardData(user.id, selectedYear);

        setTeam(data.team);
        setTeamChannels(data.channels);
        setLatestStats(data.latestStats);
        setMonthlyStats(data.monthlyStats);

      } catch (error) {
        console.error("Lỗi tải dữ liệu dashboard:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user, selectedYear]); // Chạy lại khi User hoặc Năm thay đổi

  // --- TÍNH TOÁN DỮ LIỆU HIỂN THỊ ---

  // 1. Data Phần 1: Tổng hợp cố định (Snapshot mới nhất - Tích lũy)
  // Lấy từ latestStats (Bảng statistics)
  const overviewFixedData = useMemo(() => {
    return teamChannels.map((channel, index) => {
      // Tìm stats mới nhất của channel này trong mảng latestStats
      const stat = latestStats.find(s => s.channelId === channel.id);

      return {
        stt: index + 1,
        id: channel.id,
        name: channel.displayName,
        username: channel.username,
        avatar: channel.avatar, // Đảm bảo channel có field avatar hoặc image
        followers: stat?.followerCount || channel.follower || 0,
        videos: stat?.videoCount || 0,
        views: stat?.totalViews || 0,
        interactions: stat?.totalInteractions || 0,
      };
    });
  }, [teamChannels, latestStats]);

  // 2. Data Phần 2: Chi tiết theo tháng
  // Lấy từ monthlyStats (Bảng monthly_statistics)
  const monthlyDataForTab = useMemo(() => {
    // Tạo key tháng cần tìm: "YYYY-MM" (Lưu ý padStart số 0)
    const targetMonthKey = `${selectedYear}-${selectedMonthTab.toString().padStart(2, '0')}`;

    return teamChannels.map(channel => {
      // Tìm bản ghi trong monthlyStats khớp channelId và monthKey
      const mStat = monthlyStats.find(s =>
        s.channelId === channel.id &&
        s.month === targetMonthKey
      );

      return {
        channelId: channel.id,
        channelName: channel.displayName,
        hasData: !!mStat, // Có dữ liệu tháng này hay không
        followers: mStat?.followerCount || 0,
        videos: mStat?.videoCount || 0,
        views: mStat?.totalViews || 0,
        interactions: mStat?.totalInteractions || 0,
      };
    });
  }, [teamChannels, monthlyStats, selectedYear, selectedMonthTab]);

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
              Dữ liệu các kênh
            </h1>
          </div>
          {team && <div className="text-sm font-medium text-zinc-500">Team: <span className="text-black dark:text-white">{team.name}</span></div>}
        </header>

        {/* Main Tabs Navigation */}
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
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">

                  {/* Phần 1: Tổng hợp cố định (Snapshot mới nhất) */}
                  <h3 className="font-bold text-lg">Thông số tổng</h3>
                  <div className="bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">Chi tiết theo tháng</h3>

                      {/* Chọn Năm - Khi đổi năm sẽ trigger useEffect fetch lại monthlyStats */}
                      <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-lg border border-zinc-200 dark:bg-black dark:border-zinc-800 shadow-sm">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="bg-transparent outline-none text-sm font-bold cursor-pointer text-white"
                        >
                          {years.map(y => <option key={y} value={y} className="bg-zinc-900 text-white">Năm {y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                      {/* Tabs Tháng */}
                      <div className="flex overflow-x-auto border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 custom-scrollbar">
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

              {/* --- TAB CHI TIẾT TỪNG KÊNH --- */}
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