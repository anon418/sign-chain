// 쿠키 옵션 및 문자열 생성 헬퍼 (Vercel/로컬 모두 안전)

/**
 * 환경에 따라 secure, sameSite 등 옵션을 자동으로 맞춰주는 쿠키 옵션 생성기
 */
export function getCookieOptions({ maxAge }: { maxAge?: number } = {}) {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    path: '/',
    maxAge,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  } as const
}

/**
 * Set-Cookie 헤더 문자열을 안전하게 만들어주는 함수
 */
export function makeSetCookieString(
  name: string,
  value: string,
  {
    maxAge = 3600,
    clear = false,
    path = '/',
    httpOnly = true,
    isProduction = process.env.NODE_ENV === 'production',
    sameSite,
  }: {
    maxAge?: number
    clear?: boolean
    path?: string
    httpOnly?: boolean
    isProduction?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  } = {}
) {
  let cookie = `${name}=${clear ? '' : value}; Path=${path}; Max-Age=${
    clear ? 0 : maxAge
  };`
  if (httpOnly) cookie += ' HttpOnly;'
  cookie += ` Secure=${isProduction ? 'true' : 'false'};`
  cookie += ` SameSite=${sameSite || (isProduction ? 'Strict' : 'Lax')};`
  return cookie
}
