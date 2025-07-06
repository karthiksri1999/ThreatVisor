# **App Name**: ThreatVisor

## Core Features:

- DSL Input: Accept threat model definitions in YAML and JSON formats, specifying components, data flows, and trust boundaries.
- Visual Diagram Generation: Generate interactive Data Flow Diagrams (DFD) with trust boundary visualizations using Mermaid.js.
- Automated Threat Detection: Employ a tool based on user-selected methodologies (STRIDE, LINDDUN, PASTA) to analyze the architecture and detect potential threats automatically, with severity levels and suggested mitigations.
- Export & Reporting: Export threat models into PDF, Markdown, and HTML formats, including a threat summary, per-component threats, visual diagrams, and mitigation checklist.
- Prebuilt Templates: Offer prebuilt templates for common architectures, such as API gateway + microservices + DB.
- Diff Support: Compare two threat model files to highlight added/removed threats using diff support.
- Dark Mode UI: Implement a Dark Mode UI for improved user experience.

## Style Guidelines:

- Primary color: Deep Blue (#3F51B5) to reflect security and trustworthiness.
- Background color: Dark navy (#212836) for a professional, modern look.
- Accent color: Teal (#009688) for highlighting interactive elements.
- Body and headline font: 'Inter' sans-serif, for clear readability.
- Use consistent, clear icons from a library like FontAwesome to represent components and threats.
- Implement a clean, structured layout to handle complex diagrams and reports efficiently.
- Use subtle transitions and animations for interactive elements like diagram zooming and threat highlighting.