export interface FieldDescription {
    label: string;
    description: string;
}

export const fieldDescriptions: Record<string, FieldDescription> = {
    // 물건 정보 블럭
    name: {
        label: "물건 이름",
        description: "부동산 투자 대상 물건의 이름을 입력하세요. 예: 아파트명, 빌딩명 등"
    },
    price: {
        label: "매입가",
        description: "부동산을 매입할 때 지불하는 가격을 만엔 단위로 입력하세요. 토지와 건물을 포함한 총 매입 가격입니다."
    },
    grossYield: {
        label: "表面利回り",
        description: "연간 임대 수익을 총 매입 비용으로 나눈 비율입니다. 투자 수익성을 판단하는 중요한 지표입니다."
    },
    structure: {
        label: "구조",
        description: "건물의 구조를 선택하세요. 구조에 따라 내용연수(감가상각 기간)가 달라집니다."
    },
    buildingAge: {
        label: "築年数",
        description: "건물이 완성된 후 경과한 연수입니다. 선택한 구조의 내용연수를 초과할 수 없습니다."
    },
    buildingArea: {
        label: "建物面積",
        description: "건물의 총 면적을 제곱미터(m²) 단위로 입력하세요."
    },
    ownCapital: {
        label: "자기자금",
        description: "매입에 사용할 자신의 자금을 만엔 단위로 입력하세요. 대출 금액은 총매입비용에서 자기자금을 뺀 금액으로 자동 계산됩니다."
    },
    buildingPrice: {
        label: "건물가격",
        description: "건물 부분의 가격을 만엔 단위로 입력하세요. 토지가격과 구분하여 감가상각 계산에 사용됩니다."
    },
    occupancyRate: {
        label: "입주율",
        description: "실제 임차인이 입주하고 있는 비율을 백분율로 입력하세요. 수익 계산에 영향을 미칩니다."
    },

    // 대출 정보 블럭
    rate: {
        label: "금리",
        description: "대출 금리를 연간 백분율로 입력하세요. 예: 1.5%"
    },
    term: {
        label: "대출 기간",
        description: "대출 상환 기간을 년 단위로 입력하세요. 최대 35년까지 가능합니다."
    },
    startDate: {
        label: "대출 시작일",
        description: "대출이 시작되는 날짜를 선택하세요. 오늘 이후의 날짜만 선택 가능합니다."
    },
    loanAmount: {
        label: "대출 금액",
        description: "총매입비용에서 자기자금을 뺀 금액으로 자동 계산됩니다. 대출 상환 계획의 기준이 됩니다."
    },

    // 수익 및 유지비 블럭
    rent: {
        label: "월세 수익",
        description: "월별 임대료 수익을 엔 단위로 입력하세요. 연간 수익 계산의 기준이 됩니다."
    },
    rentFixedPeriod: {
        label: "월세 고정 기간",
        description: "초기 월세를 유지하는 기간을 년 단위로 선택하세요. 이 기간 동안은 월세가 변경되지 않습니다."
    },
    rentAdjustmentInterval: {
        label: "월세 조정 시기",
        description: "월세 고정 기간 이후, 월세를 조정하는 주기를 년 단위로 선택하세요. 예: 2년이면 2년마다 월세가 조정됩니다."
    },
    rentAdjustmentRate: {
        label: "월세 조정 비율",
        description: "월세 조정 시기마다 월세를 낮출 비율을 백분율로 입력하세요. 예: 5%면 매 조정 시기마다 월세가 5%씩 감소합니다."
    },
    propertyTax: {
        label: "고정자산세+도시계획세",
        description: "부동산에 대한 고정자산세와 도시계획세를 만엔 단위로 입력하세요. 연간 세금 비용입니다."
    },
    managementFeeRate: {
        label: "관리비 비율",
        description: "연간 임대료 수익 대비 관리비 비율을 백분율로 입력하세요. 관리비를 입력하면 자동으로 계산됩니다."
    },
    managementFee: {
        label: "관리비",
        description: "연간 관리비를 만엔 단위로 입력하세요. 관리비 비율을 입력하면 자동으로 계산됩니다."
    },
    repairCost: {
        label: "수선비",
        description: "연간 수선비를 만엔 단위로 입력하세요. 건물 유지보수에 필요한 비용입니다."
    },
    repairCostRate: {
        label: "수선비 비율",
        description: "연간 임대료 수익 대비 수선비 비율을 백분율로 입력하세요. 수선비를 입력하면 자동으로 계산됩니다."
    },
    otherExpenses: {
        label: "기타경비",
        description: "연간 기타 경비를 만엔 단위로 입력하세요. 기타 운영에 필요한 비용입니다."
    },
    otherExpensesRate: {
        label: "기타경비 비율",
        description: "연간 임대료 수익 대비 기타경비 비율을 백분율로 입력하세요. 기타경비를 입력하면 자동으로 계산됩니다."
    }
}; 