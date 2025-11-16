import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import CalculatorApp from './components/CalculatorApp'
import Header from './components/Header'
import ApiTestPage from './components/ApiTestPage'
import TradeSearchPage from './components/TradeSearchPage'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <Router basename="/realestate">
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
  <Route path="/calculator" element={<ErrorBoundary><CalculatorApp /></ErrorBoundary>} />
  <Route path="/api-test" element={<ApiTestPage />} />
  <Route path="/trade-search" element={<TradeSearchPage />} />
      </Routes>
    </Router>
  )
}

export default App
