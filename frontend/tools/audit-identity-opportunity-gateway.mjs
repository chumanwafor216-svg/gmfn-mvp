/* global console, process */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  component: 'src/components/IdentityOpportunityGateway.tsx',
  app: 'src/App.tsx',
  identity: 'src/pages/IdentityIntegrityPage.tsx',
  profile: 'src/pages/MyGMFNAndIPage.tsx',
  verify: 'src/pages/TrustSlipVerifyPage.tsx',
  publicPaper: 'src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx',
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(frontendRoot, file), 'utf8')])
);
const findings = [];

function requireMarkers(key, markers, message) {
  const missing = markers.filter((marker) => !source[key].includes(marker));
  if (missing.length === 0) return;
  findings.push(files[key] + ': ' + message + ' Missing: ' + missing.join(', '));
}

function requireOrder(key, markers, message) {
  let offset = 0;
  for (const marker of markers) {
    const foundAt = source[key].indexOf(marker, offset);
    if (foundAt < 0) {
      findings.push(files[key] + ': ' + message + ' Missing or out of order: ' + marker);
      return;
    }
    offset = foundAt + marker.length;
  }
}

function forbidMarkers(key, markers, message) {
  const present = markers.filter((marker) => source[key].includes(marker));
  if (present.length === 0) return;
  findings.push(files[key] + ': ' + message + ' Found: ' + present.join(', '));
}

requireMarkers(
  'component',
  [
    'function OpportunityAction',
    'collapseAll?: boolean;',
    'const secondaryActions = collapseAll ? actions : actions.slice(1);',
    'const coverActions = collapseAll || collapseSecondary;',
    'data-gsn-identity-opportunity-all={collapseAll ? "covered" : undefined}',
    '<StableDisclosureSummary',
    'stableHeight={compact ? 52 : 56}',
    'linear-gradient(135deg, #F8D978 0%, #D6AA45 100%)',
  ],
  'The shared gateway must support one obvious gold button covering every public destination.'
);
requireMarkers(
  'identity',
  ['{cardOnlyMode ? landscapeIdentityCard : null}'],
  'The authenticated card-only surface must render only the shareable ID card.'
);
forbidMarkers(
  'identity',
  [
    'IdentityOpportunityGateway',
    'identity-integrity.opportunity.',
    'ownerOpportunityActions',
    'Manage my shop',
    'Explore my community marketplace',
    'Ask my community',
  ],
  'The shareable authenticated ID must not duplicate private account or community navigation.'
);
requireOrder(
  'app',
  [
    '<Route path="/id/:gmfnId" element={<TrustSlipVerifyPage />} />',
    '<Route path="/id/:gmfnId/profile" element={<TrustSlipVerifyPage />} />',
  ],
  'The public route table must provide stable card and profile variants.'
);
requireMarkers(
  'profile',
  [
    'id="public-professional-profile"',
    'data-my-gsn-public-professional-profile="opt-in"',
    'publicProfessionalProfileEnabled',
    'Show this profile from my shared GSN ID',
    'my-gmfn.public-professional-profile.save',
  ],
  'Public professional details must remain explicit opt-in account data.'
);
requireMarkers(
  'verify',
  [
    'getPublicMarketplaceShopByGmfnId(gmfnIdValue',
    'response?.is_public_shop_face === true',
    'publicShopPath(gmfnIdValue)',
  ],
  'The owner Shop destination must remain controlled by the backend public-Shop decision.'
);
requireOrder(
  'publicPaper',
  [
    'const publicOpportunityActions',
    'Check this TrustSlip',
    'publicOpportunityShopPath',
    'Owner services & products',
    'publicProfilePath',
    'GSN owner profile',
    'GSN website',
    '...GSN_PUBLIC_SOCIAL_ACTIONS',
    '<IdentityOpportunityGateway',
    'collapseAll',
    'Open TrustSlip, shop & owner links',
  ],
  'The public card must keep all approved destinations behind one gold button with TrustSlip first.'
);
requireMarkers(
  'publicPaper',
  [
    'https://globalsupportnetwork.org',
    'https://www.linkedin.com/company/global-support-network',
    'https://www.facebook.com/people/GSN-Global-Support-Network/61594363752798/',
    'https://www.instagram.com/globalsupportnetwork/',
    'GSN LinkedIn',
    'GSN Facebook',
    'GSN Instagram',
  ],
  'The gateway must use the confirmed official GSN website and social channels.'
);
forbidMarkers(
  'publicPaper',
  ['publicProfilePath && publicProfessionalProfileEnabled'],
  'The profile action must remain visible while unpublished profiles fail closed on their route.'
);
requireMarkers(
  'publicPaper',
  [
    'data-gsn-public-professional-profile="not-published"',
    'No public profile published',
    'data-gsn-public-professional-profile="minimal"',
    'Phone, email, named communities, private evidence, and exact location stay hidden.',
  ],
  'The public profile route must fail closed and keep private member data hidden.'
);
forbidMarkers(
  'publicPaper',
  [
    'Professional details published',
    '>Communities</div>',
    'trust-slip-verify.profile.back-to-card',
    'trust-slip-verify.profile.unavailable.back-to-card',
    'Back to GSN ID',
    'roleMixLabel',
    'Membership ${',
    'Admin ${',
  ],
  'Public identity surfaces must not restore redundant, private, or account-navigation content.'
);

if (findings.length) {
  console.error('Identity opportunity gateway audit failed:');
  findings.forEach((finding) => console.error('- ' + finding));
  process.exit(1);
}

console.log(
  'Identity opportunity gateway audit passed: one gold button covers TrustSlip, privacy-gated owner Shop/profile, and official GSN links.'
);
