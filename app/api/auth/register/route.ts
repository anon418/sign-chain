import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import User from '../../../../models/User'
import { connectDBForApp } from '../../../../lib/dbConnect'
import speakeasy from 'speakeasy'
import jwt from 'jsonwebtoken'
import TempUser from '../../../../models/TempUser'
import { encryptEmailNode, decryptEmailNode } from '../../../../utils/crypto'
import { randomUUID } from 'crypto'
import { makeSetCookieString } from '../../../../utils/cookieUtils'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  const body = await req.json()
  const { email, username, password } = body
  if (!email || !username || !password) {
    return NextResponse.json(
      { message: '모든 필드가 필요합니다.' },
      { status: 400 }
    )
  }
  try {
    // User 필드에 저장된 사용자 중복 체크
    const users = await User.find({})
    const emailExists = users.some(
      (u) =>
        !!u.email &&
        typeof u.email === 'string' &&
        u.email.includes(':') &&
        (() => {
          try {
            return decryptEmailNode(u.email) === email
          } catch {
            return false
          }
        })()
    )
    const usernameExists = users.some((u) => u.username === username)
    if (emailExists || usernameExists) {
      return NextResponse.json(
        { message: '이미 사용 중인 이메일 또는 사용자 이름입니다.' },
        { status: 400 }
      )
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const otpSecret = speakeasy.generateSecret({ length: 20 })
    // TempUser 컬렉션에 임시 저장
    const encryptedEmail = encryptEmailNode(email)
    const encryptedOtpSecret = encryptEmailNode(otpSecret.base32)
    await TempUser.create({
      email: encryptedEmail,
      username,
      password: hashedPassword,
      otpSecret: encryptedOtpSecret,
    })
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { message: '서버 설정 오류: JWT_SECRET이 정의되지 않았습니다.' },
        { status: 500 }
      )
    }
    // 임시 토큰은 암호문, 실제 토큰은 OTP 인증 후 평문으로 발급됨
    const token = jwt.sign(
      { id: encryptedEmail, email: encryptedEmail },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    )
    const refreshSecret =
      process.env.REFRESH_JWT_SECRET || 'default_refresh_secret'
    const refreshJti = randomUUID()
    const refreshToken = jwt.sign(
      { id: encryptedEmail, jti: refreshJti },
      refreshSecret,
      { expiresIn: '14d' }
    )
    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json(
      {
        message: '회원가입 성공. OTP 인증을 완료해야 정보가 저장됩니다.',
        redirectTo: '/otp/setup',
        info: 'OTP 인증까지 마치지 않으면 입력 정보는 저장되지 않습니다.',
      },
      { status: 201 }
    )
    response.headers.append(
      'Set-Cookie',
      makeSetCookieString('token', token, { maxAge: 3600 })
    )
    response.headers.append(
      'Set-Cookie',
      makeSetCookieString('refresh_token', refreshToken, { maxAge: 1209600 })
    )
    return response
  } catch (error: any) {
    console.error('[REGISTER ERROR]', error)
    return NextResponse.json(
      {
        message: '서버 오류',
        error: error.message,
        info: '회원가입 중단/실패 시 입력 정보는 저장되지 않습니다.',
      },
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
