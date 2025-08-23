import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import CalculatorApp from './components/CalculatorApp'
import Header from './components/Header'
import ApiTestPage from './components/ApiTestPage'

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calculator" element={<CalculatorApp />} />
  <Route path="/api-test" element={<ApiTestPage />} />
      </Routes>
    </Router>
  )
}

export default App
