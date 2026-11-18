import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connect eWork Social to Make, n8n and Zapier',
  description:
    'Send eWork Social events to Make, n8n, Zapier or your own code, write back into your CRM with an API key, and feed website forms straight into your pipeline. Step-by-step templates included.',
};

const API_BASE = 'https://api.eworksocial.com/api/public/v1';

const C = {
  bg: '#080C14',
  card: '#0C1524',
  border: '#1A2840',
  text: '#C8D8EC',
  muted: '#8BA0BC',
  blue: '#2563EB',
  green: '#10B981',
};

const card: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 28,
};

function Code({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: '#050810',
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 14,
        overflowX: 'auto',
        fontSize: 12,
        lineHeight: 1.6,
        color: C.text,
        margin: '10px 0',
      }}
    >
      {children}
    </pre>
  );
}

const DIRECTIONS = [
  {
    title: 'Events going out',
    tag: 'Webhooks',
    plan: 'Growth plan and above',
    body: 'eWork Social sends a message to your tool the moment something happens: a lead arrives, a deal changes stage, a note or task is added, a post is published or fails. Your tool then does the next step.',
  },
  {
    title: 'Actions coming in',
    tag: 'API keys',
    plan: 'Agency Pro plan and above',
    body: 'Your tool can do things inside eWork Social: add a contact, move a deal to a new stage, add a note or task, or schedule a post. You create a key, choose what it may do, and paste it into your tool.',
  },
  {
    title: 'Website forms in',
    tag: 'Lead capture',
    plan: 'Growth plan and above',
    body: 'Give your website form a private address. Every submission becomes a lead in your CRM with the source set to Website, and fires the new-lead event so your automations run.',
  },
];

const CHOOSE = [
  ['I want to be told when something happens', 'Webhooks'],
  ['I want my tool to create or change things in eWork Social', 'API keys'],
  ['I want my website contact form to add leads to the CRM', 'Lead capture'],
  ['I want both: a form becomes a lead, and a team alert goes out', 'Lead capture plus a new-lead webhook'],
];

type Steps = { make: string[]; n8n: string[]; zapier: string[] };

type Template = {
  id: string;
  title: string;
  summary: string;
  needs: string;
  ework: string[];
  steps: Steps;
  file?: string;
  sample?: string;
};

