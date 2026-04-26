// 网络检测结果来源，'external-probe' 表示通过外网探测判断
export type NetworkCheckSource = 'external-probe'

// 网络检测结果
export interface NetworkCheckResult {
  online: boolean                // 是否在线
  reason: string                 // 判断依据的说明文字
  checkedAt: string              // 检测时间戳
  redirected: boolean            // 请求是否被重定向（如跳转到认证页面）
  source: NetworkCheckSource     // 检测结果的来源
  finalUrl?: string              // 请求最终到达的 URL（重定向后的地址）
  statusCode?: number            // HTTP 响应状态码
  endpoint?: string              // 实际请求的检测地址
}
