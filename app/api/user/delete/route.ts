import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import Notification from '../../../../models/Notification'
import jwt from 'jsonwebtoken'
import Contract from '../../../../models/Contract'
import { makeSetCookieString } from '../../../../utils/cookieUtils'

export async function DELETE(req: NextRequest) {
  await connectDBForApp()
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
  const session = await User.startSession()
  session.startTransaction()
  try {
    const user = await User.findById(userId)
    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    // 1. 계약서는 삭제하지 않음 (userId가 업로더/수신자여도)
    // 1-1. 수신자인 계약서 중 status가 signed가 아닌(즉, uploaded 등 미서명) 경우만 rejected로 일괄 변경
    await Contract.updateMany(
      { recipientId: userId, status: { $ne: 'signed' } },
      { $set: { status: 'rejected' } }
    )
    // 2. Notification 삭제 (이메일 기준)
    await Notification.deleteMany({ recipientEmail: user.email })
    // 3. User의 인증서 상태를 revoked로 변경
    user.certificateStatus = 'revoked'
    await user.save()
    // 4. User 삭제
    await User.findByIdAndDelete(userId)
    await session.commitTransaction()
    session.endSession()
    const response = NextResponse.json({
      message: 'Account deleted, certificate revoked. Contracts remain.',
    })
    response.headers.set(
      'Set-Cookie',
      makeSetCookieString('token', '', { clear: true })
    )
    response.headers.append(
      'Set-Cookie',
      makeSetCookieString('refresh_token', '', { clear: true })
    )
    return response
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { message: 'Failed to delete account and related data' },
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
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
