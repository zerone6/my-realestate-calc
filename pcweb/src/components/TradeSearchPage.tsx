import { useEffect, useMemo, useRef, useState } from 'react'
import { ListResponse, MuniGrouped } from '../../../shared/types/Trade'
import { PREF_NAMES, TRADE_LABELS as LABELS } from '../../../shared/data/tradeLabels'

type Prefill = { pref?: string; cityId?: string; district1?: string }

export default function TradeSearchPage({ prefill }: Readonly<{ prefill?: Prefill }>) {
  // simple session cache keys
  const STORAGE_DATA = 'ts:lastListData'
  const STORAGE_STATE = 'ts:lastListState'
  // filters
  const [pref, setPref] = useState(prefill?.pref ?? '')
  const [cityId, setCityId] = useState(prefill?.cityId ?? '')
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
  // List-level (client-side) filters (aligned to table)
  const [fYear, setFYear] = useState('')
  const [fType, setFType] = useState('')
  const [fFloorPlan, setFFloorPlan] = useState('')
  const [fBuildingYear, setFBuildingYear] = useState('')
  const [fStructure, setFStructure] = useState('')
  const [fDistrict, setFDistrict] = useState('')

  // dataset-wide facets for filter options
  const [facetYears, setFacetYears] = useState<string[]>([])
  const [facetTypes, setFacetTypes] = useState<string[]>([])
  const [facetFloorPlans, setFacetFloorPlans] = useState<string[]>([])
  const [facetBuildingYears, setFacetBuildingYears] = useState<string[]>([])
  const [facetStructures, setFacetStructures] = useState<string[]>([])
  const [facetDistricts, setFacetDistricts] = useState<string[]>([])
  const [loadingFacets, setLoadingFacets] = useState(false)

  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)

  const area = useMemo(() => pref || '', [pref])
  const city = useMemo(() => cityId || '', [cityId])
  const prefillPending = useRef(false)

  useEffect(() => {
    // apply prefill if provided
    if (prefill) {
      if (prefill.pref) setPref(prefill.pref)
      if (prefill.cityId) setCityId(prefill.cityId)
      if (prefill.district1) setFDistrict(prefill.district1)
      prefillPending.current = true
    }
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
  }, [prefill])

  // Restore last results from session on mount to avoid blank state on tab switch
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_DATA)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          setData(parsed)
        }
      }
      const rawState = sessionStorage.getItem(STORAGE_STATE)
      if (!prefill && rawState) {
        const s = JSON.parse(rawState)
        if (s && typeof s === 'object') {
          if (typeof s.fYear === 'string') setFYear(s.fYear)
          if (typeof s.fType === 'string') setFType(s.fType)
          if (typeof s.fFloorPlan === 'string') setFFloorPlan(s.fFloorPlan)
          if (typeof s.fBuildingYear === 'string') setFBuildingYear(s.fBuildingYear)
          if (typeof s.fStructure === 'string') setFStructure(s.fStructure)
          if (typeof s.fDistrict === 'string') setFDistrict(s.fDistrict)
          if (typeof s.size === 'number') setSize(s.size)
        }
      }
    } catch {
      // ignore cache errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When prefill changed underlying scope or district, trigger a fetch once
  useEffect(() => {
    if (prefillPending.current) {
      prefillPending.current = false
  setPage(0)
  fetchList({ page: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, pref, cityId, fDistrict])

  // Ensure initial auto-search on tab open
  useEffect(() => {
    // If we have prefill coming in, skip the default fetch to avoid flashing defaults
    const hasPrefill = !!(prefill && (prefill.pref || prefill.cityId))
  if (!hasPrefill) fetchList({ page: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // reset city when pref changes if current city doesn't match
    setCityId(prev => {
      if (typeof prev !== 'string') return ''
      if (!pref) return ''
      try {
        return prev.startsWith(pref) ? prev : ''
      } catch {
        return ''
      }
    })
  }, [pref])

  const fetchList = async (opts?: { page?: number; size?: number }) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
  if (area) { params.append('area', area) }
  if (city) { params.append('city', city) }
  if (station) { params.append('station', station) }
      // normalize year range
  // If a list-level Year filter is set, narrow the request to that single year
  const sy = parseInt((fYear || startYear || '0'), 10)
  const ey = parseInt((fYear || endYear || '0'), 10)
      const minY = Math.min(sy || 0, ey || 0)
      const maxY = Math.max(sy || 0, ey || 0)
  if (minY) { params.append('startYear', String(minY)) }
  if (maxY) { params.append('endYear', String(maxY)) }
  if (priceClassification) { params.append('priceClassification', priceClassification) }
  // Apply list-level filters server-side so pagination reflects filtered dataset
  // Apply list-level filters aligned to table
  if (fType) { params.append('type', fType) }
  if (fFloorPlan) { params.append('floorPlan', fFloorPlan) }
  if (fBuildingYear) { params.append('buildingYear', fBuildingYear) }
  if (fStructure) { params.append('structure', fStructure) }
  if (fDistrict) { params.append('districtName', fDistrict) }
  // Intentionally do NOT send list-level filters (year/quarter/pref/muni/district)
  // These are applied client-side within the current page of results.
  const effPage = opts?.page ?? page
  const effSize = opts?.size ?? size
  params.append('page', String(effPage))
  params.append('size', String(effSize))
  params.append('mode', 'SERVICE')
  const res = await fetch(`/api/mlit/prices/list?${params.toString()}`)
      const j: ListResponse = await res.json()
      setData(j)
      try {
        sessionStorage.setItem(STORAGE_DATA, JSON.stringify(j))
        sessionStorage.setItem(STORAGE_STATE, JSON.stringify({ fYear, fType, fFloorPlan, fBuildingYear, fStructure, fDistrict, size }))
      } catch {
        // ignore cache errors
      }
    } catch (e: any) {
      setError(e?.message ?? '검색 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, fYear, fType, fFloorPlan, fBuildingYear, fStructure, fDistrict])

  const fetchFacets = async () => {
    setLoadingFacets(true)
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
      if (priceClassification) params.append('priceClassification', String(priceClassification))
  params.append('mode', 'SERVICE')
  const res = await fetch(`/api/mlit/prices/facets?${params.toString()}`)
      const j = await res.json()
    setFacetYears((j?.years || []).map((v: any) => String(v)).sort((a: string,b: string)=>Number(b)-Number(a)))
  setFacetTypes((j?.types || []).map((v: any) => String(v)).sort((a: string,b: string)=>a.localeCompare(b)))
  setFacetFloorPlans((j?.floorPlans || []).map((v: any) => String(v)).sort((a: string,b: string)=>a.localeCompare(b)))
  setFacetBuildingYears((j?.buildingYears || []).map((v: any) => String(v)).sort((a: string,b: string)=>Number(b)-Number(a)))
  setFacetStructures((j?.structures || []).map((v: any) => String(v)).sort((a: string,b: string)=>a.localeCompare(b)))
  setFacetDistricts((j?.districts || []).map((v: any) => String(v)).sort((a: string,b: string)=>a.localeCompare(b)))
    } catch {
  setFacetYears([]); setFacetTypes([]); setFacetFloorPlans([]); setFacetBuildingYears([]); setFacetStructures([]); setFacetDistricts([])
    } finally {
      setLoadingFacets(false)
    }
  }

  // Refresh facets whenever scope changes (but not on page/size)
  useEffect(() => {
    fetchFacets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, cityId, station, startYear, endYear, priceClassification])

  const onSearch = () => { setPage(0); fetchList({ page: 0 }) }

  // Auto-refresh list when request-level inputs change (no need to click 검색)
  useEffect(() => {
    if (prefillPending.current) return
    setPage(0)
  fetchList({ page: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, cityId, station, startYear, endYear, priceClassification])

  // If any list-level filter changes, reset to first page to keep pagination consistent
  useEffect(() => {
    setPage(0)
  }, [fYear, fType, fFloorPlan, fBuildingYear, fStructure, fDistrict])

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

  // Client-side filtering to ensure visible rows honor current filters even if server returns a broader set
  const filteredItems = useMemo(() => {
    const items = data?.items || []
    return items.filter(it => {
      if (fYear && String(it.year) !== String(fYear)) return false
      if (fDistrict && String(it.districtName || '') !== String(fDistrict)) return false
      if (fType && String(it.type || '') !== String(fType)) return false
      if (fFloorPlan && String(it.floorPlan || '') !== String(fFloorPlan)) return false
      if (fBuildingYear && String(it.buildingYear || '') !== String(fBuildingYear)) return false
      if (fStructure && String(it.structure || '') !== String(fStructure)) return false
      return true
    })
  }, [data, fYear, fDistrict, fType, fFloorPlan, fBuildingYear, fStructure])

  const formatManYen = (v: unknown) => {
    if (v === null || v === undefined) return ''
    let n: number
    if (typeof v === 'string') {
      n = parseFloat(v)
    } else if (typeof v === 'number') {
      n = v
    } else {
      return ''
    }
    if (Number.isNaN(n)) return ''
    return Math.round(n / 10000).toLocaleString()
  }

  const formatManYenOneDecimal = (v: unknown) => {
    if (v === null || v === undefined) return ''
    let num: number
    if (typeof v === 'string') num = parseFloat(v)
    else if (typeof v === 'number') num = v
    else return ''
    if (!Number.isFinite(num)) return ''
    const man = num / 10000
    const floored = Math.floor(man * 10) / 10
    return floored.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }

  return (
    <div>
      <div className="max-w-full lg:max-w-[1440px] mx-auto bg-white rounded-xl shadow-md p-4 lg:p-6 mb-6">
        <div className="text-base lg:text-lg font-semibold mb-3">거래 검색</div>
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
                <option key={c.id} value={c.id}>{c.name}</option>
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

  <div className="max-w-full lg:max-w-[1440px] mx-auto bg-white rounded-xl shadow-md">
        <div className="p-4 lg:p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">총 {data?.total ?? 0}건</div>
            {data?.source && <div className="text-xs px-2 py-1 bg-gray-100 rounded">source: {data.source}</div>}
          </div>
          {/* List-level filters aligned to table */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label htmlFor="fYear" className="block text-xs text-gray-600 mb-1">연도</label>
              <select id="fYear" className="w-full border rounded px-2 py-1" value={fYear} onChange={e=>setFYear(e.target.value)}>
                <option value="">전체</option>
                {facetYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {loadingFacets && <div className="text-[10px] text-gray-500 mt-1">연도 로딩…</div>}
            </div>
            <div>
              <label htmlFor="fDistrict" className="block text-xs text-gray-600 mb-1">세부1</label>
              <select id="fDistrict" className="w-full border rounded px-2 py-1" value={fDistrict} onChange={e=>setFDistrict(e.target.value)}>
                <option value="">전체</option>
                {facetDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fType" className="block text-xs text-gray-600 mb-1">유형</label>
              <select id="fType" className="w-full border rounded px-2 py-1" value={fType} onChange={e=>setFType(e.target.value)}>
                <option value="">전체</option>
                {facetTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fFloorPlan" className="block text-xs text-gray-600 mb-1">평면</label>
              <select id="fFloorPlan" className="w-full border rounded px-2 py-1" value={fFloorPlan} onChange={e=>setFFloorPlan(e.target.value)}>
                <option value="">전체</option>
                {facetFloorPlans.map(fp => (
                  <option key={fp} value={fp}>{fp}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fBuildingYear" className="block text-xs text-gray-600 mb-1">건축연도</label>
              <select id="fBuildingYear" className="w-full border rounded px-2 py-1" value={fBuildingYear} onChange={e=>setFBuildingYear(e.target.value)}>
                <option value="">전체</option>
                {facetBuildingYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fStructure" className="block text-xs text-gray-600 mb-1">구조</label>
              <select id="fStructure" className="w-full border rounded px-2 py-1" value={fStructure} onChange={e=>setFStructure(e.target.value)}>
                <option value="">전체</option>
                {facetStructures.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
    <div className="mt-2 flex items-center gap-3">
  <button className="text-xs px-2 py-1 border rounded" onClick={()=>{ setFYear(''); setFDistrict(''); setFType(''); setFFloorPlan(''); setFBuildingYear(''); setFStructure(''); setPage(0); }}>필터 초기화</button>
      <div className="text-xs text-gray-600">표시 {filteredItems.length}건</div>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          {/* Desktop / Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">연도</th>
                  <th className="px-3 py-2 text-left">세부1</th>
                  <th className="px-3 py-2 text-left">유형</th>
                  <th className="px-3 py-2 text-right">거래가격(만엔)</th>
                  <th className="px-3 py-2 text-right">평단가(만엔)</th>
                  <th className="px-3 py-2 text-left">평면</th>
                  <th className="px-3 py-2 text-left">면적(토지/전용)</th>
                  <th className="px-3 py-2 text-left">건축연도</th>
                  <th className="px-3 py-2 text-left">구조</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">불러오는 중…</td></tr>
                )}
        {!loading && (filteredItems.length === 0) && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">결과가 없습니다</td></tr>
                )}
  {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>openDetail(item.id)}>
                    <td className="px-3 py-2">{item.year}</td>
                    <td className="px-3 py-2">{item.districtName}</td>
                    <td className="px-3 py-2">{item.type}</td>
                    <td className="px-3 py-2 text-right">{formatManYen(item.tradePrice)}</td>
        <td className="px-3 py-2 text-right">{item.exclusiveUnitPrice ? formatManYenOneDecimal(item.exclusiveUnitPrice) : ''}</td>
                    <td className="px-3 py-2">{item.floorPlan}</td>
                    <td className="px-3 py-2">{[item.landArea, item.exclusiveArea].filter(Boolean).join(' / ')}</td>
                    <td className="px-3 py-2">{item.buildingYear}</td>
                    <td className="px-3 py-2">{item.structure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {loading && <div className="text-center text-gray-500 py-6 text-sm">불러오는 중…</div>}
            {!loading && filteredItems.length === 0 && <div className="text-center text-gray-500 py-6 text-sm">결과가 없습니다</div>}
            {!loading && filteredItems.map(item => (
              <button key={item.id} onClick={()=>openDetail(item.id)} className="w-full text-left bg-gray-50 active:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{item.year}</span>
                  <span className="text-[10px] text-gray-400">{item.structure}</span>
                </div>
                <div className="font-semibold text-sm text-gray-800 truncate">{item.districtName || '-'} <span className="ml-1 text-[11px] font-normal text-gray-500">{item.type}</span></div>
                <div className="flex justify-between items-end gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500">거래가격(만)</span>
                    <span className="text-sm font-medium text-blue-600">{formatManYen(item.tradePrice)}</span>
                  </div>
                  {item.exclusiveUnitPrice && (
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-gray-500">평단가(만)</span>
                      <span className="text-xs font-medium text-emerald-600">{formatManYenOneDecimal(item.exclusiveUnitPrice)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-gray-500 flex gap-2 flex-wrap">
                  {item.floorPlan && <span>{item.floorPlan}</span>}
                  {item.buildingYear && <span>{item.buildingYear}</span>}
                  {item.landArea && <span>토지:{item.landArea}</span>}
                  {item.exclusiveArea && <span>전용:{item.exclusiveArea}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
  <div className="p-4 lg:p-6 border-t flex items-center justify-between">
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
