'use client';

import {
  FileText,
  AlertTriangle,
  Link2,
  MessageCircle,
  Pin,
  Eye,
  CheckCircle2,
  Mail,
  GitCompare,
} from 'lucide-react';
import type { NotificationType } from '@/lib/types';

const typeConfig: Record<NotificationType, { icon: typeof FileText }> = {
  DOCUMENT_INDEXED:       { icon: FileText },
  DISCREPANCY_FOUND:      { icon: AlertTriangle },
  SESSION_SHARED:         { icon: Link2 },
  COMMENT_ADDED:          { icon: MessageCircle },
  DOC_COMMENT_ADDED:      { icon: MessageCircle },
  MESSAGE_PINNED:         { icon: Pin },
  REVIEW_REQUESTED:       { icon: Eye },
  REVIEW_COMPLETED:       { icon: CheckCircle2 },
  WORKSPACE_INVITATION:   { icon: Mail },
  VERSION_DIFF_COMPLETED: { icon: GitCompare },
};

interface Props {
  type: NotificationType;
  size?: 'sm' | 'md';
}

export default function NotificationTypeIcon({ type, size = 'sm' }: Props) {
  const config = typeConfig[type] ?? typeConfig.DOCUMENT_INDEXED;
  const Icon = config.icon;
  const containerSize = size === 'sm' ? '32px' : '40px';
  const iconSize = size === 'sm' ? '16px' : '20px';

  return (
    <div
      style={{
        width: containerSize,
        height: containerSize,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9999px',
        background: 'var(--bg-secondary)',
      }}
    >
      <Icon
        style={{ width: iconSize, height: iconSize, color: 'var(--text-secondary)' }}
        strokeWidth={2}
      />
    </div>
  );
}
