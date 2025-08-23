import AuthButtons from './AuthButtons';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const isCalculator = location.pathname.startsWith('/calculator');
  const outerBase = 'w-full h-10 px-4 lg:px-6 flex items-center';
  const outerClass = isCalculator
    ? `${outerBase} lg:ml-64 lg:w-[calc(100%-16rem)]`
    : outerBase;
  const innerClass = isCalculator
    ? 'w-full flex justify-end items-center'
    : 'w-full max-w-4xl mx-auto flex justify-between items-center';
  return (
  isCalculator ? null : (
  <header className="absolute top-0 left-0 right-0 bg-transparent">
      <div className={outerClass}>
        <div className={innerClass}>
          {!isCalculator && (
            <div className="flex items-center gap-4">
              <div className="text-lg lg:text-xl font-bold text-gray-800 leading-none">My Real Estate</div>
              <nav className="hidden sm:flex items-center gap-3 text-sm">
                <Link to="/" className={`px-2 py-1 rounded ${location.pathname==='/' ? 'text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900'}`}>홈</Link>
                <Link to="/calculator" className={`px-2 py-1 rounded ${location.pathname.startsWith('/calculator') ? 'text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900'}`}>시세 동향</Link>
                <Link to="/api-test" className={`px-2 py-1 rounded ${location.pathname.startsWith('/api-test') ? 'text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900'}`}>API 테스트</Link>
              </nav>
            </div>
          )}
          <AuthButtons />
        </div>
      </div>
    </header>
  )
  );
};

export default Header;
