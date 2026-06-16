'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const PLATFORM_COLORS: Record<string, { bg: string; label: string }> = {
  INSTAGRAM: { bg: '#E1306C', label: 'Instagram' },
  FACEBOOK:  { bg: '#1877F2', label: 'Facebook' },
  LINKEDIN:  { bg: '#0077B5', label: 'LinkedIn' },
  TIKTOK:    { bg: '#000000', label: 'TikTok' },
  THREADS:   { bg: '#000000', label: 'Threads' },
  BLUESKY:   { bg: '#0085FF', label: 'Bluesky' },
  YOUTUBE:   { bg: '#FF0000', label: 'YouTube' },
};

export default function ApprovalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'idle' | 'approving' | 'revising' | 'done'>('idle');
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevInput, setShowRevInput] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'revision'; message: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/approvals/review/${token}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('This approval link is invalid or has expired.'); setLoading(false); });
  }, [token]);

  const handleApprove = async () => {
    setAction('approving');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/approvals/approve/${token}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setResult({ type: 'success', message: 'Post approved! Your agency will be notified and the post will go live as scheduled.' });
        setData((prev: any) => ({ ...prev, status: 'APPROVED' }));
        setAction('done');
      }
    } catch {
      setAction('idle');
    }
  };

  const handleRevision = async () => {
    if (!showRevInput) { setShowRevInput(true); setAction('idle'); return; }
    if (!revisionNote.trim()) return;
    setAction('revising');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/approvals/revision/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionNote }),
      });
      if (res.ok) {
        setResult({ type: 'revision', message: 'Revision request sent! Your agency will update the post and send it back for your review.' });
        setData((prev: any) => ({ ...prev, status: 'REVISION_REQUESTED', revisionNote }));
        setAction('done');
      }
    } catch {
      setAction('idle');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#378ADD', fontSize: 16 }}>Loading your content review...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>Link Not Found</h2>
        <p style={{ color: '#7A8FA6', fontSize: 14 }}>{error}</p>
      </div>
    </div>
  );

  const platform = PLATFORM_COLORS[data?.post?.platform] || { bg: '#378ADD', label: data?.post?.platform };
  const isPending = data?.status === 'PENDING';
  const isApproved = data?.status === 'APPROVED';
  const isRevision = data?.status === 'REVISION_REQUESTED';

  const scheduledDate = data?.post?.scheduledAt
    ? new Date(data.post.scheduledAt).toLocaleDateString('en-NG', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'To be scheduled';

  return (
    <div style={{ minHeight: '100vh', background: '#0D1B2A', fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#C8D8E8' }}>

      {/* Header */}
      <div style={{ background: 'rgba(24,95,165,0.15)', borderBottom: '1px solid rgba(55,138,221,0.2)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ color: '#378ADD', fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em', fontFamily: 'monospace' }}>
          eWork<span style={{ color: '#fff' }}>/</span>Social
        </div>
        <span style={{ color: '#7A8FA6', fontSize: 13 }}>Content Approval Portal</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Hi {data?.clientName} 👋
          </h1>
          <p style={{ color: '#7A8FA6', fontSize: 14, margin: 0 }}>
            <strong style={{ color: '#C8D8E8' }}>{data?.workspace?.name}</strong> has prepared content for your review.
            Please approve or request changes before it goes live.
          </p>
        </div>

        {/* Result banner */}
        {result && (
          <div style={{
            background: result.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${result.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{result.type === 'success' ? '✅' : '✏️'}</div>
            <p style={{ color: result.type === 'success' ? '#10B981' : '#F59E0B', fontSize: 15, fontWeight: 600, margin: 0 }}>
              {result.message}
            </p>
          </div>
        )}

        {/* Status badge */}
        {!isPending && !result && (
          <div style={{
            background: isApproved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isApproved ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 10, padding: '12px 20px', marginBottom: 24, textAlign: 'center',
          }}>
            <span style={{ color: isApproved ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: 14 }}>
              {isApproved ? '✓ You already approved this post' : '✏️ You requested revisions on this post'}
            </span>
            {isRevision && data?.revisionNote && (
              <p style={{ color: '#F87171', fontSize: 13, margin: '8px 0 0' }}>Your note: "{data.revisionNote}"</p>
            )}
          </div>
        )}

        {/* Post card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>

          {/* Platform header */}
          <div style={{ background: platform.bg, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{platform.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>· @{data?.post?.accountName}</span>
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Scheduled: {scheduledDate}</span>
          </div>

          {/* Content */}
          <div style={{ padding: '24px 24px 20px' }}>
            <p style={{ color: '#C8D8E8', fontSize: 15, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
              {data?.post?.content}
            </p>

            {/* Media previews — click to enlarge */}
            {data?.post?.mediaUrls?.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                {data.post.mediaUrls.map((url: string, i: number) => (
                  <div key={i} onClick={() => setLightboxUrl(url)}
                    style={{ cursor: 'pointer', position: 'relative' }}>
                    <img src={url} alt={`Media ${i + 1}`}
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8,
                        border: '2px solid rgba(55,138,221,0.3)', transition: 'border-color 0.2s' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                      opacity: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>View</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lightbox */}
            {lightboxUrl && (
              <div onClick={() => setLightboxUrl(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1000, cursor: 'pointer', padding: 24 }}>
                <img src={lightboxUrl} alt="Full size"
                  style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain',
                    borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} />
                <div style={{ position: 'absolute', top: 20, right: 20, color: '#fff',
                  fontSize: 28, cursor: 'pointer', fontWeight: 300 }}>✕</div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — only show if pending */}
        {isPending && action !== 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleApprove}
                disabled={action === 'approving'}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  opacity: action === 'approving' ? 0.7 : 1,
                }}
              >
                {action === 'approving' ? 'Approving...' : '✓ Approve Post'}
              </button>
              <button
                onClick={handleRevision}
                disabled={action === 'revising'}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#EF4444', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  opacity: action === 'revising' ? 0.7 : 1,
                }}
              >
                {showRevInput ? (action === 'revising' ? 'Sending...' : 'Send Revision Request') : '✎ Request Changes'}
              </button>
            </div>

            {showRevInput && (
              <div>
                <textarea
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  placeholder="Describe what needs to change — e.g. Update the pricing, change the tone, use a different image..."
                  rows={4}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
                    padding: '14px 16px', color: '#fff', fontSize: 14,
                    resize: 'none', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ color: '#4A6080', fontSize: 12, marginTop: 6 }}>
                  Your note will be sent directly to the agency with your revision request.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: '#2A3A52', fontSize: 12, margin: 0 }}>
            Powered by eWork Social · A product of Jben Logistics (RC: 1940369) · Lagos, Nigeria
          </p>
        </div>
      </div>
    </div>
  );
}
