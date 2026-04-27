import type { OperatorPresetKey } from '../shared/types'

// 安徽理工大学 Drcom 认证网关首页，访问后获取 Cookie
export const AUST_PORTAL_URL = 'http://10.255.0.19/'
// 登录接口，提交学号+密码完成认证
export const AUST_LOGIN_URL = 'http://10.255.0.19/drcom/login'

// 运营商后缀映射，登录时拼接到学号后面（如 学号@aust）以选择出口
export const AUST_OPERATOR_SUFFIXES: Record<OperatorPresetKey, string> = {
  faculty: '@jzg',
  telecom: '@aust',
  unicom: '@unicom',
  mobile: '@cmcc'
}

// 登录请求中除账号密码外的固定参数，Drcom 网关要求必须携带
export const AUST_LOGIN_FIXED_PARAMS: Array<readonly [string, string]> = [
  ['0MKKey', '123456'],
  ['R1', '0'],
  ['R3', '0'],
  ['R6', '0'],
  ['para', '00'],
  ['v6ip', '']
]

// 登录成功关键字，匹配响应文本中任意一个即判定为登录成功
export const AUST_LOGIN_SUCCESS_KEYWORDS = [
  '"result":1',
  '"result": 1',
  'result: 1',
  '登录成功',
  '您已经成功登录'
]

// 登录失败关键字，匹配响应文本中任意一个即判定为登录失败
export const AUST_LOGIN_FAILURE_KEYWORDS = [
  '"result":0',
  '"result": 0',
  'result: 0',
  '密码错误',
  'ldap auth error',
  '认证失败',
  '登录失败',
  '账号不存在',
  'Rad:userid error1'
]

// 认证首页特征关键字，用于识别当前页面是否为安徽理工校园网认证网关
export const AUST_PORTAL_HINTS = [
  '学生认证网关',
  '安徽理工大学学生认证网关',
  '账号激活',
  '登录成功页',
  '您已经成功登录',
  '请选择出口',
  '学号'
]

// 生成 1000~9999 的四位随机数字符串，用于 JSONP 的 callback 和防缓存的 v 参数
export function createRandomFourDigits(): string {
  return String(Math.floor(Math.random() * 9000) + 1000)
}
