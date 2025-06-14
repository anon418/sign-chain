import { NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import User from '../../../../models/User'
import jwt from 'jsonwebtoken'

export async function GET(req: NextRequest) {
  // 인증 미들웨어 대체: 쿠키에서 토큰 추출 및 검증
  const cookie = req.cookies.get('token')?.value
  if (!cookie) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  let decoded: any
  try {
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
  const userId = decoded?.id
  const secret = speakeasy.generateSecret({ name: 'MyAppName' })
  await User.findByIdAndUpdate(userId, { otpSecret: secret.base32 })
  try {
    const otpauthUrl = secret.otpauth_url ?? ''
    const data_url = await qrcode.toDataURL(otpauthUrl)
    return NextResponse.json({
      message: 'OTP 시크릿 생성 완료',
      secret: secret.base32,
      qrCodeUrl: data_url,
    })
  } catch (err: any) {
    return NextResponse.json({ message: 'QR 코드 생성 실패' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
