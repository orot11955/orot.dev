import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FileText,
  ImageIcon,
  Layers,
  MessageSquare,
  Settings as SettingsIcon,
} from 'orot-ui';

export interface StudioNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const STUDIO_NAV: StudioNavItem[] = [
  { href: '/studio/dashboard', label: '대시보드', icon: BarChart3, exact: true },
  { href: '/studio/posts', label: '글 관리', icon: FileText },
  { href: '/studio/photos', label: '사진 관리', icon: ImageIcon },
  { href: '/studio/series', label: '시리즈 관리', icon: Layers },
  { href: '/studio/comments', label: '댓글 관리', icon: MessageSquare },
  { href: '/studio/settings', label: '설정', icon: SettingsIcon },
];
