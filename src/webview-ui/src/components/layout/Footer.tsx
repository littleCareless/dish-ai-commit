import React from 'react';
import { useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const location = useLocation();
  
  // 某些页面不显示底部
  const hideFooter = [
    '/onboarding',
    '/vscode-test',
  ].includes(location.pathname);

  if (hideFooter) {
    return null;
  }

  return (
    <footer className="bg-card border-t border-border px-4 py-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Dish AI Commit Gen</span>
          <span>•</span>
          <span>v1.0.0</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span>Powered by AI</span>
          <span>•</span>
          <span>VS Code Extension</span>
        </div>
      </div>
    </footer>
  );
};
