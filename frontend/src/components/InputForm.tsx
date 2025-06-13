
import { useState, useEffect } from 'react'

interface FormProps {
  onCalculate: (form: any) => void
  onSave: (form: any) => void
  onDelete: (name: string) => void
  defaultForm?: any
}

export default function InputForm({ onCalculate, onSave, onDelete, defaultForm }: FormProps) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    loan: '',
    rate: '',
    term: '',
    rent: '',
    expense: '',
    startDate: ''
  })

  useEffect(() => {
    if (defaultForm) setForm(defaultForm)
  }, [defaultForm])

  const update = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md space-y-4">
      <h1 className="text-xl font-bold">부동산 수익 계산기</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* 물건 이름 */}
        <div className="relative">
          <input
            name="name"
            value={form.name}
            onChange={update}
            placeholder="물건 이름"
            className="border p-2 w-full"
          />
        </div>

        {/* 매입가 */}
        <div className="relative">
          <input
            name="price"
            value={form.price}
            onChange={update}
            placeholder="매입가"
            className="border p-2 pr-12 w-full"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">万円</span>
        </div>

        {/* 대출 금액 */}
        <div className="relative">
          <input
            name="loan"
            value={form.loan}
            onChange={update}
            placeholder="대출 금액"
            className="border p-2 pr-12 w-full"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">万円</span>
        </div>

        {/* 금리 */}
        <div className="relative">
          <input
            name="rate"
            value={form.rate}
            onChange={update}
            placeholder="금리"
            className="border p-2 pr-12 w-full"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
        </div>

        {/* 대출 기간 */}
        <div className="relative">
          <input
            name="term"
            value={form.term}
            onChange={update}
            placeholder="대출 기간"
            className="border p-2 pr-12 w-full"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">년</span>
        </div>

        {/* 월세 수익 */}
        <div className="relative">
          <input
            name="rent"
            value={form.rent}
            onChange={update}
            placeholder="월세 수익"
            className="border p-2 pr-12 w-full"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">円</span>
        </div>

        {/* 연간 유지비 */}
        <div className="relative">
          <input
            name="expense"
            value={form.expense}
            onChange={update}
            placeholder="연간 유지비"
            className="border p-2 pr-12 w-full"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">円</span>
        </div>

        {/* 시작일 */}
        <div className="relative">
          <input
            type="date"
            name="startDate"
            value={form.startDate || ""}
            onChange={update}
            className="border p-2 w-full"
          />
        </div>
      </div>


      <div className="space-x-2">
        <button onClick={() => onCalculate(form)} className="bg-blue-500 text-white px-4 py-2 rounded">계산하기</button>
        <button onClick={() => onSave(form)} className="bg-green-500 text-white px-4 py-2 rounded">저장</button>
        <button
          type="button"
          onClick={() => onDelete(form.name)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          삭제
        </button>
        <div className="space-y-6 mt-10">
          {/* 基本条件 */}
          <fieldset className="border border-gray-300 p-4 rounded">
            <legend className="text-lg font-semibold text-gray-700">基本条件</legend>
            <div className="flex items-center space-x-4 mt-2">
              <label><input type="radio" name="ownershipType" value="individual" /> 個人</label>
              <label><input type="radio" name="ownershipType" value="corporate" /> 法人</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <input name="selfCapital" placeholder="自己資金（万円）" className="border p-2" />
              <input name="interestRate" placeholder="金利（%）" className="border p-2" />
              <input name="loanPeriod" placeholder="ローン期間（年）" className="border p-2" />
              <input name="occupancyRate" placeholder="入居率（%）" className="border p-2" />
              <input name="purchaseCost" placeholder="購入時諸費用（万円）" className="border p-2" />
              <input name="loanAmount" placeholder="借入額（万円）" className="border p-2" />
              <input name="buildingPrice" placeholder="建物価格（万円）" className="border p-2" />
              <input name="annualDepreciation" placeholder="減価償却費（万円/年）" className="border p-2" />
            </div>
          </fieldset>

          {/* 収入 */}
          <fieldset className="border border-gray-300 p-4 rounded">
            <legend className="text-lg font-semibold text-gray-700">収入</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <input name="annualIncome" placeholder="年間収入（万円）" className="border p-2" />
              <input name="rentDeclineRate" placeholder="賃料下落率（% / 年）" className="border p-2" />
            </div>
          </fieldset>

          {/* 支出 */}
          <fieldset className="border border-gray-300 p-4 rounded">
            <legend className="text-lg font-semibold text-gray-700">支出</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <input name="incomeTaxRate" placeholder="所得税・住民税（%）" className="border p-2" />
              <input name="corporateTaxRate" placeholder="法人税率（%）" className="border p-2" />
              <input name="annualRepayment" placeholder="ローン返済額（万円/年）" className="border p-2" />
            </div>
          </fieldset>

          {/* 年間経費 */}
          <fieldset className="border border-gray-300 p-4 rounded">
            <legend className="text-lg font-semibold text-gray-700">年間経費</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <input name="annualExpense" placeholder="年間経費（万円）" className="border p-2" />
              <input name="fixedAssetTax" placeholder="固定資産税（万円）" className="border p-2" />
              <input name="cityPlanningTax" placeholder="都市計画税（万円）" className="border p-2" />
              <input name="managementCostRate" placeholder="管理費割合（%）" className="border p-2" />
              <input name="maintenanceCostRate" placeholder="修繕費割合（%）" className="border p-2" />
              <input name="otherCost" placeholder="その他経費（万円/年）" className="border p-2" />
            </div>
          </fieldset>

          {/* 大規模修繕 */}
          <fieldset className="border border-gray-300 p-4 rounded">
            <legend className="text-lg font-semibold text-gray-700">大規模修繕</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <input name="largeRepairYear1" placeholder="1回目 年目に" className="border p-2" />
              <input name="largeRepairAmount1" placeholder="金額（万円）" className="border p-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <input name="largeRepairYear2" placeholder="2回目 年目に" className="border p-2" />
              <input name="largeRepairAmount2" placeholder="金額（万円）" className="border p-2" />
            </div>
          </fieldset>
        </div>

      </div>
    </div>
  )
}
