import yaml from 'js-yaml';

export interface Component {
  id: string;
  name: string;
  type: 'actor' | 'service' | 'datastore' | string;
}

export interface DataFlow {
  from: string;
  to: string;
  label: string;
}

export interface TrustBoundary {
  id: string;
  label: string;
  components: string[];
}

export interface DslInput {
  components: Component[];
  data_flows: DataFlow[];
  trust_boundaries?: TrustBoundary[];
}

export function parseDsl(dsl: string): DslInput {
  try {
    const parsed = yaml.load(dsl);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Input is not a valid object.');
    }

    if (!('components' in parsed && 'data_flows' in parsed)) {
      throw new Error(
        "Invalid DSL format: The parsed content must be an object containing 'components' and 'data_flows' keys."
      );
    }
    
    // Ensure components without position property don't cause issues downstream
    const cleanParsed = parsed as DslInput;
    if (cleanParsed.components) {
        cleanParsed.components.forEach(c => {
            if ('position' in c) {
                delete (c as any).position;
            }
        });
    }

    return cleanParsed;
  } catch (e: any) {
    // If yaml.load fails, it could be a syntax error in either YAML or JSON
    throw new Error(
      `Failed to parse architecture definition. Please ensure it is valid YAML or JSON. Parser error: ${e.message}`
    );
  }
}

export function dumpDsl(dslObject: DslInput): string {
  const objToDump: any = { ...dslObject };
  if (objToDump.trust_boundaries && objToDump.trust_boundaries.length === 0) {
    delete objToDump.trust_boundaries;
  }
  
  // Ensure no position property is written
  if (objToDump.components) {
      objToDump.components = objToDump.components.map((c: any) => {
          const { position, ...rest } = c;
          return rest;
      });
  }
  
  return yaml.dump(objToDump, { skipInvalid: true, sortKeys: true });
}
