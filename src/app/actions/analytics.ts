import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Video, Channel } from '@/types/index';

/**
 * Interface cho kết quả trả về để UI dễ sử dụng
 */
interface AnalyticsSummary {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    videoCount: number;
}

interface ChannelAnalyticsResponse {
    summary: AnalyticsSummary;
    videos: Video[];
}

/**
 * HÀM 1: Lấy thống kê chi tiết của MỘT kênh (có thể lọc theo tháng)
 * @param channelId - ID của kênh
 * @param month - Tháng (0-11), nếu null sẽ lấy toàn thời gian
 * @param year - Năm, bắt buộc nếu chọn tháng
 */
export async function getChannelAnalytics(
    channelId: string,
    month?: number,
    year?: number
): Promise<ChannelAnalyticsResponse> {
    try {
        const videosRef = collection(db, 'videos');
        let q = query(
            videosRef,
            where('channelId', '==', channelId),
            orderBy('createTime', 'desc')
        );

        // Nếu có lọc theo tháng/năm
        if (month !== undefined && year !== undefined) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59); // Cuối tháng

            q = query(
                videosRef,
                where('channelId', '==', channelId),
                where('createTime', '>=', Timestamp.fromDate(startDate)),
                where('createTime', '<=', Timestamp.fromDate(endDate)),
                orderBy('createTime', 'desc')
            );
        }

        const snapshot = await getDocs(q);

        // Khởi tạo biến tổng (đây là chỗ trước đó bạn bị lỗi chưa dùng biến)
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;

        const videos: Video[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();

            // Convert data từ Firestore sang type Video của bạn
            // Lưu ý: createTime trong Firestore là Timestamp, cần convert sang Date hoặc giữ nguyên tùy logic UI
            const videoData = {
                id: doc.id,
                ...data,
                createTime: data.createTime instanceof Timestamp ? data.createTime.toDate() : data.createTime,
            } as Video;

            // Cộng dồn chỉ số
            if (videoData.stats) {
                totalViews += videoData.stats.view || 0;
                totalLikes += videoData.stats.like || 0;
                totalComments += videoData.stats.comment || 0;
                totalShares += videoData.stats.share || 0;
            }

            videos.push(videoData);
        });

        // --- RETURN QUAN TRỌNG: Trả về các biến đã tính toán ---
        return {
            summary: {
                totalViews,
                totalLikes,
                totalComments,
                totalShares,
                videoCount: videos.length,
            },
            videos,
        };

    } catch (error) {
        console.error('Error fetching channel analytics:', error);
        // Trả về dữ liệu rỗng nếu lỗi để không crash app
        return {
            summary: { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, videoCount: 0 },
            videos: []
        };
    }
}

/**
 * HÀM 2: Lấy tổng quan thống kê của TẤT CẢ các kênh (Dành cho Dashboard Manager)
 * Hàm này sẽ lấy dữ liệu của nhiều kênh và gộp lại
 */
export async function getTeamOverview(channelIds: string[]): Promise<AnalyticsSummary> {
    if (!channelIds || channelIds.length === 0) {
        return { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, videoCount: 0 };
    }

    try {
        // Lưu ý: Firestore 'in' query chỉ support tối đa 10-30 item. 
        // Nếu team quá lớn, nên chia nhỏ hoặc fetch all rồi lọc (client-side filter).
        // Ở đây demo cách fetch videos của danh sách channels.

        const videosRef = collection(db, 'videos');
        // Cách đơn giản nhất cho database nhỏ: Query hết video có channelId nằm trong list
        // (Giới hạn firestore 'in' là 10, nếu > 10 cần chia mảng để query nhiều lần)

        // Ở đây ta dùng giải pháp an toàn hơn: Loop qua từng channel để lấy stats (hoặc query song song)
        // Để tối ưu hiệu suất thực tế, bạn nên lưu 'totalViews' vào chính collection 'channels' để không phải cộng lại từ đầu.

        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let videoCount = 0;

        // Sử dụng Promise.all để chạy song song các request cho nhanh
        await Promise.all(channelIds.map(async (channelId) => {
            const q = query(videosRef, where('channelId', '==', channelId));
            const snapshot = await getDocs(q);

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.stats) {
                    totalViews += data.stats.view || 0;
                    totalLikes += data.stats.like || 0;
                    totalComments += data.stats.comment || 0;
                    totalShares += data.stats.share || 0;
                }
                videoCount++;
            });
        }));

        return {
            totalViews,
            totalLikes,
            totalComments,
            totalShares,
            videoCount
        };

    } catch (error) {
        console.error('Error fetching team overview:', error);
        return { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, videoCount: 0 };
    }
}