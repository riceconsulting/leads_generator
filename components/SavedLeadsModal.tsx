import React, { useState, useRef } from 'react';
import { BusinessLead } from '../types';
import Papa from 'papaparse';
import { InfoIcon, BuildingIcon, MailIcon, PhoneIcon, DownloadIcon, UploadIcon, AlertTriangleIcon, FileTextIcon, UserIcon, XIcon, TrashIcon, InstagramIcon } from './icons';

interface SavedLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: BusinessLead[];
  onClearAll: () => void;
  onImport: (leads: BusinessLead[]) => void;
  t: (key: string, ...args: any[]) => string;
}

const SavedLeadsModal: React.FC<SavedLeadsModalProps> = ({ isOpen, onClose, leads, onClearAll, onImport, t }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isTextImportOpen, setIsTextImportOpen] = useState(false);
  const [textImportValue, setTextImportValue] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  const handleClear = () => {
    setShowConfirmClear(true);
  }

  const handleConfirmClear = () => {
    onClearAll();
    setShowConfirmClear(false);
  }

  const handleExport = () => {
    if (leads.length === 0) return;
    
    const dataForCsv = leads.map(lead => ({
        'Business Name': lead.businessName,
        'Website': lead.officialWebsite,
        'Instagram': lead.instagramHandle || '',
        'Contact Name': lead.contactPerson?.name || '',
        'Contact Title': lead.contactPerson?.title || '',
        'Emails': (Array.isArray(lead.contactEmail) ? lead.contactEmail : (lead.contactEmail ? [String(lead.contactEmail)] : [])).join('; '),
        'Phones': (Array.isArray(lead.contactPhone) ? lead.contactPhone : (lead.contactPhone ? [String(lead.contactPhone)] : [])).join('; '),
        'WhatsApp Number': lead.contactWhatsApp || '',
        'Description': lead.companyDescription,
    }));

    const csv = Papa.unparse(dataForCsv, { quotes: true });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

   const handleImportLogic = async (data: string) => {
    setImportError(null);
    setIsImporting(true);
    try {
      if (!data.trim()) {
          throw new Error("The provided data is empty.");
      }
      
      const result = Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        console.error("CSV Parsing Errors:", result.errors);
        throw new Error(`Error parsing row ${result.errors[0].row}: ${result.errors[0].message}`);
      }

      if (result.data.length === 0) {
        throw new Error("No valid lead data found in the provided text/file.");
      }

      const importedLeads: BusinessLead[] = result.data.map((row: any, index: number) => {
        const businessName = row['Business Name'] || row['businessName'] || `Imported Lead ${index + 1}`;
        const officialWebsite = row['Website'] || row['website'] || 'Not Found';
        const instagramHandle = row['Instagram'] || row['instagram'] || '';
        
        const emails = row['Emails'] || row['emails'] || '';
        const phones = row['Phones'] || row['phones'] || '';
        
        const lead: BusinessLead = {
          id: `${businessName}-${officialWebsite}-${Date.now()}-${index}`, // Make it unique
          businessName: businessName,
          officialWebsite: officialWebsite,
          instagramHandle: instagramHandle,
          contactPerson: {
            name: row['Contact Name'] || row['contactName'] || 'Not Found',
            title: row['Contact Title'] || row['contactTitle'] || '',
          },
          contactEmail: emails.split(';').map((e: string) => e.trim()).filter(Boolean),
          contactPhone: phones.split(';').map((p: string) => p.trim()).filter(Boolean),
          contactWhatsApp: row['WhatsApp Number'] || row['whatsappNumber'] || '',
          companyDescription: row['Description'] || row['description'] || 'Imported lead.',
          // Default values for fields not in the CSV
          estimatedEmployeeCount: 'N/A',
          inferredPrimaryLanguage: 'N/A',
          companySizeCategory: 'N/A',
          keyStrengthsIT: [],
          keyWeaknessesIT: [],
          draftEmail: { language: '', tone: '', subject: '', body: '' },
          draftWhatsApp: { language: '', tone: '', body: '' },
        };
        return lead;
      });

      if (importedLeads.length > 0) {
        onImport(importedLeads);
      }
      
      setIsTextImportOpen(false); // Close text import modal on success

    } catch (e: any) {
      console.error("Import failed:", e);
      const errorMessage = e.message || 'An unexpected error occurred during import.';
      setImportError(errorMessage);
       // For file import, a simple alert is sufficient. For text import, the error is shown inline.
      if (!isTextImportOpen) {
        alert(`Import Error: ${errorMessage}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        await handleImportLogic(text);
      };
      reader.onerror = () => {
        const errorMessage = "Failed to read the file.";
        setImportError(errorMessage);
        alert(`Import Error: ${errorMessage}`);
      }
      reader.readAsText(file);
    }
    // Reset file input value to allow re-uploading the same file
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleTextImportSubmit = () => {
    handleImportLogic(textImportValue);
  };
   
   const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };
  
  const handleTextImportClick = () => {
    setImportError(null);
    setTextImportValue('');
    setIsTextImportOpen(true);
  }

  if (!isOpen) {
    return null;
  }
  
  const primaryButtonStyles = "flex items-center justify-center px-4 py-2 bg-primary-light hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 text-white text-sm font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200";
  const secondaryButtonStyles = "flex items-center justify-center px-4 py-2 border border-primary-light dark:border-primary-dark text-primary-dark dark:text-primary-light text-sm font-semibold rounded-lg shadow-sm hover:bg-background-light dark:hover:bg-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";
  const destructiveButtonStyles = "flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-surface-dark disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200";


  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv, text/csv"
        onChange={handleFileSelect}
      />
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={() => setShowConfirmClear(false)}>
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                        {t('deleteAllLeadsTitle')}
                    </h3>
                    <div className="mt-2">
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            {t('deleteAllLeadsConfirmation', leads.length)}
                        </p>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setShowConfirmClear(false)}
                        className="inline-flex justify-center w-full rounded-md border border-border-light dark:border-border-dark px-4 py-2 bg-surface-light dark:bg-surface-dark text-base font-medium text-text-primary-light dark:text-text-primary-dark shadow-sm hover:bg-background-light dark:hover:bg-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmClear}
                        className="inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 bg-red-600 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                        {t('deleteAll')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {isTextImportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={() => setIsTextImportOpen(false)}>
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">{t('importFromTextTitle')}</h3>
                      <button onClick={() => setIsTextImportOpen(false)} className="text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark">
                        <XIcon className="h-6 w-6" />
                      </button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
                        {t('importFromTextDescription')}
                    </p>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        {t('importFromTextHeaders')}
                    </p>
                    <textarea
                        value={textImportValue}
                        onChange={(e) => setTextImportValue(e.target.value)}
                        placeholder={'Business Name,Website,Emails\nExample Corp,https://example.com,contact@example.com;info@example.com'}
                        className="w-full h-64 p-3 font-mono text-sm bg-background-light dark:bg-border-dark border border-border-light dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark"
                    />
                    {importError && (
                         <div className="mt-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm" role="alert">
                            <strong className="font-bold">Import Error:</strong>
                            <span className="block sm:inline ml-2">{importError}</span>
                        </div>
                    )}
                </div>
                <div className="flex justify-end items-center p-4 bg-background-light dark:bg-surface-dark/50 border-t border-border-light dark:border-border-dark rounded-b-xl">
                    <button onClick={() => setIsTextImportOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md mr-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-border-light dark:hover:bg-border-dark">
                        {t('cancel')}
                    </button>
                    <button onClick={handleTextImportSubmit} disabled={isImporting || !textImportValue} className={primaryButtonStyles}>
                      {isImporting ? t('importing') : <><UploadIcon className="h-4 w-4 mr-2" /> {t('importLeads')}</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap justify-between items-center p-4 md:p-6 border-b border-border-light dark:border-border-dark gap-4">
            <h2 className="text-xl md:text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">{t('savedLeadsTitle', leads.length)}</h2>
            <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
              <button onClick={handleTextImportClick} disabled={isImporting} className={secondaryButtonStyles}>
                  <FileTextIcon className="h-4 w-4 mr-2" /> {t('importText')}
              </button>
              <button onClick={handleImportClick} disabled={isImporting} className={primaryButtonStyles}>
                  <UploadIcon className="h-4 w-4 mr-2" /> {isImporting ? t('importing') : t('importFile')}
              </button>
              <button id="export-csv-button" onClick={handleExport} disabled={leads.length === 0} className={primaryButtonStyles}>
                  <DownloadIcon className="h-4 w-4 mr-2" /> {t('exportCSV')}
              </button>
              <button onClick={handleClear} disabled={leads.length === 0} className={destructiveButtonStyles}>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  {t('clearAll')}
              </button>
              <button onClick={onClose} className="text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark ml-2">
                <XIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <main className="flex-grow p-2 sm:p-4 overflow-y-auto">
            <div className="overflow-x-auto">
              {leads.length === 0 ? (
                <div className="text-center py-20 px-6">
                  <InfoIcon className="mx-auto h-16 w-16 text-text-secondary-dark" />
                  <h3 className="mt-4 text-xl font-medium text-text-primary-light dark:text-text-primary-dark">{t('noSavedLeads')}</h3>
                  <p className="mt-2 text-base text-text-secondary-light dark:text-text-secondary-dark">{t('noSavedLeadsDescription')}</p>
                </div>
              ) : (
                <div className="p-1">
                  <table className="min-w-full">
                    <thead className="hidden md:table-header-group bg-background-light dark:bg-border-dark">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">{t('business')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">{t('contactPerson')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">{t('generalContact')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">{t('website')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface-light dark:bg-surface-dark">
                      {leads.map((lead) => {
                        const emails = Array.isArray(lead.contactEmail) ? lead.contactEmail : (lead.contactEmail ? [String(lead.contactEmail)] : []);
                        const phones = Array.isArray(lead.contactPhone) ? lead.contactPhone : (lead.contactPhone ? [String(lead.contactPhone)] : []);
                        
                        return (
                          <tr key={lead.id} className="block mb-4 p-4 rounded-lg shadow-md md:table-row md:shadow-none md:mb-0 border md:border-b md:border-t-0 md:border-x-0 border-border-light dark:border-border-dark">
                            
                            <td className="flex justify-between items-center py-2 md:table-cell md:px-6 md:py-4 md:w-2/5">
                               <span className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark md:hidden mr-2">{t('business')}</span>
                               <div className="text-right md:text-left">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary-light/20 dark:bg-primary-dark/20 rounded-full">
                                        <BuildingIcon className="h-5 w-5 text-primary-light dark:text-primary-dark" />
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">{lead.businessName}</div>
                                      <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{lead.companySizeCategory}</div>
                                    </div>
                                  </div>
                               </div>
                            </td>

                             <td className="flex justify-between items-center py-2 border-t border-border-light dark:border-border-dark md:table-cell md:px-6 md:py-4 md:border-t-0">
                               <span className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark md:hidden mr-2">{t('contactPerson')}</span>
                               <div className="text-right md:text-left">
                                {lead.contactPerson && lead.contactPerson.name !== 'Not Found' ? (
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-border-light dark:bg-border-dark rounded-full">
                                            <UserIcon className="h-5 w-5 text-text-secondary-light dark:text-text-secondary-dark" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{lead.contactPerson.name}</div>
                                            <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{lead.contactPerson.title}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Not Found</span>
                                )}
                                </div>
                             </td>

                            <td className="flex justify-between items-center py-2 border-t border-border-light dark:border-border-dark md:table-cell md:px-6 md:py-4 md:border-t-0">
                              <span className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark md:hidden mr-2">{t('generalContact')}</span>
                              <div className="text-right md:text-left text-sm text-text-secondary-light dark:text-text-secondary-dark break-words">
                                <div className="flex items-center justify-end md:justify-start mb-1">
                                  <MailIcon className="h-4 w-4 mr-2 flex-shrink-0" /> {emails.join(', ') || 'N/A'}
                                </div>
                                <div className="flex items-center justify-end md:justify-start">
                                  <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" /> {phones.join(', ') || 'N/A'}
                                </div>
                              </div>
                            </td>

                            <td className="flex justify-between items-center py-2 border-t border-border-light dark:border-border-dark md:table-cell md:px-6 md:py-4 md:border-t-0">
                               <span className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark md:hidden mr-2">{t('website')}</span>
                               <div className="text-right md:text-left text-sm">
                                  <a href={lead.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-accent-light dark:text-accent-dark hover:underline break-all">
                                    {lead.officialWebsite}
                                  </a>
                                  {lead.instagramHandle && lead.instagramHandle.toLowerCase() !== 'not found' && (
                                      <div className="flex items-center justify-end md:justify-start mt-1">
                                          <InstagramIcon className="h-4 w-4 mr-2 text-text-secondary-light dark:text-text-secondary-dark" />
                                          <a href={`https://instagram.com/${lead.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-accent-light dark:text-accent-dark hover:underline break-all">
                                            {lead.instagramHandle}
                                          </a>
                                      </div>
                                  )}
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default SavedLeadsModal;