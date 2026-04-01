
export type UserRole = 'admin' | 'manager' | 'member';

/**
 * 1. User: Thông tin tài khoản hệ thống
 */
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    teamId: string;
}

/**
 * 2. Team: Nhóm làm việc
 * Đã bao gồm Email và Name của Manager
 */
export interface Team {
    id: string;
    name: string;
    createdAt: Date;
    managerIds: string[];
    members: string[];
}

/**
 * 3. Channel: Kênh TikTok
 * Đã bao gồm Email của User sở hữu
 */
export interface Channel {
    id: string;
    openId: string;
    unionId?: string;
    avatar?: string;
    displayName: string;
    username: string;
    email: string;
    isVerified: boolean;
    follower: number;
    following: number;
    like: number;
    videoCount: number;
    userId: string;
}

/**
 * 4. Video: Dữ liệu video
 * Đã bao gồm Username và DisplayName của Channel để hiển thị UI
 */
export interface Video {
    id: string;
    videoId: string;
    createTime: Date;
    coverImage?: string;
    description?: string;
    duration: number;
    title: string;
    link: string;
    channelUsername: string;
    channelDisplayName: string;
    stats: {
        like: number;
        comment: number;
        share: number;
        view: number;
    };
    channelId: string;
    editorId?: string;
    editorName?: string;
}

export interface Token {
    id: string;
    channelId: string;
    openId: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;       // Thời gian hết hạn của Access Token (giây)
    refreshExpiresIn: number;// Thời gian hết hạn của Refresh Token (giây)
    updatedAt: Date;         // Thời điểm cập nhật token lần cuối
}

export interface Editor {
    id: string;
    name: string;
    email?: string;
}

export interface Statistic {
    id: string;
    channelId: string;
    userId: string;
    channelUsername: string;
    channelOwnerName: string;
    updatedAt: Date;
    followerCount: number;
    videoCount: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
}

export interface MonthlyStatistic {
    id: string;
    channelId: string;
    userId: string;
    month: string; // Định dạng 'YYYY-MM'
    followerCount: number;
    videoCount: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
}
