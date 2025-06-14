import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import Log from '../../../../models/Log'

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  await connectDBForApp()
  const { contractId } = params
  if (!contractId || typeof contractId !== 'string') {
    return NextResponse.json(
      { message: 'contractId가 필요합니다.' },
      { status: 400 }
    )
  }
  try {
    const logs = await Log.find({ contractId }).sort({ _id: 1 })
    return NextResponse.json({ logs })
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
