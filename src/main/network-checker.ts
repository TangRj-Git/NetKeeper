import { AUST_PORTAL_HINTS, AUST_PORTAL_URL } from './aust-drcom-config'
import { directFetch } from './direct-fetch'
import { formatTimestamp } from './logger'
import type { NetworkCheckResult } from './network-types'

const CHECK_ENDPOINTS = [
  'https://www.baidu.com',
  'https://www.aliyun.com'
]

const PRIVATE_IPV4_PATTERN = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/

export async function checkInternetConnectivity(timeoutMs = 5000): Promise<NetworkCheckResult> {
  const reasons: string[] = []

  for (const endpoint of CHECK_ENDPOINTS) {
    const result = await probeEndpoint(endpoint, timeoutMs)

    if (result.online) {
      return result
    }

    reasons.push(`${new URL(endpoint).hostname} ${result.reason}`)
  }

  return {
    online: false,
    reason: reasons.join('；'),
    checkedAt: formatTimestamp(),
    redirected: false,
    source: 'external-probe'
  }
}

async function probeEndpoint(
  endpoint: string,
  timeoutMs: number
): Promise<NetworkCheckResult> {
  const checkedAt = formatTimestamp()

  try {
    const response = await directFetch(endpoint, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'NetKeeper/0.1.0'
      }
    })

    const redirectLocation = response.headers.get('location')

    if (response.status >= 300 && response.status < 400) {
      const redirectedUrl = redirectLocation ?? endpoint

      return {
        online: false,
        reason: isGatewayUrl(redirectedUrl)
          ? '请求被重定向到校园网登录页'
          : `请求被重定向到 ${redirectedUrl}`,
        checkedAt,
        redirected: true,
        source: 'external-probe',
        finalUrl: redirectedUrl,
        statusCode: response.status,
        endpoint
      }
    }

    if (!response.ok) {
      return {
        online: false,
        reason: `请求返回 ${response.status}`,
        checkedAt,
        redirected: false,
        source: 'external-probe',
        finalUrl: response.url || endpoint,
        statusCode: response.status,
        endpoint
      }
    }

    const text = await response.text()
    const finalUrl = response.url || endpoint

    if (looksLikeCampusPortal(text, finalUrl)) {
      return {
        online: false,
        reason: '响应内容命中校园网认证页特征',
        checkedAt,
        redirected: true,
        source: 'external-probe',
        finalUrl,
        statusCode: response.status,
        endpoint
      }
    }

    return {
      online: true,
      reason: '外网探测正常',
      checkedAt,
      redirected: false,
      source: 'external-probe',
      finalUrl,
      statusCode: response.status,
      endpoint
    }
  } catch (error) {
    return {
      online: false,
      reason: error instanceof Error ? error.message : '请求失败',
      checkedAt,
      redirected: false,
      source: 'external-probe',
      endpoint
    }
  }
}

function looksLikeCampusPortal(text: string, finalUrl: string): boolean {
  if (isGatewayUrl(finalUrl)) {
    return true
  }

  const preview = text.slice(0, 3000)
  return isPrivateNetworkUrl(finalUrl) || AUST_PORTAL_HINTS.some((hint) => preview.includes(hint))
}

function isGatewayUrl(url: string): boolean {
  const gatewayHost = readHost(AUST_PORTAL_URL)
  const currentHost = readHost(url)

  return Boolean(gatewayHost && currentHost && gatewayHost === currentHost)
}

function isPrivateNetworkUrl(url: string): boolean {
  const host = readHost(url)
  return Boolean(host && PRIVATE_IPV4_PATTERN.test(host))
}

function readHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}
