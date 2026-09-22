/**
 * ============================================================================
 * SITE CONFIG — Nguồn dữ liệu tĩnh mặc định cho toàn hệ thống Funnel Builder.
 * ----------------------------------------------------------------------------
 * NGƯỜI BIẾT CODE: chỉnh trực tiếp DEFAULT_CONFIG bên dưới rồi deploy.
 * NGƯỜI KHÔNG BIẾT CODE: chỉnh trực quan trong Admin, bấm "LƯU" (localStorage)
 *   hoặc "XUẤT CONFIG" để tải file dán đè vào đây.
 * ============================================================================
 */

export type StorageMode = "local" | "database";

/** Visible in webhook payloads so production deployments can be verified. */
export const DEPLOYMENT_REVISION = "sale-webhook-v3-20260922";

export interface AdminConfig {
  adminPath: string;
  password: string;
  storageMode: StorageMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseAdminEmail: string;
  backupEmail: string;
  cronSchedule: string; // "daily" | "weekly" | "off"
  backupCronToken: string;
}

export interface SitePage {
  id: string;
  title: string;
  path: string;
  kind: "landing" | "thankYou" | "custom";
  enabled: boolean;
  showInMenu: boolean;
  menuOrder: number;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** Các section custom từ thư viện được hiển thị trên trang này. */
  sectionIds: string[];
}

export interface WebhookEndpoint {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  type: "make" | "telegram" | "sheets" | "supabase" | "custom";
  fields?: string[];
  /**
   * Ánh xạ biến payload -> tên cột trong Google Sheet.
   * Ví dụ: { full_name: "Họ và tên", phone: "Số điện thoại" }.
   * Bỏ trống một biến -> dùng chính tên biến làm tiêu đề cột.
   */
  columnMap?: Record<string, string>;
}

export interface TrackingConfig {
  facebookPixelId: string;
  tiktokPixelId: string;
  tiktokAccessToken: string;
  ga4Id: string;
  gtmId: string;
  googleVerification: string;
  customHead: string;
  customBody: string;
  customFooter: string;
  events: {
    pageView: boolean;
    formStart: boolean;
    lead: boolean;
    completeRegistration: boolean;
    click?: boolean;
    scroll?: boolean;
  };
}

export interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  faviconUrl: string;
  schemaType: string;
}

export interface FomoConfig {
  enabled: boolean;
  source: "recentLeads" | "sample";
  respectReducedMotion: boolean;
  names: string[];
  cities: string[];
  minDelaySec: number;
  maxDelaySec: number;
  displaySec: number;
  position: "left" | "right";
  template: string; // supports {name} {city} {mins}
}

export interface ExitIntentConfig {
  enabled: boolean;
  respectReducedMotion: boolean;
  templateId: "offer" | "urgency" | "trust" | "premium" | "limited";
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  fontFamily: string;
  textColor: string;
  titleColor: string;
  descriptionColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  triggerDelaySec: number;
  minTimeOnPageSec: number;
  minScrollPercent: number;
  allowMobile: boolean;
  position: "center" | "bottom-right" | "bottom-left";
  showCloseButton: boolean;
  showImage: boolean;
  imageUrl: string;
  imageAlt: string;
  imagePosition: "left" | "right";
}

export interface SalesAdviceScenario {
  id: string;
  title: string;
  trigger: string;
  whenToUse: string;
  script: string;
  tips: string;
  enabled: boolean;
}

export interface SalesAdviceConfig {
  enabled: boolean;
  saleAdviceTemplate: string;
  behaviorSummaryTemplate: string;
  deviceTechInfoTemplate: string;
  trafficAdsSourceTemplate: string;
  scenarios: SalesAdviceScenario[];
}

export interface CountdownConfig {
  enabled: boolean;
  slotsLeft: number;
  autoDecrement: boolean;
  headline: string;
  template: "classic" | "premium" | "urgent" | "minimal";
  endMode: "endOfMonth" | "fixed";
  endDate: string; // ISO, used when endMode === "fixed"
}

export interface FloatingContactConfig {
  enabled: boolean;
  hotline: string;
  zalo: string;
  messenger: string;
  animateHotline?: boolean;
  animateMessenger?: boolean;
}

export interface TrafficStatsConfig {
  enabled: boolean;
  position: "footer" | "afterHero";
  title: string;
  helperText: string;
}

export interface FooterConfig {
  logoUrl: string;
  menuLabel: string;
  menuLinks: { label: string; href: string }[];
  sponsorText: string;
}

export interface GallerySliderConfig {
  id: string;
  heading: string;
  description: string;
  imageUrls: string[];
  captions: string[];
  enabled: boolean;
  insertAfter: string;
}

export interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type: "text" | "tel" | "email" | "select";
  required: boolean;
}

export interface FormConfig {
  headline: string;
  ctaLabel: string;
  webhookUrl: string;
  redirectUrl: string;
  rateLimitCount: number;
  rateLimitWindowMin: number;
  fields: FormField[];
}

