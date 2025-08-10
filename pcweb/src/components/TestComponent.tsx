export default function TestComponent() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      border: '2px solid #333',
      margin: '20px',
      borderRadius: '8px'
    }}>
      <h1 style={{ color: '#333' }}>테스트 컴포넌트</h1>
      <p>React가 정상적으로 작동하고 있습니다!</p>
      <button 
        onClick={() => alert('버튼이 클릭되었습니다!')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        클릭 테스트
      </button>
    </div>
  )
}
