export const TEMPLATES = [
  {
    name: 'API Gateway + Microservices',
    content: `components:
  - id: user
    name: End User
    type: actor
  - id: api_gateway
    name: API Gateway
    type: service
  - id: auth_service
    name: Auth Microservice
    type: service
  - id: user_db
    name: User Database
    type: datastore
  - id: product_service
    name: Product Microservice
    type: service
  - id: product_db
    name: Product Database
    type: datastore

data_flows:
  - from: user
    to: api_gateway
    label: "HTTPS Request"
  - from: api_gateway
    to: auth_service
    label: "Validates token"
  - from: auth_service
    to: user_db
    label: "Reads user data"
  - from: api_gateway
    to: product_service
    label: "Forwards request"
  - from: product_service
    to: product_db
    label: "Reads/Writes product data"

trust_boundaries:
  - id: internet
    label: "Public Internet"
    components: [user]
  - id: dmz
    label: "DMZ"
    components: [api_gateway]
  - id: private_network
    label: "Private VPC"
    components:
      - auth_service
      - user_db
      - product_service
      - product_db
`,
  },
  {
    name: 'Simple Web App',
    content: `components:
  - id: user
    name: User
    type: actor
  - id: web_app
    name: Monolithic Web App
    type: service
  - id: database
    name: SQL Database
    type: datastore
  - id: cdn
    name: CDN
    type: service

data_flows:
  - from: user
    to: cdn
    label: "Loads static assets"
  - from: user
    to: web_app
    label: "HTTP/S requests"
  - from: web_app
    to: database
    label: "Reads/writes user data"

trust_boundaries:
  - id: public
    label: "Public Access"
    components: [user, cdn]
  - id: private
    label: "Application Network"
    components: [web_app, database]
`,
  },
];
