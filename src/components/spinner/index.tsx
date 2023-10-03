// SpinnerLoader.tsx
import React from 'react';

const SpinnerLoader: React.FC = () => {
  return (
    <div className="z-10 fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-primary"></div>
    </div>
  );
}

export default SpinnerLoader;
