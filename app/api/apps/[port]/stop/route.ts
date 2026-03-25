import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface AppConfig {
  name?: string
  startCmd?: string
  nginxConfig?: string
  backendPort?: number
  directPort?: boolean  // 应用直接监听对外端口，无 Nginx 代理
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

// 通过端口查找并杀死进程
async function killProcessByPort(port: number): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`/usr/sbin/fuser -k ${port}/tcp 2>/dev/null || true`)
    return { success: true, message: `已关闭端口 ${port}` }
  } catch (error) {
    return { success: true, message: `端口 ${port} 无进程` }
  }
}

// 禁用 Nginx 配置（关闭对外端口）
async function disableNginxConfig(configName: string): Promise<{ success: boolean; message: string }> {
  if (!configName) {
    return { success: true, message: '' }
  }

  try {
    const confPath = `/etc/nginx/conf.d/${configName}.conf`
    const disabledPath = `/etc/nginx/conf.d/${configName}.conf.disabled`
    
    // 如果配置存在且未禁用，则禁用
    await execAsync(`sudo test -f ${confPath} && sudo mv ${confPath} ${disabledPath} || true`)
    
    // 也检查 sites-available/sites-enabled
    const sitesAvailablePath = `/etc/nginx/sites-available/${configName}`
    const sitesEnabledPath = `/etc/nginx/sites-enabled/${configName}`
    await execAsync(`sudo test -f ${sitesEnabledPath} && sudo rm ${sitesEnabledPath} || true`)
    
    await execAsync(`sudo systemctl reload nginx`)
    
    return { success: true, message: '已关闭外网端口' }
  } catch (error) {
    console.error('Disable nginx error:', error)
    return { success: false, message: `关闭外网端口失败` }
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

    const messages: string[] = []

    // 1. 如果应用直接监听对外端口（无 Nginx 代理），关闭该端口
    if (appConfig?.directPort) {
      const result = await killProcessByPort(portNum)
      if (result.message) messages.push(result.message)
    }
    // 2. 否则，如果有后端端口，关闭后端进程
    else if (appConfig?.backendPort) {
      const backendResult = await killProcessByPort(appConfig.backendPort)
      if (backendResult.message) messages.push(backendResult.message)
    }

    // 3. 关闭 Nginx 对外端口（如果有配置）
    if (appConfig?.nginxConfig) {
      const nginxResult = await disableNginxConfig(appConfig.nginxConfig)
      if (nginxResult.message) messages.push(nginxResult.message)
    }

    // 4. 如果没有任何配置
    if (!appConfig?.directPort && !appConfig?.backendPort && !appConfig?.nginxConfig) {
      messages.push('该应用未配置关闭方式')
    }

    return NextResponse.json({
      success: true,
      message: messages.join('；') || '操作完成',
      port: portNum
    })
  } catch (error) {
    console.error('Stop app error:', error)
    return NextResponse.json(
      { error: '停止应用失败' },
      { status: 500 }
    )
  }
}