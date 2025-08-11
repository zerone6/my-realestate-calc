export interface RealEstateFormData {
    // 기본条件
    ownershipType: "individual" | "corporate"   // 個人 or 法人
    selfCapital: number                         // 自己資金（万円）
    interestRate: number                        // 金利（%）
    loanPeriod: number                          // ローン期間（年）
    occupancyRate: number                       // 入居率（%）
    purchaseCost: number                        // 購入時諸費用（万円）
    loanAmount: number                          // 借入額（万円）
    buildingPrice: number                       // 建物価格（万円）
    annualDepreciation: number                  // 減価償却費（年）※자동 계산 가능

    // 収入
    annualIncome: number                        // 年間収入（万円）
    rentDeclineRate: number                     // 賃料下落率（% / 年）

    // 支出
    incomeTaxRate: number                       // 所得・住民税（%）
    corporateTaxRate: number                    // 法人税率（%）
    annualRepayment: number                     // ローン返済額（万円 / 年）

    // 年間経費
    annualExpense: number                       // 年間経費（万円）
    fixedAssetTax: number                       // 固定資산税（万円）
    cityPlanningTax: number                     // 都市計画税（万円）
    managementCostRate: number                  // 管理費割合（%）
    maintenanceCostRate: number                // 修繕費割合（%）
    otherCost: number                           // その他経費（万円 / 年）

    // 大規模修繕
    largeRepair: {
        year: number
        amount: number                            // 万円
    }[]
}

// Form input types for UI
export interface FormInputData {
    // 첫 번째 블럭: 물건 정보
    name: string
    price: string
    grossYield: string
    structure: string
    buildingAge: string
    buildingArea: string
    ownCapital: string
    buildingPrice: string
    occupancyRate: string

    // 두 번째 블럭: 대출 정보
    rate: string
    term: string
    startDate: string

    // 세 번째 블럭: 수익 및 유지비
    rent: string
    rentFixedPeriod: string // 월세 고정 기간 (년)
    rentAdjustmentInterval: string // 월세 조정 시기 (년)
    rentAdjustmentRate: string // 월세 조정 비율 (%)

    // 수익 및 유지비 추가 항목들
    propertyTax: string // 고정자산세+도시계획세 (만엔)
    managementFeeRate: string // 관리비 비율 (%)
    managementFee: string // 관리비 (만엔)
    managementCommissionRate: string // 관리수수료율 (%)
    managementCommissionFee: string // 관리수수료 (만엔)
    maintenanceFeeRate: string // 수선비 비율 (%)
    maintenanceFee: string // 수선비 (만엔)
    insurance: string // 보험료 (만엔)
    otherExpenses: string // 기타경비 (만엔)

    // 네 번째 블럭: 제비용 세부항목
    brokerageFee: string // 중개수수료
    registrationFee: string // 등기비용
    acquisitionTax: string // 취득세
    stampDuty: string // 인지세
    loanFee: string // 대출수수료
    surveyFee: string // 감정비용
    miscellaneousFees: string // 잡비
}

// API response types
export interface CalculationResult {
    monthlyPayment: string
    yearlyIncome: string
    yearlyCost: string
    yearlyProfit: string
    yieldPercent: string
    grossYield: string
    equityYield: string        // 자기자본 대비 수익률
    repaymentSchedule: RepaymentSchedule[]
}

export interface RepaymentSchedule {
    month: number
    date: string
    payment: number
    principal: number
    interest: number
    remaining: number
    rent: number
    reserve?: number
    cashFlow?: number
}

export interface TaxCalculation {
    year: number
    annualDepreciation: number  // 연간 감가상각비
    remainingValue: number      // 부동산 잔존가치
    
    // 수입
    annualRent: number          // 연간 임대료
    
    // 비용
    loanInterest: number        // 대출 이자
    propertyTax: number         // 고정자산세
    managementFee: number       // 관리비
    insurance: number           // 보험료
    otherExpenses: number       // 기타 경비
    acquisitionCosts?: number   // 제비용 (첫해만)
    
    // 세금 계산
    taxableIncome: number       // 과세소득
    corporateTax: number        // 법인세
    localTax: number           // 지방세 (법인주민세 + 법인사업세)
    totalTax: number           // 총 세금
    netCashFlow: number        // 최종 캐시플로우
}

// API request types
export interface CalculationRequest {
    name: string
    price: number
    totalPurchaseCost: number
    ownCapital: number         // 자기자본
    loan: number
    rate: number
    term: number
    rent: number
    grossYield?: number         // 사용자가 입력한 표면 이익률
    occupancyRate: number
    expense: number
    nonReserveExpense?: number   // 장기수선적립 제외한 연간 비용 (円)
    reserveExpense?: number      // 장기수선적립 연간 금액 (円)
    startDate: string
    rentFixedPeriod: number
    rentAdjustmentInterval: number
    rentAdjustmentRate: number
}
