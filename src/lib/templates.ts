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
  {
    name: 'Serverless Web Application',
    content: `components:
  - id: user
    name: User
    type: actor
  - id: cdn
    name: CDN (CloudFront)
    type: service
  - id: s3_bucket
    name: S3 Bucket (Static Site)
    type: datastore
  - id: api_gateway
    name: API Gateway
    type: service
  - id: cognito
    name: Cognito User Pool
    type: service
  - id: lambda_function
    name: Lambda Function (Backend)
    type: service
  - id: dynamodb
    name: DynamoDB Table
    type: datastore

data_flows:
  - from: user
    to: cdn
    label: "Loads static frontend"
  - from: cdn
    to: s3_bucket
    label: "Serves static content"
  - from: user
    to: api_gateway
    label: "API Calls"
  - from: api_gateway
    to: cognito
    label: "Authenticates user"
  - from: api_gateway
    to: lambda_function
    label: "Invokes function"
  - from: lambda_function
    to: dynamodb
    label: "Reads/Writes data"

trust_boundaries:
  - id: public
    label: "Public Internet"
    components: [user]
  - id: aws_edge
    label: "AWS Edge Network"
    components: [cdn, api_gateway, cognito]
  - id: aws_private
    label: "AWS Private VPC"
    components: [lambda_function, dynamodb, s3_bucket]
`
  },
  {
    name: 'E-Commerce App',
    content: `components:
  - id: customer
    name: Customer
    type: actor
  - id: web_frontend
    name: Web Frontend
    type: service
  - id: api_gateway
    name: API Gateway
    type: service
  - id: order_service
    name: Order Service
    type: service
  - id: product_service
    name: Product Service
    type: service
  - id: payment_service
    name: Payment Gateway
    type: service
  - id: order_db
    name: Order DB
    type: datastore
  - id: product_db
    name: Product DB
    type: datastore

data_flows:
  - from: customer
    to: web_frontend
    label: "Browses site"
  - from: web_frontend
    to: api_gateway
    label: "API Requests"
  - from: api_gateway
    to: product_service
    label: "Get product info"
  - from: api_gateway
    to: order_service
    label: "Place order"
  - from: order_service
    to: order_db
    label: "Save order"
  - from: order_service
    to: payment_service
    label: "Process payment"
  - from: product_service
    to: product_db
    label: "Read product data"
`
  },
  {
    name: 'Zero Trust Architecture',
    content: `components:
  - id: user
    name: Remote User
    type: actor
  - id: user_device
    name: User Device
    type: service
  - id: identity_provider
    name: Identity Provider (IdP)
    type: service
  - id: policy_engine
    name: Policy Engine
    type: service
  - id: policy_admin_point
    name: Policy Admin Point
    type: service
  - id: secure_gateway
    name: Secure Access Gateway
    type: service
  - id: protected_resource
    name: Protected Resource
    type: service

data_flows:
  - from: user
    to: user_device
    label: "Interacts with device"
  - from: user_device
    to: secure_gateway
    label: "Request access"
  - from: secure_gateway
    to: identity_provider
    label: "Authenticate user"
  - from: secure_gateway
    to: policy_engine
    label: "Authorize request"
  - from: policy_engine
    to: policy_admin_point
    label: "Get policy"
  - from: secure_gateway
    to: protected_resource
    label: "Proxies connection"
`
  },
  {
    name: 'ML/AI Pipeline',
    content: `components:
  - id: data_source
    name: Raw Data Source
    type: datastore
  - id: data_ingestion
    name: Data Ingestion Service
    type: service
  - id: data_lake
    name: Data Lake (S3)
    type: datastore
  - id: preprocessing_job
    name: Preprocessing Job
    type: service
  - id: feature_store
    name: Feature Store
    type: datastore
  - id: model_training
    name: Model Training Job
    type: service
  - id: model_registry
    name: Model Registry
    type: datastore
  - id: model_deployment_api
    name: Model Deployment API
    type: service
  - id: user_app
    name: User Application
    type: service

data_flows:
  - from: data_source
    to: data_ingestion
    label: "Ingests raw data"
  - from: data_ingestion
    to: data_lake
    label: "Stores raw data"
  - from: data_lake
    to: preprocessing_job
    label: "Processes data"
  - from: preprocessing_job
    to: feature_store
    label: "Saves features"
  - from: feature_store
    to: model_training
    label: "Loads features for training"
  - from: model_training
    to: model_registry
    label: "Saves trained model"
  - from: model_registry
    to: model_deployment_api
    label: "Deploys model"
  - from: user_app
    to: model_deployment_api
    label: "Requests prediction"
`
  },
  {
    name: 'Multi-tenant SaaS Platform',
    content: `components:
  - id: tenant_user
    name: Tenant User
    type: actor
  - id: web_app
    name: Web Application
    type: service
  - id: api_gateway
    name: API Gateway
    type: service
  - id: tenant_service
    name: Tenant-aware Service
    type: service
  - id: isolation_layer
    name: Data Isolation Layer
    type: service
  - id: shared_db
    name: Shared Database
    type: datastore

data_flows:
  - from: tenant_user
    to: web_app
    label: "Accesses application"
  - from: web_app
    to: api_gateway
    label: "Tenant-specific API calls"
  - from: api_gateway
    to: tenant_service
    label: "Forwards request"
  - from: tenant_service
    to: isolation_layer
    label: "Request data with tenant ID"
  - from: isolation_layer
    to: shared_db
    label: "Queries with tenant filter"
`
  },
  {
    name: 'CI/CD Pipeline',
    content: `components:
  - id: developer
    name: Developer
    type: actor
  - id: scm
    name: Source Control (Git)
    type: service
  - id: build_server
    name: CI/CD Build Server
    type: service
  - id: artifact_repo
    name: Artifact Repository
    type: datastore
  - id: deploy_server
    name: Deployment Server
    type: service
  - id: prod_env
    name: Production Environment
    type: service

data_flows:
  - from: developer
    to: scm
    label: "Pushes code"
  - from: scm
    to: build_server
    label: "Webhook trigger"
  - from: build_server
    to: scm
    label: "Clones repo"
  - from: build_server
    to: artifact_repo
    label: "Pushes artifact"
  - from: build_server
    to: deploy_server
    label: "Triggers deployment"
  - from: deploy_server
    to: artifact_repo
    label: "Pulls artifact"
  - from: deploy_server
    to: prod_env
    label: "Deploys to production"
`
  },
  {
    name: 'Banking/Fintech',
    content: `components:
  - id: customer
    name: Customer
    type: actor
  - id: web_app
    name: Online Banking Web App
    type: service
  - id: mobile_app
    name: Mobile Banking App
    type: service
  - id: api_gateway
    name: API Gateway
    type: service
  - id: core_banking
    name: Core Banking System
    type: service
  - id: fraud_detection
    name: Fraud Detection Service
    type: service
  - id: ledger_db
    name: Transaction Ledger DB
    type: datastore

data_flows:
  - from: customer
    to: web_app
    label: "HTTPS"
  - from: customer
    to: mobile_app
    label: "TLS"
  - from: web_app
    to: api_gateway
    label: "API Calls"
  - from: mobile_app
    to: api_gateway
    label: "API Calls"
  - from: api_gateway
    to: core_banking
    label: "Transaction requests"
  - from: core_banking
    to: ledger_db
    label: "Record transaction"
  - from: core_banking
    to: fraud_detection
    label: "Analyze transaction"
`
  }
];
