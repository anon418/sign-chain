import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import forge from 'node-forge'
import { decryptEmailNode, encryptEmailNode } from '../../../../utils/crypto'
import { randomUUID } from 'crypto'
import { makeSetCookieString } from '../../../../utils/cookieUtils'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  const body = await req.json()
  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json(
      { message: '이메일, 비밀번호 모두 필요합니다.' },
      { status: 400 }
    )
  }
  try {
    const normalizedEmail = email.trim().toLowerCase()
    const users = await User.find({})
    const user = users.find(
      (u) => decryptEmailNode(u.email) === normalizedEmail
    )
    if (!user) {
      return NextResponse.json(
        { message: '등록되지 않은 이메일입니다.' },
        { status: 401 }
      )
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { message: '비밀번호가 틀렸습니다.' },
        { status: 401 }
      )
    }
    // 인증서 만료 검사 및 상태 업데이트
    if (user.certificate) {
      const cert = forge.pki.certificateFromPem(user.certificate)
      const now = new Date()
      if (now > cert.validity.notAfter) {
        user.certificateStatus = 'expired'
        await user.save()
        return NextResponse.json(
          { message: '인증서가 만료되었습니다. 재발급이 필요합니다.' },
          { status: 403 }
        )
      } else if (user.certificateStatus !== 'valid') {
        user.certificateStatus = 'valid'
        await user.save()
      }
    } else {
      return NextResponse.json(
        { message: '인증서가 없습니다.' },
        { status: 400 }
      )
    }
    // JWT 생성
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret'
    const refreshSecret =
      process.env.REFRESH_JWT_SECRET || 'default_refresh_secret'
    const refreshJti = randomUUID()
    const plainEmail = decryptEmailNode(user.email).trim().toLowerCase()
    const token = jwt.sign(
      {
        id: user._id,
        otpVerified: user.otpVerified,
        certificateStatus: user.certificateStatus,
        email: plainEmail,
        username: user.username,
      },
      jwtSecret,
      { expiresIn: '1h' }
    )
    const refreshToken = jwt.sign(
      { id: user._id, jti: refreshJti },
      refreshSecret,
      { expiresIn: '14d' }
    )
    // DB에 jti 저장 (이전 jti 무효화)
    user.currentRefreshJti = refreshJti
    await user.save()
    // Set token and refresh token as httpOnly, secure, SameSite=Strict cookies
    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({
      message: '로그인 성공',
      redirectTo: '/otp/verify?mode=login',
      userId: user._id,
    })
    response.headers.append(
      'Set-Cookie',
      makeSetCookieString('token', token, { maxAge: 3600 })
    )
    response.headers.append(
      'Set-Cookie',
      makeSetCookieString('refresh_token', refreshToken, { maxAge: 1209600 })
    )
    // 로그인 알림 추가
    const Notification = require('../../../../models/Notification').default
    function ensureEncryptedEmail(email: string) {
      if (typeof email === 'string' && email.includes(':')) return email
      return encryptEmailNode(email)
    }
    await Notification.create({
      recipientEmail: ensureEncryptedEmail(plainEmail),
      message: `로그인: ${new Date().toLocaleString('ko-KR', {
        hour12: false,
      })}`,
      timestamp: new Date(),
      read: false,
      type: 'system',
    })
    return response
  } catch (err: any) {
    console.error('[LOGIN ERROR]', err)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다: ' + err.message },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
