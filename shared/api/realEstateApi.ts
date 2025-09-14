import { CalculationRequest, CalculationResult, FormInputData } from '../types/RealEstateForm'

// 환경에 따른 API 베이스 URL 설정
function determineApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080/api'
  }
  
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1'
  
  return isLocalhost ? 'http://localhost:8080/api' : '/api'
}

const API_BASE_URL = determineApiBaseUrl()

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
            if (response.status === 401) {
                // 401이면 전역 이벤트 발생 -> UI가 로그인 모달 열기
                window.dispatchEvent(new CustomEvent('auth:login-required', { detail: { endpoint } }))
            }
            throw new ApiError(
                `API request failed: ${response.status} ${response.statusText}`,
                response.status,
                response
            )
        }

        // No content
        if (response.status === 204) return undefined as unknown as T
        const contentType = response.headers.get('Content-Type') || ''
        if (!contentType.includes('application/json')) {
            return undefined as unknown as T
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
    // request.expense carries total annual expenses; nonReserveExpense/reserveExpense split is used when available
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

/**
 * 사용자 데이터 저장
 */
export async function saveData(userId: string, data: { name: string; form: FormInputData }[]): Promise<void> {
    return apiRequest<void>(`/storage/save?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 사용자 데이터 불러오기
 */
export async function loadData(userId: string): Promise<{ name: string; form: FormInputData }[]> {
    return apiRequest<{ name: string; form: FormInputData }[]>(`/storage/load?userId=${encodeURIComponent(userId)}`);
}

/**
 * 회원가입 (간단 저장)
 */
export async function signUp(id: string, password: string): Promise<void> {
    await apiRequest<void>(`/auth/signup`, {
        method: 'POST',
        body: JSON.stringify({ id, password })
    });
}
