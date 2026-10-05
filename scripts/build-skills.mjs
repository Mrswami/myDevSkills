// Source of truth for the skill map. Run: node scripts/build-skills.mjs
// Edit statuses/levels here (or public/skills.json directly) to update your journey.
//
// status: M = mastered, U = proficient/in use, L = currently learning, - = not started
// type:   L = language, F = framework/library, T = tool/platform, C = concept/practice
import { writeFileSync } from 'node:fs';

const domains = [
  { id: 'lang',   name: 'Languages',            hue: 190 },
  { id: 'fe',     name: 'Frontend',             hue: 330 },
  { id: 'be',     name: 'Backend & APIs',       hue: 140 },
  { id: 'cloud',  name: 'Cloud & DevOps',       hue: 215 },
  { id: 'data',   name: 'Data & Databases',     hue: 25 },
  { id: 'ai',     name: 'AI & ML',              hue: 270 },
  { id: 'mobile', name: 'Mobile',               hue: 100 },
  { id: 'sec',    name: 'Security & Identity',  hue: 0 },
  { id: 'craft',  name: 'Engineering Craft',    hue: 60 },
];

// [id, title, domain, type, status, requires, context]
const N = [
  // ───────── Languages
  ['js', 'JavaScript', 'lang', 'L', 'M', [], 'The spark that started it all. Event loop, closures, async, DOM.'],
  ['ts', 'TypeScript', 'lang', 'L', 'M', ['js'], 'Strict typing, generics and interfaces for scalable apps.'],
  ['py', 'Python', 'lang', 'L', 'U', [], 'Scripting, data work, automation and ML tooling.'],
  ['java', 'Java', 'lang', 'L', 'U', [], 'Object-oriented foundations and the JVM ecosystem.'],
  ['kotlin', 'Kotlin', 'lang', 'L', 'L', ['java'], 'Modern JVM language; the Android-first choice.'],
  ['c', 'C', 'lang', 'L', 'U', [], 'Memory, pointers and how machines really work.'],
  ['cpp', 'C++', 'lang', 'L', 'L', ['c'], 'Systems and performance-critical programming, RAII, templates.'],
  ['csharp', 'C#', 'lang', 'L', 'U', ['java'], '.NET, LINQ, async/await and strong tooling.'],
  ['go', 'Go', 'lang', 'L', 'L', ['c'], 'Simple, concurrent services and CLIs.'],
  ['rust', 'Rust', 'lang', 'L', 'L', ['c'], 'Ownership, safety without GC, fearless concurrency.'],
  ['swift', 'Swift', 'lang', 'L', 'L', [], 'Apple platforms and SwiftUI.'],
  ['dart', 'Dart', 'lang', 'L', 'U', [], 'The language behind Flutter.'],
  ['sql', 'SQL', 'lang', 'L', 'U', [], 'Querying, joins, window functions and optimization.'],
  ['bash', 'Bash', 'lang', 'L', 'U', [], 'Shell scripting and pipelines.'],
  ['pwsh', 'PowerShell', 'lang', 'L', 'U', ['bash'], 'Windows automation and object pipelines.'],
  ['php', 'PHP', 'lang', 'L', '-', [], 'Server-side web scripting powering a huge share of the web.'],
  ['ruby', 'Ruby', 'lang', 'L', '-', [], 'Expressive scripting; home of Rails.'],
  ['scala', 'Scala', 'lang', 'L', '-', ['java'], 'Functional + OO on the JVM; Spark heritage.'],
  ['r', 'R', 'lang', 'L', '-', ['py'], 'Statistical computing and visualization.'],
  ['wasm', 'WebAssembly', 'lang', 'T', '-', ['rust', 'js'], 'Near-native speed in the browser.'],

  // ───────── Frontend
  ['html_css', 'HTML & CSS', 'fe', 'L', 'M', [], 'Semantic markup, layout, Grid/Flexbox, modern CSS.'],
  ['sass', 'Sass / SCSS', 'fe', 'T', 'U', ['html_css'], 'Maintainable stylesheets with variables and mixins.'],
  ['responsive', 'Responsive Design', 'fe', 'C', 'U', ['html_css'], 'Mobile-first, fluid layouts across every browser.'],
  ['a11y', 'Accessibility', 'fe', 'C', 'L', ['html_css'], 'ARIA, keyboard navigation and inclusive design.'],
  ['css_anim', 'CSS Animation', 'fe', 'C', 'U', ['html_css'], 'Keyframes, transitions and motion design.'],
  ['svg', 'SVG & Canvas', 'fe', 'T', 'U', ['js', 'html_css'], 'Vector and bitmap graphics; powers this very map.'],
  ['vite', 'Vite & Bundlers', 'fe', 'T', 'U', ['js'], 'Fast dev servers and optimized builds.'],
  ['angular', 'Angular', 'fe', 'F', 'U', ['ts', 'html_css'], 'Component architecture, DI and enterprise SPAs.'],
  ['rxjs', 'RxJS', 'fe', 'F', 'U', ['angular'], 'Reactive streams and event composition.'],
  ['ng_signals', 'Signals & Zoneless', 'fe', 'C', 'L', ['angular'], 'Fine-grained reactivity and zone-free change detection.'],
  ['ng_anim', 'Angular Animations', 'fe', 'F', 'U', ['angular'], 'Triggers, states and orchestrated transitions.'],
  ['angular_adv', 'Advanced Angular', 'fe', 'C', 'L', ['ng_signals', 'ng_anim'], 'Custom directives, deferrable views and performance tuning.'],
  ['ngrx', 'NgRx / State', 'fe', 'F', '-', ['rxjs'], 'Predictable state management with effects and selectors.'],
  ['ng_ssr', 'SSR & Hydration', 'fe', 'C', '-', ['angular'], 'Server rendering for SEO and first paint.'],
  ['react', 'React', 'fe', 'F', 'U', ['js', 'html_css'], 'Function components, hooks and the virtual DOM.'],
  ['nextjs', 'Next.js', 'fe', 'F', '-', ['react'], 'Full-stack React with server components.'],
  ['vue', 'Vue', 'fe', 'F', '-', ['js', 'html_css'], 'Approachable reactive framework with a gentle curve.'],
  ['svelte', 'Svelte', 'fe', 'F', '-', ['js'], 'Compiler-first UI framework.'],
  ['tailwind', 'Tailwind CSS', 'fe', 'T', '-', ['html_css'], 'Utility-first styling workflow.'],
  ['webcomp', 'Web Components', 'fe', 'C', '-', ['js'], 'Custom elements and shadow DOM.'],
  ['pwa', 'PWAs', 'fe', 'C', '-', ['js', 'responsive'], 'Installable offline-first web apps.'],
  ['threejs', 'WebGL / Three.js', 'fe', 'F', '-', ['svg'], '3D on the web.'],

  // ───────── Backend & APIs
  ['node', 'Node.js', 'be', 'F', 'M', ['js'], 'Backend APIs and server-side JavaScript.'],
  ['express', 'Express', 'be', 'F', 'U', ['node'], 'Minimal web framework and middleware patterns.'],
  ['rest', 'REST API Design', 'be', 'C', 'U', ['node'], 'Resource modeling, versioning and status semantics.'],
  ['nest', 'NestJS', 'be', 'F', '-', ['node', 'ts'], 'Opinionated, Angular-style Node framework.'],
  ['graphql', 'GraphQL', 'be', 'T', '-', ['rest'], 'Typed query APIs.'],
  ['ws', 'WebSockets', 'be', 'C', '-', ['node'], 'Realtime bidirectional communication.'],
  ['fastapi', 'FastAPI / Flask', 'be', 'F', '-', ['py', 'rest'], 'Python web APIs with type hints.'],
  ['spring', 'Spring Boot', 'be', 'F', '-', ['java', 'rest'], 'Enterprise Java services.'],
  ['dotnet', 'ASP.NET Core', 'be', 'F', '-', ['csharp', 'rest'], 'Cross-platform .NET web APIs.'],
  ['grpc', 'gRPC', 'be', 'T', '-', ['go', 'rest'], 'Contract-first high-performance RPC.'],
  ['microservices', 'Microservices', 'be', 'C', '-', ['rest', 'docker'], 'Service boundaries, messaging and resilience.'],
  ['mq', 'Pub/Sub & Queues', 'be', 'C', '-', ['microservices'], 'Async messaging (Pub/Sub, Kafka, RabbitMQ).'],

  // ───────── Cloud & DevOps
  ['firebase', 'Firebase', 'cloud', 'T', 'U', ['js'], 'Hosting, auth, Firestore and functions; this app deploys here.'],
  ['fb_hosting', 'Firebase Hosting', 'cloud', 'T', 'U', ['firebase'], 'Global CDN hosting with preview channels.'],
  ['cloud_fn', 'Cloud Functions', 'cloud', 'T', 'L', ['firebase', 'node'], 'Event-driven serverless backends.'],
  ['gcp', 'Google Cloud', 'cloud', 'T', 'U', [], 'Core GCP services and gcloud tooling.'],
  ['gcs', 'Cloud Storage', 'cloud', 'T', 'U', ['gcp'], 'Object storage and signed URLs.'],
  ['cloud_run', 'Cloud Run', 'cloud', 'T', 'L', ['gcp', 'docker'], 'Serverless containers.'],
  ['docker', 'Docker', 'cloud', 'T', 'U', ['bash'], 'Containerized, reproducible builds.'],
  ['compose', 'Docker Compose', 'cloud', 'T', 'U', ['docker'], 'Multi-container local environments.'],
  ['k8s', 'Kubernetes', 'cloud', 'T', '-', ['docker'], 'Container orchestration at scale.'],
  ['cicd', 'CI/CD', 'cloud', 'C', 'U', [], 'Automated test, build and deploy pipelines.'],
  ['gh_actions', 'GitHub Actions', 'cloud', 'T', 'U', ['cicd'], 'Workflows that deploy this site on every push.'],
  ['linux', 'Linux', 'cloud', 'T', 'U', ['bash'], 'Shell, processes, permissions and services.'],
  ['terraform', 'Terraform / IaC', 'cloud', 'T', '-', ['cicd'], 'Declarative infrastructure.'],
  ['aws', 'AWS', 'cloud', 'T', '-', [], 'Amazon cloud: EC2, S3, Lambda.'],
  ['azure', 'Azure', 'cloud', 'T', '-', [], 'Microsoft cloud services.'],
  ['observe', 'Observability', 'cloud', 'C', '-', ['cicd'], 'Logs, metrics and traces.'],

  // ───────── Data & Databases
  ['relational', 'Relational Modeling', 'data', 'C', 'U', ['sql'], 'Normalization, keys, indexes and transactions.'],
  ['postgres', 'PostgreSQL', 'data', 'T', 'U', ['relational'], 'Powerful open-source relational database.'],
  ['mysql', 'MySQL', 'data', 'T', '-', ['relational'], 'Widely deployed relational database.'],
  ['sqlite', 'SQLite', 'data', 'T', 'U', ['relational'], 'Embedded database for apps and tests.'],
  ['nosql', 'NoSQL Concepts', 'data', 'C', 'U', [], 'Document, key-value and wide-column tradeoffs.'],
  ['firestore', 'Firestore', 'data', 'T', 'U', ['nosql', 'firebase'], 'Realtime document database with security rules.'],
  ['mongo', 'MongoDB', 'data', 'T', '-', ['nosql'], 'Document database.'],
  ['redis', 'Redis', 'data', 'T', '-', ['nosql'], 'In-memory cache and data structures.'],
  ['bigquery', 'BigQuery', 'data', 'T', 'U', ['sql', 'gcp'], 'Serverless analytics warehouse.'],
  ['bq_opt', 'BigQuery Optimization', 'data', 'C', 'L', ['bigquery'], 'Partitioning, clustering and cost control.'],
  ['warehousing', 'Data Warehousing', 'data', 'C', '-', ['bigquery'], 'Dimensional modeling and ELT.'],
  ['dataform', 'Dataform', 'data', 'T', '-', ['bigquery'], 'SQLX transformations for BigQuery.'],
  ['dbt', 'dbt', 'data', 'T', '-', ['bigquery'], 'Analytics engineering with tested models.'],
  ['pandas', 'Pandas & NumPy', 'data', 'F', 'U', ['py'], 'Dataframes and numeric computing.'],
  ['notebooks', 'Jupyter Notebooks', 'data', 'T', 'U', ['py'], 'Exploratory analysis and reporting.'],
  ['dataviz', 'Data Visualization', 'data', 'C', 'U', ['pandas'], 'Charts that communicate.'],
  ['spark', 'Apache Spark', 'data', 'F', '-', ['py'], 'Distributed data processing.'],
  ['beam', 'Beam / Dataflow', 'data', 'F', '-', ['py', 'gcp'], 'Unified batch and streaming pipelines.'],
  ['airflow', 'Airflow / Composer', 'data', 'T', '-', ['py'], 'Workflow orchestration.'],

  // ───────── AI & ML
  ['llm', 'LLMs & Prompting', 'ai', 'C', 'U', [], 'Prompt design, context management and model behavior.'],
  ['gemini', 'Gemini API', 'ai', 'T', 'U', ['llm'], 'Multimodal generative models via API.'],
  ['agents', 'AI Agents & Tools', 'ai', 'C', 'U', ['llm'], 'Tool use, planning and agentic workflows.'],
  ['mcp', 'Model Context Protocol', 'ai', 'T', 'L', ['agents'], 'Standard interface between models and tools.'],
  ['vector_db', 'Vector Databases', 'ai', 'T', 'L', ['llm', 'nosql'], 'Embeddings and similarity search.'],
  ['rag', 'RAG Systems', 'ai', 'C', 'L', ['llm', 'vector_db'], 'Grounding model answers in your data.'],
  ['genkit', 'Firebase Genkit', 'ai', 'F', 'L', ['llm', 'firebase'], 'Framework for production AI flows.'],
  ['ai_eval', 'LLM Evaluation', 'ai', 'C', '-', ['llm'], 'Evals, guardrails and regression suites.'],
  ['finetune', 'Fine-tuning', 'ai', 'C', '-', ['llm', 'deep'], 'Adapting models to a domain.'],
  ['ml_basics', 'ML Fundamentals', 'ai', 'C', 'L', ['py'], 'Supervised/unsupervised learning and validation.'],
  ['stats', 'Statistics', 'ai', 'C', 'L', ['pandas'], 'Distributions, testing and inference.'],
  ['sklearn', 'scikit-learn', 'ai', 'F', 'L', ['ml_basics'], 'Classical ML in Python.'],
  ['deep', 'Deep Learning', 'ai', 'C', '-', ['ml_basics'], 'Neural networks and backpropagation.'],
  ['pytorch', 'PyTorch', 'ai', 'F', '-', ['deep'], 'Research-friendly deep learning framework.'],
  ['tensorflow', 'TensorFlow', 'ai', 'F', '-', ['deep'], 'Production deep learning and TF Lite.'],
  ['nlp', 'NLP', 'ai', 'C', '-', ['ml_basics'], 'Text understanding and generation.'],
  ['cv', 'Computer Vision', 'ai', 'C', '-', ['deep'], 'Image and video understanding.'],
  ['vertex', 'Vertex AI', 'ai', 'T', '-', ['gcp', 'ml_basics'], 'Managed ML platform on GCP.'],
  ['bqml', 'BigQuery ML', 'ai', 'T', '-', ['bigquery', 'ml_basics'], 'Train models with SQL.'],

  // ───────── Mobile
  ['android', 'Android', 'mobile', 'T', 'U', ['kotlin'], 'Native Android apps and SDK tooling.'],
  ['compose_ui', 'Jetpack Compose', 'mobile', 'F', 'L', ['android'], 'Declarative Android UI.'],
  ['flutter', 'Flutter', 'mobile', 'F', 'U', ['dart'], 'Cross-platform UI from one codebase.'],
  ['flutter_state', 'Flutter State', 'mobile', 'C', 'L', ['flutter'], 'Provider, Riverpod and Bloc patterns.'],
  ['ios', 'iOS / SwiftUI', 'mobile', 'T', 'L', ['swift'], 'Native Apple apps.'],
  ['rn', 'React Native', 'mobile', 'F', '-', ['react'], 'React for native mobile.'],
  ['capacitor', 'Capacitor / Ionic', 'mobile', 'F', '-', ['angular'], 'Wrap web apps as native apps.'],
  ['kmp', 'Kotlin Multiplatform', 'mobile', 'F', '-', ['kotlin'], 'Share logic across platforms.'],
  ['fcm', 'Push (FCM)', 'mobile', 'T', 'L', ['firebase'], 'Cross-platform push notifications.'],
  ['store_release', 'Store Release', 'mobile', 'C', '-', ['android', 'cicd'], 'Signing, review and staged rollouts.'],

  // ───────── Security & Identity
  ['authn', 'Authentication', 'sec', 'C', 'U', [], 'Sessions, tokens and credential handling.'],
  ['fb_auth', 'Firebase Auth', 'sec', 'T', 'U', ['authn', 'firebase'], 'Managed identity providers and custom claims.'],
  ['oauth', 'OAuth2 / OIDC / JWT', 'sec', 'C', 'U', ['authn'], 'Delegated auth and signed tokens.'],
  ['rbac', 'RBAC & Access Control', 'sec', 'C', 'L', ['authn'], 'Roles, permissions and least privilege.'],
  ['mfa', '2FA & WebAuthn', 'sec', 'C', 'L', ['authn'], 'Second factors and biometric passkeys.'],
  ['secrets', 'Secrets Management', 'sec', 'T', 'U', ['gcp'], 'Never ship credentials; rotate and vault them.'],
  ['iam', 'Cloud IAM', 'sec', 'T', 'L', ['gcp', 'rbac'], 'Service accounts and policy bindings.'],
  ['owasp', 'OWASP Top 10', 'sec', 'C', 'L', ['rest'], 'The classic web vulnerability catalog.'],
  ['crypto', 'Applied Cryptography', 'sec', 'C', '-', ['authn'], 'Hashing, encryption and key management.'],
  ['zero_trust', 'Zero Trust', 'sec', 'C', '-', ['rbac', 'mfa'], 'Verify every request, every time.'],
  ['pci', 'FinTech & PCI-DSS', 'sec', 'C', '-', ['rbac', 'crypto'], 'Payments compliance and data protection.'],
  ['pentest', 'Pentesting Basics', 'sec', 'C', '-', ['owasp'], 'Think like an attacker to defend better.'],

  // ───────── Engineering Craft
  ['git', 'Git & GitHub', 'craft', 'T', 'M', [], 'Branching, PR workflows and history surgery.'],
  ['testing', 'Testing Fundamentals', 'craft', 'C', 'U', [], 'Test pyramid, mocks and coverage.'],
  ['unit', 'Unit Testing', 'craft', 'C', 'U', ['testing'], 'Jest, Karma and Jasmine.'],
  ['e2e', 'E2E Testing', 'craft', 'T', 'L', ['testing'], 'Playwright and Cypress browser tests.'],
  ['tdd', 'TDD', 'craft', 'C', '-', ['unit'], 'Red-green-refactor discipline.'],
  ['algo', 'Data Structures & Algorithms', 'craft', 'C', 'U', [], 'Complexity analysis and core structures.'],
  ['sysdesign', 'System Design', 'craft', 'C', 'L', ['algo'], 'Scalability, tradeoffs and architecture.'],
  ['patterns', 'Design Patterns', 'craft', 'C', 'U', [], 'Reusable solutions to common design problems.'],
  ['clean', 'Clean Architecture', 'craft', 'C', 'L', ['patterns'], 'Layers, boundaries and dependency rules.'],
  ['ddd', 'Domain-Driven Design', 'craft', 'C', '-', ['clean'], 'Model the business in code.'],
  ['debug', 'Debugging & Profiling', 'craft', 'C', 'U', [], 'Systematic root-cause analysis.'],
  ['perf', 'Performance', 'craft', 'C', 'L', ['debug'], 'Measure first; optimize bundles, queries and renders.'],
  ['agile', 'Agile & Collaboration', 'craft', 'C', 'U', [], 'Iterative delivery with teams.'],
  ['docs', 'Technical Writing', 'craft', 'C', 'U', [], 'Docs, READMEs and decision records.'],
  ['oss', 'Open Source', 'craft', 'C', '-', ['git'], 'Contributing and maintaining in public.'],
  ['monorepo', 'Monorepos (Nx)', 'craft', 'T', '-', ['git'], 'Scaling multiple apps in one repo.'],
];

