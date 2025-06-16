export function triggerDownload(base64String: string, filename: string) {
  try {
    // base64 문자열을 바이너리 문자열로 디코드
    const byteString = atob(base64String)
    // 바이너리 문자열을 Uint8Array(바이트 배열)로 변환
    const arrayBuffer = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      arrayBuffer[i] = byteString.charCodeAt(i)
    }
    // 바이트 배열을 Blob 객체로 생성 (파일 데이터로 만듦)
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
    // 다운로드용 링크(a 태그) 생성 및 속성 설정
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob) // Blob 데이터의 임시 URL 생성
    link.download = filename
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(link.href) // 임시 URL 해제
      document.body.removeChild(link) // 링크 DOM에서 제거
    }, 1000)
  } catch (e) {
    throw new Error(
      '파일 다운로드 중 오류 발생: ' + (e instanceof Error ? e.message : e)
    )
  }
}
