'use server';

import { suggestThreatsAndMitigations } from '@/ai/flows/threat-suggestions';
import { generateMermaidDiagram } from '@/lib/mermaid-parser';

interface FormState {
  mermaidDiagram: string | null;
  threats: any | null;
  error: string | null;
}

export async function analyzeThreatsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const dsl = formData.get('dsl') as string;
  const methodology = formData.get('methodology') as 'STRIDE' | 'LINDDUN' | 'PASTA';

  if (!dsl || !methodology) {
    return {
      mermaidDiagram: null,
      threats: null,
      error: 'Missing architecture definition or methodology.',
    };
  }

  try {
    const mermaidDiagram = generateMermaidDiagram(dsl);

    const threats = await suggestThreatsAndMitigations({
      architectureDescription: dsl,
      threatModelingMethodology: methodology,
    });
    
    if (!threats || !threats.threats) {
        return {
            mermaidDiagram: mermaidDiagram,
            threats: null,
            error: 'The AI returned an empty or invalid response. Please try again or adjust your input.'
        }
    }

    return { mermaidDiagram, threats, error: null };
  } catch (e: any) {
    return {
      mermaidDiagram: null,
      threats: null,
      error: e.message || 'An unexpected error occurred.',
    };
  }
}
