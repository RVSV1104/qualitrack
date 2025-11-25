
import { Evaluation, AnswerValue, WorkflowStatus } from '../types';
import { FORM_SECTIONS, REASONS_NO_SALE, WORKFLOW_STATUSES } from '../constants';

// Map internal keys to CSV Headers (Spreadsheet columns)
const HEADER_MAP: Record<string, string> = {
  timestamp: 'Carimbo de data/hora',
  month: 'Mês',
  week: 'Semana',
  year: 'Ano',
  date: 'Data do Contato',
  consultantName: 'Nome do consultor',
  monitorName: 'Monitor (a) Responsável:',
  center: 'Central de Atendimento:',
  base: 'Base de Atendimento:',
  shift: 'Turno do Agente:',
  cycle: 'Ciclo de Monitoria:',
  contactLink: 'Link do Contato:',
  channel: 'Canal de Atendimento:',
  saleEffective: 'A venda foi efetivada?',
  noSaleReason: 'Motivo da não venda',
  finalScore: 'Nota final',
  criticality: 'Nível de criticidade',
  feedbackStatus: 'Status feedback',
  status: 'Status da Análise',
  acknowledgedAt: 'Data da ciência',
  hasCriticalFailure: 'Falha Grave',
  criticalFailureReason: 'Motivo Falha Grave',
  notes: 'Descrição do contato',
  pros: 'Pontos positivos',
  cons: 'Pontos de melhoria'
};

// Helper to parse different date formats to ISO string
// CRITICAL: Handles "DD/MM/YYYY HH:mm:ss" which is common in Google Sheets/Excel exports
const parseToISO = (dateStr: string): string | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    let d: Date | null = null;

    const cleanStr = dateStr.trim();

    // Try ISO (YYYY-MM-DD)
    if (cleanStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        d = new Date(cleanStr);
    } 
    // Try BR DD/MM/YYYY HH:mm:ss or DD/MM/YYYY
    else if (cleanStr.includes('/')) {
        const [datePart, timePart] = cleanStr.split(' ');
        const parts = datePart.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS Month is 0-indexed
            const year = parseInt(parts[2], 10);
            
            if (timePart) {
                const [h, m, s] = timePart.split(':').map(x => parseInt(x, 10) || 0);
                d = new Date(year, month, day, h, m, s);
            } else {
                d = new Date(year, month, day);
            }
        }
    }

    // Validate date
    if (d && !isNaN(d.getTime())) {
        // Adjust for timezone offset if necessary, or keep as UTC/ISO
        // For simplicity in this context, ISO string works well for sorting/filtering
        return d.toISOString();
    }

    return null;
};

