import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import CalculatorApp from './components/CalculatorApp'
import Header from './components/Header'

function App() {
  return (
    <Router basename="/realestate">
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calculator" element={<CalculatorApp />} />
      </Routes>
    </Router>
  )
}

export default App
