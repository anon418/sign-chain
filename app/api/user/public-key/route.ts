import { NextRequest, NextResponse } from 'next/server'
import User from '../../../../models/User'
import { connectDBForApp } from '../../../../lib/dbConnect'

export async function GET(req: NextRequest) {
  await connectDBForApp()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json(
      { message: 'userId가 필요합니다.' },
      { status: 400 }
    )
  }
  const user = await User.findById(userId)
  if (!user || !user.publicKey) {
    return NextResponse.json({ message: '공개키가 없습니다.' }, { status: 404 })
  }
  return NextResponse.json({ publicKey: user.publicKey })
}
