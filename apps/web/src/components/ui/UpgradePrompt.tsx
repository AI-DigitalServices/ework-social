'use client';

import { useRouter } from 'next/navigation';
import { Lock, Zap, ArrowRight } from 'lucide-react';

const PLAN_GRADIENTS: Record<string, string> = {
  STARTER:    'linear-gradient(135deg,#3B82F6,#2563EB)',
  GROWTH:     'linear-gradient(135deg,#10B981,#059669)',
  AGENCY_PRO: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
};

const PLAN_LABELS: Record<string, string> = {
  STARTER:    'Starter',
  GROWTH:     'Growth',
  AGENCY_PRO: 'Agency Pro',
};

interface UpgradePromptProps {
  feature: string;
  requiredPlan: 'STARTER' | 'GROWTH' | 'AGENCY_PRO';
  description?: string;
  compact?: boolean;
}

/** Inline chip — e.g. next to a locked button */
export function UpgradeChip({ requiredPlan }: { requiredPlan: string }) {
  const router = useRouter();
  const gradient = PLAN_GRADIENTS[requiredPlan] || PLAN_GRADIENTS.STARTER;
  const label = PLAN_LABELS[requiredPlan] || requiredPlan;
  return (
    <button
      onClick={() => router.push('/dashboard/settings?tab=plan')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: gradient, color: '#fff',
        fontSize: 10, fontWeight: 800, padding: '3px 9px',
        borderRadius: 999, border: 'none', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Lock size={8} /> {label}
    </button>
  );
}

/** Locked button — replaces a feature button for gated users */
export function LockedButton({ label, icon, requiredPlan }: {
  label: string; icon?: React.ReactNode; requiredPlan: string;
}) {
  const router = useRouter();
  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
  return (
    <button
      onClick={() => router.push('/dashboard/settings?tab=plan')}
      title={`Upgrade to ${planLabel} to unlock ${label}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 10,
        border: '1.5px dashed #CBD5E1', background: '#F8FAFC',
        color: '#94A3B8', fontSize: 11, fontWeight: 700, cursor: 'pointer',
      }}
    >
      {icon && <span style={{ opacity: 0.45 }}>{icon}</span>}
      <span style={{ opacity: 0.6 }}>{label}</span>
      <UpgradeChip requiredPlan={requiredPlan} />
    </button>
  );
}

/** Full upgrade card — for empty states or feature sections */
export default function UpgradePrompt({ feature, requiredPlan, description, compact = false }: UpgradePromptProps) {
  const router = useRouter();
  const gradient = PLAN_GRADIENTS[requiredPlan] || PLAN_GRADIENTS.STARTER;
  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 12,
        background: 'rgba(99,102,241,0.06)',
        border: '1.5px dashed rgba(99,102,241,0.3)',
      }}>
        <Lock size={13} color="#6366F1" />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#4F46E5' }}>
          {feature} requires {planLabel}
        </span>
        <button
          onClick={() => router.push('/dashboard/settings?tab=plan')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: gradient, color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 11, fontWeight: 800, padding: '4px 12px',
          }}
        >
          Upgrade <ArrowRight size={11} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #EEF2FF', boxShadow: '0 4px 24px rgba(99,102,241,0.08)' }}>
      <div style={{ height: 4, background: gradient }} />
      <div style={{ padding: '20px 24px', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Lock size={20} color="#6366F1" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', margin: 0 }}>{feature}</h4>
              <span style={{ background: gradient, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{planLabel}+</span>
            </div>
            {description && (
              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 14 }}>{description}</p>
            )}
            <button
              onClick={() => router.push('/dashboard/settings?tab=plan')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: gradient, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: '8px 18px', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
            >
              <Zap size={12} /> Upgrade to {planLabel} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
