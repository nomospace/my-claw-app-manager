"use client"

import * as React from "react"

interface AppStatus {
  port: number
  status: "running" | "stopped"
  name: string
}

// Build time - 构建时注入
const BUILD_TIME = new Date().toLocaleString("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Shanghai"
})

// 公网访问地址
const PUBLIC_IP = "47.102.199.24"

export default function HomePage() {
  const [apps, setApps] = React.useState<AppStatus[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

  // 密码模态框状态
  const [modalOpen, setModalOpen] = React.useState(false)
  const [modalAction, setModalAction] = React.useState<"start" | "stop">("start")
  const [modalPort, setModalPort] = React.useState(3000)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")

  // 获取应用状态
  const fetchApps = React.useCallback(async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError("")

    try {
      const res = await fetch("/api/apps")
      if (!res.ok) {
        throw new Error("获取应用状态失败")
      }
      const data = await res.json()
      setApps(data.apps || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取应用状态失败")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    fetchApps()
  }, [fetchApps])

  // 处理按钮点击
  const handleAction = (port: number, action: "start" | "stop") => {
    setModalPort(port)
    setModalAction(action)
    setModalOpen(true)
    setPassword("")
    setPasswordError("")
  }

  // 提交密码并执行操作
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setPasswordError("请输入密码")
      return
    }

    setActionLoading(true)
    setPasswordError("")

    try {
      const endpoint = `/api/apps/${modalPort}/${modalAction}`
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "操作失败")
      }

      // 操作成功，刷新列表
      setModalOpen(false)
      await fetchApps()
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setActionLoading(false)
    }
  }

  // 获取应用访问链接
  const getAppUrl = (port: number) => {
    return `http://${PUBLIC_IP}:${port}`
  }

  // 运行中的应用数量
  const runningCount = apps.filter(a => a.status === "running").length

  return (
    <main className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo + 状态指示灯 */}
              <div className="relative">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-[var(--bg-card)]">
                    <span className="text-2xl">🦞</span>
                  </div>
                </div>
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green)]" />
              </div>
              
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="text-[var(--neon-cyan)]">CLAW</span>
                  <span className="text-[var(--text-secondary)]">::</span>
                  <span className="text-[var(--text-primary)]">APP_MANAGER</span>
                </h1>
                <p className="text-xs text-[var(--text-muted)] tracking-wider uppercase">
                  Port Control Panel v1.0
                </p>
              </div>
            </div>
            
            {/* 刷新按钮 */}
            <button
              onClick={() => fetchApps(true)}
              disabled={refreshing}
              className="btn-neon flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)] disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--neon-cyan)]" />
                  <span>SCANNING...</span>
                </>
              ) : (
                <>
                  <span>⟳</span>
                  <span>REFRESH</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* 状态概览 */}
        {!loading && !error && apps.length > 0 && (
          <div className="mb-6 flex items-center gap-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">TOTAL:</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">{apps.length}</span>
            </div>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green)]" />
              <span className="text-[var(--text-muted)]">ONLINE:</span>
              <span className="text-lg font-bold text-[var(--neon-green)]">{runningCount}</span>
            </div>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">OFFLINE:</span>
              <span className="text-lg font-bold text-[var(--text-secondary)]">{apps.length - runningCount}</span>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--border-color)] border-t-[var(--neon-cyan)]" />
              <p className="text-[var(--text-muted)] animate-pulse">SCANNING PORTS...</p>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="rounded-lg border border-[var(--status-error)]/30 bg-[var(--status-error)]/10 p-4 text-center text-[var(--status-error)]">
            <span className="mr-2">⚠</span>
            {error}
          </div>
        )}

        {/* 应用卡片网格 */}
        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app, index) => (
              <div
                key={app.port}
                className="card-animate glow-border group rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition-all duration-300 hover:bg-[var(--bg-card-hover)]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* 卡片头部 */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {/* 状态指示灯 */}
                      <span 
                        className={`h-2 w-2 rounded-full ${
                          app.status === "running" 
                            ? "bg-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green)]" 
                            : "bg-[var(--text-muted)]"
                        }`}
                      />
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {app.name}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-[var(--text-muted)]">PORT</span>
                      <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[var(--neon-cyan)]">
                        :{app.port}
                      </span>
                    </div>
                  </div>
                  
                  {/* 状态标签 */}
                  <span 
                    className={`rounded px-2 py-1 text-xs font-medium uppercase tracking-wider ${
                      app.status === "running"
                        ? "bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/30"
                        : "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border border-[var(--text-muted)]/30"
                    }`}
                  >
                    {app.status === "running" ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                {/* 快捷访问链接 */}
                {app.status === "running" && (
                  <a
                    href={getAppUrl(app.port)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center gap-2 rounded border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 px-3 py-2 text-sm text-[var(--neon-cyan)] transition-colors hover:bg-[var(--neon-cyan)]/10 hover:border-[var(--neon-cyan)]"
                  >
                    <span>🔗</span>
                    <span className="font-mono text-xs">{PUBLIC_IP}:{app.port}</span>
                    <span className="ml-auto">↗</span>
                  </a>
                )}

                {/* 操作按钮 */}
                <button
                  onClick={() => handleAction(app.port, app.status === "running" ? "stop" : "start")}
                  disabled={actionLoading}
                  className={`btn-neon w-full rounded-lg border py-2 text-sm font-medium uppercase tracking-wider transition-all disabled:opacity-50 ${
                    app.status === "running"
                      ? "border-[var(--status-error)]/30 bg-[var(--status-error)]/10 text-[var(--status-error)] hover:bg-[var(--status-error)]/20 hover:border-[var(--status-error)]"
                      : "border-[var(--neon-green)]/30 bg-[var(--neon-green)]/10 text-[var(--neon-green)] hover:bg-[var(--neon-green)]/20 hover:border-[var(--neon-green)]"
                  }`}
                >
                  {app.status === "running" ? "⏹ STOP" : "▶ START"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      <footer className="mt-auto border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-4">
              <span className="font-mono">
                BUILD: <span className="text-[var(--neon-cyan)]">{BUILD_TIME}</span>
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline font-mono">
                PUBLIC: <span className="text-[var(--text-secondary)]">{PUBLIC_IP}</span>
              </span>
            </div>
            <div className="font-mono tracking-wider">
              <span className="text-[var(--neon-purple)]">🦞</span>
              <span className="ml-1">CLAW APP MANAGER</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 密码模态框 */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className={`text-2xl ${modalAction === "start" ? "text-[var(--neon-green)]" : "text-[var(--status-error)]"}`}>
                {modalAction === "start" ? "▶" : "⏹"}
              </span>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">
                  {modalAction === "start" ? "START APPLICATION" : "STOP APPLICATION"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Port :{modalPort}
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="mb-1 block text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--neon-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]"
                  disabled={actionLoading}
                  autoFocus
                />
              </div>

              {passwordError && (
                <p className="mb-3 text-sm text-[var(--status-error)]">⚠ {passwordError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={actionLoading}
                  className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-neon flex-1 rounded-lg border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 py-2 text-sm text-[var(--neon-cyan)] transition-colors hover:bg-[var(--neon-cyan)]/20 disabled:opacity-50"
                >
                  {actionLoading ? "VERIFYING..." : "CONFIRM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}