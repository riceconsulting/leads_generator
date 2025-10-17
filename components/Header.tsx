import React from 'react';
import { DatabaseIcon, SunIcon, MoonIcon } from './icons';

interface HeaderProps {
  onOpenModal: () => void;
  savedLeadsCount: number;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: 'en' | 'id';
  setLanguage: (lang: 'en' | 'id') => void;
  t: (key: string) => string;
}

const Header: React.FC<HeaderProps> = ({ onOpenModal, savedLeadsCount, theme, toggleTheme, language, setLanguage, t }) => {
  return (
    <header className="bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-lg border-b border-border-light dark:border-border-dark sticky top-0 z-40 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo and Branding */}
          <div className="flex items-center">
              <a 
                href="https://riceai.net" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-shrink-0 flex items-center space-x-3 group"
              >
                <img 
                  src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png" 
                  alt="RICE AI Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain transition-transform group-hover:scale-105" 
                />
                <div className="flex flex-col leading-tight">
                    <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                        RICE AI
                    </h1>
                    <p className="font-sans text-xs sm:text-sm text-accent-light dark:text-accent-dark tracking-wide opacity-90">
                        Leads Generator
                    </p>
                </div>
              </a>
          </div>

          {/* Right side: Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
              <button 
                id="saved-leads-button"
                onClick={onOpenModal}
                className="relative px-4 py-2 bg-primary-light hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark transition-all duration-200 flex items-center"
              >
                <DatabaseIcon className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">{t('savedLeads')}</span>
                {savedLeadsCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                    {savedLeadsCount}
                  </span>
                )}
              </button>
              <button
                  onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
                  aria-label="Toggle language"
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-primary-light dark:bg-primary-dark text-white font-bold text-sm hover:brightness-95 dark:hover:brightness-95 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark"
              >
                  {language.toUpperCase()}
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
      </div>
    </header>
  );
};

export default Header;
