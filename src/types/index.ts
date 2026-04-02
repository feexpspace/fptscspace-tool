
export type UserRole = 'admin' | 'member';

export type UserStatus = 'pending' | 'approved';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    teamId: string;
    status: UserStatus;
}

export interface Team {
    id: string;
    name: string;
    createdAt: Date;
    members: string[];
}

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
    expiresIn: number;
    refreshExpiresIn: number;
    updatedAt: Date;
}

export interface Editor {
    id: string;
    name: string;
    email?: string;
}
