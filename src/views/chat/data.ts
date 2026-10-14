export const LOGO =
  "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01thpPgF1e7RfDsfJpf_!!1818153824.png"
export const CORNER =
  "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01lsfxDZ1e7RhXgzq3S_!!1818153824.png"
export const MODEL_GT =
  "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01vq04hz1e7RfMXMrLN_!!1818153824.png"
export const MODEL_DS =
  "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01cCvNfu1e7ReKN6Szo_!!1818153824.png"
export const MODEL_GLM =
  "https://img.alicdn.com/imgextra/i4/1818153824/O1CN017ErDs91e7RfScbCf8_!!1818153824.png"
export const MODEL_KIMI =
  "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01t9QfvC1e7RfSntEPE_!!1818153824.png"
export const MODEL_DOUBAO =
  "https://img.alicdn.com/imgextra/i4/1818153824/O1CN01L6of4I1e7RftK3EK5_!!1818153824.png"

export interface NavItem {
  name: string
  key: string
  icon: string
  tag?: string
  tagCls?: string
  dot?: boolean
  page?: boolean
  active?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export interface QuickAction {
  key: string
  name: string
  /** Remix Icon class，如 ri-bar-chart-2-line */
  icon: string
  q: string
}

export interface PromptItem {
  title: string
  message: string
}

export interface ChartItem {
  name: string
  image: string
}

export interface ModelVariantItem {
  id?: number
  name: string
  modelId: string
  /** chat | image */
  capability?: string
  isDefault?: boolean
  sort?: number
}

/** 文生图尺寸（OpenAI 兼容 size 字段） */
export interface ImageSizeOption {
  value: string
  label: string
  desc: string
}

export const IMAGE_SIZE_OPTIONS: ImageSizeOption[] = [
  { value: '1024x1024', label: '1:1', desc: '方形' },
  { value: '1792x1024', label: '16:9', desc: '横版' },
  { value: '1024x1792', label: '9:16', desc: '竖版' },
  { value: '1536x1024', label: '3:2', desc: '横图' },
  { value: '1024x1536', label: '2:3', desc: '竖图' },
]

export const DEFAULT_IMAGE_SIZE = '1024x1024'

export interface ModelItem {
  /** 系列键（顶栏选择），如 gpt-5 */
  key: string
  label: string
  desc: string
  letter: string
  color: string
  /** 厂商编码，用于按厂商筛选（对应后台 provider.code） */
  series: string
  /** 厂商展示名（对应后台 provider.name） */
  providerName?: string
  /** chat | image */
  capability?: string
  hot: boolean
  cost: number
  free: boolean
  icon: string
  /** 该系列下的具体型号（输入框二次选择） */
  variants?: ModelVariantItem[]
}

export interface ModelTab {
  key: string
  label: string
}

export interface SeriesItem {
  name: string
  letter: string
  color: string
}

export const navSections: NavSection[] = [
  {
    title: "",
    items: [
      {
        name: "首页",
        key: "home",
        icon: "https://file.1foo.com/2024/11/14/d54a9e2d883625f12107ba0fdd30861c.svg",
      },
      {
        name: "GT-6 Astra",
        key: "astra",
        icon: MODEL_GT,
        tag: "旗舰模型",
        tagCls: "tag-num",
        dot: true,
      },
      {
        name: "模型对话",
        key: "chat",
        icon: "https://file.1foo.com/2024/09/24/90dd265a037e83d0526659443f14c976.svg",
        tag: "100+大模型",
        tagCls: "tag-num",
        page: true,
        active: true,
      },
      {
        name: "AI绘画",
        key: "draw",
        icon: "https://file.1foo.com/2024/09/12/d6de1893c2bbd61cf16a9a0e29928c3d.svg",
        tag: "1000+功能",
        tagCls: "tag-num",
        page: true,
      },
      {
        name: "超级智能体",
        key: "agent",
        icon: "https://file.1foo.com/2025/12/29/aa2ca925a9cac7f61d5c25c282494a12.png",
      },
      {
        name: "智能修图",
        key: "retouch",
        icon: "https://file.1foo.com/2024/09/24/15853987f4c3f595a7b1ada54fb3328e.svg",
      },
      {
        name: "图片生成",
        key: "imggen",
        icon: "https://file.1foo.com/2024/09/24/c25de71e8bf46d5b4c91ba24fc366efc.svg",
      },
      {
        name: "股票分析",
        key: "stock",
        icon: "https://cdn.ai1foo.com/access/upload/202512/180525/b65641d32f73e64baab88d9a3a0ffec7.png",
        dot: true,
      },
    ],
  },
  {
    title: "新功能",
    items: [
      {
        name: "AI配音2.0",
        key: "voice",
        icon: "https://file.1foo.com/2024/08/21/6be420ff3f3eb46cf2a9475b52d4e366.svg",
        dot: true,
      },
      {
        name: "AI画布",
        key: "canvas",
        icon: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01QJQ3Nk1e7RfBBFoy0_!!1818153824.png",
        dot: true,
      },
      {
        name: "图片处理",
        key: "image",
        icon: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01NGEfm71e7RfH0CfFQ_!!1818153824.png",
      },
      {
        name: "电商工具",
        key: "shop",
        icon: "https://img.alicdn.com/imgextra/i3/1818153824/O1CN017sUkf91e7RfGI9UAg_!!1818153824.png",
      },
      {
        name: "AI教育",
        key: "edu",
        icon: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01pClQgW1e7RfGvEVrL_!!1818153824.png",
        dot: true,
      },
      {
        name: "免费工具",
        key: "free",
        icon: "https://file.1foo.com/2025/05/21/8e9e541e6bf67bc0ff4d9bd8ead6f0f4.png",
      },
    ],
  },
  {
    title: "AI媒体",
    items: [
      {
        name: "3D 建模",
        key: "3d",
        icon: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01pClQgW1e7RfGvEVrL_!!1818153824.png",
      },
      {
        name: "视频生成3.0",
        key: "video",
        icon: "https://file.1foo.com/2025/04/07/1909fa4b12c2eb5c50c6b287ac2d4458.svg",
      },
      {
        name: "Sound音乐",
        key: "sound",
        icon: "https://file.1foo.com/2025/09/18/0d3700ee503fde197e34e3a2390a17ac.jpg",
      },
    ],
  },
  {
    title: "近期热门",
    items: [
      {
        name: "超级AI搜索",
        key: "search",
        icon: "https://file.1foo.com/2024/12/26/504e351cfe28e4438ebb9461f527ef71.svg",
      },
      {
        name: "论文助手",
        key: "paper",
        icon: "https://static.ibiling.cn/static/2023/12/14/70f393/70f393d9c2e56fd76519ee9d14db6b05.png",
      },
      {
        name: "精美PPT",
        key: "ppt",
        icon: "https://file.1foo.com/2025/05/23/23e9bbd9d4a3da03c42d83392a4e930b.svg",
      },
      {
        name: "音频处理",
        key: "audio",
        icon: "https://file.1foo.com/2024/08/21/6be420ff3f3eb46cf2a9475b52d4e366.svg",
      },
      {
        name: "AI 声音",
        key: "aisound",
        icon: "https://file.1foo.com/2025/10/30/d942284dbc0aa5bebbcd2eed34d56c1e.svg",
      },
      {
        name: "文档处理",
        key: "doc",
        icon: "https://file.1foo.com/2025/10/30/bc22138ba186b924bacc8d8806db5f51.svg",
      },
    ],
  },
]

export const quickActions: QuickAction[] = [
  {
    key: "create_report",
    name: "图表报告",
    icon: "ri-bar-chart-2-line",
    q: "用图表解读一组季度销售数据并写汇报文案",
  },
  {
    key: "create_ppt",
    name: "生成PPT",
    icon: "ri-slideshow-line",
    q: "帮我制作一份产品发布会 PPT 大纲",
  },
  {
    key: "code_execution",
    name: "应用创作",
    icon: "ri-apps-2-line",
    q: "用 AI 协作完成一个小程序原型方案",
  },
  {
    key: "generate_image",
    name: "生图/设计",
    icon: "ri-palette-line",
    q: "给我一组平面海报设计创意方向",
  },
  {
    key: "generate_video",
    name: "创意视频",
    icon: "ri-clapperboard-line",
    q: "写一个 15 秒创意短视频脚本",
  },
  {
    key: "internet_search",
    name: "网络搜索",
    icon: "ri-search-eye-line",
    q: "请搜索今天的国内和国际热点新闻，按重要性排序",
  },
  {
    key: "browser_operation",
    name: "浏览器操作",
    icon: "ri-compass-3-line",
    q: "帮我打开一个网页并总结要点",
  },
  {
    key: "thinking",
    name: "深度思考",
    icon: "ri-brain-line",
    q: "针对这个问题给我一份严谨的推理分析",
  },
]

export const promptPool: PromptItem[] = [
  {
    title: "创建产品功能对比矩阵",
    message: "创建一个产品功能对比表，比较我们的产品与 4 个主要竞争对手在核心功能、集成、定价和客户评分方面的表现。包括加权评分、差距分析和竞争定位的可视化总结。",
  },
  {
    title: "使用树形图可视化公司预算",
    message: "使用矩形树图可视化公司在各部门之间的预算分配，并显示包括人力、工具和项目支出在内的子类别。",
  },
  {
    title: "撰写带有 OKR 跟踪的团队生产力报告",
    message: "撰写团队生产力报告，跟踪当前季度工程、产品和设计团队的 OKR 完成率、迭代速度、任务吞吐量和阻碍因素。",
  },
  {
    title: "为产品发布呈现市场机会分析",
    message: "展示新产品上市的市场机会分析，包括 TAM、SAM、客户细分和需求预测，并至少使用矩形树图、柱状图和折线图。",
  },
  {
    title: "分析 2025 年各行业碳中和进展",
    message: "用堆叠柱状图对比 2025 年电力、钢铁、水泥、交通四个行业的碳排放量与同比降幅，并给出结论。",
  },
  {
    title: "制作一份用户增长复盘报告",
    message: "围绕新增、留存、召回三条主线复盘近 12 个月的用户增长，用折线图呈现趋势并定位关键拐点。",
  },
  {
    title: "生成一份季度经营分析看板",
    message: "生成季度经营分析看板：营收、毛利率、费用率、现金流四个维度，用仪表盘和面积图组合呈现。",
  },
  {
    title: "拆解一个电商大促的活动节奏",
    message: "拆解电商大促的完整活动节奏：预热、爆发、返场三阶段的关键指标与投放策略，用甘特图排期。",
  },
]

export const charts: ChartItem[] = [
  {
    name: "折线图",
    image: "https://img.alicdn.com/imgextra/i4/1818153824/O1CN011lHTeg1e7RhZTSdbS_!!1818153824.png",
  },
  {
    name: "柱状图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01Yg2RcA1e7RhZBOaW8_!!1818153824.png",
  },
  {
    name: "饼图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01hh3gXU1e7RhZUoDpH_!!1818153824.png",
  },
  {
    name: "散点图",
    image: "https://img.alicdn.com/imgextra/i4/1818153824/O1CN0170Mv8M1e7RhZdcbut_!!1818153824.png",
  },
  {
    name: "热力图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01vGXcls1e7RhZOAEZj_!!1818153824.png",
  },
  {
    name: "气泡图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01pRCCQ11e7RhZBPasa_!!1818153824.png",
  },
  {
    name: "词云",
    image: "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01dQiNZk1e7RhZNxi3j_!!1818153824.png",
  },
  {
    name: "桑基图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01do7hZ11e7RhUo0YM0_!!1818153824.png",
  },
  {
    name: "主题河流图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01i29ksv1e7RhZBPWjG_!!1818153824.png",
  },
  {
    name: "雷达图",
    image: "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01E3Jud81e7RhZHKSgr_!!1818153824.png",
  },
  {
    name: "堆叠柱状图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN015MaWyi1e7RhZBP7m3_!!1818153824.png",
  },
  {
    name: "旭日图",
    image: "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01XsG0FV1e7RhZ9efXU_!!1818153824.png",
  },
  {
    name: "漏斗图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01mdG6ts1e7RhZdc0Vm_!!1818153824.png",
  },
  {
    name: "矩形树图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01z9YK1b1e7RhZOCeEr_!!1818153824.png",
  },
  {
    name: "K线图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01oihTKJ1e7RhZ8MEHY_!!1818153824.png",
  },
  {
    name: "流程图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01bZMoug1e7RhZBOr8y_!!1818153824.png",
  },
  {
    name: "面积图",
    image: "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01qWZAEo1e7RhZTUJYc_!!1818153824.png",
  },
  {
    name: "甘特图",
    image: "https://img.alicdn.com/imgextra/i3/1818153824/O1CN01BQtQIB1e7RhZ6xCBT_!!1818153824.png",
  },
  {
    name: "地理坐标/地图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01YsCk6p1e7RhZNQcmI_!!1818153824.webp",
  },
  {
    name: "盒须图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01mVzjCJ1e7RhZ8LYgm_!!1818153824.webp",
  },
  {
    name: "关系图",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01A92Rkk1e7RhZHKGBx_!!1818153824.webp",
  },
  {
    name: "树状图",
    image: "https://img.alicdn.com/imgextra/i2/1818153824/O1CN01TWCXTR1e7RhZHKSg7_!!1818153824.webp",
  },
  {
    name: "仪表盘",
    image: "https://img.alicdn.com/imgextra/i1/1818153824/O1CN01kH2DZN1e7RhZUlwSj_!!1818153824.webp",
  },
  {
    name: "象形柱图",
    image: "https://img.alicdn.com/imgextra/i4/1818153824/O1CN01rsOH3z1e7RhZNyRmr_!!1818153824.webp",
  },
]

export const models: ModelItem[] = [
  {
    key: "gt-6.1-sol",
    label: "GT-6.1-Sol (尝鲜版)",
    desc: "GT 系列最新模型，适合创意与复杂对话",
    letter: "G",
    color: "#52c41a",
    series: "gt",
    hot: true,
    cost: 20,
    free: true,
    icon: MODEL_GT,
  },
  {
    key: "gt-6-astra",
    label: "GT-6 Astra",
    desc: "旗舰创意对话，多模态理解出色",
    letter: "G",
    color: "#52c41a",
    series: "gt",
    hot: true,
    cost: 25,
    free: false,
    icon: MODEL_GT,
  },
  {
    key: "deepseek-v4-flash",
    label: "DeepSeek-V4-Flash",
    desc: "速度与效率的均衡之选",
    letter: "D",
    color: "#1677ff",
    series: "deepseek",
    hot: true,
    cost: 10,
    free: true,
    icon: MODEL_DS,
  },
  {
    key: "deepseek-v4-pro",
    label: "DeepSeek-V4-Pro",
    desc: "高性能比肩顶尖开源模型",
    letter: "D",
    color: "#1677ff",
    series: "deepseek",
    hot: true,
    cost: 30,
    free: false,
    icon: MODEL_DS,
  },
  {
    key: "auto-pick",
    label: "Auto",
    desc: "根据问题自动挑选最合适的模型",
    letter: "A",
    color: "#fa8c16",
    series: "all",
    hot: true,
    cost: 15,
    free: true,
    icon: MODEL_GT,
  },
  {
    key: "glm-4.6",
    label: "智谱清言 GLM-4.6",
    desc: "智谱旗舰对话模型，中文理解出色",
    letter: "智",
    color: "#2f54eb",
    series: "glm",
    hot: true,
    cost: 18,
    free: false,
    icon: MODEL_GLM,
  },
  {
    key: "kimi",
    label: "Kimi-Moonshot",
    desc: "长文本理解与写作",
    letter: "K",
    color: "#f5222d",
    series: "kimi",
    hot: true,
    cost: 16,
    free: true,
    icon: MODEL_KIMI,
  },
  {
    key: "doubao",
    label: "豆包系列",
    desc: "字节跳动自研对话模型",
    letter: "豆",
    color: "#fa541c",
    series: "doubao",
    hot: false,
    cost: 12,
    free: true,
    icon: MODEL_DOUBAO,
  },
  {
    key: "grok-3",
    label: "Grok-3",
    desc: "xAI 旗舰，擅长推理与幽默对话",
    letter: "X",
    color: "#595959",
    series: "grok",
    hot: true,
    cost: 28,
    free: false,
    icon: MODEL_GT,
  },
  {
    key: "ge-vision",
    label: "Ge-Vision",
    desc: "视觉理解与图文创作",
    letter: "Ge",
    color: "#13c2c2",
    series: "ge",
    hot: false,
    cost: 22,
    free: false,
    icon: MODEL_GT,
  },
  {
    key: "clouded-pro",
    label: "Clouded Pro",
    desc: "云端多模型路由，稳定高并发",
    letter: "C",
    color: "#722ed1",
    series: "clouded",
    hot: false,
    cost: 20,
    free: true,
    icon: MODEL_GT,
  },
]

export const modelTabs: ModelTab[] = [
  {
    key: "all",
    label: "全部模型",
  },
  {
    key: "hot",
    label: "热门模型",
  },
  {
    key: "gt",
    label: "GT系列",
  },
  {
    key: "grok",
    label: "Grok系列",
  },
  {
    key: "ge",
    label: "Ge系列",
  },
  {
    key: "clouded",
    label: "Clouded",
  },
  {
    key: "deepseek",
    label: "DeepSeek系列",
  },
  {
    key: "glm",
    label: "智谱清言系列",
  },
  {
    key: "kimi",
    label: "Kimi",
  },
  {
    key: "doubao",
    label: "豆包系列",
  },
]

export const rollSeries: SeriesItem[] = [
  {
    name: "GT系列",
    letter: "G",
    color: "#52c41a",
  },
  {
    name: "Grok系列",
    letter: "X",
    color: "#595959",
  },
  {
    name: "Ge系列",
    letter: "Ge",
    color: "#13c2c2",
  },
  {
    name: "Clouded系列",
    letter: "C",
    color: "#722ed1",
  },
  {
    name: "DeepSeek系列",
    letter: "D",
    color: "#f5222d",
  },
  {
    name: "智谱清言系列",
    letter: "智",
    color: "#2f54eb",
  },
  {
    name: "Kimi-Moonshot",
    letter: "K",
    color: "#fa541c",
  },
  {
    name: "豆包系列",
    letter: "豆",
    color: "#fa8c16",
  },
  {
    name: "文心一言系列",
    letter: "文",
    color: "#1677ff",
  },
  {
    name: "通义千问系列",
    letter: "通",
    color: "#9254de",
  },
  {
    name: "Llama系列",
    letter: "L",
    color: "#08979c",
  },
  {
    name: "CodeGeeX",
    letter: "Cg",
    color: "#389e0d",
  },
  {
    name: "GLM系列",
    letter: "GLM",
    color: "#1d39c4",
  },
  {
    name: "GPT系列",
    letter: "GPT",
    color: "#237804",
  },
]

export const typeLines = [
  "👋 今天有什么我可以帮你的吗？",
  "✨ 我可以帮你写代码、回答问题",
  "🚀 让我们一起探索新可能吧！",
  "💡 有想法尽管说，我来帮你落地",
  "📝 写作、分析、绘图，随时待命",
]

export type ChatMode = 'default' | 'agent' | 'groups'

export type MessageStatus = 'generating' | 'done' | 'error' | 'stopped'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  modelLabel?: string
  streaming?: boolean
  /** 等待首个 token */
  waiting?: boolean
  status?: MessageStatus
  /** 生图占位用的目标尺寸 */
  imageSize?: string
  /** 已停止生成（保留已流出内容） */
  stopped?: boolean
}
