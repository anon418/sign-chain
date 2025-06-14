import { NextRequest, NextResponse } from 'next/server'
import User from '../../../../models/User'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json(
      { message: 'Email and password required' },
      { status: 400 }
    )
  }
  const user = await User.findOne({ email })
  if (!user) return NextResponse.json({ valid: false }, { status: 404 })
  const valid = await bcrypt.compare(password, user.password)
  return NextResponse.json({ valid })
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
