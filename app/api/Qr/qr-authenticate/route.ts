import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import speakeasy from 'speakeasy'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  try {
    const body = await req.json()
    const { email, otp } = body
    // 사용자 조회
    const user = await User.findOne({ email })
    if (!user || !user.otpSecret) {
      return NextResponse.json(
        { message: 'User not found or OTP not set' },
        { status: 404 }
      )
    }
    // OTP 검증
    const verified = speakeasy.totp.verify({
      secret: user.otpSecret,
      encoding: 'base32',
      token: otp,
    })
    if (!verified) {
      return NextResponse.json(
        { message: 'OTP verification failed' },
        { status: 400 }
      )
    }
    return NextResponse.json({ message: 'QR code authentication successful' })
  } catch (error: any) {
    console.error('QR 코드 인증 오류:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
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
