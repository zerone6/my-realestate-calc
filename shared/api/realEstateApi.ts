import { CalculationRequest, CalculationResult } from '../types/RealEstateForm'

const API_BASE_URL = 'http://localhost:8080/api'

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public response?: Response
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * API 요청을 보내는 기본 함수
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const config: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    }

    try {
        const response = await fetch(url, config)

        if (!response.ok) {
            throw new ApiError(
                `API request failed: ${response.status} ${response.statusText}`,
                response.status,
                response
            )
        }

        const data = await response.json()
        return data
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        
        // 네트워크 에러 등
        throw new ApiError(
            `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

/**
 * 부동산 계산 API 호출
 */
export async function calculateRealEstate(
    request: CalculationRequest
): Promise<CalculationResult> {
    return apiRequest<CalculationResult>('/calculation/calculate', {
        method: 'POST',
        body: JSON.stringify(request),
    })
}

/**
 * 서버 상태 확인
 */
export async function checkServerHealth(): Promise<{ status: string }> {
    return apiRequest<{ status: string }>('/calculation/health')
}

/**
 * API 베이스 URL 반환 (테스트용)
 */
export function getApiBaseUrl(): string {
    return API_BASE_URL
}
