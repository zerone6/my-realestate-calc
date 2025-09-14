export const messages_ko = {
  'toast.save.success': '저장 완료',
  'toast.save.fail': '저장 실패',
  'toast.login.required': '로그인이 필요합니다',
  'toast.login.continue': '로그인 후 저장을 계속할 수 있습니다',
  'toast.login.retry.success': '로그인 후 저장 완료',
  'toast.login.retry.fail': '로그인 후 저장 실패',
  'toast.load.fail': '데이터 불러오기 실패',
  'toast.delete.success': '삭제 완료',
  'toast.delete.fail': '삭제 실패',
  'toast.autosave.fail': '자동 저장 실패'
} as const

export type KoMessageKey = keyof typeof messages_ko
