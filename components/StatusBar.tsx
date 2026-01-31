
import React, { useState, useEffect } from 'react';

const StatusBar: React.FC = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center px-6 py-3 bg-white/80 ios-blur sticky top-0 z-50 text-[13px] font-semibold text-black">
      <div className="flex items-center space-x-1">
        <span>{time}</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z" fillOpacity=".3"/>
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M3.53 10.95l8.46 10.54.01.01.01-.01 8.46-10.54C20.04 10.62 16.81 8 12 8c-4.81 0-8.04 2.62-8.47 2.95z"/>
        </svg>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 22h20V2L2 22z" fillOpacity=".3"/>
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M17 7L2 22h15V7z"/>
        </svg>
        <div className="flex items-center border border-black/20 rounded-sm px-0.5 h-3 w-6 relative">
          <div className="bg-black h-full w-[80%] rounded-sm"></div>
          <div className="absolute -right-1 w-0.5 h-1 bg-black/40 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
