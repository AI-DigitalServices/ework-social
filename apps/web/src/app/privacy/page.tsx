export default function PrivacyPage() {
  const sectionStyle = { color: '#6B8299', fontSize: 15, lineHeight: 1.8 } as const;
  const h2Style = { fontFamily: 'Libre Baskerville, serif', fontSize: 20, fontWeight: 700, color: '#F0F6FF', marginBottom: 12 } as const;
  const wrapStyle = { marginBottom: 36 } as const;
  const linkStyle = { color: '#3B82F6' } as const;

  const stringSections = [
    {
      title: '1. Information We Collect',
      content: `We collect information you provide directly to us when you create an account, including your name, email address, and agency/workspace name. We also collect information about your use of our services, including social media accounts you connect, posts you schedule, and clients you manage through our CRM.`
    },
    {
      title: '2. How We Use Your Information',
      content: `We use the information we collect to provide, maintain, and improve our services; process transactions and send related information; send technical notices and support messages; respond to your comments and questions; and send marketing communications (you may opt out at any time).`
    },
    {
      title: '3. Social Media Integrations',
      content: `When you connect social media accounts (Facebook, Instagram, LinkedIn, etc.) to eWork Social, we access your social media data solely to provide our scheduling and management services. We do not sell your social media data to third parties. Access tokens are stored securely and encrypted. You can revoke access at any time from your Settings page or directly from the social platform.`
    },
    {
      title: '4. Data Storage and Security',
      content: `Your data is stored on secure servers. We use industry-standard encryption to protect your personal information. We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and all associated data at any time from Settings → Profile → Danger Zone.`
    },
    {
      title: '5. Data Sharing',
      content: `We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our platform (such as payment processors and email delivery services), subject to strict confidentiality agreements.`
    },
    {
      title: '6. Cookies',
      content: `We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.`
    },
    {
      title: '7. Your Rights',
      content: `You have the right to access, update, or delete your personal information at any time. You may also request a copy of your data or opt out of marketing communications. To exercise these rights, contact us at privacy@eworksocial.com.`
    },
    {
      title: "8. Children's Privacy",
      content: `eWork Social is not directed to children under 18. We do not knowingly collect personal information from children under 18.`
    },
    {
      title: '9. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.`
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif", padding: '60px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap'); * { box-sizing: border-box; } a { color: #3B82F6; }`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 48 }}>
          <img src="/icon.png" alt="eWork Social" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>eWork Social</span>
        </a>

        <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 36, fontWeight: 700, color: '#F0F6FF', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 48 }}>Last updated: July 2026</p>

        {/* Sections 1–9: unchanged from original */}
        {stringSections.map((section, i) => (
          <div key={i} style={wrapStyle}>
            <h2 style={h2Style}>{section.title}</h2>
            <p style={sectionStyle}>{section.content}</p>
          </div>
        ))}

        {/* Section 10: Meta Platform Data — added for Meta App Review compliance */}
        <div style={wrapStyle}>
          <h2 style={h2Style}>10. Meta Platform Data</h2>
          <p style={sectionStyle}>
            eWork Social integrates with Meta&apos;s platforms (Facebook and Instagram) through the Meta Platform API.
            When you connect your Facebook Pages or Instagram Business Accounts, we access data including page posts,
            comments, direct messages, and engagement metrics solely to provide scheduling, publishing, and
            auto-response services. We request only the permissions necessary to deliver these features, including
            pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish,
            instagram_manage_comments, and instagram_manage_messages. We do not store message or comment content
            beyond what is required to match keywords and deliver automated responses. Our use of Meta Platform Data
            is governed by the{' '}
            <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Meta Platform Terms
            </a>
            {' '}and we comply with Meta&apos;s Platform Policies. You may revoke eWork Social&apos;s access to your
            Facebook or Instagram account at any time via Facebook Settings &rarr; Security and Login &rarr; Apps and Websites.
          </p>
        </div>

        {/* Section 11: YouTube API Services — required by Google OAuth verification */}
        <div style={wrapStyle}>
          <h2 style={h2Style}>11. YouTube API Services</h2>
          <p style={sectionStyle}>
            eWork Social uses YouTube API Services to enable users to schedule and publish video content to their
            YouTube channels. When you connect your YouTube account, we access the following data solely to provide
            content scheduling and publishing services:
          </p>
          <ul style={{ ...sectionStyle, paddingLeft: 24, marginTop: 12, marginBottom: 12 }}>
            <li style={{ marginBottom: 6 }}>Your YouTube channel identity and basic channel information</li>
            <li style={{ marginBottom: 6 }}>Upload permissions to publish video content on your behalf</li>
            <li style={{ marginBottom: 6 }}>Playlist and video metadata needed to manage scheduled content</li>
          </ul>
          <p style={{ ...sectionStyle, marginBottom: 12 }}>
            We request only the minimum YouTube API scopes necessary to deliver these features
            (including <strong style={{ color: '#8BA0BC' }}>youtube.upload</strong> and <strong style={{ color: '#8BA0BC' }}>youtube.readonly</strong>).
            We do not store video content on our servers beyond the point of upload to YouTube.
            YouTube user data is used exclusively to provide the scheduling and publishing feature you requested
            and is never used for advertising, sold to third parties, or shared with data brokers or information resellers.
          </p>
          <p style={{ ...sectionStyle, marginBottom: 12 }}>
            <strong style={{ color: '#C0D0E0' }}>Google user data and AI:</strong> eWork Social uses AI features
            (powered by Anthropic&apos;s Claude) to assist with caption writing and reply suggestions.
            Google user data obtained via YouTube API Services — including your channel data and any
            associated content — is <strong style={{ color: '#C0D0E0' }}>never</strong> used to train, develop,
            or improve any AI or machine learning model, whether personalized or non-personalized.
            Google user data is used solely to provide the specific user-facing features visible in your
            eWork Social dashboard.
          </p>
          <p style={{ ...sectionStyle, marginBottom: 12 }}>
            <strong style={{ color: '#C0D0E0' }}>Limited Use compliance:</strong> eWork Social&apos;s use and
            transfer of information received from Google APIs to any other app will adhere to the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p style={sectionStyle}>
            Our use of YouTube API Services is subject to the{' '}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              YouTube Terms of Service
            </a>
            {' '}and{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google&apos;s Privacy Policy
            </a>
            . You may revoke eWork Social&apos;s access to your YouTube account at any time from your eWork Social
            Settings page (Settings → Social Accounts → Disconnect YouTube) or directly via{' '}
            <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google Security Settings
            </a>
            .
          </p>
        </div>

        {/* Section 12: Google Sign-In */}
        <div style={wrapStyle}>
          <h2 style={h2Style}>12. Google Sign-In</h2>
          <p style={sectionStyle}>
            eWork Social offers Google Sign-In as an optional authentication method. When you sign in with Google,
            we access only your name and email address to create or link your account. This data is used solely for
            authentication and account management. We do not access your Gmail, Google Drive, Google Calendar, or
            any other Google service through the sign-in flow. Google Sign-In data (name and email) is never used
            to train AI or machine learning models and is never sold or shared with third parties for advertising
            purposes. eWork Social&apos;s use of Google Sign-In data adheres to the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </div>

        {/* Section 13: Contact Us */}
        <div style={wrapStyle}>
          <h2 style={h2Style}>13. Contact Us</h2>
          <p style={sectionStyle}>
            If you have any questions about this Privacy Policy, please contact us at privacy@eworksocial.com or visit our website at eworksocial.com.
          </p>
        </div>

        <div style={{ borderTop: '1px solid #1A2840', paddingTop: 32, marginTop: 48, textAlign: 'center' }}>
          <p style={{ color: '#2A3A52', fontSize: 13 }}>© 2026 eWork Social · A product of Jben Logistics (RC: 1940369) · Lagos, Nigeria · <a href="/terms">Terms of Service</a> · <a href="/">Home</a></p>
        </div>
      </div>
    </div>
  );
}
