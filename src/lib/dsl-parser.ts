import yaml from 'js-yaml';

export interface Component {
  id: string;
  name: string;
  type: 'actor' | 'service' | 'datastore' | string;
  position?: { x: number; y: number };
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
    if (typeof parsed === 'object' && parsed !== null && 'components' in parsed && 'data_flows' in parsed) {
      return parsed as DslInput;
    }
    throw new Error("Invalid DSL format: Missing 'components' or 'data_flows'.");
  } catch (e: any) {
    try {
      const parsed = JSON.parse(dsl);
      if (typeof parsed === 'object' && parsed !== null && 'components' in parsed && 'data_flows' in parsed) {
        return parsed as DslInput;
      }
      throw new Error("Invalid DSL format: Missing 'components' or 'data_flows'.");
    } catch (jsonError: any) {
      throw new Error(`Failed to parse DSL as YAML or JSON.`);
    }
  }
}

export function dumpDsl(dslObject: DslInput): string {
  const objToDump = { ...dslObject };
  if (objToDump.trust_boundaries && objToDump.trust_boundaries.length === 0) {
    delete objToDump.trust_boundaries;
  }
  return yaml.dump(objToDump, { skipInvalid: true });
}
