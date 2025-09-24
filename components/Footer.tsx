import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-sm shadow-lg z-50 border-t border-border-light dark:border-border-dark">
      <div className="container mx-auto px-4 md:px-8 py-3">
        <div className="flex flex-col sm:flex-row justify-center items-center text-center sm:text-left">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2 sm:mb-0 sm:mr-4">
            Need a custom solution or more leads?
          </p>
          <a
            href="https://api.whatsapp.com/send/?phone=6285330168811&text=Hi%2C+let%27s+schedule+a+time+to+discuss+the+RICE+AI+lead+generator+solution.+I%27m+ready+to+see+how+it+can+help+our+business%21&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary-light hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark transition-colors duration-200"
          >
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;