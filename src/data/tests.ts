import type { AgeGroupEntry, LabTest, SampleType, SampleTypeEntry, SubTest } from '../types'

export const CATEGORIES = [
  'Hematology',
  'Biochemistry',
  'Clinical Pathology',
  'Microbiology',
  'Immunology',
  'Hormones',
  'Serology',
] as const

/** Starting Sample Type Master. Container colours follow common phlebotomy conventions. */
export const DEFAULT_SAMPLE_TYPES: SampleTypeEntry[] = [
  { id: 'edta', name: 'EDTA Blood', cap: '#7e5bb5', liquid: '#8d1f2a', container: 'Lavender cap, EDTA' },
  { id: 'serum', name: 'Serum', cap: '#d9a521', liquid: '#a33a2c', container: 'Gold cap, SST' },
  { id: 'fluoride', name: 'Fluoride Plasma', cap: '#7d8490', liquid: '#8d1f2a', container: 'Grey cap, fluoride' },
  { id: 'citrate', name: 'Citrate Plasma', cap: '#4fa3d9', liquid: '#8d1f2a', container: 'Blue cap, citrate' },
  { id: 'urine', name: 'Urine', cap: '#e7c33d', liquid: '#dcc056', container: 'Sterile urine cup' },
  { id: 'stool', name: 'Stool', cap: '#8b5e3c', liquid: '#8b6b4a', container: 'Stool container' },
  { id: 'swab', name: 'Swab', cap: '#c7cdc9', liquid: '#d5dcd8', container: 'Swab with transport medium' },
  { id: 'sputum', name: 'Sputum', cap: '#4e9e6b', liquid: '#c9c6a2', container: 'Sputum cup' },
]

export const DEFAULT_AGE_GROUPS: AgeGroupEntry[] = [
  { id: 'age-child', name: 'Child', ageFrom: 0, ageTo: 12, gender: 'Any' },
  { id: 'age-adult-m', name: 'Adult Male', ageFrom: 13, ageTo: 59, gender: 'Male' },
  { id: 'age-adult-f', name: 'Adult Female', ageFrom: 13, ageTo: 59, gender: 'Female' },
  { id: 'age-senior-m', name: 'Senior Male', ageFrom: 60, ageTo: 120, gender: 'Male' },
  { id: 'age-senior-f', name: 'Senior Female', ageFrom: 60, ageTo: 120, gender: 'Female' },
]

/** Sample figures for the prototype, in age group order. A real lab would enter its own validated ranges. */
const SAMPLE_RANGES: Record<string, string[]> = {
  Hemoglobin: ['11.0 – 14.5', '13.0 – 17.0', '12.0 – 15.5', '12.5 – 16.5', '11.5 – 15.5'],
  'RBC Count': ['4.0 – 5.2', '4.5 – 5.5', '3.8 – 4.8', '4.2 – 5.4', '3.8 – 5.0'],
  PCV: ['34 – 42', '40 – 50', '36 – 46', '38 – 48', '35 – 45'],
  ESR: ['0 – 10', '0 – 15', '0 – 20', '0 – 20', '0 – 30'],
  'Serum Creatinine': ['0.3 – 0.7', '0.7 – 1.3', '0.6 – 1.1', '0.7 – 1.4', '0.6 – 1.2'],
  'Uric Acid': ['2.0 – 5.5', '3.4 – 7.0', '2.4 – 5.7', '3.4 – 7.5', '2.5 – 6.5'],
  'HDL Cholesterol': ['> 45', '> 40', '> 50', '> 40', '> 50'],
}

/** Starting ranges for a catalogue sub-test: the sample figures where they exist, otherwise one figure for every group. */
function startingRanges(name: string, range: string) {
  return Object.fromEntries(DEFAULT_AGE_GROUPS.map((group, index) => [group.id, SAMPLE_RANGES[name]?.[index] ?? range]))
}

/** Older saved tests kept one default range per sub-test. It moves into the empty group boxes so no figure is lost. */
export function moveDefaultRanges(tests: LabTest[], groups: AgeGroupEntry[]): LabTest[] {
  return tests.map((test) => ({
    ...test,
    subTests: test.subTests.map((subTest) => {
      const { range, ...rest } = subTest as SubTest & { range?: string }
      if (range === undefined) return subTest
      const existing = rest.ranges ?? startingRanges(rest.name, range)
      return { ...rest, ranges: Object.fromEntries(groups.map((group) => [group.id, existing[group.id]?.trim() || range])) }
    }),
  }))
}

