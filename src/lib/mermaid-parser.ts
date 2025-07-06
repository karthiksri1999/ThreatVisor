import yaml from 'js-yaml';

interface Component {
  id: string;
  name: string;
  type: 'actor' | 'service' | 'datastore' | string;
}

interface DataFlow {
  from: string;
  to: string;
  label: string;
}

interface TrustBoundary {
  id: string;
  label:string;
  components: string[];
}

interface DslInput {
  components: Component[];
  data_flows: DataFlow[];
  trust_boundaries?: TrustBoundary[];
}

function getShape(type: string): [string, string] {
    switch (type) {
        case 'actor': return ['{{', '}}'];
        case 'service': return ['[', ']'];
        case 'datastore': return ['[(', ')]'];
        default: return ['(', ')'];
    }
}

export function generateMermaidDiagram(dsl: string): string {
    let parsedDsl: DslInput;

    try {
        parsedDsl = JSON.parse(dsl) as DslInput;
    } catch (jsonError) {
        try {
            parsedDsl = yaml.load(dsl) as DslInput;
        } catch (yamlError) {
            throw new Error("Invalid input: Could not parse as JSON or YAML.");
        }
    }

    if (!parsedDsl || !parsedDsl.components || !parsedDsl.data_flows) {
        throw new Error("Invalid DSL format: Missing 'components' or 'data_flows'.");
    }

    let mermaidString = 'graph TD\n';

    const componentsInBoundaries = new Set<string>();

    if(parsedDsl.trust_boundaries) {
        for(const boundary of parsedDsl.trust_boundaries) {
            mermaidString += `    subgraph ${boundary.id}["${boundary.label}"]\n`;
            for(const componentId of boundary.components) {
                const component = parsedDsl.components.find(c => c.id === componentId);
                if(component) {
                    const [open, close] = getShape(component.type);
                    mermaidString += `        ${component.id}${open}"${component.name}"${close}\n`;
                    componentsInBoundaries.add(componentId);
                }
            }
            mermaidString += '    end\n';
        }
    }

    for (const component of parsedDsl.components) {
        if(!componentsInBoundaries.has(component.id)) {
            const [open, close] = getShape(component.type);
            mermaidString += `    ${component.id}${open}"${component.name}"${close}\n`;
        }
    }

    mermaidString += '\n';

    for (const flow of parsedDsl.data_flows) {
        mermaidString += `    ${flow.from} --"${flow.label}"--> ${flow.to}\n`;
    }

    return mermaidString;
}
