import { NextRequest, NextResponse } from 'next/server'
import { makeSetCookieString } from '../../../../utils/cookieUtils'

export async function POST() {
  const response = NextResponse.json({ message: '로그아웃 완료' })
  response.headers.set(
    'Set-Cookie',
    makeSetCookieString('token', '', { clear: true })
  )
  return response
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
