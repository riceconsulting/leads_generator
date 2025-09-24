import React from 'react';
import { DatabaseIcon, SunIcon, MoonIcon } from './icons';

interface HeaderProps {
  onOpenModal: () => void;
  savedLeadsCount: number;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenModal, savedLeadsCount, theme, toggleTheme }) => {
  return (
    <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-40 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <a 
            href="https://riceai.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center group"
          >
            <img 
              src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png" 
              alt="RICE AI Consulting Logo" 
              className="h-16 w-16 object-contain" 
            />
          </a>
          <h1 className="ml-4 text-xl sm:text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            RICE AI - Lead Generator
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <button 
              id="saved-leads-button"
              onClick={onOpenModal}
              className="relative px-4 py-2 bg-primary-light hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark transition-all duration-200 flex items-center"
            >
              <DatabaseIcon className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">View Saved Leads</span>
              {savedLeadsCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                  {savedLeadsCount}
                </span>
              )}
            </button>
            <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="h-10 w-10 flex items-center justify-center rounded-full bg-primary-light dark:bg-primary-dark text-white hover:brightness-95 dark:hover:brightness-95 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark"
            >
                {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" /> }
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;