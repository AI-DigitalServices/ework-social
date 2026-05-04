export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif", padding: '60px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap'); * { box-sizing: border-box; } a { color: #3B82F6; }`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 48 }}>
          <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>eWork Social</span>
        </a>

        <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 36, fontWeight: 700, color: '#F0F6FF', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 48 }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            content: `By accessing and using eWork Social, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.`
          },
          {
            title: '2. Description of Service',
            content: `eWork Social is a social media management platform that allows agencies and individuals to schedule posts, manage clients, track analytics, and automate responses across multiple social media platforms.`
          },
          {
            title: '3. Account Registration',
            content: `You must create an account to use eWork Social. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.`
          },
          {
            title: '4. Subscription and Payment',
            content: `eWork Social offers a 7-day free trial followed by paid subscription plans. Subscriptions are billed monthly. You may cancel at any time, but no refunds are provided for partial months. We reserve the right to change pricing with 30 days notice.`
          },
          {
            title: '5. Acceptable Use',
            content: `You agree not to use eWork Social to post spam, illegal content, or content that violates any third-party platform's terms of service. You are solely responsible for the content you publish through our platform. We reserve the right to suspend accounts that violate these terms.`
          },
          {
            title: '6. Social Media Platform Compliance',
            content: `Your use of social media integrations must comply with the respective platform's terms of service (Facebook, Instagram, LinkedIn, etc.). eWork Social is not responsible for any violations of third-party platform policies.`
          },
          {
            title: '7. Data and Privacy',
            content: `Your use of eWork Social is also governed by our Privacy Policy. We take data security seriously and implement industry-standard measures to protect your information.`
          },
          {
            title: '8. Intellectual Property',
            content: `eWork Social and its original content, features, and functionality are owned by AI Digital Services and are protected by copyright, trademark, and other intellectual property laws. You retain ownership of all content you create and publish through our platform.`
          },
          {
            title: '9. Limitation of Liability',
            content: `eWork Social shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of our service, including but not limited to loss of revenue, data, or business opportunities.`
          },
          {
            title: '10. Termination',
            content: `We reserve the right to terminate or suspend your account at any time for violation of these terms. You may also delete your account at any time from Settings → Profile → Danger Zone. Upon termination, your data will be permanently deleted.`
          },
          {
            title: '11. Changes to Terms',
            content: `We reserve the right to modify these terms at any time. We will notify users of significant changes via email. Continued use of eWork Social after changes constitutes acceptance of the new terms.`
          },
          {
            title: '12. Contact',
            content: `For questions about these Terms, contact us at legal@eworksocial.com or visit eworksocial.com.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 20, fontWeight: 700, color: '#F0F6FF', marginBottom: 12 }}>{section.title}</h2>
            <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.8 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #1A2840', paddingTop: 32, marginTop: 48, textAlign: 'center' }}>
          <p style={{ color: '#2A3A52', fontSize: 13 }}>© 2026 eWork Social · A product of Jben Logistics · Lagos, Nigeria · <a href="/privacy">Privacy Policy</a> · <a href="/">Home</a></p>
        </div>
      </div>
    </div>
  );
}
