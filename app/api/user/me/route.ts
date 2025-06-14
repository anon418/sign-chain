import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import forge from 'node-forge'
import jwt from 'jsonwebtoken'
import { decryptEmailNode } from '../../../../utils/crypto'

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}

export async function GET(req: NextRequest) {
  await connectDBForApp()
  const cookie = req.cookies.get('token')?.value
  if (!cookie || !process.env.JWT_SECRET) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
  }
  let decoded: any
  try {
    decoded = jwt.verify(cookie, process.env.JWT_SECRET)
  } catch {
    return NextResponse.json(
      { message: '유효하지 않은 토큰입니다.' },
      { status: 401 }
    )
  }
  const userId = decoded?._id || decoded?.id || decoded?.userId
  const dbUser = await User.findById(userId)
  if (!dbUser)
    return NextResponse.json({ message: 'User not found' }, { status: 404 })

  // 인증서 만료 자동 검사 및 상태 업데이트
  let certificateStatus = dbUser.certificateStatus
  if (dbUser.certificate) {
    try {
      const cert = forge.pki.certificateFromPem(dbUser.certificate)
      const now = new Date()
      if (cert.validity.notAfter < now) {
        if (certificateStatus !== 'expired') {
          dbUser.certificateStatus = 'expired'
          await dbUser.save()
        }
        certificateStatus = 'expired'
      }
    } catch (e) {
      // 인증서 파싱 오류 시 expired로 처리
      if (certificateStatus !== 'expired') {
        dbUser.certificateStatus = 'expired'
        await dbUser.save()
      }
      certificateStatus = 'expired'
    }
  }

  let email = decoded?.email
  if (email && email.includes(':')) {
    try {
      email = decryptEmailNode(email)
    } catch {}
  }

  return NextResponse.json({
    userId: dbUser._id,
    username: dbUser.username,
    email: email,
    certificateStatus,
  })
}
