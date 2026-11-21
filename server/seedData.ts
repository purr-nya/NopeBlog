import type {
  Category,
  Comment,
  FriendLink,
  GalleryItem,
  Moment,
  PersonalStatus,
  ServerPost,
  SiteConfig,
  StandalonePage,
} from '../src/types/blog';

export const ASSET_URLS = {
  heroBanner: '/src/assets/images/hero_kaze_banner_1795201628975.jpg',
  authorAvatar: '/src/assets/images/avatar_author_1795201622001.jpg',
  coverM3: '/src/assets/images/cover_m3_design_1795201622507.jpg',
  coverTokyo: '/src/assets/images/cover_tokyo_walk_1795201621571.jpg',
  coverDesk: '/src/assets/images/cover_desk_setup_1795201622816.jpg',
  coverMountain: '/src/assets/images/cover_mountain_mist_1795201633310.jpg',
};

export interface BlogDatabase {
  adminHash: string | null;
  config: SiteConfig;
  posts: ServerPost[];
  pages: StandalonePage[];
  categories: Category[];
  moments: Moment[];
  comments: Comment[];
  friends: FriendLink[];
  gallery: GalleryItem[];
  personalStatus: PersonalStatus;
}

export function createInitialDatabase(): BlogDatabase {
  return {
    adminHash: null,
    config: {
      siteName: '晴风志',
      tagline: '记录设计、代码与日常微风的独立数字花园',
      heroTitle: '在慢下来的光影里，写给未来的长信',
      heroSubtitle:
        '对齐 Fuwari 的澄澈排版，融入 Material Design 3 Expressive 动态色彩与触感卡片交互，保留 Typecho 经典写作基因。',
      heroBanner: ASSET_URLS.heroBanner,
      showHeroBanner: true,
      announcement: '欢迎来到晴风志：试着滑动首页的精选探索卡片，或点击左侧色轮实时切换整站 OKLCH 主题色。',
      authorName: '林晴风',
      authorAvatar: ASSET_URLS.authorAvatar,
      authorBio: '独立界面设计师与全栈开发者。偏爱克制的排版、胶片色调、手冲浅烘与有生命力的交互动效。',
      authorLocation: '杭州 · 西溪',
      authorLinks: [
        { label: 'GitHub', url: 'https://github.com' },
        { label: 'RSS 订阅', url: '/api/feed.xml' },
        { label: '联系邮箱', url: 'mailto:hello@kazeblog.example' },
      ],
      defaultHue: 250,
      defaultThemeMode: 'light',
      radiusStyle: 'expressive',
      homeLayout: 'feed',
      density: 'comfortable',
      footerCopyright: '© 2026 晴风志 · KazeBlog',
      icpText: '独立博客 · 遵循 CC BY-NC-SA 4.0 协议',
    },
    categories: [
      {
        id: 'cat-design',
        slug: 'design',
        name: '设计系统',
        description: 'Material Design 3 Expressive、OKLCH 色彩模型与排版实验',
      },
      {
        id: 'cat-engineering',
        slug: 'engineering',
        name: '前端工程',
        description: 'TypeScript 架构、全栈博客内核与性能调校笔记',
      },
      {
        id: 'cat-travel',
        slug: 'travel',
        name: '行纪光影',
        description: '城市漫游、雨夜胶片与山湖清晨的视觉记录',
      },
      {
        id: 'cat-craft',
        slug: 'craft',
        name: '器物生活',
        description: '桌面美学、手冲咖啡与专注力工作流',
      },
      {
        id: 'cat-journal',
        slug: 'journal',
        name: '私语手记',
        description: '深夜随笔与阶段性复盘，部分文章设有加密访问',
      },
    ],
    posts: [
      {
        id: 'post-m3-expressive',
        slug: 'material-design-3-expressive-and-fuwari',
        title: '当 Material Design 3 Expressive 遇见 Fuwari：一次博客美学的深度重构',
        excerpt:
          '如何用 OKLCH 感知均匀色彩空间构建动态主题色，将大圆角形态、弹簧物理卡片与 Fuwari 的极简阅读节奏融为一体。',
        coverImage: ASSET_URLS.coverM3,
        categorySlug: 'design',
        tags: ['Material Design 3', 'Fuwari', 'OKLCH', '动效设计'],
        status: 'published',
        pinned: true,
        allowComment: true,
        hasPassword: false,
        views: 1842,
        likes: 96,
        customFields: [
          { key: '写作地点', value: '杭州 · 晴风书房' },
          { key: '配图器材', value: 'Leica Q3 · 28mm f/1.7' },
          { key: '灵感来源', value: 'Material You / Astro Fuwari' },
        ],
        createdAt: '2026-11-18T09:30:00.000Z',
        updatedAt: '2026-11-19T14:20:00.000Z',
        content: `# 从静态主题到呼吸感的色彩系统

很多现代博客在切换主题色时，往往只替换一个主按钮的 HEX 值，结果背景依然是死板的纯白或生硬的纯黑。**Fuwari** 之所以让人过目不忘，在于它用一个单一的色相变量 \`--hue\` 驱动了整套柔和、统一的视觉氛围。

而在 **Material Design 3 Expressive** 理念中，界面不再只是冷冰冰的信息容器，而是具备触感、情绪张力与自然物理回弹的数字器物。

:::tip OKLCH 色彩模型的核心优势
相较于 HSL，OKLCH 能在调整色相角度 \`0° - 360°\` 时保持人眼感知亮度（Lightness）完全恒定。这意味着无论读者把色轮拖到「晴空靛」还是「琥珀暖」，文字对比度都能稳定符合 WCAG AA 阅读标准。
:::

## 动态深色模式的波纹过渡

切换深色模式不应是一次刺眼的页面闪屏。借助浏览器原生的 **View Transitions API**，我们从点击按钮的精确坐标 \`(x, y)\` 向外展开一个半径覆盖整个视口的圆形裁切动画：

\`\`\`ts
const maxRadius = Math.hypot(
  Math.max(origin.x, window.innerWidth - origin.x),
  Math.max(origin.y, window.innerHeight - origin.y)
);
root.style.setProperty('--ripple-x', \`\${origin.x}px\`);
root.style.setProperty('--ripple-y', \`\${origin.y}px\`);
root.style.setProperty('--ripple-r', \`\${Math.ceil(maxRadius)}px\`);
document.startViewTransition(() => root.classList.toggle('dark', nextDark));
\`\`\`

当用户开启系统级「减少动态效果」时，代码会自动降级为即时柔和过渡，兼顾克制与无障碍体验。

## 卡片式滑动交互的物理节奏

传统的博客列表只提供了垂直滚动一种维度。在晴风志里，我们引入了 **Expressive 叠层卡片组（Swipeable Card Deck）**：

- **拖拽倾斜反馈**：水平拖动时根据位移映射微小旋转角度与透明度，模拟实体明信片在指尖滑出的阻力感。
- **左右语义分流**：向左滑过浏览下一篇，向右滑入即时收藏到本机灵感清单。
- **全键盘支持**：除鼠标和触控手势外，使用方向键与底部触觉按钮也能流畅切换。

## 为什么依然保留 Typecho 的内核精神？

| 维度 | Typecho 经典基因 | 晴风志现代演进 |
| --- | --- | --- |
| 数据结构 | 文章、独立页、自定义字段、分类与嵌套评论 | 全量保留，增加说说动态与个人状态看板 |
| 内容安全 | 密码加密文章、评论审核队列 | 服务端加密校验 + 纯 AST 无 XSS Markdown 渲染 |
| 订阅生态 | 标准 RSS 2.0 输出 | 实时生成 \`/api/feed.xml\` 与 JSON 完整备份 |

> 好的个人博客，应当像一间整理得当的木质书房：既能安静地承载十万字长文，也愿意为来访的朋友留出一盏随手可调明暗的台灯。`,
      },
      {
        id: 'post-kyoto-rain',
        slug: 'rainy-twilight-in-kyoto-alleys',
        title: '雨落祗园町：在蓝调时刻收集旧木屋的暖光',
        excerpt:
          '撑伞走过微湿的石板路，听檐角雨滴敲打石阶。用 35mm 镜头记录京都傍晚最温柔的二十分钟。',
        coverImage: ASSET_URLS.coverTokyo,
        categorySlug: 'travel',
        tags: ['胶片摄影', '京都', '雨夜', '散步'],
        status: 'published',
        pinned: false,
        allowComment: true,
        hasPassword: false,
        views: 1294,
        likes: 74,
        customFields: [
          { key: '拍摄地点', value: '日本 · 京都东山区' },
          { key: '胶片模拟', value: 'Classic Chrome · ISO 800' },
          { key: '同行天气', value: '细雨 · 14°C' },
        ],
        createdAt: '2026-11-12T13:15:00.000Z',
        updatedAt: '2026-11-12T15:00:00.000Z',
        content: `# 蓝调时刻的色彩对话

下过小雨的傍晚总是摄影师最偏爱的时刻。天空尚未彻底沉入墨黑，还残留着一层极清澈的钴蓝色；而町屋格栅窗里透出的钨丝灯光，恰好落在潮湿的青石板上，拉出一道道柔和的琥珀倒影。

:::note 拍摄笔记
在雨夜街头尽量避免将快门降到 1/30s 以下，略微提高 ISO 保留轻微颗粒，反而能让木质建筑的纹理显得更有呼吸感。
:::

## 放慢脚步才看得见的细节

1. 屋檐下挂着的蓝色暖帘在微风里轻轻起伏，边缘沾着细密水珠。
2. 巷口停放的老式单车车筐里，安静地躺着一把刚收起的透明雨伞。
3. 远处山岚顺着电线杆缓缓垂落，将城市的喧嚣隔绝在两个街区之外。

## 行前小清单

- [x] 携带 35mm 定焦镜头与镜头擦拭布
- [x] 预留日落前 40 分钟抵达小巷深处
- [x] 在转角茶寮喝一杯焙茶暖手

那一晚我没有急着拍满整张存储卡，只是在雨声里走了三公里，把湿润的柏木香气和灯影一并记进了这篇手记。`,
      },
      {
        id: 'post-desk-craft',
        slug: 'minimalist-desk-and-deep-work-ritual',
        title: '晨光与橡木桌面：建立属于创作者的深度工作仪式感',
        excerpt:
          '从一把阳极氧化铝机械键盘、一杯手冲耶加雪菲，到空白纸页上的架构草图，聊聊如何让桌面帮助大脑进入心流。',
        coverImage: ASSET_URLS.coverDesk,
        categorySlug: 'craft',
        tags: ['桌面美学', '手冲咖啡', '效率工作流'],
        status: 'published',
        pinned: false,
        allowComment: true,
        hasPassword: false,
        views: 986,
        likes: 61,
        customFields: [
          { key: '桌面尺寸', value: '160cm × 75cm 白橡木' },
          { key: '今日豆单', value: '埃塞俄比亚 耶加雪菲 水洗' },
        ],
        createdAt: '2026-11-03T07:45:00.000Z',
        updatedAt: '2026-11-04T09:10:00.000Z',
        content: `# 减少视觉噪音，把注意力还给思考

过去几年里我折腾过各种炫酷的灯带和多屏支架，直到某天早晨把桌面清空，只留下白橡木板、一块羊毛毡桌垫和一本摊开的网格笔记，才发现「留白」才是最高效的生产力工具。

## 每日开机前的十分钟

在打开 IDE 之前，我会先烧一壶 92°C 的热水，用陶制滤杯慢慢冲出一杯浅烘手冲。等待萃取的两分半钟里，用木杆铅笔在纸上写下今天最核心的三件事：

- **第一件**：只选一个能推动项目前进的关键模块，例如重写 Markdown AST 解析器。
- **第二件**：回复读者评论与友链来信，保持数字花园的人情味。
- **第三件**：留出半小时阅读纸质书，避免大脑被碎片信息填满。

:::tip 键盘手感与静音的平衡
选择低矮阳极氧化铝套件搭配线性静音轴，加上 4mm 羊毛毡垫，不仅敲击声像雨滴般温润，长时间写代码也不会让手腕疲劳。
:::

当窗外龟背竹的叶影落在笔记本封面上的那一刻，整个人便自然进入了安静而笃定的工作节奏。`,
      },
      {
        id: 'post-typecho-architecture',
        slug: 'building-xss-safe-markdown-and-typecho-api',
        title: '从零设计 Typecho 风格的现代全栈内核：AST 渲染、自定义字段与 RSS',
        excerpt:
          '放弃危险的 HTML 字符串拼接，采用纯 TypeScript 语法树直出 React 组件，并完整复刻 Typecho 的独立页、自定义字段与评论审核体系。',
        coverImage: ASSET_URLS.coverM3,
        categorySlug: 'engineering',
        tags: ['TypeScript', 'Typecho', '架构设计', '安全'],
        status: 'published',
        pinned: false,
        allowComment: true,
        hasPassword: false,
        views: 1120,
        likes: 53,
        customFields: [
          { key: '技术栈', value: 'React 19 + Express + Tailwind v4' },
          { key: '测试框架', value: 'Node built-in node:test' },
        ],
        createdAt: '2026-10-22T11:00:00.000Z',
        updatedAt: '2026-10-24T10:30:00.000Z',
        content: `# 为什么手写纯 AST Markdown 引擎？

在构建面向公开评论与长文写作的博客时，直接使用 \`dangerouslySetInnerHTML\` 往往会引入难以察觉的 XSS 隐患。如果我们将 Markdown 解析为结构化的块级与行内语法树（AST），再交由 React 原生节点渲染，就能从根源上杜绝脚本注入。

\`\`\`ts
export function sanitizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed.startsWith('//') ? '#' : trimmed;
  }
  const parsed = new URL(trimmed);
  return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
    ? parsed.href
    : '#';
}
\`\`\`

## Typecho 自定义字段的妙用

Typecho 老玩家一定对「自定义字段（Custom Fields）」情有独钟。无需改动数据库表结构，就能为每篇文章附加任意键值对：

- 游记文章可记录 **拍摄器材** 与 **天气温度**
- 技术文章可标注 **适用版本** 与 **代码仓库**
- 书影音评可填写 **推荐指数** 与 **出版年份**

## 实时健康探测与标准 RSS 2.0

博客不仅面向浏览器里的访客，也应拥抱开放的 RSS 订阅网络。后端实时读取文章库并转义 XML 特殊字符，输出标准 RSS 2.0 订阅源，方便读者在任意阅读器中安静追更。`,
      },
      {
        id: 'post-alpine-dawn',
        slug: 'dawn-silence-by-the-alpine-lake',
        title: '拂晓湖畔的薄雾：一次脱离信号的四十八小时山野独行',
        excerpt:
          '清晨五点半推开木屋的门，湖面像一面尚未被唤醒的银镜。记录两天没有消息弹窗的山间时光。',
        coverImage: ASSET_URLS.coverMountain,
        categorySlug: 'travel',
        tags: ['山野', '清晨', '摄影', '独处'],
        status: 'published',
        pinned: false,
        allowComment: true,
        hasPassword: false,
        views: 745,
        likes: 48,
        customFields: [
          { key: '海拔高度', value: '2,140m' },
          { key: '清晨气温', value: '4°C · 无风' },
        ],
        createdAt: '2026-09-14T06:20:00.000Z',
        updatedAt: '2026-09-14T09:00:00.000Z',
        content: `# 在第一缕日光越过山脊之前

手机在进山半小时后彻底失去了信号，最初的半天甚至有些不习惯，手指还会下意识去摸口袋。但到了第二天清晨五点半，当我裹着外套走到湖边时，那种莫名的焦躁已经消失得无影无踪。

湖面上漂浮着一层极轻的白雾，杉树林的剪影倒映在水里，对称得像一幅水墨版画。

> 我们总以为需要更多输入才能获得灵感，其实很多时候，大脑真正渴望的是一段不被打断的空白。

回程的火车上，我在笔记本里一口气画出了晴风志第一版设计草图。`,
      },
      {
        id: 'post-encrypted-diary',
        slug: 'midnight-letter-to-twenty-twenty-seven',
        title: '加密手记：写给 2027 年秋天的深夜自白',
        excerpt:
          '这是一篇使用 Typecho 文章密码保护机制加密的私密手记。输入正确访问口令即可完整解锁阅读。',
        coverImage: ASSET_URLS.heroBanner,
        categorySlug: 'journal',
        tags: ['年终复盘', '加密文章', '随笔'],
        status: 'published',
        pinned: false,
        allowComment: true,
        hasPassword: true,
        password: 'kaze2026',
        passwordHint: '提示：输入暗号 kaze2026 即可解锁体验 Typecho 密码保护文章',
        views: 318,
        likes: 27,
        customFields: [
          { key: '加密方式', value: 'Typecho 服务端口令校验' },
          { key: '封存日期', value: '2026 年深秋' },
        ],
        createdAt: '2026-10-02T22:10:00.000Z',
        updatedAt: '2026-10-02T22:30:00.000Z',
        content: `# 解锁成功：致一年后的自己

如果你看到了这段文字，说明你顺利通过了服务端密码校验，打开了这封存放在晴风志深处的加密信件。

:::note 写给未来的三个提醒
1. 永远保持对细节的好奇心，不要因为熟练而失去打磨作品的热情。
2. 认真生活比写出完美的代码更重要，记得多去看看海和山。
3. 坚持把想法写成公开的长文，它们会替你遇见同频的朋友。
:::

愿你在 2027 年的某个晴朗午后重新翻开这篇手记时，依然眼睛里有光，手边有一杯温热的咖啡。`,
      },
    ],
    pages: [
      {
        id: 'page-about',
        slug: 'about',
        title: '关于晴风志',
        subtitle: '一个缓慢生长、用心打磨的独立写作角落',
        allowComment: true,
        order: 1,
        updatedAt: '2026-11-18T10:00:00.000Z',
        content: `# 你好，我是林晴风

**晴风志（KazeBlog）** 诞生于一个想要重新夺回个人表达空间的念头。在算法推荐和短视频占据注意力的时代，我依然相信结构清晰的长文、克制的排版与真诚的评论交流具有长久的温度。

## 站点设计哲学

- **Material Design 3 Expressive**：拥抱有机的大圆角、动态 OKLCH 色彩系统与具备物理惯性的卡片手势交互。
- **Fuwari 阅读美学**：清透的层次、直观的目录导航、舒展的行宽，让每一次阅读都轻盈无压。
- **Typecho 完整基因**：文章、独立页面、自定义字段、加密文章、说说动态、友链审核与标准 RSS 订阅一应俱全。

欢迎在「说说」里看看我的近况，或者去「友链」页面交换一张属于你的数字名片。`,
      },
      {
        id: 'page-uses',
        slug: 'uses',
        title: '器物与工具清单',
        subtitle: '日常设计、开发与摄影所信赖的软硬件伙伴',
        allowComment: false,
        order: 2,
        updatedAt: '2026-11-10T09:00:00.000Z',
        content: `# 日常工具与桌面配置

经常有读者在评论里问起工作流与器材清单，这里通过 Typecho 独立页面集中整理并持续更新。

## 硬件设备

| 类别 | 型号 | 使用感受 |
| --- | --- | --- |
| 主力电脑 | MacBook Pro 14" M4 Pro | 安静续航强，外出写稿无压力 |
| 机械键盘 | 定制 65% 阳极铝套件 | 搭配静音线性轴，手感温润 |
| 随身相机 | Leica Q3 / Fujifilm X100VI | 28mm 与 35mm 视角覆盖全部街头记录 |

## 常用软件

- **编码**：Neovim 与 VS Code 双修，搭配 JetBrains Mono 字体
- **设计**：Figma、OKLCH 色彩工作台
- **咖啡**：泰摩栗子手摇磨豆机 + V60 陶制滤杯`,
      },
      {
        id: 'page-changelog',
        slug: 'changelog',
        title: '建站日志',
        subtitle: '记录晴风志每一次重要的迭代与更新',
        allowComment: false,
        order: 3,
        updatedAt: '2026-11-19T16:00:00.000Z',
        content: `# 建站与演进记录

- **2026-11-19**：上线 Expressive 卡片式滑动探索与 View Transitions 圆形深色模式波纹切换。
- **2026-11-12**：新增「说说」卡片翻阅模式与「状态」站点实时探针 + 写作热力图。
- **2026-11-01**：完成 Typecho 全功能后台，支持自定义字段、独立页面、友链自助申请审核与 RSS 2.0 订阅源。`,
      },
    ],
    moments: [
      {
        id: 'mom-1',
        content: '刚给晴风志调完了 OKLCH 动态色轮，把主色拨到 168° 翡翠青再切到深色模式，那一瞬间真的有种玉石温润的质感。试着点一下左侧的深色按钮看看扩散波纹！',
        mood: '灵感迸发',
        location: '杭州 · 西溪书房',
        weather: '晴 · 17°C',
        image: ASSET_URLS.coverM3,
        musicTrack: '坂本龙一 — Aqua',
        tags: ['设计', '色彩实验'],
        likes: 42,
        createdAt: '2026-11-20T08:15:00.000Z',
      },
      {
        id: 'mom-2',
        content: '手冲了一杯刚养豆七天的水洗耶加雪菲，白桃和茉莉香气非常干净。写长文之前先给自己十分钟安静的准备时间，效率反而翻倍。',
        mood: '惬意',
        location: '窗边橡木桌',
        weather: '微风 · 15°C',
        image: ASSET_URLS.coverDesk,
        musicTrack: 'Nujabes — Reflection Eternal',
        tags: ['咖啡', '日常'],
        likes: 31,
        createdAt: '2026-11-18T02:40:00.000Z',
      },
      {
        id: 'mom-3',
        content: '整理去年京都雨夜的底片，发现最喜欢的反而不是著名景点，而是小巷里两把撑着伞擦肩而过的背影。好照片往往藏在没有目的地的散步里。',
        mood: '怀旧',
        location: '相册整理中',
        weather: '多云 · 13°C',
        image: ASSET_URLS.coverTokyo,
        musicTrack: '青叶市子 — 機械仕掛乃宇宙',
        tags: ['摄影', '胶片'],
        likes: 56,
        createdAt: '2026-11-15T14:20:00.000Z',
      },
      {
        id: 'mom-4',
        content: '终于把纯 TypeScript 的 Markdown AST 解析器跑通了全部单元测试，零 dangerouslySetInnerHTML，还能自动抽目录和识别 Fuwari 风格提示框，神清气爽。',
        mood: '专注',
        location: '终端前',
        weather: '晴 · 16°C',
        musicTrack: 'Tycho — Awake',
        tags: ['工程', 'TypeScript'],
        likes: 28,
        createdAt: '2026-11-11T11:50:00.000Z',
      },
      {
        id: 'mom-5',
        content: '清晨五点半的高山湖面像一面没来得及呼吸的镜子。有时候把手机调成飞行模式两天，比买任何降噪耳机都管用。',
        mood: '宁静',
        location: '川西 · 杉木湖',
        weather: '薄雾 · 4°C',
        image: ASSET_URLS.coverMountain,
        musicTrack: 'Ólafur Arnalds — Near Light',
        tags: ['山野', '断网日'],
        likes: 64,
        createdAt: '2026-11-05T23:10:00.000Z',
      },
      {
        id: 'mom-6',
        content: '顺手把博客后台的评论审核和友链自助申请打通了。独立博客最动人的地方，大概就是每一条留言都带着真实敲击键盘的温度。',
        mood: '开心',
        location: '杭州 · 夜色',
        weather: '微凉 · 11°C',
        tags: ['Typecho', '独立博客'],
        likes: 19,
        createdAt: '2026-10-29T15:30:00.000Z',
      },
    ],
    comments: [
      {
        id: 'cmt-1',
        targetType: 'post',
        targetId: 'post-m3-expressive',
        parentId: null,
        author: '沈知遥',
        email: 'zhiyao@example.com',
        url: 'https://example.com',
        content: 'OKLCH 搭配深色模式圆形波纹切换太顺滑了！而且卡片滑动探索功能真的让人忍不住多刷几篇。',
        status: 'approved',
        isAdmin: false,
        createdAt: '2026-11-18T12:20:00.000Z',
      },
      {
        id: 'cmt-2',
        targetType: 'post',
        targetId: 'post-m3-expressive',
        parentId: 'cmt-1',
        author: '林晴风',
        email: 'hello@kazeblog.example',
        content: '谢谢知遥！特意把弹簧阻尼调得像明信片滑出的手感，你也可以试试把色相拨到 168° 翡翠青看看效果。',
        status: 'approved',
        isAdmin: true,
        createdAt: '2026-11-18T13:05:00.000Z',
      },
      {
        id: 'cmt-3',
        targetType: 'post',
        targetId: 'post-kyoto-rain',
        parentId: null,
        author: '陆行舟',
        email: 'xingzhou@example.com',
        content: '蓝调时刻的冷暖光对比拿捏得真好，雨后石板路的反光太有电影质感了。',
        status: 'approved',
        isAdmin: false,
        createdAt: '2026-11-13T04:10:00.000Z',
      },
      {
        id: 'cmt-4',
        targetType: 'post',
        targetId: 'post-desk-craft',
        parentId: null,
        author: '周暮白',
        email: 'mubai@example.com',
        content: '同款白橡木桌面！每天开机前手冲一杯咖啡确实是最好的进入心流仪式。',
        status: 'approved',
        isAdmin: false,
        createdAt: '2026-11-04T06:45:00.000Z',
      },
      {
        id: 'cmt-5',
        targetType: 'moment',
        targetId: 'mom-1',
        parentId: null,
        author: '苏砚',
        email: 'suyan@example.com',
        content: '刚刚试了绯樱红 352° 配浅色模式，整体观感非常通透高级！',
        status: 'approved',
        isAdmin: false,
        createdAt: '2026-11-20T09:05:00.000Z',
      },
      {
        id: 'cmt-6',
        targetType: 'post',
        targetId: 'post-typecho-architecture',
        parentId: null,
        author: '待审核访客 · 陈星河',
        email: 'xinghe@example.com',
        content: '请问纯 AST Markdown 引擎之后会考虑支持自定义脚注语法吗？很喜欢这篇架构拆解。',
        status: 'pending',
        isAdmin: false,
        createdAt: '2026-11-19T18:30:00.000Z',
      },
    ],
    friends: [
      {
        id: 'fr-1',
        name: '知遥笔记',
        url: 'https://example.com/zhiyao',
        avatar: '知',
        description: '聚焦前端工程化、微动效与设计系统的技术花园',
        status: 'approved',
        createdAt: '2026-08-10T08:00:00.000Z',
      },
      {
        id: 'fr-2',
        name: '行舟胶片馆',
        url: 'https://example.com/xingzhou',
        avatar: '舟',
        description: '用中画幅和 35mm 胶片记录城市边缘的微光与人文',
        status: 'approved',
        createdAt: '2026-09-02T08:00:00.000Z',
      },
      {
        id: 'fr-3',
        name: '暮白手冲志',
        url: 'https://example.com/mubai',
        avatar: '白',
        description: '精品咖啡烘焙笔记、居家器物测评与慢生活随笔',
        status: 'approved',
        createdAt: '2026-09-18T08:00:00.000Z',
      },
      {
        id: 'fr-4',
        name: '苏砚设计录',
        url: 'https://example.com/suyan',
        avatar: '砚',
        description: '字体排印、色彩心理学与 Material Design 研究者',
        status: 'approved',
        createdAt: '2026-10-05T08:00:00.000Z',
      },
      {
        id: 'fr-5',
        name: '北辰开源站',
        url: 'https://example.com/beichen',
        avatar: '辰',
        description: 'Rust、Linux 桌面调校与自托管个人基础设施指南',
        status: 'approved',
        createdAt: '2026-10-21T08:00:00.000Z',
      },
      {
        id: 'fr-6',
        name: '星河碎语（待审核）',
        url: 'https://example.com/xinghe',
        avatar: '星',
        description: '独立开发者日常、书影音摘录与天文观星记录',
        status: 'pending',
        createdAt: '2026-11-19T12:00:00.000Z',
      },
    ],
    gallery: [
      {
        id: 'gal-1',
        title: '暮色海亭',
        caption: '悬崖上的木构茶亭在蓝调时刻亮起暖灯，远处海雾渐起。',
        image: ASSET_URLS.heroBanner,
        camera: 'Leica Q3',
        lens: '28mm f/1.7',
        exif: 'f/2.8 · 1/60s · ISO 400',
        location: '伊豆海岸',
        takenAt: '2026-10-16',
      },
      {
        id: 'gal-2',
        title: '雨夜祗园',
        caption: '湿润石板路把木格窗里的暖黄灯光拉成柔和的油画笔触。',
        image: ASSET_URLS.coverTokyo,
        camera: 'Fujifilm X100VI',
        lens: '23mm f/2',
        exif: 'f/2.0 · 1/80s · ISO 800',
        location: '京都东山',
        takenAt: '2026-11-11',
      },
      {
        id: 'gal-3',
        title: '几何静物',
        caption: '磨砂玻璃与素陶块在晨光下投出克制而立体的明暗阶调。',
        image: ASSET_URLS.coverM3,
        camera: 'Leica Q3',
        lens: '28mm f/1.7',
        exif: 'f/4.0 · 1/250s · ISO 100',
        location: '杭州工作室',
        takenAt: '2026-11-17',
      },
      {
        id: 'gal-4',
        title: '晨光书桌',
        caption: '上午九点的斜射日光穿过龟背竹叶片，落在白橡木桌面。',
        image: ASSET_URLS.coverDesk,
        camera: 'Fujifilm X100VI',
        lens: '23mm f/2',
        exif: 'f/2.8 · 1/320s · ISO 160',
        location: '杭州西溪',
        takenAt: '2026-11-02',
      },
      {
        id: 'gal-5',
        title: '拂晓杉木湖',
        caption: '零风速的清晨湖面完整映出群山与薄雾的冷暖过渡。',
        image: ASSET_URLS.coverMountain,
        camera: 'Hasselblad X2D',
        lens: '55mm f/2.5',
        exif: 'f/5.6 · 1/125s · ISO 200',
        location: '川西高地',
        takenAt: '2026-09-14',
      },
    ],
    personalStatus: {
      activity: '正在打磨晴风志的 Material Design 3 动效细节',
      mood: '沉静专注',
      location: '杭州 · 西溪书房',
      nowPlaying: '坂本龙一 — Aqua (Playing the Piano)',
      currentlyReading: '《设计的几何学》· Kimberly Elam',
      focusMessage: '本周计划完成两篇关于 OKLCH 色彩和全栈博客安全架构的深度长文。',
      updatedAt: '2026-11-20T10:30:00.000Z',
    },
  };
}
