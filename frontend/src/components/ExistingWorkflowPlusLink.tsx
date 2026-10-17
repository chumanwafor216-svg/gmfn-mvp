import React from 'react';
import { StableCtaLink } from './StableButton';

type ExistingWorkflowPlusLinkProps = {
  to: string;
  label: string;
  debugId: string;
  shortcut: 'spotlight' | 'shop-diary' | 'shop-product' | 'demand-box';
} & Omit<React.ComponentProps<typeof StableCtaLink>, 'to' | 'children' | 'debugId' | 'aria-label'>;

export default function ExistingWorkflowPlusLink({
  to,
  label,
  debugId,
  shortcut,
  ...rest
}: ExistingWorkflowPlusLinkProps) {
  return (
    <StableCtaLink
      {...rest}
      to={to}
      kind='secondary'
      aria-label={label}
      title={label}
      debugId={debugId}
      stableHeight={48}
      minWidth={48}
      data-existing-workflow-plus={shortcut}
      style={{
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
        maxWidth: 48,
        maxHeight: 48,
        padding: 0,
        borderRadius: 999,
        color: '#0B4EA2',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)',
        border: '1px solid rgba(13,95,168,0.24)',
        boxShadow:
          '0 8px 18px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.96)',
        fontSize: 26,
        fontWeight: 900,
        lineHeight: 1,
        ...rest.style,
      }}
    >
      <span aria-hidden='true'>+</span>
    </StableCtaLink>
  );
}
