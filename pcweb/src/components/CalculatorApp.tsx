import { useEffect, useState } from 'react'
import MultiStepInputForm from './MultiStepInputForm'
import AuthButtons from './AuthButtons'
import { ResultCard } from './ResultCard'
import { CalculationResult, FormInputData } from '../../../shared/types/RealEstateForm'
import TradeSearchPage from './TradeSearchPage'
import { calculateRealEstate, loadData, saveData } from '../../../shared/api/realEstateApi'
import { useToast } from './toast/ToastContext'
import { t } from '../../../shared/i18n'
import { convertFormToRequest } from '../../../shared/utils/formUtils'
import { normalizeForm } from '../../../shared/utils/formNormalize'
import { getStoredUserId } from '../../../shared/utils/authState'

// Auxiliary placeholder tabs moved to module scope to satisfy lint rules
function RouteInfoTab() {
  return (
    <div className="max-w-full lg:max-w-[1440px] mx-auto bg-white rounded-xl shadow-md p-6">
      <div className="text-center py-20">
        <div className="text-6xl mb-4">�</div>
        <h2 className="text-2xl font-bold mb-4">노선가 정보</h2>
        <p className="text-gray-600 mb-4">노선가, 역세권 정보, 교통 접근성 분석</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">🚧 개발 중인 기능입니다</p>
        </div>
      </div>
    </div>
  )
}

function AreaInfoTab() {
  return (
    <div className="max-w-full lg:max-w-[1440px] mx-auto bg-white rounded-xl shadow-md p-6">
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🏢</div>
        <h2 className="text-2xl font-bold mb-4">주변 정보</h2>
        <p className="text-gray-600 mb-4">편의시설, 학교, 병원, 상권 정보</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">🚧 개발 중인 기능입니다</p>
        </div>
      </div>
    </div>
  )
}

function MarketTrendTab() {
  return (
    <div className="max-w-full lg:max-w-[1440px] mx-auto bg-white rounded-xl shadow-md p-6">
      <div className="text-center py-20">
        <div className="text-6xl mb-4">�</div>
        <h2 className="text-2xl font-bold mb-4">시세 동향</h2>
        <p className="text-gray-600 mb-4">해당 지역 부동산 시세 변화 및 전망</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">🚧 개발 중인 기능입니다</p>
        </div>
      </div>
    </div>
  )
}

