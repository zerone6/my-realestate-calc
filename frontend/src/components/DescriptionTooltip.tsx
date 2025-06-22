interface DescriptionTooltipProps {
    isVisible: boolean;
    description: string;
    position: { x: number; y: number };
    onClose: () => void;
}

export default function DescriptionTooltip({
    isVisible,
    description,
    position,
    onClose
}: DescriptionTooltipProps) {
    if (!isVisible) return null;

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* 툴팁 박스 */}
            <div
                className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    transform: 'translate(-50%, -100%)',
                    marginTop: '-10px'
                }}
            >
                {/* 화살표 */}
                <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"
                />

                {/* 내용 */}
                <div className="text-sm text-gray-700 leading-relaxed">
                    {description}
                </div>

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="닫기"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </>
    );
} 