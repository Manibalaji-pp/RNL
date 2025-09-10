import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { VisitReportData } from './types';
import Section from './components/Section';
import InputField from './components/InputField';
import TextAreaField from './components/TextAreaField';
import FileUploadField from './components/FileUploadField';
import RadioGroupField from './components/RadioGroupField';
import RatingField from './components/RatingField';
import SelectField from './components/SelectField';
import { hospitals } from './data/hospitals';

// TypeScript declaration for jsPDF loaded from a script tag
declare const jspdf: {
  jsPDF: new (options?: any) => any;
};

// Initialize the AI client once.
// This assumes API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses the Gemini API to correct spelling and grammar in a given text.
 * @param text The text to correct.
 * @returns A promise that resolves to the corrected text.
 */
const correctGrammarAndSpelling = async (text: string): Promise<string> => {
    if (!text || text.trim().length === 0) {
        return text;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Correct the spelling and grammar of the following text. Do not change the meaning or add any new information. Preserve the original formatting, especially if it is a numbered list. Only return the corrected text itself, without any introductory phrases like "Here is the corrected text:".\n\nOriginal Text:\n---\n${text}\n---\n\nCorrected Text:`,
            config: {
              // Use low thinking budget for faster, lower-latency corrections.
              thinkingConfig: { thinkingBudget: 0 }
            }
        });

        const correctedText = response.text;
        
        // Return the corrected text if it's valid, otherwise return the original.
        return correctedText?.trim() || text;

    } catch (error) {
        console.error("Error correcting grammar with AI:", error);
        // In case of an API error, gracefully fall back to the original text.
        return text;
    }
};


const DOCUMENTATION_MODES = [
  'Paper (everything is sent on radar via chat)',
  'Double Documentation (Paper + RADAR)',
  '100% RADAR',
];

const SOLUTION_GIVEN_OPTIONS = [
  'Forwarded to tech team',
  'Immediate Solution Given by NL/KAM',
  'Other',
];

const ISSUE_ASSIGNED_TO_OPTIONS = [
  'KAM',
  'RPL',
  'Workspace Lead',
  'Quality',
  'Tech/IT',
  'OPS/CST',
  'Other',
];

const EXPANSION_REASON_OPTIONS = [
  'ER',
  'Full inventory',
  'NICU/PICU',
  'Dialysis',
  'FCC',
  'NABH',
  'smart Dietician',
  'Nursing excellence',
  'others',
];

const STAFF_RESPONSE_OPTIONS = ['Positive', 'Neutral', 'Challenging'];

const CRITICAL_NEED_OPTIONS = [
  'Staff Training',
  'Technical support',
  'Process implement',
  'Communication Enhancement',
  'Others',
];

const IMPLEMENTATION_TIMEFRAME_OPTIONS = [
  '1-3 Days',
  '4-7 Days',
  '1 -2 weeks',
  '2-3 weeks',
  '3-4 weeks',
  'more than 4 weeks',
];

const LOCAL_STORAGE_KEY = 'rnlVisitReportFormData';

const App: React.FC = () => {
  const [formData, setFormData] = useState<VisitReportData>({
    email: '@cloudphysician.net',
    hospitalName: '',
    zohoCode: '',
    dateOfVisit: new Date().toISOString().split('T')[0],
    visitAgenda: '',
    stakeholdersMet: '',
    trainingConducted: null,
    trainingTopics: '',
    attendanceSheet: null,
    trainingPhotos: [],
    radarIdsChecked: null,
    radarIdsDeactivated: 0,
    radarIdsCreated: 0,
    eCallCodeBlueTraining: null,
    keyPointsDiscussed: '',
    challengesCareCenter: '',
    challengesHospital: '',
    resolutionImplemented: '',
    documentationMode: '',
    radarSpecificIssues: '',
    solutionGiven: '',
    issueAssignedTo: '',
    expansionOpportunity: null,
    expansionReason: '',
    nabhStatus: '',
    roundsNotRegularReason: '',
    supportNeededFromHospital: '',
    nextSteps: '',
    nursingStaffResponse: '',
    ownerResponse: '',
    solutionEffectivenessRating: 0,
    criticalImmediateNeed: '',
    relationshipWithStaff: '',
    hospitalProactiveness: '',
    implementationTimeFrame: '',
    retrainingAssessment: null,
    noAssessmentReason: '',
    rnlOwnNotes: '',
  });
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const hospitalInputRef = useRef<HTMLDivElement>(null);

  // Check for read-only mode from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('readonly') === 'true') {
      setIsReadOnly(true);
    }
  }, []);

  const handleSaveDraft = useCallback((showNotification = false) => {
    // Exclude non-serializable File objects from being saved to localStorage
    const {
        attendanceSheet,
        trainingPhotos,
        retrainingAssessment,
        ...serializableFormData
    } = formData;

    const savedAt = new Date().toISOString();
    const dataToStore = {
        formData: serializableFormData,
        savedAt: savedAt,
    };

    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
        setLastSaved(savedAt);
        if (showNotification) {
            alert('Draft saved successfully!');
        }
    } catch (error) {
        console.error("Could not save form data to localStorage:", error);
        if (showNotification) {
            alert("Could not save your progress. Your browser's local storage might be full.");
        }
    }
  }, [formData]);

  // Load saved form data from localStorage on initial component mount
  useEffect(() => {
    try {
        const savedDataJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedDataJSON) {
            const { formData: loadedFormData, savedAt } = JSON.parse(savedDataJSON);
            setFormData(prev => ({
                ...prev,
                ...loadedFormData,
                // File inputs cannot be restored from localStorage, so they are reset
                attendanceSheet: null,
                trainingPhotos: [],
                retrainingAssessment: null,
            }));
            setLastSaved(savedAt);
        }
    } catch (error) {
        console.error("Could not load form data from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear potentially corrupted data
    }
  }, []);

  // Set up an interval to auto-save the form data every 2 minutes
  useEffect(() => {
    if (isReadOnly) return;
    const autoSaveInterval = setInterval(() => handleSaveDraft(false), 2 * 60 * 1000); // 120000ms = 2 minutes
    return () => {
        clearInterval(autoSaveInterval);
    };
  }, [handleSaveDraft, isReadOnly]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (type === 'number') {
      setFormData(prev => ({...prev, [name]: value === '' ? '' : Number(value)}));
    } 
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const isMultiple = e.currentTarget.multiple;

    if (files && files.length > 0) {
      let selectedFiles = Array.from(files);

      if (name === 'trainingPhotos' && selectedFiles.length > 10) {
        alert('You can upload a maximum of 10 photos. Only the first 10 will be selected.');
        selectedFiles = selectedFiles.slice(0, 10);
      }

      if (isMultiple) {
        setFormData(prev => ({ ...prev, [name]: selectedFiles }));
      } else {
        setFormData(prev => ({ ...prev, [name]: selectedFiles[0] }));
      }
    } else {
      // If user cancels file selection, clear the field
      setFormData(prev => ({ ...prev, [name]: isMultiple ? [] : null }));
    }
  }, []);

  const handleRatingChange = useCallback((name: string, rating: number) => {
    setFormData(prev => ({ ...prev, [name]: rating }));
  }, []);

  const handleHospitalSelect = useCallback((hospital: typeof hospitals[0]) => {
      setFormData(prev => ({
        ...prev,
        hospitalName: hospital.name,
        zohoCode: hospital.zohoCode,
      }));
      setIsHospitalDropdownOpen(false);
  }, []);

  const filteredHospitals = useMemo(() => {
    const searchLower = formData.hospitalName.toLowerCase();
    if (!searchLower) {
      return hospitals;
    }
    return hospitals.filter(h =>
      h.name.toLowerCase().includes(searchLower)
    );
  }, [formData.hospitalName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (hospitalInputRef.current && !hospitalInputRef.current.contains(event.target as Node)) {
            setIsHospitalDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const downloadCSV = (data: VisitReportData) => {
    const headers = Object.keys(data);
  
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '""'; // Empty quoted string for null/undefined
      }
      if (value instanceof File) {
        // Escape quotes in filename just in case
        return `"${value.name.replace(/"/g, '""')}"`;
      }
      if (Array.isArray(value) && value.every(item => item instanceof File)) {
        return `"${value.map(f => f.name).join(', ').replace(/"/g, '""')}"`;
      }
      
      // For all other types, convert to string, escape quotes, and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    };
  
    const headerRow = headers.map(h => `"${h}"`).join(',');
    const valueRow = headers.map(header => formatValue(data[header as keyof VisitReportData])).join(',');
  
    const csvContent = `${headerRow}\n${valueRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t;' });
    
    // Sanitize hospital name for filename
    const safeHospitalName = data.hospitalName.replace(/[^a-zA-Z0-9]/g, '_') || 'Report';
    const filename = `RNL-Report-${safeHospitalName}-${data.dateOfVisit}.csv`;

    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isReadOnly) return;
    console.log("Form Submitted:", formData);
    downloadCSV(formData);
    alert("Form submitted! Your report is now downloading as a CSV file, which you can open with Google Sheets.");
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;
        const lineHeight = 7;
        const labelValueSpacing = 2;
        let y = margin;

        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };

        const fileToBase64 = (file: File): Promise<string> =>
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });

        const addSectionTitle = (title: string) => {
            checkPageBreak(lineHeight * 2);
            y += lineHeight;
            doc.setFont('helvetica', 'bold').setFontSize(14);
            doc.text(title, margin, y);
            y += lineHeight;
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += lineHeight;
        };
        
        const addField = (label: string, value: any) => {
            const formattedValue = value === null || value === undefined || value === ''
                ? 'N/A'
                : typeof value === 'boolean'
                ? value ? 'Yes' : 'No'
                : String(value);

            doc.setFont('helvetica', 'bold').setFontSize(10);
            const labelLines = doc.splitTextToSize(label, maxWidth);
            checkPageBreak(lineHeight * (labelLines.length + 1));
            doc.text(labelLines, margin, y);
            y += (labelLines.length * (lineHeight-2));

            doc.setFont('helvetica', 'normal').setFontSize(10);
            const valueLines = doc.splitTextToSize(formattedValue, maxWidth);
            checkPageBreak(lineHeight * valueLines.length);
            doc.text(valueLines, margin, y + labelValueSpacing);
            y += (valueLines.length * (lineHeight-2)) + lineHeight;
        };

        const addImageToPdf = async (title: string, files: File | File[] | null) => {
            const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
            if (fileArray.length === 0) return;

            for (const [index, file] of fileArray.entries()) {
                const imageTitle = fileArray.length > 1 ? `${title} (${index + 1}/${fileArray.length})` : title;
                try {
                    const base64 = await fileToBase64(file);
                    
                    const img = new Image();
                    img.src = base64;
                    await new Promise(resolve => { img.onload = resolve });
    
                    const aspectRatio = img.width / img.height;
                    let imgWidth = maxWidth;
                    let imgHeight = imgWidth / aspectRatio;
    
                    if (imgHeight > pageHeight - margin * 2) {
                        imgHeight = pageHeight - margin * 2;
                        imgWidth = imgHeight * aspectRatio;
                    }
                    
                    checkPageBreak(imgHeight + lineHeight * 2);
                    
                    doc.setFont('helvetica', 'bold').setFontSize(12);
                    doc.text(imageTitle, margin, y);
                    y += lineHeight;
    
                    doc.addImage(base64, file.type.split('/')[1].toUpperCase(), margin, y, imgWidth, imgHeight);
                    y += imgHeight + lineHeight;
    
                } catch(e) {
                    console.error(`Could not add image ${file.name} to PDF`, e);
                    addField(imageTitle, `Error: Could not embed image (${file.name})`);
                }
            }
        };
        
        // --- PDF Content Generation ---
        doc.setFont('helvetica', 'bold').setFontSize(20);
        doc.text('RNL Hospital Visit Report', pageWidth / 2, y, { align: 'center' });
        y += lineHeight * 2;

        addSectionTitle('I. Visit Details');
        addField('Email:', formData.email);
        addField('Hospital Name:', formData.hospitalName);
        addField('Zoho Code:', formData.zohoCode);
        addField('Date of Visit:', formData.dateOfVisit);
        addField('Visit Agenda:', formData.visitAgenda);
        addField('Stakeholders Met:', formData.stakeholdersMet);
        addField('Training Conducted?:', formData.trainingConducted);
        if (formData.trainingConducted) addField('Training Topics Covered:', formData.trainingTopics);
        addField('Were RADAR IDs checked and deactivated?:', formData.radarIdsChecked);
        addField('Number of RADAR IDs Deactivated:', formData.radarIdsDeactivated);
        addField('Number of New RADAR IDs Created:', formData.radarIdsCreated);
        addField('Was e-Call and Code-Blue training conducted?:', formData.eCallCodeBlueTraining);
        
        addSectionTitle('II. Issues & Concerns');
        addField('Key Points Discussed:', formData.keyPointsDiscussed);
        addField('Challenges/Issues Raised by Care Center:', formData.challengesCareCenter);
        addField('Challenges/Issues Raised by Hospital:', formData.challengesHospital);
        addField('Resolution Implemented for Each Issue:', formData.resolutionImplemented);
        addField('Current Documentation Mode at Bedside:', formData.documentationMode);
        addField('List RADAR-Specific Issues:', formData.radarSpecificIssues);
        addField('Solution Given for the Issues:', formData.solutionGiven);
        addField('Issue Identified and Assigned To:', formData.issueAssignedTo);
        addField('Expansion Opportunity Identified?:', formData.expansionOpportunity);
        if (formData.expansionOpportunity) addField('Reason for Expansion Opportunity:', formData.expansionReason);
        addField('NABH Status:', formData.nabhStatus);
        addField('Why are Rounds Not Regular with the Care Center:', formData.roundsNotRegularReason);
        addField('Support Needed from Hospital:', formData.supportNeededFromHospital);
        addField('Next Steps Agreed with Hospital:', formData.nextSteps);

        addSectionTitle('III. Observation & Rating');
        addField('Overall Nursing Staff Response:', formData.nursingStaffResponse);
        addField('Overall Response from Owner:', formData.ownerResponse);
        addField('Effectiveness of Solutions Rating:', formData.solutionEffectivenessRating > 0 ? `${formData.solutionEffectivenessRating} / 5` : 'Not Rated');
        addField('Most Critical Immediate Need Identified:', formData.criticalImmediateNeed);
        addField('Overall Relationship with Hospital Staff:', formData.relationshipWithStaff);
        addField('Overall Proactiveness of the Hospital:', formData.hospitalProactiveness);
        addField('Estimated Time Frame for Implementation:', formData.implementationTimeFrame);
        if(!formData.retrainingAssessment) addField('Reason for No Assessment:', formData.noAssessmentReason);
        addField('RNL’s Own Notes / Impressions:', formData.rnlOwnNotes);

        addSectionTitle('IV. Attachments');
        await addImageToPdf('Attendance Sheet', formData.attendanceSheet);
        await addImageToPdf('Training Photos', formData.trainingPhotos);
        await addImageToPdf('Retraining or Training of New Staff + Assessment', formData.retrainingAssessment);
        
        const safeHospitalName = formData.hospitalName.replace(/[^a-zA-Z0-9]/g, '_') || 'Report';
        const filename = `RNL-Report-${safeHospitalName}-${formData.dateOfVisit}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Sorry, there was an error generating the PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const autoCorrectProp = isReadOnly ? undefined : correctGrammarAndSpelling;

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="fixed inset-0 z-0 flex items-center justify-center p-8 pointer-events-none">
            <svg
              className="w-auto h-2/3 max-h-[500px] text-gray-200 opacity-75"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"></path>
            </svg>
        </div>

      <div className="relative z-10 text-gray-900 flex flex-col items-center sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <header className="text-center mb-8 px-4 pt-8 sm:px-0 sm:pt-0">
            <h1 className="text-4xl font-extrabold text-indigo-600">RNL Hospital Visit Report</h1>
            <p className="mt-2 text-lg text-gray-600">A Comprehensive Data Collection Form</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Section title="I. Visit Details">
              <InputField label="Email" name="email" value={formData.email} onChange={handleChange} type="email" required className="md:col-span-1" readOnly={isReadOnly} />
              <div className="md:col-span-1" ref={hospitalInputRef}>
                <label htmlFor="hospitalName-search" className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="hospitalName-search"
                    value={formData.hospitalName}
                    onChange={(e) => {
                      const newSearch = e.target.value;
                      const matchedHospital = hospitals.find(h => h.name.toLowerCase() === newSearch.toLowerCase());

                      setFormData(prev => ({
                        ...prev,
                        hospitalName: newSearch,
                        zohoCode: matchedHospital ? matchedHospital.zohoCode : '',
                      }));
                      
                      if (!isHospitalDropdownOpen) {
                        setIsHospitalDropdownOpen(true);
                      }
                    }}
                    onFocus={() => setIsHospitalDropdownOpen(true)}
                    placeholder="Type to search hospitals..."
                    required={!formData.hospitalName}
                    readOnly={isReadOnly}
                    className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isHospitalDropdownOpen}
                    aria-controls="hospital-listbox"
                  />
                  {isHospitalDropdownOpen && !isReadOnly && (
                    <ul
                      id="hospital-listbox"
                      role="listbox"
                      className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
                    >
                      {filteredHospitals.length > 0 ? (
                        filteredHospitals.map(hospital => (
                          <li
                            key={hospital.zohoCode}
                            onClick={() => handleHospitalSelect(hospital)}
                            className="px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-indigo-50"
                            role="option"
                            aria-selected={formData.hospitalName === hospital.name}
                          >
                            {hospital.name}
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-2 text-sm text-gray-500 italic">No matches found</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <InputField label="Zoho Code" name="zohoCode" value={formData.zohoCode} onChange={handleChange} required className="md:col-span-1" readOnly />
              <InputField label="Date of Visit" name="dateOfVisit" value={formData.dateOfVisit} onChange={handleChange} type="date" required className="md:col-span-1" readOnly={isReadOnly} />
              <TextAreaField label="Visit Agenda" name="visitAgenda" value={formData.visitAgenda} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Stakeholders Met (Name, Role, Department)" name="stakeholdersMet" value={formData.stakeholdersMet} onChange={handleChange} required readOnly={isReadOnly} />
              <RadioGroupField label="Training Conducted?" name="trainingConducted" value={formData.trainingConducted} onChange={handleChange} required readOnly={isReadOnly} />
              <TextAreaField label="Training Topics Covered" name="trainingTopics" value={formData.trainingTopics} onChange={handleChange} readOnly={isReadOnly} onAutoCorrect={autoCorrectProp}/>
              <FileUploadField label="Attach Attendance Sheet" name="attendanceSheet" files={formData.attendanceSheet} onChange={handleFileChange} className="md:col-span-1" readOnly={isReadOnly} description="PNG, JPG, or PDF"/>
              <FileUploadField label="Training Photos" name="trainingPhotos" files={formData.trainingPhotos} onChange={handleFileChange} className="md:col-span-1" readOnly={isReadOnly} multiple accept="image/*" description="Up to 10 photos (PNG, JPG)" />
              <RadioGroupField label="Were RADAR IDs checked and deactivated for users who have left?" name="radarIdsChecked" value={formData.radarIdsChecked} onChange={handleChange} required readOnly={isReadOnly} />
              <InputField label="Number of RADAR IDs Deactivated" name="radarIdsDeactivated" type="number" value={formData.radarIdsDeactivated} onChange={handleChange} className="md:col-span-1" readOnly={isReadOnly} />
              <InputField label="Number of New RADAR IDs Created" name="radarIdsCreated" type="number" value={formData.radarIdsCreated} onChange={handleChange} className="md:col-span-1" readOnly={isReadOnly} />
              <RadioGroupField label="Was e-Call and Code-Blue training conducted for bedside staff?" name="eCallCodeBlueTraining" value={formData.eCallCodeBlueTraining} onChange={handleChange} required readOnly={isReadOnly} />
            </Section>

            <Section title="II. Issues & Concerns">
              <TextAreaField label="Key Points Discussed" name="keyPointsDiscussed" value={formData.keyPointsDiscussed} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Challenges/Issues Raised by Care Center" name="challengesCareCenter" value={formData.challengesCareCenter} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Challenges/Issues Raised by Hospital" name="challengesHospital" value={formData.challengesHospital} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Resolution Implemented for Each Issue" name="resolutionImplemented" value={formData.resolutionImplemented} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <SelectField label="Current Documentation Mode at Bedside" name="documentationMode" value={formData.documentationMode} onChange={handleChange} options={DOCUMENTATION_MODES} required readOnly={isReadOnly} />
              <TextAreaField label="List RADAR-Specific Issues That the Hospital Has" name="radarSpecificIssues" value={formData.radarSpecificIssues} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <SelectField label="Solution Given for the Issues" name="solutionGiven" value={formData.solutionGiven} onChange={handleChange} options={SOLUTION_GIVEN_OPTIONS} required readOnly={isReadOnly} />
              <SelectField label="Issue Identified and Assigned To" name="issueAssignedTo" value={formData.issueAssignedTo} onChange={handleChange} options={ISSUE_ASSIGNED_TO_OPTIONS} required readOnly={isReadOnly} />
              <RadioGroupField label="Expansion Opportunity Identified?" name="expansionOpportunity" value={formData.expansionOpportunity} onChange={handleChange} required readOnly={isReadOnly} />
              {formData.expansionOpportunity && (
                <SelectField label="Reason for Expansion Opportunity" name="expansionReason" value={formData.expansionReason} onChange={handleChange} options={EXPANSION_REASON_OPTIONS} required readOnly={isReadOnly} />
              )}
              <InputField label="NABH Status" name="nabhStatus" value={formData.nabhStatus} onChange={handleChange} required readOnly={isReadOnly} />
              <TextAreaField label="Why are Rounds Not Regular with the Care Center (mark N/A if 100%)" name="roundsNotRegularReason" value={formData.roundsNotRegularReason} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Support Needed from Hospital" name="supportNeededFromHospital" value={formData.supportNeededFromHospital} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Next Steps Agreed with Hospital" name="nextSteps" value={formData.nextSteps} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
            </Section>

            <Section title="III. Observation & Rating">
              <SelectField label="Overall Nursing Staff Response" name="nursingStaffResponse" value={formData.nursingStaffResponse} onChange={handleChange} options={STAFF_RESPONSE_OPTIONS} required readOnly={isReadOnly} />
              <SelectField label="Overall Response from Owner" name="ownerResponse" value={formData.ownerResponse} onChange={handleChange} options={STAFF_RESPONSE_OPTIONS} required readOnly={isReadOnly} />
              <RatingField label="On a Scale of 1–5, How Would You Rate the Effectiveness of the Solutions Provided/Suggested?" name="solutionEffectivenessRating" value={formData.solutionEffectivenessRating} onChange={handleRatingChange} required readOnly={isReadOnly} />
              <SelectField label="Most Critical Immediate Need Identified During the Visit" name="criticalImmediateNeed" value={formData.criticalImmediateNeed} onChange={handleChange} options={CRITICAL_NEED_OPTIONS} required readOnly={isReadOnly} />
              <TextAreaField label="Overall Relationship with Hospital Staff After This Visit" name="relationshipWithStaff" value={formData.relationshipWithStaff} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="Overall Proactiveness of the Hospital in Addressing Issues" name="hospitalProactiveness" value={formData.hospitalProactiveness} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <SelectField label="Estimated Time Frame for Hospital to Implement Agreed-Upon Next Steps" name="implementationTimeFrame" value={formData.implementationTimeFrame} onChange={handleChange} options={IMPLEMENTATION_TIMEFRAME_OPTIONS} required readOnly={isReadOnly} />
              <FileUploadField label="Retraining or Training of New Staff + Assessment (Attach Pic if Done)" name="retrainingAssessment" files={formData.retrainingAssessment} onChange={handleFileChange} readOnly={isReadOnly} description="PNG, JPG, or PDF" />
              <TextAreaField label="If No Assessment, Reason for Not Conducting" name="noAssessmentReason" value={formData.noAssessmentReason} onChange={handleChange} readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
              <TextAreaField label="RNL’s Own Notes / Impressions (Unspoken Issues, Staff Attitude, etc.)" name="rnlOwnNotes" value={formData.rnlOwnNotes} onChange={handleChange} required readOnly={isReadOnly} onAutoCorrect={autoCorrectProp} />
            </Section>
            
            <div className="flex flex-wrap items-center justify-end gap-4 pt-4 pb-8 sm:pb-0 px-4 sm:px-0">
              <div className="text-sm text-gray-500 mr-auto" aria-live="polite">
                {isReadOnly 
                  ? 'Viewing in read-only mode.'
                  : lastSaved 
                    ? `Last saved: ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Auto-saving is enabled.'
                }
              </div>
              {!isReadOnly && (
                <button
                    type="button"
                    onClick={() => handleSaveDraft(true)}
                    className="px-6 py-3 bg-white text-gray-700 font-bold rounded-lg border border-gray-300 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105 duration-300 ease-in-out"
                  >
                    Save Draft
                </button>
              )}
              <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-transform transform hover:scale-105 duration-300 ease-in-out disabled:opacity-50 disabled:cursor-wait"
                >
                  {isGeneratingPdf ? 'Generating PDF...' : 'Download as PDF'}
              </button>
              {!isReadOnly && (
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105 duration-300 ease-in-out">
                  Submit Report & Download CSV
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;