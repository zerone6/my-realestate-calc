
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
      <div className="grid grid-cols-2 gap-4">
        <input name="name" value={form.name} onChange={update} className="border p-2" placeholder="물건 이름" />
        <input name="price" value={form.price} onChange={update} className="border p-2" placeholder="매입가 (만엔)" />
        <input name="loan" value={form.loan} onChange={update} className="border p-2" placeholder="대출 금액 (만엔)" />
        <input name="rate" value={form.rate} onChange={update} className="border p-2" placeholder="금리 (%)" />
        <input name="term" value={form.term} onChange={update} className="border p-2" placeholder="대출 기간 (년)" />
        <input name="rent" value={form.rent} onChange={update} className="border p-2" placeholder="월세 수익 (엔)" />
        <input name="expense" value={form.expense} onChange={update} className="border p-2" placeholder="연간 유지비 (엔)" />
        <input type="date" name="startDate" value={form.startDate || today} onChange={update} className="border p-2" placeholder="상환 시작일" />
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
      </div>
    </div>
  )
}
