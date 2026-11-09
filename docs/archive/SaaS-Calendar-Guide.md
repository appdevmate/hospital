SaaS Calendar — Beginner Infrastructure Guide

**📅  SaaS Calendar Platform**

Beginner Infrastructure Guide — AWS Free Tier

*Angular 20 · Serverless · $0–$1/month to start*


# **1. What We're Building**
A calendar SaaS (like Google Calendar) that you sell to businesses. Each business ("tenant") gets their own private calendar space. They can't see each other's data. Users have roles (Admin, Editor, Viewer). Calendars can be public or private. Events update in real-time. Other apps connect via webhooks.

|<p>**💡  Note**</p><p>SaaS = many companies share the same app, but each company's data is fully isolated — like an apartment building where every flat has its own lock.</p>|
| :- |

|<p>**✅  Free Tier**</p><p>Everything in this guide runs on AWS Free Tier. Expected monthly cost at launch: $0 – $1.</p>|
| :- |

# **2. How a Request Flows (The Big Picture)**
When a user clicks "Save Event", here is what happens behind the scenes:

|**#**|**Step**|**AWS Service**|
| :- | :- | :- |
|1|User clicks Save Event in the browser|Angular app (your frontend)|
|2|Request hits the API entry point|API Gateway HTTP API|
|3|AWS verifies the user is logged in|Cognito (issues login tokens)|
|4|Business logic runs — event is saved|Lambda (serverless function)|
|5|Event stored in the database|DynamoDB|
|6|Other users see the update instantly|WebSocket API|
|7|Connected apps notified automatically|EventBridge → SQS → Webhook|

|<p>**💡  Note**</p><p>You never manage servers. Lambda only runs when a request arrives. At midnight with no users, you pay $0.</p>|
| :- |


# **3. AWS Services — Plain English**

|**Service**|**What it does**|**Free Tier limit**|
| :- | :- | :- |
|API Gateway HTTP API|The front door. All browser requests enter here. Checks login tokens automatically.|1,000,000 calls/month — forever|
|Lambda|Runs your TypeScript code. Starts on demand, stops when done. No idle server cost.|1M calls + 400K compute-sec — forever|
|Cognito|Handles user login, registration, password reset. Issues JWT tokens (digital badges).|50,000 active users/month — forever|
|DynamoDB|The database. Stores tenants, users, calendars, events.|25 GB + basic read/write — forever|
|S3 + CloudFront|Hosts your Angular app files globally. Also stores file attachments.|5 GB / 1 TB transfer — 12 months|
|EventBridge|Internal messenger. When an event is created, it broadcasts to other parts of the system.|1,000,000 messages/month — forever|
|SQS|Queues webhook messages. Retries if delivery fails.|1,000,000 requests/month — forever|
|WebSocket API|Keeps a live channel open so events appear instantly without refreshing.|~$0.50/month at low usage|

|<p>**⚠️  Watch out**</p><p>WebSocket API is the only service outside permanent free tier. At early stage: < $0.50/month. Monitor when users grow.</p>|
| :- |


# **4. Multi-Tenancy & Security**
## **How tenant data stays separated**
Every database record starts with the company's unique ID. A user from Company ABC can only ever query records starting with TENANT#abc. It is structurally impossible to see another company's data.

|**What's stored**|**Database key**|
| :- | :- |
|Company ABC – Calendar|TENANT#abc → CAL#001|
|Company ABC – Events|TENANT#abc → EVENT#001|
|Company XYZ – Calendar|TENANT#xyz → CAL#001|

## **Security controls (all free)**

|**Threat**|**Protection**|
| :- | :- |
|Wrong password brute force|Cognito locks account after 5 failed attempts|
|Cross-tenant data leak|Every DB query is locked to the user's own tenant ID (from login token)|
|Intercepted traffic|HTTPS everywhere — all data encrypted in transit|
|Unauthorized file access|S3 files only via short-lived signed links (expire in 5 min)|
|Too many requests|API Gateway rate limiting built-in|

|<p>**⚠️  Watch out**</p><p>Skip AWS WAF for now ($5/month minimum). Built-in rate limiting is sufficient at launch. Add WAF when you have paying customers.</p>|
| :- |


# **5. Cost, Structure & Where to Start**
## **Real monthly cost estimate**

|**Service**|**Free limit**|**Your usage**|**Cost**|
| :- | :- | :- | :- |
|Lambda|1M calls/mo|< 100K|$0.00|
|API Gateway|1M calls/mo|< 100K|$0.00|
|DynamoDB|25 GB|< 1 GB|$0.00|
|Cognito|50K users|< 500|$0.00|
|EventBridge+SQS|1M each/mo|< 50K|$0.00|
|S3+CloudFront|5GB / 1TB|< 500 MB|$0.00\*|
|WebSocket|Not perm. free|< 100 conn|~$0.50|
|Route 53|No free tier|1 domain|$0.50|

\* Free for 12 months, then ~$0.50/month after. Set a $5 billing alert to catch surprises.

**Total: $0 – $1 / month**

## **Folder structure**

|**Folder**|**Purpose**|
| :- | :- |
|apps/web/|Angular 20 main app (what users see)|
|apps/widget/|Embeddable calendar widget (Angular Web Component)|
|services/|All Lambda functions (backend logic)|
|packages/|Shared TypeScript types between frontend and backend|
|cdk/|Infrastructure code — creates all AWS resources|
|.github/|CI/CD pipelines — auto-deploy on push to GitHub|

## **Build it in 8 weeks**

|**Week**|**Goal**|
| :- | :- |
|1|AWS account setup — deploy empty DynamoDB + Cognito pool with CDK|
|2|First Lambda + API Gateway — make GET /health return OK|
|3|Auth flow — login works in Angular, user sees blank dashboard|
|4|Calendar CRUD — create/read/update/delete calendars and events|
|5|Real-time — events update live in another browser tab via WebSocket|
|6|Webhooks — register webhooks, deliver via SQS with retry|
|7|Public calendars + embeddable widget|
|8|Roles, onboarding flow, invite a real user to test|

|<p>**✅  Free Tier**</p><p>You can complete all 8 weeks spending $0–$1/month on AWS. Start with Week 1 — don't read ahead until you need it.</p>|
| :- |

AWS Free Tier · Angular 20 · Serverless	Page 
