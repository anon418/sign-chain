export interface TempUser {
  email: string
  username: string
  password: string
  otpSecret: string
  createdAt: number
}
const tempUserData: { [email: string]: TempUser } = {}
export default tempUserData