const TEMPLATES: Template[] = [
  {
    id: 'lead-to-sheet-slack',
    title: 'New website lead to Google Sheet and a Slack alert',
    summary:
      'A visitor fills in your contact form. They land in your CRM as a lead, a new row is added to a Google Sheet, and your team gets a Slack message.',
    needs: 'Growth plan or above. No API key needed.',
    ework: [
      'Go to Settings, then Integrations, then Website lead capture, and press Add form link. Copy the address it shows and point your website form at it (the How to connect your form section under the link has copy-ready steps for WordPress, Make, n8n and plain HTML).',
      'Under Webhooks, add your tool address (from the steps below), tick New lead (CRM), and press Create. Then press the blue Send test button.',
    ],
    steps: {
      make: [
        'Create a new scenario. Add the Webhooks app and choose Custom webhook. Press Add, give it a name, and copy the address.',
        'Paste that address into eWork Social under Webhooks and press Send test.',
        'Back in Make, the webhook module should say it successfully determined the data structure. If it does not, press Run once and send the test again.',
        'Add Google Sheets, then Add a Row. Map the data fields: name, email, phone, company, source, message.',
        'Add Slack, then Create a Message. Write something like: New lead from the website, with the name and email fields inserted.',
        'Switch the scenario on.',
      ],
      n8n: [
        'Download the starter file below. In n8n choose Import from File.',
        'Open the first node (eWork event) and copy its Test URL. Paste it into eWork Social under Webhooks and press Send test. You should see the data arrive in n8n.',
        'Replace the two nodes marked ADD HERE with a Google Sheets Append Row node and a Slack Send Message node, using your own credentials. The previous node already provides name, email, phone, company, source and message.',
        'When it works, switch the workflow to Active, copy the Production URL from the first node, and replace the Test URL in eWork Social with it.',
      ],
      zapier: [
        'Create a Zap. For the trigger choose Webhooks by Zapier, then Catch Hook. Copy the Custom Webhook URL.',
        'Paste it into eWork Social under Webhooks and press Send test. In Zapier press Test trigger.',
        'Add the action Google Sheets, then Create Spreadsheet Row, and map name, email, phone, company and source from the data section.',
        'Add the action Slack, then Send Channel Message.',
        'Publish the Zap. Webhooks by Zapier is a premium app, so check that your Zapier plan includes it.',
      ],
    },
    file: '/templates/n8n-lead-to-sheet-and-slack.json',
    sample: `{
  "id": "evt_9f2c1a7b4d3e5f60a1b2c3d4",
  "event": "lead.created",
  "workspaceId": "cm0example",
  "createdAt": "2026-11-18T11:40:02.000Z",
  "firedAt": "2026-11-18T11:40:02.000Z",
  "data": {
    "clientId": "cmw0example",
    "name": "Ada Obi",
    "email": "ada@acme.com",
    "phone": null,
    "company": "Acme",
    "stage": "LEAD",
    "source": "WEBSITE",
    "form": "Contact page form",
    "message": "Need a quote"
  }
}`,
  },
  {
    id: 'deal-active-onboarding',
    title: 'Deal moved to Active, create onboarding tasks automatically',
    summary:
      'When you move a client to the Active stage, your tool adds a welcome task and a note to that client straight away, so onboarding never depends on someone remembering.',
    needs: 'Growth plan or above for the webhook, and Agency Pro or above for the API key.',
    ework: [
      'Under Webhooks, add your tool address and tick Pipeline stage changed.',
      'Under API keys, press Create key, name it, tick Create and update contacts, and copy the key when it is shown. It appears only once.',
    ],
    steps: {
      make: [
        'Create a scenario with Webhooks, Custom webhook as the trigger. Copy the address into eWork Social and press Send test.',
        'Add a filter between the modules: the data field to must equal ACTIVE.',
        'Add the HTTP app, then Make a request. URL: ' + API_BASE + '/clients/ followed by the clientId field, then /tasks. Method POST.',
        'Add two headers: Authorization with the value Bearer then your key, and Content-Type with the value application/json. Body type Raw, content type JSON, body: a JSON object with a title such as Send welcome pack.',
        'Copy the module to add more tasks, or change the URL ending to /notes and send a content field to add a note.',
        'Switch the scenario on.',
      ],
      n8n: [
        'Download the starter file below and import it.',
        'Copy the Test URL from the first node into eWork Social under Webhooks and press Send test, then move a test client to Active to see it flow.',
        'In both HTTP Request nodes replace PASTE_YOUR_EWORK_API_KEY with your key. You can store it once as a Header Auth credential instead.',
        'Edit the task title and note text as you like, then switch the workflow to Active and use the Production URL in eWork Social.',
      ],
      zapier: [
        'Create a Zap with Webhooks by Zapier, Catch Hook as the trigger. Copy the URL into eWork Social and press Send test.',
        'Add a Filter step: only continue if the data to field exactly matches ACTIVE.',
        'Add the action Webhooks by Zapier, then Custom Request. Method POST. URL: ' + API_BASE + '/clients/ followed by the clientId field, then /tasks.',
        'Add the header Authorization with the value Bearer then your key, and Content-Type application/json. Data: a JSON object with a title field.',
        'Publish the Zap.',
      ],
    },
    file: '/templates/n8n-deal-active-onboarding.json',
    sample: `{
  "id": "evt_1a2b3c4d5e6f708192a3b4c5",
  "event": "client.stage_changed",
  "workspaceId": "cm0example",
  "createdAt": "2026-11-18T12:05:41.000Z",
  "firedAt": "2026-11-18T12:05:41.000Z",
  "data": {
    "clientId": "cmw0example",
    "name": "Ada Obi",
    "email": "ada@acme.com",
    "company": "Acme",
    "dealValue": 250000,
    "from": "PROPOSAL",
    "to": "ACTIVE"
  }
}`,
  },
  {
    id: 'form-to-crm',
    title: 'Typeform, Google Forms or any form tool into your CRM',
    summary:
      'Responses from a form tool that is not on your own website become leads in your CRM, deduplicated by email.',
    needs: 'Growth plan or above. No API key needed.',
    ework: [
      'Under Website lead capture, press Add form link and copy the address. Treat it like a password: anyone who has it can add leads.',
    ],
    steps: {
      make: [
        'Create a scenario. For the trigger choose your form app: Typeform, Watch Responses, or Google Forms, Watch Responses.',
        'Add the HTTP app, then Make a request. URL: your form address from eWork Social. Method POST. Body type Raw, content type JSON.',
        'Build a JSON body that maps the answers to these field names: name, email, phone, company, message. Other answers can be sent too and are saved in the contact note.',
        'Run once with a real test response. eWork Social replies with ok true and created true for a new person, or created false if that email already exists (a note is added instead).',
        'Switch the scenario on.',
      ],
      n8n: [
        'Download the starter file below and import it. It expects a Typeform webhook payload.',
        'Copy the first node Test URL into Typeform under Connect, Webhooks. Submit a test response.',
        'Open the last node and replace PASTE_YOUR_FORM_ADDRESS with your eWork Social form address.',
        'For Google Forms, replace the first node with a Google Sheets Trigger on the sheet linked to your form, and map the columns to name, email, phone, company, message.',
        'Switch the workflow to Active.',
      ],
      zapier: [
        'Create a Zap. For the trigger choose Typeform, New Entry. For Google Forms, use Google Sheets, New Spreadsheet Row on the sheet linked to the form.',
        'Add the action Webhooks by Zapier, then POST. URL: your form address from eWork Social. Payload type: json.',
        'Map the data fields: name, email, phone, company, message.',
        'Test the step, then publish the Zap.',
      ],
    },
    file: '/templates/n8n-form-to-crm.json',
    sample: `POST <your form address>
Content-Type: application/json

{
  "name": "Ada Obi",
  "email": "ada@acme.com",
  "phone": "+2348000000000",
  "company": "Acme",
  "message": "Interested in the Growth plan",
  "budget": "5000"
}

Response: {"ok":true,"created":true}`,
  },
];

