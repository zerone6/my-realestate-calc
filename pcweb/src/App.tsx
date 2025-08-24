import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import CalculatorApp from './components/CalculatorApp'
import Header from './components/Header'
import ApiTestPage from './components/ApiTestPage'
import TradeSearchPage from './components/TradeSearchPage'

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calculator" element={<CalculatorApp />} />
  <Route path="/api-test" element={<ApiTestPage />} />
  <Route path="/trade-search" element={<TradeSearchPage />} />
      </Routes>
    </Router>
  )
}

export default App
