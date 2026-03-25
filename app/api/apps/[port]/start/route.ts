import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface AppConfig {
  name?: string
  startCmd?: string
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

// 验证密码
function verifyPassword(password: string): boolean {
  const envPassword = process.env.PASSWORD
  if (!envPassword) {
    console.error('PASSWORD not set in environment')
    return false
  }
  return password === envPassword
}

// 启动应用
async function startApp(port: string): Promise<{ success: boolean; message: string }> {
  const appsConfig = getAppsConfig()
  const config = appsConfig[port]

  if (!config?.startCmd) {
    // 尝试默认启动方式
    return {
      success: false,
      message: `端口 ${port} 未配置启动命令`,
    }
  }

  try {
    // 后台启动
    await execAsync(`nohup ${config.startCmd} > /dev/null 2>&1 &`)
    
    // 等待一下让进程启动
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      success: true,
      message: `已执行启动命令: ${config.startCmd}`,
    }
  } catch (error) {
    console.error('Start app error:', error)
    return {
      success: false,
      message: `启动失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { port: string } }
) {
  try {
    const { port } = params
    const body = await request.json()
    const { password } = body

    // 验证密码
    if (!password || !verifyPassword(password)) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      )
    }

    // 验证端口号
    const portNum = parseInt(port, 10)
    if (isNaN(portNum) || portNum < 3000 || portNum > 3009) {
      return NextResponse.json(
        { error: '无效的端口号' },
        { status: 400 }
      )
    }

    const result = await startApp(port)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        port: portNum,
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Start app error:', error)
    return NextResponse.json(
      { error: '启动应用失败' },
      { status: 500 }
    )
  }
}