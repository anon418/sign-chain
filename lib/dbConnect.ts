// lib/dbConnect.ts
import mongoose from 'mongoose'
import { NextApiRequest, NextApiResponse } from 'next'

type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void

const dbUri = process.env.MONGODB_URI

if (!dbUri) {
  throw new Error('MongoDB URI가 .env에 설정되어 있지 않습니다.')
}

// 글로벌 캐싱 객체 (타입스크립트용)
interface CachedMongoose {
  conn: typeof mongoose.connection | null
  promise: Promise<typeof mongoose.connection> | null
}

let cached: CachedMongoose
if (global.mongoose) {
  cached = global.mongoose
} else {
  cached = { conn: null, promise: null }
  global.mongoose = cached
}

const connectDB =
  (handler: NextApiHandler) =>
  async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    try {
      if (cached.conn && cached.conn.readyState >= 1) {
        return handler(req, res)
      }

      if (!cached.promise) {
        cached.promise = mongoose
          .connect(dbUri as string)
          .then((mongooseInstance) => {
            return mongooseInstance.connection
          })
      }
      cached.conn = await cached.promise
      return handler(req, res)
    } catch (error) {
      console.error('[DB] MongoDB 연결 실패:', error)
      return res.status(500).json({ message: '서버 오류' })
    }
  }

export default connectDB

export async function connectDBForApp() {
  if (cached.conn && cached.conn.readyState >= 1) {
    return
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(dbUri as string)
      .then((mongooseInstance) => {
        return mongooseInstance.connection
      })
  }
  cached.conn = await cached.promise
  // Optionally log connection
}
