export const metadata = {
  title: 'Delete your account | eWork Social',
  description: 'How to delete your eWork Social account and what happens to your data.',
};

export default function DeleteAccountPage() {
  const sectionStyle = { color: '#6B8299', fontSize: 15, lineHeight: 1.8 } as const;
  const h2Style = { fontFamily: 'Libre Baskerville, serif', fontSize: 20, fontWeight: 700, color: '#F0F6FF', marginBottom: 12 } as const;
  const wrapStyle = { marginBottom: 36 } as const;
  const listStyle = { ...sectionStyle, paddingLeft: 24, marginTop: 8 } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif", padding: '60px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap'); * { box-sizing: border-box; } a { color: #3B82F6; }`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 48 }}>
          <img src="/icon.png" alt="eWork Social" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>eWork Social</span>
        </a>

        <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 36, fontWeight: 700, color: '#F0F6FF', marginBottom: 8 }}>Delete your account</h1>
        <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 48 }}>Last updated: November 2026</p>

        <div style={wrapStyle}>
          <h2 style={h2Style}>In the mobile app</h2>
          <ol style={listStyle}>
            <li style={{ marginBottom: 6 }}>Open eWork Social and sign in.</li>
            <li style={{ marginBottom: 6 }}>Go to <strong style={{ color: '#8BA0BC' }}>More</strong>, then <strong style={{ color: '#8BA0BC' }}>Profile and account</strong>.</li>
            <li style={{ marginBottom: 6 }}>Tap <strong style={{ color: '#8BA0BC' }}>Delete account</strong>, type DELETE to confirm, and tap <strong style={{ color: '#8BA0BC' }}>Delete my account</strong>.</li>
          </ol>
        </div>

        <div style={wrapStyle}>
          <h2 style={h2Style}>On the website</h2>
          <ol style={listStyle}>
            <li style={{ marginBottom: 6 }}>Sign in at <a href="https://app.eworksocial.com">app.eworksocial.com</a>.</li>
            <li style={{ marginBottom: 6 }}>Go to <strong style={{ color: '#8BA0BC' }}>Settings</strong>, then <strong style={{ color: '#8BA0BC' }}>Profile</strong>.</li>
            <li style={{ marginBottom: 6 }}>Choose <strong style={{ color: '#8BA0BC' }}>Delete My Account</strong> and confirm.</li>
          </ol>
        </div>

        <div style={wrapStyle}>
          <h2 style={h2Style}>What is deleted</h2>
          <p style={sectionStyle}>
            Deleting your account permanently removes your profile and every workspace you own, including your posts and drafts,
            ideas, connected social accounts, clients and CRM records, approvals, campaigns, inbox messages, notifications,
            AI usage history, and the photos and videos you uploaded. This cannot be undone. Workspaces you were only invited to
            are not deleted; you simply leave them.
          </p>
        </div>

        <div style={wrapStyle}>
          <h2 style={h2Style}>Before you delete</h2>
          <p style={sectionStyle}>
            If you pay for a plan, cancel it first so you are not charged again. You can also remove eWork Social&apos;s access
            to your Facebook, Instagram, YouTube or TikTok account at any time from that platform&apos;s own settings.
          </p>
        </div>

        <div style={wrapStyle}>
          <h2 style={h2Style}>Need help?</h2>
          <p style={sectionStyle}>
            If you cannot sign in or the options above do not work, email{' '}
            <a href="mailto:support@eworksocial.com">support@eworksocial.com</a> from the address you registered with and
            we will delete the account for you. See our <a href="/privacy">Privacy Policy</a> for how we handle your data.
          </p>
        </div>
      </div>
    </div>
  );
}
