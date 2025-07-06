'use server';

import { suggestThreatsAndMitigations, ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import { parseDsl, Component } from '@/lib/dsl-parser';

interface FormState {
  threats: ThreatSuggestionsOutput | null;
  error: string | null;
  components: Component[] | null;
  analyzedDsl: string | null;
}

export async function analyzeThreatsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const dsl = formData.get('dsl') as string;
  const methodology = formData.get('methodology') as 'STRIDE' | 'LINDDUN' | 'PASTA' | 'OWASP Top 10' | 'OWASP API Top 10' | 'MITRE ATT&CK' | 'OCTAVE';

  if (!dsl || !methodology) {
    return {
      threats: null,
      error: 'Missing architecture definition or methodology.',
      components: null,
      analyzedDsl: null,
    };
  }

  try {
    // Validate the DSL syntax before proceeding
    const parsedDsl = parseDsl(dsl);

    const threats = await suggestThreatsAndMitigations({
      architectureDescription: dsl,
      threatModelingMethodology: methodology,
    });
    
    if (!threats || !threats.threats) {
        return {
            threats: null,
            error: 'The AI returned an empty or invalid response. Please try again or adjust your input.',
            components: null,
            analyzedDsl: null,
        }
    }

    return { threats, error: null, components: parsedDsl.components, analyzedDsl: dsl };
  } catch (e: any) {
    return {
      threats: null,
      error: e.message || 'An unexpected error occurred.',
      components: null,
      analyzedDsl: null,
    };
  }
}
