const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function registerUser(data: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function loginUser(data: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}
