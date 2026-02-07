// src/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Loader2, LayoutDashboard, Calendar, ChevronDown, Users, RefreshCw } from "lucide-react"; // Bỏ icon Filter thừa
import { cn } from "@/lib/utils";
import { Channel, Statistic, Team, MonthlyStatistic } from "@/types";
import { ChannelSpecificReport } from "@/components/ChannelSpecificReport";
import Image from "next/image";
// Import Server Action
import { getDashboardData, getTeamsList, syncAllChannels } from "@/app/actions/dashboard";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function Home() {
  const { user, isAdmin, isManager, loading } = useAuth();
  const router = useRouter();

  // --- State Data ---
  const [team, setTeam] = useState<Team | null>(null);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [teamChannels, setTeamChannels] = useState<Channel[]>([]);
  const [latestStats, setLatestStats] = useState<Statistic[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatistic[]>([]);

  // --- State Filter ---
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  // --- State UI ---
  const [activeTab, setActiveTab] = useState("overview");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthTab, setSelectedMonthTab] = useState(currentMonth);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    variant: 'danger' | 'info' | 'warning';
    onConfirm: () => Promise<void>;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: null,
    variant: 'info',
    onConfirm: async () => { },
  });

  // 1. LOGIC AUTH & FETCH LIST TEAMS
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
        return;
      } else if (!isAdmin && !isManager) {
        router.push("/teams");
        return;
      }

      const fetchTeamsList = async () => {
        try {
          const data = await getTeamsList(user.id, user.role);
          setTeamsList(data);
        } catch (error) {
          console.error("Lỗi lấy danh sách team:", error);
        }
      };
      fetchTeamsList();
    }
  }, [user, loading, router, isAdmin, isManager]);

  // 2. MAIN DATA FETCHING
  const fetchDashboardData = async () => {
    if (!user || (!isAdmin && !isManager)) return;
    setIsLoadingData(true);
    try {
      const data = await getDashboardData(selectedYear, selectedTeamId, user.id, user.role);
      setTeam(data.team);
      setTeamChannels(data.channels);
      setLatestStats(data.latestStats);
      setMonthlyStats(data.monthlyStats);
      setActiveTab("overview");
    } catch (error) {
      console.error("Lỗi tải dữ liệu dashboard:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // useEffect gọi fetch lần đầu và khi filter thay đổi
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedYear, selectedTeamId, isAdmin, isManager]);

  // --- HÀM XỬ LÝ ĐỒNG BỘ ---
  const handleSyncAllClick = () => {
    if (!user || isSyncingAll) return;

    const messageText = selectedTeamId
      ? "Bạn có chắc muốn đồng bộ tất cả kênh trong Team này? Quá trình có thể mất vài phút."
      : "Bạn có chắc muốn đồng bộ TOÀN BỘ kênh trên hệ thống? Quá trình có thể mất nhiều thời gian.";

    setConfirmConfig({
      isOpen: true,
      title: "Đồng bộ dữ liệu TikTok",
      message: messageText,
      variant: 'info',
      confirmText: "Bắt đầu Đồng bộ",
      onConfirm: async () => {
        setIsSyncingAll(true);
        try {
          const res = await syncAllChannels(user.id, selectedTeamId, user.role);

          // Sau khi chạy xong, mở modal thông báo kết quả
          if (res.success) {
            await fetchDashboardData(); // Refresh data
            setConfirmConfig({
              isOpen: true,
              title: "Thành công",
              message: `Đã hoàn tất đồng bộ ${res.count} kênh.`,
              variant: 'info',
              confirmText: "Đóng",
              cancelText: "", // Ẩn nút hủy để thành modal thông báo đơn
              onConfirm: async () => { setConfirmConfig(prev => ({ ...prev, isOpen: false })) }
            });
          } else {
            setConfirmConfig({
              isOpen: true,
              title: "Lỗi",
              message: `Có lỗi xảy ra: ${res.error}`,
              variant: 'danger',
              confirmText: "Đóng",
              cancelText: "",
              onConfirm: async () => { setConfirmConfig(prev => ({ ...prev, isOpen: false })) }
            });
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsSyncingAll(false);
        }
      }
    });
  };

  // --- TÍNH TOÁN DỮ LIỆU HIỂN THỊ ---
  const overviewFixedData = useMemo(() => {
    return teamChannels.map((channel, index) => {
      const stat = latestStats.find(s => s.channelId === channel.id);
      return {
        stt: index + 1,
        id: channel.id,
        name: channel.displayName,
        username: channel.username,
        avatar: channel.avatar,
        followers: stat?.followerCount || channel.follower || 0,
        videos: stat?.videoCount || 0,
        views: stat?.totalViews || 0,
        interactions: stat?.totalInteractions || 0,
      };
    });
  }, [teamChannels, latestStats]);

  const monthlyDataForTab = useMemo(() => {
    const targetMonthKey = `${selectedYear}-${selectedMonthTab.toString().padStart(2, '0')}`;
    return teamChannels.map(channel => {
      const mStat = monthlyStats.find(s =>
        s.channelId === channel.id &&
        s.month === targetMonthKey
      );
      return {
        channelId: channel.id,
        channelName: channel.displayName,
        hasData: !!mStat,
        followers: mStat?.followerCount || 0,
        videos: mStat?.videoCount || 0,
        views: mStat?.totalViews || 0,
        interactions: mStat?.totalInteractions || 0,
      };
    });
  }, [teamChannels, monthlyStats, selectedYear, selectedMonthTab]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950"><Loader2 className="animate-spin text-zinc-500" /></div>;
  if (!user || (!isAdmin && !isManager)) return null;

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* --- HEADER (ĐÃ CHỈNH SỬA) --- */}
        <header className="h-16 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-950 shrink-0 transition-colors">
          {/* Bên trái: Tiêu đề */}
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <LayoutDashboard className="h-5 w-5" />
              Tổng quan Hệ thống
            </h1>
          </div>

          {/* Bên phải: Bộ lọc (Đã di chuyển lên đây) */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncAllClick}
              disabled={isSyncingAll}
              className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black text-sm font-bold transition-all shadow-sm"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncingAll && "animate-spin")} />
              {isSyncingAll ? "Đang đồng bộ..." : "Đồng bộ TikTok"}
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

            {/* Select Team */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-zinc-400" />
              </div>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="appearance-none bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg pl-9 pr-8 py-1.5 focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 focus:outline-none cursor-pointer min-w-[180px] dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-800 dark:focus:border-zinc-600 transition-all shadow-sm"
              >
                <option value="">Tất cả các Team</option>
                {teamsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-3 w-3 text-zinc-400 pointer-events-none" />
            </div>

            {/* Select Year */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-zinc-400" />
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg pl-9 pr-8 py-1.5 focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 focus:outline-none cursor-pointer dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-800 dark:focus:border-zinc-600 transition-all shadow-sm"
              >
                {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-3 w-3 text-zinc-400 pointer-events-none" />
            </div>

          </div>
        </header>

        {/* --- TABS NAVIGATION (Giữ nguyên) --- */}
        <div className="bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 px-6 pt-2 flex items-center gap-6 overflow-x-auto shrink-0 no-scrollbar custom-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === "overview"
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            Tổng quan Team
          </button>
          {teamChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveTab(channel.id)}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2",
                activeTab === channel.id
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden border border-zinc-200 dark:border-zinc-700">
                {channel.avatar && <Image src={channel.avatar} alt="" fill className="object-cover" />}
              </div>
              {channel.displayName}
            </button>
          ))}
        </div>

        {/* --- CONTENT AREA (Giữ nguyên) --- */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950 custom-scrollbar">
          {isLoadingData ? (
            <div className="flex h-60 justify-center items-center">
              <Loader2 className="animate-spin h-8 w-8 text-zinc-400" />
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">

                  {/* Bảng Tổng hợp */}
                  <div>
                    <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-zinc-100">Thống kê Kênh (Tích lũy)</h3>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                              <th className="px-6 py-3 w-16 text-center">#</th>
                              <th className="px-6 py-3">Tên Kênh</th>
                              <th className="px-6 py-3 text-right">Followers</th>
                              <th className="px-6 py-3 text-right">Videos</th>
                              <th className="px-6 py-3 text-right">Views</th>
                              <th className="px-6 py-3 text-right">Tương tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {overviewFixedData.length > 0 ? overviewFixedData.map((row) => (
                              <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4 text-zinc-500 text-center">{row.stt}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                      {row.avatar && <Image src={row.avatar} alt="" fill className="object-cover" />}
                                    </div>
                                    <div>
                                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</div>
                                      <div className="text-xs text-zinc-500">@{row.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-right tabular-nums text-zinc-700 dark:text-zinc-300">{row.followers.toLocaleString()}</td>
                                <td className="px-6 py-4 font-medium text-right tabular-nums text-zinc-700 dark:text-zinc-300">{row.videos.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-bold tabular-nums text-blue-600 dark:text-blue-400">{row.views.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-bold tabular-nums text-green-600 dark:text-green-400">{row.interactions.toLocaleString()}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 italic">Chưa có kênh nào trong team này.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Chi tiết theo tháng */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Chi tiết theo tháng ({selectedYear})</h3>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                      <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 custom-scrollbar">
                        {months.map((m) => (
                          <button
                            key={m}
                            onClick={() => setSelectedMonthTab(m)}
                            className={cn(
                              "px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                              selectedMonthTab === m
                                ? "border-zinc-900 text-zinc-900 bg-white dark:bg-zinc-800 dark:border-zinc-100 dark:text-zinc-100"
                                : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
                            )}
                          >
                            Tháng {m}
                          </button>
                        ))}
                      </div>

                      <div className="overflow-x-auto p-0">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                            <tr>
                              <th className="px-6 py-3 font-semibold w-16 text-center">#</th>
                              <th className="px-6 py-3 font-semibold">Tên Kênh</th>
                              <th className="px-6 py-3 font-semibold text-right">Followers</th>
                              <th className="px-6 py-3 font-semibold text-right">Videos (Tháng)</th>
                              <th className="px-6 py-3 font-semibold text-right">Views (Tháng)</th>
                              <th className="px-6 py-3 font-semibold text-right">Tương tác (Tháng)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {monthlyDataForTab.length > 0 ? monthlyDataForTab.map((c, idx) => (
                              <tr key={c.channelId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4 text-zinc-400 text-center">{idx + 1}</td>
                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{c.channelName}</td>
                                <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">
                                  {c.hasData ? c.followers.toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">
                                  {c.hasData ? c.videos.toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                                  {c.hasData ? c.views.toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400 tabular-nums">
                                  {c.hasData ? c.interactions.toLocaleString() : "-"}
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Chưa có kênh nào.</td></tr>
                            )}
                            {monthlyDataForTab.length > 0 && monthlyDataForTab.every(d => !d.hasData) && (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 italic bg-zinc-50/50 dark:bg-zinc-900/50">
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

              {/* TAB 2: CHI TIẾT TỪNG KÊNH */}
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
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
      />
    </div>
  );
}