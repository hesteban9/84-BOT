import { DocumentId, DocumentSection } from '../types/chat';

export const DOCUMENTS: Record<
  DocumentId,
  {
    id: DocumentId;
    shortTitle: string;
    title: string;
    subtitle: string;
    totalPages: number;
    url: string;
  }
> = {
  wages: {
    id: 'wages',
    shortTitle: 'Updated Wages (4 pp.)',
    title: '2025–2028 GA LU84 Updated GA Wages',
    subtitle: 'Overhead, Substation, Ductline/NUG & URD Schedules',
    totalPages: 4,
    url: '/assets/aistudio/2025-2028_GA_LU84_UPDATED_GA_Wages_a576ad84.pdf',
  },
  agreement: {
    id: 'agreement',
    shortTitle: 'Full Agreement (38 pp.)',
    title: 'Georgia Statewide Outside Construction Line Agreement',
    subtitle: 'SELCAT / NECA & IBEW Local Union 84 (2025–2028)',
    totalPages: 38,
    url: '/assets/aistudio/Georgia_Statewide_Outside_Line_Agreement_2025-2028_8c525d21.pdf',
  },
};

export const WAGE_HEADLINE_RATES = [
  {
    classification: 'Journeyman Lineman',
    schedule: 'Overhead · Page 1',
    base25: '$44.57',
    pkg25: '$62.32',
    base26: '$46.80',
    base27: '$49.02',
    documentId: 'wages' as DocumentId,
    page: 1,
  },
  {
    classification: 'Substation Tech (95% JL)',
    schedule: 'Substation · Page 2',
    base25: '$42.34',
    pkg25: '$59.61',
    base26: '$44.46',
    base27: '$46.57',
    documentId: 'wages' as DocumentId,
    page: 2,
  },
  {
    classification: 'Ductline / NUG Splicer',
    schedule: 'Ductline & NUG · Page 3',
    base25: '$44.57',
    pkg25: '$62.32',
    base26: '$46.80',
    base27: '$49.02',
    documentId: 'wages' as DocumentId,
    page: 3,
  },
  {
    classification: 'URD Tech (95% JL)',
    schedule: 'Underground URD · Page 4',
    base25: '$42.34',
    pkg25: '$59.61',
    base26: '$44.46',
    base27: '$46.57',
    documentId: 'wages' as DocumentId,
    page: 4,
  },
];

export const PDF_QUICK_JUMPS: Record<
  DocumentId,
  Array<{ label: string; page: number }>
> = {
  wages: [
    { label: 'Overhead p.1', page: 1 },
    { label: 'Substation p.2', page: 2 },
    { label: 'Ductline/NUG p.3', page: 3 },
    { label: 'URD p.4', page: 4 },
  ],
  agreement: [
    { label: 'Scope p.3', page: 3 },
    { label: 'Hours/Gloving p.7', page: 7 },
    { label: 'Wages p.11', page: 11 },
    { label: 'Referral p.15', page: 15 },
    { label: 'Benefits p.20', page: 20 },
    { label: 'MOUs p.28', page: 28 },
  ],
};

