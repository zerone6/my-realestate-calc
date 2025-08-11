import { useEffect, useState } from 'react'
import MultiStepInputForm from './MultiStepInputForm'
import AuthButtons from './AuthButtons'
import { ResultCard } from './ResultCard'
import { CalculationResult, FormInputData } from '../../../shared/types/RealEstateForm'
import { calculateRealEstate, loadData, saveData } from '../../../shared/api/realEstateApi'
import { convertFormToRequest } from '../../../shared/utils/formUtils'

function CalculatorApp() {
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [savedItems, setSavedItems] = useState<{ name: string; form: FormInputData }[]>([])
  const [activeForm, setActiveForm] = useState<FormInputData | null>(null)
  const [calculatedForm, setCalculatedForm] = useState<FormInputData | null>(null) // 계산에 사용된 폼 데이터 추적
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false) // 결과 표시 상태
  const [activeTab, setActiveTab] = useState(0) // 현재 활성 탭
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false) // 모바일 사이드바 상태
  const [userId, setUserId] = useState<string | null>(null) // 로그인 사용자 ID

  // 탭 정보
  const tabs = [
    { id: 0, name: '수익 계산', icon: '🧮' },
    { id: 1, name: '노선가 정보', icon: '�' },
    { id: 2, name: '주변 정보', icon: '🏢' },
    { id: 3, name: '시세 동향', icon: '�' }
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
          const data = await loadData(detail.userId)
          setSavedItems(data)
        } catch (err) {
          console.error('Failed to load user data:', err)
          setSavedItems([])
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
      let updated

      if (existingIndex !== -1) {
        // 같은 이름이 있으면 해당 항목을 덮어쓰기
        updated = [...prev]
        updated[existingIndex] = { name: form.name, form }
      } else {
        // 없으면 새 항목으로 추가
        updated = [...prev, { name: form.name, form }]
      }

      return updated
    })

    // 백엔드에도 즉시 저장 (로그인 사용자에 한해)
    try {
      if (userId) {
        const next = (() => {
          const existingIndex = savedItems.findIndex(item => item.name === form.name)
          if (existingIndex !== -1) {
            const clone = [...savedItems]
            clone[existingIndex] = { name: form.name, form }
            return clone
          }
          return [...savedItems, { name: form.name, form }]
        })()
        await saveData(userId, next)
      }
    } catch (err) {
      console.warn('Auto save failed:', err)
    }
  }

  const handleTabChange = (tabId: number) => {
    // 탭 변경 시에도 자동 저장
    if (activeForm?.name?.trim()) {
      handleAutoSave(activeForm)
    }
    setActiveTab(tabId)
  }

  const handleLoad = (form: FormInputData) => {
    setActiveForm(form)
    setActiveTab(0) // 부동산을 선택하면 첫 번째 탭(수익 계산)으로 이동
    setShowResult(false) // 새로운 폼 로드 시 결과 숨김
    handleCalculate(form)
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`'${name}' 항목을 삭제하시겠습니까?`)) return

    const updated = savedItems.filter(item => item.name !== name)
    setSavedItems(updated)
    // 백엔드에도 반영
    try { if (userId) await saveData(userId, updated) } catch (err) { console.warn('Delete save failed:', err) }
  }

  // 임시 탭 컴포넌트들
  const RouteInfoTab = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
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

  const AreaInfoTab = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
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

  const MarketTrendTab = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
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
        return <RouteInfoTab />
      case 2:
        return <AreaInfoTab />
      case 3:
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
          <div className="text-base font-bold text-gray-800 leading-none">My Real Estate</div>
        </div>
        {/* 보이지 않는 구분선 역할 (테이블/그리드 대체) */}
        <div className="hidden lg:block h-2" aria-hidden="true" />
        {/* 모바일에서는 접히는 헤더 */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="w-full p-4 text-left bg-gray-50 border-b flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">📂</span>
              <span className="font-medium text-gray-700">저장된 부동산</span>
              <span className="text-sm text-gray-500">({savedItems.length})</span>
            </div>
            <span className={`text-gray-400 transition-transform duration-200 ${isMobileSidebarOpen ? 'rotate-180' : ''
              }`}>
              ▼
            </span>
          </button>

          {/* 모바일 접히는 콘텐츠 */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isMobileSidebarOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
            <div className="p-4">
              {savedItems.length === 0 ? (
                <p className="text-sm text-gray-500">저장된 부동산이 없습니다</p>
              ) : (
                <ul className="space-y-2">
                  {savedItems.map((item) => (
                    <li key={item.name} className="flex items-center justify-between bg-gray-50 rounded p-2 hover:bg-gray-100">
                      <button
                        className="flex-1 text-left cursor-pointer text-sm text-black hover:font-semibold hover:text-blue-600"
                        onClick={() => {
                          handleLoad(item.form)
                          setIsMobileSidebarOpen(false) // 선택 후 자동으로 접기
                        }}
                      >
                        {item.name}
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
                    {item.name}
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
