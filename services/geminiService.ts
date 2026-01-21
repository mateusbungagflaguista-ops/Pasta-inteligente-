
import { GoogleGenAI, Type } from "@google/genai";
import { SmartFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const offlineFallback = (file: SmartFile) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let folder = "Outros";
  if (['jpg', 'png', 'jpeg', 'webp'].includes(ext!)) folder = "Imagens";
  else if (['pdf', 'docx', 'txt'].includes(ext!)) folder = "Documentos";
  else if (['mp4', 'mov'].includes(ext!)) folder = "Vídeos";
  
  return {
    summary: "Análise limitada (Offline). O mambo requer internet para inteligência total.",
    tags: [ext || 'ficheiro', 'offline'],
    insights: "Estás offline, então só consigo ver a extensão do ficheiro. Liga a rede para eu ler o conteúdo real.",
    suggestedFolder: folder
  };
};

export const analyzeDocument = async (file: SmartFile): Promise<{ summary: string; tags: string[]; insights: string; suggestedFolder: string }> => {
  if (!navigator.onLine) {
    return offlineFallback(file);
  }

  try {
    const prompt = `Analise este arquivo chamado "${file.name}". Forneça um resumo curto, 5 tags relevantes, uma análise inteligente e sugira uma única pasta (ex: Documentos, Imagens, Faturas, Relatórios, Pessoal) para salvá-lo. Se for incerto, sugira 'Revisão Manual'. Responda em Português de Angola (use termos como mambo, fixolas, etc).`;
    
    let contents;
    if (file.isImage) {
      contents = {
        parts: [
          { inlineData: { mimeType: file.type, data: file.content.split(',')[1] } },
          { text: prompt }
        ]
      };
    } else {
      contents = { parts: [{ text: `${prompt}\n\nConteúdo/Metadados: ${file.content.substring(0, 10000)}` }] };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: { type: Type.STRING },
            suggestedFolder: { type: Type.STRING }
          },
          required: ["summary", "tags", "insights", "suggestedFolder"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      summary: result.summary || "Sem resumo",
      tags: result.tags || [],
      insights: result.insights || "",
      suggestedFolder: result.suggestedFolder || "Revisão Manual"
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return offlineFallback(file);
  }
};

export const semanticSearch = async (query: string, files: SmartFile[]): Promise<string[]> => {
  if (!navigator.onLine || files.length === 0) {
    return files.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).map(f => f.id);
  }
  
  try {
    const indexData = files.map(f => ({
      id: f.id,
      name: f.name,
      summary: f.summary,
      tags: f.tags,
      folder: f.suggestedFolder
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [{ 
          text: `Dada a seguinte lista de arquivos indexados em JSON:\n${JSON.stringify(indexData)}\n\nO usuário pesquisou: "${query}". \nRetorne um array JSON contendo apenas os IDs dos arquivos que são semanticamente relevantes para esta busca.` 
        }] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevantIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["relevantIds"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"relevantIds": []}');
    return result.relevantIds || [];
  } catch (error) {
    return files.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).map(f => f.id);
  }
};
