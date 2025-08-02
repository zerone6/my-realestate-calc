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
    repairCostRate: string // 수선비 비율 (%)
    repairCost: string // 수선비 (만엔)
    otherExpensesRate: string // 기타경비 비율 (%)
    otherExpenses: string // 기타경비 (만엔)

    // 네 번째 블럭: 제비용 세부항목
    initialCost1: string
    initialCost2: string
    initialCost3: string
    initialCost4: string
    initialCost5: string
}

// API response types
export interface CalculationResult {
    monthlyPayment: string
    yearlyIncome: string
    yearlyCost: string
    yearlyProfit: string
    yieldPercent: string
    grossYield: string
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
    cashFlow?: number
}

// API request types
export interface CalculationRequest {
    name: string
    price: number
    loan: number
    rate: number
    term: number
    rent: number
    occupancyRate: number
    expense: number
    startDate: string
    rentFixedPeriod: number
    rentAdjustmentInterval: number
    rentAdjustmentRate: number
}
