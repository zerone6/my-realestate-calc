export type ListItem = {
  id: number
  year: string
  quarter: string
  priceClassification?: string
  priceClassificationLabel?: string
  prefecture: string
  municipality: string
  districtName: string
  // new fields for expanded table
  type?: string
  tradePrice?: string | number
  floorPlan?: string
  landArea?: string | number
  exclusiveArea?: string | number
  buildingYear?: string
  structure?: string
}

export type ListResponse = {
  status: string
  source: string
  page: number
  size: number
  total: number
  items: ListItem[]
}

export type MuniGrouped = Record<string, Array<{ id: string; name: string }>>