export const AGREEMENT_SECTIONS: DocumentSection[] = [
  {
    id: 'wages-overhead',
    documentId: 'wages',
    code: 'Wages p. 1',
    title: 'Overhead Wage & Benefit Schedule',
    summary: '2025–2028 Journeyman, Foreman, Operator & Apprentice rates',
    pdfPage: 1,
    pageLabel: 'Wages PDF p. 1',
    category: 'wages',
    sampleQuestion:
      'Compare the Overhead Journeyman Lineman, Foreman, and 1st–7th Period Apprentice base wages across 2025–2026, 2026–2027, and 2027–2028.',
  },
  {
    id: 'wages-substation',
    documentId: 'wages',
    code: 'Wages p. 2',
    title: 'Substation Wages/Benefits Schedule',
    summary: 'Substation Tech, Foreman, Welder & Tech #1–#7 Apprentice rates',
    pdfPage: 2,
    pageLabel: 'Wages PDF p. 2',
    category: 'wages',
    sampleQuestion:
      'What are the Substation Tech, Welder, and Substation Foreman wages and NEAP percentages for 2025–2028?',
  },
  {
    id: 'wages-ductline',
    documentId: 'wages',
    code: 'Wages p. 3',
    title: 'Ductline & NUG Cable Splicer Schedule',
    summary: 'Ductline Tech, NUG Cable Splicer, Operators & Groundman rates',
    pdfPage: 3,
    pageLabel: 'Wages PDF p. 3',
    category: 'wages',
    sampleQuestion:
      'What are the base wages and total package amounts for Ductline Tech and NUG Cable Splicer in 2025–2026 and 2026–2027?',
  },
  {
    id: 'wages-urd',
    documentId: 'wages',
    code: 'Wages p. 4',
    title: 'URD Wages/Benefits Schedule',
    summary: 'URD Tech, Operator Foreman, Operator & 60%–90% Technician rates',
    pdfPage: 4,
    pageLabel: 'Wages PDF p. 4',
    category: 'wages',
    sampleQuestion:
      'What are the URD Tech, URD Operator, and 60%–90% Technician base wages and NEAP percentages in 2025–2026?',
  },
  {
    id: 'scope',
    documentId: 'agreement',
    code: 'Preamble',
    title: 'Scope & Covered Counties',
    summary: 'Jurisdiction, excluded counties, Basic Principles',
    pdfPage: 3,
    pageLabel: 'Agreement p. 3',
    category: 'agreement',
    sampleQuestion:
      'Which Georgia counties are excluded from this Outside Construction Line Agreement?',
  },
  {
    id: 'art-1',
    documentId: 'agreement',
    code: 'Article I',
    title: 'Effective Date, CIR & Grievances',
    summary: 'Term (2025–2028), 90-day notice, LMC & CIR disputes',
    pdfPage: 3,
    pageLabel: 'Agreement pp. 3–5',
    category: 'agreement',
    sampleQuestion:
      'What is the deadline to bring a grievance in writing and how are unresolved disputes handled under Article I?',
  },
  {
    id: 'art-2',
    documentId: 'agreement',
    code: 'Article II',
    title: 'Employer & Union Rights',
    summary: 'Favored nations, subcontracting, portability, age 50+ ratio',
    pdfPage: 5,
    pageLabel: 'Agreement pp. 5–7',
    category: 'agreement',
    sampleQuestion:
      'How many non-resident bargaining unit employees can a signatory employer bring in under Portability (Section 2.10)?',
  },
  {
    id: 'art-3-hours',
    documentId: 'agreement',
    code: 'Article III',
    title: 'Hours, Holidays, Safety & Crews',
    summary: '5-8s/4-10s, $18 meal, show-up pay, 25KV/46KV gloving, tools',
    pdfPage: 7,
    pageLabel: 'Agreement pp. 7–15',
    category: 'agreement',
    sampleQuestion:
      'What are the crew size and glove requirements for gloving 25KV and 46KV lines under Section 3.06?',
  },
  {
    id: 'art-4',
    documentId: 'agreement',
    code: 'Article IV',
    title: 'Referral Procedure',
    summary: 'Classifications A/B/C, Groups I–IV, 30-day renewal, Appeals',
    pdfPage: 15,
    pageLabel: 'Agreement pp. 15–19',
    category: 'agreement',
    sampleQuestion:
      'What are the requirements for Classification A Group I and how often must an applicant renew on the Out of Work List?',
  },
  {
    id: 'art-5-6',
    documentId: 'agreement',
    code: 'Articles V–VI',
    title: 'Apprenticeship & Fringe Benefits',
    summary: 'SELCAT 1.5%, NEBF 3%, LINECO $7.50, HRA, NEAP',
    pdfPage: 20,
    pageLabel: 'Agreement pp. 20–22',
    category: 'agreement',
    sampleQuestion:
      'What are the employer LINECO hourly contribution caps and HRA contribution rates from 2025 through 2028?',
  },
  {
    id: 'art-7-10',
    documentId: 'agreement',
    code: 'Articles VII–X',
    title: 'Industry, LMCC, NLMCC & AMF',
    summary: 'NEIF, Local LMCC, NLMCC (1¢/hr), AMF ($0.15/hr)',
    pdfPage: 22,
    pageLabel: 'Agreement pp. 22–25',
    category: 'agreement',
    sampleQuestion:
      'What are the contribution rates and delinquency penalties for NLMCC and the Administrative Maintenance Fund?',
  },
  {
    id: 'art-11-14',
    documentId: 'agreement',
    code: 'Articles XI–XIV',
    title: 'Safety, Training, Substance & Code',
    summary: 'Required certs ($50 pay), cell phones, drug testing, separability',
    pdfPage: 25,
    pageLabel: 'Agreement pp. 25–26',
    category: 'agreement',
    sampleQuestion:
      'Which safety certifications are employees required to obtain under Section 11.02 and what is the compensation?',
  },
  {
    id: 'mou-urd',
    documentId: 'agreement',
    code: 'Underground MOU',
    title: 'Underground (URD) Memorandum',
    summary: 'URD Tech duties, restrictions, URD agreement terms (U-1 to U-4)',
    pdfPage: 28,
    pageLabel: 'Agreement pp. 28–31',
    category: 'mou',
    sampleQuestion:
      'What work is a URD Technician restricted from performing under the Underground MOU?',
  },
  {
    id: 'mou-sub',
    documentId: 'agreement',
    code: 'Substation MOU',
    title: 'Substation Memorandum',
    summary: 'Substation scope, employer crew structure (S-1 to S-3)',
    pdfPage: 32,
    pageLabel: 'Agreement pp. 32–34',
    category: 'mou',
    sampleQuestion:
      'Who determines crew structure and overtime pay under the Substation MOU?',
  },
  {
    id: 'mou-ductline',
    documentId: 'agreement',
    code: 'Ductline MOU',
    title: 'Underground Ductline / Network MOU',
    summary: 'Ductline Tech & NUG Cable Splicer duties, 500V rule (pp. 35–38)',
    pdfPage: 35,
    pageLabel: 'Agreement pp. 35–38',
    category: 'mou',
    sampleQuestion:
      'What is the energized cable voltage rule for NUG Cable Splicers in the Underground Ductline / Network MOU?',
  },
];

export const STARTER_QUESTIONS = [
  {
    category: 'Updated Wage Schedules',
    question:
      'What are the Journeyman Lineman, Substation Tech, Ductline Tech, and URD Tech base wages for 2025–2026, 2026–2027, and 2027–2028?',
  },
  {
    category: 'Safety & Gloving',
    question:
      'What are the minimum crew sizes and rules for gloving 25KV and 46KV lines?',
  },
  {
    category: 'LINECO & HRA Rules',
    question:
      'How do the employer LINECO annual increase caps ($0.50 / $0.25 / $0.15) interact with the HRA Benny Card contribution from 2026 to 2028?',
  },
  {
    category: 'Hours, Meals & Holidays',
    question:
      'Which holidays are paid under Section 3.03(b), and what is the emergency meal compensation past 7:00 PM?',
  },
];
