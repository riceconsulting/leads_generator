
import React, { useState, useCallback, useEffect } from 'react';
import { BusinessLead, LeadGenerationParams } from './types';
import { generateLeads } from './services/geminiService';
import { addLead, getLeads, clearLeads as dbClearLeads } from './services/database';
import Header from './components/Header';
import LeadForm from './components/LeadForm';
import ResultsDisplay from './components/ResultsDisplay';
import SavedLeadsModal from './components/SavedLeadsModal';
import Footer from './components/Footer';

const translations = {
  en: {
    appTitle: 'RICE AI - Leads Generator',
    savedLeads: 'Saved Leads',
    leadGeneratorTitle: 'Lead Generator',
    leadGeneratorDescription: 'Define your ideal customer by specifying a location and industry. Our AI will then scan for businesses, perform deep-dive research into their operations and online presence, and craft personalized outreach messages to kickstart your sales conversations. Generated leads are automatically saved to prevent duplicates.',
    targetLocation: 'Target Location',
    industryKeywords: 'Industry / Keywords',
    customIndustryKeywords: 'Custom Industry Keywords',
    optional: 'Optional',
    companyGrowthStage: 'Company Growth Stage',
    any: 'Any',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    enterprise: 'Enterprise',
    numberOfBusinesses: 'Number of Businesses',
    customResearchFocus: 'Custom Research Focus',
    customResearchDescription: 'Ask the AI to do a deep dive on a specific topic. This will affect the research findings.',
    other: 'Other',
    customResearchPoint: 'Custom Research Point',
    serviceOffered: 'Service / Product Offered',
    serviceOfferedDescription: 'Describe what you sell. This will tailor the outreach messages to the lead\'s needs.',
    advancedOptions: 'Advanced Options',
    senderName: 'Sender Name',
    senderTitle: 'Sender Title',
    yourCompanyName: 'Your Company Name',
    yourCompanyEmail: 'Your Company Email',
    yourCompanyWebsite: 'Your Company Website',
    yourCompanyPhone: 'Your Company Phone',
    emailMessageTemplate: 'Email Message Template',
    emailTemplatePlaceholder: 'Use placeholders: {{businessName}}, {{contactPerson.name}}, {{keyWeaknessesIT[0]}}',
    whatsappMessageTemplate: 'WhatsApp Message Template',
    whatsappTemplatePlaceholder: 'Keep it brief. Uses the same placeholders as the email template.',
    generateLeads: 'Generate Leads',
    generating: 'Generating...',
    dailyLimitReached: 'Daily Limit Reached',
    generationsRemaining: (count: number) => `${count} generations remaining today.`,
    noGenerationsRemaining: 'You have reached your daily generation limit.',
    error: 'Error',
    readyToStart: 'Ready to Start',
    readyToStartDescription: 'Fill out the form above to generate your first set of leads.',
    generatedLeads: 'Generated Leads',
    aiAtWork: 'AI is at work...',
    initializing: 'Initializing process...',
    savedLeadsTitle: (count: number) => `Saved Leads (${count})`,
    importText: 'Import Text',
    importFile: 'Import File',
    importing: 'Importing...',
    exportCSV: 'Export CSV',
    clearAll: 'Clear All',
    noSavedLeads: 'No Saved Leads',
    noSavedLeadsDescription: "You haven't saved any leads yet. Generate leads and they will be saved here automatically.",
    business: 'Business',
    contactPerson: 'Contact Person',
    generalContact: 'General Contact',
    website: 'Website',
    deleteAllLeadsTitle: 'Delete All Leads',
    deleteAllLeadsConfirmation: (count: number) => `Are you sure you want to permanently delete all ${count} saved leads? This action cannot be undone.`,
    cancel: 'Cancel',
    deleteAll: 'Delete All',
    importFromTextTitle: 'Import Leads from Text',
    importFromTextDescription: 'Paste comma-separated values (CSV) here. The first line must be the header.',
    importFromTextHeaders: 'Required headers: "Business Name". Optional: "Website", "Instagram", "Contact Name", "Contact Title", "Emails", "Phones", "Description". Use a semicolon (;) to separate multiple emails or phones.',
    importLeads: 'Import Leads',
    footerText: 'Need a custom solution or more leads?',
    contactUs: 'Contact Us',
    languageName: 'English',
    saved: 'Saved',
    saving: 'Saving...',
    showLess: 'Show Less',
    viewFullDetails: 'View Full Details & Drafts',
    copy: 'Copy',
    copied: 'Copied',
    techIndustry: 'Technology',
    softwareIt: 'Software & IT Services',
    ecommerce: 'E-commerce',
    fintech: 'Fintech',
    healthtech: 'Healthtech',
    edutech: 'Edutech',
    profServices: 'Professional Services',
    marketingAd: 'Marketing & Advertising Agency',
    consulting: 'Consulting Firm',
    legal: 'Legal Services',
    accounting: 'Accounting Services',
    retailConsumer: 'Retail & Consumer Goods',
    fashion: 'Fashion & Apparel',
    foodBev: 'Food & Beverage',
    homeGoods: 'Home Goods',
    consumerElectronics: 'Consumer Electronics',
    healthWellness: 'Health & Wellness',
    hospitals: 'Hospitals & Clinics',
    fitness: 'Fitness & Gyms',
    wellnessSpa: 'Wellness & Spa',
    pharma: 'Pharmaceuticals',
    manufacturingLogistics: 'Manufacturing & Logistics',
    autoManufacturing: 'Automotive Manufacturing',
    electronicsManufacturing: 'Electronics Manufacturing',
    supplyChain: 'Supply Chain & Logistics',
    industrialGoods: 'Industrial Goods',
    hospitalityTravel: 'Hospitality & Travel',
    hotels: 'Hotels & Accomodation',
    restaurants: 'Restaurants & Cafes',
    travel: 'Travel & Tourism Agencies',
  },
  id: {
    appTitle: 'RICE AI - Generator Prospek',
    savedLeads: 'Prospek Tersimpan',
    leadGeneratorTitle: 'Generator Prospek',
    leadGeneratorDescription: 'Tentukan pelanggan ideal Anda dengan menentukan lokasi dan industri. AI kami akan memindai bisnis, melakukan riset mendalam terhadap operasi dan kehadiran online mereka, serta menyusun pesan penjangkauan yang dipersonalisasi untuk memulai percakapan penjualan Anda. Prospek yang dihasilkan disimpan secara otomatis untuk mencegah duplikasi.',
    targetLocation: 'Lokasi Target',
    industryKeywords: 'Industri / Kata Kunci',
    customIndustryKeywords: 'Kata Kunci Industri Kustom',
    optional: 'Opsional',
    companyGrowthStage: 'Tahap Pertumbuhan Perusahaan',
    any: 'Apa saja',
    small: 'Kecil',
    medium: 'Menengah',
    large: 'Besar',
    enterprise: 'Perusahaan Besar',
    numberOfBusinesses: 'Jumlah Bisnis',
    customResearchFocus: 'Fokus Riset Kustom',
    customResearchDescription: 'Minta AI untuk melakukan penelusuran mendalam tentang topik tertentu. Ini akan memengaruhi temuan penelitian.',
    other: 'Lainnya',
    customResearchPoint: 'Poin Riset Kustom',
    serviceOffered: 'Layanan / Produk yang Ditawarkan',
    serviceOfferedDescription: 'Jelaskan apa yang Anda jual. Ini akan menyesuaikan pesan penjangkauan dengan kebutuhan prospek.',
    advancedOptions: 'Opsi Lanjutan',
    senderName: 'Nama Pengirim',
    senderTitle: 'Jabatan Pengirim',
    yourCompanyName: 'Nama Perusahaan Anda',
    yourCompanyEmail: 'Email Perusahaan Anda',
    yourCompanyWebsite: 'Situs Web Perusahaan Anda',
    yourCompanyPhone: 'Telepon Perusahaan Anda',
    emailMessageTemplate: 'Template Pesan Email',
    emailTemplatePlaceholder: 'Gunakan placeholder: {{businessName}}, {{contactPerson.name}}, {{keyWeaknessesIT[0]}}',
    whatsappMessageTemplate: 'Template Pesan WhatsApp',
    whatsappTemplatePlaceholder: 'Buat singkat. Gunakan placeholder yang sama dengan template email.',
    generateLeads: 'Hasilkan Prospek',
    generating: 'Menghasilkan...',
    dailyLimitReached: 'Batas Harian Tercapai',
    generationsRemaining: (count: number) => `${count} generasi tersisa hari ini.`,
    noGenerationsRemaining: 'Anda telah mencapai batas generasi harian Anda.',
    error: 'Kesalahan',
    readyToStart: 'Siap Memulai',
    readyToStartDescription: 'Isi formulir di atas untuk menghasilkan kumpulan prospek pertama Anda.',
    generatedLeads: 'Prospek yang Dihasilkan',
    aiAtWork: 'AI sedang bekerja...',
    initializing: 'Memulai proses...',
    savedLeadsTitle: (count: number) => `Prospek Tersimpan (${count})`,
    importText: 'Impor Teks',
    importFile: 'Impor File',
    importing: 'Mengimpor...',
    exportCSV: 'Export CSV',
    clearAll: 'Hapus Semua',
    noSavedLeads: 'Tidak Ada Prospek Tersimpan',
    noSavedLeadsDescription: 'Anda belum menyimpan prospek apa pun. Hasilkan prospek dan mereka akan disimpan di sini secara otomatis.',
    business: 'Bisnis',
    contactPerson: 'Kontak Person',
    generalContact: 'Kontak Umum',
    website: 'Situs Web',
    deleteAllLeadsTitle: 'Hapus Semua Prospek',
    deleteAllLeadsConfirmation: (count: number) => `Apakah Anda yakin ingin menghapus secara permanen semua ${count} prospek yang disimpan? Tindakan ini tidak dapat dibatalkan.`,
    cancel: 'Batal',
    deleteAll: 'Hapus Semua',
    importFromTextTitle: 'Impor Prospek dari Teks',
    importFromTextDescription: 'Tempelkan nilai yang dipisahkan koma (CSV) di sini. Baris pertama harus berupa header.',
    importFromTextHeaders: 'Header yang diperlukan: "Business Name". Opsional: "Website", "Instagram", "Contact Name", "Contact Title", "Emails", "Phones", "Description". Gunakan titik koma (;) untuk memisahkan beberapa email atau telepon.',
    importLeads: 'Impor Prospek',
    footerText: 'Butuh solusi khusus atau lebih banyak prospek?',
    contactUs: 'Hubungi Kami',
    languageName: 'Bahasa Indonesia',
    saved: 'Tersimpan',
    saving: 'Menyimpan...',
    showLess: 'Tampilkan Sedikit',
    viewFullDetails: 'Lihat Detail & Draf Lengkap',
    copy: 'Salin',
    copied: 'Tersalin',
    techIndustry: 'Teknologi',
    softwareIt: 'Perangkat Lunak & Layanan TI',
    ecommerce: 'E-commerce',
    fintech: 'Teknologi Finansial',
    healthtech: 'Teknologi Kesehatan',
    edutech: 'Teknologi Pendidikan',
    profServices: 'Jasa Profesional',
    marketingAd: 'Agensi Pemasaran & Periklanan',
    consulting: 'Firma Konsultasi',
    legal: 'Layanan Hukum',
    accounting: 'Layanan Akuntansi',
    retailConsumer: 'Ritel & Barang Konsumen',
    fashion: 'Mode & Pakaian',
    foodBev: 'Makanan & Minuman',
    homeGoods: 'Peralatan Rumah Tangga',
    consumerElectronics: 'Elektronik Konsumen',
    healthWellness: 'Kesehatan & Kebugaran',
    hospitals: 'Rumah Sakit & Klinik',
    fitness: 'Kebugaran & Gym',
    wellnessSpa: 'Kesehatan & Spa',
    pharma: 'Farmasi',
    manufacturingLogistics: 'Manufaktur & Logistik',
    autoManufacturing: 'Manufaktur Otomotif',
    electronicsManufacturing: 'Manufaktur Elektronik',
    supplyChain: 'Rantai Pasokan & Logistik',
    industrialGoods: 'Barang Industri',
    hospitalityTravel: 'Perhotelan & Perjalanan',
    hotels: 'Hotel & Akomodasi',
    restaurants: 'Restoran & Kafe',
    travel: 'Agensi Perjalanan & Pariwisata',
  }
};


