import { useState, useEffect, useRef } from 'react'
import { fieldDescriptions } from '../../../shared/data/fieldDescriptions'
import { FormInputData } from '../../../shared/types/RealEstateForm'
import { createDefaultFormData, calculateTotalPurchaseCost } from '../../../shared/utils/formUtils'
import { normalizeForm } from '../../../shared/utils/formNormalize'
import { createInputChangeHandler } from '../hooks/useFormHandlers'
import DescriptionTooltip from './DescriptionTooltip'
import { PREF_NAMES } from '../../../shared/data/tradeLabels'

function InfoButton({ onClick, label }: Readonly<{ onClick: (e: React.MouseEvent) => void, label: string }>) {
  return (
    <button type="button" onClick={onClick} className="ml-2 text-gray-400 hover:text-blue-600" aria-label={`${label} 설명`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
    </button>
  )
}

interface FormProps { onCalculate: (f: FormInputData)=>void; onAutoSave:(f:FormInputData)=>void; defaultForm?: FormInputData|null; onCalculateComplete?: ()=>void }

// Reusable layout components (moved outside to satisfy lint rule)
const Row = ({children, cols=4}: Readonly<{children:React.ReactNode, cols?:4|3}>) => (
  <div className={`grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-${cols}`}>{children}</div>
)

const LabeledNumber = (p: Readonly<{id:string; label:string; placeholder?:string; step?:string; suffix?:string; value?:string; onChange?:(e:React.ChangeEvent<HTMLInputElement>)=>void; onInfo?:(e:React.MouseEvent)=>void;}>) => (
  <div>
    <div className="flex items-center justify-between">
      <label htmlFor={p.id} className="block text-sm font-medium text-gray-700 mb-1">{p.label}</label>
      <InfoButton onClick={(e)=> (p.onInfo? p.onInfo(e): undefined)} label={p.label} />
    </div>
    <input type="number" id={p.id} name={p.id} value={p.value} onChange={p.onChange} step={p.step} placeholder={p.placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
  </div>
)

export default function MultiStepInputForm({ onCalculate, onAutoSave, defaultForm, onCalculateComplete }: Readonly<FormProps>){
  const [form,setForm]=useState<FormInputData>(()=>{try{const s=localStorage.getItem('realEstateForm'); if(s){const p=JSON.parse(s); if(p && p.name!==undefined) return normalizeForm(p);} }catch{} return createDefaultFormData()})
  const [currentStep,setCurrentStep]=useState(()=>{try{const s=localStorage.getItem('realEstateFormStep'); if(s){const n=parseInt(s,10); if(n>=0&&n<=3) return n;}}catch{} return 0})
  const nameRef=useRef<HTMLInputElement>(null)
  const [tooltipVisible,setTooltipVisible]=useState(false)
  const [tooltipPosition,setTooltipPosition]=useState({x:0,y:0})
  const [tooltipDescription,setTooltipDescription]=useState('')
  // Address dropdown data
  const [muni, setMuni] = useState<Record<string, {id:string; name:string}[]>|null>(null)
  const [loadingMuni, setLoadingMuni] = useState(false)
  const [districtOptions, setDistrictOptions] = useState<string[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  const steps=[{title:'물건 정보',key:'property'},{title:'제비용',key:'acquisition'},{title:'유지·장기수선',key:'maintenance'},{title:'대출 정보',key:'loan'}]

  // Derived values
  const acquisitionCostTotal=[form.brokerageFee,form.registrationFee,form.acquisitionTax,form.stampDuty,form.loanFee,form.surveyFee,form.miscellaneousFees,form.otherMiscellaneousFees||'0']
    .reduce((s,v)=>s+(parseFloat(v)||0),0)
  const totalPurchaseCost=calculateTotalPurchaseCost(form)
  const loanAmount=Math.max(0,totalPurchaseCost-(parseFloat(form.ownCapital)||0))

  // Auto-compute buildingAge when structure changes (simple mapping)
  useEffect(()=>{
    const map:Record<string,number>={RC:47,SRC:47,'철골조':34,'경량철골조':19,'목조':22}
    if(map[form.structure]) setForm(f=>({...f,buildingAge:String(map[form.structure])}))
  },[form.structure])

  // Auto-derive monthly fees once when zero
  useEffect(()=>{
    const rent=parseFloat(form.rent)||0
    if(rent<=0) return
    setForm(f=>{
      let changed=false; const nf={...f}
      if(nf.managementFee==='0' && parseFloat(nf.managementFeeRate)>0){ nf.managementFee=(rent*(parseFloat(nf.managementFeeRate)/100)).toFixed(1); changed=true }
      if(nf.maintenanceFee==='0' && parseFloat(nf.maintenanceFeeRate)>0){ nf.maintenanceFee=(rent*(parseFloat(nf.maintenanceFeeRate)/100)).toFixed(1); changed=true }
      if((nf as any).managementCommissionFee==='0' && parseFloat((nf as any).managementCommissionRate)>0){ (nf as any).managementCommissionFee=(rent*(parseFloat((nf as any).managementCommissionRate)/100)).toFixed(1); changed=true }
      return changed?nf:f
    })
  },[form.rent,form.managementFeeRate,form.maintenanceFeeRate,(form as any).managementCommissionRate])

  // Persist
  useEffect(()=>{ try{localStorage.setItem('realEstateForm',JSON.stringify(form))}catch{} },[form])
  useEffect(()=>{ try{localStorage.setItem('realEstateFormStep',String(currentStep))}catch{} },[currentStep])
  useEffect(()=>{ if(defaultForm){ const norm = normalizeForm(defaultForm); setForm(norm); try{localStorage.setItem('realEstateForm',JSON.stringify(norm))}catch{} } },[defaultForm])

  // Load municipalities for dropdowns
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingMuni(true)
        const r = await fetch('/api/mlit/municipalities-grouped')
        const j = await r.json()
        setMuni(j?.data ?? null)
      } catch {
        setMuni(null)
      } finally {
        setLoadingMuni(false)
      }
    }
    run()
  }, [])

  // Load districts when city changes
  useEffect(() => {
    const load = async () => {
      if (!form.cityId) { setDistrictOptions([]); return }
      try {
        setLoadingDistricts(true)
        const res = await fetch(`/api/mlit/prices/districts?city=${encodeURIComponent(form.cityId)}`)
        const list: string[] = await res.json()
        const sorted = (list||[]).filter(Boolean).sort((a,b)=>a.localeCompare(b))
        setDistrictOptions(sorted)
        if (!form.district1 && sorted.length>0) {
          setForm(f=>({ ...f, district1: sorted[0] }))
        } else if (sorted.length === 0 && form.district1) {
          // no districts available -> clear selected district1
          setForm(f=>({ ...f, district1: '' }))
        }
      } catch {
        setDistrictOptions([])
      } finally {
        setLoadingDistricts(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cityId])

  const handleInputChange=createInputChangeHandler(form,setForm)
  const autoSave=()=>{ if(typeof form.name==='string' && form.name.trim()) onAutoSave(form) }
  const handleCalculate=()=>{ autoSave(); onCalculate(form); onCalculateComplete?.() }
  const handleReset=()=>{ if(confirm('초기화하시겠습니까?')) { const d=createDefaultFormData(); setForm(d); setCurrentStep(0); try{localStorage.removeItem('realEstateForm');localStorage.removeItem('realEstateFormStep')}catch{} } }
  const nextStep=()=>{ if(currentStep<steps.length-1){ autoSave(); setCurrentStep(c=>c+1) } }
  const prevStep=()=>{ if(currentStep>0){ autoSave(); setCurrentStep(c=>c-1) } }
  const goToStep=(i:number)=>{ autoSave(); setCurrentStep(i) }
  const handleLabelClick=(field:string,e:React.MouseEvent)=>{ e.preventDefault(); const d=fieldDescriptions[field]; if(d){ setTooltipDescription(d.description); setTooltipPosition({x:e.clientX,y:e.clientY}); setTooltipVisible(true)} }

  // Layout builders
  const numberFieldProps = (id:string, label:string, placeholder?:string, step?:string) => ({
    id,label,placeholder,step,value:(form as any)[id], onChange:handleInputChange as any, onInfo:(e:React.MouseEvent)=>handleLabelClick(id,e)
  })

  const toNumber = (v:string|undefined)=>{ const n=parseFloat(v||''); return isFinite(n)?n:0 }
  // formatUnit no longer needed (inline calc for readonly field)

  const propertySection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">물건 정보</h3>
      {/* 1행: 물건 이름, 전철역 */}
      <Row>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">물건 이름</label>
          <input ref={nameRef} id="name" name="name" value={form.name} onChange={handleInputChange} placeholder="예: 신주쿠 아파트"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="station" className="block text-sm font-medium text-gray-700 mb-1">전철역</label>
            <InfoButton onClick={(e)=>handleLabelClick('station',e)} label="전철역" />
          </div>
          <div className="flex items-center space-x-2">
            <input id="station" name="station" value={(form as any).station || ''} onChange={handleInputChange} placeholder="예: 네리마역"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <select
              id="walkMinutesToStation"
              name="walkMinutesToStation"
              value={(form as any).walkMinutesToStation !== undefined ? String((form as any).walkMinutesToStation) : ''}
              onChange={(e)=>{
                const v = e.target.value
                const num = v === '' ? undefined : parseInt(v,10)
                setForm(f=> ({ ...f, walkMinutesToStation: num }))
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-label="역에서 도보 분"
            >
              <option value="">도보 분</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}분</option>
              ))}
            </select>
          </div>
        </div>
      </Row>

      {/* 주소 구성: 현, 시구정촌, 세부1, 세부2 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="pref" className="block text-sm font-medium text-gray-700 mb-1">현</label>
          <select id="pref" name="pref" value={(form as any).pref || ''} onChange={(e)=>{
            handleInputChange(e);
            // reset city/districts when pref changes
            setForm(f=>({...f, cityId: '', district1: ''}))
          }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="">-- 선택 --</option>
            {muni && Object.keys(muni).sort((a,b)=>a.localeCompare(b)).map(code => (
              <option key={code} value={code}>{PREF_NAMES[code] ?? code}</option>
            ))}
          </select>
          {loadingMuni && <div className="text-xs text-gray-500 mt-1">행정구역 목록 불러오는 중…</div>}
        </div>
        <div>
          <label htmlFor="cityId" className="block text-sm font-medium text-gray-700 mb-1">시구정촌</label>
          <select id="cityId" name="cityId" value={(form as any).cityId || ''}
            onChange={(e)=>{
              handleInputChange(e)
              // also prefill trade search even if no district1
              try{ window.dispatchEvent(new CustomEvent('tradeSearchPrefill', { detail: { pref: form.pref, cityId: (e.target as HTMLSelectElement).value, name: form.name, landArea: (form as any).landArea, buildingArea: form.buildingArea, price: form.price } })) }catch{}
            }} disabled={!form.pref}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="">-- 선택 --</option>
            {form.pref && muni?.[form.pref]?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="district1" className="block text-sm font-medium text-gray-700 mb-1">세부1</label>
          <select id="district1" name="district1" value={(form as any).district1 || ''}
            onChange={(e)=>{ handleInputChange(e); try{ window.dispatchEvent(new CustomEvent('tradeSearchPrefill', { detail: { pref: form.pref, cityId: form.cityId, district1: e.target.value, name: form.name, landArea: (form as any).landArea, buildingArea: form.buildingArea, price: form.price } })) }catch{}}}
            disabled={!form.cityId || districtOptions.length===0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            {districtOptions.length>0 ? (
              <>
                <option value="">-- 선택 --</option>
                {districtOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </>
            ) : (
              <option value="">-- 없음 --</option>
            )}
          </select>
          {loadingDistricts && <div className="text-xs text-gray-500 mt-1">세부1 불러오는 중…</div>}
        </div>
        <div>
          <label htmlFor="district2" className="block text-sm font-medium text-gray-700 mb-1">세부2</label>
          <input id="district2" name="district2" value={(form as any).district2 || ''} onChange={handleInputChange} placeholder="동/번지 등 자유 입력"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>

      {/* 구분선 및 가격/자기자금/건물가격을 아래 블럭으로 이동 */}
      <div className="border-t my-4" />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <LabeledNumber {...numberFieldProps('price','매입가 (만원)','6000')} />
        <LabeledNumber {...numberFieldProps('ownCapital','자기자금 (만원)','1000')} />
        <LabeledNumber {...numberFieldProps('buildingPrice','건물가격 (만원)','0')} />
        <div>
          <div className="flex items-center justify-between" aria-label="평단가 (만원/평)">
            <span className="block text-sm font-medium text-gray-700 mb-1">평단가 (만원/평)</span>
            <InfoButton onClick={(e)=>handleLabelClick('pricePerPyeong',e)} label="평단가" />
          </div>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
            {(() => {
              const land = toNumber((form as any).landArea)
              const price = toNumber(form.price)
              if (land <= 0 || price <= 0) return '-'
              const p = land / 3.3058
              if (p <= 0) return '-'
              return (price / p).toFixed(1)
            })()}
          </div>
        </div>
      </div>

  {/* 가격 행 하단부터 기존 섹션 유지 */}
      <Row>
  <LabeledNumber {...numberFieldProps('grossYield','표면 이익율 (%)','6.0','0.1')} />
  <LabeledNumber {...numberFieldProps('rent','월세 수입 (万円)','25','0.1')} />
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">연간 수입 (万円)</div>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">{((parseFloat(form.rent)||0)*12).toFixed(1)}</div>
        </div>
  <LabeledNumber {...numberFieldProps('occupancyRate','입주율 (%)','100','0.1')} />
      </Row>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="structure" className="block text-sm font-medium text-gray-700 mb-1">구조</label>
            <InfoButton onClick={(e)=>handleLabelClick('structure',e)} label="구조" />
          </div>
          <select id="structure" name="structure" value={form.structure} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="RC">RC</option><option value="SRC">SRC</option><option value="철골조">철골조</option><option value="경량철골조">경량철골조</option><option value="목조">목조</option>
          </select>
        </div>
  <LabeledNumber {...numberFieldProps('buildingAge','내용연수 (년)','22')} />
  <LabeledNumber {...numberFieldProps('landArea','토지 면적 (㎡)','0')} />
  <LabeledNumber {...numberFieldProps('buildingArea','건물 면적 (㎡)','100')} />
      </div>
    </div>
  )

  const acquisitionSection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">제비용</h3>
      <Row>
  <LabeledNumber {...numberFieldProps('brokerageFee','중개 수수료','100')} />
  <LabeledNumber {...numberFieldProps('registrationFee','등기비','50')} />
  <LabeledNumber {...numberFieldProps('acquisitionTax','부동산 취득세','30')} />
  <LabeledNumber {...numberFieldProps('stampDuty','인지세','1')} />
      </Row>
      <Row>
  <LabeledNumber {...numberFieldProps('loanFee','론 수수료','50')} />
  <LabeledNumber {...numberFieldProps('surveyFee','조사비','10')} />
  <LabeledNumber {...numberFieldProps('miscellaneousFees','기타비용1','20')} />
  <LabeledNumber {...numberFieldProps('otherMiscellaneousFees','기타비용2','0')} />
      </Row>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-1">제비용 합계</div>
          <div className="text-lg font-semibold text-blue-600">{acquisitionCostTotal.toFixed(1)} 万円</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-1">총 매입 비용</div>
          <div className="text-lg font-semibold text-green-600">{totalPurchaseCost.toFixed(1)} 万円</div>
          <div className="text-xs text-gray-500 mt-1">매입가 + 제비용</div>
        </div>
      </div>
    </div>
  )

  const maintenanceSection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">유지·장기수선</h3>
      <Row>
  <LabeledNumber {...numberFieldProps('rentFixedPeriod','월세 고정기간 (년)','1')} />
  <LabeledNumber {...numberFieldProps('rentAdjustmentInterval','월세 조정 간격 (년)','1')} />
  <LabeledNumber {...numberFieldProps('rentAdjustmentRate','월세 하락율 (%)','0','0.1')} />
  <LabeledNumber {...numberFieldProps('propertyTax','고정자산세 (연간)','50')} />
      </Row>
      <Row>
  <LabeledNumber {...numberFieldProps('managementFeeRate','관리비율 (%)','5','0.1')} />
  <LabeledNumber {...numberFieldProps('managementFee','관리비 (월)','0','0.1')} />
  <LabeledNumber {...numberFieldProps('managementCommissionRate','관리수수료율 (%)','5','0.1')} />
  <LabeledNumber {...numberFieldProps('managementCommissionFee','관리수수료 (월)','0','0.1')} />
      </Row>
      <Row>
  <LabeledNumber {...numberFieldProps('maintenanceFeeRate','장기수선 적립비율 (%)','3','0.1')} />
  <LabeledNumber {...numberFieldProps('maintenanceFee','장기수선 적립 (월)','0','0.1')} />
  <LabeledNumber {...numberFieldProps('insurance','보험료 (연간)','5')} />
  <LabeledNumber {...numberFieldProps('otherExpenses','기타 경비 (연간)','10')} />
      </Row>
    </div>
  )

  const loanSection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">대출 정보</h3>
      <div className="bg-blue-50 p-4 rounded-lg inline-block">
        <div className="text-sm font-medium text-gray-700 mb-1">대출 금액 추정</div>
        <div className="text-lg font-semibold text-blue-600">{loanAmount.toFixed(1)} 万円</div>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <LabeledNumber {...numberFieldProps('rate','금리 (%)','2.0','0.1')} />
        <LabeledNumber {...numberFieldProps('term','대출기간 (년)','35')} />
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <InfoButton onClick={(e)=>handleLabelClick('startDate',e)} label="시작일" />
          </div>
          <input type="date" id="startDate" name="startDate" value={form.startDate} onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </div>
  )

  const renderCurrent=()=>{
    if(currentStep===0) return propertySection
    if(currentStep===1) return acquisitionSection
    if(currentStep===2) return maintenanceSection
    return loanSection
  }

  return (
    <div className="max-w-full lg:max-w-[1440px] mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      {/* Step indicator */}
      <div className="bg-gray-50 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
        {steps.map((s,i)=>{
          const active=i===currentStep; const done=i<currentStep
          let circleClass='bg-gray-200 text-gray-400'
          if(done){ circleClass='bg-blue-100 text-blue-600' }
          if(active){ circleClass='bg-blue-600 text-white' }
          let textClass='text-gray-400'
          if(done){ textClass='text-blue-600' }
          if(active){ textClass='text-blue-600' }
          return (
            <button key={s.key} type="button" onClick={()=>goToStep(i)} className="flex items-center group">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-2 ${circleClass}`}>{i+1}</span>
              <span className={`text-sm font-medium ${textClass}`}>{s.title}</span>
            </button>
          )})}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={()=> window.dispatchEvent(new CustomEvent('exportPdf'))}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-medium shadow"
          >PDF로 저장</button>
          <button
            type="button"
            onClick={()=>{ try { window.dispatchEvent(new CustomEvent('explicitFormSave', { detail: { form } })) } catch {} }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium shadow"
          >물건 정보 저장</button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {renderCurrent()}
      </div>
      {/* Desktop action bar */}
      <div className="hidden md:flex bg-gray-50 px-6 py-4 justify-between items-center">
        <button onClick={prevStep} disabled={currentStep===0} className={`px-4 py-2 rounded-md text-sm font-medium ${currentStep===0?'bg-gray-200 text-gray-400':'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>이전</button>
        <div className="flex gap-2">
          <button onClick={handleCalculate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">계산하기</button>
          <button onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium">초기화</button>
        </div>
        <button onClick={nextStep} disabled={currentStep===steps.length-1} className={`px-4 py-2 rounded-md text-sm font-medium ${currentStep===steps.length-1?'bg-gray-200 text-gray-400':'bg-blue-600 hover:bg-blue-700 text-white'}`}>다음</button>
      </div>
      {/* Mobile sticky action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t px-3 py-2 flex items-center gap-2 safe-bottom">
        <button onClick={prevStep} disabled={currentStep===0} className={`flex-1 px-3 py-2 rounded-md text-xs font-medium ${currentStep===0?'bg-gray-200 text-gray-400':'bg-gray-200 active:bg-gray-300 text-gray-700'}`}>이전</button>
        <button onClick={handleCalculate} className="flex-[1.4] px-3 py-2 bg-blue-600 active:bg-blue-700 text-white rounded-md text-xs font-semibold">계산</button>
        <button onClick={handleReset} className="flex-1 px-3 py-2 bg-gray-600 active:bg-gray-700 text-white rounded-md text-xs font-medium">초기화</button>
        <button onClick={nextStep} disabled={currentStep===steps.length-1} className={`flex-1 px-3 py-2 rounded-md text-xs font-medium ${currentStep===steps.length-1?'bg-gray-200 text-gray-400':'bg-emerald-600 active:bg-emerald-700 text-white'}`}>다음</button>
      </div>

      {tooltipVisible && (
        <DescriptionTooltip description={tooltipDescription} position={tooltipPosition} isVisible={tooltipVisible} onClose={()=>setTooltipVisible(false)} />
      )}
    </div>
  )
}