export const exportEvaluationsToCSV = (evaluations: Evaluation[]) => {
  // 1. Build Headers
  const staticHeaders = Object.values(HEADER_MAP);
  
  // Question Headers
  const questionHeaders: string[] = [];
  const questionIdMap: Record<string, string> = {}; // Text -> ID
  
  FORM_SECTIONS.forEach(section => {
    section.questions.forEach(q => {
      questionHeaders.push(q.text);
      questionIdMap[q.text] = q.id;
    });
  });

  const allHeaders = [...staticHeaders, ...questionHeaders];
  
  // 2. Build Rows
  const rows = evaluations.map(ev => {
    // Map static fields
    const staticData = Object.keys(HEADER_MAP).map(key => {
      const val = ev[key as keyof Evaluation];
      
      if (key === 'saleEffective' || key === 'hasCriticalFailure') return val ? 'Sim' : 'Não';
      if (key === 'status' && !val) return 'Monitorado'; 
      if (val === undefined || val === null) return '';
      
      // Escape quotes for CSV
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes(';')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    });

    // Map answers
    const answerData = questionHeaders.map(headerText => {
      const qId = questionIdMap[headerText];
      return ev.answers[qId] || 'N/A';
    });

    return [...staticData, ...answerData].join(';');
  });

  // 3. Combine
  const csvContent = "\uFEFF" + [allHeaders.join(';'), ...rows].join('\n');

  // 4. Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `monitorias_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSVToEvaluations = async (file: File): Promise<Evaluation[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return resolve([]);

        // 1. Robust CSV Parsing (State Machine)
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentVal = '';
        let inQuotes = false;
        
        // Detect delimiter
        const firstLineEnd = text.indexOf('\n');
        const firstChunk = text.substring(0, firstLineEnd > -1 ? firstLineEnd : 500);
        const semicolonCount = (firstChunk.match(/;/g) || []).length;
        const commaCount = (firstChunk.match(/,/g) || []).length;
        const tabCount = (firstChunk.match(/\t/g) || []).length;
        
        let delimiter = ',';
        if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
        else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentVal += '"';
                        i++; 
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentVal += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === delimiter) {
                    currentRow.push(currentVal.trim()); 
                    currentVal = '';
                } else if (char === '\n' || char === '\r') {
                    if (char === '\r' && nextChar === '\n') i++; 
                    
                    currentRow.push(currentVal.trim());
                    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
        }
        // Push last row
        if (currentVal || currentRow.length > 0) {
             currentRow.push(currentVal.trim());
             if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
                rows.push(currentRow);
             }
        }

        if (rows.length < 2) return resolve([]);

        // 2. Header Matching
        const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
        
        const findHeaderIndex = (key: string) => {
             const expected = HEADER_MAP[key];
             if (!expected) return -1;
             
             let idx = headers.indexOf(expected);
             if (idx !== -1) return idx;

             const expectedNoColon = expected.replace(':', '').trim();
             idx = headers.indexOf(expectedNoColon);
             if (idx !== -1) return idx;

             idx = headers.findIndex(h => h.toLowerCase() === expected.toLowerCase() || h.toLowerCase() === expectedNoColon.toLowerCase());
             if (idx !== -1) return idx;
             
             return -1;
        };

        const keyIndices: Record<string, number> = {};
        Object.keys(HEADER_MAP).forEach(key => {
             keyIndices[key] = findHeaderIndex(key);
        });

        const questionMap: Record<number, string> = {};
        FORM_SECTIONS.forEach(section => {
            section.questions.forEach(q => {
                const index = headers.findIndex(h => h.toLowerCase().includes(q.text.substring(0, 20).toLowerCase()));
                if (index !== -1) {
                    questionMap[index] = q.id;
                }
            });
        });

        const newEvaluations: Evaluation[] = [];

        // 3. Process Rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < headers.length / 2) continue;

            const answers: Record<string, AnswerValue> = {};
            
            Object.keys(questionMap).forEach(indexStr => {
                const index = parseInt(indexStr);
                const val = row[index];
                if (val) {
                    const cleanVal = val.trim();
                    if (cleanVal === 'Sim' || cleanVal === 'Não' || cleanVal === 'N/A' || cleanVal === 'Não se aplica') {
                        answers[questionMap[index]] = cleanVal === 'Não se aplica' ? 'N/A' : cleanVal as AnswerValue;
                    }
                }
            });

            const evalObj: any = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                answers,
                feedbackStatus: 'Pendente',
                status: 'Monitorado',
                // DO NOT set a default date here yet, wait to parse it
                consultantName: 'Consultor Desconhecido',
                finalScore: 0,
                sectionScores: {} 
            };

            Object.keys(HEADER_MAP).forEach(key => {
                const index = keyIndices[key];
                if (index !== -1 && row[index] !== undefined) {
                    let val = row[index];
                    
                    if (key === 'saleEffective' || key === 'hasCriticalFailure') {
                        evalObj[key] = val?.toLowerCase() === 'sim';
                    } else if (key === 'finalScore') {
                        let score = parseFloat(val?.replace(',', '.') || '0');
                        if (isNaN(score)) score = 0;
                        evalObj[key] = score;
                    } else if (key === 'year' || key === 'week') {
                         // Remove potential weird characters
                         evalObj[key] = parseInt(val?.replace(/\D/g, '') || '0');
                    } else if (key === 'status') {
                         const knownStatus = WORKFLOW_STATUSES.find(s => s.status === val);
                         if (knownStatus) evalObj[key] = val;
                    } else {
                        evalObj[key] = val;
                    }
                }
            });

            // --- ROBUST DATE PARSING LOGIC ---
            // Priority: 1. Data do Contato (date column)
            //           2. Carimbo de data/hora (timestamp column)
            //           3. Fallback to Today (Last Resort)
            
            let validDate: Date | null = null;
            let isoDate: string | null = null;

            // Try 'Data do Contato'
            if (evalObj.date) {
                isoDate = parseToISO(evalObj.date);
            }
            
            // If not found or invalid, try 'Carimbo de data/hora'
            if (!isoDate && evalObj.timestamp) {
                isoDate = parseToISO(evalObj.timestamp);
            }

            if (isoDate) {
                evalObj.date = isoDate;
                validDate = new Date(isoDate);
            } else {
                // Only if absolutely no date could be parsed
                console.warn(`Could not parse date for row ${i}, defaulting to today. Raw Date: ${evalObj.date}, Raw Timestamp: ${evalObj.timestamp}`);
                validDate = new Date();
                evalObj.date = validDate.toISOString();
            }

            // Derive metadata if missing from CSV
            if (validDate && !isNaN(validDate.getTime())) {
                // If month is missing or looks like a placeholder, derive it
                if (!evalObj.month) evalObj.month = validDate.toLocaleString('pt-BR', { month: 'long' });
                
                // If year is missing or 0, derive it
                if (!evalObj.year) evalObj.year = validDate.getFullYear();
                
                // If week is missing or 0, derive it
                if (!evalObj.week) {
                    const firstDay = new Date(validDate.getFullYear(), 0, 1);
                    const pastDays = (validDate.getTime() - firstDay.getTime()) / 86400000;
                    evalObj.week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
                }
            }

            // Recalculate scores if imported as 0 or missing
            if (evalObj.finalScore === 0 || !evalObj.sectionScores || Object.keys(evalObj.sectionScores).length === 0) {
                let totalPoints = 0;
                let totalWeight = 0;
                
                if (evalObj.hasCriticalFailure) {
                    evalObj.finalScore = 0;
                    FORM_SECTIONS.forEach(s => { if (!evalObj.sectionScores) evalObj.sectionScores = {}; evalObj.sectionScores[s.id] = 0; });
                } else {
                    if (!evalObj.sectionScores) evalObj.sectionScores = {};
                    
                    FORM_SECTIONS.forEach(section => {
                        let sPoints = 0;
                        let sApp = 0;
                        section.questions.forEach(q => {
                            const ans = answers[q.id];
                            if (ans && ans !== 'N/A') {
                                sApp++;
                                if (ans === 'Sim') sPoints++;
                            }
                        });
                        
                        let sectionScore = 0;
                        if (sApp > 0) {
                            sectionScore = (sPoints / sApp) * section.weight;
                            totalPoints += sectionScore;
                        }
                        
                        evalObj.sectionScores[section.id] = sectionScore;
                        totalWeight += section.weight;
                    });
                    
                    // Only overwrite finalScore if it was 0/missing
                    if (evalObj.finalScore === 0) evalObj.finalScore = totalPoints;
                }
            }

            // Safety check for NaN finalScore
            if (isNaN(evalObj.finalScore)) evalObj.finalScore = 0;

            if (!evalObj.criticality) {
                 if (evalObj.hasCriticalFailure) evalObj.criticality = 'CRÍTICO';
                 else if (evalObj.finalScore >= 90) evalObj.criticality = 'ÓTIMO';
                 else if (evalObj.finalScore >= 80) evalObj.criticality = 'BOM';
                 else if (evalObj.finalScore >= 70) evalObj.criticality = 'REGULAR';
                 else evalObj.criticality = 'CRÍTICO';
            }

            newEvaluations.push(evalObj as Evaluation);
        }

        resolve(newEvaluations);

      } catch (error) {
        reject(error);
      }
    };
    
    reader.readAsText(file);
  });
};
