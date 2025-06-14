declare module 'node-forge'

// Add global type for mongoose caching (for dbConnect.ts)
import type mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var mongoose:
    | {
        conn: typeof mongoose.connection | null
        promise: Promise<typeof mongoose.connection> | null
      }
    | undefined
}
