export type PostStatus = 'published' | 'draft' | 'private';
export type CommentStatus = 'approved' | 'pending' | 'spam';
export type ThemeMode = 'light' | 'dark' | 'system';
export type RadiusStyle = 'expressive' | 'balanced' | 'sharp';
export type HomeLayoutMode = 'feed' | 'deck' | 'bento';
export type DensityMode = 'comfortable' | 'compact';
export type MomentsSkin = 'classic' | 'twitter';
export type ProductType = 'digital' | 'physical';
export type PaymentMethod = 'alipay' | 'wechat' | 'card';
export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'fulfilled' | 'refunded';

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
  userId?: string | null;
  author: string;
  email?: string;
  url?: string;
  avatarHue?: number;
  content: string;
  likes: number;
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
  pinned?: boolean;
  likes: number;
  reposts: number;
  views: number;
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

export interface ProductVariant {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
}

export interface ShopProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'digital' | 'physical' | 'publication';
  type: ProductType;
  priceCents: number;
  originalPriceCents?: number;
  image: string;
  gallery: string[];
  badgeText?: string;
  specs: { label: string; value: string }[];
  variants: ProductVariant[];
  digitalFileName?: string;
  digitalPreviewNote?: string;
  salesCount: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  title: string;
  variantName: string;
  type: ProductType;
  unitPriceCents: number;
  quantity: number;
  image: string;
  digitalLicenseKey?: string;
  digitalFileName?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  note?: string;
  items: OrderItemSnapshot[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  cardLast4?: string;
  trackingNumber?: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarHue: number;
  role: 'member';
  likedPostIds: string[];
  likedMomentIds: string[];
  likedCommentIds: string[];
  repostedMomentIds: string[];
  savedPostIds: string[];
  createdAt: string;
}

export interface ServerUserAccount extends UserProfile {
  passwordHash: string;
}

export interface LightboxSlide {
  src: string;
  title?: string;
  caption?: string;
  meta?: string;
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
  authorHandle: string;
  authorAvatar: string;
  authorBio: string;
  authorLocation: string;
  authorJoinedDate: string;
  authorFollowers: number;
  authorFollowing: number;
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
  products: ShopProduct[];
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
    productsCount?: number;
    ordersCount?: number;
  };
}

export interface AdminAuthState {
  hasAdmin: boolean;
  envPasscodeActive: boolean;
  authenticated: boolean;
}
