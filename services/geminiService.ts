
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFeedbackAnalysis = async (
  consultantName: string,
  description: string,
  negativePoints: string[],
  score: number
): Promise<string> => {
  
  const prompt = `
    Você é um especialista sênior em Garantia de Qualidade (QA) para Call Centers de vendas educacionais.
    Analise os seguintes dados de uma monitoria realizada:
    
    Consultor: ${consultantName}
    Nota Final: ${score.toFixed(2)}%
    Descrição do Contato: "${description}"
    Pontos de Atenção (Respostas "Não" ou Falhas Graves): 
    ${negativePoints.map(p => `- ${p}`).join('\n')}

    Tarefa:
    Escreva um feedback construtivo, profissional e motivador.
    
    Diretrizes:
    1. Se houver "FALHA GRAVE", o tom deve ser sério e corretivo, focando na conformidade imediata.
    2. Se a nota for baixa (<60%) mas sem falha grave, foque em plano de ação e recuperação.
    3. Se a nota for alta, reconheça os méritos e sugira pequenos polimentos.
    4. Agrupe o feedback por blocos (Ex: Abordagem, Negociação) se possível.
    5. Use formatação Markdown (negrito para pontos chaves).
    6. Seja empático mas firme nos pontos de correção.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Não foi possível gerar o feedback automático.";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Erro ao conectar com o assistente de IA. Verifique sua chave de API.";
  }
};