const EVENTS = [
  ['lead.created', 'A new contact or lead is added to the CRM, including website form leads.'],
  ['client.updated', 'A contact detail changes. The data lists which fields changed and the previous values.'],
  ['client.stage_changed', 'A contact moves to a different pipeline stage. Includes from and to.'],
  ['client.deleted', 'A contact is deleted.'],
  ['note.added', 'A note is added to a contact.'],
  ['task.created', 'A task is created for a contact.'],
  ['task.completed', 'A task is marked done.'],
  ['post.published', 'A scheduled or instant post went live.'],
  ['post.failed', 'A post could not be published.'],
  ['inbox.message', 'A new comment or direct message arrived in the Engagement Hub.'],
];

const ENDPOINTS = [
  ['GET', '/me', 'any valid key', 'Connection test. Returns your workspace and what the key may do.'],
  ['GET', '/clients', 'contacts: read', 'List contacts. Filters: stage, email, updatedSince, limit, cursor.'],
  ['GET', '/clients/{id}', 'contacts: read', 'One contact with recent notes and open tasks.'],
  ['POST', '/clients', 'contacts: write', 'Create a contact. Duplicate emails are refused with the existing id.'],
  ['PATCH', '/clients/{id}', 'contacts: write', 'Update name, email, phone, company, tags, dealValue, nextFollowUpAt.'],
  ['POST', '/clients/{id}/stage', 'contacts: write', 'Move to LEAD, CONTACTED, PROPOSAL, ACTIVE or DORMANT.'],
  ['POST', '/clients/{id}/notes', 'contacts: write', 'Add a note. Body: content.'],
  ['POST', '/clients/{id}/tasks', 'contacts: write', 'Add a task. Body: title, optional dueDate.'],
  ['POST', '/tasks/{id}/complete', 'contacts: write', 'Mark a task done.'],
  ['GET', '/accounts', 'posts: read', 'Connected social accounts and their ids (never their tokens).'],
  ['GET', '/posts', 'posts: read', 'List posts. Filters: status, limit, cursor.'],
  ['POST', '/posts', 'posts: write', 'Create a DRAFT or a SCHEDULED post. Immediate publishing is not available.'],
];

const SIGNATURE = `// Node.js: confirm a delivery really came from eWork Social
const crypto = require('crypto');

function isGenuine(rawBody, signatureHeader, signingSecret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody)            // the exact raw text received, not re-serialised
    .digest('hex');
  return signatureHeader === expected;
}

// Headers on every delivery:
//   X-EWork-Event      the event name
//   X-EWork-Delivery   unique id, use it to ignore duplicates
//   X-EWork-Timestamp  when it was sent
//   X-EWork-Signature  sha256=<hmac>`;

