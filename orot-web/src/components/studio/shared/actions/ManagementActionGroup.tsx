'use client';

import { ActionGroup, type ActionItem } from './ActionGroup';

export type ManagementActionItem = ActionItem;

interface ManagementActionGroupProps {
  className: string;
  actions: ManagementActionItem[];
}

export function ManagementActionGroup({
  className,
  actions,
}: ManagementActionGroupProps) {
  return <ActionGroup className={className} actions={actions} />;
}
