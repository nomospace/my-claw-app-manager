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

// 通过端口查找并杀死进程
async function killProcessByPort(port: string): Promise<{ success: boolean; message: string; pids: string[] }> {
  try {
    const { stdout } = await execAsync(`fuser -k ${port}/tcp 2>/dev/null || true`)
    return {
      success: true,
      message: `已关闭端口 ${port} 的进程`,
      pids: []
    }
  } catch (error) {
    return {
      success: true,
      message: `端口 ${port} 无运行进程`,
      pids: []
    }
  }
}

// 禁用 Nginx 配置（关闭对外端口）
async function disableNginxConfig(configName: string): Promise<{ success: boolean; message: string }> {
  if (!configName) {
    return { success: true, message: '无 Nginx 配置' }
  }

  try {
    // 检查配置文件是否存在
    const confPath = `/etc/nginx/conf.d/${configName}.conf`
    const disabledPath = `/etc/nginx/conf.d/${configName}.conf.disabled`
    
    // 如果配置存在且未禁用，则禁用
    await execAsync(`sudo test -f ${confPath} && sudo mv ${confPath} ${disabledPath} || true`)
    await execAsync(`sudo systemctl reload nginx`)
    
    return { success: true, message: `已关闭外网端口` }
  } catch (error) {
    console.error('Disable nginx error:', error)
    return { success: false, message: `关闭外网端口失败: ${error}` }
  }
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

    // 关闭本地进程
    const killResult = await killProcessByPort(port)
    
    // 关闭 Nginx 对外端口
    const nginxResult = await disableNginxConfig(appConfig?.nginxConfig || '')

    const messages = [killResult.message]
    if (nginxResult.message) {
      messages.push(nginxResult.message)
    }

    return NextResponse.json({
      success: true,
      message: messages.join('；'),
      port: portNum,
      killResult,
      nginxResult
    })
  } catch (error) {
    console.error('Stop app error:', error)
    return NextResponse.json(
      { error: '停止应用失败' },
      { status: 500 }
    )
  }
}