const FAQ = [
  [
    'Do I need to write code?',
    'No. Make, n8n and Zapier are point-and-click tools. The templates below tell you which boxes to fill in. Code samples are there for developers who want them.',
  ],
  [
    'Is there a native eWork Social app inside Make or Zapier?',
    'Not yet. You connect with their standard webhook and HTTP steps, which work the same way and are covered by the templates here.',
  ],
  [
    'What happens if my tool is down when an event fires?',
    'Today each event is sent once, with a ten second timeout, and the last result is shown next to the webhook in Settings. Automatic retries are planned.',
  ],
  [
    'Is it safe?',
    'Keys are stored only as a one-way hash, so even we cannot read them back. Each key has permissions you choose, can expire, and can be revoked instantly. Webhook addresses must be public https addresses, and every delivery is signed so you can verify it.',
  ],
  [
    'Are there limits?',
    'Each API key allows 120 requests per minute (higher on Enterprise). A workspace can have up to 10 webhooks, 10 active API keys and 5 form links.',
  ],
];

export default function AutomationGuidePage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, color: '#fff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .ig-wrap { max-width: 920px; margin: 0 auto; padding: 0 24px; }
        .ig-btn { background: ${C.blue}; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block; }
        .ig-btn-o { color: ${C.text}; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; border: 1px solid #2A3A52; text-decoration: none; display: inline-block; }
        .ig-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
        .ig-list li { margin: 6px 0 6px 20px; line-height: 1.6; font-size: 14px; color: ${C.text}; }
        .ig-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ig-table th, .ig-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #12203A; vertical-align: top; }
        .ig-table th { color: ${C.muted}; font-weight: 600; }
        details.ig-d { border: 1px solid ${C.border}; border-radius: 10px; padding: 12px 16px; margin: 10px 0; background: #0A1220; }
        details.ig-d summary { cursor: pointer; font-weight: 700; font-size: 14px; color: #fff; }
        .ig-scroll { overflow-x: auto; }
      `}</style>

      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '18px 0' }}>
        <div className="ig-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>eWork Social</Link>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/pricing" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>Pricing</Link>
            <Link href="/blog" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>Blog</Link>
            <Link href="/register" className="ig-btn" style={{ padding: '8px 18px' }}>Start free</Link>
          </div>
        </div>
      </nav>

      <header className="ig-wrap" style={{ padding: '64px 24px 36px', textAlign: 'center' }}>
        <p style={{ color: C.green, fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>AUTOMATION GUIDE</p>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.15, margin: '12px 0 16px' }}>
          Connect eWork Social to Make, n8n, Zapier and your own tools
        </h1>
        <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.7, maxWidth: 680, margin: '0 auto 28px' }}>
          Get alerts when leads arrive or deals move, let your automations update your CRM and schedule posts, and
          send website forms straight into your pipeline. No code needed.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#templates" className="ig-btn">See the templates</a>
          <a href="#reference" className="ig-btn-o">Events and API reference</a>
        </div>
      </header>

      <main className="ig-wrap" style={{ paddingBottom: 72 }}>
        <section id="how" style={{ margin: '24px 0 48px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>How it works</h2>
          <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            There are three ways to connect, and you can use any combination. Each one is switched on from Settings,
            then Integrations, inside the app, and has a small question-mark button that explains it in place.
          </p>
          <div className="ig-grid">
            {DIRECTIONS.map(d => (
              <div key={d.title} style={card}>
                <p style={{ color: C.green, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>{d.tag.toUpperCase()}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '8px 0' }}>{d.title}</h3>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65 }}>{d.body}</p>
                <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>{d.plan}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ margin: '0 0 48px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Which one do I need?</h2>
          <div style={card} className="ig-scroll">
            <table className="ig-table">
              <thead><tr><th>I want to</th><th>Use</th></tr></thead>
              <tbody>
                {CHOOSE.map(([want, use]) => (
                  <tr key={want}><td style={{ color: C.text }}>{want}</td><td style={{ color: '#fff', fontWeight: 600 }}>{use}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="templates" style={{ margin: '0 0 48px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Starter templates</h2>
          <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            Each template shows the eWork Social side once, then the steps for Make, n8n and Zapier. Open the tool you
            use. n8n templates come as files you can import.
          </p>
          <div style={{ display: 'grid', gap: 20 }}>
            {TEMPLATES.map(t => (
              <article key={t.id} id={t.id} style={card}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t.title}</h3>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7 }}>{t.summary}</p>
                <p style={{ color: C.muted, fontSize: 13, margin: '8px 0 14px' }}>Needs: {t.needs}</p>

                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.green }}>In eWork Social</h4>
                <ol className="ig-list">{t.ework.map((s, i) => <li key={i}>{s}</li>)}</ol>

                {(['make', 'n8n', 'zapier'] as const).map(tool => (
                  <details key={tool} className="ig-d">
                    <summary>{tool === 'make' ? 'Make' : tool === 'n8n' ? 'n8n' : 'Zapier'}</summary>
                    <ol className="ig-list" style={{ marginTop: 10 }}>
                      {t.steps[tool].map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                    {tool === 'n8n' && t.file && (
                      <p style={{ marginTop: 12 }}>
                        <a href={t.file} download className="ig-btn-o" style={{ padding: '8px 16px', fontSize: 13 }}>Download the n8n file</a>
                      </p>
                    )}
                  </details>
                ))}

                {t.sample && (
                  <details className="ig-d">
                    <summary>What the data looks like</summary>
                    <Code>{t.sample}</Code>
                  </details>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="reference" style={{ margin: '0 0 48px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Reference</h2>

          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Events you can subscribe to</h3>
            <div className="ig-scroll">
              <table className="ig-table">
                <thead><tr><th>Event</th><th>When it fires</th></tr></thead>
                <tbody>
                  {EVENTS.map(([id, when]) => (
                    <tr key={id}><td><code style={{ color: '#fff' }}>{id}</code></td><td style={{ color: C.text }}>{when}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
              Every delivery is a JSON message with an id, the event name, your workspace id, a timestamp and a data
              object. Press Send test next to a webhook in Settings to see a live example in your tool.
            </p>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>API for your automations</h3>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7 }}>
              Base address: <code style={{ color: '#fff' }}>{API_BASE}</code>. Send your key in every request as the
              header <code style={{ color: '#fff' }}>Authorization: Bearer ewk_live_your_key</code>. Create keys under
              Settings, then Integrations, then API keys. A key can be limited to the permissions you tick, can
              expire, and can be revoked at any time.
            </p>
            <div className="ig-scroll" style={{ marginTop: 12 }}>
              <table className="ig-table">
                <thead><tr><th>Method</th><th>Path</th><th>Permission</th><th>What it does</th></tr></thead>
                <tbody>
                  {ENDPOINTS.map(([m, p, s, d]) => (
                    <tr key={m + p}>
                      <td style={{ color: C.green, fontWeight: 700 }}>{m}</td>
                      <td><code style={{ color: '#fff' }}>{p}</code></td>
                      <td style={{ color: C.muted }}>{s}</td>
                      <td style={{ color: C.text }}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
              Quick test from a terminal:
            </p>
            <Code>{`curl ${API_BASE}/me -H "Authorization: Bearer ewk_live_your_key"`}</Code>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Checking a delivery is genuine</h3>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7 }}>
              Make, n8n and Zapier do not need this. If you receive webhooks in your own code, verify the signature
              with the signing secret shown once when you created the webhook.
            </p>
            <Code>{SIGNATURE}</Code>
          </div>
        </section>

        <section style={{ margin: '0 0 48px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Common questions</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {FAQ.map(([q, a]) => (
              <div key={q} style={{ ...card, padding: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{q}</p>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...card, textAlign: 'center', padding: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Ready to connect your tools?</h2>
          <p style={{ color: C.muted, fontSize: 15, marginBottom: 20 }}>
            Webhooks and lead capture start on the Growth plan. API keys are included with Agency Pro and above.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/pricing" className="ig-btn">See plans</Link>
            <Link href="/register" className="ig-btn-o">Start free</Link>
          </div>
        </section>
      </main>

      <footer style={{ padding: '32px 0', textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
        <p style={{ color: C.muted, fontSize: 13 }}>
          Questions? <a href="mailto:hello@eworksocial.com" style={{ color: C.muted }}>hello@eworksocial.com</a> ·{' '}
          <Link href="/" style={{ color: C.muted }}>Back to home</Link>
        </p>
      </footer>
    </div>
  );
}
