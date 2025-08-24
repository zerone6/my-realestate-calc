import { useEffect, useMemo, useState } from 'react'

type ListItem = {
  id: number
  year: string
  quarter: string
  prefecture: string
  municipality: string
  districtName: string
}

type ListResponse = {
  status: string
  source: string
  page: number
  size: number
  total: number
  items: ListItem[]
}

type MuniGrouped = Record<string, Array<{ id: string; name: string }>>

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

const LABELS: Record<string, string> = {
  PriceCategory: '가격 구분',
  Type: '유형',
  Region: '지역',
  MunicipalityCode: '시구정촌 코드',
  Prefecture: '현',
  Municipality: '시구정촌',
  DistrictName: '지구명',
  TradePrice: '거래가격',
  PricePerUnit: '단가(거래)',
  FloorPlan: '평면',
  Area: '면적(토지/전용)',
  UnitPrice: '단가',
  LandShape: '토지 형상',
  Frontage: '접도 길이',
  TotalFloorArea: '연면적',
  BuildingYear: '건축년도',
  Structure: '구조',
  Use: '용도',
  Purpose: '목적',
  Direction: '방향',
  Classification: '분류',
  Breadth: '도로 폭',
  CityPlanning: '도시계획',
  CoverageRatio: '건폐율',
  FloorAreaRatio: '용적률',
  Period: '기간',
  Renovation: '리노베이션',
  Remarks: '비고'
}

