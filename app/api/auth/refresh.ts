import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectDBForApp } from '../../../lib/dbConnect'
import User from '../../../models/User'
import { randomUUID } from 'crypto'

const ACCESS_TOKEN_EXPIRES_IN = '1h'
const REFRESH_TOKEN_EXPIRES_IN = '14d'
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'default_jwt_secret'
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_JWT_SECRET || 'default_refresh_secret'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (!refreshToken) {
    return NextResponse.json(
      { message: 'Refresh token missing' },
      { status: 401 }
    )
  }
  let decoded: any
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
  } catch (err) {
    return NextResponse.json(
      { message: 'Invalid refresh token' },
      { status: 403 }
    )
  }
  const userId = decoded?.id
  const jti = decoded?.jti
  if (!userId || !jti) {
    return NextResponse.json(
      { message: 'Invalid token payload' },
      { status: 403 }
    )
  }
  const user = await User.findById(userId)
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }
  // jti가 DB와 일치하는지 확인
  if (user.currentRefreshJti !== jti) {
    return NextResponse.json(
      { message: 'Refresh token reuse detected or invalid' },
      { status: 403 }
    )
  }
  // 새 refresh token 발급 및 jti 갱신
  const newJti = randomUUID()
  const newRefreshToken = jwt.sign(
    { id: user._id, jti: newJti },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  )
  user.currentRefreshJti = newJti
  await user.save()
  // 새 access token 발급
  const accessToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
      otpVerified: user.otpVerified,
      certificateStatus: user.certificateStatus,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  )
  const isProduction = process.env.NODE_ENV === 'production'
  const response = NextResponse.json({ message: 'Access token refreshed' })
  response.headers.append(
    'Set-Cookie',
    `token=${accessToken}; HttpOnly; Path=/; Max-Age=3600; Secure=${
      isProduction ? 'true' : 'false'
    }; SameSite=${isProduction ? 'Strict' : 'Lax'}`
  )
  response.headers.append(
    'Set-Cookie',
    `refresh_token=${newRefreshToken}; HttpOnly; Path=/; Max-Age=1209600; Secure=${
      isProduction ? 'true' : 'false'
    }; SameSite=${isProduction ? 'Strict' : 'Lax'}`
  )
  return response
}
