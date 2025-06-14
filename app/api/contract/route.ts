import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../lib/dbConnect'
import Contract from '../../../models/Contract'
import jwt from 'jsonwebtoken'
import { decryptEmailNode } from '../../../utils/crypto'

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
  if (!user) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
  }
  let userId = ''
  if (typeof user === 'object' && user !== null && 'id' in user) {
    userId = (user as any).id
  } else if (typeof user === 'object' && user !== null && '_id' in user) {
    userId = (user as any)._id
  }
  if (!userId)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const contracts = await Contract.find({
      $or: [{ uploaderId: userId }, { recipientId: userId, received: true }],
      deletedBy: { $ne: userId },
    }).sort({ createdAt: -1 })
    const safeContracts = contracts.map((c) => {
      let senderEmail = c.senderEmail
      let recipientEmail = c.recipientEmail
      try {
        if (typeof senderEmail === 'string' && senderEmail.includes(':')) {
          senderEmail = decryptEmailNode(senderEmail)
        }
      } catch {
        senderEmail = ''
      }
      try {
        if (
          typeof recipientEmail === 'string' &&
          recipientEmail.includes(':')
        ) {
          recipientEmail = decryptEmailNode(recipientEmail)
        }
      } catch {
        recipientEmail = ''
      }
      return {
        ...c.toObject(),
        senderEmail,
        recipientEmail,
      }
    })
    return NextResponse.json(safeContracts)
  } catch (err: any) {
    console.error('API /contract error:', err)
    return NextResponse.json(
      { message: '서버 오류', error: String(err) },
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
