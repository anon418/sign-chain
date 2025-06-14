export async function authFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  let response = await fetch(input, { ...init, credentials: 'include' })
  if (response.status === 401) {
    // Try to refresh token
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshRes.ok) {
      // Retry original request
      response = await fetch(input, { ...init, credentials: 'include' })
    } else {
      throw new Error('세션이 만료되었습니다. 다시 로그인 해주세요.')
    }
  }
  return response
}
