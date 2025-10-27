import React from 'react';
import { VSCodeProvider } from './contexts/VSCodeContext';
import { AppRouter } from './router';

const App: React.FC = () => {
  return (
    <VSCodeProvider>
      <AppRouter />
    </VSCodeProvider>
  );
};

export default App;
