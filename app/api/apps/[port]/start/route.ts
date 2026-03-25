import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface AppConfig {
  name?: string
  startCmd?: string
  nginxConfig?: string
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

// 启用 Nginx 配置（开启对外端口）
async function enableNginxConfig(configName: string): Promise<{ success: boolean; message: string }> {
  if (!configName) {
    return { success: true, message: '无 Nginx 配置' }
  }

  try {
    const confPath = `/etc/nginx/conf.d/${configName}.conf`
    const disabledPath = `/etc/nginx/conf.d/${configName}.conf.disabled`
    
    // 如果配置被禁用，则启用
    await execAsync(`sudo test -f ${disabledPath} && sudo mv ${disabledPath} ${confPath} || true`)
    await execAsync(`sudo systemctl reload nginx`)
    
    return { success: true, message: `已开启外网端口` }
  } catch (error) {
    console.error('Enable nginx error:', error)
    return { success: false, message: `开启外网端口失败: ${error}` }
  }
}

// 启动应用
async function startApp(port: string, config: AppConfig): Promise<{ success: boolean; message: string }> {
  if (!config?.startCmd) {
    return {
      success: false,
      message: `端口 ${port} 未配置启动命令`,
    }
  }

  try {
    // 后台启动
    await execAsync(`nohup ${config.startCmd} > /tmp/app-${port}.log 2>&1 &`)
    
    // 等待一下让进程启动
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return {
      success: true,
      message: `已执行启动命令`,
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

    // 获取应用配置
    const appsConfig = getAppsConfig()
    const appConfig = appsConfig[port]

    if (!appConfig?.startCmd) {
      return NextResponse.json(
        { error: `端口 ${port} 未配置启动命令` },
        { status: 400 }
      )
    }

    // 启用 Nginx 对外端口
    const nginxResult = await enableNginxConfig(appConfig.nginxConfig || '')

    // 启动本地应用
    const startResult = await startApp(port, appConfig)

    const messages = []
    if (nginxResult.message) messages.push(nginxResult.message)
    if (startResult.message) messages.push(startResult.message)

    if (startResult.success) {
      return NextResponse.json({
        success: true,
        message: messages.join('；'),
        port: portNum,
        nginxResult,
        startResult
      })
    } else {
      return NextResponse.json(
        { error: startResult.message },
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