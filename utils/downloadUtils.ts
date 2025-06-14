export function triggerDownload(base64String: string, filename: string) {
  try {
    const byteString = atob(base64String)
    const arrayBuffer = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      arrayBuffer[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(link.href)
      document.body.removeChild(link)
    }, 1000)
  } catch (e) {
    throw new Error(
      '파일 다운로드 중 오류 발생: ' + (e instanceof Error ? e.message : e)
    )
  }
}
