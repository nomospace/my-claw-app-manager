"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
  action: "start" | "stop"
  port: number
}

export function PasswordModal({
  isOpen,
  onClose,
  onSubmit,
  action,
  port,
}: PasswordModalProps) {
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setPassword("")
      setError("")
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError("请输入密码")
      return
    }

    setLoading(true)
    setError("")

    try {
      await onSubmit(password)
      onClose()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "验证失败"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">
          {action === "start" ? "🚀 启动应用" : "🛑 关闭应用"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          端口 {port} - 请输入密码确认操作
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3"
            disabled={loading}
          />

          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "验证中..." : "确认"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}