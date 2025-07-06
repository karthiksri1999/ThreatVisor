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
      // The :::actor class is applied here
      return `${id}("<span>&#128100;</span><br/>${name}"):::actor`;
    case 'service':
      // The :::service class is applied here
      return `${id}["${name}"]:::service`;
    case 'datastore':
      // The :::datastore class is applied here
      return `${id}[("${name}")]:::datastore`;
    default:
      // For unknown types, no class is applied initially
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

  // Improved styling for cleaner diagrams, matching app theme
  mermaidString += `    classDef actor fill:#3F51B5,stroke:#fff,stroke-width:2px,color:#fff;\n`;
  mermaidString += `    classDef service fill:#212836,stroke:#009688,stroke-width:2px,color:#fff;\n`;
  mermaidString += `    classDef datastore fill:#4a148c,stroke:#009688,stroke-width:2px,color:#fff;\n`;

  if (parsedDsl.trust_boundaries) {
    for (const boundary of parsedDsl.trust_boundaries) {
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
  
  // The invalid styling block for trust boundaries has been removed to fix the parsing error.
  // Subgraphs will now use the default theme styling, which is more robust and ensures visibility.

  return mermaidString;
}
