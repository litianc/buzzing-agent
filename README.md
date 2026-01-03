# Buzzing Agent

一个多语言内容聚合平台，自动抓取全球热门技术社区内容并翻译为多种语言。

## 功能特性

- **多源聚合** - 支持 Hacker News、Lobsters、Ars Technica、The Guardian、Nature、Sky News、Dev.to、Product Hunt 等
- **自动翻译** - 内容自动翻译为中文、英文、日文
- **响应式设计** - 适配桌面端和移动端，支持图片/无图模式切换
- **Priority+ 导航** - 智能响应式导航栏，自动折叠溢出链接
- **RSS 订阅** - 每个源都支持 RSS 订阅

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite + Drizzle ORM
- **国际化**: next-intl
- **部署**: PM2 + GitHub Actions CI/CD

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

访问 http://localhost:3000

## 环境变量

复制 `.env.sample` 为 `.env` 并配置：

```env
# 翻译 API（可选）
TRANSLATE_API_KEY=your_api_key
```

## 数据抓取

手动触发抓取：

```bash
# 抓取所有源
curl http://localhost:3000/api/cron/fetch-hn
curl http://localhost:3000/api/cron/fetch-lobsters
curl http://localhost:3000/api/cron/fetch-devto
# ... 其他源
```

## 部署

### 服务器初始化

```bash
# 克隆代码
git clone https://github.com/litianc/buzzing-agent.git
cd buzzing-agent

# 使用 Node 22
source ~/.nvm/nvm.sh
nvm use 22

# 安装、构建、启动
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
```

### CI/CD 自动部署

推送到 `main` 分支会自动触发部署。需要在 GitHub 仓库设置以下 Secrets：

| Secret | 说明 |
|--------|------|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | SSH 用户名 |
| `SERVER_PORT` | SSH 端口 |
| `SERVER_SSH_KEY` | SSH 私钥 |

## 项目结构

```
src/
├── app/                  # Next.js App Router
│   ├── [locale]/         # 国际化路由
│   │   ├── [source]/     # 源详情页
│   │   └── page.tsx      # 首页
│   └── api/              # API 路由
│       ├── cron/         # 定时抓取接口
│       └── posts/        # 文章接口
├── components/           # React 组件
│   ├── home/             # 首页组件
│   ├── layout/           # 布局组件
│   └── post/             # 文章组件
├── contexts/             # React Context
├── db/                   # 数据库 Schema
├── i18n/                 # 国际化配置
├── messages/             # 翻译文件
├── services/             # 数据抓取服务
└── types/                # TypeScript 类型
```

## License

MIT
