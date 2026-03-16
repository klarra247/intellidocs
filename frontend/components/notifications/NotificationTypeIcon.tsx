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

const typeConfig: Record<NotificationType, { icon: typeof FileText; bg: string; iconColor: string }> = {
  DOCUMENT_INDEXED:       { icon: FileText,       bg: 'bg-green-100',  iconColor: 'text-green-600' },
  DISCREPANCY_FOUND:      { icon: AlertTriangle,  bg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  SESSION_SHARED:         { icon: Link2,          bg: 'bg-blue-100',   iconColor: 'text-blue-600' },
  COMMENT_ADDED:          { icon: MessageCircle,  bg: 'bg-purple-100', iconColor: 'text-purple-600' },
  DOC_COMMENT_ADDED:      { icon: MessageCircle,  bg: 'bg-purple-100', iconColor: 'text-purple-600' },
  MESSAGE_PINNED:         { icon: Pin,            bg: 'bg-amber-100',  iconColor: 'text-amber-600' },
  REVIEW_REQUESTED:       { icon: Eye,            bg: 'bg-orange-100', iconColor: 'text-orange-600' },
  REVIEW_COMPLETED:       { icon: CheckCircle2,   bg: 'bg-green-100',  iconColor: 'text-green-600' },
  WORKSPACE_INVITATION:   { icon: Mail,           bg: 'bg-blue-100',   iconColor: 'text-blue-600' },
  VERSION_DIFF_COMPLETED: { icon: GitCompare,     bg: 'bg-cyan-100',   iconColor: 'text-cyan-600' },
};

interface Props {
  type: NotificationType;
  size?: 'sm' | 'md';
}

export default function NotificationTypeIcon({ type, size = 'sm' }: Props) {
  const config = typeConfig[type] ?? typeConfig.DOCUMENT_INDEXED;
  const Icon = config.icon;
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconDim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-full ${config.bg}`}>
      <Icon className={`${iconDim} ${config.iconColor}`} strokeWidth={2} />
    </div>
  );
}
