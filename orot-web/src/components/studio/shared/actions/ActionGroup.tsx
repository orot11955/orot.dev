'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Button, Popconfirm } from 'orot-ui';

type ButtonProps = ComponentProps<typeof Button>;
type ButtonSize = NonNullable<ButtonProps['size']>;
type ButtonVariant = NonNullable<ButtonProps['variant']>;

interface ActionConfirm {
  title: ReactNode;
  description?: ReactNode;
  okText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

export interface ActionItem {
  key: string;
  label: ReactNode;
  variant: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void | Promise<void>;
  confirm?: ActionConfirm;
}

interface ActionGroupProps {
  className: string;
  actions: ActionItem[];
}

function renderButton(action: ActionItem) {
  return (
    <Button
      size={action.size ?? 'sm'}
      variant={action.variant}
      disabled={action.disabled}
      loading={action.loading}
      onClick={
        action.href || action.confirm
          ? undefined
          : () => {
              void action.onClick?.();
            }
      }
    >
      {action.label}
    </Button>
  );
}

function renderAction(action: ActionItem) {
  const button = renderButton(action);

  if (action.confirm) {
    return (
      <Popconfirm
        key={action.key}
        title={action.confirm.title}
        description={action.confirm.description}
        okText={action.confirm.okText}
        cancelText={action.confirm.cancelText}
        onConfirm={() => {
          void action.confirm?.onConfirm();
        }}
      >
        {button}
      </Popconfirm>
    );
  }

  if (action.href && !action.disabled) {
    return (
      <Link
        key={action.key}
        href={action.href}
        target={action.target}
        rel={action.rel}
      >
        {button}
      </Link>
    );
  }

  return (
    <span key={action.key}>
      {button}
    </span>
  );
}

export function ActionGroup({ className, actions }: ActionGroupProps) {
  return (
    <div className={className}>
      {actions.map(renderAction)}
    </div>
  );
}
