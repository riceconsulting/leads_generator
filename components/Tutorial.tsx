import React, { useState, useEffect } from 'react';

interface TutorialProps {
  onFinish: () => void;
  onStartDummyLeadGeneration: () => void;
  onOpenModal: () => void;
  t: (key: string) => string;
}

const Tutorial: React.FC<TutorialProps> = ({ onFinish, onStartDummyLeadGeneration, onOpenModal, t }) => {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({ display: 'none' });

  const tutorialSteps = [
    {
      targetId: 'target-location-input',
      title: t('tutorialStep1Title'),
      content: t('tutorialStep1Content'),
      position: 'bottom',
    },
    {
      targetId: 'customResearchType',
      title: t('tutorialStep2Title'),
      content: t('tutorialStep2Content'),
      position: 'bottom',
    },
    {
      targetId: 'generate-leads-button',
      title: t('tutorialStep3Title'),
      content: t('tutorialStep3Content'),
      position: 'top',
    },
    {
      targetId: 'loading-display-container',
      title: t('tutorialStep4Title'),
      content: t('tutorialStep4Content'),
      position: 'top',
      action: 'startDummyLeadGeneration',
    },
    {
      targetId: 'results-display-container',
      title: t('tutorialStep5Title'),
      content: t('tutorialStep5Content'),
      position: 'top',
    },
    {
      targetId: 'tutorial-save-button',
      title: t('tutorialStep6Title'),
      content: t('tutorialStep6Content'),
      position: 'bottom',
    },
    {
      targetId: 'saved-leads-button',
      title: t('tutorialStep7Title'),
      content: t('tutorialStep7Content'),
      position: 'bottom',
    },
    {
      targetId: 'export-csv-button',
      title: t('tutorialStep8Title'),
      content: t('tutorialStep8Content'),
      position: 'bottom',
      action: 'openModal',
    },
  ];

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (hasSeenTutorial !== 'true') {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const currentStepData = tutorialSteps[step];
    if (currentStepData.action === 'startDummyLeadGeneration') {
      onStartDummyLeadGeneration();
    }
    if (currentStepData.action === 'openModal') {
      onOpenModal();
    }

    let lastHighlightedElement: HTMLElement | null = null;
    
    const positionTooltip = (targetElement: HTMLElement) => {
        lastHighlightedElement = targetElement;
        // Apply highlight styles directly to the element
        targetElement.style.zIndex = '1001';
        targetElement.style.position = 'relative';
        targetElement.style.boxShadow = '0 0 0 4px rgba(98, 155, 188, 0.7)';
        targetElement.style.borderRadius = '6px';
        targetElement.style.transition = 'box-shadow 0.3s ease-in-out';
        
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // This timeout waits for the smooth scroll animation to finish
        setTimeout(() => {
            requestAnimationFrame(() => {
                const targetRect = targetElement.getBoundingClientRect();
                const tooltipWidth = 300;
                let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
                left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

                const newTooltipStyle: React.CSSProperties = {
                  position: 'fixed', left: `${left}px`, width: `${tooltipWidth}px`, zIndex: 1002, display: 'block',
                };
                const newArrowStyle: React.CSSProperties = {
                    position: 'absolute', left: `${targetRect.left + (targetRect.width / 2) - left - 6}px`, width: 0, height: 0,
                    borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                };

                if (currentStepData.position === 'bottom') {
                  newTooltipStyle.top = `${targetRect.bottom + 12}px`;
                  newArrowStyle.bottom = '100%';
                  newArrowStyle.borderBottom = '6px solid white';
                } else {
                  newTooltipStyle.top = `${targetRect.top - 12}px`;
                  newTooltipStyle.transform = 'translateY(-100%)';
                  newArrowStyle.top = '100%';
                  newArrowStyle.borderTop = '6px solid white';
                }
                setTooltipStyle(newTooltipStyle);
                setArrowStyle(newArrowStyle);
            });
        }, 400);
    };

    // This interval checks repeatedly for the element, which is more reliable
    const interval = setInterval(() => {
      const targetElement = document.getElementById(currentStepData.targetId);
      if (targetElement) {
        clearInterval(interval);
        positionTooltip(targetElement);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (lastHighlightedElement) {
        // Remove the highlight styles
        lastHighlightedElement.style.zIndex = '';
        lastHighlightedElement.style.position = '';
        lastHighlightedElement.style.boxShadow = '';
        lastHighlightedElement.style.borderRadius = '';
        lastHighlightedElement.style.transition = '';
      }
    };
  }, [isOpen, step, onStartDummyLeadGeneration, onOpenModal, tutorialSteps]);

  const endTutorial = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setIsOpen(false);
    onFinish();
  };

  const handleNext = () => {
    setTooltipStyle({ display: 'none' });
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      endTutorial();
    }
  };

  const handleSkip = () => {
    setTooltipStyle({ display: 'none' });
    endTutorial();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black bg-opacity-70">
      <div style={tooltipStyle} className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl p-4 animate-fade-in relative">
        <div style={arrowStyle} />
        <h3 className="font-heading font-bold text-lg mb-2 text-text-primary-light dark:text-text-primary-dark">{tutorialSteps[step].title}</h3>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{tutorialSteps[step].content}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-text-secondary-dark">{step + 1} / {tutorialSteps.length}</span>
          <div>
            <button onClick={handleSkip} className="text-sm text-text-secondary-light hover:text-text-primary-light dark:hover:text-text-secondary-dark mr-4">Skip</button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-primary-light hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 text-white font-semibold rounded-md text-sm transition-colors duration-200"
            >
              {step === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