export interface AiAdvisorConfig {
  enabled: boolean;
  vipDeviceRegex: string;
  keyRegions: string;
  fastFillThresholdSec: number;
  vipTimeOnPageSec: number;
  vipScrollPercent: number;
  weightDevice: number;
  weightRegion: number;
  weightFastFill: number;
  weightTimeOnPage: number;
  weightScroll: number;
  weightReturnVisit: number;
  callScriptTemplate: string;
}

export interface ThemeConfig {
  primary: string;
  gold: string;
  fontHeading: string;
  fontBody: string;
}

export interface LandingConfig {
  sectionsArray: {
    id: string;
    type: string;
    label: string;
    enabled: boolean;
    order: number;
    content?: {
      heading: string;
      body: string;
      imageUrl: string;
      variant?: string;
      buttonLabel: string;
      buttonHref: string;
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
    };
  }[];
  brandName: string;
  imageOptimization: {
    convertUploadsToWebp: boolean;
    quality: number;
  };
  watermark: {
    enabled: boolean;
    text: string;
    opacity: number;
  };
  copyProtection: {
    enabled: boolean;
    blockContextMenu: boolean;
    blockImageDrag: boolean;
    disableSelection: boolean;
  };
  showLogo: boolean;
  logoUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroMediaMode: "image" | "slider";
  heroImageUrl: string;
  heroSliderImages: string[];
  heroSliderIntervalMs: number;
  galleryImageUrls: string[];
  expertImageUrls: string[];
  heroTrustItems: string[];
  heroCtaLabel: string;
  stats: { value: string; label: string }[];
  painHeading: string;
  pains: string[];
  benefitsHeading: string;
  benefits: { stat: string; title: string; text: string }[];
  majorsHeading: string;
  majorsDescription: string;
  majorNames: string[];
  majorIcons: string[];
  majorDescriptions: string[];
  expertsHeading: string;
  expertsDescription: string;
  experts: { name: string; role: string; bio: string; experience: string }[];
  galleryHeading: string;
  galleryDescription: string;
  galleryCaptions: string[];
  gallerySliders: GallerySliderConfig[];
  graduationBadge: string;
  graduationHeading: string;
  graduationDescription: string;
  graduationImageUrls: string[];
  testimonialsHeading: string;
  testimonials: {
    name: string;
    meta: string;
    text: string;
    avatarUrl?: string;
  }[];
  stepsHeading: string;
  steps: { number: string; title: string; description: string }[];
  faqHeading: string;
  faqs: { slug: string; question: string; answer: string }[];
  finalCtaHeading: string;
  finalCtaDescription: string;
}

export interface SiteConfig {
  admin: AdminConfig;
  analyticsReport: {
    enabled: boolean;
    recipientEmail: string;
    schedule: "off" | "2h" | "4h" | "6h" | "12h" | "daily" | "weekly";
    subject: string;
    body: string;
    includeSourceBreakdown: boolean;
    includeLeadSummary: boolean;
  };
  pages: SitePage[];
  tracking: TrackingConfig;
  seo: SeoConfig;
  theme: ThemeConfig;
  landing: LandingConfig;
  fomo: FomoConfig;
  exitIntent: ExitIntentConfig;
  countdown: CountdownConfig;
  floatingContact: FloatingContactConfig;
  trafficStats: TrafficStatsConfig;
  footer: FooterConfig;
  form: FormConfig;
  aiAdvisor: AiAdvisorConfig;
  salesAdvice: SalesAdviceConfig;
  webhooks: WebhookEndpoint[];
  emailAutomation: {
    enabled: boolean;
    provider: "resend" | "gmail";
    fromEmail: string;
    notifyEmail: string;
    salesEmailList: string[];
    salesDistributionMode: "random" | "daily_round_robin" | "weighted_percent";
    salesDistributionWeights: Record<string, number>;
    salesSendWebhook: boolean;
    brandName: string;
    brandLogoUrl: string;
    headerText: string;
    ctaLabel: string;
    ctaUrl: string;
    customerCtaLabel: string;
    customerCtaUrl: string;
    salesCtaLabel: string;
    salesCtaUrl: string;
    resendApiKey: string;
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRefreshToken: string;
    subject: string;
    body: string;
    notifySubject: string;
    notifyBody: string;
  };
  abTest: {
    enabled: boolean;
    split: number; // % to variant B
    variantALabel: string;
    variantBLabel: string;
    variantAHeadline: string;
    variantBHeadline: string;
    variantACta: string;
    variantBCta: string;
  };
}

