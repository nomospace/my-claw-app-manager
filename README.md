# 🦞 Claw App Manager

管理本地应用端口 3000-3010 的 Web Portal。

## 功能特点

- 📊 **端口扫描**：自动检测 3000-3010 端口的应用状态
- 🚀 **一键启动**：通过配置命令启动应用
- 🛑 **安全关闭**：密码验证后安全关闭应用
- 📱 **移动端友好**：响应式设计，支持手机/平板/桌面

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 操作密码
PASSWORD=your_password_here

# 应用配置（JSON 格式）
APPS_CONFIG={"3000":{"name":"我的应用","startCmd":"npm start"}}
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/apps` | GET | 获取端口状态列表 |
| `/api/apps/[port]/start` | POST | 启动应用（需密码） |
| `/api/apps/[port]/stop` | POST | 关闭应用（需密码） |

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI**: 自定义组件（类 shadcn/ui）

## 安全说明

- 密码仅存储在本地环境变量
- 所有操作需密码验证
- `.env.local` 已加入 `.gitignore`

## License

MIT