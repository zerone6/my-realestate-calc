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
    fixedAssetTax: number                       // 固定資産税（万円）
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
