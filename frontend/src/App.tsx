import { useEffect, useState } from 'react'
import InputForm from './components/InputForm'
import ResultCard from './components/ResultCard'

function App() {
  const [result, setResult] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [page, setPage] = useState(0)
  const [savedItems, setSavedItems] = useState<{ name: string; form: any }[]>([])
  const [activeForm, setActiveForm] = useState<any | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('realestate-items')
    if (saved) {
      setSavedItems(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('realestate-items', JSON.stringify(savedItems))
  }, [savedItems])

  const handleCalculate = (form: any) => {
    const price = parseFloat(form.price) * 10000
    const loan = parseFloat(form.loan) * 10000
    const i = parseFloat(form.rate) / 100 / 12
    const n = parseFloat(form.term) * 12
    const monthlyPayment = i === 0 ? loan / n : loan * i / (1 - Math.pow(1 + i, -n))
    const yearlyIncome = parseFloat(form.rent) * 12
    const yearlyCost = parseFloat(form.expense) + (monthlyPayment * 12 - (loan / n) * 12)
    const yearlyProfit = yearlyIncome - yearlyCost
    const yieldPercent = (yearlyProfit / price) * 100
    const grossYield = (yearlyIncome / price) * 100

    setResult({
      monthlyPayment: Math.round(monthlyPayment).toLocaleString(),
      yearlyIncome: Math.round(yearlyIncome).toLocaleString(),
      yearlyCost: Math.round(yearlyCost).toLocaleString(),
      yearlyProfit: Math.round(yearlyProfit).toLocaleString(),
      yieldPercent: yieldPercent.toFixed(2),
      grossYield: grossYield.toFixed(2)
    })

    const startDate = form.startDate ? new Date(form.startDate) : new Date()
    const repaymentSchedule = []
    let remaining = loan

    for (let j = 1; j <= n; j++) {
      const interest = remaining * i
      const principal = monthlyPayment - interest
      remaining -= principal
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + j - 1)

      repaymentSchedule.push({
        no: j,
        date: date.toISOString().split('T')[0],
        payment: Math.round(monthlyPayment),
        principal: Math.round(principal),
        interest: Math.round(interest),
        balance: Math.round(Math.max(0, remaining))
      })
    }

    setSchedule(repaymentSchedule)
    setPage(0)
  }

  const handleSave = (form: any) => {
    if (!form.name) {
      alert("물건 이름을 입력하세요")
      return
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

      // localStorage도 반영
      localStorage.setItem("savedItems", JSON.stringify(updated))
      return updated
    })
  }


  const handleLoad = (form: any) => {
    setActiveForm(form)
    handleCalculate(form)
  }

  const handleDelete = (name: string) => {
    if (!confirm(`'${name}' 항목을 삭제하시겠습니까?`)) return

    const updated = savedItems.filter(item => item.name !== name)
    setSavedItems(updated)
    localStorage.setItem("savedItems", JSON.stringify(updated))
    setFormData({ ...defaultFormData }) // 삭제 후 폼 초기화
  }


  const pageSize = 60
  const paginated = schedule ? schedule.slice(page * pageSize, (page + 1) * pageSize) : []

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* 좌측 사이드바 */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">📂 저장된 계산</h2>
        <ul className="space-y-2">
          {savedItems.map((item, idx) => (
            <li
              key={idx}
              className="cursor-pointer text-sm text-black hover:font-semibold hover:text-blue-600"
              onClick={() => handleLoad(item.form)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* 본문 */}
      <main className="flex-1 p-6 overflow-x-auto">
        <InputForm onCalculate={handleCalculate} onSave={handleSave} onDelete={handleDelete} defaultForm={activeForm} />
        {result && <ResultCard {...result} />}
        {schedule && (
          <div className="max-w-4xl mx-auto mt-10 bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">상환 일정표 (35년간)</h3>
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full text-sm text-left border border-gray-200">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 border">회차</th>
                    <th className="px-3 py-2 border">날짜</th>
                    <th className="px-3 py-2 border">상환 총액</th>
                    <th className="px-3 py-2 border">원금</th>
                    <th className="px-3 py-2 border">이자</th>
                    <th className="px-3 py-2 border">대출 잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item) => (
                    <tr key={item.no}>
                      <td className="px-3 py-2 border">{item.no}회차</td>
                      <td className="px-3 py-2 border">{item.date}</td>
                      <td className="px-3 py-2 border">{item.payment.toLocaleString()} 円</td>
                      <td className="px-3 py-2 border">{item.principal.toLocaleString()}</td>
                      <td className="px-3 py-2 border">{item.interest.toLocaleString()}</td>
                      <td className="px-3 py-2 border">{item.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>※ {pageSize * (page + 1)}개월 중 {Math.min(schedule.length, (page + 1) * pageSize)}개월 표시 중</span>
                <div className="space-x-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">
                    ◀ 이전
                  </button>
                  <button onClick={() => setPage(p => (p + 1) * pageSize < schedule.length ? p + 1 : p)}
                    disabled={(page + 1) * pageSize >= schedule.length}
                    className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">
                    다음 ▶
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
