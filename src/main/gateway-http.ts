// 伪装为 Edge 浏览器的 User-Agent，避免认证网关拒绝非浏览器请求
export const GATEWAY_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0'

// Accept 请求头，接受任意类型的响应内容
export const REQUEST_ACCEPT_HEADER = '*/*'
