import React, { useState, useEffect } from 'react';
import { LeadGenerationParams } from '../types';
import { SparklesIcon } from './icons';

interface LeadFormProps {
  onGenerate: (params: Omit<LeadGenerationParams, 'language'>) => void;
  isLoading: boolean;
  generationStatus: string;
  generationProgress: number;
  t: (key: string, ...args: any[]) => string;
}

const researchFocusOptions = [
    {
        category: "Business Strategy & Market Position",
        options: [
            { value: 'General Business SWOT Analysis', prompt: 'Perform a comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis of the company\'s overall business. Focus on market position, product/service offerings, and customer reviews. The results should be categorized and placed into the key strengths and weaknesses fields.' },
            { value: 'Recent Company News & Events', prompt: "Find recent news, press releases, or blog posts. Look for announcements about expansion, new products, funding rounds, or leadership changes that could be used as a conversation starter. Summarize in 'customResearchResults'." },
            { value: 'Key Competitor Analysis', prompt: 'Identify one or two key competitors and briefly analyze their strategy in comparison. Highlight areas where the target company is leading or lagging behind its competition in terms of products, marketing, or customer service.' },
            { value: 'Hiring Trends & Company Culture', prompt: 'Analyze recent job postings to understand hiring trends, company growth, and the technologies or skills they are investing in. This can provide clues about their internal strategy and culture.' },
        ]
    },
    {
        category: "Marketing & Sales Analysis",
        options: [
            { value: 'Online Presence & Digital Marketing', prompt: "Analyze the company's website and social media presence (e.g., LinkedIn, Facebook, Instagram). Evaluate their content quality, SEO, and user experience. Identify their digital marketing strategy and any technologies used." },
            { value: 'Customer Reviews & Reputation', prompt: "Analyze customer reviews on platforms like Google Maps, Yelp, or industry-specific sites. Summarize the company's public reputation, common praises, and frequent complaints." },
            { value: 'Sales Channels & Lead Generation', prompt: "Investigate how the company sells its products or services. Do they have a physical store, an e-commerce website, or a direct sales team? Analyze their lead capture forms and processes." },
        ]
    },
    {
        category: "Operations & Product/Service",
        options: [
            { value: 'Product/Service Offering Analysis', prompt: 'Analyze their main products or services. What are the key features and pricing? How do they compare to competitors? What is their unique selling proposition?' },
            { value: 'Supply Chain & Logistics', prompt: 'For companies dealing with physical goods, investigate their supply chain and logistics. Are there any mentions of suppliers, distribution centers, or shipping partners? Note any potential efficiencies or bottlenecks.' },
            { value: 'Technology & Infrastructure (General)', prompt: "Investigate the company's general technology stack. For e-commerce, what platform do they use? For services, are there mentions of specific software they use for operations? This is a general, non-intrusive look." },
        ]
    },
    {
        category: "Financial & Corporate Structure",
        options: [
            { value: 'Funding & Financial Health Indicators', prompt: "Look for public information about funding rounds, investors, or financial performance (if a public company). Note any signs of significant growth or financial distress." },
            { value: 'Corporate Structure & Key People', prompt: 'Identify the key leadership team beyond just one contact person. Understand the corporate structure and look for recent changes in management.' },
        ]
    },
];

const locationSuggestions = ['Jakarta, Indonesia', 'Bandung, Indonesia', 'Global', 'Singapore'];
const industrySuggestions = ['Manufacturing', 'Software & IT Services', 'E-commerce', 'Logistics', 'Restaurants & Cafes', 'Marketing Agency'];
const serviceSuggestions = ['IT Consulting Services', 'Digital Marketing Services', 'Custom Software Development', 'Cloud Infrastructure Solutions', 'Office Supplies', 'Logistics and Shipping Services'];

// --- Cookie Helper Functions ---
const setDailyCookie = (name: string, value: string) => {
    const date = new Date();
    // Set expiry to the end of the current day in the user's local timezone
    date.setHours(23, 59, 59, 999);
    document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};
// --- End Cookie Helper Functions ---

