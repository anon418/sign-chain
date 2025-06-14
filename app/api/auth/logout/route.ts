import { NextRequest, NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ message: '로그아웃 완료' })
  response.headers.set(
    'Set-Cookie',
    'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict;'
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