type Theme = 'light' | 'dark';
type Language = 'en' | 'id';

const App: React.FC = () => {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [savedLeads, setSavedLeads] = useState<BusinessLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(localStorage.getItem('theme') as Theme || 'light');
  const [language, setLanguage] = useState<Language>(localStorage.getItem('language') as Language || 'id');
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  const t = useCallback((key: keyof typeof translations.en, ...args: any[]) => {
    const translation = translations[language][key] || translations.en[key];
    if (typeof translation === 'function') {
      // FIX: Use Function.prototype.apply to prevent TypeScript error about spreading a non-tuple array.
      // This is a more robust way to call a function with a dynamic list of arguments.
      return translation.apply(null, args);
    }
    return translation as string;
  }, [language]);
  
  useEffect(() => {
    document.title = t('appTitle');
  }, [t]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

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

  const handleGenerateLeads = useCallback(async (formParams: Omit<LeadGenerationParams, 'language'>) => {
    setIsLoading(true);
    setError(null);
    setLeads([]);
    setGenerationStatus(t('initializing'));
    setGenerationProgress(0);

    const handleProgressUpdate = ({ status, progress }: { status: string; progress: number }) => {
        setGenerationStatus(status);
        setGenerationProgress(progress);
    };

    try {
      const excludedBusinesses = savedLeads.map(lead => lead.businessName);
      
      const fullParams: LeadGenerationParams = {
          ...formParams,
          language: language === 'id' ? 'Bahasa Indonesia' : 'English',
          excludedBusinesses,
      };

      const results = await generateLeads(fullParams, handleProgressUpdate);
      setLeads(results);

      // --- Auto-save leads ---
      if (results.length > 0) {
        await handleSaveAllLeads(results);
      }
      // --- End of auto-save ---

      // --- Send full audit log to Google Sheets via the serverless function ---
      const logData = {
        ...fullParams, // This includes all the advanced options
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
  }, [savedLeads, handleSaveAllLeads, language, t]);
  
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

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark font-sans transition-colors duration-300">
      <Header 
        onOpenModal={openModal} 
        savedLeadsCount={savedLeads.length}
        theme={theme}
        toggleTheme={toggleTheme}
        language={language}
        setLanguage={setLanguage}
        t={t}
      />
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-2">{t('leadGeneratorTitle')}</h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">
              {t('leadGeneratorDescription')}
            </p>
            <LeadForm 
              onGenerate={handleGenerateLeads} 
              isLoading={isLoading} 
              generationStatus={generationStatus}
              generationProgress={generationProgress}
              t={t}
            />
          </div>
          <ResultsDisplay 
            isLoading={isLoading} 
            error={error} 
            leads={leads}
            savedLeadIds={savedLeads.map(l => l.id as string)}
            generationStatus={generationStatus}
            generationProgress={generationProgress}
            t={t}
          />
        </div>
      </main>

      <SavedLeadsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        leads={savedLeads}
        onClearAll={handleClearAllLeads}
        onImport={handleImportLeads}
        t={t}
      />
      
      <Footer t={t} />
    </div>
  );
};

export default App;
