export async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      if (!event.target?.result) {
        reject(new Error('파일 읽기 실패'))
        return
      }
      const buffer = event.target.result as ArrayBuffer
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      resolve(hashHex)
    }
    reader.onerror = () => {
      reject(new Error('파일 읽기 오류'))
    }
    reader.readAsArrayBuffer(file)
  })
}
