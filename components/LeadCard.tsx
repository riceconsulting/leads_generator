import React, { useState } from 'react';
import { BusinessLead } from '../types';
import { BuildingIcon, MailIcon, PhoneIcon, GlobeIcon, CheckCircleIcon, XCircleIcon, MessageSquareIcon, SaveIcon, UserIcon, FileTextIcon, ChevronDownIcon } from './icons';
import CopyButton from './CopyButton';

interface LeadCardProps {
  lead: BusinessLead;
  isSaved: boolean;
  t: (key: string) => string;
}

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; isLink?: boolean; href?: string }> = ({ icon, label, value, isLink, href }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 h-6 w-6 text-text-secondary-dark">{icon}</div>
        <div className="ml-3">
            <dt className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{label}</dt>
            <dd className="mt-1 text-sm text-text-primary-light dark:text-text-primary-dark break-words">
                {isLink ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-light dark:text-accent-dark hover:underline">{value}</a> : value}
            </dd>
        </div>
    </div>
);

const CollapsibleList: React.FC<{ items: string[] }> = ({ items }) => {
    const [isListExpanded, setIsListExpanded] = useState(false);
  
    if (items.length === 0) {
      return <>Not Found</>;
    }
  
    if (items.length === 1) {
      return <>{items[0]}</>;
    }
  
    if (isListExpanded) {
      return (
        <div className="flex flex-col items-start">
          <div className="space-y-1">
            {items.map((item, index) => <div key={index}>{item}</div>)}
          </div>
          <button 
            onClick={() => setIsListExpanded(false)} 
            className="text-xs text-accent-light dark:text-accent-dark hover:underline mt-1 focus:outline-none font-medium"
            aria-label="Show less contact information"
          >
            Show less
          </button>
        </div>
      );
    }
  
    return (
      <div className="flex items-center flex-wrap">
        <span>{items[0]}</span>
        <button 
          onClick={() => setIsListExpanded(true)} 
          className="ml-2 text-xs text-accent-light dark:text-accent-dark hover:underline whitespace-nowrap focus:outline-none font-medium"
          aria-label={`Show ${items.length - 1} more contact entries`}
        >
          (...and {items.length - 1} more)
        </button>
      </div>
    );
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, isSaved, t }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contact = lead.contactPerson;
  // Ensure contactEmail and contactPhone are always arrays to prevent .join() errors
  const emails = Array.isArray(lead.contactEmail) ? lead.contactEmail : (lead.contactEmail ? [String(lead.contactEmail)] : []);
  const phones = Array.isArray(lead.contactPhone) ? lead.contactPhone : (lead.contactPhone ? [String(lead.contactPhone)] : []);
  
  const fullEmailText = `Subject: ${lead.draftEmail.subject || ''}\n\n${lead.draftEmail.body || ''}`;


  const ResearchFindings = () => {
    const hasStrengths = lead.keyStrengthsIT && lead.keyStrengthsIT.length > 0;
    const hasWeaknesses = lead.keyWeaknessesIT && lead.keyWeaknessesIT.length > 0;
    const hasCustomResults = lead.customResearchResults && lead.customResearchResults.trim() !== '' && lead.customResearchResults.toLowerCase() !== 'not found';

    if (!hasStrengths && !hasWeaknesses && !hasCustomResults) {
        return null;
    }

    const genericTitles = ['IT Weaknesses/Opportunities', 'IT Strengths', 'Other'];
    const focusTitle = (lead.customResearchFocus && !genericTitles.includes(lead.customResearchFocus))
        ? `Research: ${lead.customResearchFocus}`
        : 'Research & Analysis';

    return (
        <div className="mt-6 border-t border-border-light dark:border-border-dark pt-4">
            <h4 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center">
                <FileTextIcon className="h-5 w-5 mr-2 text-primary-light dark:text-primary-dark" />
                {focusTitle}
            </h4>
            
            {hasCustomResults && (
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">{lead.customResearchResults}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasStrengths && (
                    <div>
                        <h5 className="font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center">
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                            Positive Findings
                        </h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            {lead.keyStrengthsIT.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}
                {hasWeaknesses && (
                       <div>
                        <h5 className="font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center">
                            <XCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                            Opportunities for Improvement
                        </h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            {lead.keyWeaknessesIT.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4 mb-4">
                <div className="flex-shrink-0">
                    <span className="h-12 w-12 rounded-full bg-primary-light/20 dark:bg-primary-dark/20 flex items-center justify-center">
                        <BuildingIcon className="h-6 w-6 text-primary-light dark:text-primary-dark" />
                    </span>
                </div>
                <div>
                    <h3 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">{lead.businessName}</h3>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{lead.companySizeCategory} ({lead.inferredPrimaryLanguage})</p>
                </div>
            </div>
            <div
                className="px-4 py-2 text-sm font-medium rounded-md flex items-center"
            >
                {isSaved ? (
                    <>
                        <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-text-primary-light dark:text-text-primary-dark">{t('saved')}</span>
                    </>
                ) : (
                    <>
                        <SaveIcon className="h-4 w-4 mr-2 animate-spin" />
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">{t('saving')}</span>
                    </>
                )}
            </div>
        </div>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{lead.companyDescription}</p>
      </div>

      {/* Collapsible Section */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 border-t border-border-light dark:border-border-dark">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 pt-6">
                <InfoItem icon={<GlobeIcon />} label="Website" value={lead.officialWebsite} isLink={true} href={lead.officialWebsite}/>
                <InfoItem 
                    icon={<UserIcon />} 
                    label="Key Contact" 
                    value={contact && contact.name !== 'Not Found' ? `${contact.name} (${contact.title})` : 'Not Found'} 
                />
                <InfoItem icon={<MailIcon />} label="Contact Emails" value={<CollapsibleList items={emails} />} />
                <InfoItem icon={<PhoneIcon />} label="Contact Phones" value={<CollapsibleList items={phones} />} />
                <InfoItem icon={<MessageSquareIcon />} label="WhatsApp Number" value={lead.contactWhatsApp || 'Not Found'} />
                <InfoItem icon={<BuildingIcon />} label="Est. Employees" value={lead.estimatedEmployeeCount} />
            </dl>
            <ResearchFindings />
        </div>
        
        <div className="bg-background-light dark:bg-surface-dark/50 p-6 space-y-6">
          {/* Email Draft */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-heading font-semibold text-text-primary-light dark:text-text-primary-dark flex items-center">
                    <MailIcon className="h-5 w-5 mr-2" />
                    Draft Email ({lead.draftEmail.tone})
                </h4>
                <CopyButton textToCopy={fullEmailText} t={t} />
            </div>
            <div className="p-4 bg-surface-light dark:bg-border-dark rounded-lg border border-border-light dark:border-border-dark text-sm">
                <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">Subject: {lead.draftEmail.subject}</p>
                <hr className="my-2 border-border-light dark:border-border-dark" />
                <p className="whitespace-pre-wrap text-text-secondary-light dark:text-text-secondary-dark">{lead.draftEmail.body}</p>
            </div>
          </div>

          {/* WhatsApp Draft */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-heading font-semibold text-text-primary-light dark:text-text-primary-dark flex items-center">
                    <MessageSquareIcon className="h-5 w-5 mr-2" />
                    Draft WhatsApp ({lead.draftWhatsApp.tone})
                </h4>
                <CopyButton textToCopy={lead.draftWhatsApp.body} t={t} />
            </div>
              <div className="p-4 bg-surface-light dark:bg-border-dark rounded-lg border border-border-light dark:border-border-dark text-sm">
                <p className="whitespace-pre-wrap text-text-secondary-light dark:text-text-secondary-dark">{lead.draftWhatsApp.body}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toggle Button in the footer of the card */}
      <div className="border-t border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 px-6 py-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-center items-center text-sm font-semibold text-accent-light dark:text-accent-dark hover:underline focus:outline-none focus:ring-2 focus:ring-primary-light rounded">
                <span>{isExpanded ? t('showLess') : t('viewFullDetails')}</span>
                <ChevronDownIcon className={`h-5 w-5 ml-2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
      </div>
    </div>
  );
};

export default LeadCard;