const sub = (name: string, unit: string, range: string): SubTest => ({ name, unit, ranges: startingRanges(name, range) })

function test(
  code: string,
  name: string,
  category: string,
  sampleType: SampleType,
  price: number,
  tatHours: number,
  description: string,
  subTests: SubTest[],
): LabTest {
  return { id: code, code, name, category, sampleType, price, tatHours, description, active: true, subTests }
}

export const TEST_CATALOGUE: LabTest[] = [
  test('HEM001', 'Complete Blood Count (CBC)', 'Hematology', 'EDTA Blood', 350, 4, 'Automated count of red cells, white cells and platelets with indices.', [
    sub('Hemoglobin', 'g/dL', '13.0 – 17.0'),
    sub('RBC Count', 'mill/µL', '4.5 – 5.5'),
    sub('Total WBC Count', 'cells/µL', '4000 – 11000'),
    sub('Platelet Count', 'lakh/µL', '1.5 – 4.5'),
    sub('PCV', '%', '40 – 50'),
    sub('MCV', 'fL', '83 – 101'),
    sub('MCH', 'pg', '27 – 32'),
    sub('MCHC', 'g/dL', '31.5 – 34.5'),
    sub('Neutrophils', '%', '40 – 80'),
    sub('Lymphocytes', '%', '20 – 40'),
  ]),
  test('HEM002', 'Erythrocyte Sedimentation Rate', 'Hematology', 'EDTA Blood', 120, 2, 'Westergren method, reported at one hour.', [sub('ESR', 'mm/hr', '0 – 15')]),
  test('HEM003', 'Peripheral Smear Examination', 'Hematology', 'EDTA Blood', 250, 6, 'Microscopic review of red cell, white cell and platelet morphology.', [
    sub('RBC Morphology', '', 'Normocytic normochromic'),
    sub('WBC Morphology', '', 'Normal'),
    sub('Platelets on Smear', '', 'Adequate'),
  ]),
  test('HEM004', 'Blood Group & Rh Typing', 'Hematology', 'EDTA Blood', 150, 1, 'Forward and reverse ABO grouping with Rh(D) typing.', [sub('ABO Group', '', 'A / B / AB / O'), sub('Rh Factor', '', 'Positive / Negative')]),
  test('HEM005', 'Prothrombin Time (PT / INR)', 'Hematology', 'Citrate Plasma', 380, 3, 'Extrinsic coagulation pathway screen for anticoagulant monitoring.', [
    sub('Prothrombin Time', 'sec', '11 – 13.5'),
    sub('Control', 'sec', '12'),
    sub('INR', '', '0.8 – 1.2'),
  ]),
  test('BIO001', 'Fasting Blood Sugar (FBS)', 'Biochemistry', 'Fluoride Plasma', 90, 2, 'Plasma glucose after at least 8 hours of fasting.', [sub('Glucose, Fasting', 'mg/dL', '70 – 100')]),
  test('BIO002', 'Post Prandial Blood Sugar (PPBS)', 'Biochemistry', 'Fluoride Plasma', 90, 2, 'Plasma glucose two hours after a meal.', [sub('Glucose, Post Prandial', 'mg/dL', '< 140')]),
  test('BIO003', 'Random Blood Sugar (RBS)', 'Biochemistry', 'Fluoride Plasma', 80, 1, 'Plasma glucose at any time of day.', [sub('Glucose, Random', 'mg/dL', '< 200')]),
  test('BIO004', 'HbA1c (Glycated Hemoglobin)', 'Biochemistry', 'EDTA Blood', 480, 4, 'Average blood glucose over the previous three months.', [
    sub('HbA1c', '%', '< 5.7'),
    sub('Estimated Average Glucose', 'mg/dL', '< 117'),
  ]),
  test('BIO005', 'Lipid Profile', 'Biochemistry', 'Serum', 650, 5, 'Fasting cholesterol fractions and triglycerides for cardiac risk.', [
    sub('Total Cholesterol', 'mg/dL', '< 200'),
    sub('Triglycerides', 'mg/dL', '< 150'),
    sub('HDL Cholesterol', 'mg/dL', '> 40'),
    sub('LDL Cholesterol', 'mg/dL', '< 100'),
    sub('VLDL Cholesterol', 'mg/dL', '< 30'),
    sub('TC / HDL Ratio', '', '< 4.5'),
  ]),
  test('BIO006', 'Liver Function Test (LFT)', 'Biochemistry', 'Serum', 750, 5, 'Bilirubin, enzymes and proteins for hepatic assessment.', [
    sub('Total Bilirubin', 'mg/dL', '0.2 – 1.2'),
    sub('Direct Bilirubin', 'mg/dL', '0 – 0.3'),
    sub('SGOT (AST)', 'U/L', '< 40'),
    sub('SGPT (ALT)', 'U/L', '< 41'),
    sub('Alkaline Phosphatase', 'U/L', '40 – 129'),
    sub('Total Protein', 'g/dL', '6.4 – 8.3'),
    sub('Albumin', 'g/dL', '3.5 – 5.2'),
    sub('Globulin', 'g/dL', '2.0 – 3.5'),
  ]),
  test('BIO007', 'Kidney Function Test (KFT)', 'Biochemistry', 'Serum', 700, 5, 'Urea, creatinine, uric acid and electrolytes for renal assessment.', [
    sub('Blood Urea', 'mg/dL', '15 – 45'),
    sub('Serum Creatinine', 'mg/dL', '0.7 – 1.3'),
    sub('Uric Acid', 'mg/dL', '3.4 – 7.0'),
    sub('Sodium', 'mmol/L', '136 – 145'),
    sub('Potassium', 'mmol/L', '3.5 – 5.1'),
    sub('Chloride', 'mmol/L', '98 – 107'),
  ]),
  test('BIO008', 'Serum Electrolytes', 'Biochemistry', 'Serum', 520, 3, 'Sodium, potassium and chloride by ion selective electrode.', [
    sub('Sodium', 'mmol/L', '136 – 145'),
    sub('Potassium', 'mmol/L', '3.5 – 5.1'),
    sub('Chloride', 'mmol/L', '98 – 107'),
  ]),
  test('BIO009', 'Serum Uric Acid', 'Biochemistry', 'Serum', 180, 3, 'Screening for gout and purine metabolism disorders.', [sub('Uric Acid', 'mg/dL', '3.4 – 7.0')]),
  test('BIO010', 'Serum Calcium', 'Biochemistry', 'Serum', 200, 3, 'Total calcium in serum.', [sub('Calcium, Total', 'mg/dL', '8.6 – 10.2')]),
  test('CLP001', 'Urine Routine Examination', 'Clinical Pathology', 'Urine', 120, 2, 'Physical, chemical and microscopic examination of urine.', [
    sub('Colour & Appearance', '', 'Pale yellow, clear'),
    sub('Specific Gravity', '', '1.005 – 1.030'),
    sub('pH', '', '4.6 – 8.0'),
    sub('Protein', '', 'Nil'),
    sub('Glucose', '', 'Nil'),
    sub('Pus Cells', '/HPF', '0 – 5'),
    sub('RBC', '/HPF', 'Nil'),
    sub('Epithelial Cells', '/HPF', '0 – 5'),
  ]),
  test('CLP002', 'Stool Routine Examination', 'Clinical Pathology', 'Stool', 150, 3, 'Macroscopic and microscopic examination including ova and cysts.', [
    sub('Consistency', '', 'Formed'),
    sub('Occult Blood', '', 'Negative'),
    sub('Ova & Cysts', '', 'Not seen'),
  ]),
  test('CLP003', 'Urine Microalbumin', 'Clinical Pathology', 'Urine', 450, 5, 'Early marker of diabetic nephropathy.', [sub('Microalbumin', 'mg/L', '< 20'), sub('Albumin / Creatinine Ratio', 'mg/g', '< 30')]),
  test('MIC001', 'Urine Culture & Sensitivity', 'Microbiology', 'Urine', 800, 72, 'Identification of urinary pathogens with antibiotic sensitivity.', [sub('Organism Isolated', '', 'No growth'), sub('Colony Count', 'CFU/mL', '< 10⁴'), sub('Antibiotic Sensitivity', '', 'Panel')]),
  test('MIC002', 'Blood Culture & Sensitivity', 'Microbiology', 'EDTA Blood', 1200, 120, 'Aerobic culture with sensitivity for suspected septicaemia.', [sub('Organism Isolated', '', 'No growth'), sub('Antibiotic Sensitivity', '', 'Panel')]),
  test('MIC003', 'Throat Swab Culture', 'Microbiology', 'Swab', 750, 72, 'Culture for streptococci and other throat pathogens.', [sub('Gram Stain', '', 'Report'), sub('Organism Isolated', '', 'Normal flora')]),
  test('MIC004', 'AFB Smear (Ziehl-Neelsen)', 'Microbiology', 'Sputum', 250, 24, 'Microscopic screen for acid-fast bacilli.', [sub('AFB', '', 'Not seen')]),
  test('IMM001', 'C-Reactive Protein (CRP)', 'Immunology', 'Serum', 450, 3, 'Quantitative marker of acute inflammation.', [sub('CRP', 'mg/L', '< 5')]),
  test('IMM002', 'Rheumatoid Factor', 'Immunology', 'Serum', 400, 4, 'Screening for rheumatoid arthritis.', [sub('RA Factor', 'IU/mL', '< 14')]),
  test('IMM003', 'Antinuclear Antibody (ANA)', 'Immunology', 'Serum', 900, 24, 'Screening for systemic autoimmune disease.', [sub('ANA', 'Index', '< 1.0')]),
  test('IMM004', 'Total IgE', 'Immunology', 'Serum', 800, 24, 'Total immunoglobulin E for allergy evaluation.', [sub('IgE, Total', 'IU/mL', '< 100')]),
  test('HOR001', 'Thyroid Profile (T3, T4, TSH)', 'Hormones', 'Serum', 550, 6, 'Total T3, total T4 and ultrasensitive TSH.', [
    sub('Total T3', 'ng/mL', '0.8 – 2.0'),
    sub('Total T4', 'µg/dL', '5.1 – 14.1'),
    sub('TSH', 'µIU/mL', '0.27 – 4.2'),
  ]),
  test('HOR002', 'Thyroid Stimulating Hormone (TSH)', 'Hormones', 'Serum', 250, 6, 'Ultrasensitive TSH by chemiluminescence.', [sub('TSH', 'µIU/mL', '0.27 – 4.2')]),
  test('HOR003', 'Vitamin D (25-OH)', 'Hormones', 'Serum', 1400, 24, 'Total 25-hydroxy vitamin D.', [sub('25-OH Vitamin D', 'ng/mL', '30 – 100')]),
  test('HOR004', 'Vitamin B12', 'Hormones', 'Serum', 900, 24, 'Serum cobalamin level.', [sub('Vitamin B12', 'pg/mL', '197 – 771')]),
  test('HOR005', 'Prolactin', 'Hormones', 'Serum', 500, 8, 'Serum prolactin by chemiluminescence.', [sub('Prolactin', 'ng/mL', '4.0 – 15.2')]),
  test('HOR006', 'Beta hCG (Quantitative)', 'Hormones', 'Serum', 700, 6, 'Quantitative pregnancy hormone assay.', [sub('Beta hCG', 'mIU/mL', '< 5')]),
  test('SER001', 'HBsAg', 'Serology', 'Serum', 350, 3, 'Hepatitis B surface antigen screen.', [sub('HBsAg', '', 'Non-reactive')]),
  test('SER002', 'HIV I & II Antibody', 'Serology', 'Serum', 450, 4, 'Fourth generation screening assay.', [sub('HIV I & II', '', 'Non-reactive')]),
  test('SER003', 'Anti-HCV', 'Serology', 'Serum', 600, 4, 'Hepatitis C antibody screen.', [sub('Anti-HCV', '', 'Non-reactive')]),
  test('SER004', 'Widal Test', 'Serology', 'Serum', 200, 4, 'Slide agglutination for enteric fever.', [
    sub('S. typhi O', 'titre', '< 1:80'),
    sub('S. typhi H', 'titre', '< 1:80'),
    sub('S. paratyphi AH', 'titre', '< 1:80'),
    sub('S. paratyphi BH', 'titre', '< 1:80'),
  ]),
  test('SER005', 'Dengue Panel (NS1, IgG, IgM)', 'Serology', 'Serum', 900, 4, 'Rapid antigen and antibody detection.', [
    sub('NS1 Antigen', '', 'Negative'),
    sub('IgG Antibody', '', 'Negative'),
    sub('IgM Antibody', '', 'Negative'),
  ]),
  test('SER006', 'VDRL', 'Serology', 'Serum', 150, 3, 'Non-treponemal syphilis screen.', [sub('VDRL', '', 'Non-reactive')]),
]
