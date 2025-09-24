import React from 'react';
import { BusinessLead } from '../types';
import { BuildingIcon, MailIcon, PhoneIcon, GlobeIcon, CheckCircleIcon, XCircleIcon, MessageSquareIcon, SaveIcon, UserIcon, FileTextIcon } from './icons';

interface LeadCardProps {
  lead: BusinessLead;
  onSave: (lead: BusinessLead) => void;
  isSaved: boolean;
  isTutorialCard?: boolean;
}

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; isLink?: boolean; href?: string }> = ({ icon, label, value, isLink, href }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 h-6 w-6 text-text-secondary-dark">{icon}</div>
        <div className="ml-3">
            <dt className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{label}</dt>
            <dd className="mt-1 text-sm text-text-primary-light dark:text-text-primary-dark break-words">
                {isLink ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-dark hover:underline dark:text-primary-light">{value}</a> : value}
            </dd>
        </div>
    </div>
);

const LeadCard: React.FC<LeadCardProps> = ({ lead, onSave, isSaved, isTutorialCard }) => {
  const contact = lead.contactPerson;
  // Ensure contactEmail and contactPhone are always arrays to prevent .join() errors
  const emails = Array.isArray(lead.contactEmail) ? lead.contactEmail : (lead.contactEmail ? [String(lead.contactEmail)] : []);
  const phones = Array.isArray(lead.contactPhone) ? lead.contactPhone : (lead.contactPhone ? [String(lead.contactPhone)] : []);


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
            <h4 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center">
                <FileTextIcon className="h-5 w-5 mr-2 text-primary-light dark:text-primary-dark" />
                {focusTitle}
            </h4>
            
            {hasCustomResults && (
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">{lead.customResearchResults}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasStrengths && (
                    <div>
                        <h5 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center">
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
                        <h5 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center">
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
                    <h3 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{lead.businessName}</h3>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{lead.companySizeCategory} ({lead.inferredPrimaryLanguage})</p>
                </div>
            </div>
            <button
                id={isTutorialCard ? 'tutorial-save-button' : undefined}
                onClick={() => onSave(lead)}
                disabled={isSaved}
                className="px-4 py-2 text-sm font-medium rounded-md flex items-center transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 bg-primary-light text-white hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark"
            >
                {isSaved ? (
                    <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Saved
                    </>
                ) : (
                    <>
                        <SaveIcon className="h-4 w-4 mr-2" />
                        Save
                    </>
                )}
            </button>
        </div>


        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6">{lead.companyDescription}</p>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <InfoItem icon={<GlobeIcon />} label="Website" value={lead.officialWebsite} isLink={true} href={lead.officialWebsite}/>
            <InfoItem 
                icon={<UserIcon />} 
                label="Key Contact" 
                value={contact && contact.name !== 'Not Found' ? `${contact.name} (${contact.title})` : 'Not Found'} 
            />
            <InfoItem icon={<MailIcon />} label="Contact Emails" value={emails.length > 0 ? emails.join(', ') : 'Not Found'} />
            <InfoItem icon={<PhoneIcon />} label="Contact Phones" value={phones.length > 0 ? phones.join(', ') : 'Not Found'} />
            <InfoItem icon={<MessageSquareIcon />} label="WhatsApp Number" value={lead.contactWhatsApp || 'Not Found'} />
            <InfoItem icon={<BuildingIcon />} label="Est. Employees" value={lead.estimatedEmployeeCount} />
        </dl>
        
        <ResearchFindings />
        
      </div>
      
      <div className="bg-background-light dark:bg-surface-dark/50 p-6 space-y-6">
          {/* Email Draft */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark flex items-center">
                    <MailIcon className="h-5 w-5 mr-2" />
                    Draft Email ({lead.draftEmail.tone})
                </h4>
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
                <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark flex items-center">
                    <MessageSquareIcon className="h-5 w-5 mr-2" />
                    Draft WhatsApp ({lead.draftWhatsApp.tone})
                </h4>
            </div>
              <div className="p-4 bg-surface-light dark:bg-border-dark rounded-lg border border-border-light dark:border-border-dark text-sm">
                <p className="whitespace-pre-wrap text-text-secondary-light dark:text-text-secondary-dark">{lead.draftWhatsApp.body}</p>
            </div>
          </div>
      </div>
    </div>
  );
};

export default LeadCard;