const LeadForm: React.FC<LeadFormProps> = ({ onGenerate, isLoading, generationStatus, generationProgress, t }) => {
  const [location, setLocation] = useState('Surabaya, Indonesia');
  const [keywords, setKeywords] = useState('Manufacturing');
  const [count, setCount] = useState(3);
  const [companyGrowthStage, setCompanyGrowthStage] = useState('Any');

  // Advanced Options State
  const [customResearchType, setCustomResearchType] = useState('General Business SWOT Analysis');
  const [customResearchText, setCustomResearchText] = useState('');
  const [serviceDescription, setServiceDescription] = useState('IT consulting services for business efficiency');
  const [senderName, setSenderName] = useState('');
  const [senderTitle, setSenderTitle] = useState('');
  const [itCompanyName, setItCompanyName] = useState('');
  const [itCompanyWebsite, setItCompanyWebsite] = useState('');
  const [itCompanyPhone, setItCompanyPhone] = useState('');
  const [itCompanyEmail, setItCompanyEmail] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');

  // Rate Limiting State
  const [generationCount, setGenerationCount] = useState(0);
  const RATE_LIMIT = 10;

  useEffect(() => {
    // Load the count from the daily cookie when the component mounts
    const savedCount = getCookie('generationCount');
    if (savedCount) {
      setGenerationCount(parseInt(savedCount, 10));
    }
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (generationCount >= RATE_LIMIT) {
        alert("You have reached your daily generation limit of 10. Please try again tomorrow.");
        return;
    }

    let customResearch = '';
    if (customResearchType === 'Other') {
        customResearch = customResearchText;
    } else {
        const allOptions = researchFocusOptions.flatMap(group => group.options);
        const selectedOption = allOptions.find(opt => opt.value === customResearchType);
        if (selectedOption) {
            customResearch = selectedOption.prompt;
        } else {
            // Default fallback if a selection somehow fails
            customResearch = 'Perform a comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis of the company\'s overall business.';
        }
    }

    const params = { 
        location, 
        keywords, 
        count, 
        companyGrowthStage,
        customResearch,
        customResearchFocus: customResearchType,
        serviceDescription,
        senderName,
        senderTitle,
        itCompanyName,
        itCompanyWebsite,
        itCompanyPhone,
        itCompanyEmail,
        emailTemplate,
        whatsappTemplate
    };

    onGenerate(params);

    // Increment count and save to daily cookie
    const newCount = generationCount + 1;
    setGenerationCount(newCount);
    setDailyCookie('generationCount', newCount.toString());
  };

  const formInputStyle = "w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark";
  const formLabelStyle = "block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1";
  const formDescriptionStyle = "mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark";
  const suggestionButtonStyle = "px-2 py-1 text-xs font-medium text-text-secondary-light dark:text-text-primary-dark bg-background-light dark:bg-border-dark border border-border-light dark:border-border-dark rounded-full hover:bg-border-light dark:hover:bg-surface-dark transition-colors";
  const generationsLeft = RATE_LIMIT - generationCount;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="target-location-input" className={formLabelStyle}>{t('targetLocation')}</label>
          <input type="text" id="target-location-input" value={location} onChange={(e) => setLocation(e.target.value)} className={formInputStyle} placeholder="e.g., San Francisco Bay Area" required />
          <div className="flex flex-wrap gap-2 mt-2">
            {locationSuggestions.map(suggestion => (
                <button
                    type="button"
                    key={suggestion}
                    onClick={() => setLocation(suggestion)}
                    className={suggestionButtonStyle}
                >
                    {suggestion}
                </button>
            ))}
          </div>
        </div>
        <div>
            <label htmlFor="industry-keywords-input" className={formLabelStyle}>{t('industryKeywords')}</label>
            <input type="text" id="industry-keywords-input" value={keywords} onChange={(e) => setKeywords(e.target.value)} className={formInputStyle} placeholder="e.g., E-commerce, Healthcare" required />
            <div className="flex flex-wrap gap-2 mt-2">
                {industrySuggestions.map(suggestion => (
                    <button
                        type="button"
                        key={suggestion}
                        onClick={() => setKeywords(suggestion)}
                        className={suggestionButtonStyle}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
        <div>
          <label htmlFor="growthStage" className={formLabelStyle}>{t('companyGrowthStage')}</label>
          <select id="growthStage" value={companyGrowthStage} onChange={(e) => setCompanyGrowthStage(e.target.value)} className={formInputStyle}>
            <option value="Any">{t('any')}</option>
            <option value="Small">{t('small')}</option>
            <option value="Medium">{t('medium')}</option>
            <option value="Large">{t('large')}</option>
            <option value="Enterprise">{t('enterprise')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="count" className={formLabelStyle}>{t('numberOfBusinesses')}</label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className={formInputStyle}>
            <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
          </select>
        </div>
      </div>
      
      {/* Custom Research Focus */}
      <div className="pt-2">
        <label htmlFor="customResearchType" className={formLabelStyle}>{t('customResearchFocus')}</label>
        <select id="customResearchType" value={customResearchType} onChange={(e) => setCustomResearchType(e.target.value)} className={formInputStyle}>
          {researchFocusOptions.map(group => (
              <optgroup label={group.category} key={group.category}>
                  {group.options.map(option => (
                      <option key={option.value} value={option.value}>{option.value}</option>
                  ))}
              </optgroup>
          ))}
          <option value="Other">{t('other')}</option>
        </select>
        <p className={formDescriptionStyle}>{t('customResearchDescription')}</p>
      </div>

      {customResearchType === 'Other' && (
        <div>
          <label htmlFor="customResearchText" className={formLabelStyle}>{t('customResearchPoint')}</label>
          <textarea id="customResearchText" value={customResearchText} onChange={(e) => setCustomResearchText(e.target.value)} className={formInputStyle} rows={2} placeholder="e.g., 'What CRM do they use?' or 'Recent company news for a conversation starter'"></textarea>
        </div>
      )}

      {/* Service / Product Offered */}
      <div className="pt-2">
        <label htmlFor="service-description-input" className={formLabelStyle}>{t('serviceOffered')}</label>
        <input 
          type="text" 
          id="service-description-input" 
          value={serviceDescription} 
          onChange={(e) => setServiceDescription(e.target.value)} 
          className={formInputStyle} 
          placeholder="e.g., High-performance web development" 
          required 
        />
         <p className={formDescriptionStyle}>{t('serviceOfferedDescription')}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {serviceSuggestions.map(suggestion => (
              <button
                  type="button"
                  key={suggestion}
                  onClick={() => setServiceDescription(suggestion)}
                  className={suggestionButtonStyle}
              >
                  {suggestion}
              </button>
          ))}
        </div>
      </div>

      {/* Advanced Options Collapsible */}
      <details className="pt-2">
        <summary className="cursor-pointer text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:underline">
          {t('advancedOptions')}
        </summary>
        <div className="mt-4 p-4 space-y-4 bg-background-light dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="senderName" className={formLabelStyle}>{t('senderName')}</label>
                  <input type="text" id="senderName" value={senderName} onChange={(e) => setSenderName(e.target.value)} className={formInputStyle} placeholder="e.g., John Doe" />
              </div>
              <div>
                  <label htmlFor="senderTitle" className={formLabelStyle}>{t('senderTitle')}</label>
                  <input type="text" id="senderTitle" value={senderTitle} onChange={(e) => setSenderTitle(e.target.value)} className={formInputStyle} placeholder="e.g., Business Development Manager" />
              </div>
              <div>
                  <label htmlFor="itCompanyName" className={formLabelStyle}>{t('yourCompanyName')}</label>
                  <input type="text" id="itCompanyName" value={itCompanyName} onChange={(e) => setItCompanyName(e.target.value)} className={formInputStyle} placeholder="e.g., Tech Solutions Inc." />
              </div>
              <div>
                  <label htmlFor="itCompanyEmail" className={formLabelStyle}>{t('yourCompanyEmail')}</label>
                  <input type="email" id="itCompanyEmail" value={itCompanyEmail} onChange={(e) => setItCompanyEmail(e.target.value)} className={formInputStyle} placeholder="e.g., contact@techsolutions.com" />
              </div>
              <div>
                  <label htmlFor="itCompanyWebsite" className={formLabelStyle}>{t('yourCompanyWebsite')}</label>
                  <input type="url" id="itCompanyWebsite" value={itCompanyWebsite} onChange={(e) => setItCompanyWebsite(e.target.value)} className={formInputStyle} placeholder="e.g., https://techsolutions.com" />
              </div>
              <div>
                  <label htmlFor="itCompanyPhone" className={formLabelStyle}>{t('yourCompanyPhone')}</label>
                  <input type="tel" id="itCompanyPhone" value={itCompanyPhone} onChange={(e) => setItCompanyPhone(e.target.value)} className={formInputStyle} placeholder="e.g., +6212345678" />
              </div>
          </div>

          <div>
              <label htmlFor="emailTemplate" className={formLabelStyle}>{t('emailMessageTemplate')} <span className="text-slate-400">({t('optional')})</span></label>
              <textarea id="emailTemplate" value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} className={formInputStyle} rows={4} placeholder="e.g., Hi {{contactPerson.name}}, I saw that {{businessName}} might need help with {{keyWeaknessesIT[0]}}. Let's connect."></textarea>
              <p className={formDescriptionStyle}>{t('emailTemplatePlaceholder')}</p>
          </div>
          <div>
              <label htmlFor="whatsappTemplate" className={formLabelStyle}>{t('whatsappMessageTemplate')} <span className="text-slate-400">({t('optional')})</span></label>
              <textarea id="whatsappTemplate" value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)} className={formInputStyle} rows={2} placeholder="e.g., Hi {{contactPerson.name}}, I saw an opportunity to improve the website for {{businessName}}. Quick chat?"></textarea>
                <p className={formDescriptionStyle}>{t('whatsappTemplatePlaceholder')}</p>
          </div>

        </div>
      </details>
      
      {/* Submit Button */}
      <div className="pt-2">
        <button
          id="generate-leads-button"
          type="submit"
          disabled={isLoading || generationCount >= RATE_LIMIT}
          className="relative w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-light to-accent-light dark:from-primary-dark dark:to-accent-dark text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden active:scale-[0.98] transform-gpu"
        >
          {/* Progress bar background */}
          <span 
            className="absolute top-0 left-0 h-full bg-black/20 dark:bg-white/20 transition-all duration-500 ease-out"
            style={{ width: `${isLoading ? generationProgress : 0}%` }}
          />
          {/* Button Content */}
          <span className="relative z-10 flex items-center justify-center">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {generationStatus || t('generating')}
              </>
            ) : generationCount >= RATE_LIMIT ? (
               t('dailyLimitReached')
            ) : (
              <>
                <SparklesIcon className="h-5 w-5 mr-2" />
                {t('generateLeads')}
              </>
            )}
          </span>
        </button>
        <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
            {generationsLeft > 0 ? t('generationsRemaining', generationsLeft) : t('noGenerationsRemaining')}
        </p>
      </div>
    </form>
  );
};

export default LeadForm;
