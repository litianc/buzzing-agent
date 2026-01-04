const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, LevelFormat,
        Header, Footer, PageNumber, ShadingType, VerticalAlign } = require('docx');
const fs = require('fs');

// Professional styling
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } }, // 11pt default
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 48, bold: true, color: "1a1a1a", font: "Arial" },
        paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1a1a1a", font: "Arial" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "333333", font: "Arial" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "444444", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-overview",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-arch",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-challenges",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-results",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Buzzing Agent - 产品案例研究", size: 18, color: "888888" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 18 }), new TextRun({ children: [PageNumber.CURRENT], size: 18 }), new TextRun({ text: " of ", size: 18 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })]
      })] })
    },
    children: [
      // Title
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Buzzing Agent")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "全球热门资讯聚合平台 - 产品设计与技术实现案例", size: 24, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: "作者：李天 | 2026年1月", size: 20, color: "888888" })]
      }),

      // Executive Summary
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("项目概述")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("Buzzing Agent 是一个全球热门资讯聚合平台，自动采集 Hacker News、Product Hunt、观猹等 11 个数据源的热门内容，通过 AI 翻译为中、英、日三语，帮助用户快速获取全球科技动态。")]
      }),

      // Key Metrics Table
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("核心指标")] }),
      createMetricsTable(),

      // Background
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("一、项目背景与目标")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 痛点分析")] }),
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun("作为产品经理和技术从业者，我日常需要关注全球科技动态。但在信息获取过程中，我发现存在以下痛点：")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "信息分散：", bold: true }), new TextRun("需要打开多个网站（Hacker News、Product Hunt、Dev.to 等）才能获取完整的科技资讯")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "语言障碍：", bold: true }), new TextRun("大部分优质内容为英文，阅读效率低")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "时间成本：", bold: true }), new TextRun("每天需要花费大量时间筛选有价值的内容")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "移动端体验差：", bold: true }), new TextRun("部分网站未适配移动端，或在国内访问速度慢")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 产品目标")] }),
      new Paragraph({ numbering: { reference: "numbered-overview", level: 0 }, children: [new TextRun({ text: "聚合：", bold: true }), new TextRun("整合 10+ 数据源，一站式获取全球科技热点")] }),
      new Paragraph({ numbering: { reference: "numbered-overview", level: 0 }, children: [new TextRun({ text: "翻译：", bold: true }), new TextRun("AI 自动翻译为中英日三语，消除语言障碍")] }),
      new Paragraph({ numbering: { reference: "numbered-overview", level: 0 }, children: [new TextRun({ text: "高效：", bold: true }), new TextRun("按热度排序，帮助用户快速发现有价值内容")] }),
      new Paragraph({ numbering: { reference: "numbered-overview", level: 0 }, children: [new TextRun({ text: "跨端：", bold: true }), new TextRun("响应式设计，支持桌面和移动端")] }),

      // Product Design
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("二、产品设计")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 用户画像")] }),
      createUserPersonaTable(),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 功能规划")] }),
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun("基于用户需求，我规划了以下核心功能模块：")]
      }),
      createFeatureTable(),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 数据源选择策略")] }),
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun("数据源的选择经过仔细评估，综合考虑内容质量、更新频率、API 可用性等因素：")]
      }),
      createDataSourceTable(),

      // Technical Architecture
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("三、技术架构")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 整体架构")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("采用现代化的 Serverless + Edge 架构，兼顾性能与成本：")]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        shading: { fill: "f5f5f5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "用户 → Cloudflare CDN → Vercel (东京) → Turso DB (东京)", font: "Courier New", size: 20 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        shading: { fill: "f5f5f5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "              ↑", font: "Courier New", size: 20 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        shading: { fill: "f5f5f5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "Ubuntu 服务器 (Cron Jobs) ──────────────┘", font: "Courier New", size: 20 })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 技术选型")] }),
      createTechStackTable(),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 关键设计决策")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("决策 1：数据库选择 - Turso (libSQL)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "问题：", bold: true }), new TextRun("需要多环境（本地开发、Ubuntu 服务器、Vercel）共享数据")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "方案：", bold: true }), new TextRun("选择 Turso 云端 SQLite，支持 libSQL 协议，兼容 SQLite 语法")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "优势：", bold: true }), new TextRun("免费额度充足、东京区域延迟低、无需运维")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("决策 2：读写分离架构")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "写入层：", bold: true }), new TextRun("Ubuntu 服务器运行 Cron Jobs，定时抓取数据并写入 Turso")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "读取层：", bold: true }), new TextRun("Vercel Serverless 函数读取数据，渲染页面")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "优势：", bold: true }), new TextRun("避免 Vercel 函数超时限制（10s），Cron 任务可运行数分钟")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("决策 3：中国访问优化")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "问题：", bold: true }), new TextRun("Vercel 在中国大陆访问速度慢")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "方案：", bold: true }), new TextRun("Cloudflare 代理 + 自定义域名")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "配置：", bold: true }), new TextRun("CNAME → cname.vercel-dns.com，开启 Cloudflare Proxy")] }),

      // Implementation
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("四、实现细节")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 数据采集策略")] }),
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun("针对不同数据源，设计了差异化的采集策略：")]
      }),
      createFetchStrategyTable(),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 去重与更新逻辑")] }),
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun("为避免重复数据和无效更新，设计了精细化的去重策略：")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "唯一标识：", bold: true }), new TextRun("sourceId + externalId 组合作为唯一键")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "热度更新阈值：", bold: true }), new TextRun("只有当热度增加超过阈值时才更新（HN/PH: +30, Dev.to/Watcha: +20, Lobsters: +10）")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "单向更新：", bold: true }), new TextRun("热度降低不触发更新，避免频繁写入")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 多语言翻译")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "翻译引擎：", bold: true }), new TextRun("腾讯云机器翻译 API")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "翻译策略：", bold: true }), new TextRun("采集时即翻译，存储翻译结果到 JSON 字段")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "语言检测：", bold: true }), new TextRun("记录原始语言，避免重复翻译")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 前端优化")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "响应式设计：", bold: true }), new TextRun("Tailwind CSS 实现移动端适配")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "图片模式切换：", bold: true }), new TextRun("移动端默认无图模式，节省流量")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "暗色模式：", bold: true }), new TextRun("支持系统级暗色模式自动切换")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "国际化：", bold: true }), new TextRun("next-intl 实现中英日三语界面")] }),

      // Challenges
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("五、挑战与解决方案")] }),
      createChallengesTable(),

      // Results
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("六、项目成果")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 功能完成度")] }),
      new Paragraph({ numbering: { reference: "numbered-results", level: 0 }, children: [new TextRun("11 个数据源稳定运行，每 8 小时自动更新")] }),
      new Paragraph({ numbering: { reference: "numbered-results", level: 0 }, children: [new TextRun("支持中、英、日三语自动翻译")] }),
      new Paragraph({ numbering: { reference: "numbered-results", level: 0 }, children: [new TextRun("响应式设计，支持桌面和移动端")] }),
      new Paragraph({ numbering: { reference: "numbered-results", level: 0 }, children: [new TextRun("CI/CD 自动部署，GitHub push 即上线")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 技术亮点")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "Serverless 架构：", bold: true }), new TextRun("零运维成本，按需扩展")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "边缘计算：", bold: true }), new TextRun("Vercel Edge + Turso 东京区域，亚洲用户低延迟")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "成本控制：", bold: true }), new TextRun("全部使用免费额度，零成本运营")] }),

      // Summary
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("七、经验总结")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 产品设计心得")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "从自身痛点出发：", bold: true }), new TextRun("最好的产品往往解决自己的问题")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "MVP 优先：", bold: true }), new TextRun("先上线核心功能，再迭代优化")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "数据驱动：", bold: true }), new TextRun("通过采集日志监控数据质量")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2 技术实现心得")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "选择成熟方案：", bold: true }), new TextRun("Next.js + Vercel 生态成熟，开发效率高")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "善用 Serverless：", bold: true }), new TextRun("充分利用云服务免费额度")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "关注用户体验：", bold: true }), new TextRun("针对中国用户优化访问速度")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3 待优化方向")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("增加更多数据源（Reddit、Twitter 等）")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("实现个性化推荐算法")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("添加用户收藏和订阅功能")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("接入 RSS 输出，支持 RSS 阅读器")] }),

      // Contact
      new Paragraph({
        spacing: { before: 600 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "—— END ——", color: "888888" })]
      }),
      new Paragraph({
        spacing: { before: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "项目地址：https://buzzing.litianc.cn", color: "0066cc" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "GitHub：https://github.com/litianc/buzzing-agent", color: "0066cc" })]
      }),
    ]
  }]
});