function CalculatorApp() {
  const { push } = useToast()
  const [result, setResult] = useState<CalculationResult | null>(null)
  type SavedItem = { name: string; form: FormInputData; updatedAt?: string }
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [pendingSave, setPendingSave] = useState<{ items: { name: string; form: FormInputData }[] } | null>(null)
  const [loginPromptVisible, setLoginPromptVisible] = useState(false)
  const [activeForm, setActiveForm] = useState<FormInputData | null>(null)
  const [calculatedForm, setCalculatedForm] = useState<FormInputData | null>(null) // 계산에 사용된 폼 데이터 추적
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false) // 결과 표시 상태
  const [activeTab, setActiveTab] = useState(0) // 현재 활성 탭
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false) // 모바일 사이드바 상태
  const [userId, setUserId] = useState<string | null>(null) // 로그인 사용자 ID
  const [tradePrefill, setTradePrefill] = useState<{pref?:string; cityId?:string; district1?:string; name?:string; landArea?:string|number; buildingArea?:string|number; price?:string|number}|null>(null)

  // 탭 정보
  const tabs = [
    { id: 0, name: '수익 계산', icon: '🧮' },
    { id: 1, name: '거래가 검색', icon: '📊' },
    { id: 2, name: '노선가 정보', icon: '�' },
    { id: 3, name: '주변 정보', icon: '🏢' },
    { id: 4, name: '시세 동향', icon: '�' }
  ]

  // 로그인/로그아웃 이벤트 처리: 로그인 시 유저 데이터 로드, 로그아웃 시 저장 후 화면 초기화
  useEffect(() => {
    const handleAuthChange = async (e: Event) => {
      const custom = e as CustomEvent<{ loggedIn: boolean; userId: string | null }>
      const detail = custom.detail
      if (!detail) return

      if (detail.loggedIn && detail.userId) {
        setUserId(detail.userId)
        try {
          console.debug('[authChange] loading data for user', detail.userId)
          const data = await loadData(detail.userId) as any
          console.debug('[authChange] loadData returned', Array.isArray(data) ? data.length + ' items' : data)
          if (!Array.isArray(data)) {
            console.warn('[authChange] unexpected payload type from loadData', data)
          }
          setSavedItems(Array.isArray(data) ? data : [])
        } catch (err: any) {
          console.error('Failed to load user data:', err)
          setSavedItems([])
          const msg = err?.message || 'load error'
          push('error', t('toast.load.fail') + ' (' + msg + ')')
        }
        // 화면 초기화
        setActiveForm(null)
        setResult(null)
        setShowResult(false)
        // 폼 로컬 저장소도 초기화
        try {
          localStorage.removeItem('realEstateForm')
          localStorage.removeItem('realEstateFormStep')
        } catch { }
      } else {
        // 로그아웃: 현재 목록 저장 후 전체 초기화
        if (userId) {
          try { await saveData(userId, savedItems) } catch (err) { console.warn('Save on logout failed:', err) }
        }
        setUserId(null)
        setSavedItems([])
        setActiveForm(null)
        setResult(null)
        setShowResult(false)
        // 폼 로컬 저장소 초기화
        try {
          localStorage.removeItem('realEstateForm')
          localStorage.removeItem('realEstateFormStep')
        } catch { }
      }
    }

    window.addEventListener('authChange' as any, handleAuthChange as EventListener)
    return () => window.removeEventListener('authChange' as any, handleAuthChange as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, savedItems])

  // 최초 마운트 시 (authChange 이벤트 오기 전이라도) localStorage에 사용자 있으면 즉시 로드
  useEffect(() => {
    if (userId) return // 이미 세션 처리됨
    const stored = getStoredUserId()
    if (!stored) return
    const preload = async () => {
      try {
        console.debug('[mount] detected stored userId -> preloading data', stored)
        const data = await loadData(stored) as any
        setUserId(stored)
        setSavedItems(Array.isArray(data) ? data : [])
      } catch (e) {
        console.warn('[mount] preload failed', e)
      }
    }
    preload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Receive prefill from MultiStepInputForm when district1 selected
  useEffect(() => {
    const h = (e: any) => {
      const d = e?.detail || {}
  setTradePrefill({ pref: d.pref, cityId: d.cityId, district1: d.district1, name: d.name, landArea: d.landArea, buildingArea: d.buildingArea, price: d.price })
    }
    window.addEventListener('tradeSearchPrefill' as any, h as EventListener)
    return () => window.removeEventListener('tradeSearchPrefill' as any, h as EventListener)
  }, [])

  // Fallback: derive tradePrefill from current active or calculated form when user switches tab
  useEffect(() => {
    if (activeTab !== 1) return
    // Already have explicit tradePrefill from event
    if (tradePrefill && (tradePrefill.pref || tradePrefill.cityId || tradePrefill.district1)) return
    const source = activeForm || calculatedForm
    if (!source) return
    const maybePref = (source as any).pref
    const maybeCity = (source as any).cityId
    const maybeDistrict = (source as any).district1
    const maybeName = (source as any).name
    const maybeLand = (source as any).landArea
    const maybeBuilding = (source as any).buildingArea
    const maybePrice = (source as any).price
    if (maybePref || maybeCity || maybeDistrict || maybeName || maybeLand || maybeBuilding || maybePrice) {
      setTradePrefill({ pref: maybePref, cityId: maybeCity, district1: maybeDistrict, name: maybeName, landArea: maybeLand, buildingArea: maybeBuilding, price: maybePrice })
    }
  }, [activeTab, tradePrefill, activeForm, calculatedForm])

  // Manual explicit save button event (guarded by auth)
  useEffect(() => {
    const buildNextItems = (form: FormInputData, prev: SavedItem[]): SavedItem[] => {
      const nowIso = new Date().toISOString()
      const idx = prev.findIndex(p => p.name === form.name)
      if (idx >= 0) return prev.map(p => p.name === form.name ? { name: form.name, form, updatedAt: nowIso } : p)
      return [...prev, { name: form.name, form, updatedAt: nowIso }]
    }

    const persist = (next: SavedItem[]) => {
      if (!userId) {
        setPendingSave({ items: next })
        window.dispatchEvent(new CustomEvent('auth:login-required-ui'))
        setLoginPromptVisible(true)
  push('info', t('toast.login.required'))
    window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'login.required.blocked-save' } }))
        return
      }
      saveData(userId, next)
        .then(async () => {
          push('success', t('toast.save.success'))
          window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'save.explicit', count: next.length } }))
          try { const fresh = await loadData(userId); setSavedItems(fresh as any) } catch {}
        })
        .catch(err => { console.warn('Explicit save failed', err); push('error', t('toast.save.fail')); window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'save.explicit.fail' } })) })
    }

    const onExplicit = (e: any) => {
      const form = e?.detail?.form as FormInputData | undefined
      if (!form?.name) return
      setSavedItems(prev => {
        const next = buildNextItems(form, prev)
        persist(next)
        return next
      })
      setActiveForm(form)
    }
    window.addEventListener('explicitFormSave' as any, onExplicit as EventListener)
    return () => window.removeEventListener('explicitFormSave' as any, onExplicit as EventListener)
  }, [userId])

  // Backend 401 global event → 표시 & pending retry
  useEffect(() => {
    const onLoginRequired = () => {
      if (!loginPromptVisible) setLoginPromptVisible(true)
  push('info', t('toast.login.continue'))
      window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'login.required.event' } }))
    }
    window.addEventListener('auth:login-required', onLoginRequired as any)
    return () => window.removeEventListener('auth:login-required', onLoginRequired as any)
  }, [loginPromptVisible])

  // 로그인 성공 시 pending save 재시도
  useEffect(() => {
    if (!userId || !pendingSave) return
    const retry = async () => {
      try {
    await saveData(userId, pendingSave.items)
    push('success', t('toast.login.retry.success'))
    window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'save.retry.success', count: pendingSave.items.length } }))
    try { const fresh = await loadData(userId); setSavedItems(fresh as any) } catch {}
      } catch (err) {
        console.warn('Retry save after login failed', err)
    push('error', t('toast.login.retry.fail'))
    window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'save.retry.fail' } }))
      } finally {
        setPendingSave(null)
        setLoginPromptVisible(false)
      }
    }
    retry()
  }, [userId, pendingSave])

  const handleCalculate = async (form: FormInputData) => {
    setLoading(true)
    setError(null)

    try {
      const request = convertFormToRequest(form)
      const calculationResult = await calculateRealEstate(request)
      setResult(calculationResult)
      setCalculatedForm(form) // 계산에 사용된 폼 데이터 저장
      setShowResult(true) // 계산 완료 후 결과 표시
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
      console.error('Calculation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateComplete = () => {
    // 스크롤을 부드럽게 아래로 이동하여 결과를 보여줌
    setTimeout(() => {
      const resultElement = document.getElementById('calculation-result')
      if (resultElement) {
        resultElement.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleAutoSave = async (form: FormInputData) => {
    if (!form.name || form.name.trim() === '') {
      return // 물건 이름이 없으면 저장하지 않음
    }

    setSavedItems((prev) => {
      const existingIndex = prev.findIndex(item => item.name === form.name)
      const nowIso = new Date().toISOString()
      if (existingIndex !== -1) {
        const clone = [...prev]
        clone[existingIndex] = { name: form.name, form, updatedAt: nowIso }
        return clone
      }
      return [...prev, { name: form.name, form, updatedAt: nowIso }]
    })

    // 백엔드에도 즉시 저장 (로그인 사용자에 한해)
    // 로그인 안된 상태에서는 auto-save 서버 호출 생략 (모달 스팸 방지)
    if (!userId) return
    try {
      const next = (() => {
        const existingIndex = savedItems.findIndex(item => item.name === form.name)
        const nowIso = new Date().toISOString()
        if (existingIndex !== -1) {
          const clone = [...savedItems]
          clone[existingIndex] = { name: form.name, form, updatedAt: nowIso }
          return clone
        }
        return [...savedItems, { name: form.name, form, updatedAt: nowIso }]
      })()
    await saveData(userId, next)
    window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'save.autosave', name: form.name } }))
    try { const fresh = await loadData(userId); setSavedItems(fresh as any) } catch {}
    } catch (err) {
      console.warn('Auto save failed:', err)
    push('warning', t('toast.autosave.fail'))
    window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'save.autosave.fail', name: form.name } }))
    }
  }

  const handleTabChange = (tabId: number) => {
    // 탭 변경 시에도 자동 저장
    if (activeForm?.name?.trim()) {
      handleAutoSave(activeForm)
    }
    // When moving to Trade Search, pass current form location as prefill
    if (tabId === 1) {
      const f = activeForm
      if (f) {
  setTradePrefill({ pref: f.pref, cityId: f.cityId, district1: f.district1, name: f.name, landArea: (f as any).landArea, buildingArea: f.buildingArea, price: f.price })
      }
    }
    setActiveTab(tabId)
  }

  const handleLoad = (form: FormInputData) => {
    try {
      console.debug('[handleLoad] clicked item form raw:', form)
      if (typeof form !== 'object' || !form) throw new Error('불러온 데이터가 객체가 아닙니다')
      const normalized = normalizeForm(form)
      console.debug('[handleLoad] normalized form:', normalized)
      setActiveForm(normalized)
      setActiveTab(0)
      setShowResult(false)
      handleCalculate(normalized)
    } catch (e) {
      console.error('[handleLoad] error', e)
      push('error', '저장된 항목 로드 중 오류: ' + (e as any)?.message)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`'${name}' 항목을 삭제하시겠습니까?`)) return

  const updated = savedItems.filter(item => item.name !== name)
    setSavedItems(updated)
    // 백엔드에도 반영
    try { if (userId) { await saveData(userId, updated); push('success', t('toast.delete.success')); window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'delete.item', name } })); try { const fresh = await loadData(userId); setSavedItems(fresh as any) } catch {} } }
    catch (err) { console.warn('Delete save failed:', err); push('error', t('toast.delete.fail')); window.dispatchEvent(new CustomEvent('analytics', { detail: { action: 'delete.item.fail', name } })) }
  }

  // 임시 탭 컴포넌트들
  

  // 현재 탭의 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            <MultiStepInputForm
              onCalculate={handleCalculate}
              onAutoSave={handleAutoSave}
              defaultForm={activeForm}
              onCalculateComplete={handleCalculateComplete}
            />

            {loading && (
              <div className="max-w-full lg:max-w-[1440px] mx-auto mt-6 bg-white rounded-xl shadow-md p-4 lg:p-6">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-sm lg:text-base text-gray-600">계산 중...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="max-w-full lg:max-w-[1440px] mx-auto mt-6 bg-red-50 border border-red-200 rounded-xl shadow-md p-4 lg:p-6">
                <p className="text-red-600 text-sm lg:text-base">오류: {error}</p>
              </div>
            )}

            {showResult && result && calculatedForm && (
              <div id="calculation-result" className="mt-6">
                <ResultCard
                  monthlyPayment={result.monthlyPayment}
                  yearlyIncome={result.yearlyIncome}
                  yearlyCost={result.yearlyCost}
                  yearlyProfit={result.yearlyProfit}
                  yieldPercent={result.yieldPercent}
                  grossYield={result.grossYield}
                  equityYield={(result as any).equityYield || '0.0'}
                  schedule={(result as any).schedule || result.repaymentSchedule || []}
                  taxCalculation={(result as any).taxCalculation || {}}
                  formData={calculatedForm}
                  onClose={() => setResult(null)}
                />
              </div>
            )}
          </>
        )
      case 1:
        return <TradeSearchPage prefill={tradePrefill || undefined} />
      case 2:
        return <RouteInfoTab />
      case 3:
        return <AreaInfoTab />
      case 4:
        return <MarketTrendTab />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* 좌측 사이드바 - 부동산 물건 전체 정보 저장 영역 */}
  <aside className="w-full lg:w-64 bg-white shadow-md lg:h-screen overflow-y-auto">
        {/* 고정 제목 */}
        <div className="hidden lg:block px-4 pt-3 pb-2">
          <a href="/" className="group flex items-center gap-2 rounded-md px-2 py-1.5 bg-gradient-to-r from-blue-50 to-white border border-blue-100 hover:from-blue-100 hover:to-white hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400" title="홈으로 이동" aria-label="홈으로 이동">
            <span className="text-blue-600 text-lg group-hover:scale-110 transition-transform" aria-hidden="true">🏠</span>
            <span className="text-sm font-extrabold tracking-wide text-gray-800 group-hover:text-blue-700">My Real Estate</span>
          </a>
        </div>
        {/* 보이지 않는 구분선 역할 (테이블/그리드 대체) */}
        <div className="hidden lg:block h-2" aria-hidden="true" />
        {/* 모바일에서는 접히는 헤더 */}
        <div className="lg:hidden sticky top-0 z-20">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="w-full px-4 py-3 text-left bg-white/90 backdrop-blur border-b flex items-center justify-between active:bg-gray-100 transition-colors"
            aria-expanded={isMobileSidebarOpen}
            aria-controls="mobile-saved-list"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📂</span>
              <span className="font-medium text-gray-800 text-sm">저장된 부동산</span>
              <span className="text-xs text-gray-500">{savedItems.length}</span>
            </div>
            <span className={`text-gray-400 transition-transform duration-200 ${isMobileSidebarOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* 모바일 접히는 콘텐츠 */}
          <div id="mobile-saved-list" className={`transition-all duration-300 ease-in-out overflow-hidden ${isMobileSidebarOpen ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 pt-2">
              {savedItems.length === 0 ? (
                <p className="text-xs text-gray-500">저장된 부동산이 없습니다</p>
              ) : (
                <ul className="space-y-1">
                  {savedItems.map((item) => (
                    <li key={item.name} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 hover:bg-gray-100 active:bg-gray-200">
                      <button
                        className="flex-1 text-left cursor-pointer text-[13px] text-gray-800 font-medium hover:text-blue-600"
                        onClick={() => {
                          handleLoad(item.form)
                          setIsMobileSidebarOpen(false) // 선택 후 자동으로 접기
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-gray-500 ml-2">{item.form?.walkMinutesToStation ? `${item.form.walkMinutesToStation}분` : ''}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(item.name)}
                        className="ml-2 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md active:bg-red-100"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* 데스크톱 리스트 */}
        <div className="hidden lg:block px-4 pb-4">
          <h2 className="text-sm font-semibold mb-2 text-gray-700">📂 저장된 부동산</h2>
          {savedItems.length === 0 ? (
            <p className="text-sm text-gray-500">저장된 부동산이 없습니다</p>
          ) : (
            <ul className="space-y-2 max-h-40 lg:max-h-none overflow-y-auto lg:overflow-visible">
              {savedItems.map((item) => (
                <li key={item.name} className="flex items-center justify-between bg-gray-50 rounded p-2 hover:bg-gray-100">
                  <button
                    className="flex-1 text-left cursor-pointer text-sm text-black hover:font-semibold hover:text-blue-600"
                    onClick={() => handleLoad(item.form)}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{item.form?.walkMinutesToStation ? `${item.form.walkMinutesToStation}분` : ''}</span>
                      </div>
                      {item.updatedAt && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {(() => {
                            const diffMin = Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / 60000)
                            const icon = diffMin >= 10 ? '⏲️' : ''
                            return `${icon} ${diffMin}분 전 저장`
                          })()}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(item.name)}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 우측 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 탭바 + 우측 인증 버튼 */}
        <div className="bg-white shadow-md border-b">
          <div className="px-4">
            <div className="h-12 flex items-center justify-between">
              <div className="flex space-x-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
              <div className="hidden lg:block">
                {/* 동일 행의 우측 인증 버튼 */}
                <AuthButtons />
              </div>
            </div>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}

export default CalculatorApp