const roles = [
  { id: 'fullstack', name: 'Full-Stack Web', skills: ['angular', 'rxjs', 'node', 'express', 'rest', 'postgres', 'firebase', 'docker', 'gh_actions', 'oauth', 'unit'] },
  { id: 'frontend', name: 'Frontend', skills: ['angular_adv', 'react', 'a11y', 'css_anim', 'responsive', 'e2e', 'perf', 'vite'] },
  { id: 'backend', name: 'Backend', skills: ['node', 'spring', 'go', 'postgres', 'microservices', 'mq', 'grpc', 'redis', 'owasp'] },
  { id: 'devops', name: 'Cloud / DevOps', skills: ['k8s', 'terraform', 'gh_actions', 'cloud_run', 'linux', 'observe', 'iam'] },
  { id: 'dataeng', name: 'Data Engineer', skills: ['bigquery', 'dbt', 'dataform', 'spark', 'beam', 'airflow', 'warehousing'] },
  { id: 'aieng', name: 'AI Engineer', skills: ['gemini', 'rag', 'agents', 'mcp', 'genkit', 'ai_eval', 'vertex', 'vector_db'] },
  { id: 'mobile', name: 'Mobile', skills: ['flutter', 'compose_ui', 'ios', 'rn', 'fcm', 'store_release'] },
  { id: 'security', name: 'Security / FinTech', skills: ['oauth', 'rbac', 'mfa', 'zero_trust', 'pci', 'crypto', 'pentest', 'iam'] },
];

