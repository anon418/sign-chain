import mongoose, { Document, Model, Schema } from 'mongoose'

// 사용자 문서 인터페이스 정의
interface IUser extends Document {
  username: string
  email: string
  password: string
  publicKey?: string
  certificate?: string
  otpEnabled: boolean
  otpSecret?: string
  otpVerified: boolean
  certificateStatus?: string
  currentRefreshJti: string
}

// 사용자 스키마 정의
const userSchema: Schema<IUser> = new Schema({
  username: { type: String, required: true, unique: true }, // 암호화된 사용자 이름
  email: { type: String, required: true, unique: true }, // 암호화된 이메일
  password: { type: String, required: true }, // bcrypt 해시된 비밀번호
  publicKey: { type: String },
  certificate: { type: String },
  otpEnabled: { type: Boolean, default: false },
  otpSecret: { type: String }, // OTP 비밀키
  otpVerified: { type: Boolean, default: false }, // OTP 인증 완료 여부
  certificateStatus: { type: String, default: 'valid' },
  currentRefreshJti: { type: String }, // refresh token rotation용
  // profilePicture: { type: String, default: '/default-user.png' },
})

// 사용자 모델 정의
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema)

export default User