// Helper functions for tables
function createMetricsTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "1a73e8", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "数据源", bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "1a73e8", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "支持语言", bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "1a73e8", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "更新频率", bold: true, color: "FFFFFF" })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "1a73e8", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "部署平台", bold: true, color: "FFFFFF" })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "11 个", bold: true, size: 28 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "中/英/日", bold: true, size: 28 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "每 8 小时", bold: true, size: 28 })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vercel + Ubuntu", bold: true, size: 28 })] })] }),
        ]
      }),
    ]
  });
}

function createUserPersonaTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [2340, 3510, 3510],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "用户类型", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "特征", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "核心需求", bold: true })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("产品经理")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("关注行业动态和竞品信息")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("快速了解新产品、新趋势")] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("开发者")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("关注技术趋势和开源项目")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("发现优质技术文章和工具")] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("创业者")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("关注创业机会和市场动态")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("获取创业灵感和商业洞察")] })] }),
        ]
      }),
    ]
  });
}

function createFeatureTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [2340, 3510, 3510],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "模块", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "功能", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "优先级", bold: true })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("数据采集")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("自动抓取多数据源、去重、热度更新")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "P0 - 核心", color: "d93025" })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("AI 翻译")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("标题翻译为中英日三语")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "P0 - 核心", color: "d93025" })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("内容展示")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("分类展示、热度排序、响应式布局")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "P0 - 核心", color: "d93025" })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("用户体验")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("暗色模式、图片模式切换")] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "P1 - 重要", color: "f9ab00" })] })] }),
        ]
      }),
    ]
  });
}

function createDataSourceTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [2000, 3680, 3680],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "数据源", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "内容类型", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "采集方式", bold: true })] })] }),
        ]
      }),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Hacker News")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("科技新闻、创业讨论")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Firebase API")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Product Hunt")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("新产品发布")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("GraphQL API")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("观猹 (Watcha)")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("AI 产品评测")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("REST API")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Dev.to")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("开发者文章")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("REST API")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Lobsters")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("技术链接聚合")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("JSON Feed")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("The Guardian 等")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("国际新闻")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("RSS Feed")] })] }),
      ]}),
    ]
  });
}

function createTechStackTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [2340, 3120, 3900],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "层级", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "技术", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "选型理由", bold: true })] })] }),
        ]
      }),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("前端框架")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Next.js 15 + React 19")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("SSR/SSG 支持，SEO 友好")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("样式")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Tailwind CSS 4")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("原子化 CSS，开发效率高")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("数据库")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Turso (libSQL)")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("云端 SQLite，多环境共享")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("ORM")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Drizzle ORM")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("类型安全，轻量级")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("部署")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Vercel + Ubuntu")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("读写分离，绕过函数超时")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CDN")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Cloudflare")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3900, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("全球加速，免费 SSL")] })] }),
      ]}),
    ]
  });
}

function createFetchStrategyTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "数据源", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "采集数量", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "热度阈值", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "最大保留", bold: true })] })] }),
        ]
      }),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Hacker News")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Top 50")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("≥100 分")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("300 条")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Product Hunt")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("每日 Top 20")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("≥50 票")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("300 条")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("观猹")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("热榜 Top 30")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("无阈值")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("300 条")] })] }),
      ]}),
    ]
  });
}

function createChallengesTable() {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  return new Table({
    columnWidths: [3120, 3120, 3120],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "挑战", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "原因", bold: true })] })] }),
          new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "f0f0f0", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "解决方案", bold: true })] })] }),
        ]
      }),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("中国访问 Turso 超时")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("跨境网络不稳定")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("增加连接超时至 15 秒")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Vercel 函数超时")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("免费版限制 10 秒")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Cron 任务迁移到 Ubuntu")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("移动端图片模式闪烁")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("SSR 与客户端状态不一致")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("默认无图，挂载后检测")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("PM2 Node 版本冲突")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("系统 Node 12 vs nvm Node 22")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("ecosystem.config.js 指定完整路径")] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("中国访问 Vercel 慢")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Vercel 无中国节点")] })] }),
        new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Cloudflare 代理加速")] })] }),
      ]}),
    ]
  });
}

// Generate the document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/Users/xyli/Documents/Code/buzzing-agent/app/docs/Buzzing-Agent-案例研究.docx', buffer);
  console.log('Document created successfully!');
});
