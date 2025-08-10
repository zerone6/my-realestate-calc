import AuthButtons from './AuthButtons';
import { useLocation } from 'react-router-dom';

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
            <div className="text-lg lg:text-xl font-bold text-gray-800 leading-none">My Real Estate</div>
          )}
          <AuthButtons />
        </div>
      </div>
    </header>
  )
  );
};

export default Header;