export default function TradeSearchPage() {
  // filters
  const [pref, setPref] = useState('13')
  const [cityId, setCityId] = useState('13219')
  const [station, setStation] = useState('')
  const [startYear, setStartYear] = useState('2000')
  const [endYear, setEndYear] = useState(String(new Date().getFullYear()))
  const [priceClassification, setPriceClassification] = useState('')
  // request-level quarter removed; quarter filtering is now client-side

  // paging
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)

  const [muni, setMuni] = useState<MuniGrouped | null>(null)
  const [loadingMuni, setLoadingMuni] = useState(false)
  // List-level (client-side) filters
  const [fYear, setFYear] = useState('')
  const [fQuarter, setFQuarter] = useState('')
  const [fPrefecture, setFPrefecture] = useState('')
  const [fMunicipality, setFMunicipality] = useState('')
  const [fDistrict, setFDistrict] = useState('')

  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)

  const area = useMemo(() => pref || '', [pref])
  const city = useMemo(() => cityId || '', [cityId])

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

  useEffect(() => {
    // reset city when pref changes if current city doesn't match
    setCityId(prev => (prev && pref && prev.startsWith(pref) ? prev : ''))
  }, [pref])

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (area) params.append('area', area)
      if (city) params.append('city', city)
      if (station) params.append('station', station)
      // normalize year range
      const sy = parseInt(startYear || '0', 10)
      const ey = parseInt(endYear || '0', 10)
      const minY = Math.min(sy || 0, ey || 0)
      const maxY = Math.max(sy || 0, ey || 0)
      if (minY) params.append('startYear', String(minY))
      if (maxY) params.append('endYear', String(maxY))
  // Intentionally do NOT send list-level filters (year/quarter/pref/muni/district)
  // These are applied client-side within the current page of results.
      params.append('page', String(page))
      params.append('size', String(size))
      const res = await fetch(`/api/mlit/prices/list?${params.toString()}`)
      const j: ListResponse = await res.json()
      setData(j)
    } catch (e: any) {
      setError(e?.message ?? '검색 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size])

  const onSearch = () => { setPage(0); fetchList() }

  const totalPages = useMemo(() => {
    if (!data) return 0
    return Math.max(1, Math.ceil((data.total || 0) / (data.size || size)))
  }, [data, size])

  const openDetail = async (id: number) => {
    try {
      setDetail(null)
      const r = await fetch(`/api/mlit/prices/detail/${id}`)
      const j = await r.json()
      setDetail(j?.record ?? null)
    } catch {
      setDetail(null)
    }
  }

  return (
    <div className="pt-16 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-4 mb-6">
        <div className="text-lg font-semibold mb-3">거래 검색</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pref" className="block text-sm text-gray-600 mb-1">도도부현 (2자리)</label>
            <select id="pref" className="w-full border rounded px-3 py-2" value={pref} onChange={e=>setPref(e.target.value)}>
              <option value="">-- 선택 --</option>
              {muni && Object.keys(muni).sort((a,b)=>a.localeCompare(b)).map(code => (
                <option key={code} value={code}>{PREF_NAMES[code] ?? code}</option>
              ))}
            </select>
            {loadingMuni && <div className="text-xs text-gray-500 mt-1">행정구역 목록 불러오는 중…</div>}
          </div>
          <div>
            <label htmlFor="city" className="block text-sm text-gray-600 mb-1">시/구/정/촌 (5자리)</label>
            <select id="city" className="w-full border rounded px-3 py-2" value={cityId} onChange={e=>setCityId(e.target.value)} disabled={!pref}>
              <option value="">-- 선택 --</option>
              {pref && muni?.[pref]?.map(c => (
                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="station" className="block text-sm text-gray-600 mb-1">역 코드(선택)</label>
            <input id="station" className="w-full border rounded px-3 py-2" value={station} onChange={e=>setStation(e.target.value)} placeholder="003785" />
          </div>
          <div>
            <label htmlFor="startYear" className="block text-sm text-gray-600 mb-1">시작 연도</label>
            <select id="startYear" className="w-full border rounded px-3 py-2" value={startYear} onChange={e=>setStartYear(e.target.value)}>
              <option value="">-- 전체 --</option>
              {Array.from({length: new Date().getFullYear()-2000+1}, (_,i)=> new Date().getFullYear()-i).map(y=> (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="endYear" className="block text-sm text-gray-600 mb-1">종료 연도</label>
            <select id="endYear" className="w-full border rounded px-3 py-2" value={endYear} onChange={e=>setEndYear(e.target.value)}>
              <option value="">-- 전체 --</option>
              {Array.from({length: new Date().getFullYear()-2000+1}, (_,i)=> new Date().getFullYear()-i).map(y=> (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          {/* Remove request-time quarter filter; quarter filtering is provided within the list below */}
          <div>
            <label htmlFor="priceClassification" className="block text-sm text-gray-600 mb-1">가격 구분</label>
            <select id="priceClassification" className="w-full border rounded px-3 py-2" value={priceClassification} onChange={e=>setPriceClassification(e.target.value)}>
              <option value="">-- 전체 --</option>
              <option value="01">取引価格</option>
              <option value="02">成約価格</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={onSearch} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60" disabled={loading}>검색</button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">페이지당</span>
            <select className="border rounded px-2 py-1" value={size} onChange={e=>{ const v = parseInt(e.target.value,10); setSize(v); setPage(0); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600">개</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">총 {data?.total ?? 0}건</div>
            {data?.source && <div className="text-xs px-2 py-1 bg-gray-100 rounded">source: {data.source}</div>}
          </div>
          {/* List-level filters */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label htmlFor="fYear" className="block text-xs text-gray-600 mb-1">연도</label>
              <select id="fYear" className="w-full border rounded px-2 py-1" value={fYear} onChange={e=>setFYear(e.target.value)}>
                <option value="">전체</option>
                {(data?.items||[]).map(i=>i.year).filter((v,i,a)=>!!v && a.indexOf(v)===i).sort((a,b)=>Number(b)-Number(a)).map(y=> (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fQuarter" className="block text-xs text-gray-600 mb-1">분기</label>
              <select id="fQuarter" className="w-full border rounded px-2 py-1" value={fQuarter} onChange={e=>setFQuarter(e.target.value)}>
                <option value="">전체</option>
                {[...new Set((data?.items||[]).map(i=>i.quarter).filter(Boolean))]
                  .sort((a:any,b:any)=>Number(b)-Number(a)).map(q=> (
                    <option key={String(q)} value={String(q)}>{q}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fPref" className="block text-xs text-gray-600 mb-1">현</label>
              <select id="fPref" className="w-full border rounded px-2 py-1" value={fPrefecture} onChange={e=>setFPrefecture(e.target.value)}>
                <option value="">전체</option>
                {[...new Set((data?.items||[]).map(i=>i.prefecture).filter(Boolean))]
                  .sort((a,b)=>String(a).localeCompare(String(b))).map(p=> (
                    <option key={String(p)} value={String(p)}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fMuni" className="block text-xs text-gray-600 mb-1">시구정촌</label>
              <select id="fMuni" className="w-full border rounded px-2 py-1" value={fMunicipality} onChange={e=>setFMunicipality(e.target.value)}>
                <option value="">전체</option>
                {[...new Set((data?.items||[]).map(i=>i.municipality).filter(Boolean))]
                  .sort((a,b)=>String(a).localeCompare(String(b))).map(m=> (
                    <option key={String(m)} value={String(m)}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fDistrict" className="block text-xs text-gray-600 mb-1">District</label>
              <select id="fDistrict" className="w-full border rounded px-2 py-1" value={fDistrict} onChange={e=>setFDistrict(e.target.value)}>
                <option value="">전체</option>
                {[...new Set((data?.items||[]).map(i=>i.districtName).filter(Boolean))]
                  .sort((a,b)=>String(a).localeCompare(String(b))).map(d=> (
                    <option key={String(d)} value={String(d)}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button className="text-xs px-2 py-1 border rounded" onClick={()=>{ setFYear(''); setFQuarter(''); setFPrefecture(''); setFMunicipality(''); setFDistrict(''); }}>필터 초기화</button>
            <div className="text-xs text-gray-600">표시 {
              (data?.items||[]).filter(it => (
                (!fYear || it.year === fYear) &&
                (!fQuarter || String(it.quarter) === String(fQuarter)) &&
                (!fPrefecture || it.prefecture === fPrefecture) &&
                (!fMunicipality || it.municipality === fMunicipality) &&
                (!fDistrict || it.districtName === fDistrict)
              )).length
            }건</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">연도</th>
                <th className="px-3 py-2 text-left">분기</th>
                <th className="px-3 py-2 text-left">현</th>
                <th className="px-3 py-2 text-left">시구정촌</th>
                <th className="px-3 py-2 text-left">District name</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">불러오는 중…</td></tr>
              )}
              {!loading && ((data?.items||[]).filter(it => (
                (!fYear || it.year === fYear) &&
                (!fQuarter || String(it.quarter) === String(fQuarter)) &&
                (!fPrefecture || it.prefecture === fPrefecture) &&
                (!fMunicipality || it.municipality === fMunicipality) &&
                (!fDistrict || it.districtName === fDistrict)
              )).length === 0) && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">결과가 없습니다</td></tr>
              )}
              {!loading && (data?.items || [])
                .filter(it => (
                  (!fYear || it.year === fYear) &&
                  (!fQuarter || String(it.quarter) === String(fQuarter)) &&
                  (!fPrefecture || it.prefecture === fPrefecture) &&
                  (!fMunicipality || it.municipality === fMunicipality) &&
                  (!fDistrict || it.districtName === fDistrict)
                ))
                .map(item => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>openDetail(item.id)}>
                  <td className="px-3 py-2">{item.year}</td>
                  <td className="px-3 py-2">{item.quarter}</td>
                  <td className="px-3 py-2">{item.prefecture}</td>
                  <td className="px-3 py-2">{item.municipality}</td>
                  <td className="px-3 py-2">{item.districtName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">페이지 { (data?.page ?? page) + 1 } / { totalPages }</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={()=>setPage(p=>Math.max(0, p-1))} disabled={page<=0 || loading}>이전</button>
            <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={()=>setPage(p=>Math.min(totalPages-1, p+1))} disabled={loading || (data? (data.page+1)>=totalPages: false)}>다음</button>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      {detail && (
        <dialog open className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">상세 정보</div>
              <button onClick={()=>setDetail(null)} className="text-gray-500 hover:text-gray-800">닫기</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-auto">
              {Object.entries(detail).map(([k,v]) => (
                <div key={k} className="border rounded p-2">
                  <div className="text-xs text-gray-500 mb-1">{LABELS[k] ?? k}</div>
                  <div className="text-sm break-words">{JSON.stringify(v, null, 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </dialog>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 rounded shadow">{error}</div>
      )}
    </div>
  )
}
