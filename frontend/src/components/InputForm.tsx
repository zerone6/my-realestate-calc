import React, { useState } from 'react'

export default function InputForm({ onCalculate }: { onCalculate: (form: any) => void }) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    loan: '',
    rate: '',
    term: '',
    rent: '',
    expense: '',
    startDate: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-xl p-6 rounded-2xl mt-10 space-y-4">
      <h2 className="text-2xl font-bold mb-4">부동산 수익 계산기</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries({
          name: "물건 이름",
          price: "매입가 (만엔)",
          loan: "대출 금액 (만엔)",
          rate: "금리 (%)",
          term: "대출 기간 (년)",
          rent: "월세 수익 (엔)",
          expense: "연간 유지비 (엔)",
        }).map(([key, label]) => (
          <Input key={key} label={label} name={key} value={form[key]} onChange={handleChange} />
        ))}

        <div className="md:col-span-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            상환 시작일 (선택 안하면 오늘로 계산)
          </label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            value={form.startDate}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={() => onCalculate(form)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          계산하기
        </button>
        <button
          onClick={() => console.log("저장 준비", form)}
          className="bg-gray-300 text-black px-4 py-2 rounded-xl hover:bg-gray-400"
        >
          저장
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )
}
