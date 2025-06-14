import { NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import { connectDBForApp } from '../../../../lib/dbConnect'
import TempUser from '../../../../models/TempUser'
import User from '../../../../models/User'
import { decryptEmailNode } from '../../../../utils/crypto'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(req: NextRequest) {
  await connectDBForApp()
  // 인증 미들웨어 대체: 쿠키에서 토큰 추출 및 검증
  const cookie = req.cookies.get('token')?.value
  if (!cookie) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  let decoded: any
  try {
    const jwt = require('jsonwebtoken')
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { message: '서버 설정 오류: JWT_SECRET이 정의되지 않았습니다.' },
        { status: 500 }
      )
    }
    decoded = jwt.verify(cookie, process.env.JWT_SECRET)
  } catch (err: any) {
    return NextResponse.json(
      { message: '유효하지 않은 토큰입니다.' },
      { status: 403 }
    )
  }
  const email = decoded?.email?.toLowerCase().trim()
  if (!email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  // label에 평문 이메일 사용
  let plainEmail = email
  if (plainEmail && plainEmail.includes(':')) {
    try {
      plainEmail = decryptEmailNode(plainEmail)
    } catch {}
  }
  const tempUser = await TempUser.findOne({ email })
  if (!tempUser) {
    // TempUser가 없을 때 User에도 없으면 회원가입 유도, User가 있으면 이미 인증됨 안내
    const user = await User.findOne({ email })
    if (user) {
      return NextResponse.json(
        {
          message: '이미 인증된 계정입니다. 로그인 후 OTP 인증을 진행하세요.',
        },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        {
          message: '임시 회원 정보가 없습니다. 회원가입을 다시 진행해 주세요.',
        },
        { status: 404 }
      )
    }
  }
  // otpauth_url 생성
  let plainOtpSecret = tempUser.otpSecret
  if (plainOtpSecret && plainOtpSecret.includes(':')) {
    try {
      plainOtpSecret = decryptEmailNode(plainOtpSecret)
    } catch {}
  }
  const otpauth_url = speakeasy.otpauthURL({
    secret: plainOtpSecret,
    label: `${plainEmail}`,
    issuer: 'SignChain',
    encoding: 'base32',
  })
  try {
    const dataUrl = await qrcode.toDataURL(otpauth_url)
    return NextResponse.json({ qrCodeUrl: dataUrl, otpSecret: plainOtpSecret })
  } catch (err: any) {
    return NextResponse.json(
      { message: 'QR 코드 생성 실패', error: err.message },
      { status: 500 }
    )
  }
}
