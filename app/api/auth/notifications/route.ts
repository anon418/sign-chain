import { NextRequest, NextResponse } from 'next/server'
import Notification from '../../../../models/Notification'
import { connectDBForApp } from '../../../../lib/dbConnect'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { decryptEmailNode } from '../../../../utils/crypto'

async function getUserFromRequest(req: NextRequest) {
  const cookie = req.cookies.get('token')?.value
  if (!cookie || !process.env.JWT_SECRET) return null
  try {
    return jwt.verify(cookie, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  await connectDBForApp()
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json(
      { message: '인증 정보가 없습니다.' },
      { status: 401 }
    )
  try {
    const userEmail = (user as JwtPayload)?.email?.trim().toLowerCase()
    const notifications = await Notification.find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()
    const result = notifications
      .filter((n) => {
        try {
          return (
            decryptEmailNode(n.recipientEmail).trim().toLowerCase() ===
            userEmail
          )
        } catch {
          return false
        }
      })
      .map((n: any) => ({
        ...n,
        recipientEmail: decryptEmailNode(n.recipientEmail),
        senderEmail: n.senderEmail
          ? decryptEmailNode(n.senderEmail)
          : undefined,
        id: (n as any)._id.toString(),
      }))
    return NextResponse.json({ notifications: result })
  } catch (error: any) {
    return NextResponse.json(
      { message: '알림을 가져오는 중 오류 발생', error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  await connectDBForApp()
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json(
      { message: '인증 정보가 없습니다.' },
      { status: 401 }
    )
  try {
    const body = await req.json()
    const { id } = body
    if (!id)
      return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 })
    await Notification.findByIdAndUpdate(id, { read: true })
    return NextResponse.json({ message: '알림 읽음 처리 완료' })
  } catch (error: any) {
    return NextResponse.json(
      { message: '알림 읽음 처리 중 오류 발생', error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  await connectDBForApp()
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json(
      { message: '인증 정보가 없습니다.' },
      { status: 401 }
    )
  try {
    const body = await req.json()
    const { id, all } = body
    if (all) {
      const notifications = await Notification.find({})
      const userEmail = (user as JwtPayload)?.email?.trim().toLowerCase()
      const idsToDelete = notifications
        .filter((n) => {
          try {
            return (
              decryptEmailNode(n.recipientEmail).trim().toLowerCase() ===
              userEmail
            )
          } catch {
            return false
          }
        })
        .map((n) => n._id)
      await Notification.deleteMany({ _id: { $in: idsToDelete } })
      return NextResponse.json({ message: '전체 알림 삭제 완료' })
    }
    if (!id)
      return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 })
    await Notification.findByIdAndDelete(id)
    return NextResponse.json({ message: '알림 삭제 완료' })
  } catch (error: any) {
    return NextResponse.json(
      { message: '알림 삭제 중 오류 발생', error: error.message },
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
        'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
