import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'

export async function GET(req: NextRequest) {
  await connectDBForApp()
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (
    !username ||
    typeof username !== 'string' ||
    !/^[a-zA-Z0-9]+$/.test(username)
  ) {
    return NextResponse.json(
      { available: false, message: 'Invalid username' },
      { status: 400 }
    )
  }
  const exists = await User.exists({ username })
  return NextResponse.json({ available: !exists })
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
