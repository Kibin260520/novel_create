/**
 * Unicode 安全的 base64 编解码。
 * GitHub Contents API 要求 content 为 base64，中文直接 btoa 会抛 InvalidCharacterError，
 * 所以先用 TextEncoder 转成 UTF-8 字节再编码。
 */

export function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  const chunk = 0x8000 // 分块，避免超长字符串触发调用栈溢出
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function fromBase64(b64: string): string {
  // API 返回的 base64 通常带换行，需要先清除空白
  const clean = b64.replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}
