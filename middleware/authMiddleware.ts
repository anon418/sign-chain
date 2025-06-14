import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'cookie'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NextApiRequest를 확장하여 user 속성을 포함
interface CustomNextApiRequest extends NextApiRequest {
  user?: any // 필요에 따라 'any'를 더 구체적인 타입으로 변경할 수 있습니다.
}

const allowUnauthenticatedPaths: string[] = ['/api/auth/register']
const allowOtpUnverifiedPaths: string[] = ['/api/otp/setup', '/api/otp/verify']

const getPath = (url: string) => url.split('?')[0]

const authenticateToken =
  (handler: any) => async (req: CustomNextApiRequest, res: NextApiResponse) => {
    console.log('[MIDDLEWARE] 진입:', req.url, req.method, req.cookies)

    const path = getPath(req.url || '')
    console.log(
      '[MIDDLEWARE] path:',
      path,
      'method:',
      req.method,
      'token:',
      req.cookies.token
    )

    // 쿠키 파싱 추가
    if (!req.cookies) {
      const cookieHeader = req.headers?.cookie
      req.cookies = cookieHeader ? parse(cookieHeader) : {}
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: '서버 설정 오류: JWT_SECRET이 정의되지 않았습니다.' })
    }

    if (allowUnauthenticatedPaths.includes(getPath(req.url || ''))) {
      return handler(req, res)
    }

    if (allowOtpUnverifiedPaths.includes(getPath(req.url || ''))) {
      // OTP 미인증이어도 통과
      try {
        const token = req.cookies.token
        if (!token) {
          return res.status(401).json({ message: '인증이 필요합니다.' })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
        req.user = typeof decoded === 'string' ? {} : decoded
        return handler(req, res)
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ message: '토큰이 만료되었습니다.' })
        }
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' })
      }
    }

    const token = req.cookies.token
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
      const decodedUser = typeof decoded === 'string' ? {} : decoded
      req.user = decodedUser
      // 모든 인증된 API에서 OTP 미인증 또는 인증서 미유효 시 차단
      if (!decodedUser.otpVerified) {
        return res.status(403).json({ message: 'OTP 인증 필요' })
      }
      if (decodedUser.certificateStatus !== 'valid') {
        return res.status(403).json({ message: '인증서가 유효하지 않습니다.' })
      }
      return handler(req, res)
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: '토큰이 만료되었습니다.' })
      }
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' })
    }
  }

export default authenticateToken

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set(
    'Access-Control-Allow-Origin',
    process.env.NEXTAUTH_URL || 'http://localhost:3000'
  )
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  )
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
