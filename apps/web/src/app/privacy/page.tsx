export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif", padding: '60px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap'); * { box-sizing: border-box; } a { color: #3B82F6; }`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 48 }}>
          <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>eWork Social</span>
        </a>

        <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 36, fontWeight: 700, color: '#F0F6FF', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 48 }}>Last updated: March 2026</p>

        {[
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
            title: '8. Children\'s Privacy',
            content: `eWork Social is not directed to children under 18. We do not knowingly collect personal information from children under 18.`
          },
          {
            title: '9. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.`
          },
          {
            title: '10. Contact Us',
            content: `If you have any questions about this Privacy Policy, please contact us at privacy@eworksocial.com or visit our website at eworksocial.com.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 20, fontWeight: 700, color: '#F0F6FF', marginBottom: 12 }}>{section.title}</h2>
            <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.8 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #1A2840', paddingTop: 32, marginTop: 48, textAlign: 'center' }}>
          <p style={{ color: '#2A3A52', fontSize: 13 }}>© 2026 eWork Social · A product of Jben Logistics · Lagos, Nigeria · <a href="/terms">Terms of Service</a> · <a href="/">Home</a></p>
        </div>
      </div>
    </div>
  );
}