const STATUS = { M: 'mastered', U: 'unlocked', L: 'learning', '-': 'locked' };
const TYPE = { L: 'language', F: 'framework', T: 'tool', C: 'concept' };

const ids = new Set(['me', ...domains.map(d => d.id), ...N.map(n => n[0])]);
const nodes = [
  { id: 'me', title: 'Developer', domain: 'hub', type: 'domain', status: 'mastered', requires: [], resumeContext: 'Every journey starts here. Pick a branch, or plan your own.' },
  ...domains.map(d => ({ id: d.id, title: d.name, domain: d.id, type: 'domain', status: 'unlocked', requires: ['me'], resumeContext: `The ${d.name} branch of the map.` })),
  ...N.map(([id, title, domain, type, st, req, ctx]) => ({
    id, title, domain, type: TYPE[type], status: STATUS[st],
    requires: req.length ? req : [domain], resumeContext: ctx,
  })),
];

// Validate references so a typo can never ship.
for (const n of nodes) for (const r of n.requires) if (!ids.has(r)) throw new Error(`${n.id} requires unknown ${r}`);
for (const r of roles) for (const s of r.skills) if (!ids.has(s)) throw new Error(`role ${r.id} unknown skill ${s}`);
if (new Set(nodes.map(n => n.id)).size !== nodes.length) throw new Error('duplicate node id');

writeFileSync('public/skills.json', JSON.stringify({ domains, roles, nodes }, null, 1));
console.log(`skills.json: ${nodes.length} nodes, ${domains.length} domains, ${roles.length} roles`);
