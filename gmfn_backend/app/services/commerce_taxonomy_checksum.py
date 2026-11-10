from __future__ import annotations

import hashlib
import json
from typing import Any, Mapping


CHECKSUM_CONTRACT_VERSION = 1


def _scalar(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def canonical_release_document(payload: Mapping[str, Any]) -> str:
    lines = [f'checksum_contract\t{CHECKSUM_CONTRACT_VERSION}']
    lines.append('release_public_id\t' + _scalar(payload['release_public_id']))
    lines.append('version_number\t' + _scalar(int(payload['version_number'])))
    for language in sorted(str(value) for value in payload.get('languages', [])):
        lines.append('language\t' + _scalar(language))

    for concept in sorted(payload.get('concepts', []), key=lambda row: str(row['public_id'])):
        lines.append('\t'.join([
            'concept', _scalar(concept['public_id']), _scalar(concept.get('parent_public_id')),
            _scalar(concept['canonical_label']), _scalar(concept.get('description')),
            _scalar(concept['concept_kind']), _scalar(concept['sensitivity']),
            _scalar(concept.get('credential_notice')), _scalar(concept['lifecycle_status']),
            _scalar(int(concept.get('sort_order', 0))),
        ]))

    terms = sorted(payload.get('terms', []), key=lambda row: (
        str(row['locale']), str(row['normalized_term']), str(row['concept_public_id']),
    ))
    for term in terms:
        lines.append('\t'.join([
            'term', _scalar(term['concept_public_id']), _scalar(term['locale']),
            _scalar(term['term']), _scalar(term['normalized_term']),
            _scalar(term['term_kind']), _scalar(term['review_status']),
        ]))

    redirects = sorted(payload.get('redirects', []), key=lambda row: (
        str(row['source_public_id']), str(row.get('target_public_id')),
    ))
    for redirect in redirects:
        lines.append('\t'.join([
            'redirect', _scalar(redirect['source_public_id']),
            _scalar(redirect['target_public_id']), _scalar(redirect['redirect_kind']),
            _scalar(redirect.get('reason')),
        ]))
    return '\n'.join(lines) + '\n'


def checksum_release_payload(payload: Mapping[str, Any]) -> str:
    document = canonical_release_document(payload)
    return hashlib.sha256(document.encode('utf-8')).hexdigest()
