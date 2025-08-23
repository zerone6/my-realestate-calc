import { useEffect, useState } from 'react'

// 도도부현 코드(2자리) -> 명칭 매핑
const PREF_NAMES: Record<string, string> = {
  '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
  '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
  '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
  '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
  '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
  '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
  '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
  '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
  '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
  '46': '鹿児島県', '47': '沖縄県'
}

export default function ApiTestPage() {
  // API 선택 (확장 대비)
  const [selectedApi, setSelectedApi] = useState<'XIT001'|'XIT002'>('XIT001')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [station, setStation] = useState('')
  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')

  // municipalities data from backend cache
  const [muni, setMuni] = useState<Record<string, Array<{id:string,name:string}>> | null>(null)
  const [pref, setPref] = useState<string>('') // selected prefecture code (2 digits)
  const [cityId, setCityId] = useState<string>('') // selected city code (5 digits)
  const [loadingMuni, setLoadingMuni] = useState(false)
  const [priceClassification, setPriceClassification] = useState('2') // 성약가격
  const [quarter, setQuarter] = useState('')
  const [language, setLanguage] = useState('ja')

  const fetchMunicipalities = async () => {
    try {
      setLoadingMuni(true)
      const r = await fetch('/api/admin/mlit-cache/all')
      const j = await r.json()
      setMuni(j?.data ?? null)
    } catch {
      setMuni(null)
    } finally {
      setLoadingMuni(false)
    }
  }

  useEffect(() => {
    // fetch municipalities cache once
    fetchMunicipalities()
  }, [])

  // when selections change, auto fill area/city fields used by API
  useEffect(() => {
  setArea(pref || '')
  setCityId('')
  }, [pref])
  useEffect(() => {
    setCity(cityId || '')
  }, [cityId])

  const callApi = async () => {
    setLoading(true)
    setError(null)
    setResult('')
    try {
      const params = new URLSearchParams()
      if (area) params.append('area', area)
      if (city) params.append('city', city)
      if (station) params.append('station', station)
      if (year) params.append('year', year)
      if (priceClassification) params.append('priceClassification', priceClassification)
      if (quarter) params.append('quarter', quarter)
      if (language) params.append('language', language)
      const endpoint = selectedApi === 'XIT001' ? '/api/mlit/prices' : '/api/unsupported'
      const res = await fetch(`${endpoint}?${params.toString()}`)
      const text = await res.text()
      setResult(text)
    } catch (e:any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const buildFullUrl = () => {
    const params = new URLSearchParams()
    if (area) params.append('area', area)
    if (city) params.append('city', city)
    if (station) params.append('station', station)
    if (year) params.append('year', year)
    if (priceClassification) params.append('priceClassification', priceClassification)
    if (quarter) params.append('quarter', quarter)
    if (language) params.append('language', language)
    const endpoint = selectedApi === 'XIT001' ? '/api/mlit/prices' : '/api/unsupported'
    return `${endpoint}?${params.toString()}`
  }

  const saveJson = () => {
    try {
      const blob = new Blob([result || ''], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `${selectedApi.toLowerCase()}_${ts}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  return (
    <div className="pt-16 px-4">
      {/* 상단: API 선택 및 입력 영역 */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-4 mb-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="text-xs text-gray-500">API</div>
          <select className="border rounded px-2 py-1" value={selectedApi} onChange={e=>{ setSelectedApi(e.target.value as any); setResult(''); setError(null); }}>
            <option value="XIT001">4. 不動産価格（取引価格・成約価格）情報取得API (XIT001)</option>
            <option value="XIT002">5. 都道府県内市区町村一覧取得API (XIT002) - 준비중</option>
          </select>
          {selectedApi==='XIT001' && (
            <a className="text-sm text-blue-600" href="https://www.reinfolib.mlit.go.jp/help/apiManual/#titleApi4" target="_blank" rel="noreferrer">매뉴얼</a>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Prefecture selector */}
          <div>
            <label htmlFor="pref" className="block text-sm text-gray-600 mb-1">도도부현 선택 (2자리)</label>
            <select id="pref" value={pref} onChange={e=>setPref(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">-- 선택 --</option>
              {muni && Object.keys(muni).sort((a,b)=>a.localeCompare(b)).map(code => (
                <option key={code} value={code}>{PREF_NAMES[code] ?? code}</option>
              ))}
            </select>
            {loadingMuni && <div className="text-xs text-gray-500 mt-1">행정구역 목록 불러오는 중…</div>}
          </div>
          {/* City selector depends on selected prefecture */}
          <div>
            <label htmlFor="cityId" className="block text-sm text-gray-600 mb-1">시/구/정/촌 선택 (5자리)</label>
            <select id="cityId" value={cityId} onChange={e=>setCityId(e.target.value)} className="w-full border rounded px-3 py-2" disabled={!pref}>
              <option value="">-- 선택 --</option>
              {pref && muni?.[pref]?.map(c => (
                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
              ))}
            </select>
          </div>
          {/* Station free text */}
          <div>
            <label htmlFor="station" className="block text-sm text-gray-600 mb-1">station (駅コード6桁)</label>
            <input id="station" value={station} onChange={e=>setStation(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="003785" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label htmlFor="year" className="block text-sm text-gray-600 mb-1">year (연도)</label>
            <select id="year" value={year} onChange={e=>setYear(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">-- 선택 --</option>
              {(() => {
                const now = new Date()
                const maxYear = now.getFullYear()
                const years = [] as number[]
                for (let y = maxYear; y >= 2000; y--) years.push(y)
                return years.map(y => <option key={y} value={String(y)}>{y}</option>)
              })()}
            </select>
          </div>
          <div>
            <label htmlFor="area" className="block text-xs text-gray-500 mb-1">area (자동입력 가능)</label>
            <input id="area" value={area} onChange={e=>setArea(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="13" />
          </div>
          <div>
            <label htmlFor="city" className="block text-xs text-gray-500 mb-1">city (자동입력 가능)</label>
            <input id="city" value={city} onChange={e=>setCity(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="13101" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label htmlFor="priceClassification" className="block text-sm text-gray-600 mb-1">priceClassification</label>
            <select id="priceClassification" className="w-full border rounded px-3 py-2" value={priceClassification} onChange={e=>setPriceClassification(e.target.value)}>
              <option value="">-- 선택 --</option>
              <option value="1">取引価格</option>
              <option value="2">成約価格</option>
            </select>
          </div>
          <div>
            <label htmlFor="quarter" className="block text-sm text-gray-600 mb-1">quarter</label>
            <select id="quarter" className="w-full border rounded px-3 py-2" value={quarter} onChange={e=>setQuarter(e.target.value)}>
              <option value="">-- 선택 --</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div>
            <label htmlFor="language" className="block text-sm text-gray-600 mb-1">language</label>
            <select id="language" className="w-full border rounded px-3 py-2" value={language} onChange={e=>setLanguage(e.target.value)}>
              <option value="">-- 선택 --</option>
              <option value="ja">ja</option>
              <option value="en">en</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={callApi} disabled={loading || selectedApi!=='XIT001'} className="bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded">
            {loading ? '요청 중...' : 'API 호출'}
          </button>
          <button onClick={saveJson} disabled={!result} className="bg-gray-700 disabled:opacity-60 text-white px-3 py-2 rounded">JSON 저장</button>
        </div>

        {/* 실제 호출 URL 미리보기 */}
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Full URL (요청 예정)</div>
          <div className="font-mono text-xs bg-gray-100 border rounded p-2 break-all">{buildFullUrl()}</div>
        </div>
        {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
      </div>

      {/* 하단: 결과 영역 (가공 없이 그대로) */}
      <div className="max-w-4xl mx-auto bg-gray-900 text-green-300 rounded-lg shadow p-4">
        <div className="text-sm text-gray-400 mb-2">Raw Result</div>
        <pre className="whitespace-pre-wrap break-all text-xs overflow-auto max-h-[60vh]">{result}</pre>
      </div>
    </div>
  )
}
