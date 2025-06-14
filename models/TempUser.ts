import mongoose from 'mongoose'

const TempUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  otpSecret: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 5분 후 자동 삭제
})

export default mongoose.models.TempUser ||
  mongoose.model('TempUser', TempUserSchema)
