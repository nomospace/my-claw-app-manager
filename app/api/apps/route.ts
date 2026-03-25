import { NextResponse } from 'next/server'
import net from 'net'

interface AppConfig {
  name?: string
  startCmd?: string
}

interface AppStatus {
  port: number
  status: 'running' | 'stopped'
  name?: string
}

// 从环境变量解析应用配置
function getAppsConfig(): Record<string, AppConfig> {
  try {
    const config = process.env.APPS_CONFIG
    if (config) {
      return JSON.parse(config)
    }
  } catch (e) {
    console.error('Failed to parse APPS_CONFIG:', e)
  }
  return {}
}

// 检查单个端口是否被占用
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timeout = 1000

    socket.setTimeout(timeout)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.on('error', () => {
      resolve(false)
    })
    socket.connect(port, 'localhost')
  })
}

// 扫描端口范围
async function scanPorts(start: number, end: number): Promise<AppStatus[]> {
  const appsConfig = getAppsConfig()
  const results: AppStatus[] = []

  for (let port = start; port <= end; port++) {
    const isRunning = await checkPort(port)
    const config = appsConfig[port.toString()]

    results.push({
      port,
      status: isRunning ? 'running' : 'stopped',
      name: config?.name || `应用 ${port}`,
    })
  }

  return results
}

export async function GET() {
  try {
    const apps = await scanPorts(3000, 3010)
    return NextResponse.json({ apps })
  } catch (error) {
    console.error('Scan ports error:', error)
    return NextResponse.json(
      { error: '扫描端口失败' },
      { status: 500 }
    )
  }
}