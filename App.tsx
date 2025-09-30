import React, { useState, useCallback, useEffect } from 'react';
import { BusinessLead, LeadGenerationParams } from './types';
import { generateLeads } from './services/geminiService';
import { addLead, getLeads, clearLeads as dbClearLeads } from './services/database';
import Header from './components/Header';
import LeadForm from './components/LeadForm';
import ResultsDisplay from './components/ResultsDisplay';
import SavedLeadsModal from './components/SavedLeadsModal';
import Footer from './components/Footer';
import Tutorial from './components/Tutorial';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [savedLeads, setSavedLeads] = useState<BusinessLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialDummyLead, setTutorialDummyLead] = useState<BusinessLead[] | null>(null);
  const [isTutorialLoading, setIsTutorialLoading] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(localStorage.getItem('theme') as Theme || 'light');
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const fetchData = useCallback(async () => {
    const allLeads = await getLeads();
    setSavedLeads(allLeads);
  }, []);

  useEffect(() => {
    fetchData();
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (hasSeenTutorial !== 'true') {
      setShowTutorial(true);
    }
  }, [fetchData]);
  
  const handleSaveAllLeads = useCallback(async (leadsToSave: BusinessLead[]) => {
    try {
        for (const lead of leadsToSave) {
            if (!lead.id) {
                lead.id = `${lead.businessName}-${lead.officialWebsite}`;
            }
            await addLead(lead);
        }
    } catch(e) {
        console.error("Error batch saving leads", e);
    } finally {
        await fetchData();
    }
  }, [fetchData]);

  const handleGenerateLeads = useCallback(async (params: LeadGenerationParams) => {
    setIsLoading(true);
    setError(null);
    setLeads([]);
    setGenerationStatus('Initializing...');
    setGenerationProgress(0);

    const handleProgressUpdate = ({ status, progress }: { status: string; progress: number }) => {
        setGenerationStatus(status);
        setGenerationProgress(progress);
    };

    try {
      const excludedBusinesses = savedLeads.map(lead => lead.businessName);
      const results = await generateLeads({
          ...params,
          excludedBusinesses,
      }, handleProgressUpdate);
      setLeads(results);

      // --- Auto-save leads ---
      if (results.length > 0) {
        await handleSaveAllLeads(results);
      }
      // --- End of auto-save ---

      // --- Send full audit log to Google Sheets via the serverless function ---
      const logData = {
        ...params, // This includes all the advanced options
        generatedLeadsCount: results.length
      };
      
      console.log("Attempting to send data to API endpoint /api/logToSheet", logData);
      
      fetch('/api/logToSheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      })
      .then(response => {
          if (!response.ok) {
              console.error("API Error Response:", response.status, response.statusText);
              return response.json().then(err => Promise.reject(err));
          }
          return response.json();
      })
      .then(data => {
          console.log("Successfully logged to sheet:", data.message);
      })
      .catch(err => {
        console.error("Failed to write to audit log sheet:", err);
      });
      // --- END OF LOGIC ---

    } catch (err) {
      console.error(err);
      let friendlyMessage = 'An unexpected error occurred. Please try again in a moment.';
      if (err instanceof Error) {
        // AIServiceError is a custom error from our service with a user-friendly message.
        if (err.name === 'AIServiceError') {
            friendlyMessage = err.message;
        } else if (err.message.includes("No businesses found")) {
            friendlyMessage = "Couldn't find businesses matching your criteria. Please try broadening your search.";
        } else if (err.message.includes("invalid format")) {
            friendlyMessage = "The AI returned an unexpected response format. This can be a temporary issue. Please try again.";
        } else {
            // A general catch-all for other errors.
            friendlyMessage = "An error occurred during generation. Please adjust your search and try again.";
        }
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
      setGenerationStatus('');
      setGenerationProgress(0);
    }
  }, [savedLeads, handleSaveAllLeads]);
  
  const handleImportLeads = useCallback(async (importedLeads: BusinessLead[]) => {
    try {
        for (const lead of importedLeads) {
            if (!lead.id) {
                lead.id = `${lead.businessName}-${lead.officialWebsite}`;
            }
            await addLead(lead);
        }
    } catch(e) {
        console.error("Error importing leads", e);
    } finally {
        await fetchData();
    }
  }, [fetchData]);

  const handleClearAllLeads = useCallback(async () => {
    await dbClearLeads();
    await fetchData();
  }, [fetchData]);

  const openModal = () => {
    fetchData(); 
    setIsModalOpen(true);
  };
  
  const handleShowDummyLead = () => {
    const dummyLead: BusinessLead = {
      id: 'tutorial-lead-123',
      businessName: 'Example Corp (Tutorial)',
      officialWebsite: 'https://example.com',
      contactPerson: { name: 'Jane Doe', title: 'Manager' },
      companySizeCategory: 'Medium',
      contactEmail: ['contact@example.com'],
      contactPhone: ['555-1234'],
      contactWhatsApp: '',
      companyDescription: 'This is a sample lead to demonstrate the save feature.',
      estimatedEmployeeCount: '50-100',
      inferredPrimaryLanguage: 'English',
      keyStrengthsIT: ['Modern Website'],
      keyWeaknessesIT: ['Needs better SEO'],
      customResearchResults: 'N/A',
      draftEmail: { subject: 'Example Subject', body: 'This is a sample email body.', language: 'English', tone: 'Professional' },
      draftWhatsApp: { body: 'Hi Jane!', language: 'English', tone: 'Conversational' }
    };
    setTutorialDummyLead([dummyLead]);
    // Simulate auto-saving for the tutorial
    setTimeout(() => {
        setSavedLeads(prev => [...prev, dummyLead]);
    }, 500);
  };
  
  const handleStartDummyLeadGeneration = () => {
    setTutorialDummyLead(null); // Clear any existing dummy lead
    setIsTutorialLoading(true);
    // Simulate loading for 3 seconds
    setTimeout(() => {
      setIsTutorialLoading(false);
      handleShowDummyLead(); // Now show the dummy lead
    }, 3000);
  };

  const handleFinishTutorial = () => {
    setShowTutorial(false);
    setTutorialDummyLead(null);
    setIsTutorialLoading(false); // Ensure loading state is reset
    setIsModalOpen(false); // Ensure modal is closed on finish
    localStorage.setItem('hasSeenTutorial', 'true');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleOpenModalForTutorial = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark font-sans transition-colors duration-300">
      {showTutorial && <Tutorial 
        onFinish={handleFinishTutorial} 
        onStartDummyLeadGeneration={handleStartDummyLeadGeneration} 
        onOpenModal={handleOpenModalForTutorial} 
      />}
      
      <Header 
        onOpenModal={openModal} 
        savedLeadsCount={savedLeads.length}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-2">Lead Generator</h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">
              Enter your target criteria below. The AI will identify potential clients, research their business, and generate personalized outreach messages. All generated leads are automatically saved and will be excluded from future searches.
            </p>
            <LeadForm 
              onGenerate={handleGenerateLeads} 
              isLoading={isLoading} 
              generationStatus={generationStatus}
              generationProgress={generationProgress}
            />
          </div>
          <ResultsDisplay 
            isLoading={isLoading} 
            error={error} 
            leads={tutorialDummyLead || leads}
            savedLeadIds={savedLeads.map(l => l.id as string)}
            isTutorialActive={!!tutorialDummyLead}
            isTutorialLoading={isTutorialLoading}
            generationStatus={generationStatus}
            generationProgress={generationProgress}
          />
        </div>
      </main>

      <SavedLeadsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        leads={savedLeads}
        onClearAll={handleClearAllLeads}
        onImport={handleImportLeads}
      />
      
      <Footer />
    </div>
  );
};

export default App;
