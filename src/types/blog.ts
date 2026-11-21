export type PostStatus = 'published' | 'draft' | 'private';
export type CommentStatus = 'approved' | 'pending' | 'spam';
export type ThemeMode = 'light' | 'dark' | 'system';
export type RadiusStyle = 'expressive' | 'balanced' | 'sharp';
export type HomeLayoutMode = 'feed' | 'deck' | 'bento';
export type DensityMode = 'comfortable' | 'compact';

export interface CustomField {
  key: string;
  value: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  categorySlug: string;
  tags: string[];
  status: PostStatus;
  pinned: boolean;
  allowComment: boolean;
  hasPassword: boolean;
  passwordHint?: string;
  views: number;
  likes: number;
  customFields: CustomField[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerPost extends Post {
  password?: string;
}

export interface StandalonePage {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  allowComment: boolean;
  order: number;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface Comment {
  id: string;
  targetType: 'post' | 'moment' | 'page';
  targetId: string;
  parentId: string | null;
  author: string;
  email?: string;
  url?: string;
  content: string;
  status: CommentStatus;
  isAdmin: boolean;
  createdAt: string;
}

export interface Moment {
  id: string;
  content: string;
  mood: string;
  location?: string;
  weather?: string;
  image?: string;
  musicTrack?: string;
  tags: string[];
  likes: number;
  createdAt: string;
}

export interface FriendLink {
  id: string;
  name: string;
  url: string;
  avatar: string;
  description: string;
  status: 'approved' | 'pending';
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image: string;
  camera: string;
  lens: string;
  exif: string;
  location: string;
  takenAt: string;
}

export interface PersonalStatus {
  activity: string;
  mood: string;
  location: string;
  nowPlaying: string;
  currentlyReading: string;
  focusMessage: string;
  updatedAt: string;
}

export interface SiteConfig {
  siteName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBanner: string;
  showHeroBanner: boolean;
  announcement: string;
  authorName: string;
  authorAvatar: string;
  authorBio: string;
  authorLocation: string;
  authorLinks: { label: string; url: string }[];
  defaultHue: number;
  defaultThemeMode: ThemeMode;
  radiusStyle: RadiusStyle;
  homeLayout: HomeLayoutMode;
  density: DensityMode;
  footerCopyright: string;
  icpText?: string;
}

export interface BlogBootstrapData {
  config: SiteConfig;
  posts: Post[];
  pages: StandalonePage[];
  categories: Category[];
  moments: Moment[];
  comments: Comment[];
  friends: FriendLink[];
  gallery: GalleryItem[];
  personalStatus: PersonalStatus;
}

export interface HealthProbeResult {
  status: 'operational' | 'degraded';
  uptimeSeconds: number;
  timestamp: string;
  services: {
    name: string;
    latencyMs: number;
    status: 'operational' | 'degraded';
    detail: string;
  }[];
  storage: {
    postsCount: number;
    momentsCount: number;
    commentsCount: number;
    pagesCount: number;
  };
}

export interface AdminAuthState {
  hasAdmin: boolean;
  envPasscodeActive: boolean;
  authenticated: boolean;
}