export const DEFAULT_CONFIG: SiteConfig = {
  admin: {
    adminPath: "admin",
    password: "",
    storageMode: "database",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseAdminEmail: "",
    backupEmail: "",
    cronSchedule: "off",
    backupCronToken: "",
  },
  analyticsReport: {
    enabled: true,
    recipientEmail: "",
    schedule: "off",
    subject: "[Analytics Report] {date}",
    body: "Báo cáo ngày {date}\n\nLượt truy cập: {totalVisits}\nLượt đăng ký: {totalLeads}\nTỷ lệ CR: {conversionRate}\n\n{note}",
    includeSourceBreakdown: true,
    includeLeadSummary: true,
  },
  pages: [
    {
      id: "home",
      title: "Trang chủ",
      path: "",
      kind: "landing",
      enabled: true,
      showInMenu: true,
      menuOrder: 0,
      heading: "",
      description: "",
      ctaLabel: "",
      ctaHref: "#dang-ky",
      sectionIds: [],
    },
    {
      id: "thank-you",
      title: "Cảm ơn",
      path: "cam-on",
      kind: "thankYou",
      enabled: true,
      showInMenu: false,
      menuOrder: 1,
      heading: "Cảm ơn bạn đã đăng ký!",
      description:
        "Thông tin đã được ghi nhận. Tư vấn viên sẽ liên hệ với bạn trong thời gian sớm nhất.",
      ctaLabel: "Về trang chủ",
      ctaHref: "/",
      sectionIds: [],
    },
  ],
  tracking: {
    facebookPixelId: "",
    tiktokPixelId: "",
    tiktokAccessToken: "",
    ga4Id: "",
    gtmId: "",
    googleVerification: "",
    customHead: "",
    customBody: "",
    customFooter: "",
    events: {
      pageView: true,
      formStart: true,
      lead: true,
      completeRegistration: true,
      click: true,
      scroll: true,
    },
  },
  seo: {
    title: "Du học nghề Trung Quốc 2026 — Học bổng miễn phí KTX, cam kết Visa",
    description:
      "Chương trình du học nghề Trung Quốc trọn gói: học bổng miễn 100% KTX, vừa học vừa làm lương 15-25 triệu/tháng, cam kết Visa 100%. Đăng ký tư vấn miễn phí.",
    keywords:
      "du học nghề trung quốc, học bổng trung quốc, du học vừa học vừa làm",
    ogImage:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    faviconUrl: "/favicon.ico",
    schemaType: "EducationalOrganization",
  },
  theme: {
    primary: "#c0392b",
    gold: "#d4af37",
    fontHeading: "Be Vietnam Pro",
    fontBody: "Be Vietnam Pro",
  },
  landing: {
    imageOptimization: {
      convertUploadsToWebp: true,
      quality: 0.82,
    },
    watermark: {
      enabled: false,
      text: "Du học nghề Trung Quốc",
      opacity: 0.35,
    },
    copyProtection: {
      enabled: false,
      blockContextMenu: true,
      blockImageDrag: true,
      disableSelection: false,
    },
    sectionsArray: [
      { id: "hero", type: "hero", label: "Hero", enabled: true, order: 0 },
      { id: "stats", type: "stats", label: "Stats", enabled: true, order: 1 },
      {
        id: "pains",
        type: "pains",
        label: "Pain points",
        enabled: true,
        order: 2,
      },
      {
        id: "benefits",
        type: "benefits",
        label: "Benefits",
        enabled: true,
        order: 3,
      },
      {
        id: "majors",
        type: "majors",
        label: "Ngành học",
        enabled: true,
        order: 4,
      },
      {
        id: "experts",
        type: "experts",
        label: "Chuyên gia",
        enabled: true,
        order: 5,
      },
      {
        id: "gallery",
        type: "gallery",
        label: "Gallery",
        enabled: true,
        order: 6,
      },
      {
        id: "testimonials",
        type: "testimonials",
        label: "Testimonials",
        enabled: true,
        order: 7,
      },
      {
        id: "steps",
        type: "steps",
        label: "Lộ trình",
        enabled: true,
        order: 8,
      },
      { id: "faq", type: "faq", label: "FAQ", enabled: true, order: 9 },
      {
        id: "finalCta",
        type: "finalCta",
        label: "CTA cuối",
        enabled: true,
        order: 10,
      },
    ],
    brandName: "Trung tâm Hướng nghiệp & Phát triển Sự nghiệp Quốc tế",
    showLogo: true,
    logoUrl: "",
    heroEyebrow: "Học THCS, THPT, Trung cấp, Cao đẳng hay Đại học?",
    heroTitle: "Tương lai không tự thay đổi nếu hôm nay bạn không dám",
    heroHighlight: "lựa chọn.",
    heroDescription:
      "Bạn đang làm công nhân trong nhà máy, xí nghiệp?\nBạn đang làm công việc thu nhập thấp và chưa thấy tương lai?\nHay bạn vẫn chưa biết nên học gì để có một nghề ổn định?\n\nDu học nghề Trung Quốc - vừa học, vừa thực hành có lương từ 15-30 triệu/tháng.",
    heroMediaMode: "image",
    heroImageUrl: "",
    heroSliderImages: [],
    heroSliderIntervalMs: 4500,
    galleryImageUrls: ["", "", "", ""],
    expertImageUrls: ["", "", ""],
    heroTrustItems: [
      "Học bổng lên đến 75%",
      "Không cần chứng chỉ HSK trước khi nhập học",
      "Không chứng minh tài chính",
      "Tốt nghiệp nhận bằng Cao đẳng chính quy, có thể liên thông Đại học",
      "🚁 Drone/Flycam - thực hành với hệ sinh thái DJI",
      "🚗 Công nghệ ô tô điện - định hướng thực hành theo hệ sinh thái BYD",
      "💻 Thương mại điện tử, AI, IoT và Smart Home",
    ],
    heroCtaLabel: "Nhận lộ trình phù hợp",
    stats: [
      { value: "100%", label: "Học viên có việc làm khi thực tập" },
      { value: "15-30tr", label: "Thu nhập mỗi tháng khi vừa học vừa làm" },
      { value: "8", label: "Ngành công nghệ đang khát nhân lực" },
      { value: "0Đ", label: "Học phí trong toàn bộ khóa học" },
    ],
    painHeading: "Nếu bạn đang gặp một trong ba điều này, bạn cần đọc tiếp",
    pains: [
      "Làm công nhân 10-12 tiếng/ngày, lương không tăng, tay nghề không lên.",
      "Không có bằng cấp quốc tế nên mãi không thoát khỏi vị trí lao động phổ thông.",
      "Muốn đi nước ngoài nhưng sợ chi phí hàng trăm triệu và rủi ro môi giới.",
    ],
    benefitsHeading: "4 lợi ích vàng của chương trình",
    benefits: [
      {
        stat: "0Đ",
        title: "Học phí bằng 0",
        text: "Doanh nghiệp Trung Quốc tài trợ toàn bộ học phí theo chương trình liên kết đào tạo nhân lực.",
      },
      {
        stat: "80%",
        title: "80% thực hành",
        text: "Chỉ 20% lý thuyết. Bạn làm việc trực tiếp trên dây chuyền, máy móc và công nghệ mới nh��t.",
      },
      {
        stat: "15-30tr",
        title: "Lương cứng mỗi tháng",
        text: "Vừa học vừa làm, thu nhập 15-30 triệu/tháng, đủ chi phí sinh hoạt và gửi về gia đình.",
      },
      {
        stat: "Bằng",
        title: "Cao đẳng chính quy quốc tế",
        text: "Bằng Cao đẳng chính quy được công nhận quốc tế, mở đường ở lại làm việc hoặc học tiếp.",
      },
    ],
    majorsHeading: "8 ngành nghề phát triển trong 5-20 năm tới",
    majorsDescription:
      "Các lựa chọn bám sát chuyển dịch công nghệ, sản xuất và thương mại giữa Việt Nam – Trung Quốc.",
    majorNames: [
      "Công nghệ Ô tô điện",
      "Công nghệ Drone (UAV)",
      "Thương mại điện tử",
      "Logistics & Chuỗi cung ứng",
      "Kỹ thuật Điện tử",
      "IoT - Internet vạn vật",
      "Cơ khí tự động hóa",
      "Hán ngữ thương mại",
    ],
    majorIcons: ["🚗", "🛸", "🛒", "🚚", "🔌", "📡", "⚙️", "🀄"],
    majorDescriptions: [
      "Đón đầu xu hướng điện hóa giao thông, pin thế hệ mới và hệ sinh thái xe thông minh.",
      "Phát triển cùng nhu cầu UAV trong nông nghiệp, vận chuyển, khảo sát và cứu hộ.",
      "Mở rộng theo thương mại xuyên biên giới, bán hàng đa kênh và vận hành bằng dữ liệu.",
      "Giữ vai trò cốt lõi khi chuỗi cung ứng khu vực ngày càng tự động hóa và kết nối sâu.",
      "Là nền tảng cho thiết bị thông minh, năng lượng sạch, robot và sản xuất công nghệ cao.",
      "Kết nối nhà máy, đô thị và thiết bị thông minh trong nền kinh tế số tương lai.",
      "Thúc đẩy nhà máy thông minh, robot cộng tác và dây chuyền sản xuất ít phụ thuộc lao động tay chân.",
      "Tạo lợi thế trong thương mại, dịch vụ và hợp tác doanh nghiệp Việt Nam – Trung Quốc.",
    ],
    expertsHeading: "Đội ngũ chuyên gia tư vấn",
    expertsDescription:
      "Đồng hành từ lúc chọn ngành, chuẩn bị hồ sơ đến khi học viên sẵn sàng nhập học.",
    experts: [
      {
        name: "Ths. Nguyễn Thu Hương",
        role: "Chuyên gia định hướng ngành học",
        bio: "Tập trung đánh giá năng lực, sở thích và mục tiêu dài hạn để giúp học viên chọn ngành phù hợp.",
        experience:
          "Kinh nghiệm tư vấn lộ trình học nghề quốc tế và định hướng nghề nghiệp sau tốt nghiệp.",
      },
      {
        name: "Ông Lê Quang Vinh",
        role: "Chuyên gia hồ sơ & tuyển sinh",
        bio: "Đồng hành cùng học viên từ bước rà soát điều kiện đến hoàn thiện hồ sơ nhập học và visa.",
        experience:
          "Kinh nghiệm xử lý hồ sơ tuyển sinh, thủ tục du học và chuẩn bị trước khi xuất cảnh.",
      },
      {
        name: "Cô Phạm Minh Anh",
        role: "Chuyên gia đồng hành học viên",
        bio: "Hỗ trợ học viên chuẩn bị ngôn ngữ, kỹ năng thích nghi và kế hoạch học tập tại Trung Quốc.",
        experience:
          "Kinh nghiệm đào tạo kỹ năng tiền du học và hỗ trợ học viên trong quá trình hòa nhập.",
      },
    ],
    galleryHeading: "Hình ảnh thực tế: visa, trường học & ký túc xá",
    galleryDescription:
      "Ảnh từ các khóa học viên đã bay và trường đối tác tại Trung Quốc.",
    galleryCaptions: [
      "Visa du học sinh đã được cấp cho học viên khóa gần nhất",
      "Khuôn viên trường Cao đẳng nghề đối tác tại Trung Quốc",
      "Phòng ký túc xá trong trường — miễn 100% phí ở",
      "Học viên lên đường nhập học kỳ tháng 9",
    ],
    gallerySliders: [
      {
        id: "ky-ket",
        heading: "Hình ảnh ký kết hợp tác",
        description:
          "Các buổi lễ ký kết hợp tác giữa trung tâm và trường đại học, doanh nghiệp đối tác tại Trung Quốc.",
        imageUrls: [],
        captions: [],
        enabled: true,
        insertAfter: "gallery",
      },
      {
        id: "dantoc-quangtay",
        heading: "Trường Đại học Dân tộc Quảng Tây",
        description:
          "Khuôn viên, cơ sở vật chất và môi trường học tập tại Trường Đại học Dân tộc Quảng Tây.",
        imageUrls: [],
        captions: [],
        enabled: true,
        insertAfter: "gallery",
      },
      {
        id: "congnghe-qualam",
        heading:
          "Trường Đại học Công nghệ Kỹ thuật Quế Lâm — Học viện Công nghệ Quảng Tây",
        description:
          "Học viên được các tập đoàn lớn tiếp nhận vào làm việc thực tập ngay trong quá trình học, tiếp cận công nghệ và dây chuyền sản xuất tiên tiến.",
        imageUrls: [],
        captions: [],
        enabled: true,
        insertAfter: "gallery",
      },
      {
        id: "dh-qualam",
        heading: "Trường Đại học Quế Lâm",
        description:
          "Cơ sở đào tạo và khuôn viên Trường Đại học Quế Lâm — đối tác tuyển sinh của chương trình.",
        imageUrls: [],
        captions: [],
        enabled: true,
        insertAfter: "gallery",
      },
    ],
    graduationBadge: "Khóa 2023-2026 Tốt nghiệp",
    graduationHeading:
      "Lễ tốt nghiệp chính quy tại Trường Đại học Công nghệ Điện tử Quế Lâm",
    graduationDescription:
      "🎓 Ngày 25/6/2026, Trường Đại học Công nghệ Điện tử Quế Lâm – Cơ sở Bắc Hải đã long trọng tổ chức Lễ tốt nghiệp và trao bằng cho sinh viên khóa 2026 với sự tham dự của Ban Giám hiệu nhà trường, lãnh đạo các đơn vị, khoa, phòng ban cùng đông đảo giảng viên và sinh viên.\n\nĐặc biệt, trong lễ tốt nghiệp năm nay có các sinh viên tốt nghiệp chương trình cao đẳng nghề thuộc Đề án “Một vành đai, Một con đường” mà chúng ta đã và đang triển khai. Các em được tham dự và nhận bằng trong cùng lễ tốt nghiệp chính thức của nhà trường với toàn thể sinh viên khóa 2026.\n\nĐây là một dấu mốc rất ý nghĩa, thể hiện sự ghi nhận của nhà trường đối với chương trình đào tạo, đồng thời khẳng định tính chính quy và sự gắn kết của chương trình trong hệ thống đào tạo của Trường Đại học Công nghệ Điện tử Quế Lâm.",
    graduationImageUrls: [],
    testimonialsHeading: "Học viên đi trước nói gì",
    testimonials: [
      {
        name: "Nguyễn Văn Hùng",
        meta: "Ngành Ô tô điện · Quảng Châu · khóa tháng 9",
        text: "Trước em làm xưởng gỗ 7 triệu/tháng. Sang đây vừa học vừa làm được hơn 20 triệu, tháng nào cũng gửi về nhà 10 triệu. Tay nghề lên hẳn vì được làm trên xe thật.",
        avatarUrl: "",
      },
      {
        name: "Trần Thị Ngọc",
        meta: "Ngành Thương mại điện tử · Nghĩa Ô",
        text: "Em không biết tiếng Hán, được học nền tảng trước khi bay nên sang không bị choáng. Giờ em phụ trách livestream cho một shop, thu nhập ổn định.",
        avatarUrl: "",
      },
      {
        name: "Lê Đình Phúc",
        meta: "Ngành Drone (UAV) · Thâm Quyến",
        text: "Nhà em không đủ tiền cho đi du học tự túc. Chương trình 0Đ giúp em học ngành công nghệ mà chi phí ban đầu rất nhẹ. Ra trường có bằng Cao đẳng chính quy.",
        avatarUrl: "",
      },
    ],
    stepsHeading: "Lộ trình 4 bước đơn giản",
    steps: [
      {
        number: "01",
        title: "Đăng ký & tư vấn 1:1",
        description:
          "Điền form, chuyên viên gọi lại trong 30 phút, gửi lộ trình chi tiết.",
      },
      {
        number: "02",
        title: "Chọn ngành & xét hồ sơ",
        description:
          "Chọn 1 trong 8 ngành hot, hoàn thiện hồ sơ theo hướng dẫn từng bước.",
      },
      {
        number: "03",
        title: "Học tiếng Hán & định hướng",
        description: "Đào tạo tiếng Hán nền tảng và kỹ năng trước khi bay.",
      },
      {
        number: "04",
        title: "Nhập học & bắt đầu kiếm tiền",
        description:
          "Sang trường đối tác, học nghề và làm việc có lương ngay từ kỳ đầu.",
      },
    ],
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      {
        slug: "thoi_gian_hoc",
        question: "Chương trình học bao nhiêu năm?",
        answer:
          "Chương trình học 03 năm hệ Cao đẳng chính quy. Sau khi tốt nghiệp, sinh viên có thể liên thông lên Đại học nếu có nhu cầu.\n\nNăm đầu tiên chủ yếu học tiếng Trung, văn hóa, lịch sử và các kiến thức hội nhập; đồng thời làm quen với môi trường học tập, sinh hoạt tại Trung Quốc.",
      },
      {
        slug: "luong_thuc_hanh",
        question: "Lương thực hành có đủ để trang trải chi phí không?",
        answer:
          "Có. Mỗi năm, sinh viên có khoảng 08 tháng thực hành hưởng lương và chỉ học lý thuyết tại trường khoảng 04 tháng.\n\nMức thu nhập thực hành thường đủ để trang trải chi phí sinh hoạt trong suốt quá trình học. Nếu chi tiêu hợp lý, nhiều bạn còn có thể tích lũy một khoản vốn trước khi tốt nghiệp.",
      },
      {
        slug: "bang_tot_nghiep",
        question: "Sau khi tốt nghiệp sẽ nhận bằng gì?",
        answer:
          "Sinh viên được cấp bằng Cao đẳng chính quy do trường tại Trung Quốc cấp, có thể liên thông lên Đại học và được công nhận tại hơn 30 quốc gia theo quy định, thỏa thuận công nhận văn bằng của từng nước.",
      },
      {
        slug: "ky_nhap_hoc",
        question: "Mỗi năm có bao nhiêu kỳ nhập học?",
        answer:
          "Thông thường chương trình có 02 kỳ nhập học:\n\n• Kỳ tháng 3\n• Kỳ tháng 9",
      },
      {
        slug: "dieu_kien_tuyen_sinh",
        question: "Chương trình nhận độ tuổi và trình độ như thế nào?",
        answer:
          "Học viện Kỹ sư Quế Lâm\n• Độ tuổi: Dưới 35 tuổi\n• Trình độ: Tốt nghiệp THCS trở lên\n\nĐại học Khoa học Kỹ thuật Điện tử Quế Lâm (GUET)\n• Độ tuổi: Dưới 30 tuổi\n• Trình độ: Tốt nghiệp THPT trở lên\n\nĐại học Nghề nghiệp Nam Thông (tỉnh Giang Tô)\n• Độ tuổi: Dưới 25 tuổi\n• Trình độ: Tốt nghiệp THPT trở lên",
      },
    ],
    finalCtaHeading: "Đổi 30 giây hôm nay cho 5 năm tới của bạn",
    finalCtaDescription:
      "Nhận lộ trình chi tiết, danh sách trường và mức lương thực tế theo từng ngành — hoàn toàn 0Đ.",
  },
  fomo: {
    enabled: true,
    source: "recentLeads",
    respectReducedMotion: true,
    names: [
      "Trần Văn Nam",
      "Nguyễn Thị Hà",
      "Lê Minh Quân",
      "Phạm Thu Trang",
      "Hoàng Văn Dũng",
      "Đỗ Thị Mai",
      "Vũ Đức Anh",
      "Bùi Thanh Tùng",
      "Ngô Thị Lan",
      "Đặng Hữu Phước",
    ],
    cities: [
      "Bình Dương",
      "Hà Nội",
      "Bắc Giang",
      "Nghệ An",
      "Thanh Hóa",
      "Hải Phòng",
      "Đồng Nai",
      "Thái Nguyên",
      "Cần Thơ",
      "Đắk Lắk",
    ],
    minDelaySec: 10,
    maxDelaySec: 18,
    displaySec: 5,
    position: "left",
    template: "{name} ({city}) vừa đăng ký nhận tư vấn",
  },
  exitIntent: {
    enabled: true,
    respectReducedMotion: true,
    templateId: "offer",
    badge: "Quyết định nhanh",
    title: "Chưa chắc chắn? Học phí 0Đ và lộ trình phù hợp vẫn đang mở",
    description:
      "Bạn đang lướt trên trang. Nếu muốn nhận gói tư vấn miễn phí, số lượng suất tư vấn và học bổng ưu tiên đang được ưu tiên cho người quan tâm trong 24h tới.",
    ctaLabel: "Nhận tư vấn ngay",
    fontFamily: "Be Vietnam Pro",
    textColor: "#f8fafc",
    titleColor: "#ffffff",
    descriptionColor: "#e2e8f0",
    buttonBackground: "linear-gradient(135deg, #c0392b 0%, #fbbf24 100%)",
    buttonTextColor: "#ffffff",
    triggerDelaySec: 8,
    minTimeOnPageSec: 20,
    minScrollPercent: 35,
    allowMobile: true,
    position: "center",
    showCloseButton: true,
    showImage: true,
    imageUrl:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Học viên tư vấn du học nghề",
    imagePosition: "left",
  },
  countdown: {
    enabled: true,
    slotsLeft: 12,
    autoDecrement: true,
    headline: "suất học bổng miễn 100% KTX tháng này",
    template: "premium",
    endMode: "endOfMonth",
    endDate: "",
  },
  floatingContact: {
    enabled: true,
    hotline: "0900000000",
    zalo: "https://zalo.me/0900000000",
    messenger: "",
    animateHotline: true,
    animateMessenger: true,
  },
  trafficStats: {
    enabled: true,
    position: "footer",
    title: "Thống kê truy cập thông minh",
    helperText:
      "Dữ liệu truy cập được gom từ cùng một kho tracking để đồng bộ giữa Analytics, Mini-CRM và Webhook.",
  },
  footer: {
    logoUrl: "",
    menuLabel: "Liên kết nhanh",
    menuLinks: [
      { label: "Đăng ký tư vấn", href: "#dang-ky-cuoi" },
      { label: "Câu hỏi thường gặp", href: "#faq" },
    ],
    sponsorText:
      "Đơn vị bảo trợ chuyên môn & tuyển sinh: Trung tâm Hướng nghiệp & Phát triển Sự nghiệp Quốc tế. Chương trình liên kết đào tạo với các trường Cao đẳng nghề và doanh nghiệp tại Trung Quốc.",
  },
  form: {
    headline: "Đăng ký nhận tư vấn miễn phí",
    ctaLabel: "ĐĂNG KÝ NGAY",
    webhookUrl: "https://hook.us2.make.com/jtwmjkp2t8wrlr4f080ppgc84u3e53aa",
    redirectUrl: "",
    rateLimitCount: 3,
    rateLimitWindowMin: 5,
    fields: [
      {
        name: "name",
        label: "Họ và tên",
        placeholder: "Nguyễn Văn A",
        type: "text",
        required: true,
      },
      {
        name: "phone",
        label: "Số điện thoại",
        placeholder: "09xx xxx xxx",
        type: "tel",
        required: true,
      },
      {
        name: "email",
        label: "Email (không bắt buộc)",
        placeholder: "email@example.com",
        type: "email",
        required: false,
      },
      {
        name: "city",
        label: "Tỉnh/Thành phố",
        placeholder: "Chọn tỉnh/thành",
        type: "select",
        required: true,
      },
      {
        name: "major",
        label: "Ngành học quan tâm",
        placeholder: "Chọn ngành",
        type: "select",
        required: true,
      },
    ],
  },
  aiAdvisor: {
    enabled: true,
    vipDeviceRegex:
      "iPhone (13|14|15|16) Pro|Pro Max|Galaxy S(22|23|24)|Fold|Flip",
    keyRegions: "Nghệ An|Hà Tĩnh|Quảng Bình|Thanh Hóa|Quảng Ninh|Hải Phòng",
    fastFillThresholdSec: 4,
    vipTimeOnPageSec: 80,
    vipScrollPercent: 70,
    weightDevice: 20,
    weightRegion: 15,
    weightFastFill: 15,
    weightTimeOnPage: 20,
    weightScroll: 15,
    weightReturnVisit: 15,
    callScriptTemplate:
      "Chào {name}, em gọi từ chương trình du học nghề Trung Quốc. Em thấy anh/chị ở {city}, quan tâm ngành {major}. Dựa trên hành vi online, em đánh giá khách là {ai_rank} (score {ai_score}). Gợi ý: {sale_advice}",
  },
  salesAdvice: {
    enabled: true,
    saleAdviceTemplate:
      "⭐ {rank} · {recommendation}\n📍 {city} · {major}\n🧠 {details}\n📱 {device} · {os} · {browser}\n📡 {network} · {battery}\n🎯 {source} / {medium} / {campaign}",
    behaviorSummaryTemplate:
      "⏱️ {timeOnPage} · {firstInteraction} · {scrollDepth} · {focusSection}\n🧠 {details}\n📌 {city} · {major}",
    deviceTechInfoTemplate:
      "📱 {device}\n🧩 {os}\n🌐 {browser}\n📡 {network}\n🔋 {battery}\n📐 {screen}",
    trafficAdsSourceTemplate:
      "🎯 {source}\n📣 {medium}\n🏷️ {campaign}\n🧩 {content}\n🔍 {term}",
    scenarios: [
      {
        id: "vip-qualification",
        title: "Kịch bản VIP nhanh",
        trigger:
          "Khách ở thiết bị cao cấp, xem lâu, cuộn sâu, ở tỉnh trọng điểm",
        whenToUse:
          "Dùng khi khách có dấu hiệu đang cân nhắc nghiêm túc và cần chốt lịch tư vấn ngay",
        script:
          "Chào anh/chị, em là tư vấn viên của chương trình du học nghề Trung Quốc. Em thấy anh/chị đang quan tâm rất kỹ đến ngành và lộ trình học. Nếu anh/chị muốn, em sẽ tư vấn miễn phí 1:1 và gợi ý ngành phù hợp với khả năng, mục tiêu tiền lương và thời gian phù hợp nhất.",
        tips: "- Giữ lời chào ngắn, không đọc dài\n- Hỏi mục tiêu chính: 'Anh/chị muốn đi sớm hay muốn chọn ngành nào trước?'\n- Chốt lịch tư vấn và gửi lộ trình ngay trong cuộc gọi",
        enabled: true,
      },
      {
        id: "hesitant-budget",
        title: "Kịch bản lo lắng chi phí",
        trigger: "Khách đọc kỹ phần học phí, lương thực tập, chi phí sinh hoạt",
        whenToUse:
          "Dùng khi khách có tâm lý 'sợ tốn tiền' hoặc 'không biết có thực sự đủ khả năng'",
        script:
          "Em hiểu anh/chị đang quan tâm tới chi phí và độ an toàn. Chương trình này là hình thức du học nghề hợp tác doanh nghiệp, nên chi phí thực tế rất rõ ràng. Em sẽ giải thích từng phần: học phí, sinh hoạt, lương thực tập và cơ hội việc làm sau tốt nghiệp để anh/chị có căn cứ lựa chọn.",
        tips: "- Nêu rõ phần nào là 0Đ, phần nào là chi phí có thể kiểm soát\n- Chỉ ra ví dụ lương thực tập thực tế\n- Chốt bằng cách gửi tài liệu và lịch tư vấn 1:1",
        enabled: true,
      },
      {
        id: "language-fear",
        title: "Kịch bản sợ tiếng Trung",
        trigger:
          "Khách dừng lâu ở phần điều kiện tiếng Trung, học trước khi đi",
        whenToUse:
          "Dùng khi khách lo ngại chưa biết tiếng Trung hoặc cảm giác 'không dám đi'",
        script:
          "Anh/chị đừng lo lắng về tiếng Trung. Chương trình có khóa nền tảng tiếng Hán và kỹ năng thích nghi trước khi nhập học. Mục tiêu không phải học ngay ngay 100% giỏi, mà là đi đúng lộ trình và có hướng dẫn từ đầu đến khi làm việc.",
        tips: "- Thể hiện hỗ trợ từ đầu\n- Gây tin tưởng bằng lộ trình học rõ ràng\n- Đừng nhấn mạnh quá nhiều rủi ro, hãy biến nỗi sợ thành giải pháp rõ",
        enabled: true,
      },
    ],
  },
  webhooks: [],
  emailAutomation: {
    enabled: false,
    provider: "resend",
    fromEmail: "",
    notifyEmail: "",
    salesEmailList: [],
    salesDistributionMode: "daily_round_robin",
    salesDistributionWeights: {},
    salesSendWebhook: true,
    brandName: "Funnel Builder",
    brandLogoUrl: "",
    headerText: "Funnel Builder",
    ctaLabel: "Nhận tư vấn ngay",
    ctaUrl: "#dang-ky",
    customerCtaLabel: "Nhận tư vấn ngay",
    customerCtaUrl: "#dang-ky",
    salesCtaLabel: "Mở lead trong CRM",
    salesCtaUrl: "{landing_url}#dang-ky",
    resendApiKey: "",
    gmailClientId: "",
    gmailClientSecret: "",
    gmailRefreshToken: "",
    subject: "Cảm ơn {name} – Chúng tôi đã ghi nhận yêu cầu tư vấn của bạn",
    body: "Kính chào {name},\n\nCảm ơn anh/chị đã dành thời gian để lại thông tin trên website.\n\nChúng tôi đã nhận được nhu cầu tư vấn về ngành {major} tại {city} và đang tiến hành rà soát thông tin để kết nối với tư vấn viên phù hợp nhất.\n\nTrong thời gian sớm nhất, đội ngũ tư vấn của chúng tôi sẽ liên hệ qua số {phone} để trao đổi lộ trình học, điều kiện nhập học và các ưu đãi phù hợp với mục tiêu nghề nghiệp của anh/chị.\n\nNếu anh/chị muốn được tư vấn ngay, vui lòng giữ điện thoại trong trạng thái sẵn sàng hoặc phản hồi lại email này để được hỗ trợ nhanh hơn.\n\nTrân trọng,\nĐội ngũ tư vấn chuyên nghiệp",
    notifySubject: "[Lead mới] {name} | {phone} | {city} | {major} | {source}",
    notifyBody:
      "Một lead mới vừa đăng ký trên website.\n\nHọ tên: {name}\nSố điện thoại: {phone}\nTỉnh/Thành: {city}\nNgành quan tâm: {major}\nNguồn: {source}\nAI Score: {ai_score}\nThời gian: {timestamp}\n\nVui lòng gọi lại trong vòng 10 phút để chốt lịch tư vấn và ưu tiên lead theo mức độ phù hợp.",
  },
  abTest: {
    enabled: false,
    split: 50,
    variantALabel: "Variant A",
    variantBLabel: "Variant B",
    variantAHeadline: "",
    variantBHeadline: "",
    variantACta: "",
    variantBCta: "",
  },
};
