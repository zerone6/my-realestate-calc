import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  const handleCalculatorClick = () => {
    navigate('/calculator')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* 메인 타이틀 */}
      <div className="text-center mb-10 sm:mb-14 lg:mb-16 px-2">
        <h1 className="text-3xl xs:text-4xl md:text-6xl font-bold text-gray-800 mb-3 md:mb-4 leading-tight tracking-tight">
          부동산 정보 관리
        </h1>
        <p className="text-base md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          부동산 투자를 위한 종합 관리 플랫폼
        </p>
      </div>

      {/* 버튼 섹션 */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          
          {/* 비용 계산기 버튼 */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleCalculatorClick}
              className="group w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-8 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 min-h-[180px] flex flex-col items-center justify-center touch-manipulation"
            >
              <div className="text-4xl mb-4">🧮</div>
              <div className="text-lg md:text-2xl font-bold mb-1 tracking-tight">비용 계산기</div>
              <div className="text-sm md:text-base opacity-90 text-center leading-snug">
                부동산 투자 수익성을<br />정확하게 계산하세요
              </div>
            </button>
          </div>

          {/* 두 번째 버튼 (준비 중) */}
          <div className="flex flex-col items-center">
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 font-semibold py-8 px-5 rounded-xl shadow-inner min-h-[180px] flex flex-col items-center justify-center cursor-not-allowed"
            >
              <div className="text-4xl mb-4">📊</div>
              <div className="text-lg md:text-2xl font-bold mb-1 tracking-tight">수익 분석</div>
              <div className="text-sm md:text-base opacity-70 text-center leading-snug">
                준비 중입니다
              </div>
            </button>
          </div>

          {/* 세 번째 버튼 (준비 중) */}
          <div className="flex flex-col items-center">
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 font-semibold py-8 px-5 rounded-xl shadow-inner min-h-[180px] flex flex-col items-center justify-center cursor-not-allowed"
            >
              <div className="text-4xl mb-4">📈</div>
              <div className="text-lg md:text-2xl font-bold mb-1 tracking-tight">포트폴리오</div>
              <div className="text-sm md:text-base opacity-70 text-center leading-snug">
                준비 중입니다
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* 하단 정보 */}
      <div className="mt-16 text-center text-gray-500 text-sm">
        <p>부동산 투자의 모든 정보를 한 곳에서 관리하세요</p>
      </div>
    </div>
  )
}
