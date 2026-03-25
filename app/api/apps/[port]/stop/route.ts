import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
async function killProcessByPort(port: string): Promise<{ success: boolean; message: string }> {
  try {
    // 查找占用端口的进程 PID
    const { stdout } = await execAsync(`lsof -ti:${port}`)
    const pids = stdout.trim().split('\n').filter(Boolean)

    if (pids.length === 0) {
      return {
        success: false,
        message: `端口 ${port} 没有运行中的进程`,
      }
    }

    // 杀死所有相关进程
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`)
      } catch (e) {
        console.error(`Failed to kill process ${pid}:`, e)
      }
    }

    return {
      success: true,
      message: `已停止端口 ${port} 的 ${pids.length} 个进程`,
    }
  } catch (error) {
    // lsof 没有找到进程时也会报错
    return {
      success: false,
      message: `端口 ${port} 没有运行中的进程`,
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

    const result = await killProcessByPort(port)

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
    console.error('Stop app error:', error)
    return NextResponse.json(
      { error: '停止应用失败' },
      { status: 500 }
    )
  }
}