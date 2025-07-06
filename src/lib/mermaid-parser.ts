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
  label: string;
  components: string[];
}

interface DslInput {
  components: Component[];
  data_flows: DataFlow[];
  trust_boundaries?: TrustBoundary[];
}

function getNodeDefinition(component: Component): string {
  const { id, name, type } = component;
  switch (type) {
    case 'actor':
      return `${id}("<span>&#128100;</span><br/>${name}"):::actor`;
    case 'service':
      return `${id}["${name}"]:::service`;
    case 'datastore':
      return `${id}[("${name}")]:::datastore`;
    default:
      return `${id}("${name}")`;
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
      throw new Error('Invalid input: Could not parse as JSON or YAML.');
    }
  }

  if (!parsedDsl || !parsedDsl.components || !parsedDsl.data_flows) {
    throw new Error("Invalid DSL format: Missing 'components' or 'data_flows'.");
  }

  let mermaidString = 'graph TD\n';

  const componentsInBoundaries = new Set<string>();
  const boundaryIds: string[] = [];

  if (parsedDsl.trust_boundaries) {
    for (const boundary of parsedDsl.trust_boundaries) {
      boundaryIds.push(boundary.id);
      mermaidString += `    subgraph ${boundary.id}["${boundary.label}"]\n`;
      mermaidString += `        direction TB\n`;
      for (const componentId of boundary.components) {
        const component = parsedDsl.components.find((c) => c.id === componentId);
        if (component) {
          mermaidString += `        ${getNodeDefinition(component)}\n`;
          componentsInBoundaries.add(componentId);
        }
      }
      mermaidString += '    end\n';
    }
  }

  for (const component of parsedDsl.components) {
    if (!componentsInBoundaries.has(component.id)) {
      mermaidString += `    ${getNodeDefinition(component)}\n`;
    }
  }

  mermaidString += '\n';

  for (const flow of parsedDsl.data_flows) {
    mermaidString += `    ${flow.from} --"${flow.label}"--> ${flow.to}\n`;
  }

  mermaidString += '\n';
  mermaidString += `    classDef actor fill:#4f4f4f,stroke:#ccc,stroke-width:2px,color:#fff;\n`;
  mermaidString += `    classDef service fill:#2d3b55,stroke:#b4b4b4,stroke-width:1px,color:#fff;\n`;
  mermaidString += `    classDef datastore fill:#4f3a55,stroke:#b4b4b4,stroke-width:1px,color:#fff;\n`;

  if (boundaryIds.length > 0) {
    mermaidString += '\n    %% Trust Boundary Styling\n';
    for (const boundaryId of boundaryIds) {
      mermaidString += `    style ${boundaryId} fill:rgba(128,128,128,0.1),stroke:#999,stroke-width:2px,stroke-dasharray:5 5\n`;
    }
  }

  return mermaidString;
}
