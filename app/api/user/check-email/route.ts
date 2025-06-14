import { NextRequest, NextResponse } from 'next/server'
import User from '../../../../models/User'
import { connectDBForApp } from '../../../../lib/dbConnect'
import { decryptEmailNode } from '../../../../utils/crypto'

function safeDecryptEmailNode(val: string | undefined) {
  if (!val || typeof val !== 'string' || !val.includes(':')) return val || ''
  try {
    return decryptEmailNode(val)
  } catch (e) {
    return ''
  }
}

export async function GET(req: NextRequest) {
  await connectDBForApp()
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { message: '이메일이 필요합니다.' },
      { status: 400 }
    )
  }
  try {
    const users = await User.find({})
    const exists = users.some((u) => safeDecryptEmailNode(u.email) === email)
    return NextResponse.json({ exists })
  } catch (error: any) {
    return NextResponse.json(
      { message: '서버 오류', error: error.message },
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
