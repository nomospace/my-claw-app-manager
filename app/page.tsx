"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PasswordModal } from "@/components/PasswordModal"

interface AppStatus {
  port: number
  status: "running" | "stopped"
  name: string
}

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
  }

  // 提交密码并执行操作
  const handlePasswordSubmit = async (password: string) => {
    setActionLoading(true)
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
      await fetchApps()
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 头部 */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                🦞 Claw App Manager
              </h1>
              <p className="text-sm text-slate-500">
                管理本地应用端口 3000-3009
              </p>
            </div>
            <Button
              onClick={() => fetchApps(true)}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {refreshing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  刷新中
                </>
              ) : (
                <>🔄 刷新</>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
              <p className="text-slate-500">扫描端口中...</p>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600">
            ❌ {error}
          </div>
        )}

        {/* 应用列表 */}
        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <Card
                key={app.port}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">
                          {app.name}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="text-slate-500">端口 {app.port}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            app.status === "running"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {app.status === "running" ? (
                            <>
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                              运行中
                            </>
                          ) : (
                            <>
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                              已停止
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={app.status === "running" ? "destructive" : "default"}
                      onClick={() =>
                        handleAction(
                          app.port,
                          app.status === "running" ? "stop" : "start"
                        )
                      }
                      disabled={actionLoading}
                      className="shrink-0"
                    >
                      {app.status === "running" ? "🛑 关闭" : "🚀 启动"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 统计信息 */}
        {!loading && !error && apps.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            共 {apps.length} 个端口 ·{" "}
            {apps.filter((a) => a.status === "running").length} 个运行中 ·{" "}
            {apps.filter((a) => a.status === "stopped").length} 个已停止
          </div>
        )}
      </div>

      {/* 密码模态框 */}
      <PasswordModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handlePasswordSubmit}
        action={modalAction}
        port={modalPort}
      />
    </main>
  )
}