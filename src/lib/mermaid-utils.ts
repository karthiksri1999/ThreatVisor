import mermaid from 'mermaid';
import type { DslInput } from '@/lib/dsl-parser';

export function getMermaidThemeVariables(theme: 'dark' | 'light' | 'default') {
    return {
        background: theme === 'dark' ? '#212836' : '#FFFFFF',
        primaryColor: theme === 'dark' ? '#2a3344' : '#f5f7f7',
        primaryTextColor: theme === 'dark' ? '#e5e7eb' : '#111827',
        primaryBorderColor: '#3F51B5',
        lineColor: theme === 'dark' ? '#4B5563' : '#9CA3AF',
        clusterBkg: theme === 'dark' ? '#2a3344' : '#f5f7f7',
        clusterTitleColor: theme === 'dark' ? '#e5e7eb' : '#111827',
        clusterBorder: '#009688',
        secondaryColor: '#009688',
    };
}

export function initializeMermaid(theme: 'dark' | 'light' | 'default') {
    const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      fontFamily: 'Inter, sans-serif',
      themeVariables: getMermaidThemeVariables(theme),
      securityLevel: 'loose'
    });
}

interface DslToMermaidOptions {
    interactive?: boolean;
    includeIcons?: boolean;
    useHtmlLabels?: boolean;
}

export function dslToMermaid(dsl: DslInput, options: DslToMermaidOptions = {}): string {
    const { interactive = false, includeIcons = true, useHtmlLabels = true } = options;
    const escape = (str: string) => str.replace(/"/g, '#quot;').replace(/'/g, '`');
    
    let mermaidGraph = 'graph TD;\n';

    dsl.components.forEach(c => {
        const label = escape(c.name);
        const type = escape(c.type);
        const separator = useHtmlLabels ? `<br/>` : `\\n`;

        if (includeIcons && useHtmlLabels) {
            const iconMap: Record<string, string> = {
                actor: 'fa:fa-user',
                service: 'fa:fa-server',
                datastore: 'fa:fa-database',
            };
            const icon = iconMap[c.type] || 'fa:fa-box';
            mermaidGraph += `    ${c.id}("${label}${separator}[<i class='${icon}'></i> ${type}]");\n`;
        } else {
            mermaidGraph += `    ${c.id}("${label}${separator}[${type}]");\n`;
        }
    });

    dsl.data_flows.forEach(flow => {
        mermaidGraph += `    ${flow.from} -- "${escape(flow.label)}" --> ${flow.to};\n`;
    });

    if (dsl.trust_boundaries) {
        dsl.trust_boundaries.forEach(boundary => {
            mermaidGraph += `\n    subgraph ${boundary.id} ["${escape(boundary.label)}"]\n`;
            boundary.components.forEach(componentId => {
                mermaidGraph += `        ${componentId}\n`;
            });
            mermaidGraph += `    end\n`;
        });
    }

    if (interactive) {
        dsl.components.forEach(c => {
            mermaidGraph += `    click ${c.id} call handleNodeClick("${c.id}") "Click to see details";\n`;
        });
    }

    return mermaidGraph;
}
