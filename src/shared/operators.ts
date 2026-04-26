import type { OperatorOption } from './types'

// 运营商下拉选项列表，供前端界面渲染选择框使用
export const operatorOptions: OperatorOption[] = [
  { label: '请选择认证出口', value: '' },      // 默认占位项
  { label: '学生电信出口', value: 'telecom' },
  { label: '学生联通出口', value: 'unicom' },
  { label: '学生移动出口', value: 'mobile' }
]
