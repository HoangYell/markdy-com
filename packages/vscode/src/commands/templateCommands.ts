import * as vscode from "vscode";
import { MarkdyPreviewPanel } from "../preview/previewPanel";

interface TemplateItem extends vscode.QuickPickItem {
  code: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    label: "⚡ Microservices & Kafka Event Stream",
    description: "Multi-tier microservices with asynchronous event choreography",
    detail: "API Gateway -> Auth & Order Service -> Kafka stream -> Worker & Postgres",
    code: `scene "Microservices & Event Stream Architecture" theme=midnight
layout LR

client WebApp "React Client"
gateway ApiGateway "Kong Gateway"
service OrderService "Order Service"
service PaymentService "Payment Service"
queue Kafka "Kafka Event Stream"
worker BillingWorker "Billing Worker"
database Postgres "PostgreSQL 16"

beat auth_order "Synchronous Order Checkout":
  show $nodes stagger=60ms
  frame WebApp ApiGateway OrderService zoom=1.12
  WebApp -> ApiGateway "POST /checkout"
  ApiGateway -> OrderService "gRPC placeOrder()"
  OrderService -> PaymentService "authorizePayment()"
  OrderService <- PaymentService "200 OK"
  WebApp <- ApiGateway "201 Created (Order #1042)"

beat async_billing "Asynchronous Event Dispatch":
  frame OrderService Kafka BillingWorker zoom=1.15
  OrderService ~> Kafka "order.created"
  Kafka ~> BillingWorker "consume order.created"
  BillingWorker -> Postgres "INSERT invoice record"
  glow Kafka color=#38bdf8
`,
  },
  {
    label: "☸️ Kubernetes Cluster & Ingress Routing",
    description: "Ingress Controller, Pod replicas, ClusterIP services & DB",
    detail: "Client -> Ingress NGINX -> Frontend Pods -> Backend Pods -> StatefulSet",
    code: `scene "Kubernetes Production Topology" theme=blueprint
layout LR

client User "End User Client"
gateway Ingress "NGINX Ingress Controller"

group frontend_cluster "Frontend Tier":
  pod WebPod1 "Web Pod #1"
  pod WebPod2 "Web Pod #2"

group backend_cluster "Backend Core":
  pod ApiPod1 "API Pod #1"
  pod ApiPod2 "API Pod #2"

database PostgresDb "Postgres StatefulSet"

beat ingress_route "Traffic Ingress":
  show $nodes stagger=50ms
  User -> Ingress "HTTPS /app"
  Ingress -> WebPod1 "Round-Robin /app"

beat rpc_dispatch "Internal Pod Communication":
  frame frontend_cluster backend_cluster zoom=1.18
  WebPod1 -> ApiPod1 "mTLS gRPC /query"
  ApiPod1 -> PostgresDb "SELECT query"
  ApiPod1 <- PostgresDb "record rows"
  WebPod1 <- ApiPod1 "gRPC response"
`,
  },
  {
    label: "🪙 Medallion Lakehouse (type=medallion)",
    description: "Bronze Raw -> Silver Cleaned -> Gold Aggregated data pipeline",
    detail: "Ingestion -> Data Lake Bronze -> Silver Delta -> Gold Mart -> BI Dashboard",
    code: `scene "Enterprise Medallion Lakehouse" theme=editorial
layout LR

storage S3Raw "Raw Ingestion (Landing S3)"
database BronzeLake "Bronze Delta Lake (Raw Records)"
service SparkJob "Spark ETL Cleaning Worker"
database SilverLake "Silver Delta Lake (Enriched)"
database GoldMart "Gold Analytics Mart"
client Metabase "Metabase BI Dashboard"

beat ingest "Landing & Raw Ingestion":
  show $nodes stagger=60ms
  S3Raw ~> BronzeLake "Batch Parquet Ingestion"

beat cleanse_enrich "Data Cleaning & Deduplication":
  frame BronzeLake SparkJob SilverLake zoom=1.15
  BronzeLake -> SparkJob "Read raw CDC records"
  SparkJob -> SilverLake "Write cleansed & validated schema"
  glow SilverLake color=#047857

beat business_aggregates "Business Aggregation & Analytics":
  frame SilverLake GoldMart Metabase zoom=1.18
  SilverLake -> GoldMart "Compute daily KPI rollups"
  Metabase -> GoldMart "SQL Query /analytics"
  Metabase <- GoldMart "Sub-second KPI Dashboards"
`,
  },
  {
    label: "🔐 OAuth 2.0 PKCE Authorization Flow",
    description: "Secure Single Page App authorization with PKCE proof key",
    detail: "SPA Client -> Auth0 / Keycloak Server -> Resource API",
    code: `scene "OAuth 2.0 PKCE Auth Flow" theme=terminal
layout LR

browser SpaClient "Single Page App (SPA)"
service AuthServer "Authorization Server (Keycloak)"
service ResourceApi "Protected Resource API"
database UserDb "User Identity Directory"

beat authorize "Authorization Code Request":
  show $nodes stagger=60ms
  SpaClient -> AuthServer "GET /authorize?code_challenge=xyz"
  AuthServer -> UserDb "Verify User Credentials"
  SpaClient <- AuthServer "302 Redirect (auth_code)"

beat token_exchange "PKCE Token Exchange":
  frame SpaClient AuthServer zoom=1.2
  SpaClient -> AuthServer "POST /oauth/token (code_verifier)"
  SpaClient <- AuthServer "200 OK (access_token + refresh_token)"
  glow SpaClient color=#ff5a36

beat access_resource "Authorized API Access":
  frame SpaClient ResourceApi zoom=1.15
  SpaClient -> ResourceApi "GET /api/profile (Bearer token)"
  SpaClient <- ResourceApi "200 OK JSON User Profile"
`,
  },
  {
    label: "🌀 Compounding Flywheel Growth Loop (type=flywheel)",
    description: "Circular feedback flywheel architecture",
    detail: "Customer Demand -> Developer Velocity -> Product Quality -> Network Value",
    code: `scene "Developer Ecosystem Flywheel" theme=nebula
layout LR

service Users "Active Community Users"
service Plugins "Plugin Ecosystem"
service Platform "Core Platform API"
service Value "Compounding Value"

beat loop_cycle "Compounding Acceleration":
  show $nodes stagger=80ms
  Users -> Plugins "Create Extensions"
  Plugins -> Platform "Enrich Platform API"
  Platform -> Value "Increase User Utility"
  Value -> Users "Attract More Developers"
  glow $nodes color=#c4b5fd
`,
  },
  {
    label: "🛡️ DMZ & VPC Perimeter Isolation (type=nested)",
    description: "Multi-perimeter network security architecture",
    detail: "Public DMZ vs Private VPC vs Isolated Database Subnet",
    code: `scene "Perimeter Isolated Architecture" theme=graphite
layout LR

client PublicUser "Internet Traffic"
firewall Waf "Cloudflare WAF / DDoS Guard"

group dmz_perimeter "Public DMZ Subnet":
  gateway ApiGateway "Public Edge Proxy"

group vpc_internal "Private App VPC":
  service OrderCore "Order Engine"
  service AuthCore "Auth Engine"
  cache RedisCluster "In-Memory Session Cache"

group data_vault "Isolated Data Vault":
  database VaultDB "Encrypted PostgreSQL"

beat request_flow "Strict Perimeter Crossing":
  show $nodes stagger=60ms
  PublicUser -> Waf "HTTPS Traffic"
  Waf -> ApiGateway "Filtered TLS Traffic"
  ApiGateway -> OrderCore "Private VPC mTLS"
  OrderCore -> RedisCluster "Check Session Cache"
  OrderCore -> VaultDB "Secure Internal SQL (Encrypted)"
`,
  },
];

export function registerTemplateCommands(context: vscode.ExtensionContext) {
  const insertTemplateCmd = vscode.commands.registerCommand("markdy.insertTemplate", async () => {
    const selected = await vscode.window.showQuickPick(TEMPLATES, {
      placeHolder: "Select a curated architecture model to insert into editor",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) return;

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === "markdy") {
      editor.edit((editBuilder) => {
        const selection = editor.selection;
        if (!selection.isEmpty) {
          editBuilder.replace(selection, selected.code);
        } else {
          editBuilder.insert(selection.active, selected.code);
        }
      });
    } else {
      const doc = await vscode.workspace.openTextDocument({
        language: "markdy",
        content: selected.code,
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
    }
  });

  const newTemplateCmd = vscode.commands.registerCommand("markdy.newDiagramFromTemplate", async () => {
    const selected = await vscode.window.showQuickPick(TEMPLATES, {
      placeHolder: "Create new Markdy diagram from curated architecture template",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) return;

    const doc = await vscode.workspace.openTextDocument({
      language: "markdy",
      content: selected.code,
    });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
  });

  context.subscriptions.push(insertTemplateCmd, newTemplateCmd);
}
