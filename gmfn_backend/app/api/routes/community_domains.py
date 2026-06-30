from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainAffiliation,
    CommunityDomainActionReview,
    CommunityDomainActionReviewComment,
    CommunityDomainActionReviewDecision,
    CommunityDomainActionReviewEvidence,
    CommunityDomainMembership,
    CommunityDomainPolicy,
    CommunityNode,
    CommunityNodeMembership,
    User,
)


router = APIRouter(prefix="/community-domains", tags=["community-domains"])

DOMAIN_NAME_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$")
RESERVED_DOMAIN_NAMES = {
    "admin",
    "api",
    "app",
    "billing",
    "community",
    "domains",
    "gmfn",
    "gsn",
    "login",
    "root",
    "support",
    "system",
    "trust",
}
DOMAIN_ADMIN_ROLES = {"owner", "admin", "domain_admin"}
NODE_ADMIN_ROLES = {
    "node_admin",
    "branch_admin",
    "line_admin",
    "department_admin",
    "committee_admin",
    "chapter_admin",
}
NODE_LOCAL_ASSIGNABLE_ROLES = {
    "member",
    "staff",
    "teacher",
    "trader",
    "student",
    "parent",
    "committee_member",
    "line_member",
}
REVIEWER_QUEUE_PENDING_STATUSES = ("pending", "pending_review")
COMMUNITY_DOMAIN_ROLE_PRESETS: list[dict[str, Any]] = [
    {
        "role_key": "owner",
        "label": "Owner",
        "scope": "domain",
        "admin_role": True,
        "assignable": False,
        "summary": "The legally responsible Community Domain holder or founding authority.",
    },
    {
        "role_key": "domain_admin",
        "label": "Domain admin",
        "scope": "domain",
        "admin_role": True,
        "assignable": True,
        "summary": "A domain-wide administrator who helps manage the institutional domain.",
    },
    {
        "role_key": "node_admin",
        "label": "Node admin",
        "scope": "node",
        "admin_role": True,
        "assignable": True,
        "summary": "An administrator for one branch, department, line, chapter, or unit.",
    },
    {
        "role_key": "branch_admin",
        "label": "Branch admin",
        "scope": "node",
        "admin_role": True,
        "assignable": True,
        "summary": "A local administrator for a school branch, market branch, church branch, or regional office.",
    },
    {
        "role_key": "department_admin",
        "label": "Department admin",
        "scope": "node",
        "admin_role": True,
        "assignable": True,
        "summary": "A leader for a department, ministry, faculty, committee, or functional unit.",
    },
    {
        "role_key": "committee_admin",
        "label": "Committee admin",
        "scope": "node",
        "admin_role": True,
        "assignable": True,
        "summary": "A leader for a committee, line council, working group, or appointed task group.",
    },
    {
        "role_key": "line_admin",
        "label": "Line admin",
        "scope": "node",
        "admin_role": True,
        "assignable": True,
        "summary": "A leader for a market line, trade line, specialist line, or local operating line.",
    },
    {
        "role_key": "chapter_admin",
        "label": "Chapter admin",
        "scope": "node",
        "admin_role": True,
        "assignable": True,
        "summary": "A leader for a union chapter, diaspora chapter, local chapter, or regional chapter.",
    },
    {
        "role_key": "member",
        "label": "Member",
        "scope": "domain_or_node",
        "admin_role": False,
        "assignable": True,
        "summary": "A recognized member of the institution or one of its internal units.",
    },
    {
        "role_key": "staff",
        "label": "Staff",
        "scope": "domain_or_node",
        "admin_role": False,
        "assignable": True,
        "summary": "A staff member, worker, officer, or support person in the institution.",
    },
    {
        "role_key": "teacher",
        "label": "Teacher",
        "scope": "domain_or_node",
        "admin_role": False,
        "assignable": True,
        "summary": "A teacher, instructor, trainer, or academic worker.",
    },
    {
        "role_key": "trader",
        "label": "Trader",
        "scope": "domain_or_node",
        "admin_role": False,
        "assignable": True,
        "summary": "A trader, shop owner, vendor, artisan, or merchant participant.",
    },
    {
        "role_key": "student",
        "label": "Student",
        "scope": "domain_or_node",
        "admin_role": False,
        "assignable": True,
        "summary": "A student, learner, apprentice, or class participant.",
    },
    {
        "role_key": "parent",
        "label": "Parent",
        "scope": "domain_or_node",
        "admin_role": False,
        "assignable": True,
        "summary": "A parent, guardian, family representative, or PTA participant.",
    },
    {
        "role_key": "committee_member",
        "label": "Committee member",
        "scope": "node",
        "admin_role": False,
        "assignable": True,
        "summary": "A participant appointed to a committee, ministry, group, or working unit.",
    },
    {
        "role_key": "line_member",
        "label": "Line member",
        "scope": "node",
        "admin_role": False,
        "assignable": True,
        "summary": "A member of a market line, trade line, chapter, branch, or local unit.",
    },
]
COMMUNITY_DOMAIN_GOVERNANCE_MODEL_PRESETS: list[dict[str, str]] = [
    {
        "model_key": "domain_admin_review",
        "label": "Domain admin review",
        "summary": "Central domain administrators review actions that affect the whole institution.",
    },
    {
        "model_key": "node_admin_review",
        "label": "Node admin review",
        "summary": "Branch, department, chapter, line, or unit administrators review local actions.",
    },
    {
        "model_key": "required_role_review",
        "label": "Required role review",
        "summary": "A policy can require a specific institutional role before a reviewer may decide.",
    },
    {
        "model_key": "multi_reviewer_review",
        "label": "Multi-reviewer approval",
        "summary": "A policy can require more than one approval before an action becomes approved.",
    },
    {
        "model_key": "action_review_record",
        "label": "Action review record",
        "summary": "Requests, decisions, comments, evidence, revisions, and applied actions are kept as governance records.",
    },
]
COMMUNITY_DOMAIN_VERIFICATION_REQUIREMENT_PRESETS: list[dict[str, Any]] = [
    {
        "requirement_key": "legal_identity",
        "label": "Legal or recognized identity",
        "summary": "A registration, constitution, charter, official letter, or recognized community identity record.",
        "applies_to": "all",
        "required": True,
    },
    {
        "requirement_key": "authorized_representative",
        "label": "Authorized representative",
        "summary": "Evidence that the person requesting the Community Domain is allowed to stand for the institution.",
        "applies_to": "all",
        "required": True,
    },
    {
        "requirement_key": "administrative_contact",
        "label": "Administrative contact",
        "summary": "A reliable administrative contact point for the institution.",
        "applies_to": "all",
        "required": True,
    },
    {
        "requirement_key": "structure_authority",
        "label": "Structure authority",
        "summary": "A statement or record showing how branches, departments, lines, chapters, or units are recognized.",
        "applies_to": "all",
        "required": True,
    },
    {
        "requirement_key": "school_registration",
        "label": "School registration or approval",
        "summary": "A school registration, proprietor approval, board authority, or branch authorization record.",
        "applies_to": "school",
        "required": True,
    },
    {
        "requirement_key": "religious_body_authority",
        "label": "Religious body authority",
        "summary": "A church, mosque, ministry, diocese, branch, or trustee authority record.",
        "applies_to": "religious_body",
        "required": True,
    },
    {
        "requirement_key": "union_constitution",
        "label": "Union or association constitution",
        "summary": "A constitution, executive mandate, chapter authority, or recognized association record.",
        "applies_to": "professional_union",
        "required": True,
    },
    {
        "requirement_key": "market_authority_letter",
        "label": "Market authority letter",
        "summary": "A market association, cooperative, executive, line-chair, or trade-cluster authority record.",
        "applies_to": "market_cooperative",
        "required": True,
    },
    {
        "requirement_key": "town_union_charter",
        "label": "Town union or diaspora charter",
        "summary": "A town union, family, age-grade, diaspora chapter, or project authority record.",
        "applies_to": "town_union",
        "required": True,
    },
    {
        "requirement_key": "health_body_license",
        "label": "Health body licence or authorization",
        "summary": "A clinic, hospital, care group, professional association, or operating authority record.",
        "applies_to": "health_body",
        "required": True,
    },
    {
        "requirement_key": "ngo_registration",
        "label": "NGO or project registration",
        "summary": "A nonprofit registration, donor mandate, project approval, or field-office authority record.",
        "applies_to": "ngo_project_network",
        "required": True,
    },
    {
        "requirement_key": "generic_association_authority",
        "label": "Association authority record",
        "summary": "A constitution, executive approval, minutes, or member mandate for a flexible association.",
        "applies_to": "generic_association",
        "required": True,
    },
]
COMMUNITY_DOMAIN_ACTIVATION_REQUIREMENT_PRESETS: list[dict[str, Any]] = [
    {
        "requirement_key": "package_quote",
        "label": "Package quote",
        "summary": "A manual pilot package quote must be reviewed before payment instruction or activation.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "requirement_key": "pricing_confirmation",
        "label": "Pricing confirmation",
        "summary": "The final subscription package, allowances, and renewal terms still need explicit confirmation.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "requirement_key": "payment_instruction",
        "label": "Payment instruction",
        "summary": "No payment instruction is created by this MVP projection.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "requirement_key": "billing_activation",
        "label": "Billing activation",
        "summary": "Billing is not active until the Community Domain is deliberately activated by a future billing flow.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "requirement_key": "authority_verification",
        "label": "Authority verification",
        "summary": "The institution must be verified before it can be presented as a verified Community Domain.",
        "requires_admin": True,
        "route_suffix": "/verification",
    },
    {
        "requirement_key": "structure_ready",
        "label": "Structure ready",
        "summary": "The domain should have more than the root institution before institutional launch.",
        "requires_admin": False,
        "route_suffix": "/nodes/tree",
    },
    {
        "requirement_key": "member_base_ready",
        "label": "Member base ready",
        "summary": "The domain should have at least one active member or admin beyond the owner.",
        "requires_admin": True,
        "route_suffix": "/members",
    },
    {
        "requirement_key": "governance_ready",
        "label": "Governance ready",
        "summary": "The domain should have at least one active policy for important institutional decisions.",
        "requires_admin": True,
        "route_suffix": "/governance-model",
    },
]
COMMUNITY_DOMAIN_SUBSCRIPTION_LIFECYCLE_PRESETS: list[dict[str, Any]] = [
    {
        "lane_key": "quote_preview",
        "label": "Quote preview",
        "summary": "A manual pilot quote can be previewed before any payment instruction exists.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "lane_key": "pricing_confirmation",
        "label": "Pricing confirmation",
        "summary": "Final price, currency, cycle, and renewal terms are not configured in this MVP slice.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "lane_key": "payment_instruction",
        "label": "Payment instruction",
        "summary": "A Community Domain payment instruction is not created by this projection.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "lane_key": "payment_confirmation",
        "label": "Payment confirmation",
        "summary": "No bank match, receipt, or manual payment confirmation is recorded here.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "lane_key": "billing_activation",
        "label": "Billing activation",
        "summary": "Billing activation requires a future dedicated billing flow.",
        "requires_admin": True,
        "route_suffix": "/activation-requirements",
    },
    {
        "lane_key": "subscription_period",
        "label": "Subscription period",
        "summary": "Start date, expiry date, grace period, and seat/module entitlements are not configured here.",
        "requires_admin": True,
        "route_suffix": "/capacity-plan",
    },
    {
        "lane_key": "renewal_policy",
        "label": "Renewal policy",
        "summary": "Renewal reminders, renewal price, and renewal approval are not configured here.",
        "requires_admin": True,
        "route_suffix": "/package-quote",
    },
    {
        "lane_key": "suspension_reactivation",
        "label": "Suspension and reactivation",
        "summary": "Expired, suspended, grace-period, and reactivation rules are not enforced here.",
        "requires_admin": True,
        "route_suffix": "/activation-requirements",
    },
]
COMMUNITY_DOMAIN_ECONOMIC_LANE_PRESETS: list[dict[str, Any]] = [
    {
        "lane_key": "marketplace",
        "label": "Marketplace fit",
        "summary": "Whether this institution is naturally market-facing, supported, optional, or limited for trade activity.",
        "module_key": "marketplace",
        "requires_admin": False,
    },
    {
        "lane_key": "shops",
        "label": "Member shops",
        "summary": "Whether member shops are part of the selected Community Domain template.",
        "module_key": "shops",
        "requires_admin": True,
    },
    {
        "lane_key": "demand",
        "label": "Demand and sourcing",
        "summary": "Whether the domain is prepared for needs, requests, vendor demand, or group sourcing.",
        "module_key": "demand",
        "requires_admin": True,
    },
    {
        "lane_key": "spotlight",
        "label": "Spotlight",
        "summary": "Whether the domain template supports approved announcements or promotional exposure.",
        "module_key": "spotlight",
        "requires_admin": True,
    },
    {
        "lane_key": "vault",
        "label": "Vault",
        "summary": "Whether controlled documents, evidence files, and shared materials are part of the domain template.",
        "module_key": "vault",
        "requires_admin": True,
    },
    {
        "lane_key": "trust_evidence",
        "label": "Trust evidence",
        "summary": "Whether the template supports verification or trust evidence around institutional activity.",
        "module_key": "verification",
        "requires_admin": True,
    },
    {
        "lane_key": "finance_support",
        "label": "Finance and support",
        "summary": "Whether economic activity is already connected to finance, support, repayment, or payment rails.",
        "module_key": None,
        "requires_admin": True,
    },
]
COMMUNITY_DOMAIN_NETWORK_PRESENCE_LANE_PRESETS: list[dict[str, Any]] = [
    {
        "lane_key": "public_identity",
        "label": "Public identity",
        "summary": "Whether the domain has enough public-facing identity text to explain who it is.",
        "requires_admin": True,
    },
    {
        "lane_key": "verified_domain_badge",
        "label": "Verified domain badge",
        "summary": "Whether the institution can be presented as a verified Community Domain.",
        "requires_admin": True,
    },
    {
        "lane_key": "public_url",
        "label": "Public URL",
        "summary": "The final public route format for Community Domains is still an open product decision.",
        "requires_admin": True,
    },
    {
        "lane_key": "marketplace_exposure",
        "label": "Marketplace exposure",
        "summary": "Whether the institution is naturally market-facing inside GSN.",
        "requires_admin": True,
    },
    {
        "lane_key": "spotlight_exposure",
        "label": "Spotlight exposure",
        "summary": "Whether the template supports approved announcements or exposure.",
        "requires_admin": True,
    },
    {
        "lane_key": "vault_links",
        "label": "Vault links",
        "summary": "Whether controlled outward document links have been created for this domain.",
        "requires_admin": True,
    },
    {
        "lane_key": "social_community_bridge",
        "label": "Social Community bridge",
        "summary": "Whether this Community Domain has been deliberately linked to a lightweight social Community.",
        "requires_admin": True,
    },
]
COMMUNITY_DOMAIN_TRUST_MOBILITY_LANE_PRESETS: list[dict[str, Any]] = [
    {
        "lane_key": "identity_readiness",
        "label": "Identity readiness",
        "summary": "Whether the Community Domain has a public-safe identity anchor.",
        "requires_admin": False,
        "route_suffix": "/operating-map",
    },
    {
        "lane_key": "authority_readiness",
        "label": "Authority readiness",
        "summary": "Whether the institution has reached verified Community Domain status.",
        "requires_admin": True,
        "route_suffix": "/verification-requirements",
    },
    {
        "lane_key": "membership_trace",
        "label": "Membership trace",
        "summary": "Whether the domain has a membership base beyond the owner.",
        "requires_admin": True,
        "route_suffix": "/members",
    },
    {
        "lane_key": "governance_trace",
        "label": "Governance trace",
        "summary": "Whether institutional decisions have active governance policy.",
        "requires_admin": False,
        "route_suffix": "/governance-coverage",
    },
    {
        "lane_key": "evidence_trace",
        "label": "Evidence trace",
        "summary": "Whether action reviews contain evidence metadata.",
        "requires_admin": True,
        "route_suffix": "/evidence-map",
    },
    {
        "lane_key": "public_presence",
        "label": "Public presence",
        "summary": "Whether a public-safe summary is ready without finalizing the public URL.",
        "requires_admin": False,
        "route_suffix": "/network-presence",
    },
    {
        "lane_key": "trustslip_bridge",
        "label": "TrustSlip bridge",
        "summary": "Whether Community Domain evidence can issue or back a TrustSlip.",
        "requires_admin": True,
        "route_suffix": "/network-presence",
    },
    {
        "lane_key": "trust_passport_bridge",
        "label": "Trust Passport bridge",
        "summary": "Whether Community Domain evidence can write into a Trust Passport.",
        "requires_admin": True,
        "route_suffix": "/network-presence",
    },
    {
        "lane_key": "external_relay",
        "label": "External trust relay",
        "summary": "Whether Community Domain proof can be relayed outside GSN.",
        "requires_admin": True,
        "route_suffix": "/network-presence",
    },
]
NODE_STATUS_VALUES = {"active", "inactive", "archived"}
COMMUNITY_DOMAIN_PACKAGE_LIMITS = {
    "included_nodes": 50,
    "included_members": 500,
    "included_admins": 10,
    "included_shops": 100,
    "included_storage_gb": 5,
}
COMMUNITY_DOMAIN_MODULE_PRESETS: dict[str, dict[str, str]] = {
    "governance": {
        "label": "Governance",
        "summary": "Policies, approvals, reviews, and institutional decision records.",
    },
    "members": {
        "label": "Members",
        "summary": "Domain membership, member status, role assignment, and member visibility.",
    },
    "departments": {
        "label": "Departments",
        "summary": "Branches, classes, committees, lines, units, and other domain nodes.",
    },
    "roles": {
        "label": "Roles",
        "summary": "Institutional role labels, role scope, and appointment context.",
    },
    "shops": {
        "label": "Shops",
        "summary": "Member shops and domain-aware visibility for trusted trade.",
    },
    "marketplace": {
        "label": "Marketplace",
        "summary": "Domain-scoped trusted trade, demand, services, vendors, and welfare sourcing.",
    },
    "spotlight": {
        "label": "Spotlight",
        "summary": "Approved domain announcements, visibility, and promotional exposure.",
    },
    "vault": {
        "label": "Vault",
        "summary": "Controlled documents, private records, evidence files, and shared materials.",
    },
    "verification": {
        "label": "Verification",
        "summary": "Membership, role, node, and evidence currentness checks.",
    },
    "trust_centre": {
        "label": "Trust Centre",
        "summary": "Domain-scoped trust evidence and public-safe institutional signals.",
    },
    "events": {
        "label": "Events",
        "summary": "Meetings, activities, programmes, services, and attendance evidence.",
    },
    "demand": {
        "label": "Demand",
        "summary": "Domain-scoped requests, needs, supplier demand, and group sourcing.",
    },
    "notifications": {
        "label": "Notifications",
        "summary": "Domain, node, role, and invite-scoped messages and alerts.",
    },
    "analytics": {
        "label": "Analytics",
        "summary": "Membership, structure, activity, evidence, and module-readiness summaries.",
    },
}
COMMUNITY_DOMAIN_TEMPLATE_PRESETS: list[dict[str, Any]] = [
    {
        "template_key": "school_multi_branch",
        "domain_type": "school",
        "label": "School",
        "summary": "A school, academy, or learning network with branches, classes, staff, parents, and student groups.",
        "typical_nodes": ["Main campus", "Branches", "Departments", "Classes", "Parent teacher association"],
        "default_modules": ["governance", "members", "departments", "vault", "spotlight", "analytics"],
        "marketplace_role": "optional",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "church_religious_body",
        "domain_type": "religious_body",
        "label": "Church / religious body",
        "summary": "A faith institution with branches, ministries, departments, leaders, members, programs, and evidence records.",
        "typical_nodes": ["Headquarters", "Branches", "Ministries", "Departments", "Fellowship groups"],
        "default_modules": ["governance", "members", "departments", "vault", "spotlight", "analytics"],
        "marketplace_role": "optional",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "union_professional_body",
        "domain_type": "professional_union",
        "label": "Union / professional body",
        "summary": "A worker union, trade group, alumni body, or professional association with chapters and committees.",
        "typical_nodes": ["National office", "State chapters", "Local chapters", "Committees", "Professional groups"],
        "default_modules": ["governance", "members", "departments", "vault", "verification", "analytics"],
        "marketplace_role": "supported",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "market_cooperative",
        "domain_type": "market_cooperative",
        "label": "Market / cooperative",
        "summary": "A market, cooperative, trade line, or merchant association with sections, lines, shops, and trust records.",
        "typical_nodes": ["Market authority", "Trade lines", "Sections", "Shop clusters", "Committees"],
        "default_modules": ["governance", "members", "shops", "spotlight", "vault", "verification", "analytics"],
        "marketplace_role": "core",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "family_town_union_diaspora",
        "domain_type": "town_union",
        "label": "Family / town union / diaspora",
        "summary": "A family network, town union, age grade, hometown association, or diaspora body with chapters and projects.",
        "typical_nodes": ["Executive council", "Home branch", "Diaspora chapters", "Committees", "Project groups"],
        "default_modules": ["governance", "members", "vault", "spotlight", "analytics"],
        "marketplace_role": "optional",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "hospital_health_body",
        "domain_type": "health_body",
        "label": "Hospital / health body",
        "summary": "A clinic, hospital network, medical association, or care group with branches, units, staff, and governance.",
        "typical_nodes": ["Main facility", "Branches", "Departments", "Clinical units", "Administration"],
        "default_modules": ["governance", "members", "departments", "vault", "verification", "analytics"],
        "marketplace_role": "limited",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "ngo_project_network",
        "domain_type": "ngo_project_network",
        "label": "NGO / project network",
        "summary": "A nonprofit, development project, or support network with programs, field offices, teams, and evidence records.",
        "typical_nodes": ["Head office", "Field offices", "Programs", "Teams", "Project committees"],
        "default_modules": ["governance", "members", "vault", "spotlight", "verification", "analytics"],
        "marketplace_role": "optional",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
    {
        "template_key": "generic_association",
        "domain_type": "generic_association",
        "label": "Generic association",
        "summary": "A flexible association setup for institutions that need custom branches, roles, committees, and modules.",
        "typical_nodes": ["Leadership", "Branches", "Departments", "Committees", "Member groups"],
        "default_modules": ["governance", "members", "departments", "vault", "analytics"],
        "marketplace_role": "optional",
        "boundary": "A preset for structure and modules only. It does not create, activate, verify, or bill a Community Domain.",
    },
]

COMMUNITY_DOMAIN_TEMPLATE_ALIASES: dict[str, str] = {
    "church": "religious_body",
    "religious": "religious_body",
    "union": "professional_union",
    "professional_body": "professional_union",
    "market": "market_cooperative",
    "market_association": "market_cooperative",
    "cooperative": "market_cooperative",
    "family": "town_union",
    "diaspora": "town_union",
    "hospital": "health_body",
    "healthcare": "health_body",
    "ngo": "ngo_project_network",
    "nonprofit": "ngo_project_network",
    "association": "generic_association",
}

COMMUNITY_DOMAIN_TEMPLATE_OPERATING_BLUEPRINTS: dict[str, dict[str, Any]] = {
    "school_multi_branch": {
        "node_presets": [
            {
                "node_type": "campus",
                "node_kind": "school_branch",
                "label": "Campus / branch",
                "example": "Lagos Campus",
                "scope": "A full school branch with local staff, parents, classes, and notices.",
            },
            {
                "node_type": "department",
                "node_kind": "school_department",
                "label": "Department",
                "example": "Science Department",
                "scope": "Academic or administrative department inside one campus or the whole school.",
            },
            {
                "node_type": "class",
                "node_kind": "school_class",
                "label": "Class / level",
                "example": "Primary 4",
                "scope": "Class-level operating group for teachers, pupils, parents, or records.",
            },
            {
                "node_type": "association",
                "node_kind": "school_association",
                "label": "PTA / staff / alumni group",
                "example": "Parent Teacher Association",
                "scope": "Practice group that may run meetings, welfare, contributions, or evidence.",
            },
        ],
        "role_presets": [
            {"role_key": "branch_admin", "label": "Branch admin", "scope": "node"},
            {"role_key": "teacher", "label": "Teacher", "scope": "node"},
            {"role_key": "pta_officer", "label": "PTA officer", "scope": "node"},
            {"role_key": "verifier", "label": "School verifier", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "summary": "Owner or central admins review domain-level member changes.",
            },
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Campus, class, or department admins review local placement.",
            },
            {
                "action_key": "evidence.verify",
                "review_mode": "required_role_review",
                "summary": "Only assigned school verifiers should witness official records.",
            },
        ],
        "activity_lanes": [
            "branch notices",
            "PTA activity",
            "teacher association",
            "approved vendors",
            "school evidence",
        ],
    },
    "church_religious_body": {
        "node_presets": [
            {
                "node_type": "branch",
                "node_kind": "church_branch",
                "label": "Branch / parish",
                "example": "Enugu Branch",
                "scope": "A worship branch with local leaders, departments, and members.",
            },
            {
                "node_type": "ministry",
                "node_kind": "church_ministry",
                "label": "Ministry",
                "example": "Youth Ministry",
                "scope": "Ministry, wing, or fellowship group with its own leaders and activity.",
            },
            {
                "node_type": "department",
                "node_kind": "church_department",
                "label": "Department",
                "example": "Welfare Department",
                "scope": "Operational department such as choir, ushering, welfare, or media.",
            },
        ],
        "role_presets": [
            {"role_key": "branch_admin", "label": "Branch admin", "scope": "node"},
            {"role_key": "department_leader", "label": "Department leader", "scope": "node"},
            {"role_key": "welfare_officer", "label": "Welfare officer", "scope": "node"},
            {"role_key": "verifier", "label": "Evidence verifier", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Branch or department leaders review local placement.",
            },
            {
                "action_key": "evidence.verify",
                "review_mode": "required_role_review",
                "summary": "Evidence should be witnessed by assigned leaders or verifiers.",
            },
        ],
        "activity_lanes": [
            "branch activity",
            "department activity",
            "welfare evidence",
            "member businesses",
            "announcements",
        ],
    },
    "union_professional_body": {
        "node_presets": [
            {
                "node_type": "chapter",
                "node_kind": "union_chapter",
                "label": "Chapter",
                "example": "Abuja Chapter",
                "scope": "State, city, workplace, or diaspora chapter with local officers.",
            },
            {
                "node_type": "committee",
                "node_kind": "union_committee",
                "label": "Committee",
                "example": "Welfare Committee",
                "scope": "Committee handling welfare, discipline, verification, or events.",
            },
            {
                "node_type": "grade",
                "node_kind": "professional_grade",
                "label": "Professional grade",
                "example": "Senior Teachers Forum",
                "scope": "Professional class, credential group, or occupational grade.",
            },
        ],
        "role_presets": [
            {"role_key": "chapter_admin", "label": "Chapter admin", "scope": "node"},
            {"role_key": "committee_lead", "label": "Committee lead", "scope": "node"},
            {"role_key": "credential_verifier", "label": "Credential verifier", "scope": "domain_or_node"},
            {"role_key": "treasurer", "label": "Treasurer", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "summary": "Central admins review formal member intake.",
            },
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Chapter officers review local chapter placement.",
            },
            {
                "action_key": "evidence.verify",
                "review_mode": "required_role_review",
                "summary": "Credential or membership evidence requires a verifier role.",
            },
        ],
        "activity_lanes": [
            "chapter meetings",
            "credential evidence",
            "welfare committee",
            "member services",
            "trusted vendors",
        ],
    },
    "market_cooperative": {
        "node_presets": [
            {
                "node_type": "line",
                "node_kind": "market_line",
                "label": "Trade line",
                "example": "Electronics Line",
                "scope": "Major trade line or product category with local leaders and traders.",
            },
            {
                "node_type": "section",
                "node_kind": "market_section",
                "label": "Section",
                "example": "Phone Accessories Section",
                "scope": "Subsection or cluster inside one trade line.",
            },
            {
                "node_type": "committee",
                "node_kind": "market_committee",
                "label": "Market committee",
                "example": "Welfare Committee",
                "scope": "Executive, welfare, dispute, finance, or verification committee.",
            },
            {
                "node_type": "group",
                "node_kind": "market_activity_group",
                "label": "Activity group",
                "example": "Electronics ROSCA Circle",
                "scope": "Practice group for contributions, demand, support, or shared activity.",
            },
        ],
        "role_presets": [
            {"role_key": "line_admin", "label": "Line admin", "scope": "node"},
            {"role_key": "section_leader", "label": "Section leader", "scope": "node"},
            {"role_key": "trader", "label": "Trader", "scope": "node"},
            {"role_key": "verifier", "label": "Market verifier", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Line or section leaders review local trader placement.",
            },
            {
                "action_key": "evidence.verify",
                "review_mode": "required_role_review",
                "summary": "Line-level trust evidence should name who witnessed it.",
            },
            {
                "action_key": "domain.settings_change",
                "review_mode": "multi_reviewer_review",
                "summary": "Market-wide settings should require more than one reviewer.",
            },
        ],
        "activity_lanes": [
            "member shops",
            "market demand",
            "spotlight",
            "ROSCA/contributions",
            "line-level trust evidence",
        ],
    },
    "family_town_union_diaspora": {
        "node_presets": [
            {
                "node_type": "council",
                "node_kind": "town_union_council",
                "label": "Executive council",
                "example": "Executive Council",
                "scope": "Central leadership for the town union, family network, or diaspora body.",
            },
            {
                "node_type": "branch",
                "node_kind": "town_union_branch",
                "label": "Home / diaspora branch",
                "example": "London Branch",
                "scope": "Local branch at home or in a diaspora city with its own officers.",
            },
            {
                "node_type": "committee",
                "node_kind": "town_union_committee",
                "label": "Committee",
                "example": "Project Committee",
                "scope": "Welfare, project, finance, dispute, or event committee.",
            },
            {
                "node_type": "grade",
                "node_kind": "age_grade",
                "label": "Age grade / family group",
                "example": "Umuada Welfare Group",
                "scope": "Family branch, age-grade, women/youth wing, or practice group.",
            },
        ],
        "role_presets": [
            {"role_key": "branch_admin", "label": "Branch admin", "scope": "node"},
            {"role_key": "project_lead", "label": "Project lead", "scope": "node"},
            {"role_key": "welfare_officer", "label": "Welfare officer", "scope": "node"},
            {"role_key": "treasurer", "label": "Treasurer", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "summary": "Central admins review formal family or union membership.",
            },
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Branch officers review local branch or group placement.",
            },
            {
                "action_key": "domain.settings_change",
                "review_mode": "multi_reviewer_review",
                "summary": "Project or contribution settings should require more than one reviewer.",
            },
        ],
        "activity_lanes": [
            "welfare support",
            "project contributions",
            "diaspora chapters",
            "family evidence",
            "member businesses",
        ],
    },
    "hospital_health_body": {
        "node_presets": [
            {
                "node_type": "facility",
                "node_kind": "health_facility",
                "label": "Facility / branch",
                "example": "Main Clinic",
                "scope": "Hospital, clinic, branch facility, or medical practice location.",
            },
            {
                "node_type": "department",
                "node_kind": "health_department",
                "label": "Department",
                "example": "Maternity Department",
                "scope": "Clinical, pharmacy, laboratory, records, or administrative department.",
            },
            {
                "node_type": "unit",
                "node_kind": "clinical_unit",
                "label": "Clinical unit",
                "example": "Night Shift Nursing Unit",
                "scope": "Controlled unit, role group, shift group, or care team.",
            },
        ],
        "role_presets": [
            {"role_key": "facility_admin", "label": "Facility admin", "scope": "node"},
            {"role_key": "department_lead", "label": "Department lead", "scope": "node"},
            {"role_key": "records_officer", "label": "Records officer", "scope": "node"},
            {"role_key": "credential_verifier", "label": "Credential verifier", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Facility or department admins review local staff placement.",
            },
            {
                "action_key": "evidence.verify",
                "review_mode": "required_role_review",
                "summary": "Credential or record evidence requires a designated verifier.",
            },
            {
                "action_key": "domain.settings_change",
                "review_mode": "multi_reviewer_review",
                "summary": "Health-domain settings should require careful multi-reviewer approval.",
            },
        ],
        "activity_lanes": [
            "staff credential evidence",
            "controlled documents",
            "department notices",
            "approved suppliers",
            "analytics",
        ],
    },
    "ngo_project_network": {
        "node_presets": [
            {
                "node_type": "office",
                "node_kind": "ngo_field_office",
                "label": "Field office",
                "example": "North Region Field Office",
                "scope": "Head office, field office, or regional project location.",
            },
            {
                "node_type": "program",
                "node_kind": "ngo_program",
                "label": "Program",
                "example": "Livelihood Program",
                "scope": "Program, project stream, donor mandate, or intervention area.",
            },
            {
                "node_type": "team",
                "node_kind": "ngo_team",
                "label": "Team",
                "example": "Monitoring Team",
                "scope": "Field team, evidence team, partner unit, or beneficiary group.",
            },
            {
                "node_type": "committee",
                "node_kind": "ngo_project_committee",
                "label": "Project committee",
                "example": "Procurement Committee",
                "scope": "Committee responsible for approvals, evidence, procurement, or reports.",
            },
        ],
        "role_presets": [
            {"role_key": "field_admin", "label": "Field admin", "scope": "node"},
            {"role_key": "program_lead", "label": "Program lead", "scope": "node"},
            {"role_key": "evidence_officer", "label": "Evidence officer", "scope": "domain_or_node"},
            {"role_key": "partner_admin", "label": "Partner admin", "scope": "node"},
        ],
        "policy_presets": [
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Program or field-office admins review local placement.",
            },
            {
                "action_key": "evidence.verify",
                "review_mode": "required_role_review",
                "summary": "Evidence and report records require an evidence officer or verifier.",
            },
            {
                "action_key": "domain.settings_change",
                "review_mode": "multi_reviewer_review",
                "summary": "Project-wide settings should require more than one reviewer.",
            },
        ],
        "activity_lanes": [
            "field reports",
            "beneficiary evidence",
            "partner units",
            "project suppliers",
            "donor-ready analytics",
        ],
    },
    "generic_association": {
        "node_presets": [
            {
                "node_type": "branch",
                "node_kind": "association_branch",
                "label": "Branch",
                "example": "Main Branch",
                "scope": "Local branch, regional office, or chapter.",
            },
            {
                "node_type": "committee",
                "node_kind": "association_committee",
                "label": "Committee",
                "example": "Membership Committee",
                "scope": "Committee or desk with delegated responsibilities.",
            },
        ],
        "role_presets": [
            {"role_key": "branch_admin", "label": "Branch admin", "scope": "node"},
            {"role_key": "committee_lead", "label": "Committee lead", "scope": "node"},
            {"role_key": "verifier", "label": "Verifier", "scope": "domain_or_node"},
        ],
        "policy_presets": [
            {
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "summary": "Domain admins review formal membership changes.",
            },
            {
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "summary": "Local admins review node placement.",
            },
        ],
        "activity_lanes": [
            "branch activity",
            "committee activity",
            "member evidence",
            "announcements",
            "optional marketplace",
        ],
    },
}


def _clean_str(value: Optional[str], default: str = "") -> str:
    text = str(value or "").strip()
    return text or default


def _clean_role(value: Optional[str], default: str = "member") -> str:
    return _clean_str(value, default).lower().replace(" ", "_")


def _clean_template_key(value: Optional[str], default: str = "") -> str:
    text = _clean_str(value, default).lower()
    text = re.sub(r"[\s-]+", "_", text)
    return re.sub(r"_+", "_", text).strip("_")


def normalize_domain_name(value: str) -> str:
    text = _clean_str(value).lower()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^a-z0-9-]", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text


def _domain_name_unavailable_reason(domain_name: str) -> Optional[str]:
    if not domain_name:
        return "domain_name_required"
    if domain_name in RESERVED_DOMAIN_NAMES:
        return "reserved_domain_name"
    if not DOMAIN_NAME_PATTERN.match(domain_name):
        return "invalid_domain_name"
    return None


def _domain_available_payload(db: Session, raw_domain_name: str) -> dict[str, Any]:
    normalized = normalize_domain_name(raw_domain_name)
    reason = _domain_name_unavailable_reason(normalized)
    if reason:
        return {
            "domain_name": raw_domain_name,
            "normalized_domain_name": normalized,
            "available": False,
            "reason": reason,
        }

    existing = (
        db.query(CommunityDomain)
        .filter(CommunityDomain.domain_name == normalized)
        .first()
    )
    if existing:
        return {
            "domain_name": raw_domain_name,
            "normalized_domain_name": normalized,
            "available": False,
            "reason": "domain_name_taken",
        }

    return {
        "domain_name": raw_domain_name,
        "normalized_domain_name": normalized,
        "available": True,
        "reason": None,
    }


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value is not None else None


def _json_dump(value: Optional[dict[str, Any]]) -> Optional[str]:
    if not value:
        return None
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _json_load(value: Optional[str]) -> dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _node_payload(node: Optional[CommunityNode]) -> Optional[dict[str, Any]]:
    if node is None:
        return None
    return {
        "id": int(node.id),
        "community_domain_id": int(node.community_domain_id),
        "parent_node_id": int(node.parent_node_id) if node.parent_node_id is not None else None,
        "name": node.name,
        "node_type": node.node_type,
        "node_kind": node.node_kind,
        "path": node.path,
        "depth": int(node.depth or 0),
        "description": node.description,
        "sort_order": int(node.sort_order or 0),
        "visibility_policy": node.visibility_policy,
        "inherits_parent_policy": bool(node.inherits_parent_policy),
        "status": node.status,
    }


def _domain_member_payload(row: CommunityDomainMembership) -> dict[str, Any]:
    user = getattr(row, "user", None)
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "user_id": int(row.user_id),
        "user_email": getattr(user, "email", None),
        "user_display_name": getattr(user, "display_name", None),
        "role": row.role,
        "status": row.status,
        "title": row.title,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _node_member_payload(row: CommunityNodeMembership) -> dict[str, Any]:
    user = getattr(row, "user", None)
    node = getattr(row, "community_node", None)
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id),
        "community_node_name": getattr(node, "name", None),
        "user_id": int(row.user_id),
        "user_email": getattr(user, "email", None),
        "user_display_name": getattr(user, "display_name", None),
        "role": row.role,
        "status": row.status,
        "title": row.title,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _policy_payload(row: CommunityDomainPolicy) -> dict[str, Any]:
    node = getattr(row, "community_node", None)
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "community_node_name": getattr(node, "name", None),
        "policy_key": row.policy_key,
        "action_key": row.action_key,
        "scope_type": row.scope_type,
        "review_mode": row.review_mode,
        "required_role": row.required_role,
        "status": row.status,
        "policy_summary": row.policy_summary,
        "config": _json_load(row.config_json),
        "created_by_user_id": int(row.created_by_user_id),
        "updated_by_user_id": int(row.updated_by_user_id) if row.updated_by_user_id is not None else None,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _action_review_payload(row: CommunityDomainActionReview) -> dict[str, Any]:
    node = getattr(row, "community_node", None)
    policy = getattr(row, "policy", None)
    requester = getattr(row, "requester", None)
    subject = getattr(row, "subject", None)
    decisions = sorted(
        getattr(row, "decisions", []) or [],
        key=lambda item: (item.created_at or datetime.min.replace(tzinfo=timezone.utc), int(item.id or 0)),
    )
    approval_count = sum(1 for item in decisions if _clean_role(item.decision) == "approve")
    recusal_count = sum(1 for item in decisions if _clean_role(item.decision) == "recuse")
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "community_node_name": getattr(node, "name", None),
        "policy_id": int(row.policy_id) if row.policy_id is not None else None,
        "parent_review_id": (
            int(row.parent_review_id) if row.parent_review_id is not None else None
        ),
        "policy_key": getattr(policy, "policy_key", None),
        "action_key": row.action_key,
        "requested_by_user_id": int(row.requested_by_user_id),
        "requested_by_user_email": getattr(requester, "email", None),
        "requested_by_user_display_name": getattr(requester, "display_name", None),
        "subject_user_id": int(row.subject_user_id) if row.subject_user_id is not None else None,
        "subject_user_email": getattr(subject, "email", None),
        "subject_user_display_name": getattr(subject, "display_name", None),
        "decided_by_user_id": int(row.decided_by_user_id) if row.decided_by_user_id is not None else None,
        "applied_by_user_id": int(row.applied_by_user_id) if row.applied_by_user_id is not None else None,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "status": row.status,
        "decision": row.decision,
        "request_note": row.request_note,
        "decision_note": row.decision_note,
        "payload": _json_load(row.payload_json),
        "required_approvals": _required_review_approvals(row),
        "approval_count": approval_count,
        "recusal_count": recusal_count,
        "decisions": [_action_review_decision_payload(item) for item in decisions],
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
        "decided_at": _iso(row.decided_at),
        "applied_at": _iso(row.applied_at),
    }


def _action_review_decision_payload(row: CommunityDomainActionReviewDecision) -> dict[str, Any]:
    decider = getattr(row, "decider", None)
    return {
        "id": int(row.id),
        "action_review_id": int(row.action_review_id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "decided_by_user_id": int(row.decided_by_user_id),
        "decided_by_user_email": getattr(decider, "email", None),
        "decision": row.decision,
        "decision_note": row.decision_note,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _action_review_comment_payload(
    row: CommunityDomainActionReviewComment,
) -> dict[str, Any]:
    author = getattr(row, "author", None)
    return {
        "id": int(row.id),
        "action_review_id": int(row.action_review_id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": (
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        "author_user_id": int(row.author_user_id),
        "author_user_email": getattr(author, "email", None),
        "body": row.body,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _action_review_evidence_payload(
    row: CommunityDomainActionReviewEvidence,
) -> dict[str, Any]:
    submitter = getattr(row, "submitter", None)
    return {
        "id": int(row.id),
        "action_review_id": int(row.action_review_id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": (
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        "submitted_by_user_id": int(row.submitted_by_user_id),
        "submitted_by_user_email": getattr(submitter, "email", None),
        "evidence_type": row.evidence_type,
        "title": row.title,
        "description": row.description,
        "file_name": row.file_name,
        "content_type": row.content_type,
        "storage_key": row.storage_key,
        "external_reference": row.external_reference,
        "checksum": row.checksum,
        "status": row.status,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _activity_time(value: Optional[datetime]) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _action_review_activity_items(
    db: Session,
    row: CommunityDomainActionReview,
) -> list[dict[str, Any]]:
    base = {
        "action_review_id": int(row.id),
        "community_node_id": (
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        "review_status": row.status,
    }
    activity_items: list[dict[str, Any]] = [
        {
            **base,
            "type": "review_created",
            "occurred_at": _iso(row.created_at),
            "sort_at": _activity_time(row.created_at),
            "sort_order": 0,
            "sort_id": int(row.id),
            "actor_user_id": int(row.requested_by_user_id),
            "payload": _action_review_payload(row),
        }
    ]

    decision_rows = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReviewDecision.created_at.asc(),
            CommunityDomainActionReviewDecision.id.asc(),
        )
        .all()
    )
    for decision_row in decision_rows:
        activity_items.append(
            {
                **base,
                "type": "decision",
                "occurred_at": _iso(decision_row.created_at),
                "sort_at": _activity_time(decision_row.created_at),
                "sort_order": 1,
                "sort_id": int(decision_row.id),
                "actor_user_id": int(decision_row.decided_by_user_id),
                "payload": _action_review_decision_payload(decision_row),
            }
        )

    comment_rows = (
        db.query(CommunityDomainActionReviewComment)
        .filter(CommunityDomainActionReviewComment.action_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReviewComment.created_at.asc(),
            CommunityDomainActionReviewComment.id.asc(),
        )
        .all()
    )
    for comment_row in comment_rows:
        activity_items.append(
            {
                **base,
                "type": "comment",
                "occurred_at": _iso(comment_row.created_at),
                "sort_at": _activity_time(comment_row.created_at),
                "sort_order": 2,
                "sort_id": int(comment_row.id),
                "actor_user_id": int(comment_row.author_user_id),
                "payload": _action_review_comment_payload(comment_row),
            }
        )

    evidence_rows = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .order_by(
            CommunityDomainActionReviewEvidence.created_at.asc(),
            CommunityDomainActionReviewEvidence.id.asc(),
        )
        .all()
    )
    for evidence_row in evidence_rows:
        activity_items.append(
            {
                **base,
                "type": "evidence",
                "occurred_at": _iso(evidence_row.created_at),
                "sort_at": _activity_time(evidence_row.created_at),
                "sort_order": 3,
                "sort_id": int(evidence_row.id),
                "actor_user_id": int(evidence_row.submitted_by_user_id),
                "payload": _action_review_evidence_payload(evidence_row),
            }
        )

    current_status = _clean_role(row.status)
    if current_status in {"cancelled", "applied"}:
        status_time = (
            row.decided_at
            if current_status == "cancelled"
            else row.applied_at or row.updated_at
        )
        status_actor_user_id = None
        if current_status == "cancelled" and row.decided_by_user_id is not None:
            status_actor_user_id = int(row.decided_by_user_id)
        elif current_status == "applied" and row.applied_by_user_id is not None:
            status_actor_user_id = int(row.applied_by_user_id)

        activity_items.append(
            {
                **base,
                "type": "review_status_changed",
                "occurred_at": _iso(status_time),
                "sort_at": _activity_time(status_time),
                "sort_order": 4,
                "sort_id": int(row.id),
                "actor_user_id": status_actor_user_id,
                "payload": {
                    "status": row.status,
                    "decision": row.decision,
                    "decision_note": row.decision_note,
                    "action_review": _action_review_payload(row),
                },
            }
        )

    return activity_items


def _strip_activity_sort_fields(items: list[dict[str, Any]]) -> None:
    for item in items:
        item.pop("sort_at", None)
        item.pop("sort_order", None)
        item.pop("sort_id", None)


def _domain_payload(
    domain: CommunityDomain,
    *,
    root_node: Optional[CommunityNode] = None,
) -> dict[str, Any]:
    resolved_template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    return {
        "id": int(domain.id),
        "domain_name": domain.domain_name,
        "display_name": domain.display_name,
        "domain_type": domain.domain_type,
        "template_key": domain.template_key,
        "resolved_template": {
            "template_key": resolved_template["template_key"],
            "domain_type": resolved_template["domain_type"],
            "label": resolved_template["label"],
            "marketplace_role": resolved_template["marketplace_role"],
            "default_modules": list(resolved_template["default_modules"]),
        },
        "owner_user_id": int(domain.owner_user_id),
        "clan_id": int(domain.clan_id) if domain.clan_id is not None else None,
        "status": domain.status,
        "verification_status": domain.verification_status,
        "country": domain.country,
        "state": domain.state,
        "public_profile": domain.public_profile,
        "created_at": _iso(domain.created_at),
        "updated_at": _iso(domain.updated_at),
        "root_node": _node_payload(root_node),
        "boundary": (
            "Draft only. This does not create a social Community, activate billing, "
            "verify ownership, or launch a public institutional domain."
        ),
    }


def _public_domain_entry_payload(domain: CommunityDomain) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    return {
        "id": int(domain.id),
        "domain_name": domain.domain_name,
        "display_name": domain.display_name,
        "domain_type": domain.domain_type,
        "template_key": template["template_key"],
        "template_label": template["label"],
        "status": domain.status,
        "verification_status": domain.verification_status,
        "country": domain.country,
        "state": domain.state,
        "public_profile": domain.public_profile,
        "dashboard_path": f"/app/community-domain/{int(domain.id)}",
        "membership_request_route": f"/community-domains/{int(domain.id)}/membership-requests",
        "boundary": (
            "Public-safe Community Domain lookup only. This does not expose "
            "member lists, private evidence, finance records, payment "
            "instructions, owner contact details, governance queue details, "
            "or verification proof. Opening the dashboard still requires active "
            "membership, or a membership request that an owner/admin later "
            "approves and applies."
        ),
    }


def _community_domain_template_for_key(template_key: Optional[str]) -> dict[str, Any]:
    key = _clean_template_key(template_key, "generic_association")
    key = COMMUNITY_DOMAIN_TEMPLATE_ALIASES.get(key, key)
    for preset in COMMUNITY_DOMAIN_TEMPLATE_PRESETS:
        if preset["template_key"] == key or preset["domain_type"] == key:
            return preset

    for preset in COMMUNITY_DOMAIN_TEMPLATE_PRESETS:
        if preset["template_key"] == "generic_association":
            return preset

    return COMMUNITY_DOMAIN_TEMPLATE_PRESETS[-1]


def _community_domain_template_for_key_or_none(
    template_key: str,
) -> Optional[dict[str, Any]]:
    key = _clean_template_key(template_key)
    key = COMMUNITY_DOMAIN_TEMPLATE_ALIASES.get(key, key)
    for preset in COMMUNITY_DOMAIN_TEMPLATE_PRESETS:
        if preset["template_key"] == key or preset["domain_type"] == key:
            return preset
    return None


def _community_domain_template_operating_blueprint_payload(
    *,
    template: dict[str, Any],
) -> dict[str, Any]:
    template_key = str(template["template_key"])
    blueprint = COMMUNITY_DOMAIN_TEMPLATE_OPERATING_BLUEPRINTS.get(template_key)
    uses_generic_fallback = blueprint is None
    if blueprint is None:
        blueprint = COMMUNITY_DOMAIN_TEMPLATE_OPERATING_BLUEPRINTS[
            "generic_association"
        ]
    default_modules = list(template["default_modules"])
    marketplace_role = _clean_role(template["marketplace_role"], "optional")
    module_fit = [
        {
            "module_key": module_key,
            "status": "enabled_by_template",
            "summary": COMMUNITY_DOMAIN_MODULE_PRESETS.get(
                module_key,
                {
                    "summary": "Template-defined Community Domain module.",
                },
            )["summary"],
        }
        for module_key in default_modules
    ]
    if "marketplace" not in default_modules and "shops" not in default_modules:
        module_fit.append(
            {
                "module_key": "marketplace",
                "status": f"{marketplace_role}_template",
                "summary": (
                    "Marketplace activity is optional unless the institution's "
                    "real work needs trusted shops, demand, vendors, or member trade."
                ),
            }
        )

    return {
        "template": {
            "template_key": template_key,
            "domain_type": template["domain_type"],
            "label": template["label"],
            "summary": template["summary"],
            "typical_nodes": list(template["typical_nodes"]),
            "default_modules": default_modules,
            "marketplace_role": marketplace_role,
        },
        "blueprint_source": (
            "generic_association" if uses_generic_fallback else template_key
        ),
        "uses_generic_fallback": bool(uses_generic_fallback),
        "node_presets": blueprint["node_presets"],
        "role_presets": blueprint["role_presets"],
        "policy_presets": blueprint["policy_presets"],
        "activity_lanes": blueprint["activity_lanes"],
        "module_fit": module_fit,
        "governance_shape": {
            "supports_nested_nodes": True,
            "supports_inherited_policy": True,
            "supports_local_policy_override": True,
            "supports_role_scoped_review": True,
            "supports_multi_reviewer_review": True,
        },
        "editable": False,
        "boundary": (
            "Template operating blueprint is public read-only planning guidance. "
            "It does not create a Community Domain, create nodes, create members, "
            "assign roles, create policy, create action reviews, activate billing, "
            "verify authority, create marketplace activity, create social "
            "Communities, move money, or create separate schemas for each society "
            "type."
        ),
    }


def _community_domain_package_quote_payload(
    domain: CommunityDomain,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    included_modules = list(template["default_modules"])
    optional_modules = [
        module
        for module in [
            "shops",
            "marketplace",
            "spotlight",
            "verification",
            "analytics",
            "vault",
        ]
        if module not in included_modules
    ]

    return {
        "package_code": "community_domain_starter",
        "package_name": "Community Domain Starter",
        "quote_status": "draft_quote",
        "pricing_status": "pilot_quote_required",
        "billing_cycle": "manual_quote",
        "price_amount": None,
        "currency": None,
        "template_key": template["template_key"],
        "domain_type": template["domain_type"],
        "included_modules": included_modules,
        "optional_modules": optional_modules,
        "limits": COMMUNITY_DOMAIN_PACKAGE_LIMITS,
        "renewal_policy": {
            "status": "not_configured",
            "message": "Renewal period and price must be confirmed before payment instruction.",
        },
        "next_step": "Generate a payment instruction only after the owner accepts a confirmed quote.",
        "boundary": (
            "Quote preview only. This does not create a payment instruction, "
            "confirm payment, activate billing, activate the Community Domain, "
            "or verify ownership."
        ),
    }


def _community_domain_service_settings_payload(
    domain: CommunityDomain,
    *,
    can_admin: bool,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    enabled_modules = set(template["default_modules"])
    ordered_module_keys = list(
        dict.fromkeys([*template["default_modules"], *COMMUNITY_DOMAIN_MODULE_PRESETS.keys()])
    )
    items = []
    for module_key in ordered_module_keys:
        preset = COMMUNITY_DOMAIN_MODULE_PRESETS.get(
            module_key,
            {
                "label": module_key.replace("_", " ").title(),
                "summary": "Template-defined Community Domain module.",
            },
        )
        enabled_by_template = module_key in enabled_modules
        items.append(
            {
                "module_key": module_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "enabled": enabled_by_template,
                "status": "enabled_by_template" if enabled_by_template else "available_optional",
                "source": "template_default" if enabled_by_template else "module_catalog",
                "editable": False,
                "admin_visible": bool(can_admin),
                "boundary": (
                    "Read-only template projection. This setting does not enable, "
                    "disable, bill, activate, or grant permissions for the module."
                ),
            }
        )

    return {
        "template_key": template["template_key"],
        "domain_type": template["domain_type"],
        "items": items,
        "enabled_total": sum(1 for item in items if item["enabled"]),
        "optional_total": sum(1 for item in items if not item["enabled"]),
        "editable": False,
        "boundary": (
            "Service settings are read-only template defaults in this MVP slice. "
            "This endpoint does not persist settings, enable or disable modules, "
            "activate billing, activate the Community Domain, grant permissions, "
            "or expose private records."
        ),
    }


MODULE_SCOPE_NODE_MODULES = {
    "shops",
    "marketplace",
    "spotlight",
    "vault",
    "verification",
    "events",
    "demand",
    "notifications",
    "trust_centre",
}
MODULE_SCOPE_ACTION_MARKERS: dict[str, tuple[str, ...]] = {
    "governance": ("domain.settings", "policy", "governance", "action_review"),
    "members": ("member.", "domain_member", "node_member", "membership"),
    "departments": ("node.", "structure", "department", "branch"),
    "shops": ("shop", "vendor"),
    "marketplace": ("marketplace", "listing", "demand", "vendor"),
    "spotlight": ("spotlight", "content", "publish"),
    "vault": ("vault", "document"),
    "verification": ("verification", "evidence", "credential"),
    "events": ("event", "meeting", "attendance", "notice"),
    "demand": ("demand", "request"),
    "notifications": ("notice", "notification", "announcement"),
    "analytics": ("analytics", "report", "dashboard"),
    "trust_centre": ("trust", "evidence", "relay"),
}


def _community_domain_module_scope_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    enabled_modules = set(template["default_modules"])
    ordered_module_keys = list(
        dict.fromkeys([*template["default_modules"], *COMMUNITY_DOMAIN_MODULE_PRESETS.keys()])
    )
    root_node = _find_root_node(db, community_domain_id=domain_id)

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    active_nodes = [
        node for node in nodes if _clean_role(node.status, "active") == "active"
    ]
    active_non_root_nodes = [
        node for node in active_nodes if node.parent_node_id is not None
    ]
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_rows = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    review_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    open_review_rows = [
        row
        for row in review_rows
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    ]

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def action_matches(module_key: str, action_key: Optional[str]) -> bool:
        action = _clean_str(action_key).lower()
        if not action:
            return False
        markers = MODULE_SCOPE_ACTION_MARKERS.get(module_key, (module_key,))
        return any(marker in action for marker in markers)

    policy_counts: dict[str, int] = {}
    node_policy_counts: dict[str, int] = {}
    review_counts: dict[str, int] = {}
    open_review_counts: dict[str, int] = {}
    for module_key in ordered_module_keys:
        policy_counts[module_key] = sum(
            1 for row in active_policy_rows if action_matches(module_key, row.action_key)
        )
        node_policy_counts[module_key] = sum(
            1
            for row in active_policy_rows
            if row.community_node_id is not None
            and action_matches(module_key, row.action_key)
        )
        review_counts[module_key] = sum(
            1 for row in review_rows if action_matches(module_key, row.action_key)
        )
        open_review_counts[module_key] = sum(
            1 for row in open_review_rows if action_matches(module_key, row.action_key)
        )

    status_counts: dict[str, int] = {}
    module_items = []
    for module_key in ordered_module_keys:
        preset = COMMUNITY_DOMAIN_MODULE_PRESETS.get(
            module_key,
            {
                "label": module_key.replace("_", " ").title(),
                "summary": "Template-defined Community Domain module.",
            },
        )
        enabled = module_key in enabled_modules
        node_scoped = module_key in MODULE_SCOPE_NODE_MODULES
        policy_count = policy_counts.get(module_key, 0)
        node_policy_count = node_policy_counts.get(module_key, 0)
        review_count = review_counts.get(module_key, 0)
        open_review_count = open_review_counts.get(module_key, 0)

        if not enabled:
            module_scope_status = "optional_module_not_enabled"
            next_step = "Keep this optional module disabled until the institution actually needs it."
            ready = False
            admin_route = "/service-settings"
        elif node_scoped and not active_non_root_nodes:
            module_scope_status = "needs_operating_units"
            next_step = "Model branches, departments, lines, or units before node-scoped modules rely on them."
            ready = False
            admin_route = "/rollout-tree"
        elif node_scoped and int(active_node_member_count) == 0:
            module_scope_status = "needs_node_participants"
            next_step = "Place members into operating units before this module can be safely scoped locally."
            ready = False
            admin_route = "/node-participation-map"
        elif policy_count == 0 and module_key in {"governance", "members"}:
            module_scope_status = "needs_domain_policy"
            next_step = "Define domain-level policy before this core module carries institutional decisions."
            ready = False
            admin_route = "/governance-coverage"
        elif node_scoped and policy_count == 0:
            module_scope_status = "needs_scope_policy"
            next_step = "Define policy for who may use this module at domain, node, or future group scope."
            ready = False
            admin_route = "/governance-coverage"
        elif node_scoped and review_count == 0:
            module_scope_status = "needs_review_signal"
            next_step = "Run at least one real review signal before treating this module as ready for scoped operation."
            ready = False
            admin_route = "/action-reviews"
        else:
            module_scope_status = "ready_for_future_module_scope"
            next_step = "Keep this as planning readiness until a real CommunityDomainModuleScope table exists."
            ready = True
            admin_route = "/service-settings"

        status_counts[module_scope_status] = status_counts.get(module_scope_status, 0) + 1
        module_items.append(
            {
                "module_key": module_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "enabled_by_template": bool(enabled),
                "module_scope_status": module_scope_status,
                "ready_for_future_module_scope": bool(ready),
                "domain_scope_status": (
                    "template_enabled"
                    if enabled
                    else "optional_module_not_enabled"
                ),
                "node_scope_status": (
                    module_scope_status
                    if node_scoped or module_scope_status == "optional_module_not_enabled"
                    else "domain_level_module"
                ),
                "activity_group_scope_status": (
                    "future_activity_group_scope_not_connected"
                    if node_scoped and enabled
                    else "not_applicable_in_this_slice"
                ),
                "active_node_count": len(active_non_root_nodes),
                "active_node_member_count": admin_count(int(active_node_member_count)),
                "active_policy_count": admin_count(policy_count),
                "active_node_policy_count": admin_count(node_policy_count),
                "review_record_count": admin_count(review_count),
                "open_review_count": admin_count(open_review_count),
                "module_scope_record_status": "not_created_in_this_slice",
                "settings_status": "not_persisted_in_this_slice",
                "billing_status": "not_activated_in_this_slice",
                "permission_status": "not_granted_in_this_slice",
                "route_hint": route_hint(admin_route, requires_admin=True),
                "requires_admin": True,
                "next_step": next_step,
                "boundary": (
                    "Read-only module-scope readiness item. This does not create "
                    "CommunityDomainModuleScope records, persist service settings, "
                    "enable modules, activate billing, grant permissions, create "
                    "shops, create vault links, publish Spotlight, create events, "
                    "send notifications, create TrustSlips, write Trust Passport "
                    "entries, or expose private member activity."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_module_scope",
            "label": "Ask a Community Domain admin to review module scope readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif status_counts.get("needs_operating_units", 0):
        primary_next_action = {
            "action_key": "model_operating_units_before_module_scope",
            "label": "Model operating units before module scope",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_node_participants", 0):
        primary_next_action = {
            "action_key": "place_members_before_module_scope",
            "label": "Place members before node-scoped modules",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_domain_policy", 0) or status_counts.get(
        "needs_scope_policy", 0
    ):
        primary_next_action = {
            "action_key": "define_module_scope_policy",
            "label": "Define policy before module scope",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_review_signal", 0):
        primary_next_action = {
            "action_key": "review_module_scope_signals",
            "label": "Review module scope action signals",
            "route_hint": route_hint("/action-reviews", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_module_scope_boundaries",
            "label": "Review module scope boundaries",
            "route_hint": route_hint("/service-settings", requires_admin=True),
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "default_modules": list(template["default_modules"]),
        },
        "summary": {
            "module_scope_engine_status": "not_connected_in_this_slice",
            "module_scope_records_created": 0,
            "service_settings_persisted": 0,
            "modules_enabled": 0,
            "billing_activations": 0,
            "permissions_granted": 0,
            "notifications_sent": 0,
            "trust_records_created": 0,
            "template_module_count": len(enabled_modules),
            "catalog_module_count": len(ordered_module_keys),
            "active_node_count": len(active_non_root_nodes),
            "active_node_member_count": admin_count(int(active_node_member_count)),
            "active_policy_count": admin_count(len(active_policy_rows)),
            "review_record_count": admin_count(len(review_rows)),
            "open_review_count": admin_count(len(open_review_rows)),
        },
        "status_counts": status_counts,
        "modules": module_items,
        "ready_total": sum(1 for item in module_items if item["ready_for_future_module_scope"]),
        "blocked_modules": [
            item["module_key"]
            for item in module_items
            if not item["ready_for_future_module_scope"]
        ],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain module-scope readiness is read-only module scope "
            "planning. This endpoint does not create CommunityDomainModuleScope "
            "records, persist settings, enable or disable modules, activate "
            "billing, grant permissions, create shops, create marketplace "
            "records, create demand records, publish Spotlight, create vault "
            "links, upload files, create meetings or events, send notifications, "
            "create activity groups, issue TrustSlips, write Trust Passport "
            "entries, expose private member activity, or move money."
        ),
    }


def _community_domain_economic_participation_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    enabled_modules = set(template["default_modules"])
    marketplace_role = _clean_role(template["marketplace_role"], "optional")
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .count()
    )

    marketplace_ready = marketplace_role in {"core", "supported"}
    marketplace_status_by_role = {
        "core": "core_template",
        "supported": "supported_template",
        "optional": "optional_template",
        "limited": "limited_template",
    }

    def module_status(module_key: Optional[str]) -> tuple[str, bool]:
        if module_key is None:
            return ("not_connected_in_this_slice", False)
        if module_key in enabled_modules:
            return ("enabled_by_template", True)
        return ("available_optional", False)

    def route_hint_for(*, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{int(domain.id)}/service-settings"

    lanes = []
    for preset in COMMUNITY_DOMAIN_ECONOMIC_LANE_PRESETS:
        lane_key = preset["lane_key"]
        module_key = preset["module_key"]
        if lane_key == "marketplace":
            status = marketplace_status_by_role.get(
                marketplace_role, "optional_template"
            )
            ready = marketplace_ready
            route_hint = f"/community-domains/{int(domain.id)}/service-settings"
            next_step = (
                "Prepare marketplace-facing operations for this institution."
                if marketplace_ready
                else "Keep marketplace activity optional unless the institution chooses it."
            )
        elif lane_key == "finance_support":
            status = "not_connected_in_this_slice"
            ready = False
            route_hint = route_hint_for(requires_admin=bool(preset["requires_admin"]))
            next_step = (
                "Do not promise finance, payment, repayment, or support rails until a dedicated finance bridge exists."
            )
        else:
            status, ready = module_status(str(module_key))
            route_hint = route_hint_for(requires_admin=bool(preset["requires_admin"]))
            next_step = (
                "Review the included template module."
                if ready
                else "Treat this as optional until a domain admin enables or packages it later."
            )

        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "module_key": module_key,
                "status": status,
                "ready": bool(ready),
                "route_hint": route_hint,
                "requires_admin": bool(preset["requires_admin"]),
                "admin_visible": bool(can_admin),
                "next_step": next_step,
                "boundary": (
                    "Read-only economic participation lane. This does not create "
                    "a marketplace, create a shop, publish listings, create demand, "
                    "place spotlight, create vault links, move money, create payment "
                    "instructions, create finance records, verify trust evidence, "
                    "or expose private member activity."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin",
            "label": "Ask a Community Domain admin to configure economic participation",
            "route_hint": None,
            "requires_admin": True,
        }
    elif marketplace_role == "core":
        primary_next_action = {
            "action_key": "review_market_operations",
            "label": "Review market-facing modules",
            "route_hint": f"/community-domains/{int(domain.id)}/service-settings",
            "requires_admin": True,
        }
    elif marketplace_role in {"supported", "optional"}:
        primary_next_action = {
            "action_key": "choose_economic_lanes",
            "label": "Choose which economic lanes this institution needs",
            "route_hint": f"/community-domains/{int(domain.id)}/service-settings",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_limited_economic_fit",
            "label": "Review limited economic participation",
            "route_hint": f"/community-domains/{int(domain.id)}/service-settings",
            "requires_admin": True,
        }

    return {
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": marketplace_role,
            "default_modules": list(template["default_modules"]),
        },
        "counts": {
            "nodes": int(node_count),
            "active_members": int(active_member_count),
            "active_node_memberships": int(active_node_member_count),
            "shops": 0,
            "listings": 0,
            "demands": 0,
            "spotlights": 0,
            "finance_records": 0,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Economic participation is read-only template and readiness guidance "
            "in this MVP slice. This endpoint does not create a marketplace, "
            "create a shop, publish listings, create demand, place spotlight, "
            "create vault links, move money, create payment instructions, create "
            "finance records, verify trust evidence, activate billing, activate "
            "the Community Domain, create a social Community, or expose private "
            "member activity."
        ),
    }


def _community_domain_network_presence_payload(
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    enabled_modules = set(template["default_modules"])
    marketplace_role = _clean_role(template["marketplace_role"], "optional")
    verification_status = _clean_role(domain.verification_status, "unverified")
    domain_status = _clean_role(domain.status, "draft")
    public_profile_present = bool(_clean_str(domain.public_profile))
    has_social_bridge = domain.clan_id is not None

    status_by_lane = {
        "public_identity": "ready" if public_profile_present else "profile_needed",
        "verified_domain_badge": (
            "verified" if verification_status == "verified" else verification_status
        ),
        "public_url": "open_product_decision",
        "marketplace_exposure": (
            "market_facing_template"
            if marketplace_role in {"core", "supported"}
            else f"{marketplace_role}_template"
        ),
        "spotlight_exposure": (
            "enabled_by_template"
            if "spotlight" in enabled_modules
            else "available_optional"
        ),
        "vault_links": "not_created_in_this_slice",
        "social_community_bridge": (
            "linked" if has_social_bridge else "not_created_in_this_slice"
        ),
    }
    ready_by_lane = {
        "public_identity": public_profile_present,
        "verified_domain_badge": verification_status == "verified",
        "public_url": False,
        "marketplace_exposure": marketplace_role in {"core", "supported"},
        "spotlight_exposure": "spotlight" in enabled_modules,
        "vault_links": False,
        "social_community_bridge": has_social_bridge,
    }

    def route_hint_for(*, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{int(domain.id)}"

    lanes = []
    for preset in COMMUNITY_DOMAIN_NETWORK_PRESENCE_LANE_PRESETS:
        lane_key = preset["lane_key"]
        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "status": status_by_lane[lane_key],
                "ready": bool(ready_by_lane[lane_key]),
                "route_hint": route_hint_for(
                    requires_admin=bool(preset["requires_admin"])
                ),
                "requires_admin": bool(preset["requires_admin"]),
                "admin_visible": bool(can_admin),
                "boundary": (
                    "Read-only network presence lane. This does not publish a "
                    "public page, finalize a public URL, create outward links, "
                    "verify the domain, create marketplace exposure, create "
                    "Spotlight placement, create vault links, create a social "
                    "Community bridge, or expose private member activity."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin",
            "label": "Ask a Community Domain admin to prepare public presence",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not public_profile_present:
        primary_next_action = {
            "action_key": "complete_public_profile",
            "label": "Complete the Community Domain public profile",
            "route_hint": f"/community-domains/{int(domain.id)}",
            "requires_admin": True,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "prepare_verification",
            "label": "Prepare Community Domain authority verification",
            "route_hint": f"/community-domains/{int(domain.id)}/verification-requirements",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_public_presence",
            "label": "Review Community Domain public presence",
            "route_hint": f"/community-domains/{int(domain.id)}",
            "requires_admin": True,
        }

    return {
        "identity": {
            "domain_name": domain.domain_name,
            "display_name": domain.display_name,
            "domain_type": domain.domain_type,
            "template_key": template["template_key"],
            "public_profile_present": public_profile_present,
            "public_profile": domain.public_profile if can_admin else None,
        },
        "status": {
            "domain_status": domain_status,
            "verification_status": verification_status,
            "marketplace_role": marketplace_role,
            "public_url_status": "open_product_decision",
            "public_url": None,
            "social_community_bridge_status": (
                "linked" if has_social_bridge else "not_created_in_this_slice"
            ),
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Network presence is read-only guidance in this MVP slice. This "
            "endpoint does not publish a public page, finalize whether public "
            "Community Domain URLs use /domains/:name or /community-domains/:name, "
            "create outward links, verify the domain, create marketplace exposure, "
            "create Spotlight placement, create vault links, create a social "
            "Community bridge, activate billing, activate the Community Domain, "
            "or expose private member activity."
        ),
    }


def _community_domain_role_projection_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    domain_counts: dict[str, int] = {}
    for membership in (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.status == "active")
        .all()
    ):
        role_key = _clean_role(membership.role, "member")
        domain_counts[role_key] = domain_counts.get(role_key, 0) + 1

    node_counts: dict[str, int] = {}
    for membership in (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.status == "active")
        .all()
    ):
        role_key = _clean_role(membership.role, "member")
        node_counts[role_key] = node_counts.get(role_key, 0) + 1

    preset_keys = {preset["role_key"] for preset in COMMUNITY_DOMAIN_ROLE_PRESETS}
    observed_keys = sorted((set(domain_counts) | set(node_counts)) - preset_keys)
    role_boundary = (
        "Read-only role projection. This does not create roles, assign roles, "
        "grant permissions, change membership, activate billing, verify authority, "
        "or create a role table."
    )

    def item_for_preset(preset: dict[str, Any], *, source: str) -> dict[str, Any]:
        role_key = str(preset["role_key"])
        domain_total = int(domain_counts.get(role_key, 0))
        node_total = int(node_counts.get(role_key, 0))
        return {
            "role_key": role_key,
            "label": preset["label"],
            "scope": preset["scope"],
            "summary": preset["summary"],
            "source": source,
            "admin_role": bool(preset["admin_role"]),
            "assignable": bool(preset["assignable"]),
            "active_domain_members": domain_total,
            "active_node_memberships": node_total,
            "total_active_assignments": domain_total + node_total,
            "editable": False,
            "admin_visible": bool(can_admin),
            "boundary": role_boundary,
        }

    items = [
        item_for_preset(preset, source="role_preset")
        for preset in COMMUNITY_DOMAIN_ROLE_PRESETS
    ]
    for role_key in observed_keys:
        admin_role = role_key in DOMAIN_ADMIN_ROLES or role_key in NODE_ADMIN_ROLES
        scope = "domain_or_node"
        if role_key in NODE_ADMIN_ROLES or role_key in NODE_LOCAL_ASSIGNABLE_ROLES:
            scope = "node"
        elif role_key in DOMAIN_ADMIN_ROLES:
            scope = "domain"
        items.append(
            item_for_preset(
                {
                    "role_key": role_key,
                    "label": role_key.replace("_", " ").title(),
                    "scope": scope,
                    "summary": "Observed active Community Domain role assignment.",
                    "admin_role": admin_role,
                    "assignable": False,
                },
                source="observed_assignment",
            )
        )

    return {
        "items": items,
        "total": len(items),
        "admin_role_total": sum(1 for item in items if item["admin_role"]),
        "member_role_total": sum(1 for item in items if not item["admin_role"]),
        "editable": False,
        "boundary": (
            "Roles are a read-only projection from current memberships and "
            "institutional presets in this MVP slice. This endpoint does not "
            "create roles, assign roles, grant permissions, change membership, "
            "activate billing, verify authority, or expose private member evidence."
        ),
    }


def _community_domain_governance_model_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .all()
    )

    policies_by_status: dict[str, int] = {}
    policies_by_scope: dict[str, int] = {}
    policies_by_review_mode: dict[str, int] = {}
    active_policy_count = 0
    node_scoped_policy_count = 0
    required_role_policy_count = 0
    multi_reviewer_policy_count = 0

    for policy in policies:
        status_key = _clean_role(policy.status, "active")
        scope_key = _clean_role(policy.scope_type, "domain")
        review_mode = _clean_role(policy.review_mode, "domain_admin_review")
        config = _json_load(policy.config_json)
        policies_by_status[status_key] = policies_by_status.get(status_key, 0) + 1
        policies_by_scope[scope_key] = policies_by_scope.get(scope_key, 0) + 1
        policies_by_review_mode[review_mode] = (
            policies_by_review_mode.get(review_mode, 0) + 1
        )
        if status_key == "active":
            active_policy_count += 1
        if policy.community_node_id is not None:
            node_scoped_policy_count += 1
        if _clean_str(policy.required_role):
            required_role_policy_count += 1
        try:
            min_reviewers = int(config.get("min_reviewers") or 1)
        except (TypeError, ValueError):
            min_reviewers = 1
        if min_reviewers > 1:
            multi_reviewer_policy_count += 1

    reviews_by_status: dict[str, int] = {}
    reviews_by_action: dict[str, int] = {}
    open_statuses = {"pending", "pending_review", "needs_changes", "approved"}
    open_review_count = 0
    applied_review_count = 0
    for review in reviews:
        status_key = _clean_role(review.status, "pending")
        action_key = _clean_role(review.action_key, "unknown")
        reviews_by_status[status_key] = reviews_by_status.get(status_key, 0) + 1
        reviews_by_action[action_key] = reviews_by_action.get(action_key, 0) + 1
        if status_key in open_statuses:
            open_review_count += 1
        if status_key == "applied":
            applied_review_count += 1

    pattern_counts = {
        "domain_admin_review": policies_by_review_mode.get("domain_admin_review", 0),
        "node_admin_review": policies_by_review_mode.get("node_admin_review", 0),
        "required_role_review": required_role_policy_count,
        "multi_reviewer_review": multi_reviewer_policy_count,
        "action_review_record": len(reviews),
    }
    pattern_boundary = (
        "Read-only governance projection. This does not create policy, create "
        "action reviews, decide reviews, apply reviews, grant authority, verify "
        "ownership, move money, or activate billing."
    )
    patterns = [
        {
            **preset,
            "configured": pattern_counts[preset["model_key"]] > 0,
            "count": int(pattern_counts[preset["model_key"]]),
            "editable": False,
            "admin_visible": bool(can_admin),
            "boundary": pattern_boundary,
        }
        for preset in COMMUNITY_DOMAIN_GOVERNANCE_MODEL_PRESETS
    ]

    return {
        "items": patterns,
        "total": len(patterns),
        "configured_total": sum(1 for item in patterns if item["configured"]),
        "policy_counts": {
            "total": len(policies),
            "active": int(active_policy_count),
            "node_scoped": int(node_scoped_policy_count),
            "domain_scoped": int(len(policies) - node_scoped_policy_count),
            "required_role": int(required_role_policy_count),
            "multi_reviewer": int(multi_reviewer_policy_count),
            "by_status": policies_by_status,
            "by_scope": policies_by_scope,
            "by_review_mode": policies_by_review_mode,
        },
        "review_counts": {
            "total": len(reviews),
            "open": int(open_review_count),
            "applied": int(applied_review_count),
            "by_status": reviews_by_status,
            "by_action": reviews_by_action,
        },
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Governance model is a read-only summary of existing policies and "
            "action-review records in this MVP slice. This endpoint does not "
            "create policy, create action reviews, decide reviews, apply reviews, "
            "grant authority, verify ownership, move money, activate billing, or "
            "expose private review payloads."
        ),
    }


def _community_domain_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .count()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(
            CommunityDomainActionReview.status.in_(REVIEWER_QUEUE_PENDING_STATUSES)
        )
        .count()
    )

    status = _clean_role(domain.status, "draft")
    verification_status = _clean_role(domain.verification_status, "unverified")

    def lane(
        lane_key: str,
        label: str,
        state: str,
        count: int,
        next_step: str,
        *,
        ready: bool,
        route_hint: Optional[str] = None,
        requires_admin: bool = False,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "state": state,
            "ready": bool(ready),
            "count": int(count),
            "next_step": next_step,
            "route_hint": route_hint if can_admin or not requires_admin else None,
            "requires_admin": bool(requires_admin),
            "admin_visible": bool(can_admin),
            "boundary": (
                "Read-only readiness item. This does not create records, activate "
                "billing, verify authority, grant permissions, or expose private evidence."
            ),
        }

    lanes = [
        lane(
            "identity",
            "Community Domain identity",
            "ready",
            1,
            "Keep the domain identity accurate before public launch.",
            ready=True,
            route_hint=f"/community-domains/{int(domain.id)}",
        ),
        lane(
            "structure",
            "Structure",
            "ready" if node_count > 1 else "starter_root_only",
            int(node_count),
            (
                "Add branches, departments, lines, chapters, or units."
                if node_count <= 1
                else "Review the current institutional structure."
            ),
            ready=node_count > 1,
            route_hint=f"/community-domains/{int(domain.id)}/nodes/tree",
            requires_admin=node_count <= 1,
        ),
        lane(
            "members",
            "Members",
            "ready" if active_member_count > 1 else "owner_only",
            int(active_member_count),
            (
                "Add the first trusted admins or members."
                if active_member_count <= 1
                else "Review active domain membership."
            ),
            ready=active_member_count > 1,
            route_hint=f"/community-domains/{int(domain.id)}/members",
            requires_admin=True,
        ),
        lane(
            "roles",
            "Roles",
            "ready" if active_node_member_count > 0 else "domain_roles_only",
            int(active_node_member_count),
            (
                "Place members into branches, departments, lines, or committees."
                if active_node_member_count == 0
                else "Review central and local role coverage."
            ),
            ready=active_node_member_count > 0,
            route_hint=f"/community-domains/{int(domain.id)}/roles",
            requires_admin=active_node_member_count == 0,
        ),
        lane(
            "governance",
            "Governance",
            "ready" if active_policy_count > 0 else "policy_needed",
            int(active_policy_count),
            (
                "Add at least one policy for important institutional decisions."
                if active_policy_count == 0
                else "Review policy and decision model coverage."
            ),
            ready=active_policy_count > 0,
            route_hint=f"/community-domains/{int(domain.id)}/governance-model",
            requires_admin=active_policy_count == 0,
        ),
        lane(
            "modules",
            "Service modules",
            "template_ready",
            len(template["default_modules"]),
            "Review which modules are included by the selected template.",
            ready=len(template["default_modules"]) > 0,
            route_hint=f"/community-domains/{int(domain.id)}/service-settings",
        ),
        lane(
            "billing",
            "Billing",
            "active" if status == "active" else "quote_required",
            0,
            (
                "Review a manual pilot quote before payment instruction."
                if status != "active"
                else "Billing has already been marked active for this domain."
            ),
            ready=status == "active",
            route_hint=f"/community-domains/{int(domain.id)}/package-quote",
            requires_admin=True,
        ),
        lane(
            "verification",
            "Verification",
            verification_status,
            1 if verification_status == "verified" else 0,
            (
                "Verify legal authority before presenting this as a verified domain."
                if verification_status != "verified"
                else "Keep authority evidence current."
            ),
            ready=verification_status == "verified",
            route_hint=f"/community-domains/{int(domain.id)}/verification",
            requires_admin=True,
        ),
    ]

    ready_total = sum(1 for item in lanes if item["ready"])
    blocked_lanes = [item["lane_key"] for item in lanes if not item["ready"]]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin",
            "label": "Ask a Community Domain admin to continue setup",
            "route_hint": None,
            "requires_admin": True,
        }
    elif status != "active":
        primary_next_action = {
            "action_key": "package_quote",
            "label": "Review Community Domain package quote",
            "route_hint": f"/community-domains/{int(domain.id)}/package-quote",
            "requires_admin": True,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "verify_authority",
            "label": "Verify Community Domain authority",
            "route_hint": f"/community-domains/{int(domain.id)}/verification",
            "requires_admin": True,
        }
    elif open_review_count > 0:
        primary_next_action = {
            "action_key": "review_governance_queue",
            "label": "Review pending Community Domain decisions",
            "route_hint": f"/community-domains/{int(domain.id)}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_dashboard",
            "label": "Review Community Domain dashboard",
            "route_hint": f"/community-domains/{int(domain.id)}/dashboard",
            "requires_admin": False,
        }

    return {
        "items": lanes,
        "total": len(lanes),
        "ready_total": int(ready_total),
        "blocked_total": int(len(lanes) - ready_total),
        "blocked_lanes": blocked_lanes,
        "status": {
            "domain_status": status,
            "verification_status": verification_status,
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
        },
        "counts": {
            "nodes": int(node_count),
            "active_members": int(active_member_count),
            "active_node_memberships": int(active_node_member_count),
            "active_policies": int(active_policy_count),
            "open_reviews": int(open_review_count),
            "default_modules": len(template["default_modules"]),
        },
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Readiness is a read-only package setup checklist in this MVP slice. "
            "This endpoint does not create nodes, add members, assign roles, create "
            "policy, decide reviews, create a payment instruction, activate billing, "
            "activate the Community Domain, verify authority, or expose private evidence."
        ),
    }


def _community_domain_verification_requirements_payload(
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    domain_type = _clean_role(template["domain_type"], "generic_association")
    verification_status = _clean_role(domain.verification_status, "unverified")
    is_verified = verification_status == "verified"

    items = []
    for preset in COMMUNITY_DOMAIN_VERIFICATION_REQUIREMENT_PRESETS:
        applies_to = _clean_role(preset["applies_to"], "all")
        if applies_to not in {"all", domain_type, _clean_role(domain.domain_type)}:
            continue
        status = "verified_status_recorded" if is_verified else "required"
        items.append(
            {
                "requirement_key": preset["requirement_key"],
                "label": preset["label"],
                "summary": preset["summary"],
                "applies_to": applies_to,
                "required": bool(preset["required"]),
                "status": status,
                "evidence_status": "not_tracked_in_this_slice",
                "route_hint": (
                    f"/community-domains/{int(domain.id)}/verification"
                    if can_admin
                    else None
                ),
                "admin_visible": bool(can_admin),
                "boundary": (
                    "Read-only verification requirement. This does not upload, "
                    "store, accept, reject, verify, or expose evidence."
                ),
            }
        )

    if can_admin and not is_verified:
        primary_next_action = {
            "action_key": "collect_authority_evidence",
            "label": "Prepare Community Domain authority evidence",
            "route_hint": f"/community-domains/{int(domain.id)}/verification",
            "requires_admin": True,
        }
    elif not can_admin and not is_verified:
        primary_next_action = {
            "action_key": "ask_domain_admin",
            "label": "Ask a Community Domain admin to prepare authority evidence",
            "route_hint": None,
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "keep_authority_current",
            "label": "Keep Community Domain authority evidence current",
            "route_hint": (
                f"/community-domains/{int(domain.id)}/verification"
                if can_admin
                else None
            ),
            "requires_admin": True,
        }

    return {
        "items": items,
        "total": len(items),
        "required_total": sum(1 for item in items if item["required"]),
        "optional_total": sum(1 for item in items if not item["required"]),
        "submitted_total": 0,
        "accepted_total": 0,
        "status": {
            "verification_status": verification_status,
            "verified": bool(is_verified),
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
        },
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Verification requirements are read-only guidance in this MVP slice. "
            "This endpoint does not upload evidence, store evidence, accept evidence, "
            "reject evidence, verify authority, activate billing, activate the "
            "Community Domain, create a public claim, or expose private evidence."
        ),
    }


def _community_domain_activation_requirements_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    can_admin: bool,
) -> dict[str, Any]:
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    domain_status = _clean_role(domain.status, "draft")
    verification_status = _clean_role(domain.verification_status, "unverified")
    node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .count()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )

    ready_by_key = {
        "package_quote": domain_status == "active",
        "pricing_confirmation": domain_status == "active",
        "payment_instruction": domain_status == "active",
        "billing_activation": domain_status == "active",
        "authority_verification": verification_status == "verified",
        "structure_ready": node_count > 1,
        "member_base_ready": active_member_count > 1,
        "governance_ready": active_policy_count > 0,
    }
    status_by_key = {
        "package_quote": (
            "accepted_for_active_domain"
            if domain_status == "active"
            else "manual_quote_required"
        ),
        "pricing_confirmation": (
            "confirmed_for_active_domain"
            if domain_status == "active"
            else "pilot_quote_required"
        ),
        "payment_instruction": (
            "outside_this_slice" if domain_status == "active" else "not_created"
        ),
        "billing_activation": "active" if domain_status == "active" else "inactive",
        "authority_verification": (
            "verified" if verification_status == "verified" else verification_status
        ),
        "structure_ready": "ready" if node_count > 1 else "root_only",
        "member_base_ready": "ready" if active_member_count > 1 else "owner_only",
        "governance_ready": "ready" if active_policy_count > 0 else "policy_needed",
    }

    def route_hint_for(requirement: dict[str, Any]) -> Optional[str]:
        if requirement["requires_admin"] and not can_admin:
            return None
        return f"/community-domains/{int(domain.id)}{requirement['route_suffix']}"

    items = []
    for preset in COMMUNITY_DOMAIN_ACTIVATION_REQUIREMENT_PRESETS:
        requirement_key = preset["requirement_key"]
        items.append(
            {
                "requirement_key": requirement_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "status": status_by_key[requirement_key],
                "ready": bool(ready_by_key[requirement_key]),
                "route_hint": route_hint_for(preset),
                "requires_admin": bool(preset["requires_admin"]),
                "admin_visible": bool(can_admin),
                "boundary": (
                    "Read-only activation requirement. This does not create a "
                    "payment instruction, record payment, activate billing, "
                    "activate the Community Domain, verify authority, change "
                    "members, create policy, or expose private evidence."
                ),
            }
        )

    blocked_requirements = [
        item["requirement_key"] for item in items if not item["ready"]
    ]
    ready_total = sum(1 for item in items if item["ready"])

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin",
            "label": "Ask a Community Domain admin to complete activation preparation",
            "route_hint": None,
            "requires_admin": True,
        }
    elif domain_status != "active":
        primary_next_action = {
            "action_key": "package_quote",
            "label": "Review Community Domain package quote",
            "route_hint": f"/community-domains/{int(domain.id)}/package-quote",
            "requires_admin": True,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "verify_authority",
            "label": "Verify Community Domain authority",
            "route_hint": f"/community-domains/{int(domain.id)}/verification",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_dashboard",
            "label": "Review Community Domain dashboard",
            "route_hint": f"/community-domains/{int(domain.id)}/dashboard",
            "requires_admin": False,
        }

    return {
        "items": items,
        "total": len(items),
        "ready_total": int(ready_total),
        "blocked_total": int(len(items) - ready_total),
        "blocked_requirements": blocked_requirements,
        "status": {
            "domain_status": domain_status,
            "verification_status": verification_status,
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
        },
        "counts": {
            "nodes": int(node_count),
            "active_members": int(active_member_count),
            "active_policies": int(active_policy_count),
        },
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Activation requirements are read-only launch guidance in this MVP "
            "slice. This endpoint does not create a payment instruction, record "
            "payment, create an invoice, activate billing, activate the Community "
            "Domain, verify authority, change members, create policy, or expose "
            "private evidence."
        ),
    }


def _community_domain_node_tree_payload(
    nodes: list[CommunityNode],
) -> list[dict[str, Any]]:
    node_payloads = {int(node.id): _node_payload(node) for node in nodes}
    children_by_parent: dict[Optional[int], list[dict[str, Any]]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(
            node_payloads[int(node.id)]
        )

    def attach_children(item: dict[str, Any]) -> dict[str, Any]:
        node_id = int(item["id"])
        children = children_by_parent.get(node_id, [])
        return {
            **item,
            "children": [attach_children(child) for child in children],
            "child_count": len(children),
        }

    roots = children_by_parent.get(None, [])
    if not roots:
        referenced_children = {
            int(child["id"])
            for child_group in children_by_parent.values()
            for child in child_group
        }
        roots = [
            payload
            for node_id, payload in node_payloads.items()
            if node_id in referenced_children
            and payload.get("parent_node_id") not in node_payloads
        ]

    return [attach_children(root) for root in roots]


def _community_domain_node_operating_summary_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    can_admin: bool,
) -> dict[str, Any]:
    node_scope_ids = _descendant_node_ids(
        db,
        domain=domain,
        node=node,
        include_descendants=True,
    )
    impact_summary = _node_lifecycle_impact_summary(db, domain=domain, node=node)
    direct_child_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .filter(CommunityNode.parent_node_id == int(node.id))
        .count()
    )
    direct_active_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id == int(node.id))
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_domain_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.community_node_id.is_(None))
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    active_node_policy_count = int(impact_summary["active_policy_count"])

    role_counts: dict[str, int] = {}
    admin_assignment_count = 0
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id.in_(node_scope_ids))
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    for membership in active_node_memberships:
        role_key = _clean_role(membership.role, "member")
        role_counts[role_key] = role_counts.get(role_key, 0) + 1
        if role_key in NODE_ADMIN_ROLES:
            admin_assignment_count += 1

    open_reviews_by_action: dict[str, int] = {}
    open_review_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .all()
    )
    for review in open_review_rows:
        action_key = _clean_role(review.action_key, "unknown")
        open_reviews_by_action[action_key] = open_reviews_by_action.get(action_key, 0) + 1

    def lane(
        lane_key: str,
        label: str,
        state: str,
        count: int,
        next_step: str,
        *,
        ready: bool,
        route_suffix: str,
        requires_admin: bool,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "state": state,
            "ready": bool(ready),
            "count": int(count),
            "next_step": next_step,
            "route_hint": (
                f"/community-domains/{int(domain.id)}{route_suffix}"
                if can_admin or not requires_admin
                else None
            ),
            "requires_admin": bool(requires_admin),
            "admin_visible": bool(can_admin),
            "boundary": (
                "Read-only node operating item. This does not create child "
                "nodes, add members, assign roles, create policy, decide "
                "reviews, activate billing, verify a branch, or expose private "
                "review payloads."
            ),
        }

    lanes = [
        lane(
            "structure",
            "Local structure",
            "has_child_units" if direct_child_count > 0 else "single_unit",
            int(direct_child_count),
            (
                "Review child branches, departments, lines, or committees."
                if direct_child_count > 0
                else "Add child units only if this operating unit needs them."
            ),
            ready=True,
            route_suffix="/nodes/tree",
            requires_admin=False,
        ),
        lane(
            "local_members",
            "Local members",
            "ready" if direct_active_member_count > 0 else "no_local_members",
            int(direct_active_member_count),
            (
                "Review local member placement."
                if direct_active_member_count > 0
                else "Place active domain members into this unit."
            ),
            ready=direct_active_member_count > 0,
            route_suffix=f"/nodes/{int(node.id)}/members",
            requires_admin=True,
        ),
        lane(
            "local_admins",
            "Local admins",
            "ready" if admin_assignment_count > 0 else "admin_needed",
            int(admin_assignment_count),
            (
                "Review local admin coverage."
                if admin_assignment_count > 0
                else "Assign at least one trusted local admin when this unit needs autonomy."
            ),
            ready=admin_assignment_count > 0,
            route_suffix=f"/nodes/{int(node.id)}/members",
            requires_admin=True,
        ),
        lane(
            "local_governance",
            "Local governance",
            "ready" if active_node_policy_count > 0 else "domain_policy_only",
            int(active_node_policy_count),
            (
                "Review local policy coverage."
                if active_node_policy_count > 0
                else "Use domain policy or add local policy if this unit needs its own approvals."
            ),
            ready=active_node_policy_count > 0 or active_domain_policy_count > 0,
            route_suffix=f"/policies?community_node_id={int(node.id)}",
            requires_admin=True,
        ),
        lane(
            "open_reviews",
            "Open reviews",
            "open" if impact_summary["open_action_review_count"] > 0 else "clear",
            int(impact_summary["open_action_review_count"]),
            (
                "Review pending local decisions."
                if impact_summary["open_action_review_count"] > 0
                else "No open local governance reviews."
            ),
            ready=impact_summary["open_action_review_count"] == 0,
            route_suffix=(
                f"/action-reviews/reviewer-queue?community_node_id={int(node.id)}"
            ),
            requires_admin=True,
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_node_or_domain_admin",
            "label": "Ask a Community Domain admin to manage this operating unit",
            "route_hint": None,
            "requires_admin": True,
        }
    elif impact_summary["open_action_review_count"] > 0:
        primary_next_action = {
            "action_key": "review_local_queue",
            "label": "Review local governance queue",
            "route_hint": (
                f"/community-domains/{int(domain.id)}/action-reviews/reviewer-queue"
                f"?community_node_id={int(node.id)}"
            ),
            "requires_admin": True,
        }
    elif direct_active_member_count == 0:
        primary_next_action = {
            "action_key": "place_local_members",
            "label": "Place members into this operating unit",
            "route_hint": f"/community-domains/{int(domain.id)}/nodes/{int(node.id)}/members",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_node_members",
            "label": "Review local operating membership",
            "route_hint": f"/community-domains/{int(domain.id)}/nodes/{int(node.id)}/members",
            "requires_admin": True,
        }

    return {
        "node": _node_payload(node),
        "scope": {
            "node_scope_ids": node_scope_ids,
            "includes_descendants": True,
            "descendant_node_count": int(impact_summary["descendant_node_count"]),
        },
        "counts": {
            "direct_child_nodes": int(direct_child_count),
            "subtree_nodes": len(node_scope_ids),
            "direct_active_node_members": int(direct_active_member_count),
            "subtree_active_node_members": int(
                impact_summary["active_node_member_count"]
            ),
            "admin_assignments": int(admin_assignment_count),
            "active_node_policies": int(active_node_policy_count),
            "active_domain_policies": int(active_domain_policy_count),
            "open_action_reviews": int(impact_summary["open_action_review_count"]),
        },
        "role_counts": {
            "by_role": role_counts,
            "admin_assignments": int(admin_assignment_count),
        },
        "review_counts": {
            "open_by_status": impact_summary["open_action_reviews_by_status"],
            "open_by_action": open_reviews_by_action,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin)},
        "editable": False,
        "boundary": (
            "Node operating summary is a read-only projection for one branch, "
            "department, line, chapter, class, committee, or unit. This endpoint "
            "does not create child nodes, add members, assign roles, create "
            "policy, decide reviews, activate billing, verify a branch, create a "
            "separate Community Domain, or expose private review payloads."
        ),
    }


def _community_domain_member_placement_summary_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    membership: CommunityDomainMembership,
    can_admin: bool,
    self_view: bool,
) -> dict[str, Any]:
    user_id = int(membership.user_id)
    node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.user_id == user_id)
        .order_by(
            CommunityNodeMembership.status.asc(),
            CommunityNodeMembership.role.asc(),
            CommunityNodeMembership.id.asc(),
        )
        .all()
    )
    active_node_memberships = [
        item
        for item in node_memberships
        if _clean_role(item.status, "inactive") == "active"
    ]
    role_counts: dict[str, int] = {}
    admin_assignment_count = 0
    for item in active_node_memberships:
        role_key = _clean_role(item.role, "member")
        role_counts[role_key] = role_counts.get(role_key, 0) + 1
        if role_key in NODE_ADMIN_ROLES:
            admin_assignment_count += 1

    open_reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(
            (
                CommunityDomainActionReview.subject_user_id == user_id
            )
            | (
                (
                    CommunityDomainActionReview.target_type.in_(
                        ["domain_member", "member", "node_member"]
                    )
                )
                & (CommunityDomainActionReview.target_id == str(user_id))
            )
        )
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .all()
    )
    reviews_by_status: dict[str, int] = {}
    reviews_by_action: dict[str, int] = {}
    for review in open_reviews:
        status_key = _clean_role(review.status, "unknown")
        action_key = _clean_role(review.action_key, "unknown")
        reviews_by_status[status_key] = reviews_by_status.get(status_key, 0) + 1
        reviews_by_action[action_key] = reviews_by_action.get(action_key, 0) + 1

    def lane(
        lane_key: str,
        label: str,
        state: str,
        count: int,
        next_step: str,
        *,
        ready: bool,
        route_suffix: str,
        requires_admin: bool,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "state": state,
            "ready": bool(ready),
            "count": int(count),
            "next_step": next_step,
            "route_hint": (
                f"/community-domains/{int(domain.id)}{route_suffix}"
                if can_admin or not requires_admin
                else None
            ),
            "requires_admin": bool(requires_admin),
            "admin_visible": bool(can_admin),
            "boundary": (
                "Read-only member placement item. This does not add the member, "
                "place the member in a node, assign roles, grant permissions, "
                "decide reviews, verify authority, activate billing, or expose "
                "private review payloads."
            ),
        }

    domain_role = _clean_role(membership.role, "member")
    domain_active = _clean_role(membership.status, "inactive") == "active"
    lanes = [
        lane(
            "domain_membership",
            "Domain membership",
            "active" if domain_active else _clean_role(membership.status, "inactive"),
            1 if domain_active else 0,
            (
                "Review this member's domain role."
                if domain_active
                else "Restore active domain membership before node placement matters."
            ),
            ready=domain_active,
            route_suffix="/members",
            requires_admin=True,
        ),
        lane(
            "node_placements",
            "Node placements",
            "placed" if active_node_memberships else "not_placed",
            len(active_node_memberships),
            (
                "Review where this member belongs inside the institution."
                if active_node_memberships
                else "Place this member into a branch, line, department, class, or committee."
            ),
            ready=bool(active_node_memberships),
            route_suffix="/nodes/tree",
            requires_admin=True,
        ),
        lane(
            "admin_assignments",
            "Admin assignments",
            "has_local_admin_role" if admin_assignment_count else "member_only",
            int(admin_assignment_count),
            (
                "Review local admin responsibility."
                if admin_assignment_count
                else "No local admin responsibility is recorded for this member."
            ),
            ready=True,
            route_suffix="/roles",
            requires_admin=True,
        ),
        lane(
            "open_reviews",
            "Open reviews",
            "open" if open_reviews else "clear",
            len(open_reviews),
            (
                "Review pending decisions involving this member."
                if open_reviews
                else "No open placement or membership reviews for this member."
            ),
            ready=not open_reviews,
            route_suffix="/action-reviews/reviewer-queue",
            requires_admin=True,
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "review_own_placement",
            "label": "Review your Community Domain placement",
            "route_hint": None,
            "requires_admin": False,
        }
    elif open_reviews:
        primary_next_action = {
            "action_key": "review_member_queue",
            "label": "Review pending decisions involving this member",
            "route_hint": f"/community-domains/{int(domain.id)}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    elif not active_node_memberships:
        primary_next_action = {
            "action_key": "place_member",
            "label": "Place member into an operating unit",
            "route_hint": f"/community-domains/{int(domain.id)}/nodes/tree",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_member_roles",
            "label": "Review member roles and placements",
            "route_hint": f"/community-domains/{int(domain.id)}/roles",
            "requires_admin": True,
        }

    return {
        "member": _domain_member_payload(membership),
        "domain_role": domain_role,
        "domain_status": _clean_role(membership.status, "inactive"),
        "node_placements": [_node_member_payload(item) for item in node_memberships],
        "counts": {
            "node_placements": len(node_memberships),
            "active_node_placements": len(active_node_memberships),
            "admin_assignments": int(admin_assignment_count),
            "open_reviews": len(open_reviews),
        },
        "role_counts": {
            "by_role": role_counts,
            "admin_assignments": int(admin_assignment_count),
        },
        "review_counts": {
            "open_by_status": reviews_by_status,
            "open_by_action": reviews_by_action,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "viewer": {"can_admin": bool(can_admin), "self": bool(self_view)},
        "editable": False,
        "boundary": (
            "Member placement summary is a read-only projection of one person's "
            "role and node placement inside this Community Domain. This endpoint "
            "does not add the member, place the member in a node, assign roles, "
            "grant permissions, decide reviews, verify authority, activate "
            "billing, expose other domains, or expose private review payloads."
        ),
    }


def _community_domain_dashboard_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=int(domain.id))
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .count()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(
            CommunityDomainActionReview.status.in_(REVIEWER_QUEUE_PENDING_STATUSES)
        )
        .count()
    )

    status = _clean_role(domain.status, "draft")
    billing_status = "active" if status == "active" else "quote_required"
    if can_admin and status == "draft":
        primary_next_action = {
            "action_key": "package_quote",
            "label": "Review Community Domain package quote",
            "route_hint": f"/community-domains/{int(domain.id)}/package-quote",
            "requires_admin": True,
        }
    elif can_admin and open_review_count > 0:
        primary_next_action = {
            "action_key": "review_governance_queue",
            "label": "Review pending Community Domain decisions",
            "route_hint": f"/community-domains/{int(domain.id)}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "view_structure",
            "label": "View Community Domain structure",
            "route_hint": f"/community-domains/{int(domain.id)}/nodes",
            "requires_admin": False,
        }

    lanes = [
        {
            "lane_key": "identity",
            "label": "Identity",
            "status": status,
            "count": 1,
        },
        {
            "lane_key": "structure",
            "label": "Structure",
            "status": "ready" if node_count > 0 else "empty",
            "count": int(node_count),
        },
        {
            "lane_key": "members",
            "label": "Members",
            "status": "ready" if active_member_count > 0 else "empty",
            "count": int(active_member_count),
        },
        {
            "lane_key": "governance",
            "label": "Governance",
            "status": "attention" if open_review_count > 0 else "quiet",
            "count": int(open_review_count),
        },
        {
            "lane_key": "modules",
            "label": "Modules",
            "status": "preset",
            "count": len(template["default_modules"]),
        },
        {
            "lane_key": "billing",
            "label": "Billing",
            "status": billing_status,
            "count": 1 if billing_status == "active" else 0,
        },
    ]

    dashboard = {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "default_modules": list(template["default_modules"]),
            "marketplace_role": template["marketplace_role"],
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "status": {
            "domain_status": status,
            "verification_status": _clean_role(
                domain.verification_status, "unverified"
            ),
            "billing_status": billing_status,
            "activation_status": "not_active" if status == "draft" else status,
        },
        "counts": {
            "nodes": int(node_count),
            "active_members": int(active_member_count),
            "active_node_memberships": int(node_member_count),
            "active_policies": int(active_policy_count),
            "open_reviews": int(open_review_count),
        },
        "primary_next_action": primary_next_action,
        "lanes": lanes,
        "boundary": (
            "Dashboard summary only. This does not create a payment instruction, "
            "activate billing, activate the Community Domain, verify ownership, "
            "expose private finance records, or expose private member evidence."
        ),
    }
    if can_admin:
        dashboard["package_quote"] = _community_domain_package_quote_payload(domain)
    return dashboard


def _community_domain_operating_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=int(domain.id))
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    domain_id = int(domain.id)
    domain_status = _clean_role(domain.status, "draft")
    verification_status = _clean_role(domain.verification_status, "unverified")
    marketplace_role = _clean_role(template["marketplace_role"], "optional")
    public_profile_present = bool(_clean_str(domain.public_profile))
    has_social_bridge = domain.clan_id is not None

    node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .count()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            CommunityDomainActionReview.status.in_(REVIEWER_QUEUE_PENDING_STATUSES)
        )
        .count()
    )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def lane(
        lane_key: str,
        label: str,
        status: str,
        count: int,
        next_step: str,
        *,
        ready: bool,
        route_suffix: str,
        requires_admin: bool = False,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": int(count),
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "admin_visible": bool(can_admin),
            "next_step": next_step,
            "boundary": (
                "Read-only operating map lane. This does not create records, "
                "change members, assign roles, create policy, decide reviews, "
                "create payment instructions, activate billing, verify authority, "
                "publish public presence, create marketplace activity, or expose "
                "private member evidence."
            ),
        }

    lanes = [
        lane(
            "identity",
            "Community Domain identity",
            "ready",
            1,
            "Keep the institutional identity, template, and root record accurate.",
            ready=True,
            route_suffix="",
        ),
        lane(
            "structure",
            "Institutional structure",
            "ready" if node_count > 1 else "root_only",
            int(node_count),
            (
                "Review branches, departments, lines, chapters, classes, or units."
                if node_count > 1
                else "Add the first operating units when the institution needs them."
            ),
            ready=node_count > 1,
            route_suffix="/nodes/tree",
        ),
        lane(
            "members",
            "Members",
            "ready" if active_member_count > 1 else "owner_only",
            int(active_member_count),
            (
                "Review active Community Domain membership."
                if active_member_count > 1
                else "Add the first trusted admins or members."
            ),
            ready=active_member_count > 1,
            route_suffix="/members",
            requires_admin=True,
        ),
        lane(
            "roles",
            "Roles and placement",
            "ready" if active_node_member_count > 0 else "domain_roles_only",
            int(active_node_member_count),
            (
                "Review domain roles and local placement coverage."
                if active_node_member_count > 0
                else "Place members into the units where they actually operate."
            ),
            ready=active_node_member_count > 0,
            route_suffix="/roles",
        ),
        lane(
            "governance",
            "Governance",
            "ready" if active_policy_count > 0 else "policy_needed",
            int(active_policy_count),
            (
                "Review policy and decision coverage."
                if active_policy_count > 0
                else "Add governance policy for important institutional actions."
            ),
            ready=active_policy_count > 0,
            route_suffix="/governance-model",
        ),
        lane(
            "readiness",
            "Package readiness",
            "active" if domain_status == "active" else "setup_open",
            int(node_count + active_member_count + active_policy_count),
            "Review setup blockers before treating this as ready for pilot use.",
            ready=domain_status == "active",
            route_suffix="/readiness",
        ),
        lane(
            "verification",
            "Authority verification",
            verification_status,
            1 if verification_status == "verified" else 0,
            (
                "Keep authority evidence current."
                if verification_status == "verified"
                else "Prepare legal or institutional authority evidence."
            ),
            ready=verification_status == "verified",
            route_suffix="/verification-requirements",
            requires_admin=True,
        ),
        lane(
            "activation",
            "Activation requirements",
            "active" if domain_status == "active" else "not_active",
            1 if domain_status == "active" else 0,
            (
                "Review active-domain launch posture."
                if domain_status == "active"
                else "Review what is still blocked before activation."
            ),
            ready=domain_status == "active",
            route_suffix="/activation-requirements",
        ),
        lane(
            "service_settings",
            "Service settings",
            "template_ready",
            len(template["default_modules"]),
            "Review modules included by the selected institutional template.",
            ready=len(template["default_modules"]) > 0,
            route_suffix="/service-settings",
        ),
        lane(
            "economic_participation",
            "Economic participation",
            f"{marketplace_role}_template",
            1 if marketplace_role in {"core", "supported"} else 0,
            (
                "Review marketplace, shops, spotlight, demand, vault, and finance fit."
                if marketplace_role in {"core", "supported"}
                else "Keep economic participation optional unless the institution needs it."
            ),
            ready=marketplace_role in {"core", "supported"},
            route_suffix="/economic-participation",
        ),
        lane(
            "network_presence",
            "Network presence",
            "profile_ready" if public_profile_present else "profile_needed",
            1 if public_profile_present else 0,
            "Review public identity, URL decision, verification badge, and outside-facing exposure.",
            ready=public_profile_present,
            route_suffix="/network-presence",
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "view_structure",
            "label": "View Community Domain structure",
            "route_hint": route_hint("/nodes/tree"),
            "requires_admin": False,
        }
    elif domain_status != "active":
        primary_next_action = {
            "action_key": "review_activation_requirements",
            "label": "Review Community Domain activation requirements",
            "route_hint": route_hint("/activation-requirements"),
            "requires_admin": False,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "prepare_verification",
            "label": "Prepare Community Domain authority verification",
            "route_hint": route_hint("/verification-requirements", requires_admin=True),
            "requires_admin": True,
        }
    elif open_review_count > 0:
        primary_next_action = {
            "action_key": "review_governance_queue",
            "label": "Review pending Community Domain decisions",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue", requires_admin=True
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_dashboard",
            "label": "Review Community Domain dashboard",
            "route_hint": route_hint("/dashboard"),
            "requires_admin": False,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "default_modules": list(template["default_modules"]),
            "marketplace_role": marketplace_role,
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "status": {
            "domain_status": domain_status,
            "verification_status": verification_status,
            "activation_status": "active" if domain_status == "active" else "not_active",
            "billing_status": "active" if domain_status == "active" else "quote_required",
            "marketplace_role": marketplace_role,
            "public_profile_present": public_profile_present,
            "public_url_status": "open_product_decision",
            "public_url": None,
            "social_community_bridge_status": (
                "linked" if has_social_bridge else "not_created_in_this_slice"
            ),
        },
        "counts": {
            "nodes": int(node_count),
            "active_members": int(active_member_count),
            "active_node_memberships": int(active_node_member_count),
            "active_policies": int(active_policy_count),
            "open_reviews": int(open_review_count),
            "default_modules": len(template["default_modules"]),
            "shops": 0,
            "listings": 0,
            "demands": 0,
            "spotlights": 0,
            "finance_records": 0,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Operating map is a read-only Community Domain package map in this "
            "MVP slice. This endpoint does not create a payment instruction, "
            "record payment, activate billing, activate the Community Domain, "
            "verify authority, create nodes, add members, assign roles, create "
            "policy, decide reviews, publish a public page, finalize whether "
            "public URLs use /domains/:name or /community-domains/:name, create "
            "marketplace activity, create shops, create listings, create demand, "
            "place Spotlight, create vault links, create a social Community, move "
            "money, or expose private member evidence."
        ),
    }


def _community_domain_template_fit_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    domain_id = int(domain.id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    blueprint = _community_domain_template_operating_blueprint_payload(
        template=template
    )

    def count_values(values: list[str]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for value in values:
            key = _clean_role(value, "unknown")
            counts[key] = counts.get(key, 0) + 1
        return counts

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    active_domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )

    node_counts = count_values([str(node.node_kind) for node in nodes])
    role_counts = count_values(
        [str(row.role) for row in active_domain_memberships]
        + [str(row.role) for row in active_node_memberships]
    )
    policy_counts: dict[tuple[str, str], int] = {}
    for policy in active_policies:
        policy_key = (
            _clean_role(policy.action_key, "unknown"),
            _clean_role(policy.review_mode, "domain_admin_review"),
        )
        policy_counts[policy_key] = policy_counts.get(policy_key, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    node_fit = []
    for preset in blueprint["node_presets"]:
        node_kind = _clean_role(preset["node_kind"], "unknown")
        observed_count = node_counts.get(node_kind, 0)
        present = observed_count > 0
        node_fit.append(
            {
                **preset,
                "present": present,
                "observed_count": int(observed_count),
                "route_hint": route_hint("/nodes/tree"),
                "requires_admin": False,
                "next_step": (
                    "Review the matching operating unit already present."
                    if present
                    else "Add this operating unit when the institution really uses it."
                ),
                "boundary": (
                    "Read-only template fit item. This does not create a node, "
                    "rename a node, change hierarchy, assign members, or verify "
                    "institutional structure."
                ),
            }
        )

    role_fit = []
    for preset in blueprint["role_presets"]:
        role_key = _clean_role(preset["role_key"], "member")
        active_assignments = role_counts.get(role_key, 0)
        present = active_assignments > 0
        role_fit.append(
            {
                **preset,
                "present": present,
                "active_assignments": int(active_assignments),
                "route_hint": route_hint("/roles"),
                "requires_admin": False,
                "next_step": (
                    "Review current role coverage."
                    if present
                    else (
                        "Ask a domain admin to assign this role if the institution uses it."
                        if not can_admin
                        else "Assign this role only to people who already hold the real-world responsibility."
                    )
                ),
                "boundary": (
                    "Read-only template fit item. This does not create roles, "
                    "assign roles, grant permissions, add members, or verify "
                    "real-world authority."
                ),
            }
        )

    policy_fit = []
    for preset in blueprint["policy_presets"]:
        action_key = _clean_role(preset["action_key"], "unknown")
        review_mode = _clean_role(preset["review_mode"], "domain_admin_review")
        active_policy_count = policy_counts.get((action_key, review_mode), 0)
        present = active_policy_count > 0
        policy_fit.append(
            {
                **preset,
                "present": present,
                "active_policies": int(active_policy_count),
                "route_hint": route_hint("/policies"),
                "requires_admin": False,
                "admin_action_required": not present,
                "next_step": (
                    "Review the active policy already covering this action."
                    if present
                    else (
                        "Ask a domain admin to review this governance gap."
                        if not can_admin
                        else "Create or adjust policy only after the real governance rule is confirmed."
                    )
                ),
                "boundary": (
                    "Read-only template fit item. This does not create policy, "
                    "open reviews, decide reviews, apply actions, upload "
                    "evidence, or expose private review payloads."
                ),
            }
        )

    missing_nodes = [item["node_kind"] for item in node_fit if not item["present"]]
    missing_roles = [item["role_key"] for item in role_fit if not item["present"]]
    missing_policies = [
        item["action_key"] for item in policy_fit if not item["present"]
    ]
    matched_node_count = len(node_fit) - len(missing_nodes)
    matched_role_count = len(role_fit) - len(missing_roles)
    matched_policy_count = len(policy_fit) - len(missing_policies)

    if missing_nodes and can_admin:
        primary_next_action = {
            "action_key": "review_structure_fit",
            "label": "Review Community Domain structure fit",
            "route_hint": route_hint("/nodes/tree"),
            "requires_admin": False,
        }
    elif missing_roles and can_admin:
        primary_next_action = {
            "action_key": "review_role_fit",
            "label": "Review Community Domain role fit",
            "route_hint": route_hint("/roles"),
            "requires_admin": False,
        }
    elif missing_policies and can_admin:
        primary_next_action = {
            "action_key": "review_policy_fit",
            "label": "Review Community Domain policy fit",
            "route_hint": route_hint("/policies"),
            "requires_admin": False,
        }
    elif missing_nodes or missing_roles or missing_policies:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_template_fit",
            "label": "Ask a Community Domain admin to review template fit",
            "route_hint": None,
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_operating_map",
            "label": "Review Community Domain operating map",
            "route_hint": route_hint("/operating-map"),
            "requires_admin": False,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template["marketplace_role"], "optional"),
        },
        "blueprint_source": blueprint["blueprint_source"],
        "uses_generic_fallback": blueprint["uses_generic_fallback"],
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "counts": {
            "nodes": len(nodes),
            "matched_node_presets": int(matched_node_count),
            "missing_node_presets": len(missing_nodes),
            "active_members": len(active_domain_memberships),
            "active_node_memberships": len(active_node_memberships),
            "matched_role_presets": int(matched_role_count),
            "missing_role_presets": len(missing_roles),
            "active_policies": len(active_policies),
            "matched_policy_presets": int(matched_policy_count),
            "missing_policy_presets": len(missing_policies),
        },
        "node_fit": node_fit,
        "role_fit": role_fit,
        "policy_fit": policy_fit,
        "matched_total": int(
            matched_node_count + matched_role_count + matched_policy_count
        ),
        "missing_total": int(
            len(missing_nodes) + len(missing_roles) + len(missing_policies)
        ),
        "missing_sections": {
            "nodes": missing_nodes,
            "roles": missing_roles,
            "policies": missing_policies,
        },
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Template fit is a read-only comparison between this Community "
            "Domain's actual setup and its selected template blueprint. It does "
            "not create nodes, add members, assign roles, create policy, create "
            "action reviews, approve or apply reviews, activate billing, verify "
            "authority, create marketplace activity, create a social Community, "
            "move money, publish a public page, or expose private evidence."
        ),
    }


def _community_domain_setup_plan_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    template_fit = _community_domain_template_fit_payload(
        db,
        domain=domain,
        current_user=current_user,
    )
    domain_status = _clean_role(domain.status, "draft")
    verification_status = _clean_role(domain.verification_status, "unverified")
    root_node = _find_root_node(db, community_domain_id=domain_id)
    identity_ready = bool(
        root_node is not None
        and _clean_str(domain.domain_name)
        and _clean_str(domain.display_name)
    )
    missing_sections = template_fit["missing_sections"]

    def route_hint(suffix: str, *, admin_action: bool = False) -> Optional[str]:
        if admin_action and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def setup_step(
        step_key: str,
        label: str,
        completed: bool,
        next_step: str,
        *,
        route_suffix: str,
        admin_action: bool,
        missing_items: Optional[list[str]] = None,
        detail: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        return {
            "step_key": step_key,
            "label": label,
            "status": "complete" if completed else "open",
            "completed": bool(completed),
            "route_hint": route_hint(route_suffix),
            "admin_action_route_hint": route_hint(
                route_suffix, admin_action=admin_action
            ),
            "requires_admin": bool(admin_action),
            "admin_visible": bool(can_admin),
            "missing_items": missing_items or [],
            "next_step": next_step,
            "detail": detail or {},
            "boundary": (
                "Read-only setup plan step. This does not create nodes, add "
                "members, assign roles, create policy, open reviews, approve "
                "reviews, verify authority, activate billing, activate the "
                "Community Domain, create marketplace activity, create a social "
                "Community, move money, or expose private evidence."
            ),
        }

    steps = [
        setup_step(
            "identity",
            "Confirm Community Domain identity",
            identity_ready,
            "Keep the domain name, display name, and root identity accurate.",
            route_suffix="",
            admin_action=True,
            detail={
                "domain_name": domain.domain_name,
                "display_name": domain.display_name,
                "root_node_present": bool(root_node is not None),
            },
        ),
        setup_step(
            "structure",
            "Model real branches, departments, lines, or units",
            template_fit["counts"]["missing_node_presets"] == 0,
            (
                "Review the structure against the selected template."
                if can_admin
                else "Ask a Community Domain admin to review the real structure."
            ),
            route_suffix="/nodes/tree",
            admin_action=True,
            missing_items=list(missing_sections["nodes"]),
            detail={
                "matched": template_fit["counts"]["matched_node_presets"],
                "missing": template_fit["counts"]["missing_node_presets"],
            },
        ),
        setup_step(
            "roles",
            "Place responsible people into the right roles",
            template_fit["counts"]["missing_role_presets"] == 0,
            (
                "Review role coverage before relying on local administration."
                if can_admin
                else "Ask a Community Domain admin to review role coverage."
            ),
            route_suffix="/roles",
            admin_action=True,
            missing_items=list(missing_sections["roles"]),
            detail={
                "matched": template_fit["counts"]["matched_role_presets"],
                "missing": template_fit["counts"]["missing_role_presets"],
            },
        ),
        setup_step(
            "governance",
            "Confirm governance policies for important actions",
            template_fit["counts"]["missing_policy_presets"] == 0,
            (
                "Review policy coverage before relying on action approvals."
                if can_admin
                else "Ask a Community Domain admin to review governance coverage."
            ),
            route_suffix="/policies",
            admin_action=True,
            missing_items=list(missing_sections["policies"]),
            detail={
                "matched": template_fit["counts"]["matched_policy_presets"],
                "missing": template_fit["counts"]["missing_policy_presets"],
            },
        ),
        setup_step(
            "verification",
            "Prepare authority verification",
            verification_status == "verified",
            (
                "Prepare legal, representative, and structure authority evidence."
                if verification_status != "verified"
                else "Keep authority evidence current."
            ),
            route_suffix="/verification-requirements",
            admin_action=True,
            missing_items=[] if verification_status == "verified" else ["authority_evidence"],
            detail={"verification_status": verification_status},
        ),
        setup_step(
            "activation",
            "Review activation and package readiness",
            domain_status == "active",
            (
                "Review activation requirements before treating the domain as live."
                if domain_status != "active"
                else "Review the live Community Domain dashboard."
            ),
            route_suffix="/activation-requirements",
            admin_action=True,
            missing_items=[] if domain_status == "active" else ["activation"],
            detail={
                "domain_status": domain_status,
                "billing_status": (
                    "active" if domain_status == "active" else "quote_required"
                ),
            },
        ),
    ]

    if missing_sections["nodes"]:
        setup_phase = "structure"
    elif missing_sections["roles"]:
        setup_phase = "roles"
    elif missing_sections["policies"]:
        setup_phase = "governance"
    elif verification_status != "verified":
        setup_phase = "verification"
    elif domain_status != "active":
        setup_phase = "activation"
    else:
        setup_phase = "ready"

    if not can_admin and setup_phase != "ready":
        primary_next_action = {
            "action_key": "ask_domain_admin_to_continue_setup",
            "label": "Ask a Community Domain admin to continue setup",
            "route_hint": None,
            "requires_admin": True,
        }
    elif setup_phase == "structure":
        primary_next_action = {
            "action_key": "review_structure_fit",
            "label": "Review Community Domain structure fit",
            "route_hint": route_hint("/nodes/tree"),
            "requires_admin": True,
        }
    elif setup_phase == "roles":
        primary_next_action = {
            "action_key": "review_role_fit",
            "label": "Review Community Domain role fit",
            "route_hint": route_hint("/roles"),
            "requires_admin": True,
        }
    elif setup_phase == "governance":
        primary_next_action = {
            "action_key": "review_policy_fit",
            "label": "Review Community Domain policy fit",
            "route_hint": route_hint("/policies"),
            "requires_admin": True,
        }
    elif setup_phase == "verification":
        primary_next_action = {
            "action_key": "prepare_verification",
            "label": "Prepare Community Domain authority verification",
            "route_hint": route_hint("/verification-requirements"),
            "requires_admin": True,
        }
    elif setup_phase == "activation":
        primary_next_action = {
            "action_key": "review_activation_requirements",
            "label": "Review Community Domain activation requirements",
            "route_hint": route_hint("/activation-requirements"),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_dashboard",
            "label": "Review Community Domain dashboard",
            "route_hint": route_hint("/dashboard"),
            "requires_admin": False,
        }

    return {
        "community_domain": template_fit["community_domain"],
        "template": template_fit["template"],
        "viewer": template_fit["viewer"],
        "setup_phase": setup_phase,
        "steps": steps,
        "completed_steps": sum(1 for step in steps if step["completed"]),
        "open_steps": [step["step_key"] for step in steps if not step["completed"]],
        "template_fit_summary": {
            "matched_total": template_fit["matched_total"],
            "missing_total": template_fit["missing_total"],
            "missing_sections": missing_sections,
        },
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Setup plan is read-only ordering guidance for a Community Domain. "
            "It turns template-fit gaps into a practical admin sequence, but it "
            "does not create nodes, add members, assign roles, create policy, "
            "open or decide reviews, verify authority, activate billing, "
            "activate the Community Domain, create marketplace activity, create "
            "a social Community, move money, publish a public page, or expose "
            "private evidence."
        ),
    }


def _community_domain_capacity_plan_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    limits = dict(COMMUNITY_DOMAIN_PACKAGE_LIMITS)

    node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .count()
    )
    active_domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_member_count = len(active_domain_memberships)
    active_node_member_count = len(active_node_memberships)
    domain_admin_count = sum(
        1
        for row in active_domain_memberships
        if _clean_role(row.role) in DOMAIN_ADMIN_ROLES
    )
    node_admin_count = sum(
        1
        for row in active_node_memberships
        if _clean_role(row.role) in NODE_ADMIN_ROLES
    )
    admin_assignment_count = domain_admin_count + node_admin_count

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def metered_lane(
        lane_key: str,
        label: str,
        used: int,
        limit: int,
        *,
        route_suffix: str,
        requires_admin: bool = False,
        summary: str,
    ) -> dict[str, Any]:
        usage_ratio = (used / limit) if limit else 0
        if used > limit:
            status = "over_limit"
        elif usage_ratio >= 0.8:
            status = "near_limit"
        elif used > 0:
            status = "within_limit"
        else:
            status = "unused"
        return {
            "lane_key": lane_key,
            "label": label,
            "metered": True,
            "used": int(used),
            "limit": int(limit),
            "remaining": max(int(limit) - int(used), 0),
            "usage_percent": round(usage_ratio * 100, 2) if limit else 0,
            "status": status,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "admin_visible": bool(can_admin),
            "summary": summary,
            "boundary": (
                "Read-only capacity lane. This does not increase limits, create "
                "nodes, add members, assign roles, create shops, activate billing, "
                "change package pricing, move money, or verify authority."
            ),
        }

    lanes = [
        metered_lane(
            "nodes",
            "Institutional nodes",
            int(node_count),
            int(limits["included_nodes"]),
            route_suffix="/nodes/tree",
            summary="Branches, departments, lines, chapters, classes, committees, and operating units currently modeled inside this Community Domain.",
        ),
        metered_lane(
            "members",
            "Active domain members",
            int(active_member_count),
            int(limits["included_members"]),
            route_suffix="/members",
            requires_admin=True,
            summary="People with active membership in this Community Domain.",
        ),
        metered_lane(
            "admins",
            "Admin assignments",
            int(admin_assignment_count),
            int(limits["included_admins"]),
            route_suffix="/roles",
            summary="Active domain-admin and node-admin assignments currently visible in this Community Domain.",
        ),
        {
            "lane_key": "shops",
            "label": "Shop allowance",
            "metered": False,
            "used": None,
            "limit": int(limits["included_shops"]),
            "remaining": None,
            "usage_percent": None,
            "status": "not_metered_in_this_slice",
            "route_hint": route_hint("/economic-participation"),
            "requires_admin": False,
            "admin_visible": bool(can_admin),
            "summary": (
                "Package allowance exists, but live Community Domain shop usage "
                "is not metered here because shops belong to global member "
                "identity and marketplace exposure is not connected to this "
                "capacity counter in this slice."
            ),
            "boundary": (
                "Allowance visibility only. This does not create shops, connect "
                "shops to a Community Domain, create listings, create marketplace "
                "exposure, or change shop ownership."
            ),
        },
        {
            "lane_key": "storage",
            "label": "Evidence storage allowance",
            "metered": False,
            "used": None,
            "limit": int(limits["included_storage_gb"]),
            "remaining": None,
            "usage_percent": None,
            "status": "not_metered_in_this_slice",
            "route_hint": route_hint("/verification-requirements"),
            "requires_admin": False,
            "admin_visible": bool(can_admin),
            "summary": (
                "Package storage allowance exists, but file storage usage is not "
                "metered by this Community Domain endpoint in this slice."
            ),
            "boundary": (
                "Allowance visibility only. This does not upload files, reserve "
                "storage, verify evidence, expose private evidence, or change "
                "storage billing."
            ),
        },
    ]
    metered_lanes = [lane for lane in lanes if lane["metered"]]
    over_limit_lanes = [
        lane["lane_key"] for lane in metered_lanes if lane["status"] == "over_limit"
    ]
    near_limit_lanes = [
        lane["lane_key"] for lane in metered_lanes if lane["status"] == "near_limit"
    ]
    if over_limit_lanes and can_admin:
        primary_next_action = {
            "action_key": "review_package_capacity",
            "label": "Review Community Domain package capacity",
            "route_hint": route_hint("/package-quote", requires_admin=True),
            "requires_admin": True,
        }
    elif near_limit_lanes and can_admin:
        primary_next_action = {
            "action_key": "review_growth_capacity",
            "label": "Review Community Domain growth capacity",
            "route_hint": route_hint("/setup-plan"),
            "requires_admin": False,
        }
    elif over_limit_lanes or near_limit_lanes:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_capacity",
            "label": "Ask a Community Domain admin to review package capacity",
            "route_hint": None,
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_setup_plan",
            "label": "Review Community Domain setup plan",
            "route_hint": route_hint("/setup-plan"),
            "requires_admin": False,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template["marketplace_role"], "optional"),
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "package_code": "community_domain_starter",
        "package_name": "Community Domain Starter",
        "limits_source": "pilot_package_quote_defaults",
        "lanes": lanes,
        "counts": {
            "nodes": int(node_count),
            "active_members": int(active_member_count),
            "active_node_memberships": int(active_node_member_count),
            "domain_admins": int(domain_admin_count),
            "node_admin_assignments": int(node_admin_count),
            "admin_assignments": int(admin_assignment_count),
        },
        "over_limit_lanes": over_limit_lanes,
        "near_limit_lanes": near_limit_lanes,
        "unmetered_lanes": [
            lane["lane_key"] for lane in lanes if not lane["metered"]
        ],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Capacity plan is a read-only comparison between current Community "
            "Domain records and the pilot package allowances. It does not "
            "increase limits, create nodes, add members, assign roles, create "
            "shops, meter live shop usage, meter storage usage, create policy, "
            "open reviews, activate billing, change pricing, verify authority, "
            "create marketplace activity, create a social Community, move money, "
            "publish a public page, or expose private evidence."
        ),
    }


def _community_domain_rollout_plan_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    root_node = _find_root_node(db, community_domain_id=domain_id)
    root_node_id = int(root_node.id) if root_node is not None else None
    top_nodes = []
    if root_node_id is not None:
        top_nodes = (
            db.query(CommunityNode)
            .filter(CommunityNode.community_domain_id == domain_id)
            .filter(CommunityNode.parent_node_id == root_node_id)
            .order_by(
                CommunityNode.sort_order.asc(),
                CommunityNode.name.asc(),
                CommunityNode.id.asc(),
            )
            .all()
        )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    capacity_plan = _community_domain_capacity_plan_payload(
        db,
        domain=domain,
        current_user=current_user,
    )

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    rollout_units = []
    for node in top_nodes:
        node_id = int(node.id)
        node_members = memberships_by_node.get(node_id, [])
        admin_count = sum(
            1 for row in node_members if _clean_role(row.role) in NODE_ADMIN_ROLES
        )
        member_count = len(node_members)
        node_status = _clean_role(node.status, "inactive")
        if node_status != "active":
            rollout_status = "inactive"
            next_step = "Reactivate or replace this unit before using it for rollout."
        elif admin_count <= 0:
            rollout_status = "needs_local_admin"
            next_step = "Assign a real local admin before inviting wider participation."
        elif member_count <= admin_count:
            rollout_status = "needs_pilot_members"
            next_step = "Place a small pilot group inside this unit before wider rollout."
        else:
            rollout_status = "ready_for_pilot"
            next_step = "Use this unit as a pilot operating unit before scaling outward."
        rollout_units.append(
            {
                "node": _node_payload(node),
                "member_count": int(member_count),
                "admin_count": int(admin_count),
                "status": rollout_status,
                "ready_for_pilot": rollout_status == "ready_for_pilot",
                "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
                "admin_action_route_hint": route_hint("/roles", requires_admin=True),
                "next_step": next_step,
                "boundary": (
                    "Read-only rollout unit. This does not invite members, assign "
                    "admins, place members, change node status, create policy, "
                    "activate billing, launch marketplace activity, or expose "
                    "private evidence."
                ),
            }
        )

    has_structure = len(rollout_units) > 0
    all_units_have_admin = has_structure and all(
        unit["admin_count"] > 0 and unit["status"] != "inactive"
        for unit in rollout_units
    )
    all_units_have_members = has_structure and all(
        unit["member_count"] > unit["admin_count"] and unit["status"] != "inactive"
        for unit in rollout_units
    )
    ready_unit_count = sum(1 for unit in rollout_units if unit["ready_for_pilot"])
    has_governance = active_policy_count > 0
    capacity_ok = not capacity_plan["over_limit_lanes"]

    def phase(
        phase_key: str,
        label: str,
        completed: bool,
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        detail: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        return {
            "phase_key": phase_key,
            "label": label,
            "status": "complete" if completed else "open",
            "completed": bool(completed),
            "route_hint": route_hint(route_suffix),
            "admin_action_route_hint": route_hint(
                route_suffix, requires_admin=requires_admin
            ),
            "requires_admin": bool(requires_admin),
            "admin_visible": bool(can_admin),
            "next_step": next_step,
            "detail": detail or {},
            "boundary": (
                "Read-only rollout phase. This does not create nodes, invite "
                "members, assign roles, create policy, activate billing, verify "
                "authority, publish public pages, create marketplace activity, "
                "or move money."
            ),
        }

    phases = [
        phase(
            "structure",
            "Choose first rollout units",
            has_structure,
            (
                "Review the first branches, lines, chapters, departments, or units."
                if has_structure
                else "Create the first real operating units before rollout."
            ),
            route_suffix="/nodes/tree",
            requires_admin=True,
            detail={"first_level_units": len(rollout_units)},
        ),
        phase(
            "local_admins",
            "Assign local admins",
            all_units_have_admin,
            (
                "Review local admin coverage."
                if all_units_have_admin
                else "Assign trusted local admins to each rollout unit."
            ),
            route_suffix="/roles",
            requires_admin=True,
            detail={
                "units_with_admin": sum(1 for unit in rollout_units if unit["admin_count"] > 0),
                "units_total": len(rollout_units),
            },
        ),
        phase(
            "pilot_members",
            "Place pilot members",
            all_units_have_members,
            (
                "Review pilot member placement."
                if all_units_have_members
                else "Place a small pilot group inside each first rollout unit."
            ),
            route_suffix="/nodes/tree",
            requires_admin=True,
            detail={
                "ready_units": int(ready_unit_count),
                "active_members": int(active_member_count),
            },
        ),
        phase(
            "governance",
            "Confirm rollout governance",
            has_governance,
            (
                "Review the active governance policy coverage."
                if has_governance
                else "Add governance policy before wider institutional rollout."
            ),
            route_suffix="/policies",
            requires_admin=True,
            detail={"active_policies": int(active_policy_count)},
        ),
        phase(
            "capacity",
            "Review package capacity",
            capacity_ok,
            (
                "Capacity is within the current package allowances."
                if capacity_ok
                else "Review capacity before onboarding more units or members."
            ),
            route_suffix="/capacity-plan",
            requires_admin=False,
            detail={
                "near_limit_lanes": capacity_plan["near_limit_lanes"],
                "over_limit_lanes": capacity_plan["over_limit_lanes"],
            },
        ),
    ]

    if not has_structure:
        rollout_phase = "structure"
        action_route = "/nodes/tree"
        action_key = "choose_rollout_units"
        action_label = "Choose first Community Domain rollout units"
        action_admin = True
    elif not all_units_have_admin:
        rollout_phase = "local_admins"
        action_route = "/roles"
        action_key = "assign_local_admins"
        action_label = "Assign local rollout admins"
        action_admin = True
    elif not all_units_have_members:
        rollout_phase = "pilot_members"
        action_route = "/nodes/tree"
        action_key = "place_pilot_members"
        action_label = "Place pilot members into rollout units"
        action_admin = True
    elif not has_governance:
        rollout_phase = "governance"
        action_route = "/policies"
        action_key = "confirm_rollout_governance"
        action_label = "Confirm rollout governance"
        action_admin = True
    elif not capacity_ok:
        rollout_phase = "capacity"
        action_route = "/capacity-plan"
        action_key = "review_capacity_before_rollout"
        action_label = "Review capacity before wider rollout"
        action_admin = False
    else:
        rollout_phase = "pilot_ready"
        action_route = "/operating-map"
        action_key = "review_operating_map"
        action_label = "Review Community Domain operating map"
        action_admin = False

    if action_admin and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_continue_rollout",
            "label": "Ask a Community Domain admin to continue rollout",
            "route_hint": None,
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": action_key,
            "label": action_label,
            "route_hint": route_hint(action_route),
            "requires_admin": bool(action_admin),
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template["marketplace_role"], "optional"),
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "rollout_phase": rollout_phase,
        "phases": phases,
        "rollout_units": rollout_units,
        "counts": {
            "first_level_units": len(rollout_units),
            "ready_units": int(ready_unit_count),
            "active_members": int(active_member_count),
            "active_node_memberships": len(active_node_memberships),
            "active_policies": int(active_policy_count),
        },
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Rollout plan is read-only institutional onboarding guidance. It "
            "does not create nodes, invite members, add members, assign admins, "
            "place members, create policy, open reviews, verify authority, "
            "activate billing, activate the Community Domain, publish a public "
            "page, create marketplace activity, create a social Community, move "
            "money, or expose private evidence."
        ),
    }


def _community_domain_rollout_tree_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(node_id, []).append(policy)

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def descendant_ids(node_id: int) -> list[int]:
        ids: list[int] = []
        for child in children_by_parent.get(node_id, []):
            child_id = int(child.id)
            ids.append(child_id)
            ids.extend(descendant_ids(child_id))
        return ids

    flat_nodes: list[dict[str, Any]] = []

    def rollout_status_for(
        node: CommunityNode,
        *,
        direct_member_count: int,
        direct_admin_count: int,
    ) -> tuple[str, str]:
        if node.parent_node_id is None:
            return (
                "root",
                "Root institution record. Use child operating units for rollout.",
            )
        if _clean_role(node.status, "inactive") != "active":
            return (
                "inactive",
                "Reactivate or replace this node before using it for rollout.",
            )
        if direct_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a real local admin before wider rollout.",
            )
        if direct_member_count <= direct_admin_count:
            return (
                "needs_pilot_members",
                "Place pilot members here before wider rollout.",
            )
        return (
            "ready_for_pilot",
            "This unit has a local admin and pilot members.",
        )

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        node_member_rows = memberships_by_node.get(node_id, [])
        direct_admin_count = sum(
            1 for row in node_member_rows if _clean_role(row.role) in NODE_ADMIN_ROLES
        )
        direct_member_count = len(node_member_rows)
        subtree_ids = [node_id, *descendant_ids(node_id)]
        descendant_member_count = sum(
            len(memberships_by_node.get(item_id, [])) for item_id in subtree_ids
        )
        subtree_policy_count = sum(
            len(policies_by_node.get(item_id, [])) for item_id in subtree_ids
        )
        rollout_status, next_step = rollout_status_for(
            node,
            direct_member_count=direct_member_count,
            direct_admin_count=direct_admin_count,
        )
        item = {
            "node": _node_payload(node),
            "rollout_status": rollout_status,
            "ready_for_pilot": rollout_status == "ready_for_pilot",
            "direct_child_count": len(child_nodes),
            "subtree_node_count": len(subtree_ids),
            "direct_member_count": int(direct_member_count),
            "direct_admin_count": int(direct_admin_count),
            "subtree_member_count": int(descendant_member_count),
            "subtree_policy_count": int(subtree_policy_count),
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint("/roles", requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only recursive rollout item. This does not create nodes, "
                "invite members, add members, assign admins, place members, "
                "create policy, change node status, create marketplace activity, "
                "or expose private evidence."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    roots = children_by_parent.get(None, [])
    tree = [node_item(root) for root in roots]
    non_root_items = [item for item in flat_nodes if item["node"]["parent_node_id"] is not None]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["rollout_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        action_key = "choose_rollout_units"
        action_label = "Choose first Community Domain rollout units"
        action_route = "/nodes/tree"
        action_admin = True
    elif status_counts.get("inactive", 0) > 0:
        action_key = "review_inactive_rollout_units"
        action_label = "Review inactive rollout units"
        action_route = "/nodes/tree"
        action_admin = True
    elif status_counts.get("needs_local_admin", 0) > 0:
        action_key = "assign_local_admins"
        action_label = "Assign local rollout admins"
        action_route = "/roles"
        action_admin = True
    elif status_counts.get("needs_pilot_members", 0) > 0:
        action_key = "place_pilot_members"
        action_label = "Place pilot members into rollout units"
        action_route = "/nodes/tree"
        action_admin = True
    else:
        action_key = "review_rollout_plan"
        action_label = "Review Community Domain rollout plan"
        action_route = "/rollout-plan"
        action_admin = False

    if action_admin and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_continue_rollout",
            "label": "Ask a Community Domain admin to continue rollout",
            "route_hint": None,
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": action_key,
            "label": action_label,
            "route_hint": route_hint(action_route),
            "requires_admin": bool(action_admin),
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template["marketplace_role"], "optional"),
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "ready_for_pilot": status_counts.get("ready_for_pilot", 0),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "needs_pilot_members": status_counts.get("needs_pilot_members", 0),
            "inactive": status_counts.get("inactive", 0),
            "active_node_memberships": len(active_node_memberships),
            "active_policies": len(active_policies),
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Rollout tree is a read-only recursive view of Community Domain "
            "rollout readiness. It does not create nodes, invite members, add "
            "members, assign admins, place members, create policy, open reviews, "
            "change node status, verify authority, activate billing, publish a "
            "public page, create marketplace activity, create a social Community, "
            "move money, or expose private evidence."
        ),
    }


def _community_domain_node_autonomy_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    domain_admin_count = sum(
        1
        for membership in active_domain_memberships
        if _clean_role(membership.role, "member") in DOMAIN_ADMIN_ROLES
    )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def ancestor_nodes(node: CommunityNode) -> list[CommunityNode]:
        ancestors: list[CommunityNode] = []
        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent = nodes_by_id.get(int(current.parent_node_id))
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        return ancestors

    def inherited_policy_count(node: CommunityNode) -> int:
        if node.parent_node_id is not None and not bool(node.inherits_parent_policy):
            return 0
        inherited = len(policies_by_node.get(None, []))
        for ancestor in ancestor_nodes(node):
            inherited += len(policies_by_node.get(int(ancestor.id), []))
        return inherited

    def autonomy_status_for(
        node: CommunityNode,
        *,
        local_admin_count: int,
        local_policy_count: int,
        inherited_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local autonomy belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before relying on it as a local unit.",
                False,
            )
        if local_admin_count > 0 and local_policy_count > 0:
            return (
                "locally_governed",
                "This unit has local admins and local policy, so it can operate as a governed mini-unit.",
                True,
            )
        if local_admin_count > 0 and inherited_count > 0:
            return (
                "locally_administered",
                "This unit has local admins but still depends on inherited policy.",
                True,
            )
        if local_admin_count == 0 and inherited_count > 0:
            return (
                "parent_controlled",
                "This unit is still controlled from the parent or domain level.",
                False,
            )
        return (
            "needs_local_governance",
            "Add local admin coverage and policy before this unit can stand as its own operating unit.",
            False,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        direct_member_count = len(local_memberships)
        local_policy_count = len(policies_by_node.get(node_id, []))
        inherited_count = inherited_policy_count(node)
        autonomy_status, next_step, locally_operable = autonomy_status_for(
            node,
            local_admin_count=local_admin_count,
            local_policy_count=local_policy_count,
            inherited_count=inherited_count,
        )
        if autonomy_status == "needs_local_governance":
            admin_route = "/governance-coverage"
        elif autonomy_status == "parent_controlled":
            admin_route = "/roles"
        elif autonomy_status == "locally_administered":
            admin_route = "/policies"
        elif autonomy_status == "inactive":
            admin_route = f"/nodes/{node_id}/operating-summary"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "autonomy_status": autonomy_status,
            "locally_operable": locally_operable,
            "inherits_parent_policy": bool(node.inherits_parent_policy),
            "direct_child_count": len(child_nodes),
            "direct_member_count": admin_count(direct_member_count),
            "local_admin_count": admin_count(local_admin_count),
            "local_policy_count": admin_count(local_policy_count),
            "inherited_policy_count": admin_count(inherited_count),
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local autonomy item. This does not grant local "
                "authority, assign roles, create policy, change inheritance, "
                "create or split nodes, create separate Community Domains, or "
                "expose private member/review/evidence records."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["autonomy_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_autonomy",
            "label": "Map branches, lines, classes, departments, or committees",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_governance", 0):
        primary_next_action = {
            "action_key": "add_local_governance_to_autonomous_units",
            "label": "Add local governance where units do not inherit policy",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("parent_controlled", 0):
        primary_next_action = {
            "action_key": "assign_local_admins_for_parent_controlled_units",
            "label": "Assign local admins where units are still parent-controlled",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("locally_administered", 0):
        primary_next_action = {
            "action_key": "add_local_policy_to_administered_units",
            "label": "Add local policy where units already have local admins",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_node_operating_summaries",
            "label": "Review local unit operating summaries",
            "route_hint": route_hint("/nodes/tree"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_autonomy",
            "label": "Ask a Community Domain admin to review local autonomy",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "domain_admin_count": admin_count(domain_admin_count),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "locally_governed": status_counts.get("locally_governed", 0),
            "locally_administered": status_counts.get("locally_administered", 0),
            "parent_controlled": status_counts.get("parent_controlled", 0),
            "needs_local_governance": status_counts.get("needs_local_governance", 0),
            "inactive": status_counts.get("inactive", 0),
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node autonomy map is a read-only local autonomy projection. "
            "It shows whether branches, lines, classes, departments, "
            "committees, chapters, or other operating units are locally governed, "
            "locally administered, parent-controlled, or still missing local "
            "governance. It does not grant local authority, assign roles, create "
            "policy, change inheritance, create or split nodes, create separate Community Domains, "
            "verify institutional authority, activate billing, "
            "create marketplace or finance records, move money, publish proof, or "
            "expose private member/review/evidence records."
        ),
    }


def _community_domain_node_economic_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    marketplace_role = _clean_role(template.get("marketplace_role"), "optional")
    marketplace_enabled = marketplace_role in {"core", "supported"}
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def ancestor_nodes(node: CommunityNode) -> list[CommunityNode]:
        ancestors: list[CommunityNode] = []
        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent = nodes_by_id.get(int(current.parent_node_id))
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        return ancestors

    def effective_policy_count(node: CommunityNode) -> int:
        local_count = len(policies_by_node.get(int(node.id), []))
        if node.parent_node_id is not None and not bool(node.inherits_parent_policy):
            return local_count
        inherited = len(policies_by_node.get(None, []))
        for ancestor in ancestor_nodes(node):
            inherited += len(policies_by_node.get(int(ancestor.id), []))
        return local_count + inherited

    def economic_status_for(
        node: CommunityNode,
        *,
        local_admin_count: int,
        local_participant_count: int,
        effective_policy_total: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local economic readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before planning local economic activity.",
                False,
            )
        if not marketplace_enabled:
            return (
                "marketplace_optional",
                "The domain template does not make marketplace activity core for this institution.",
                False,
            )
        if local_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a local admin before this unit can coordinate trade or support activity.",
                False,
            )
        if local_participant_count <= 0:
            return (
                "needs_participants",
                "Place non-admin members into this unit before treating it as economically active.",
                False,
            )
        if effective_policy_total <= 0:
            return (
                "governance_needed",
                "Add local or inherited policy before this unit carries economic activity.",
                False,
            )
        return (
            "local_economy_ready",
            "This unit has local admin, participants, and policy posture for future trade/support activity.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_participant_count = max(0, len(local_memberships) - local_admin_count)
        local_policy_count = len(policies_by_node.get(node_id, []))
        effective_policy_total = effective_policy_count(node)
        economy_status, next_step, ready = economic_status_for(
            node,
            local_admin_count=local_admin_count,
            local_participant_count=local_participant_count,
            effective_policy_total=effective_policy_total,
        )
        if economy_status == "needs_local_admin":
            admin_route = "/roles"
        elif economy_status in {"needs_participants", "marketplace_optional"}:
            admin_route = "/nodes/tree"
        elif economy_status == "governance_needed":
            admin_route = "/governance-coverage"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "economy_status": economy_status,
            "ready_for_local_economy": ready,
            "marketplace_role": marketplace_role,
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_participant_count": admin_count(local_participant_count),
            "local_policy_count": admin_count(local_policy_count),
            "effective_policy_count": admin_count(effective_policy_total),
            "shops": 0,
            "listings": 0,
            "demands": 0,
            "spotlights": 0,
            "finance_records": 0,
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local economic readiness item. This does not create a "
                "marketplace, shop, listing, demand, Spotlight, vault link, dues, "
                "contribution, payment instruction, finance record, loan, ledger "
                "entry, separate Community Domain, or private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["economy_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_economy",
            "label": "Map operating units before local economy planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_admin", 0):
        primary_next_action = {
            "action_key": "assign_local_admins_for_economic_units",
            "label": "Assign local admins before local economic activity",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_participants", 0):
        primary_next_action = {
            "action_key": "place_participants_for_local_economy",
            "label": "Place participants into local economic units",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("governance_needed", 0):
        primary_next_action = {
            "action_key": "add_governance_for_local_economy",
            "label": "Add governance for local economic units",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("marketplace_optional", 0):
        primary_next_action = {
            "action_key": "choose_marketplace_lanes_for_local_units",
            "label": "Choose whether local units need marketplace activity",
            "route_hint": route_hint("/economic-participation", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_economic_participation_boundaries",
            "label": "Review economic participation boundaries",
            "route_hint": route_hint("/economic-participation"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_economy",
            "label": "Ask a Community Domain admin to review local economy readiness",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": marketplace_role,
            "default_modules": list(template["default_modules"]),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "local_economy_ready": status_counts.get("local_economy_ready", 0),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "needs_participants": status_counts.get("needs_participants", 0),
            "governance_needed": status_counts.get("governance_needed", 0),
            "marketplace_optional": status_counts.get("marketplace_optional", 0),
            "inactive": status_counts.get("inactive", 0),
            "shops": 0,
            "listings": 0,
            "demands": 0,
            "spotlights": 0,
            "finance_records": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node economic map is read-only local economy "
            "planning. It shows whether branches, lines, classes, departments, "
            "committees, chapters, or other operating units have enough local "
            "admin, participant, and policy posture for future trade/support "
            "activity. It does not create a marketplace, shop, listing, demand, "
            "Spotlight, vault link, dues, contribution, ticket, payment "
            "instruction, receipt, bank match, loan, ledger entry, payout, "
            "finance record, separate Community Domain, social Community, public "
            "proof, TrustSlip, Trust Passport entry, or private member activity."
        ),
    }


def _community_domain_node_activity_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    blueprint = _community_domain_template_operating_blueprint_payload(
        template=template
    )
    template_activity_lanes = list(blueprint.get("activity_lanes") or [])

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def ancestor_nodes(node: CommunityNode) -> list[CommunityNode]:
        ancestors: list[CommunityNode] = []
        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent = nodes_by_id.get(int(current.parent_node_id))
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        return ancestors

    def effective_policy_count(node: CommunityNode) -> int:
        local_count = len(policies_by_node.get(int(node.id), []))
        if node.parent_node_id is not None and not bool(node.inherits_parent_policy):
            return local_count
        inherited = len(policies_by_node.get(None, []))
        for ancestor in ancestor_nodes(node):
            inherited += len(policies_by_node.get(int(ancestor.id), []))
        return local_count + inherited

    def activity_status_for(
        node: CommunityNode,
        *,
        local_admin_count: int,
        local_participant_count: int,
        effective_policy_total: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local activity readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before planning local activities.",
                False,
            )
        if local_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a local admin before this unit coordinates meetings, classes, services, or travel.",
                False,
            )
        if local_participant_count <= 0:
            return (
                "needs_participants",
                "Place participants into this unit before relying on local activity records.",
                False,
            )
        if effective_policy_total <= 0:
            return (
                "governance_needed",
                "Add local or inherited policy before this unit carries serious activities.",
                False,
            )
        return (
            "local_activity_ready",
            "This unit has local admin, participants, and policy posture for future activity tracking.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_participant_count = max(0, len(local_memberships) - local_admin_count)
        local_policy_count = len(policies_by_node.get(node_id, []))
        effective_policy_total = effective_policy_count(node)
        activity_status, next_step, ready = activity_status_for(
            node,
            local_admin_count=local_admin_count,
            local_participant_count=local_participant_count,
            effective_policy_total=effective_policy_total,
        )
        if activity_status == "needs_local_admin":
            admin_route = "/roles"
        elif activity_status == "needs_participants":
            admin_route = "/nodes/tree"
        elif activity_status == "governance_needed":
            admin_route = "/governance-coverage"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "activity_status": activity_status,
            "ready_for_local_activity": ready,
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_participant_count": admin_count(local_participant_count),
            "local_policy_count": admin_count(local_policy_count),
            "effective_policy_count": admin_count(effective_policy_total),
            "review_record_count": admin_count(reviews_by_node.get(node_id, 0)),
            "scheduled_activity_status": "not_connected_in_this_slice",
            "paid_activity_status": "not_connected_in_this_slice",
            "attendance_status": "not_connected_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local activity readiness item. This does not create "
                "events, meetings, classes, services, travel activities, dues, "
                "levies, attendance, reminders, notifications, payment "
                "instructions, receipts, evidence files, TrustSlips, Trust "
                "Passport entries, or private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["activity_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_activity",
            "label": "Map operating units before local activity planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_admin", 0):
        primary_next_action = {
            "action_key": "assign_local_admins_for_activity_units",
            "label": "Assign local admins before local activity tracking",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_participants", 0):
        primary_next_action = {
            "action_key": "place_participants_for_local_activity",
            "label": "Place participants into local activity units",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("governance_needed", 0):
        primary_next_action = {
            "action_key": "add_governance_for_local_activity",
            "label": "Add governance for local activity units",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_activity_boundaries",
            "label": "Review activity tracking boundaries",
            "route_hint": route_hint("/activity-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_activity",
            "label": "Ask a Community Domain admin to review local activity readiness",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "activity_lanes": template_activity_lanes,
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "local_activity_ready": status_counts.get("local_activity_ready", 0),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "needs_participants": status_counts.get("needs_participants", 0),
            "governance_needed": status_counts.get("governance_needed", 0),
            "inactive": status_counts.get("inactive", 0),
            "scheduled_activities": 0,
            "paid_activities": 0,
            "attendance_records": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node activity map is read-only local activity "
            "planning. It shows whether branches, lines, classes, departments, "
            "committees, chapters, or other operating units have enough local "
            "admin, participant, and policy posture for future activity tracking. "
            "It does not create events, meetings, classes, services, travel "
            "activities, dues, levies, paid activities, attendance, reminders, "
            "notifications, payment instructions, receipts, bank matches, "
            "evidence files, public proof, TrustSlips, Trust Passport entries, "
            "finance records, or private member activity."
        ),
    }


def _community_domain_node_trust_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    open_reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1
        if _clean_role(review.status, "pending") in {
            "pending",
            "pending_review",
            "needs_changes",
            "approved",
        }:
            open_reviews_by_node[review_node_id] = (
                open_reviews_by_node.get(review_node_id, 0) + 1
            )

    evidence_by_node: dict[Optional[int], int] = {}
    for evidence in active_evidence:
        evidence_node_id = (
            int(evidence.community_node_id)
            if evidence.community_node_id is not None
            else None
        )
        evidence_by_node[evidence_node_id] = evidence_by_node.get(evidence_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def ancestor_nodes(node: CommunityNode) -> list[CommunityNode]:
        ancestors: list[CommunityNode] = []
        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent = nodes_by_id.get(int(current.parent_node_id))
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        return ancestors

    def effective_policy_count(node: CommunityNode) -> int:
        local_count = len(policies_by_node.get(int(node.id), []))
        if node.parent_node_id is not None and not bool(node.inherits_parent_policy):
            return local_count
        inherited = len(policies_by_node.get(None, []))
        for ancestor in ancestor_nodes(node):
            inherited += len(policies_by_node.get(int(ancestor.id), []))
        return local_count + inherited

    def trust_status_for(
        node: CommunityNode,
        *,
        local_admin_count: int,
        local_participant_count: int,
        effective_policy_total: int,
        review_count: int,
        evidence_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local trust readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before relying on local trust evidence.",
                False,
            )
        if local_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a local admin before this unit can stand behind trust evidence.",
                False,
            )
        if local_participant_count <= 0:
            return (
                "needs_participants",
                "Place participants into this unit before trust evidence can mean much.",
                False,
            )
        if effective_policy_total <= 0:
            return (
                "governance_needed",
                "Add local or inherited policy before treating evidence as trusted.",
                False,
            )
        if review_count <= 0:
            return (
                "review_needed",
                "Create or route an action review before this unit has a trust trail.",
                False,
            )
        if evidence_count <= 0:
            return (
                "evidence_needed",
                "Attach controlled evidence metadata before this unit has portable trust material.",
                False,
            )
        return (
            "local_trust_ready",
            "This unit has local admin, participants, policy, review trail, and evidence metadata.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_participant_count = max(0, len(local_memberships) - local_admin_count)
        local_policy_count = len(policies_by_node.get(node_id, []))
        effective_policy_total = effective_policy_count(node)
        node_review_count = reviews_by_node.get(node_id, 0)
        node_open_review_count = open_reviews_by_node.get(node_id, 0)
        node_evidence_count = evidence_by_node.get(node_id, 0)
        trust_status, next_step, ready = trust_status_for(
            node,
            local_admin_count=local_admin_count,
            local_participant_count=local_participant_count,
            effective_policy_total=effective_policy_total,
            review_count=node_review_count,
            evidence_count=node_evidence_count,
        )
        if trust_status == "needs_local_admin":
            admin_route = "/roles"
        elif trust_status == "needs_participants":
            admin_route = "/nodes/tree"
        elif trust_status == "governance_needed":
            admin_route = "/governance-coverage"
        elif trust_status in {"review_needed", "evidence_needed"}:
            admin_route = "/evidence-map"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "trust_status": trust_status,
            "ready_for_local_trust": ready,
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_participant_count": admin_count(local_participant_count),
            "local_policy_count": admin_count(local_policy_count),
            "effective_policy_count": admin_count(effective_policy_total),
            "review_record_count": admin_count(node_review_count),
            "open_review_count": admin_count(node_open_review_count),
            "evidence_record_count": admin_count(node_evidence_count),
            "credential_status": "not_connected_in_this_slice",
            "trust_passport_status": "not_connected_in_this_slice",
            "trustslip_status": "not_connected_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local trust readiness item. This does not upload "
                "evidence, expose storage keys, expose review payloads, issue "
                "credentials, issue TrustSlips, write Trust Passport entries, "
                "verify legal identity, publish proof, or expose private member "
                "activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["trust_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_trust",
            "label": "Map operating units before local trust planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_admin", 0):
        primary_next_action = {
            "action_key": "assign_local_admins_for_trust_units",
            "label": "Assign local admins before local trust evidence",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_participants", 0):
        primary_next_action = {
            "action_key": "place_participants_for_local_trust",
            "label": "Place participants into local trust units",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("governance_needed", 0):
        primary_next_action = {
            "action_key": "add_governance_for_local_trust",
            "label": "Add governance for local trust evidence",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("review_needed", 0) or status_counts.get("evidence_needed", 0):
        primary_next_action = {
            "action_key": "review_local_evidence_readiness",
            "label": "Review local evidence readiness",
            "route_hint": route_hint("/evidence-map", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_trust_boundaries",
            "label": "Review local trust boundaries",
            "route_hint": route_hint("/trust-mobility"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_trust",
            "label": "Ask a Community Domain admin to review local trust readiness",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "active_evidence_records": admin_count(len(active_evidence)),
            "local_trust_ready": status_counts.get("local_trust_ready", 0),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "needs_participants": status_counts.get("needs_participants", 0),
            "governance_needed": status_counts.get("governance_needed", 0),
            "review_needed": status_counts.get("review_needed", 0),
            "evidence_needed": status_counts.get("evidence_needed", 0),
            "inactive": status_counts.get("inactive", 0),
            "credentials": 0,
            "trust_passport_entries": 0,
            "trustslips": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node trust map is read-only local trust and "
            "evidence readiness planning. It shows whether branches, lines, "
            "classes, departments, committees, chapters, or other operating "
            "units have enough local admin, participant, policy, review, and "
            "evidence posture for trust to be carried forward. It does not "
            "upload evidence, expose storage keys, expose review payloads, issue "
            "credentials, issue TrustSlips, write Trust Passport entries, verify "
            "legal identity, publish public proof, create finance records, move "
            "money, or expose private member activity."
        ),
    }


def _community_domain_node_participation_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    node_memberships_by_user: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )
        node_memberships_by_user.setdefault(int(membership.user_id), []).append(
            membership
        )

    active_domain_user_ids = {int(row.user_id) for row in active_domain_memberships}
    placed_user_ids = set(node_memberships_by_user)
    unplaced_user_ids = active_domain_user_ids - placed_user_ids
    multi_node_user_ids = {
        user_id for user_id, rows in node_memberships_by_user.items() if len(rows) > 1
    }
    domain_admin_user_ids = {
        int(row.user_id)
        for row in active_domain_memberships
        if _clean_role(row.role, "member") in DOMAIN_ADMIN_ROLES
    }

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def participation_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_admin_count: int,
        local_participant_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; member placement belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before placing members into it.",
                False,
            )
        if local_member_count <= 0:
            return (
                "empty_unit",
                "Place real members into this unit before relying on it as a lived operating circle.",
                False,
            )
        if local_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a local admin so this unit has someone accountable for member placement.",
                False,
            )
        if local_participant_count <= 0:
            return (
                "admin_only",
                "Add non-admin participants so this unit is not only an administrative shell.",
                False,
            )
        return (
            "ready_local_circle",
            "This unit has local admin and participants, so it can represent a lived local circle.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_participant_count = max(0, len(local_memberships) - local_admin_count)
        local_domain_admin_count = sum(
            1 for row in local_memberships if int(row.user_id) in domain_admin_user_ids
        )
        local_multi_node_count = sum(
            1 for row in local_memberships if int(row.user_id) in multi_node_user_ids
        )
        participation_status, next_step, ready = participation_status_for(
            node,
            local_member_count=len(local_memberships),
            local_admin_count=local_admin_count,
            local_participant_count=local_participant_count,
        )
        if participation_status == "needs_local_admin":
            admin_route = "/roles"
        elif participation_status in {"empty_unit", "admin_only"}:
            admin_route = "/nodes/tree"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "participation_status": participation_status,
            "ready_for_local_participation": ready,
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_participant_count": admin_count(local_participant_count),
            "local_domain_admin_count": admin_count(local_domain_admin_count),
            "local_multi_node_member_count": admin_count(local_multi_node_count),
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local participation item. This does not invite "
                "members, add members, approve join requests, assign roles, "
                "place members, create a social Community, expose member lists, "
                "or expose private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["participation_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_member_placement",
            "label": "Map operating units before member placement",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif len(unplaced_user_ids) > 0:
        primary_next_action = {
            "action_key": "place_unassigned_members_into_units",
            "label": "Place unassigned members into operating units",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_admin", 0):
        primary_next_action = {
            "action_key": "assign_local_admins_for_member_placement",
            "label": "Assign local admins for member placement",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("empty_unit", 0) or status_counts.get("admin_only", 0):
        primary_next_action = {
            "action_key": "place_members_into_local_units",
            "label": "Place members into local units",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_member_placement_summary",
            "label": "Review Community Domain member placement",
            "route_hint": route_hint("/members"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_participation",
            "label": "Ask a Community Domain admin to review member placement",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_domain_members": admin_count(len(active_domain_memberships)),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "unplaced_domain_members": admin_count(len(unplaced_user_ids)),
            "multi_node_members": admin_count(len(multi_node_user_ids)),
            "domain_admin_members": admin_count(len(domain_admin_user_ids)),
            "ready_local_circle": status_counts.get("ready_local_circle", 0),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "admin_only": status_counts.get("admin_only", 0),
            "empty_unit": status_counts.get("empty_unit", 0),
            "inactive": status_counts.get("inactive", 0),
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node participation map is read-only member "
            "placement planning. It shows whether branches, lines, classes, "
            "departments, committees, chapters, or other operating units have "
            "real local member participation. It does not invite members, add "
            "members, approve or reject join requests, assign roles, place "
            "members, create a social Community, expose member lists, expose "
            "private member activity, create marketplace records, create "
            "finance records, issue TrustSlips, or write Trust Passport entries."
        ),
    }


def _community_domain_node_service_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    default_modules = list(template.get("default_modules") or [])
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def ancestor_nodes(node: CommunityNode) -> list[CommunityNode]:
        ancestors: list[CommunityNode] = []
        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent = nodes_by_id.get(int(current.parent_node_id))
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        return ancestors

    def effective_policy_count(node: CommunityNode) -> int:
        local_count = len(policies_by_node.get(int(node.id), []))
        if node.parent_node_id is not None and not bool(node.inherits_parent_policy):
            return local_count
        inherited = len(policies_by_node.get(None, []))
        for ancestor in ancestor_nodes(node):
            inherited += len(policies_by_node.get(int(ancestor.id), []))
        return local_count + inherited

    def service_status_for(
        node: CommunityNode,
        *,
        local_admin_count: int,
        local_participant_count: int,
        effective_policy_total: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; service readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before connecting service planning to it.",
                False,
            )
        if not default_modules:
            return (
                "no_template_modules",
                "Choose template service modules before planning local service readiness.",
                False,
            )
        if local_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a local admin before services can be coordinated here.",
                False,
            )
        if local_participant_count <= 0:
            return (
                "needs_participants",
                "Place participants here before treating this unit as service-ready.",
                False,
            )
        if effective_policy_total <= 0:
            return (
                "governance_needed",
                "Add local or inherited policy before services can operate through this unit.",
                False,
            )
        return (
            "local_services_ready",
            "This unit has local admin, participants, policy posture, and template modules for future services.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_participant_count = max(0, len(local_memberships) - local_admin_count)
        local_policy_count = len(policies_by_node.get(node_id, []))
        effective_policy_total = effective_policy_count(node)
        service_status, next_step, ready = service_status_for(
            node,
            local_admin_count=local_admin_count,
            local_participant_count=local_participant_count,
            effective_policy_total=effective_policy_total,
        )
        if service_status == "needs_local_admin":
            admin_route = "/roles"
        elif service_status == "needs_participants":
            admin_route = "/nodes/tree"
        elif service_status == "governance_needed":
            admin_route = "/governance-coverage"
        elif service_status == "no_template_modules":
            admin_route = "/service-settings"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "service_status": service_status,
            "ready_for_local_services": ready,
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_participant_count": admin_count(local_participant_count),
            "local_policy_count": admin_count(local_policy_count),
            "effective_policy_count": admin_count(effective_policy_total),
            "template_module_count": len(default_modules),
            "service_catalog_status": "template_default_projection",
            "live_service_records": 0,
            "events": 0,
            "notifications": 0,
            "shops": 0,
            "vault_links": 0,
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local service readiness item. This does not enable "
                "modules, persist settings, activate billing, grant permissions, "
                "create events, create notifications, create shops, create vault "
                "links, place members, expose member lists, or expose private "
                "member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["service_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_services",
            "label": "Map operating units before local service planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_admin", 0):
        primary_next_action = {
            "action_key": "assign_local_admins_for_service_units",
            "label": "Assign local admins before local services",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_participants", 0):
        primary_next_action = {
            "action_key": "place_participants_for_service_units",
            "label": "Place participants before local services",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("governance_needed", 0):
        primary_next_action = {
            "action_key": "add_governance_for_local_services",
            "label": "Add governance for local services",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("no_template_modules", 0):
        primary_next_action = {
            "action_key": "review_template_service_modules",
            "label": "Review template service modules",
            "route_hint": route_hint("/service-settings", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_service_settings",
            "label": "Review Community Domain service settings",
            "route_hint": route_hint("/service-settings"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_services",
            "label": "Ask a Community Domain admin to review local services",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "default_modules": default_modules,
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "template_module_count": len(default_modules),
            "local_services_ready": status_counts.get("local_services_ready", 0),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "needs_participants": status_counts.get("needs_participants", 0),
            "governance_needed": status_counts.get("governance_needed", 0),
            "no_template_modules": status_counts.get("no_template_modules", 0),
            "inactive": status_counts.get("inactive", 0),
            "live_service_records": 0,
            "events": 0,
            "notifications": 0,
            "shops": 0,
            "vault_links": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node service map is read-only local service "
            "planning. It shows whether branches, lines, classes, departments, "
            "committees, chapters, or other operating units have enough local "
            "admin, participant, policy posture, and template module coverage "
            "for future GSN services. It does not enable modules, persist "
            "settings, activate billing, grant permissions, create events, "
            "create notifications, create shops, create vault links, place "
            "members, expose member lists, expose private member activity, "
            "create marketplace records, create finance records, issue "
            "TrustSlips, or write Trust Passport entries."
        ),
    }


def _community_domain_node_privacy_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    evidence_by_node: dict[Optional[int], int] = {}
    for evidence in active_evidence:
        evidence_node_id = (
            int(evidence.community_node_id)
            if evidence.community_node_id is not None
            else None
        )
        evidence_by_node[evidence_node_id] = evidence_by_node.get(evidence_node_id, 0) + 1

    visibility_policy_counts: dict[str, int] = {}
    for node in nodes:
        policy_key = _clean_role(node.visibility_policy, "members")
        visibility_policy_counts[policy_key] = visibility_policy_counts.get(policy_key, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def privacy_status_for(node: CommunityNode) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local visibility belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before relying on its visibility boundary.",
                False,
            )
        visibility = _clean_role(node.visibility_policy, "members")
        if visibility == "admins":
            return (
                "admin_restricted",
                "This unit is restricted to admins; keep rosters and records private unless policy changes.",
                True,
            )
        if visibility == "node_members":
            return (
                "node_private",
                "This unit is visible to its local members; avoid exposing its roster outside the unit.",
                True,
            )
        if visibility == "members":
            return (
                "member_visible",
                "This unit is visible to domain members, but its private records remain protected.",
                True,
            )
        if visibility in {"public", "network", "external"}:
            return (
                "public_review_needed",
                "Review public exposure before treating this unit as externally visible.",
                False,
            )
        return (
            "unknown_visibility",
            "Review this unit's visibility policy before exposing local records.",
            False,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        node_review_count = reviews_by_node.get(node_id, 0)
        node_evidence_count = evidence_by_node.get(node_id, 0)
        privacy_status, next_step, safe_default = privacy_status_for(node)
        if privacy_status in {"public_review_needed", "unknown_visibility"}:
            admin_route = "/record-privacy-map"
        elif privacy_status == "admin_restricted":
            admin_route = f"/nodes/{node_id}/operating-summary"
        else:
            admin_route = "/nodes/tree"

        item = {
            "node": _node_payload(node),
            "privacy_status": privacy_status,
            "safe_default_visibility": safe_default,
            "visibility_policy": _clean_role(node.visibility_policy, "members"),
            "inherits_parent_policy": bool(node.inherits_parent_policy),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(node_review_count),
            "evidence_record_count": admin_count(node_evidence_count),
            "public_page_status": "not_published_in_this_slice",
            "member_list_status": "not_exposed_in_this_slice",
            "storage_key_status": "not_exposed_in_this_slice",
            "cross_domain_sharing_status": "not_connected_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local privacy item. This does not change permissions, "
                "publish hierarchy, expose member lists, expose node rosters, "
                "expose storage keys, share records across institutions, create "
                "a public page, or expose private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["privacy_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_privacy",
            "label": "Map operating units before local privacy planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_node_visibility",
            "label": "Review public node visibility",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("unknown_visibility", 0):
        primary_next_action = {
            "action_key": "review_unknown_node_visibility",
            "label": "Review unknown node visibility policies",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_record_privacy_boundaries",
            "label": "Review Community Domain privacy boundaries",
            "route_hint": route_hint("/record-privacy-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_privacy",
            "label": "Ask a Community Domain admin to review local privacy",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "visibility_policy_counts": visibility_policy_counts if can_admin else None,
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "active_evidence_records": admin_count(len(active_evidence)),
            "member_visible": status_counts.get("member_visible", 0),
            "node_private": status_counts.get("node_private", 0),
            "admin_restricted": status_counts.get("admin_restricted", 0),
            "public_review_needed": status_counts.get("public_review_needed", 0),
            "unknown_visibility": status_counts.get("unknown_visibility", 0),
            "inactive": status_counts.get("inactive", 0),
            "public_pages": 0,
            "published_hierarchies": 0,
            "exposed_member_lists": 0,
            "cross_domain_shares": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node privacy map is read-only local privacy "
            "planning. It shows whether branches, lines, classes, departments, "
            "committees, chapters, or other operating units are member-visible, "
            "node-private, admin-restricted, or need public-exposure review. It "
            "does not change permissions, publish hierarchy, expose member "
            "lists, expose node rosters, expose review payloads, expose storage "
            "keys, share records across institutions, create public pages, "
            "create marketplace records, create finance records, issue "
            "TrustSlips, write Trust Passport entries, or expose private member "
            "activity."
        ),
    }


def _community_domain_node_analytics_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    default_modules = list(template["default_modules"])

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    evidence_by_node: dict[Optional[int], int] = {}
    for evidence in active_evidence:
        evidence_node_id = (
            int(evidence.community_node_id)
            if evidence.community_node_id is not None
            else None
        )
        evidence_by_node[evidence_node_id] = evidence_by_node.get(evidence_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def ancestor_nodes(node: CommunityNode) -> list[CommunityNode]:
        ancestors: list[CommunityNode] = []
        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent = nodes_by_id.get(int(current.parent_node_id))
            if parent is None:
                break
            ancestors.append(parent)
            current = parent
        return ancestors

    def effective_policy_count(node: CommunityNode) -> int:
        local_count = len(policies_by_node.get(int(node.id), []))
        if node.parent_node_id is not None and not bool(node.inherits_parent_policy):
            return local_count
        inherited = len(policies_by_node.get(None, []))
        for ancestor in ancestor_nodes(node):
            inherited += len(policies_by_node.get(int(ancestor.id), []))
        return local_count + inherited

    def analytics_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        effective_policy_total: int,
        signal_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local analytics belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before reading local analytics signals.",
                False,
            )
        if local_member_count <= 0:
            return (
                "needs_membership_signal",
                "Place members into this unit before reading local analytics.",
                False,
            )
        if effective_policy_total <= 0:
            return (
                "needs_governance_signal",
                "Add local or inherited policy before treating this unit's analytics as ready.",
                False,
            )
        if signal_count <= 0:
            return (
                "needs_review_signal",
                "Record reviewed local activity or evidence before treating this unit's analytics as ready.",
                False,
            )
        return (
            "local_analytics_ready",
            "This unit has members, governance posture, and reviewed records for a safe local analytics view.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        effective_policy_total = effective_policy_count(node)
        review_count = reviews_by_node.get(node_id, 0)
        evidence_count = evidence_by_node.get(node_id, 0)
        signal_count = review_count + evidence_count
        analytics_status, next_step, ready = analytics_status_for(
            node,
            local_member_count=len(local_memberships),
            effective_policy_total=effective_policy_total,
            signal_count=signal_count,
        )
        if analytics_status == "needs_membership_signal":
            admin_route = "/node-participation-map"
        elif analytics_status == "needs_governance_signal":
            admin_route = "/governance-coverage"
        elif analytics_status == "needs_review_signal":
            admin_route = "/node-activity-map"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "analytics_status": analytics_status,
            "ready_for_local_analytics": ready,
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_policy_count": admin_count(local_policy_count),
            "effective_policy_count": admin_count(effective_policy_total),
            "review_record_count": admin_count(review_count),
            "evidence_record_count": admin_count(evidence_count),
            "signal_count": admin_count(signal_count),
            "metric_export_status": "not_connected_in_this_slice",
            "live_dashboard_status": "not_connected_in_this_slice",
            "marketplace_metric_status": "not_connected_in_this_slice",
            "finance_metric_status": "not_connected_in_this_slice",
            "trust_passport_status": "not_connected_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local analytics item. This does not create "
                "telemetry, export reports, live dashboards, marketplace "
                "metrics, finance metrics, storage keys, Trust Passport "
                "entries, or private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["analytics_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_analytics",
            "label": "Map operating units before local analytics",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_membership_signal", 0):
        primary_next_action = {
            "action_key": "place_members_for_node_analytics",
            "label": "Place members before local analytics",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_governance_signal", 0):
        primary_next_action = {
            "action_key": "add_governance_for_node_analytics",
            "label": "Add governance before local analytics",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_review_signal", 0):
        primary_next_action = {
            "action_key": "record_reviewed_activity_for_node_analytics",
            "label": "Record reviewed local activity before analytics",
            "route_hint": route_hint("/node-activity-map", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_local_analytics_snapshot",
            "label": "Review local analytics snapshot",
            "route_hint": route_hint("/analytics"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_node_analytics",
            "label": "Ask a Community Domain admin to review local analytics",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "default_modules": default_modules,
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "active_evidence_records": admin_count(len(active_evidence)),
            "template_module_count": len(default_modules),
            "local_analytics_ready": status_counts.get("local_analytics_ready", 0),
            "needs_membership_signal": status_counts.get(
                "needs_membership_signal", 0
            ),
            "needs_governance_signal": status_counts.get(
                "needs_governance_signal", 0
            ),
            "needs_review_signal": status_counts.get("needs_review_signal", 0),
            "inactive": status_counts.get("inactive", 0),
            "exported_reports": 0,
            "live_dashboards": 0,
            "telemetry_events": 0,
            "marketplace_metrics": 0,
            "finance_metrics": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node analytics map is read-only local analytics. "
            "It shows whether branches, lines, classes, departments, "
            "committees, chapters, or other operating units have enough member, "
            "governance, review, and evidence signals for a safe local snapshot. "
            "It does not create telemetry, export reports, live dashboards, "
            "marketplace metrics, finance metrics, storage keys, Trust "
            "Passport entries, TrustSlips, or expose private member activity."
        ),
    }


def _community_domain_node_domain_boundary_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    evidence_by_node: dict[Optional[int], int] = {}
    for evidence in active_evidence:
        evidence_node_id = (
            int(evidence.community_node_id)
            if evidence.community_node_id is not None
            else None
        )
        evidence_by_node[evidence_node_id] = evidence_by_node.get(evidence_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def is_branch_like(node: CommunityNode) -> bool:
        node_type = _clean_role(node.node_type, "")
        node_kind = _clean_role(node.node_kind, "")
        return node_type in {
            "branch",
            "campus",
            "chapter",
            "parish",
            "region",
            "state",
            "affiliate",
            "field_office",
        } or any(
            marker in node_kind
            for marker in [
                "branch",
                "campus",
                "chapter",
                "parish",
                "region",
                "affiliate",
                "field_office",
            ]
        )

    def boundary_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_admin_count: int,
        local_policy_count: int,
        signal_count: int,
    ) -> tuple[str, str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "parent_domain",
                "Root institution record; child-domain review belongs to operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "keep_inside_parent_domain",
                "Reactivate this operating unit before reviewing domain boundaries.",
                False,
            )

        visibility = _clean_role(node.visibility_policy, "members")
        public_visibility = visibility in {"public", "network", "external"}
        branch_like = is_branch_like(node)
        detached_inheritance = not bool(node.inherits_parent_policy)
        has_public_identity_signals = public_visibility or (
            branch_like and detached_inheritance
        )

        if (
            branch_like
            and public_visibility
            and local_member_count > 0
            and local_admin_count > 0
            and local_policy_count > 0
            and signal_count > 0
        ):
            return (
                "child_domain_candidate",
                "review_possible_child_domain",
                "This unit has branch-like identity, public visibility, local admin, local members, policy, and reviewed signals.",
                True,
            )
        if has_public_identity_signals:
            return (
                "affiliate_review_needed",
                "review_parent_affiliate_boundary",
                "Review whether this unit should remain under the parent or become an affiliate/child domain later.",
                False,
            )
        if local_admin_count > 0 and local_member_count > 0:
            return (
                "internal_operating_unit",
                "keep_inside_parent_domain",
                "This unit can operate inside the parent Community Domain rules.",
                False,
            )
        return (
            "parent_domain_unit",
            "keep_inside_parent_domain",
            "This unit still depends mainly on the parent domain for identity, rules, and administration.",
            False,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_admin_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        evidence_count = evidence_by_node.get(node_id, 0)
        signal_count = review_count + evidence_count
        boundary_status, recommended_boundary, next_step, review_ready = (
            boundary_status_for(
                node,
                local_member_count=len(local_memberships),
                local_admin_count=local_admin_count,
                local_policy_count=local_policy_count,
                signal_count=signal_count,
            )
        )
        if boundary_status == "child_domain_candidate":
            admin_route = "/institutional-profile"
        elif boundary_status == "affiliate_review_needed":
            admin_route = "/social-bridge"
        else:
            admin_route = "/nodes/tree"

        visibility = _clean_role(node.visibility_policy, "members")
        item = {
            "node": _node_payload(node),
            "domain_boundary_status": boundary_status,
            "recommended_boundary": recommended_boundary,
            "ready_for_child_domain_review": review_ready,
            "branch_like_unit": is_branch_like(node),
            "public_identity_signal": visibility in {"public", "network", "external"},
            "detached_policy_inheritance": not bool(node.inherits_parent_policy),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_admin_count": admin_count(local_admin_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(review_count),
            "evidence_record_count": admin_count(evidence_count),
            "signal_count": admin_count(signal_count),
            "child_domain_status": "not_created_in_this_slice",
            "affiliate_link_status": "not_created_in_this_slice",
            "billing_status": "not_changed_in_this_slice",
            "public_url_status": "not_published_in_this_slice",
            "member_transfer_status": "not_moved_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only node/domain boundary item. This does not create child "
                "Community Domains, create affiliate links, publish public URLs, "
                "activate billing, split hierarchy, transfer members, verify legal "
                "identity, create marketplace records, create finance records, "
                "issue TrustSlips, write Trust Passport entries, or expose private "
                "member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["domain_boundary_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_domain_boundary_review",
            "label": "Map operating units before domain-boundary review",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("child_domain_candidate", 0):
        primary_next_action = {
            "action_key": "review_child_domain_candidates",
            "label": "Review possible child Community Domains",
            "route_hint": route_hint("/institutional-profile", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("affiliate_review_needed", 0):
        primary_next_action = {
            "action_key": "review_affiliate_boundaries",
            "label": "Review affiliate boundaries",
            "route_hint": route_hint("/social-bridge", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_parent_domain_units",
            "label": "Review parent-domain operating units",
            "route_hint": route_hint("/node-autonomy-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_domain_boundaries",
            "label": "Ask a Community Domain admin to review domain boundaries",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "active_evidence_records": admin_count(len(active_evidence)),
            "child_domain_candidate": status_counts.get("child_domain_candidate", 0),
            "affiliate_review_needed": status_counts.get(
                "affiliate_review_needed", 0
            ),
            "internal_operating_unit": status_counts.get(
                "internal_operating_unit", 0
            ),
            "parent_domain_unit": status_counts.get("parent_domain_unit", 0),
            "inactive": status_counts.get("inactive", 0),
            "child_domains_created": 0,
            "affiliate_links_created": 0,
            "billing_changes": 0,
            "public_urls_published": 0,
            "members_transferred": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node domain-boundary map is read-only child-domain "
            "planning. It helps decide whether branches, campuses, chapters, "
            "parishes, market sections, departments, or other operating units "
            "should stay as CommunityNodes under the parent, be reviewed as "
            "affiliates, or later become child Community Domains. It does not "
            "create child Community Domains, create affiliate links, publish public URLs, "
            "activate billing, split hierarchy, transfer members, "
            "verify legal identity, create marketplace records, create finance "
            "records, issue TrustSlips, write Trust Passport entries, or expose "
            "private member activity."
        ),
    }


def _community_domain_node_evidence_authority_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    evidence_by_node: dict[Optional[int], int] = {}
    for evidence in active_evidence:
        evidence_node_id = (
            int(evidence.community_node_id)
            if evidence.community_node_id is not None
            else None
        )
        evidence_by_node[evidence_node_id] = evidence_by_node.get(evidence_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def evidence_authority_status_for(
        node: CommunityNode,
        *,
        local_issuer_count: int,
        local_policy_count: int,
        signal_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local evidence authority belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before reading local evidence authority.",
                False,
            )

        visibility = _clean_role(node.visibility_policy, "members")
        if visibility in {"public", "network", "external"}:
            return (
                "public_evidence_review_needed",
                "Review public evidence exposure before allowing this unit to carry outward proof.",
                False,
            )
        if local_issuer_count <= 0:
            return (
                "needs_local_evidence_issuer",
                "Assign a local admin or evidence issuer before this unit carries evidence.",
                False,
            )
        if local_policy_count <= 0:
            return (
                "needs_evidence_policy",
                "Add a local evidence or verification policy before this unit carries evidence.",
                False,
            )
        if signal_count <= 0:
            return (
                "needs_evidence_signal",
                "Record reviewed local evidence before treating this unit's evidence authority as ready.",
                False,
            )
        return (
            "local_evidence_authority_ready",
            "This unit has a local issuer, policy, and reviewed evidence signals for future trust carrying.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_issuer_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        evidence_count = evidence_by_node.get(node_id, 0)
        signal_count = review_count + evidence_count
        evidence_status, next_step, ready = evidence_authority_status_for(
            node,
            local_issuer_count=local_issuer_count,
            local_policy_count=local_policy_count,
            signal_count=signal_count,
        )
        if evidence_status == "public_evidence_review_needed":
            admin_route = "/record-privacy-map"
        elif evidence_status == "needs_local_evidence_issuer":
            admin_route = "/roles"
        elif evidence_status == "needs_evidence_policy":
            admin_route = "/policies"
        elif evidence_status == "needs_evidence_signal":
            admin_route = "/evidence-map"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "evidence_authority_status": evidence_status,
            "ready_for_local_evidence_authority": ready,
            "visibility_policy": _clean_role(node.visibility_policy, "members"),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_issuer_count": admin_count(local_issuer_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(review_count),
            "evidence_record_count": admin_count(evidence_count),
            "signal_count": admin_count(signal_count),
            "public_evidence_status": "not_published_in_this_slice",
            "credential_status": "not_issued_in_this_slice",
            "trust_passport_status": "not_written_in_this_slice",
            "storage_key_status": "not_exposed_in_this_slice",
            "verification_status": "not_approved_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local evidence authority item. This does not upload evidence, "
                "verify evidence, publish public evidence, expose storage keys, "
                "expose review payloads, issue credentials, issue "
                "TrustSlips, write Trust Passport entries, create marketplace "
                "records, create finance records, or expose private member "
                "activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["evidence_authority_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_evidence_authority",
            "label": "Map operating units before evidence authority planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_evidence_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_evidence_exposure",
            "label": "Review public evidence exposure",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_evidence_issuer", 0):
        primary_next_action = {
            "action_key": "assign_local_evidence_issuers",
            "label": "Assign local evidence issuers",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_evidence_policy", 0):
        primary_next_action = {
            "action_key": "add_local_evidence_policy",
            "label": "Add local evidence policy",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_evidence_signal", 0):
        primary_next_action = {
            "action_key": "record_local_evidence_signals",
            "label": "Record local evidence signals",
            "route_hint": route_hint("/evidence-map", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_local_evidence_authority",
            "label": "Review local evidence authority",
            "route_hint": route_hint("/evidence-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_evidence_authority",
            "label": "Ask a Community Domain admin to review evidence authority",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "active_evidence_records": admin_count(len(active_evidence)),
            "local_evidence_authority_ready": status_counts.get(
                "local_evidence_authority_ready", 0
            ),
            "public_evidence_review_needed": status_counts.get(
                "public_evidence_review_needed", 0
            ),
            "needs_local_evidence_issuer": status_counts.get(
                "needs_local_evidence_issuer", 0
            ),
            "needs_evidence_policy": status_counts.get("needs_evidence_policy", 0),
            "needs_evidence_signal": status_counts.get("needs_evidence_signal", 0),
            "inactive": status_counts.get("inactive", 0),
            "public_evidence_published": 0,
            "credentials_issued": 0,
            "trust_passport_entries_written": 0,
            "storage_keys_exposed": 0,
            "legal_authority_verified": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node evidence-authority map is read-only local evidence authority "
            "planning. It shows which branches, lines, "
            "classes, departments, committees, chapters, or other units appear "
            "ready to carry evidence later and which still need local issuers, "
            "policy, evidence signals, or public-exposure review. It does not "
            "upload evidence, verify evidence, publish public evidence, expose storage keys, "
            "expose review payloads, issue credentials, issue "
            "TrustSlips, write Trust Passport entries, create marketplace "
            "records, create finance records, verify legal authority, or expose "
            "private member activity."
        ),
    }


def _community_domain_node_communication_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def communication_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_communicator_count: int,
        local_policy_count: int,
        review_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local communication readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before using it for local communication planning.",
                False,
            )

        visibility = _clean_role(node.visibility_policy, "members")
        if visibility in {"public", "network", "external"}:
            return (
                "public_notice_review_needed",
                "Review public notice exposure before letting this unit carry outward communication.",
                False,
            )
        if local_communicator_count <= 0:
            return (
                "needs_local_communicator",
                "Assign a local admin or communicator before this unit carries notices.",
                False,
            )
        if local_member_count <= local_communicator_count:
            return (
                "needs_audience_signal",
                "Place reachable members in this unit before relying on local communication.",
                False,
            )
        if local_policy_count <= 0:
            return (
                "needs_communication_policy",
                "Add a local communication or notice policy before this unit carries announcements.",
                False,
            )
        if review_count <= 0:
            return (
                "needs_notice_review_signal",
                "Record a reviewed local notice or communication request before treating this unit as ready.",
                False,
            )
        return (
            "local_communication_ready",
            "This unit has communicator, audience, policy, and reviewed notice signals for future communication.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_communicator_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        communication_status, next_step, ready = communication_status_for(
            node,
            local_member_count=len(local_memberships),
            local_communicator_count=local_communicator_count,
            local_policy_count=local_policy_count,
            review_count=review_count,
        )
        if communication_status == "public_notice_review_needed":
            admin_route = "/record-privacy-map"
        elif communication_status == "needs_local_communicator":
            admin_route = "/roles"
        elif communication_status == "needs_audience_signal":
            admin_route = "/node-participation-map"
        elif communication_status == "needs_communication_policy":
            admin_route = "/policies"
        elif communication_status == "needs_notice_review_signal":
            admin_route = "/action-reviews/reviewer-queue"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "communication_status": communication_status,
            "ready_for_local_communication": ready,
            "visibility_policy": _clean_role(node.visibility_policy, "members"),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_communicator_count": admin_count(local_communicator_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(review_count),
            "notice_status": "not_created_in_this_slice",
            "notification_status": "not_sent_in_this_slice",
            "announcement_status": "not_published_in_this_slice",
            "emergency_notice_status": "not_sent_in_this_slice",
            "member_list_status": "not_exposed_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local communication item. This does not create notices, "
                "send notifications, publish announcements, schedule meetings, "
                "create events, send reminders, send emergency notices, expose "
                "member lists, expose private member activity, create marketplace "
                "records, create finance records, issue TrustSlips, or write "
                "Trust Passport entries."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["communication_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_communication",
            "label": "Map operating units before local communication planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_notice_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_notice_exposure",
            "label": "Review public notice exposure",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_local_communicator", 0):
        primary_next_action = {
            "action_key": "assign_local_communicators",
            "label": "Assign local communicators",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_audience_signal", 0):
        primary_next_action = {
            "action_key": "place_local_notice_audience",
            "label": "Place reachable members before local notices",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_communication_policy", 0):
        primary_next_action = {
            "action_key": "add_local_communication_policy",
            "label": "Add local communication policy",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_notice_review_signal", 0):
        primary_next_action = {
            "action_key": "record_notice_review_signal",
            "label": "Record reviewed local notice signal",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue", requires_admin=True
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_local_communication_readiness",
            "label": "Review local communication readiness",
            "route_hint": route_hint("/activity-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_communication",
            "label": "Ask a Community Domain admin to review local communication",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "local_communication_ready": status_counts.get(
                "local_communication_ready", 0
            ),
            "public_notice_review_needed": status_counts.get(
                "public_notice_review_needed", 0
            ),
            "needs_local_communicator": status_counts.get(
                "needs_local_communicator", 0
            ),
            "needs_audience_signal": status_counts.get("needs_audience_signal", 0),
            "needs_communication_policy": status_counts.get(
                "needs_communication_policy", 0
            ),
            "needs_notice_review_signal": status_counts.get(
                "needs_notice_review_signal", 0
            ),
            "inactive": status_counts.get("inactive", 0),
            "notices_created": 0,
            "notifications_sent": 0,
            "announcements_published": 0,
            "emergency_notices_sent": 0,
            "member_lists_exposed": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node communication map is read-only local communication "
            "planning. It shows whether branches, departments, classes, committees, "
            "chapters, lines, or other units have local communicator, audience, "
            "policy, and reviewed notice signals for future announcements, member "
            "notices, meeting notices, or emergency notices. It does not create notices, "
            "send notifications, publish announcements, schedule meetings, create events, "
            "send reminders, send emergency notices, expose member lists, expose private "
            "member activity, create marketplace records, create finance records, issue "
            "TrustSlips, or write Trust Passport entries."
        ),
    }


def _community_domain_node_vault_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    review_node_by_id: dict[int, Optional[int]] = {}
    for review in reviews:
        review_id = int(review.id)
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        review_node_by_id[review_id] = review_node_id
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    evidence_by_node: dict[Optional[int], int] = {}
    for evidence in active_evidence:
        evidence_node_id = review_node_by_id.get(int(evidence.action_review_id))
        evidence_by_node[evidence_node_id] = (
            evidence_by_node.get(evidence_node_id, 0) + 1
        )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def vault_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_steward_count: int,
        local_policy_count: int,
        signal_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; local vault readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before using it for local vault planning.",
                False,
            )

        visibility = _clean_role(node.visibility_policy, "members")
        if visibility in {"public", "network", "external"}:
            return (
                "public_vault_review_needed",
                "Review public document exposure before letting this unit carry vault material.",
                False,
            )
        if local_steward_count <= 0:
            return (
                "needs_vault_steward",
                "Assign a local admin or vault steward before this unit carries documents.",
                False,
            )
        if local_member_count <= local_steward_count:
            return (
                "needs_vault_audience",
                "Place reachable members in this unit before relying on local document access.",
                False,
            )
        if local_policy_count <= 0:
            return (
                "needs_vault_policy",
                "Add a local document or vault policy before this unit carries controlled material.",
                False,
            )
        if signal_count <= 0:
            return (
                "needs_document_signal",
                "Record reviewed local document evidence before treating this unit as vault-ready.",
                False,
            )
        return (
            "local_vault_ready",
            "This unit has steward, audience, policy, review, and evidence signals for future local vault use.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_steward_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        evidence_count = evidence_by_node.get(node_id, 0)
        signal_count = review_count + evidence_count
        vault_status, next_step, ready = vault_status_for(
            node,
            local_member_count=len(local_memberships),
            local_steward_count=local_steward_count,
            local_policy_count=local_policy_count,
            signal_count=signal_count,
        )
        if vault_status == "public_vault_review_needed":
            admin_route = "/record-privacy-map"
        elif vault_status == "needs_vault_steward":
            admin_route = "/roles"
        elif vault_status == "needs_vault_audience":
            admin_route = "/node-participation-map"
        elif vault_status == "needs_vault_policy":
            admin_route = "/policies"
        elif vault_status == "needs_document_signal":
            admin_route = "/evidence-map"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "vault_status": vault_status,
            "ready_for_local_vault": ready,
            "visibility_policy": _clean_role(node.visibility_policy, "members"),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_steward_count": admin_count(local_steward_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(review_count),
            "evidence_record_count": admin_count(evidence_count),
            "signal_count": admin_count(signal_count),
            "file_upload_status": "not_uploaded_in_this_slice",
            "file_download_status": "not_downloaded_in_this_slice",
            "vault_link_status": "not_created_in_this_slice",
            "storage_key_status": "not_exposed_in_this_slice",
            "member_list_status": "not_exposed_in_this_slice",
            "external_reader_status": "not_connected_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local vault item. This does not upload files, download files, "
                "create vault links, grant permissions, expose storage keys, expose "
                "member lists, connect external readers, publish proof, issue TrustSlips, "
                "write Trust Passport entries, create marketplace records, create finance "
                "records, or expose private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["vault_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_local_vault",
            "label": "Map operating units before local vault planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_vault_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_vault_exposure",
            "label": "Review public vault exposure",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_vault_steward", 0):
        primary_next_action = {
            "action_key": "assign_local_vault_stewards",
            "label": "Assign local vault stewards",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_vault_audience", 0):
        primary_next_action = {
            "action_key": "place_local_vault_audience",
            "label": "Place reachable members before local document access",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_vault_policy", 0):
        primary_next_action = {
            "action_key": "add_local_vault_policy",
            "label": "Add local vault policy",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_document_signal", 0):
        primary_next_action = {
            "action_key": "record_document_signal",
            "label": "Record reviewed local document signal",
            "route_hint": route_hint("/evidence-map", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_local_vault_readiness",
            "label": "Review local vault readiness",
            "route_hint": route_hint("/evidence-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_local_vault",
            "label": "Ask a Community Domain admin to review local vault readiness",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "active_evidence_records": admin_count(len(active_evidence)),
            "local_vault_ready": status_counts.get("local_vault_ready", 0),
            "public_vault_review_needed": status_counts.get(
                "public_vault_review_needed", 0
            ),
            "needs_vault_steward": status_counts.get("needs_vault_steward", 0),
            "needs_vault_audience": status_counts.get("needs_vault_audience", 0),
            "needs_vault_policy": status_counts.get("needs_vault_policy", 0),
            "needs_document_signal": status_counts.get("needs_document_signal", 0),
            "inactive": status_counts.get("inactive", 0),
            "files_uploaded": 0,
            "files_downloaded": 0,
            "vault_links_created": 0,
            "storage_keys_exposed": 0,
            "member_lists_exposed": 0,
            "external_readers_connected": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node vault map is read-only local vault planning. "
            "It shows whether branches, departments, classes, committees, chapters, "
            "lines, or other units have local steward, audience, policy, review, "
            "and evidence signals for future controlled documents. It does not upload files, "
            "download files, create vault links, grant permissions, expose storage keys, "
            "expose member lists, connect external readers, publish proof, issue TrustSlips, "
            "write Trust Passport entries, create marketplace records, create finance records, "
            "or expose private member activity."
        ),
    }


def _community_domain_node_scheduled_activity_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def scheduled_activity_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_coordinator_count: int,
        local_policy_count: int,
        review_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; scheduled activity readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before using it for scheduled activity planning.",
                False,
            )

        visibility = _clean_role(node.visibility_policy, "members")
        if visibility in {"public", "network", "external"}:
            return (
                "public_schedule_review_needed",
                "Review public meeting or event exposure before this unit carries outward schedules.",
                False,
            )
        if local_coordinator_count <= 0:
            return (
                "needs_activity_coordinator",
                "Assign a local admin or activity coordinator before this unit carries meetings or events.",
                False,
            )
        if local_member_count <= local_coordinator_count:
            return (
                "needs_schedule_audience",
                "Place reachable members in this unit before relying on local schedules.",
                False,
            )
        if local_policy_count <= 0:
            return (
                "needs_schedule_policy",
                "Add a local meeting, event, or attendance policy before this unit carries schedules.",
                False,
            )
        if review_count <= 0:
            return (
                "needs_attendance_signal",
                "Record a reviewed local meeting, event, or attendance signal before treating this unit as schedule-ready.",
                False,
            )
        return (
            "local_schedule_ready",
            "This unit has coordinator, audience, policy, and reviewed attendance signals for future scheduled activities.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_coordinator_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        schedule_status, next_step, ready = scheduled_activity_status_for(
            node,
            local_member_count=len(local_memberships),
            local_coordinator_count=local_coordinator_count,
            local_policy_count=local_policy_count,
            review_count=review_count,
        )
        if schedule_status == "public_schedule_review_needed":
            admin_route = "/record-privacy-map"
        elif schedule_status == "needs_activity_coordinator":
            admin_route = "/roles"
        elif schedule_status == "needs_schedule_audience":
            admin_route = "/node-participation-map"
        elif schedule_status == "needs_schedule_policy":
            admin_route = "/policies"
        elif schedule_status == "needs_attendance_signal":
            admin_route = "/action-reviews/reviewer-queue"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "schedule_status": schedule_status,
            "ready_for_local_schedule": ready,
            "visibility_policy": _clean_role(node.visibility_policy, "members"),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_coordinator_count": admin_count(local_coordinator_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(review_count),
            "meeting_status": "not_created_in_this_slice",
            "calendar_status": "not_created_in_this_slice",
            "attendance_status": "not_recorded_in_this_slice",
            "reminder_status": "not_sent_in_this_slice",
            "notification_status": "not_sent_in_this_slice",
            "payment_status": "not_connected_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local scheduled activity item. This does not create events, "
                "create meetings, create calendar entries, record attendance, send reminders, "
                "send notifications, create dues, create tickets, create payment instructions, "
                "upload evidence files, issue TrustSlips, write Trust Passport entries, "
                "or expose private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["schedule_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_schedules",
            "label": "Map operating units before scheduled activity planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_schedule_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_schedule_exposure",
            "label": "Review public schedule exposure",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_activity_coordinator", 0):
        primary_next_action = {
            "action_key": "assign_local_activity_coordinators",
            "label": "Assign local activity coordinators",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_schedule_audience", 0):
        primary_next_action = {
            "action_key": "place_local_schedule_audience",
            "label": "Place reachable members before local schedules",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_schedule_policy", 0):
        primary_next_action = {
            "action_key": "add_local_schedule_policy",
            "label": "Add local schedule policy",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_attendance_signal", 0):
        primary_next_action = {
            "action_key": "record_attendance_signal",
            "label": "Record reviewed meeting or attendance signal",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue", requires_admin=True
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_local_schedule_readiness",
            "label": "Review local schedule readiness",
            "route_hint": route_hint("/activity-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_schedules",
            "label": "Ask a Community Domain admin to review local scheduled activity",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "local_schedule_ready": status_counts.get("local_schedule_ready", 0),
            "public_schedule_review_needed": status_counts.get(
                "public_schedule_review_needed", 0
            ),
            "needs_activity_coordinator": status_counts.get(
                "needs_activity_coordinator", 0
            ),
            "needs_schedule_audience": status_counts.get(
                "needs_schedule_audience", 0
            ),
            "needs_schedule_policy": status_counts.get("needs_schedule_policy", 0),
            "needs_attendance_signal": status_counts.get(
                "needs_attendance_signal", 0
            ),
            "inactive": status_counts.get("inactive", 0),
            "events_created": 0,
            "meetings_created": 0,
            "calendar_entries_created": 0,
            "attendance_records": 0,
            "reminders_sent": 0,
            "notifications_sent": 0,
            "payment_instructions_created": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node scheduled activity map is read-only local schedule "
            "planning. It shows whether branches, departments, classes, committees, "
            "chapters, lines, or other units have coordinator, audience, policy, and "
            "reviewed meeting or attendance signals for future schedules. It does not "
            "create events, create meetings, create calendar entries, record attendance, "
            "send reminders, send notifications, create dues, create tickets, create "
            "payment instructions, upload evidence files, issue TrustSlips, write "
            "Trust Passport entries, create marketplace records, create finance records, "
            "or expose private member activity."
        ),
    }


def _community_domain_node_paid_activity_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    for node in nodes:
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        policy_node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(policy_node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        review_node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[review_node_id] = reviews_by_node.get(review_node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def paid_activity_status_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_steward_count: int,
        local_policy_count: int,
        review_count: int,
    ) -> tuple[str, str, bool]:
        if node.parent_node_id is None:
            return (
                "domain_root",
                "Root institution record; paid activity readiness belongs to child operating units.",
                False,
            )
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before using it for paid activity planning.",
                False,
            )

        visibility = _clean_role(node.visibility_policy, "members")
        if visibility in {"public", "network", "external"}:
            return (
                "public_payment_review_needed",
                "Review public payment exposure before this unit carries dues, tickets, travel fees, or contributions.",
                False,
            )
        if local_steward_count <= 0:
            return (
                "needs_payment_steward",
                "Assign a local admin or payment steward before this unit carries paid activities.",
                False,
            )
        if local_member_count <= local_steward_count:
            return (
                "needs_payer_audience",
                "Place reachable members in this unit before relying on local dues, tickets, or contributions.",
                False,
            )
        if local_policy_count <= 0:
            return (
                "needs_paid_activity_policy",
                "Add a local dues, ticket, travel-fee, contribution, or finance policy before this unit carries paid activities.",
                False,
            )
        if review_count <= 0:
            return (
                "needs_finance_review_signal",
                "Record a reviewed local dues, ticket, travel-fee, or contribution signal before treating this unit as payment-ready.",
                False,
            )
        return (
            "local_paid_activity_ready",
            "This unit has steward, payer audience, policy, and reviewed finance signals for future paid activity.",
            True,
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_memberships = memberships_by_node.get(node_id, [])
        local_steward_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        paid_status, next_step, ready = paid_activity_status_for(
            node,
            local_member_count=len(local_memberships),
            local_steward_count=local_steward_count,
            local_policy_count=local_policy_count,
            review_count=review_count,
        )
        if paid_status == "public_payment_review_needed":
            admin_route = "/record-privacy-map"
        elif paid_status == "needs_payment_steward":
            admin_route = "/roles"
        elif paid_status == "needs_payer_audience":
            admin_route = "/node-participation-map"
        elif paid_status == "needs_paid_activity_policy":
            admin_route = "/policies"
        elif paid_status == "needs_finance_review_signal":
            admin_route = "/action-reviews/reviewer-queue"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        item = {
            "node": _node_payload(node),
            "paid_activity_status": paid_status,
            "ready_for_local_paid_activity": ready,
            "visibility_policy": _clean_role(node.visibility_policy, "members"),
            "direct_child_count": len(child_nodes),
            "local_member_count": admin_count(len(local_memberships)),
            "local_steward_count": admin_count(local_steward_count),
            "local_policy_count": admin_count(local_policy_count),
            "review_record_count": admin_count(review_count),
            "charge_model_status": "not_configured_in_this_slice",
            "dues_status": "not_created_in_this_slice",
            "levy_status": "not_created_in_this_slice",
            "ticket_status": "not_created_in_this_slice",
            "travel_fee_status": "not_created_in_this_slice",
            "contribution_status": "not_created_in_this_slice",
            "invoice_status": "not_created_in_this_slice",
            "payment_instruction_status": "not_created_in_this_slice",
            "receipt_status": "not_recorded_in_this_slice",
            "bank_match_status": "not_connected_in_this_slice",
            "ledger_status": "not_written_in_this_slice",
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "admin_action_route_hint": route_hint(admin_route, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only local paid activity item. This does not create dues, "
                "create levies, create tickets, create travel fees, create contributions, "
                "create invoices, create payment instructions, record receipts, match bank "
                "events, write ledger entries, move money, create loans, issue TrustSlips, "
                "write Trust Passport entries, create marketplace records, create finance "
                "records, or expose private member activity."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    tree = [node_item(root) for root in children_by_parent.get(None, [])]
    non_root_items = [
        item for item in flat_nodes if item["node"]["parent_node_id"] is not None
    ]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["paid_activity_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if not non_root_items:
        primary_next_action = {
            "action_key": "map_operating_units_before_paid_activity",
            "label": "Map operating units before paid activity planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_payment_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_payment_exposure",
            "label": "Review public payment exposure",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_payment_steward", 0):
        primary_next_action = {
            "action_key": "assign_local_payment_stewards",
            "label": "Assign local payment stewards",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_payer_audience", 0):
        primary_next_action = {
            "action_key": "place_local_payer_audience",
            "label": "Place reachable members before local paid activity",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_paid_activity_policy", 0):
        primary_next_action = {
            "action_key": "add_local_paid_activity_policy",
            "label": "Add local paid activity policy",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_finance_review_signal", 0):
        primary_next_action = {
            "action_key": "record_finance_review_signal",
            "label": "Record reviewed dues, fee, or contribution signal",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue", requires_admin=True
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_local_paid_activity_readiness",
            "label": "Review local paid activity readiness",
            "route_hint": route_hint("/activity-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_paid_activity",
            "label": "Ask a Community Domain admin to review local paid activity",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
            "local_paid_activity_ready": status_counts.get(
                "local_paid_activity_ready", 0
            ),
            "public_payment_review_needed": status_counts.get(
                "public_payment_review_needed", 0
            ),
            "needs_payment_steward": status_counts.get(
                "needs_payment_steward", 0
            ),
            "needs_payer_audience": status_counts.get("needs_payer_audience", 0),
            "needs_paid_activity_policy": status_counts.get(
                "needs_paid_activity_policy", 0
            ),
            "needs_finance_review_signal": status_counts.get(
                "needs_finance_review_signal", 0
            ),
            "inactive": status_counts.get("inactive", 0),
            "dues_created": 0,
            "levies_created": 0,
            "tickets_created": 0,
            "travel_fees_created": 0,
            "contributions_created": 0,
            "invoices_created": 0,
            "payment_instructions_created": 0,
            "receipts_recorded": 0,
            "bank_matches_created": 0,
            "ledger_entries_written": 0,
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain node paid activity map is read-only local payment "
            "readiness planning. It shows whether branches, departments, classes, "
            "committees, chapters, lines, or other units have steward, payer audience, "
            "policy, and reviewed finance signals for future dues, levies, tickets, "
            "travel fees, contributions, or ROSCA-style activity. It does not create dues, "
            "create levies, create tickets, create travel fees, create contributions, "
            "create invoices, create payment instructions, record receipts, match bank "
            "events, write ledger entries, move money, create loans, issue TrustSlips, "
            "write Trust Passport entries, create marketplace records, create finance "
            "records, or expose private member activity."
        ),
    }


def _community_domain_governance_coverage_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    open_reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .all()
    )

    children_by_parent: dict[Optional[int], list[CommunityNode]] = {}
    nodes_by_id: dict[int, CommunityNode] = {}
    for node in nodes:
        node_id = int(node.id)
        nodes_by_id[node_id] = node
        parent_id = (
            int(node.parent_node_id) if node.parent_node_id is not None else None
        )
        children_by_parent.setdefault(parent_id, []).append(node)

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(node_id, []).append(policy)

    node_admin_counts: dict[int, int] = {}
    for membership in active_node_memberships:
        if _clean_role(membership.role) in NODE_ADMIN_ROLES:
            node_id = int(membership.community_node_id)
            node_admin_counts[node_id] = node_admin_counts.get(node_id, 0) + 1

    open_review_counts_by_node: dict[Optional[int], int] = {}
    for review in open_reviews:
        node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        open_review_counts_by_node[node_id] = (
            open_review_counts_by_node.get(node_id, 0) + 1
        )

    domain_policy_count = len(policies_by_node.get(None, []))

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def inherited_policy_count(node: CommunityNode) -> int:
        if node.parent_node_id is None or not bool(node.inherits_parent_policy):
            return 0
        total = domain_policy_count
        parent_id = int(node.parent_node_id)
        while parent_id in nodes_by_id:
            total += len(policies_by_node.get(parent_id, []))
            parent = nodes_by_id[parent_id]
            if parent.parent_node_id is None:
                break
            parent_id = int(parent.parent_node_id)
        return total

    def governance_status_for(
        node: CommunityNode,
        *,
        local_policy_count: int,
        inherited_count: int,
        local_admin_count: int,
    ) -> tuple[str, str, str]:
        if _clean_role(node.status, "inactive") != "active":
            return (
                "inactive",
                "Inactive operating unit. Reactivate or replace it before relying on governance here.",
                "/nodes/tree",
            )
        if node.parent_node_id is None:
            if local_policy_count > 0:
                return (
                    "domain_policy_present",
                    "Central domain governance policy is present.",
                    "/governance-model",
                )
            return (
                "needs_domain_policy",
                "Create at least one central governance policy before rollout depends on this domain.",
                "/policies",
            )
        if local_admin_count <= 0:
            return (
                "needs_local_admin",
                "Assign a local admin before delegated governance is reliable here.",
                "/roles",
            )
        if local_policy_count > 0:
            return (
                "governed_locally",
                "This unit has local admin coverage and its own active policy.",
                "/policies",
            )
        if inherited_count > 0:
            return (
                "governed_by_inheritance",
                "This unit has local admin coverage and inherits active parent/domain policy.",
                "/policies",
            )
        return (
            "needs_policy",
            "Add a local policy or allow policy inheritance before relying on this unit.",
            "/policies",
        )

    flat_nodes: list[dict[str, Any]] = []

    def node_item(node: CommunityNode) -> dict[str, Any]:
        node_id = int(node.id)
        child_nodes = children_by_parent.get(node_id, [])
        local_policy_count = (
            domain_policy_count
            if node.parent_node_id is None
            else len(policies_by_node.get(node_id, []))
        )
        inherited_count = inherited_policy_count(node)
        local_admin_count = node_admin_counts.get(node_id, 0)
        effective_policy_count = local_policy_count + inherited_count
        open_review_count = open_review_counts_by_node.get(node_id, 0)
        governance_status, next_step, admin_suffix = governance_status_for(
            node,
            local_policy_count=local_policy_count,
            inherited_count=inherited_count,
            local_admin_count=local_admin_count,
        )
        policy_route_suffix = (
            "/policies"
            if node.parent_node_id is None
            else f"/policies?community_node_id={node_id}"
        )
        item = {
            "node": _node_payload(node),
            "governance_status": governance_status,
            "ready_for_delegation": governance_status
            in {"domain_policy_present", "governed_locally", "governed_by_inheritance"},
            "local_policy_count": int(local_policy_count),
            "inherited_policy_count": int(inherited_count),
            "effective_policy_count": int(effective_policy_count),
            "inherits_parent_policy": bool(node.inherits_parent_policy),
            "local_admin_count": int(local_admin_count),
            "open_review_count": int(open_review_count),
            "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
            "policy_route_hint": route_hint(policy_route_suffix),
            "admin_action_route_hint": route_hint(admin_suffix, requires_admin=True),
            "next_step": next_step,
            "boundary": (
                "Read-only governance coverage item. This does not create policy, "
                "assign roles, create reviews, decide reviews, apply reviews, "
                "verify authority, move money, activate billing, publish a page, "
                "or expose private review payloads."
            ),
            "children": [node_item(child) for child in child_nodes],
        }
        flat_nodes.append({**item, "children": []})
        return item

    roots = children_by_parent.get(None, [])
    tree = [node_item(root) for root in roots]
    non_root_items = [item for item in flat_nodes if item["node"]["parent_node_id"] is not None]
    status_counts: dict[str, int] = {}
    for item in non_root_items:
        status = str(item["governance_status"])
        status_counts[status] = status_counts.get(status, 0) + 1

    if domain_policy_count <= 0:
        action_key = "create_domain_governance_policy"
        action_label = "Create central Community Domain governance policy"
        action_route = "/policies"
        action_admin = True
    elif status_counts.get("needs_local_admin", 0) > 0:
        action_key = "assign_local_governance_admins"
        action_label = "Assign local governance admins"
        action_route = "/roles"
        action_admin = True
    elif status_counts.get("needs_policy", 0) > 0:
        action_key = "add_local_governance_policy"
        action_label = "Add local governance policy where inheritance is not enough"
        action_route = "/policies"
        action_admin = True
    elif len(open_reviews) > 0:
        action_key = "review_governance_queue"
        action_label = "Review open Community Domain governance decisions"
        action_route = "/action-reviews/reviewer-queue"
        action_admin = True
    else:
        action_key = "review_governance_model"
        action_label = "Review Community Domain governance model"
        action_route = "/governance-model"
        action_admin = False

    if action_admin and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_complete_governance_coverage",
            "label": "Ask a Community Domain admin to complete governance coverage",
            "route_hint": None,
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": action_key,
            "label": action_label,
            "route_hint": route_hint(action_route),
            "requires_admin": bool(action_admin),
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "tree": tree,
        "flat_nodes": flat_nodes,
        "counts": {
            "nodes": len(nodes),
            "non_root_nodes": len(non_root_items),
            "active_policies": len(active_policies),
            "domain_policies": int(domain_policy_count),
            "node_scoped_policies": int(len(active_policies) - domain_policy_count),
            "open_reviews": len(open_reviews),
            "governed_locally": status_counts.get("governed_locally", 0),
            "governed_by_inheritance": status_counts.get(
                "governed_by_inheritance", 0
            ),
            "needs_local_admin": status_counts.get("needs_local_admin", 0),
            "needs_policy": status_counts.get("needs_policy", 0),
            "inactive": status_counts.get("inactive", 0),
        },
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Governance coverage is a read-only hierarchy projection. It does "
            "not create policy, assign roles, create reviews, decide reviews, "
            "apply reviews, verify legal or institutional authority, move money, "
            "activate billing, publish a public page, create marketplace activity, "
            "create a social Community, or expose private review payloads."
        ),
    }


def _community_domain_analytics_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .all()
    )
    node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .all()
    )
    policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )

    active_nodes = [
        node for node in nodes if _clean_role(node.status, "active") == "active"
    ]
    non_root_nodes = [node for node in nodes if node.parent_node_id is not None]
    active_domain_memberships = [
        row
        for row in domain_memberships
        if _clean_role(row.status, "active") == "active"
    ]
    active_node_memberships = [
        row
        for row in node_memberships
        if _clean_role(row.status, "active") == "active"
    ]
    active_policies = [
        row for row in policies if _clean_role(row.status, "active") == "active"
    ]
    open_reviews = [
        row
        for row in reviews
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    ]
    applied_reviews = [
        row for row in reviews if _clean_role(row.status, "pending") == "applied"
    ]

    node_kind_counts: dict[str, int] = {}
    node_status_counts: dict[str, int] = {}
    child_parent_ids: set[int] = set()
    max_depth = 0
    for node in nodes:
        kind = _clean_role(node.node_kind, "administrative")
        status = _clean_role(node.status, "active")
        node_kind_counts[kind] = node_kind_counts.get(kind, 0) + 1
        node_status_counts[status] = node_status_counts.get(status, 0) + 1
        max_depth = max(max_depth, int(node.depth or 0))
        if node.parent_node_id is not None:
            child_parent_ids.add(int(node.parent_node_id))

    role_counts: dict[str, int] = {}
    active_admin_count = 0
    for membership in active_domain_memberships:
        role = _clean_role(membership.role, "member")
        role_counts[role] = role_counts.get(role, 0) + 1
        if role in DOMAIN_ADMIN_ROLES:
            active_admin_count += 1

    node_role_counts: dict[str, int] = {}
    node_admin_count = 0
    nodes_with_member_ids: set[int] = set()
    nodes_with_admin_ids: set[int] = set()
    for membership in active_node_memberships:
        role = _clean_role(membership.role, "member")
        node_id = int(membership.community_node_id)
        node_role_counts[role] = node_role_counts.get(role, 0) + 1
        nodes_with_member_ids.add(node_id)
        if role in NODE_ADMIN_ROLES:
            node_admin_count += 1
            nodes_with_admin_ids.add(node_id)

    policy_scope_counts: dict[str, int] = {}
    policy_action_counts: dict[str, int] = {}
    node_policy_ids: set[int] = set()
    for policy in active_policies:
        scope = _clean_role(policy.scope_type, "domain")
        action = _clean_role(policy.action_key, "unknown")
        policy_scope_counts[scope] = policy_scope_counts.get(scope, 0) + 1
        policy_action_counts[action] = policy_action_counts.get(action, 0) + 1
        if policy.community_node_id is not None:
            node_policy_ids.add(int(policy.community_node_id))

    review_status_counts: dict[str, int] = {}
    review_action_counts: dict[str, int] = {}
    for review in reviews:
        status = _clean_role(review.status, "pending")
        action = _clean_role(review.action_key, "unknown")
        review_status_counts[status] = review_status_counts.get(status, 0) + 1
        review_action_counts[action] = review_action_counts.get(action, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    leaf_nodes = [
        node
        for node in non_root_nodes
        if int(node.id) not in child_parent_ids
    ]
    nodes_missing_admin = [
        node
        for node in non_root_nodes
        if _clean_role(node.status, "active") == "active"
        and int(node.id) not in nodes_with_admin_ids
    ]
    nodes_without_member_placement = [
        node
        for node in non_root_nodes
        if _clean_role(node.status, "active") == "active"
        and int(node.id) not in nodes_with_member_ids
    ]
    nodes_without_local_policy = [
        node
        for node in non_root_nodes
        if _clean_role(node.status, "active") == "active"
        and int(node.id) not in node_policy_ids
    ]

    analytics_lanes = [
        {
            "lane_key": "structure",
            "label": "Structure",
            "count": len(active_nodes),
            "state": "mapped" if len(non_root_nodes) > 0 else "root_only",
            "route_hint": route_hint("/rollout-tree"),
            "requires_admin": False,
            "boundary": (
                "Aggregate structure analytics only. This does not create nodes "
                "or expose private unit records."
            ),
        },
        {
            "lane_key": "membership",
            "label": "Membership",
            "count": len(active_domain_memberships),
            "state": "active_members_present" if active_domain_memberships else "empty",
            "route_hint": route_hint("/members", requires_admin=True),
            "requires_admin": True,
            "boundary": (
                "Aggregate membership analytics only. This does not expose member "
                "lists, private profiles, node placement details, or invite data."
            ),
        },
        {
            "lane_key": "local_admins",
            "label": "Local admins",
            "count": node_admin_count,
            "state": (
                "coverage_gap" if nodes_missing_admin else "covered"
            ),
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
            "boundary": (
                "Aggregate local-admin analytics only. This does not assign roles "
                "or grant governance authority."
            ),
        },
        {
            "lane_key": "governance",
            "label": "Governance",
            "count": len(active_policies),
            "state": "policy_present" if active_policies else "policy_needed",
            "route_hint": route_hint("/governance-coverage"),
            "requires_admin": False,
            "boundary": (
                "Aggregate governance analytics only. This does not create policy, "
                "decide reviews, or verify institutional authority."
            ),
        },
        {
            "lane_key": "reviews",
            "label": "Action reviews",
            "count": len(open_reviews),
            "state": "open" if open_reviews else "clear",
            "route_hint": route_hint("/action-reviews/reviewer-queue", requires_admin=True),
            "requires_admin": True,
            "boundary": (
                "Aggregate review analytics only. This does not expose private "
                "review payloads, comments, evidence, or decisions."
            ),
        },
        {
            "lane_key": "modules",
            "label": "Modules",
            "count": len(template["default_modules"]),
            "state": "template_projection",
            "route_hint": route_hint("/service-settings"),
            "requires_admin": False,
            "boundary": (
                "Template-module analytics only. This does not enable modules, "
                "activate billing, or persist service settings."
            ),
        },
        {
            "lane_key": "economic",
            "label": "Economic participation",
            "count": 0,
            "state": "not_metered_in_this_slice",
            "route_hint": route_hint("/economic-participation"),
            "requires_admin": False,
            "boundary": (
                "Economic analytics are not wired to live marketplace, shop, "
                "finance, demand, or spotlight tables in this slice."
            ),
        },
    ]

    if not active_domain_memberships:
        primary_next_action = {
            "action_key": "add_domain_members",
            "label": "Add Community Domain members before analytics can mean much",
            "route_hint": route_hint("/members", requires_admin=True),
            "requires_admin": True,
        }
    elif len(non_root_nodes) == 0:
        primary_next_action = {
            "action_key": "map_operating_structure",
            "label": "Map branches, lines, departments, or committees",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif nodes_missing_admin:
        primary_next_action = {
            "action_key": "assign_local_admins",
            "label": "Assign local admins where coverage is missing",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif not active_policies:
        primary_next_action = {
            "action_key": "create_governance_policy",
            "label": "Create governance policy before relying on analytics",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif open_reviews:
        primary_next_action = {
            "action_key": "review_open_governance_decisions",
            "label": "Review open governance decisions",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue", requires_admin=True
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_operating_map",
            "label": "Review Community Domain operating map",
            "route_hint": route_hint("/operating-map"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_analytics",
            "label": "Ask a Community Domain admin to review analytics gaps",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template["marketplace_role"], "optional"),
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "nodes": len(nodes),
            "active_nodes": len(active_nodes),
            "non_root_nodes": len(non_root_nodes),
            "leaf_nodes": len(leaf_nodes),
            "max_depth": int(max_depth),
            "active_members": len(active_domain_memberships),
            "active_domain_admins": int(active_admin_count),
            "active_node_memberships": len(active_node_memberships),
            "active_node_admins": int(node_admin_count),
            "active_policies": len(active_policies),
            "open_reviews": len(open_reviews),
            "applied_reviews": len(applied_reviews),
            "enabled_module_templates": len(template["default_modules"]),
        },
        "distribution": {
            "nodes_by_kind": node_kind_counts,
            "nodes_by_status": node_status_counts,
            "domain_members_by_role": role_counts,
            "node_members_by_role": node_role_counts,
            "policies_by_scope": policy_scope_counts,
            "policies_by_action": policy_action_counts,
            "reviews_by_status": review_status_counts,
            "reviews_by_action": review_action_counts,
        },
        "coverage_gaps": {
            "nodes_missing_local_admin": len(nodes_missing_admin),
            "nodes_without_member_placement": len(nodes_without_member_placement),
            "nodes_without_local_policy": len(nodes_without_local_policy),
        },
        "lanes": analytics_lanes,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain analytics is a read-only aggregate snapshot. It "
            "does not create nodes, add members, assign roles, create policy, "
            "decide reviews, apply reviews, verify legal or institutional "
            "authority, activate billing, meter live marketplace/shop/finance "
            "usage, publish a public page, create a social Community, move money, "
            "or expose private member, finance, evidence, or review records."
        ),
    }


def _community_domain_evidence_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    verification_status = _clean_role(domain.verification_status, "unverified")
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .all()
    )
    node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .all()
    )
    policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    evidence_rows = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .all()
    )

    active_domain_memberships = [
        row
        for row in domain_memberships
        if _clean_role(row.status, "active") == "active"
    ]
    active_node_memberships = [
        row
        for row in node_memberships
        if _clean_role(row.status, "active") == "active"
    ]
    active_policies = [
        row for row in policies if _clean_role(row.status, "active") == "active"
    ]
    active_evidence_rows = [
        row for row in evidence_rows if _clean_role(row.status, "active") == "active"
    ]
    open_reviews = [
        row
        for row in reviews
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    ]

    evidence_types: dict[str, int] = {}
    evidence_scope_counts = {"domain": 0, "node": 0}
    evidence_submitter_ids: set[int] = set()
    for evidence in active_evidence_rows:
        evidence_type = _clean_role(evidence.evidence_type, "document")
        evidence_types[evidence_type] = evidence_types.get(evidence_type, 0) + 1
        evidence_submitter_ids.add(int(evidence.submitted_by_user_id))
        if evidence.community_node_id is None:
            evidence_scope_counts["domain"] += 1
        else:
            evidence_scope_counts["node"] += 1

    domain_admin_count = sum(
        1
        for row in active_domain_memberships
        if _clean_role(row.role, "member") in DOMAIN_ADMIN_ROLES
    )
    node_admin_count = sum(
        1
        for row in active_node_memberships
        if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
    )
    node_ids_with_members = {
        int(row.community_node_id) for row in active_node_memberships
    }
    node_ids_with_admins = {
        int(row.community_node_id)
        for row in active_node_memberships
        if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
    }
    node_ids_with_policy = {
        int(row.community_node_id)
        for row in active_policies
        if row.community_node_id is not None
    }
    active_non_root_nodes = [
        node
        for node in nodes
        if node.parent_node_id is not None
        and _clean_role(node.status, "active") == "active"
    ]

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def lane(
        lane_key: str,
        label: str,
        state: str,
        count: int,
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "state": state,
            "count": int(count),
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "identity_anchor",
            "Identity anchor",
            "present" if _clean_str(domain.domain_name) else "missing",
            1 if _clean_str(domain.domain_name) else 0,
            "Review the Community Domain identity and public-safe naming.",
            route_suffix="/operating-map",
            requires_admin=False,
            boundary=(
                "Identity evidence is an internal domain anchor. It does not prove "
                "legal ownership, leadership, or external registration."
            ),
        ),
        lane(
            "authority_evidence",
            "Authority evidence",
            "verified" if verification_status == "verified" else verification_status,
            1 if verification_status == "verified" else 0,
            (
                "Keep authority evidence current."
                if verification_status == "verified"
                else "Prepare legal, representative, or institutional authority evidence."
            ),
            route_suffix="/verification-requirements",
            requires_admin=True,
            boundary=(
                "Authority evidence status is a readiness signal. This does not "
                "upload, accept, reject, verify, or publish authority evidence."
            ),
        ),
        lane(
            "membership_evidence",
            "Membership evidence",
            "present" if active_domain_memberships else "empty",
            len(active_domain_memberships),
            "Review active domain membership counts and placement coverage.",
            route_suffix="/members",
            requires_admin=True,
            boundary=(
                "Membership evidence is aggregate only. This does not expose member "
                "lists, private profiles, invite records, or individual evidence."
            ),
        ),
        lane(
            "node_membership_evidence",
            "Node membership evidence",
            "present" if active_node_memberships else "not_placed",
            len(active_node_memberships),
            "Review which branches, lines, departments, or committees have placements.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Node membership evidence is aggregate only. This does not expose "
                "private member placement rows."
            ),
        ),
        lane(
            "role_appointment_evidence",
            "Role appointment evidence",
            "present" if domain_admin_count or node_admin_count else "missing",
            domain_admin_count + node_admin_count,
            "Review domain and local role appointment coverage.",
            route_suffix="/roles",
            requires_admin=True,
            boundary=(
                "Role appointment evidence is aggregate only. This does not assign "
                "roles or grant governance authority."
            ),
        ),
        lane(
            "governance_evidence",
            "Governance evidence",
            "present" if active_policies else "policy_needed",
            len(active_policies),
            "Review policy and action-review coverage before public claims rely on it.",
            route_suffix="/governance-coverage",
            requires_admin=False,
            boundary=(
                "Governance evidence is aggregate only. This does not create policy, "
                "decide reviews, or expose private review payloads."
            ),
        ),
        lane(
            "review_evidence",
            "Review evidence",
            "present" if active_evidence_rows else "not_recorded",
            len(active_evidence_rows),
            "Attach evidence metadata to action reviews only when a real review needs it.",
            route_suffix="/action-reviews",
            requires_admin=True,
            boundary=(
                "Review evidence is counted as metadata only. This does not expose "
                "files, storage keys, comments, private evidence, or review payloads."
            ),
        ),
        lane(
            "public_safe_summary",
            "Public-safe summary",
            "profile_present" if _clean_str(domain.public_profile) else "not_ready",
            1 if _clean_str(domain.public_profile) else 0,
            "Review network presence before exposing public-safe domain evidence.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Public-safe summary is a readiness signal only. This does not "
                "publish a public page or finalize the public URL."
            ),
        ),
        lane(
            "trust_mobility",
            "Trust mobility",
            "not_connected_in_this_slice",
            0,
            "Domain-scoped Trust Passport, TrustSlip, and trust relay links are not wired here yet.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Trust mobility is not connected in this slice. This does not create "
                "TrustSlip, Trust Passport, credential, relay, or external proof records."
            ),
        ),
    ]

    if verification_status != "verified":
        primary_next_action = {
            "action_key": "prepare_authority_evidence",
            "label": "Prepare Community Domain authority evidence",
            "route_hint": route_hint("/verification-requirements", requires_admin=True),
            "requires_admin": True,
        }
    elif not active_domain_memberships:
        primary_next_action = {
            "action_key": "add_membership_evidence",
            "label": "Add members before evidence can represent the institution",
            "route_hint": route_hint("/members", requires_admin=True),
            "requires_admin": True,
        }
    elif active_non_root_nodes and not active_node_memberships:
        primary_next_action = {
            "action_key": "place_node_members",
            "label": "Place members into operating units",
            "route_hint": route_hint("/nodes/tree", requires_admin=True),
            "requires_admin": True,
        }
    elif not active_policies:
        primary_next_action = {
            "action_key": "define_evidence_policy",
            "label": "Define governance policy for evidence actions",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif not active_evidence_rows:
        primary_next_action = {
            "action_key": "record_review_evidence_when_needed",
            "label": "Record evidence metadata only when a real review needs it",
            "route_hint": route_hint("/action-reviews", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_network_presence",
            "label": "Review public-safe Community Domain evidence summary",
            "route_hint": route_hint("/network-presence"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_evidence",
            "label": "Ask a Community Domain admin to review evidence readiness",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "evidence_presets": template.get("evidence_presets", []),
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "verification_status": verification_status,
            "identity_anchor_present": bool(_clean_str(domain.domain_name)),
            "public_profile_present": bool(_clean_str(domain.public_profile)),
            "active_members": len(active_domain_memberships),
            "active_node_memberships": len(active_node_memberships),
            "domain_admin_appointments": int(domain_admin_count),
            "node_admin_appointments": int(node_admin_count),
            "active_policies": len(active_policies),
            "action_reviews": len(reviews),
            "open_reviews": len(open_reviews),
            "review_evidence_records": len(active_evidence_rows),
            "evidence_submitters": len(evidence_submitter_ids),
        },
        "distribution": {
            "evidence_by_type": evidence_types,
            "evidence_by_scope": evidence_scope_counts,
        },
        "coverage": {
            "nodes_with_member_evidence": len(node_ids_with_members),
            "nodes_with_admin_evidence": len(node_ids_with_admins),
            "nodes_with_policy_evidence": len(node_ids_with_policy),
            "active_non_root_nodes": len(active_non_root_nodes),
        },
        "lanes": lanes,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain evidence map is a read-only evidence readiness "
            "projection. It does not upload evidence, does not store files, "
            "does not expose files, does not expose storage keys, create member "
            "credentials, create TrustSlips, create Trust Passport entries, create "
            "trust relay paths, verify legal or institutional authority, publish a "
            "public page, move money, activate billing, create marketplace activity, "
            "create a social Community, or expose private member, finance, evidence, "
            "or review records."
        ),
    }


COMMUNITY_DOMAIN_EVIDENCE_RECORD_PRESETS: list[dict[str, Any]] = [
    {
        "record_type": "domain_registration",
        "label": "Domain registration",
        "subject_type": "community_domain",
        "issuer_type": "domain_admin",
        "required_scope": "domain",
        "markers": ("domain_registration", "domain.registration", "registration"),
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "owner_attestation",
        "label": "Owner attestation",
        "subject_type": "community_domain_owner",
        "issuer_type": "domain_owner",
        "required_scope": "domain",
        "markers": ("owner_attestation", "owner.attestation", "owner", "attestation"),
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "member_witness",
        "label": "Member witness",
        "subject_type": "domain_member",
        "issuer_type": "member_or_admin",
        "required_scope": "member",
        "markers": ("member_witness", "member.witness", "witness", "verification"),
        "requires_member": True,
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "role_appointment",
        "label": "Role appointment",
        "subject_type": "domain_or_node_role",
        "issuer_type": "domain_admin",
        "required_scope": "role",
        "markers": ("role_appointment", "role.appointment", "role", "admin"),
        "requires_admin_role": True,
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "department_membership",
        "label": "Department membership",
        "subject_type": "community_node_member",
        "issuer_type": "node_admin_or_domain_admin",
        "required_scope": "node",
        "markers": (
            "department_membership",
            "department.membership",
            "node_member",
            "membership",
        ),
        "requires_node": True,
        "requires_node_member": True,
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "meeting_record",
        "label": "Meeting record",
        "subject_type": "community_node_or_activity_group",
        "issuer_type": "meeting_admin",
        "required_scope": "node_or_future_activity_group",
        "markers": ("meeting_record", "meeting.record", "meeting", "attendance"),
        "requires_node": True,
        "requires_node_member": True,
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "shop_visibility_grant",
        "label": "Shop visibility grant",
        "subject_type": "shop_visibility",
        "issuer_type": "domain_admin",
        "required_scope": "domain_or_node",
        "markers": ("shop_visibility_grant", "shop.visibility", "shop", "vendor"),
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "spotlight_publication",
        "label": "Spotlight publication",
        "subject_type": "spotlight",
        "issuer_type": "domain_admin",
        "required_scope": "domain_or_node",
        "markers": ("spotlight_publication", "spotlight.publication", "spotlight"),
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "vault_access_grant",
        "label": "Vault access grant",
        "subject_type": "vault_access",
        "issuer_type": "domain_admin",
        "required_scope": "domain_or_node",
        "markers": ("vault_access_grant", "vault.access", "vault"),
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
    {
        "record_type": "trust_relay",
        "label": "Trust relay",
        "subject_type": "trust_context",
        "issuer_type": "domain_admin",
        "required_scope": "domain_or_member",
        "markers": ("trust_relay", "trust.relay", "trust", "passport"),
        "requires_member": True,
        "requires_policy": True,
        "requires_review": True,
        "requires_evidence": True,
    },
]


def _community_domain_evidence_record_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    active_nodes = [
        node for node in nodes if _clean_role(node.status, "active") == "active"
    ]
    active_non_root_nodes = [
        node for node in active_nodes if node.parent_node_id is not None
    ]
    active_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policy_rows = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    review_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    active_evidence_rows = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    domain_admin_count = sum(
        1
        for row in active_memberships
        if _clean_role(row.role, "member") in DOMAIN_ADMIN_ROLES
    )
    node_admin_count = sum(
        1
        for row in active_node_memberships
        if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
    )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def matches(markers: tuple[str, ...], value: Optional[str]) -> bool:
        candidate = _clean_str(value).lower()
        if not candidate:
            return False
        return any(marker in candidate for marker in markers)

    def count_matching_policies(markers: tuple[str, ...]) -> int:
        return sum(1 for row in active_policy_rows if matches(markers, row.action_key))

    def count_matching_reviews(markers: tuple[str, ...]) -> int:
        return sum(1 for row in review_rows if matches(markers, row.action_key))

    def count_matching_evidence(markers: tuple[str, ...]) -> int:
        return sum(
            1
            for row in active_evidence_rows
            if matches(markers, row.evidence_type)
            or matches(markers, getattr(row.action_review, "action_key", None))
        )

    evidence_type_counts: dict[str, int] = {}
    for row in active_evidence_rows:
        evidence_type = _clean_role(row.evidence_type, "document")
        evidence_type_counts[evidence_type] = evidence_type_counts.get(evidence_type, 0) + 1

    status_counts: dict[str, int] = {}
    record_types: list[dict[str, Any]] = []
    identity_present = bool(_clean_str(domain.domain_name))
    member_trace_present = len(active_memberships) > 1
    admin_trace_present = bool(domain_admin_count or node_admin_count)

    for preset in COMMUNITY_DOMAIN_EVIDENCE_RECORD_PRESETS:
        markers = tuple(str(marker).lower() for marker in preset["markers"])
        policy_count = count_matching_policies(markers)
        review_count = count_matching_reviews(markers)
        evidence_count = count_matching_evidence(markers)

        if not identity_present:
            status = "needs_domain_identity"
            next_step = "Review the Community Domain identity before durable records depend on it."
            admin_route = "/operating-map"
            ready = False
        elif preset.get("requires_node") and not active_non_root_nodes:
            status = "needs_operating_units"
            next_step = "Model branches, departments, lines, or units before this record type can be grounded."
            admin_route = "/rollout-tree"
            ready = False
        elif preset.get("requires_member") and not member_trace_present:
            status = "needs_member_trace"
            next_step = "Add active members before this record type can represent real community witness."
            admin_route = "/members"
            ready = False
        elif preset.get("requires_node_member") and not active_node_memberships:
            status = "needs_member_or_node_trace"
            next_step = "Place members into operating units before this record type can carry node-level truth."
            admin_route = "/node-participation-map"
            ready = False
        elif preset.get("requires_admin_role") and not admin_trace_present:
            status = "needs_role_trace"
            next_step = "Assign domain or local admins before this record type can prove role authority."
            admin_route = "/roles"
            ready = False
        elif preset.get("requires_policy") and policy_count == 0:
            status = "needs_evidence_policy"
            next_step = "Define policy for who may issue, review, or rely on this evidence record type."
            admin_route = "/governance-coverage"
            ready = False
        elif preset.get("requires_review") and review_count == 0:
            status = "needs_review_signal"
            next_step = "Run a real action-review signal before this record type is treated as ready."
            admin_route = "/action-reviews"
            ready = False
        elif preset.get("requires_evidence") and evidence_count == 0:
            status = "needs_review_evidence_metadata"
            next_step = "Attach private evidence metadata to the relevant action review before durable records exist."
            admin_route = "/action-reviews"
            ready = False
        else:
            status = "ready_for_future_evidence_record"
            next_step = "Keep this as planning readiness until a real CommunityDomainEvidenceRecord table exists."
            admin_route = "/evidence-map"
            ready = True

        status_counts[status] = status_counts.get(status, 0) + 1
        record_types.append(
            {
                "record_type": preset["record_type"],
                "label": preset["label"],
                "subject_type": preset["subject_type"],
                "issuer_type": preset["issuer_type"],
                "required_scope": preset["required_scope"],
                "readiness_status": status,
                "ready_for_future_evidence_record": bool(ready),
                "active_policy_count": admin_count(policy_count),
                "review_record_count": admin_count(review_count),
                "review_evidence_metadata_count": admin_count(evidence_count),
                "source_reference_status": (
                    "metadata_trace_present"
                    if evidence_count
                    else "not_recorded_in_this_slice"
                ),
                "validity_status": "not_calculated_in_this_slice",
                "visibility_policy_status": "not_persisted_in_this_slice",
                "evidence_record_status": "not_created_in_this_slice",
                "file_upload_status": "not_uploaded_in_this_slice",
                "storage_key_status": "not_exposed_in_this_slice",
                "credential_status": "not_issued_in_this_slice",
                "trustslip_status": "not_issued_in_this_slice",
                "trust_passport_status": "not_written_in_this_slice",
                "route_hint": route_hint(admin_route, requires_admin=True),
                "requires_admin": True,
                "next_step": next_step,
                "boundary": (
                    "This is a read-only durable evidence record readiness item. "
                    "It does not create CommunityDomainEvidenceRecord rows, upload files, "
                    "expose storage keys, calculate validity, persist "
                    "visibility policy, issue credentials, issue TrustSlips, "
                    "write Trust Passport entries, publish proof, or expose "
                    "private member evidence."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_evidence_records",
            "label": "Ask a Community Domain admin to review evidence record readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif status_counts.get("needs_domain_identity", 0):
        primary_next_action = {
            "action_key": "review_domain_identity",
            "label": "Review Community Domain identity before evidence records",
            "route_hint": route_hint("/operating-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_operating_units", 0):
        primary_next_action = {
            "action_key": "model_units_before_evidence_records",
            "label": "Model operating units before evidence records",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_member_trace", 0) or status_counts.get(
        "needs_member_or_node_trace", 0
    ):
        primary_next_action = {
            "action_key": "complete_member_trace_before_evidence_records",
            "label": "Complete member and unit placement before evidence records",
            "route_hint": route_hint("/member-verification-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_evidence_policy", 0):
        primary_next_action = {
            "action_key": "define_evidence_record_policy",
            "label": "Define policy for durable evidence records",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_review_signal", 0) or status_counts.get(
        "needs_review_evidence_metadata", 0
    ):
        primary_next_action = {
            "action_key": "review_evidence_record_signals",
            "label": "Review action signals and evidence metadata",
            "route_hint": route_hint("/action-reviews", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_evidence_record_boundaries",
            "label": "Review evidence record boundaries",
            "route_hint": route_hint("/evidence-map", requires_admin=True),
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "evidence_record_engine_status": "not_connected_in_this_slice",
            "evidence_records_created": 0,
            "files_uploaded": 0,
            "storage_keys_exposed": 0,
            "credentials_issued": 0,
            "trustslips_issued": 0,
            "trust_passport_entries_written": 0,
            "public_proofs_published": 0,
            "trust_records_created": 0,
            "record_type_count": len(record_types),
            "active_member_count": len(active_memberships),
            "active_node_count": len(active_non_root_nodes),
            "active_node_member_count": admin_count(len(active_node_memberships)),
            "active_policy_count": admin_count(len(active_policy_rows)),
            "review_record_count": admin_count(len(review_rows)),
            "review_evidence_metadata_count": admin_count(len(active_evidence_rows)),
        },
        "evidence_type_counts": evidence_type_counts if can_admin else None,
        "status_counts": status_counts,
        "record_types": record_types,
        "ready_total": sum(
            1 for item in record_types if item["ready_for_future_evidence_record"]
        ),
        "blocked_record_types": [
            item["record_type"]
            for item in record_types
            if not item["ready_for_future_evidence_record"]
        ],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain evidence-record readiness is read-only durable "
            "evidence planning. This endpoint does not create "
            "CommunityDomainEvidenceRecord rows, upload files, expose storage "
            "keys, calculate validity windows, persist visibility policy, issue "
            "credentials, issue TrustSlips, write Trust Passport entries, publish "
            "public proof, verify legal authority, move money, activate billing, "
            "create marketplace activity, create a social Community, or expose "
            "private member evidence or review payloads."
        ),
    }


COMMUNITY_DOMAIN_EVIDENCE_RELEASE_LANES: list[dict[str, Any]] = [
    {
        "lane_key": "public_safe_identity",
        "label": "Public-safe identity",
        "audience": "public",
        "route_suffix": "/network-presence",
        "requires_admin": False,
    },
    {
        "lane_key": "authority_currentness",
        "label": "Authority currentness",
        "audience": "public_or_external_verifier",
        "route_suffix": "/verification-requirements",
        "requires_admin": True,
    },
    {
        "lane_key": "release_policy",
        "label": "Release policy",
        "audience": "domain_admin",
        "route_suffix": "/governance-coverage",
        "requires_admin": True,
    },
    {
        "lane_key": "evidence_metadata",
        "label": "Evidence metadata",
        "audience": "domain_admin",
        "route_suffix": "/evidence-map",
        "requires_admin": True,
    },
    {
        "lane_key": "visibility_scope",
        "label": "Visibility scope",
        "audience": "members_or_public_safe_viewers",
        "route_suffix": "/record-privacy-map",
        "requires_admin": False,
    },
    {
        "lane_key": "review_currentness",
        "label": "Review currentness",
        "audience": "domain_admin",
        "route_suffix": "/action-reviews",
        "requires_admin": True,
    },
    {
        "lane_key": "dispute_and_revocation",
        "label": "Dispute and revocation",
        "audience": "domain_admin",
        "route_suffix": "/appeal-readiness",
        "requires_admin": True,
    },
    {
        "lane_key": "public_proof_shell",
        "label": "Public proof shell",
        "audience": "public",
        "route_suffix": "/network-presence",
        "requires_admin": True,
    },
    {
        "lane_key": "external_trust_relay",
        "label": "External trust relay",
        "audience": "external_domain_or_verifier",
        "route_suffix": "/trust-mobility",
        "requires_admin": True,
    },
]


def _community_domain_evidence_release_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    public_profile_present = bool(_clean_str(domain.public_profile))
    verification_status = _clean_role(domain.verification_status, "unverified")

    active_nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .filter(CommunityNode.status == "active")
        .all()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_rows = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    review_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    open_review_rows = [
        row
        for row in review_rows
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    ]
    active_evidence_rows = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    visibility_policy_counts: dict[str, int] = {}
    for node in active_nodes:
        key = _clean_role(node.visibility_policy, "members")
        visibility_policy_counts[key] = visibility_policy_counts.get(key, 0) + 1

    release_policy_markers = (
        "evidence.release",
        "evidence.publish",
        "public.proof",
        "proof.release",
        "trust.relay",
        "evidence.verify",
    )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def matches(value: Optional[str], markers: tuple[str, ...]) -> bool:
        candidate = _clean_str(value).lower()
        if not candidate:
            return False
        return any(marker in candidate for marker in markers)

    release_policy_count = sum(
        1 for row in active_policy_rows if matches(row.action_key, release_policy_markers)
    )
    release_review_count = sum(
        1 for row in review_rows if matches(row.action_key, release_policy_markers)
    )
    release_evidence_count = sum(
        1
        for row in active_evidence_rows
        if matches(row.evidence_type, release_policy_markers)
        or matches(getattr(row.action_review, "action_key", None), release_policy_markers)
    )

    status_by_lane = {
        "public_safe_identity": (
            "profile_present" if public_profile_present else "profile_needed"
        ),
        "authority_currentness": (
            "verified" if verification_status == "verified" else verification_status
        ),
        "release_policy": (
            "policy_present" if release_policy_count else "policy_needed"
        ),
        "evidence_metadata": (
            "metadata_present" if active_evidence_rows else "not_recorded"
        ),
        "visibility_scope": (
            "visibility_mapped" if visibility_policy_counts else "not_mapped"
        ),
        "review_currentness": (
            "open_reviews_need_attention"
            if open_review_rows
            else ("review_trace_present" if review_rows else "not_recorded")
        ),
        "dispute_and_revocation": "not_connected_in_this_slice",
        "public_proof_shell": "not_created_in_this_slice",
        "external_trust_relay": "not_connected_in_this_slice",
    }
    ready_by_lane = {
        "public_safe_identity": public_profile_present,
        "authority_currentness": verification_status == "verified",
        "release_policy": release_policy_count > 0,
        "evidence_metadata": bool(active_evidence_rows),
        "visibility_scope": bool(visibility_policy_counts),
        "review_currentness": bool(review_rows) and not bool(open_review_rows),
        "dispute_and_revocation": False,
        "public_proof_shell": False,
        "external_trust_relay": False,
    }
    count_by_lane: dict[str, Optional[int]] = {
        "public_safe_identity": 1 if public_profile_present else 0,
        "authority_currentness": 1 if verification_status == "verified" else 0,
        "release_policy": admin_count(release_policy_count),
        "evidence_metadata": admin_count(len(active_evidence_rows)),
        "visibility_scope": len(visibility_policy_counts),
        "review_currentness": admin_count(len(review_rows)),
        "dispute_and_revocation": 0,
        "public_proof_shell": 0,
        "external_trust_relay": 0,
    }
    next_step_by_lane = {
        "public_safe_identity": "Prepare public-safe wording before any evidence is shown outside the domain.",
        "authority_currentness": "Keep authority current before outsiders rely on institutional evidence.",
        "release_policy": "Define who may prepare, approve, or block evidence release.",
        "evidence_metadata": "Keep file and storage details private; expose only safe evidence summaries later.",
        "visibility_scope": "Review which units are public, member-visible, or admin-only before release.",
        "review_currentness": "Resolve open reviews before treating evidence as current for release.",
        "dispute_and_revocation": "Do not release proof without a future dispute and revocation path.",
        "public_proof_shell": "Do not publish public proof until an official document shell and URL decision exist.",
        "external_trust_relay": "Do not relay proof to outside domains until trust relay paths are real.",
    }

    lanes = []
    for preset in COMMUNITY_DOMAIN_EVIDENCE_RELEASE_LANES:
        lane_key = str(preset["lane_key"])
        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "audience": preset["audience"],
                "status": status_by_lane[lane_key],
                "ready": bool(ready_by_lane[lane_key]),
                "count": count_by_lane[lane_key],
                "route_hint": route_hint(
                    str(preset["route_suffix"]),
                    requires_admin=bool(preset["requires_admin"]),
                ),
                "requires_admin": bool(preset["requires_admin"]),
                "release_status": "not_released_in_this_slice",
                "currentness_status": (
                    "not_calculated_in_this_slice"
                    if lane_key in {"dispute_and_revocation", "public_proof_shell", "external_trust_relay"}
                    else status_by_lane[lane_key]
                ),
                "file_status": "not_exposed_in_this_slice",
                "public_url_status": "not_created_in_this_slice",
                "credential_status": "not_issued_in_this_slice",
                "trustslip_status": "not_issued_in_this_slice",
                "trust_passport_status": "not_written_in_this_slice",
                "next_step": next_step_by_lane[lane_key],
                "boundary": (
                    "Read-only evidence release readiness lane. This does not "
                    "release evidence, expose files, expose storage keys, publish "
                    "public proof, create URLs, create QR codes, issue credentials, "
                    "issue TrustSlips, write Trust Passport entries, share records "
                    "across domains, or change permissions."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_evidence_release",
            "label": "Ask a Community Domain admin to review evidence release readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not public_profile_present:
        primary_next_action = {
            "action_key": "prepare_public_safe_identity",
            "label": "Prepare public-safe identity before evidence release",
            "route_hint": route_hint("/network-presence", requires_admin=True),
            "requires_admin": True,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "prepare_authority_currentness",
            "label": "Prepare authority currentness before evidence release",
            "route_hint": route_hint("/verification-requirements", requires_admin=True),
            "requires_admin": True,
        }
    elif release_policy_count == 0:
        primary_next_action = {
            "action_key": "define_evidence_release_policy",
            "label": "Define evidence release policy",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif not active_evidence_rows:
        primary_next_action = {
            "action_key": "record_private_evidence_metadata",
            "label": "Record private evidence metadata before release planning",
            "route_hint": route_hint("/evidence-map", requires_admin=True),
            "requires_admin": True,
        }
    elif open_review_rows:
        primary_next_action = {
            "action_key": "resolve_open_release_reviews",
            "label": "Resolve open reviews before evidence release",
            "route_hint": route_hint("/action-reviews/reviewer-queue", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_release_boundaries",
            "label": "Review evidence release boundaries",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "evidence_release_engine_status": "not_connected_in_this_slice",
            "public_profile_present": public_profile_present,
            "verification_status": verification_status,
            "active_member_count": int(active_member_count),
            "visibility_policy_counts": visibility_policy_counts if can_admin else None,
            "active_policy_count": admin_count(len(active_policy_rows)),
            "release_policy_count": admin_count(release_policy_count),
            "review_record_count": admin_count(len(review_rows)),
            "open_review_count": admin_count(len(open_review_rows)),
            "release_review_count": admin_count(release_review_count),
            "active_evidence_count": admin_count(len(active_evidence_rows)),
            "release_evidence_count": admin_count(release_evidence_count),
            "evidence_releases_created": 0,
            "files_exposed": 0,
            "storage_keys_exposed": 0,
            "public_proofs_published": 0,
            "public_urls_created": 0,
            "qr_codes_created": 0,
            "credentials_issued": 0,
            "trustslips_issued": 0,
            "trust_passport_entries_written": 0,
            "cross_domain_shares_created": 0,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain evidence release readiness is read-only public-safe "
            "proof planning. This endpoint does not release evidence, expose "
            "files, expose storage keys, publish public proof, create public "
            "URLs, create QR codes, issue credentials, issue TrustSlips, write "
            "Trust Passport entries, share records across domains, create trust "
            "relay paths, verify legal authority, move money, activate billing, "
            "create marketplace activity, create a social Community, change "
            "permissions, or expose private member evidence or review payloads."
        ),
    }


COMMUNITY_DOMAIN_TRUST_RELAY_LANES: list[dict[str, Any]] = [
    {
        "lane_key": "source_domain_context",
        "label": "Source domain context",
        "route_suffix": "/network-presence",
        "requires_admin": False,
    },
    {
        "lane_key": "bridge_member_context",
        "label": "Bridge member context",
        "route_suffix": "/member-verification-map",
        "requires_admin": True,
    },
    {
        "lane_key": "destination_domain_signal",
        "label": "Destination domain signal",
        "route_suffix": "/affiliation-readiness",
        "requires_admin": True,
    },
    {
        "lane_key": "relay_policy",
        "label": "Relay policy",
        "route_suffix": "/governance-coverage",
        "requires_admin": True,
    },
    {
        "lane_key": "relay_review_signal",
        "label": "Relay review signal",
        "route_suffix": "/action-reviews",
        "requires_admin": True,
    },
    {
        "lane_key": "relay_evidence_currentness",
        "label": "Relay evidence currentness",
        "route_suffix": "/evidence-release-readiness",
        "requires_admin": True,
    },
    {
        "lane_key": "spotlight_repost_boundary",
        "label": "Spotlight repost boundary",
        "route_suffix": "/network-exchange-map",
        "requires_admin": True,
    },
    {
        "lane_key": "external_reader_boundary",
        "label": "External reader boundary",
        "route_suffix": "/record-privacy-map",
        "requires_admin": False,
    },
]


def _community_domain_trust_relay_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    verification_status = _clean_role(domain.verification_status, "unverified")
    public_profile_present = bool(_clean_str(domain.public_profile))

    active_member_rows = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_rows = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    review_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    open_review_rows = [
        row
        for row in review_rows
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    ]
    active_evidence_rows = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .all()
    )

    linked_clan_id = int(domain.clan_id) if domain.clan_id is not None else None
    outbound_affiliations: list[CommunityDomainAffiliation] = []
    inbound_affiliations: list[CommunityDomainAffiliation] = []
    if linked_clan_id is not None:
        outbound_affiliations = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.parent_clan_id == linked_clan_id)
            .all()
        )
        inbound_affiliations = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.affiliate_clan_id == linked_clan_id)
            .all()
        )
    approved_affiliation_count = sum(
        1
        for row in [*outbound_affiliations, *inbound_affiliations]
        if _clean_role(row.status, "pending") == "approved"
    )
    pending_affiliation_count = sum(
        1
        for row in [*outbound_affiliations, *inbound_affiliations]
        if _clean_role(row.status, "pending") == "pending"
    )

    relay_markers = (
        "trust.relay",
        "relay",
        "repost",
        "spotlight.relay",
        "external.trust",
    )

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def matches(value: Optional[str]) -> bool:
        candidate = _clean_str(value).lower()
        if not candidate:
            return False
        return any(marker in candidate for marker in relay_markers)

    relay_policy_count = sum(1 for row in active_policy_rows if matches(row.action_key))
    relay_review_rows = [row for row in review_rows if matches(row.action_key)]
    open_relay_review_count = sum(
        1
        for row in relay_review_rows
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    )
    relay_evidence_count = sum(
        1
        for row in active_evidence_rows
        if matches(row.evidence_type) or matches(getattr(row.action_review, "action_key", None))
    )

    active_member_count = len(active_member_rows)
    bridge_member_ready = active_member_count > 1 and int(active_node_member_count) > 0
    source_ready = public_profile_present and verification_status == "verified"
    destination_ready = approved_affiliation_count > 0

    status_by_lane = {
        "source_domain_context": (
            "source_ready"
            if source_ready
            else ("profile_needed" if not public_profile_present else verification_status)
        ),
        "bridge_member_context": (
            "bridge_candidates_present" if bridge_member_ready else "needs_bridge_member_trace"
        ),
        "destination_domain_signal": (
            "approved_affiliate_signal_present"
            if destination_ready
            else ("pending_affiliation_review" if pending_affiliation_count else "no_destination_signal")
        ),
        "relay_policy": "policy_present" if relay_policy_count else "policy_needed",
        "relay_review_signal": (
            "open_reviews_need_attention"
            if open_relay_review_count
            else ("review_trace_present" if relay_review_rows else "not_recorded")
        ),
        "relay_evidence_currentness": (
            "evidence_present" if relay_evidence_count else "not_recorded"
        ),
        "spotlight_repost_boundary": "not_connected_in_this_slice",
        "external_reader_boundary": "privacy_boundary_only",
    }
    ready_by_lane = {
        "source_domain_context": source_ready,
        "bridge_member_context": bridge_member_ready,
        "destination_domain_signal": destination_ready,
        "relay_policy": relay_policy_count > 0,
        "relay_review_signal": bool(relay_review_rows) and open_relay_review_count == 0,
        "relay_evidence_currentness": relay_evidence_count > 0,
        "spotlight_repost_boundary": False,
        "external_reader_boundary": True,
    }
    count_by_lane: dict[str, Optional[int]] = {
        "source_domain_context": 1 if source_ready else 0,
        "bridge_member_context": admin_count(active_member_count),
        "destination_domain_signal": admin_count(approved_affiliation_count),
        "relay_policy": admin_count(relay_policy_count),
        "relay_review_signal": admin_count(len(relay_review_rows)),
        "relay_evidence_currentness": admin_count(relay_evidence_count),
        "spotlight_repost_boundary": 0,
        "external_reader_boundary": 1,
    }
    next_step_by_lane = {
        "source_domain_context": "Prepare a verified public-safe source domain before trust can relay outward.",
        "bridge_member_context": "Confirm the member or local unit whose standing will bridge the trust context.",
        "destination_domain_signal": "Use approved affiliation context only as a planning signal until real destination-domain rows exist.",
        "relay_policy": "Define who may request, approve, block, or revoke a trust relay.",
        "relay_review_signal": "Resolve relay-related reviews before treating relay evidence as current.",
        "relay_evidence_currentness": "Keep evidence metadata private until a public-safe release and relay path exists.",
        "spotlight_repost_boundary": "Do not repost or relay Spotlight content until a real relay path is recorded.",
        "external_reader_boundary": "Keep external readers on public-safe summaries only.",
    }

    lanes = []
    for preset in COMMUNITY_DOMAIN_TRUST_RELAY_LANES:
        lane_key = str(preset["lane_key"])
        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "status": status_by_lane[lane_key],
                "ready": bool(ready_by_lane[lane_key]),
                "count": count_by_lane[lane_key],
                "route_hint": route_hint(
                    str(preset["route_suffix"]),
                    requires_admin=bool(preset["requires_admin"]),
                ),
                "requires_admin": bool(preset["requires_admin"]),
                "relay_path_status": "not_created_in_this_slice",
                "source_domain_status": (
                    "projected_current_domain" if lane_key == "source_domain_context" else "not_persisted_in_this_slice"
                ),
                "bridge_member_status": (
                    "aggregate_only" if lane_key == "bridge_member_context" else "not_persisted_in_this_slice"
                ),
                "destination_domain_status": (
                    "clan_affiliation_signal_only"
                    if lane_key == "destination_domain_signal"
                    else "not_persisted_in_this_slice"
                ),
                "spotlight_repost_status": "not_created_in_this_slice",
                "trustslip_status": "not_issued_in_this_slice",
                "trust_passport_status": "not_written_in_this_slice",
                "next_step": next_step_by_lane[lane_key],
                "boundary": (
                    "Read-only trust relay readiness lane. This does not create "
                    "relay path records, repost Spotlight, publish proof, create "
                    "cross-domain discovery, share private records, issue TrustSlips, "
                    "write Trust Passport entries, create credentials, create "
                    "marketplace activity, or move money."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_trust_relay",
            "label": "Ask a Community Domain admin to review trust relay readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not source_ready:
        primary_next_action = {
            "action_key": "prepare_source_domain_for_relay",
            "label": "Prepare source domain before trust relay",
            "route_hint": route_hint("/network-presence", requires_admin=True),
            "requires_admin": True,
        }
    elif not bridge_member_ready:
        primary_next_action = {
            "action_key": "prepare_bridge_member_trace",
            "label": "Prepare bridge member trace before trust relay",
            "route_hint": route_hint("/member-verification-map", requires_admin=True),
            "requires_admin": True,
        }
    elif not destination_ready:
        primary_next_action = {
            "action_key": "prepare_destination_domain_signal",
            "label": "Prepare destination-domain signal before trust relay",
            "route_hint": route_hint("/affiliation-readiness", requires_admin=True),
            "requires_admin": True,
        }
    elif relay_policy_count == 0:
        primary_next_action = {
            "action_key": "define_trust_relay_policy",
            "label": "Define trust relay policy",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif open_relay_review_count:
        primary_next_action = {
            "action_key": "resolve_open_trust_relay_reviews",
            "label": "Resolve open trust relay reviews",
            "route_hint": route_hint("/action-reviews/reviewer-queue", requires_admin=True),
            "requires_admin": True,
        }
    elif relay_evidence_count == 0:
        primary_next_action = {
            "action_key": "record_trust_relay_evidence_metadata",
            "label": "Record trust relay evidence metadata",
            "route_hint": route_hint("/evidence-release-readiness", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_trust_relay_boundaries",
            "label": "Review trust relay boundaries",
            "route_hint": route_hint("/network-exchange-map", requires_admin=True),
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "trust_relay_engine_status": "not_connected_in_this_slice",
            "source_domain_id": domain_id if can_admin else None,
            "source_domain_status": "projected_current_domain",
            "public_profile_present": public_profile_present,
            "verification_status": verification_status,
            "active_member_count": int(active_member_count),
            "active_node_member_count": admin_count(int(active_node_member_count)),
            "bridge_member_candidates": admin_count(active_member_count),
            "linked_social_community": bool(linked_clan_id is not None),
            "approved_destination_signals": admin_count(approved_affiliation_count),
            "pending_destination_signals": admin_count(pending_affiliation_count),
            "active_policy_count": admin_count(len(active_policy_rows)),
            "relay_policy_count": admin_count(relay_policy_count),
            "review_record_count": admin_count(len(review_rows)),
            "relay_review_count": admin_count(len(relay_review_rows)),
            "open_relay_review_count": admin_count(open_relay_review_count),
            "active_evidence_count": admin_count(len(active_evidence_rows)),
            "relay_evidence_count": admin_count(relay_evidence_count),
            "relay_paths_created": 0,
            "spotlight_reposts_created": 0,
            "cross_domain_discovery_created": 0,
            "trustslips_issued": 0,
            "trust_passport_entries_written": 0,
            "credentials_issued": 0,
            "public_proofs_published": 0,
            "marketplace_records_created": 0,
            "payments_moved": 0,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain trust relay readiness is read-only relay path "
            "planning. This endpoint does not create trust relay path records, "
            "record source-domain/bridge-member/destination-domain rows, repost "
            "Spotlight, publish proof, create cross-domain discovery, create "
            "public member directories, share private records, expose evidence "
            "files, expose storage keys, issue TrustSlips, write Trust Passport entries, "
            "create credentials, create marketplace activity, create "
            "affiliations, move money, activate billing, or expose private member, "
            "review, evidence, marketplace, or finance records."
        ),
    }


COMMUNITY_DOMAIN_NOTIFICATION_SCOPE_LANES: list[dict[str, Any]] = [
    {
        "lane_key": "domain_wide_audience",
        "label": "Domain-wide audience",
        "route_suffix": "/members",
        "requires_admin": True,
    },
    {
        "lane_key": "node_specific_audience",
        "label": "Node-specific audience",
        "route_suffix": "/node-participation-map",
        "requires_admin": False,
    },
    {
        "lane_key": "role_specific_audience",
        "label": "Role-specific audience",
        "route_suffix": "/roles",
        "requires_admin": True,
    },
    {
        "lane_key": "notification_scope_policy",
        "label": "Notification scope policy",
        "route_suffix": "/governance-coverage",
        "requires_admin": True,
    },
    {
        "lane_key": "reviewer_queue_notice",
        "label": "Reviewer queue notice",
        "route_suffix": "/action-reviews/reviewer-queue",
        "requires_admin": True,
    },
    {
        "lane_key": "invite_or_pending_member_audience",
        "label": "Invite or pending-member audience",
        "route_suffix": "/social-bridge",
        "requires_admin": True,
    },
    {
        "lane_key": "public_announcement_boundary",
        "label": "Public announcement boundary",
        "route_suffix": "/network-presence",
        "requires_admin": False,
    },
    {
        "lane_key": "emergency_notice_boundary",
        "label": "Emergency notice boundary",
        "route_suffix": "/governance-coverage",
        "requires_admin": True,
    },
    {
        "lane_key": "cross_domain_broadcast_boundary",
        "label": "Cross-domain broadcast boundary",
        "route_suffix": "/network-exchange-map",
        "requires_admin": True,
    },
]


def _community_domain_notification_scope_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    public_profile_present = bool(_clean_str(domain.public_profile))
    active_member_rows = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_node_rows = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .filter(CommunityNode.status == "active")
        .all()
    )
    active_node_member_rows = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policy_rows = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    review_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    open_review_rows = [
        row
        for row in review_rows
        if _clean_role(row.status, "pending")
        in {"pending", "pending_review", "needs_changes", "approved"}
    ]

    notification_markers = (
        "notification",
        "notice",
        "announcement",
        "communication",
        "reminder",
    )
    emergency_markers = ("emergency", "urgent", "safety", "alert")

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def matches_markers(values: list[Optional[str]], markers: tuple[str, ...]) -> bool:
        text = " ".join(_clean_str(value).lower() for value in values)
        return any(marker in text for marker in markers)

    domain_role_counts: dict[str, int] = {}
    for row in active_member_rows:
        role = _clean_role(row.role, "member")
        domain_role_counts[role] = domain_role_counts.get(role, 0) + 1

    node_role_counts: dict[str, int] = {}
    for row in active_node_member_rows:
        role = _clean_role(row.role, "member")
        node_role_counts[role] = node_role_counts.get(role, 0) + 1

    notification_policy_rows = [
        row
        for row in active_policy_rows
        if matches_markers(
            [row.policy_key, row.action_key, row.policy_summary, row.config_json],
            notification_markers,
        )
    ]
    emergency_policy_rows = [
        row
        for row in active_policy_rows
        if matches_markers(
            [row.policy_key, row.action_key, row.policy_summary, row.config_json],
            emergency_markers,
        )
    ]
    notification_review_rows = [
        row
        for row in review_rows
        if matches_markers(
            [
                row.action_key,
                row.target_type,
                row.request_note,
                row.decision_note,
                row.payload_json,
            ],
            notification_markers,
        )
    ]
    emergency_review_rows = [
        row
        for row in review_rows
        if matches_markers(
            [
                row.action_key,
                row.target_type,
                row.request_note,
                row.decision_note,
                row.payload_json,
            ],
            emergency_markers,
        )
    ]
    open_notification_review_count = sum(
        1 for row in notification_review_rows if row in open_review_rows
    )

    active_member_count = len(active_member_rows)
    active_node_count = len(active_node_rows)
    active_node_member_count = len(active_node_member_rows)
    non_root_node_count = sum(
        1 for row in active_node_rows if row.parent_node_id is not None
    )
    role_scope_ready = (
        len(domain_role_counts) > 1
        or len(node_role_counts) > 0
        or any(_clean_role(row.role, "member") in DOMAIN_ADMIN_ROLES for row in active_member_rows)
    )

    status_by_lane = {
        "domain_wide_audience": (
            "audience_present" if active_member_count > 1 else "owner_only_or_empty"
        ),
        "node_specific_audience": (
            "node_audience_mapped"
            if active_node_member_count
            else ("operating_units_missing" if non_root_node_count == 0 else "needs_node_members")
        ),
        "role_specific_audience": (
            "role_scope_mapped" if role_scope_ready else "needs_role_trace"
        ),
        "notification_scope_policy": (
            "policy_present" if notification_policy_rows else "policy_needed"
        ),
        "reviewer_queue_notice": (
            "open_reviews_need_attention"
            if open_notification_review_count
            else ("review_trace_present" if notification_review_rows else "not_recorded")
        ),
        "invite_or_pending_member_audience": "not_connected_in_this_slice",
        "public_announcement_boundary": (
            "public_profile_available" if public_profile_present else "profile_needed"
        ),
        "emergency_notice_boundary": (
            "emergency_policy_or_review_signal_present"
            if emergency_policy_rows or emergency_review_rows
            else "not_connected_in_this_slice"
        ),
        "cross_domain_broadcast_boundary": "not_connected_in_this_slice",
    }
    ready_by_lane = {
        "domain_wide_audience": active_member_count > 1,
        "node_specific_audience": active_node_member_count > 0,
        "role_specific_audience": role_scope_ready,
        "notification_scope_policy": bool(notification_policy_rows),
        "reviewer_queue_notice": bool(notification_review_rows)
        and open_notification_review_count == 0,
        "invite_or_pending_member_audience": False,
        "public_announcement_boundary": public_profile_present,
        "emergency_notice_boundary": bool(emergency_policy_rows or emergency_review_rows),
        "cross_domain_broadcast_boundary": False,
    }
    count_by_lane = {
        "domain_wide_audience": admin_count(active_member_count),
        "node_specific_audience": admin_count(active_node_member_count),
        "role_specific_audience": admin_count(
            len(domain_role_counts) + len(node_role_counts)
        ),
        "notification_scope_policy": admin_count(len(notification_policy_rows)),
        "reviewer_queue_notice": admin_count(len(notification_review_rows)),
        "invite_or_pending_member_audience": 0,
        "public_announcement_boundary": 1 if public_profile_present else 0,
        "emergency_notice_boundary": admin_count(
            len(emergency_policy_rows) + len(emergency_review_rows)
        ),
        "cross_domain_broadcast_boundary": 0,
    }
    next_step_by_lane = {
        "domain_wide_audience": "Confirm who belongs to the domain before any future domain-wide notice.",
        "node_specific_audience": "Use node membership and participation maps before any future local notice.",
        "role_specific_audience": "Keep role-based audiences tied to recorded domain or node roles.",
        "notification_scope_policy": "Define who may request, approve, send, block, or revoke scoped notices.",
        "reviewer_queue_notice": "Resolve notification-related reviews before treating notice scope as current.",
        "invite_or_pending_member_audience": "Do not target invitees or pending members until a real pending-member audience exists.",
        "public_announcement_boundary": "Keep public announcements on public-safe domain identity only.",
        "emergency_notice_boundary": "Define emergency or urgent notice boundaries before relying on them.",
        "cross_domain_broadcast_boundary": "Do not broadcast across domains until a real cross-domain audience and approval path exists.",
    }

    lanes = []
    for preset in COMMUNITY_DOMAIN_NOTIFICATION_SCOPE_LANES:
        lane_key = str(preset["lane_key"])
        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "status": status_by_lane[lane_key],
                "ready": bool(ready_by_lane[lane_key]),
                "count": count_by_lane[lane_key],
                "route_hint": route_hint(
                    str(preset["route_suffix"]),
                    requires_admin=bool(preset["requires_admin"]),
                ),
                "requires_admin": bool(preset["requires_admin"]),
                "notification_scope_record_status": "not_created_in_this_slice",
                "notification_job_status": "not_created_in_this_slice",
                "notification_delivery_status": "not_sent_in_this_slice",
                "audience_list_status": "not_created_in_this_slice",
                "public_announcement_status": "not_published_in_this_slice",
                "cross_domain_broadcast_status": "not_created_in_this_slice",
                "member_list_status": "not_exposed_in_this_slice",
                "next_step": next_step_by_lane[lane_key],
                "boundary": (
                    "Read-only notification scope lane. This does not send "
                    "notifications, create notification jobs, send emails, "
                    "send SMS, send WhatsApp messages, send push notifications, "
                    "create audience lists, publish public announcements, "
                    "create cross-domain broadcasts, expose member lists, "
                    "create marketplace records, or move money."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_notification_scope",
            "label": "Ask a Community Domain admin to review notification scope",
            "route_hint": None,
            "requires_admin": True,
        }
    elif active_member_count <= 1:
        primary_next_action = {
            "action_key": "confirm_domain_members_before_notifications",
            "label": "Confirm domain members before notification scope",
            "route_hint": route_hint("/members", requires_admin=True),
            "requires_admin": True,
        }
    elif non_root_node_count and active_node_member_count == 0:
        primary_next_action = {
            "action_key": "place_members_before_local_notices",
            "label": "Place members before local notice scope",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif not notification_policy_rows:
        primary_next_action = {
            "action_key": "define_notification_scope_policy",
            "label": "Define notification scope policy",
            "route_hint": route_hint("/governance-coverage", requires_admin=True),
            "requires_admin": True,
        }
    elif open_notification_review_count:
        primary_next_action = {
            "action_key": "resolve_open_notification_reviews",
            "label": "Resolve open notification reviews",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue", requires_admin=True
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_notification_boundaries",
            "label": "Review notification boundaries",
            "route_hint": route_hint("/node-communication-map", requires_admin=True),
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "notification_scope_engine_status": "not_connected_in_this_slice",
            "active_member_count": int(active_member_count),
            "active_node_count": int(active_node_count),
            "non_root_node_count": int(non_root_node_count),
            "active_node_member_count": admin_count(active_node_member_count),
            "domain_role_counts": domain_role_counts if can_admin else None,
            "node_role_counts": node_role_counts if can_admin else None,
            "active_policy_count": admin_count(len(active_policy_rows)),
            "notification_policy_count": admin_count(len(notification_policy_rows)),
            "emergency_policy_count": admin_count(len(emergency_policy_rows)),
            "review_record_count": admin_count(len(review_rows)),
            "notification_review_count": admin_count(len(notification_review_rows)),
            "open_notification_review_count": admin_count(
                open_notification_review_count
            ),
            "emergency_review_count": admin_count(len(emergency_review_rows)),
            "notification_scope_records_created": 0,
            "notification_jobs_created": 0,
            "notifications_sent": 0,
            "emails_sent": 0,
            "sms_sent": 0,
            "whatsapp_messages_sent": 0,
            "push_notifications_sent": 0,
            "audience_lists_created": 0,
            "public_announcements_published": 0,
            "cross_domain_broadcasts_created": 0,
            "member_lists_exposed": 0,
            "payments_moved": 0,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain notification scope readiness is read-only "
            "notification scope planning. It uses existing member, node, role, "
            "policy, and review signals to show future audience boundaries. It "
            "does not send notifications, create notification jobs, send emails, "
            "send SMS, send WhatsApp messages, send push notifications, create "
            "audience lists, publish public announcements, create cross-domain "
            "broadcasts, expose member lists, create marketplace records, move "
            "money, issue TrustSlips, write Trust Passport entries, or expose "
            "private member, review, evidence, marketplace, or finance records."
        ),
    }


def _community_domain_trust_mobility_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    verification_status = _clean_role(domain.verification_status, "unverified")
    domain_status = _clean_role(domain.status, "draft")
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    public_profile_present = bool(_clean_str(domain.public_profile))

    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .count()
    )
    review_evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )

    readiness_by_lane = {
        "identity_readiness": bool(_clean_str(domain.domain_name)),
        "authority_readiness": verification_status == "verified",
        "membership_trace": int(active_member_count) > 1,
        "governance_trace": int(active_policy_count) > 0,
        "evidence_trace": int(review_evidence_count) > 0,
        "public_presence": public_profile_present,
        "trustslip_bridge": False,
        "trust_passport_bridge": False,
        "external_relay": False,
    }
    status_by_lane = {
        "identity_readiness": (
            "present" if readiness_by_lane["identity_readiness"] else "missing"
        ),
        "authority_readiness": (
            "verified" if readiness_by_lane["authority_readiness"] else verification_status
        ),
        "membership_trace": (
            "member_base_present"
            if readiness_by_lane["membership_trace"]
            else "owner_only_or_empty"
        ),
        "governance_trace": (
            "policy_present" if readiness_by_lane["governance_trace"] else "policy_needed"
        ),
        "evidence_trace": (
            "metadata_present"
            if readiness_by_lane["evidence_trace"]
            else "not_recorded"
        ),
        "public_presence": (
            "profile_present"
            if readiness_by_lane["public_presence"]
            else "profile_needed"
        ),
        "trustslip_bridge": "not_connected_in_this_slice",
        "trust_passport_bridge": "not_connected_in_this_slice",
        "external_relay": "not_connected_in_this_slice",
    }
    count_by_lane = {
        "identity_readiness": 1 if readiness_by_lane["identity_readiness"] else 0,
        "authority_readiness": 1 if readiness_by_lane["authority_readiness"] else 0,
        "membership_trace": int(active_member_count),
        "governance_trace": int(active_policy_count),
        "evidence_trace": int(review_evidence_count),
        "public_presence": 1 if readiness_by_lane["public_presence"] else 0,
        "trustslip_bridge": 0,
        "trust_passport_bridge": 0,
        "external_relay": 0,
    }
    next_step_by_lane = {
        "identity_readiness": "Review the Community Domain identity anchor.",
        "authority_readiness": "Prepare authority verification before trust can travel.",
        "membership_trace": "Build a real member base before relying on portable trust.",
        "governance_trace": "Define governance policy before evidence can carry institutional weight.",
        "evidence_trace": "Record evidence metadata only through real action reviews.",
        "public_presence": "Prepare public-safe wording without publishing a page yet.",
        "trustslip_bridge": "Do not issue Community Domain TrustSlips until a dedicated bridge exists.",
        "trust_passport_bridge": "Do not write Community Domain evidence into Trust Passport until a dedicated bridge exists.",
        "external_relay": "Do not relay Community Domain proof outside GSN until release controls exist.",
    }

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    lanes = []
    for preset in COMMUNITY_DOMAIN_TRUST_MOBILITY_LANE_PRESETS:
        lane_key = preset["lane_key"]
        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "status": status_by_lane[lane_key],
                "ready": bool(readiness_by_lane[lane_key]),
                "count": int(count_by_lane[lane_key]),
                "route_hint": route_hint(
                    str(preset["route_suffix"]),
                    requires_admin=bool(preset["requires_admin"]),
                ),
                "requires_admin": bool(preset["requires_admin"]),
                "next_step": next_step_by_lane[lane_key],
                "boundary": (
                    "Read-only trust mobility lane. This does not create "
                    "TrustSlips, write Trust Passport entries, create credentials, "
                    "create relay paths, release evidence, publish proof, verify "
                    "authority, move money, or expose private member, finance, "
                    "evidence, or review records."
                ),
            }
        )

    if verification_status != "verified":
        primary_next_action = {
            "action_key": "prepare_authority_verification",
            "label": "Prepare authority verification before trust mobility",
            "route_hint": route_hint("/verification-requirements", requires_admin=True),
            "requires_admin": True,
        }
    elif not public_profile_present:
        primary_next_action = {
            "action_key": "complete_public_safe_summary",
            "label": "Complete the public-safe Community Domain summary",
            "route_hint": route_hint("", requires_admin=True),
            "requires_admin": True,
        }
    elif int(active_member_count) <= 1:
        primary_next_action = {
            "action_key": "add_membership_trace",
            "label": "Add members before institutional trust can travel",
            "route_hint": route_hint("/members", requires_admin=True),
            "requires_admin": True,
        }
    elif int(active_policy_count) == 0:
        primary_next_action = {
            "action_key": "define_governance_trace",
            "label": "Define governance policy before trust mobility",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif int(review_evidence_count) == 0:
        primary_next_action = {
            "action_key": "record_review_evidence_metadata",
            "label": "Record review evidence metadata before portability claims",
            "route_hint": route_hint("/action-reviews", requires_admin=True),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_trust_mobility_boundaries",
            "label": "Review trust mobility boundaries before any release design",
            "route_hint": route_hint("/network-presence"),
            "requires_admin": False,
        }

    if primary_next_action["requires_admin"] and not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_prepare_trust_mobility",
            "label": "Ask a Community Domain admin to prepare trust mobility",
            "route_hint": None,
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template["marketplace_role"], "optional"),
        },
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "domain_status": domain_status,
            "verification_status": verification_status,
            "public_profile_present": public_profile_present,
            "active_members": int(active_member_count),
            "active_node_memberships": int(active_node_member_count),
            "active_policies": int(active_policy_count),
            "open_reviews": int(open_review_count),
            "review_evidence_records": int(review_evidence_count),
            "trust_slips": 0,
            "trust_passport_entries": 0,
            "relay_paths": 0,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain trust mobility is read-only portability planning. "
            "This endpoint does not create TrustSlips, write Trust Passport "
            "entries, create credentials, create trust relay paths, release "
            "evidence, expose files, expose storage keys, verify legal or "
            "institutional authority, publish proof, create outward links, move "
            "money, activate billing, activate the Community Domain, create "
            "marketplace activity, create a social Community, or expose private "
            "member, finance, evidence, or review records."
        ),
    }


def _community_domain_subscription_lifecycle_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    domain_status = _clean_role(domain.status, "draft")
    verification_status = _clean_role(domain.verification_status, "unverified")
    quote = _community_domain_package_quote_payload(domain)

    status_by_lane = {
        "quote_preview": quote["quote_status"],
        "pricing_confirmation": quote["pricing_status"],
        "payment_instruction": "not_created_in_this_slice",
        "payment_confirmation": "not_recorded_in_this_slice",
        "billing_activation": (
            "domain_marked_active_but_billing_not_metered"
            if domain_status == "active"
            else "not_active"
        ),
        "subscription_period": "not_configured",
        "renewal_policy": quote["renewal_policy"]["status"],
        "suspension_reactivation": "not_enforced_in_this_slice",
    }
    ready_by_lane = {
        "quote_preview": True,
        "pricing_confirmation": False,
        "payment_instruction": False,
        "payment_confirmation": False,
        "billing_activation": False,
        "subscription_period": False,
        "renewal_policy": False,
        "suspension_reactivation": False,
    }
    next_step_by_lane = {
        "quote_preview": "Review the manual pilot quote with the Community Domain owner.",
        "pricing_confirmation": "Confirm final price, currency, billing cycle, and renewal terms before payment instruction.",
        "payment_instruction": "Create payment instructions only through a dedicated future billing flow.",
        "payment_confirmation": "Record payment only after a real bank match, receipt, or approved finance review exists.",
        "billing_activation": "Activate billing only after pricing and payment confirmation are real.",
        "subscription_period": "Define start date, expiry date, grace period, and entitlement scope before renewal logic.",
        "renewal_policy": "Define renewal notice, approval, price, grace, and expiry rules before relying on renewal.",
        "suspension_reactivation": "Define suspension and reactivation rules before enforcing domain lifecycle restrictions.",
    }

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    lanes = []
    for preset in COMMUNITY_DOMAIN_SUBSCRIPTION_LIFECYCLE_PRESETS:
        lane_key = preset["lane_key"]
        lanes.append(
            {
                "lane_key": lane_key,
                "label": preset["label"],
                "summary": preset["summary"],
                "status": status_by_lane[lane_key],
                "ready": bool(ready_by_lane[lane_key]),
                "route_hint": route_hint(
                    str(preset["route_suffix"]),
                    requires_admin=bool(preset["requires_admin"]),
                ),
                "requires_admin": bool(preset["requires_admin"]),
                "next_step": next_step_by_lane[lane_key],
                "boundary": (
                    "Read-only subscription lifecycle lane. This does not create "
                    "a quote acceptance, payment instruction, expected payment, "
                    "invoice, receipt, billing account, entitlement, renewal, "
                    "suspension, reactivation, or payment confirmation."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_subscription",
            "label": "Ask a Community Domain admin to review subscription setup",
            "route_hint": None,
            "requires_admin": True,
        }
    elif quote["pricing_status"] != "confirmed":
        primary_next_action = {
            "action_key": "review_manual_quote",
            "label": "Review manual Community Domain package quote",
            "route_hint": f"/community-domains/{domain_id}/package-quote",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_activation_requirements",
            "label": "Review activation requirements before billing",
            "route_hint": f"/community-domains/{domain_id}/activation-requirements",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "package": {
            "package_code": quote["package_code"],
            "package_name": quote["package_name"],
            "quote_status": quote["quote_status"],
            "pricing_status": quote["pricing_status"],
            "billing_cycle": quote["billing_cycle"],
            "price_amount": quote["price_amount"],
            "currency": quote["currency"],
            "limits": quote["limits"],
        },
        "summary": {
            "domain_status": domain_status,
            "verification_status": verification_status,
            "billing_status": "not_metered_in_this_slice",
            "subscription_status": "not_configured",
            "payment_instruction_status": status_by_lane["payment_instruction"],
            "payment_confirmation_status": status_by_lane["payment_confirmation"],
            "renewal_status": status_by_lane["renewal_policy"],
            "next_billing_at": None,
            "subscription_started_at": None,
            "subscription_expires_at": None,
            "grace_period_days": None,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain subscription lifecycle is read-only billing planning. "
            "This endpoint does not create a quote acceptance, create a payment "
            "instruction, create an expected payment, record payment, confirm "
            "payment, create an invoice, create a receipt, activate billing, "
            "activate the Community Domain, create entitlements, renew a domain, "
            "suspend a domain, reactivate a domain, verify authority, move money, "
            "or expose private finance, member, evidence, or review records."
        ),
    }


def _community_domain_social_bridge_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    linked_clan: Optional[Clan] = None
    if domain.clan_id is not None:
        linked_clan = db.get(Clan, int(domain.clan_id))

    linked = linked_clan is not None
    linked_clan_id = int(linked_clan.id) if linked_clan is not None else None
    linked_member_count = 0
    outbound_affiliation_count = 0
    inbound_affiliation_count = 0
    active_affiliation_count = 0
    pending_affiliation_count = 0

    if linked_clan_id is not None:
        linked_member_count = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == linked_clan_id)
            .count()
        )
        outbound_rows = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.parent_clan_id == linked_clan_id)
            .all()
        )
        inbound_rows = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.affiliate_clan_id == linked_clan_id)
            .all()
        )
        outbound_affiliation_count = len(outbound_rows)
        inbound_affiliation_count = len(inbound_rows)
        all_rows = [*outbound_rows, *inbound_rows]
        active_affiliation_count = sum(
            1 for row in all_rows if _clean_role(row.status, "pending") == "approved"
        )
        pending_affiliation_count = sum(
            1 for row in all_rows if _clean_role(row.status, "pending") == "pending"
        )

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: int,
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": int(count),
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "concept_separation",
            "Community and Community Domain separation",
            "separated",
            True,
            2,
            "Keep free social Community and institutional Community Domain as separate product objects.",
            route_suffix="/operating-map",
            requires_admin=False,
            boundary=(
                "Concept separation only. This does not merge Community and "
                "Community Domain records."
            ),
        ),
        lane(
            "linked_social_community",
            "Linked social Community",
            "linked" if linked else "not_linked",
            linked,
            1 if linked else 0,
            (
                "Review the existing social Community bridge."
                if linked
                else "Decide later whether this Community Domain should be linked to an existing social Community."
            ),
            route_suffix="/network-presence",
            requires_admin=True,
            boundary=(
                "Social bridge status only. This does not create a social "
                "Community, set clan_id, link records, or move members."
            ),
        ),
        lane(
            "upgrade_existing_community",
            "Upgrade existing Community path",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not present upgrade as live until a dedicated upgrade flow exists.",
            route_suffix="/subscription-lifecycle",
            requires_admin=True,
            boundary=(
                "Upgrade path is not connected. This does not convert a Clan, "
                "Community, or marketplace into a Community Domain."
            ),
        ),
        lane(
            "affiliation_spine",
            "Affiliation spine",
            (
                "clan_affiliations_visible"
                if linked and (outbound_affiliation_count or inbound_affiliation_count)
                else "not_domain_linked"
            ),
            False,
            outbound_affiliation_count + inbound_affiliation_count,
            "Treat existing CommunityDomainAffiliation rows as clan-to-clan only until a domain affiliation bridge is designed.",
            route_suffix="/network-presence",
            requires_admin=True,
            boundary=(
                "Affiliation spine is read-only here. This does not create, "
                "approve, reject, or apply CommunityDomainAffiliation rows."
            ),
        ),
        lane(
            "membership_alignment",
            "Membership alignment",
            "counted" if linked else "not_evaluated",
            linked,
            linked_member_count if can_admin else 0,
            "Compare social Community membership with domain membership only after a dedicated alignment flow exists.",
            route_suffix="/members",
            requires_admin=True,
            boundary=(
                "Membership alignment is aggregate only. This does not copy, "
                "invite, approve, remove, or expose member lists."
            ),
        ),
        lane(
            "marketplace_context",
            "Marketplace context",
            "not_created_in_this_slice",
            False,
            0,
            "Keep marketplace entry under the existing Marketplace/community flow until a bridge is deliberately designed.",
            route_suffix="/economic-participation",
            requires_admin=False,
            boundary=(
                "Marketplace context is planning only. This does not create "
                "marketplace activity or move existing marketplace records."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_social_bridge",
            "label": "Ask a Community Domain admin to review the social Community bridge",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not linked:
        primary_next_action = {
            "action_key": "plan_social_bridge",
            "label": "Decide whether this Community Domain needs a social Community bridge",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_social_bridge_boundaries",
            "label": "Review social Community bridge boundaries",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "linked_community": {
            "linked": bool(linked),
            "id": linked_clan_id if can_admin else None,
            "name": linked_clan.name if linked_clan is not None and can_admin else None,
            "status": (
                linked_clan.status
                if linked_clan is not None and can_admin
                else ("hidden_for_member" if linked else "not_linked")
            ),
            "community_code": (
                linked_clan.community_code
                if linked_clan is not None and can_admin
                else None
            ),
            "member_count": int(linked_member_count) if can_admin and linked else None,
        },
        "summary": {
            "bridge_status": "linked" if linked else "not_linked",
            "domain_clan_id_present": bool(domain.clan_id is not None),
            "upgrade_path_status": "not_connected_in_this_slice",
            "affiliation_spine_status": "clan_to_clan_only",
            "linked_member_count": int(linked_member_count) if can_admin and linked else None,
            "outbound_affiliations": (
                int(outbound_affiliation_count) if can_admin and linked else None
            ),
            "inbound_affiliations": (
                int(inbound_affiliation_count) if can_admin and linked else None
            ),
            "active_affiliations": (
                int(active_affiliation_count) if can_admin and linked else None
            ),
            "pending_affiliations": (
                int(pending_affiliation_count) if can_admin and linked else None
            ),
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain social bridge is read-only relationship planning. "
            "This endpoint does not create a social Community, upgrade an "
            "existing Community, set clan_id, create affiliations, decide "
            "affiliations, copy members, invite members, move marketplace "
            "activity, activate billing, verify authority, merge Community and "
            "Community Domain records, or expose private member records."
        ),
    }


def _community_domain_affiliation_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    linked_clan: Optional[Clan] = None
    if domain.clan_id is not None:
        linked_clan = db.get(Clan, int(domain.clan_id))

    linked_clan_id = int(linked_clan.id) if linked_clan is not None else None
    outbound_rows: list[CommunityDomainAffiliation] = []
    inbound_rows: list[CommunityDomainAffiliation] = []
    if linked_clan_id is not None:
        outbound_rows = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.parent_clan_id == linked_clan_id)
            .order_by(CommunityDomainAffiliation.id.asc())
            .all()
        )
        inbound_rows = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.affiliate_clan_id == linked_clan_id)
            .order_by(CommunityDomainAffiliation.id.asc())
            .all()
        )

    all_rows = [*outbound_rows, *inbound_rows]
    status_counts: dict[str, int] = {}
    direction_counts = {"outbound_child_links": 0, "inbound_parent_links": 0}
    for row in outbound_rows:
        status = _clean_role(row.status, "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
        if status == "approved":
            direction_counts["outbound_child_links"] += 1
    for row in inbound_rows:
        status = _clean_role(row.status, "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
        if status == "approved":
            direction_counts["inbound_parent_links"] += 1

    pending_count = int(status_counts.get("pending", 0))
    approved_count = int(status_counts.get("approved", 0))
    rejected_count = int(status_counts.get("rejected", 0))

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "social_community_anchor",
            "Social Community anchor",
            "linked" if linked_clan_id is not None else "not_linked",
            linked_clan_id is not None,
            1 if linked_clan_id is not None else 0,
            (
                "Use the linked social Community only as the current affiliation anchor."
                if linked_clan_id is not None
                else "Linking to a social Community must remain a separate reviewed bridge."
            ),
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "Anchor signal only. This does not set clan_id, create a social "
                "Community, upgrade a Community, copy members, or merge records."
            ),
        ),
        lane(
            "outbound_child_affiliates",
            "Outbound child affiliates",
            (
                "active_child_affiliates"
                if direction_counts["outbound_child_links"]
                else "none"
            ),
            bool(direction_counts["outbound_child_links"]),
            admin_count(direction_counts["outbound_child_links"]),
            "Treat approved outbound clan affiliations as child-affiliate signals only.",
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "Child-affiliate signal only. This does not create child "
                "Community Domains, affiliate links, public URLs, billing, "
                "member transfer, or governance authority."
            ),
        ),
        lane(
            "inbound_parent_affiliates",
            "Inbound parent affiliates",
            (
                "active_parent_affiliates"
                if direction_counts["inbound_parent_links"]
                else "none"
            ),
            bool(direction_counts["inbound_parent_links"]),
            admin_count(direction_counts["inbound_parent_links"]),
            "Treat approved inbound clan affiliations as parent-domain signals only.",
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "Parent-affiliate signal only. This does not assign a parent "
                "Community Domain, inherit policy, activate billing, verify "
                "authority, or change member visibility."
            ),
        ),
        lane(
            "pending_affiliation_reviews",
            "Pending affiliation reviews",
            "pending_review_needed" if pending_count else "clear",
            pending_count == 0,
            admin_count(pending_count),
            "Review pending clan affiliation requests before treating affiliation as settled.",
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "Pending-review signal only. This does not approve, reject, "
                "decide, revise, or notify affiliation requests."
            ),
        ),
        lane(
            "rejected_affiliation_history",
            "Rejected affiliation history",
            "history_present" if rejected_count else "clear",
            rejected_count == 0,
            admin_count(rejected_count),
            "Keep rejected affiliation history separate from live parent or child authority.",
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "History signal only. This does not reopen, erase, override, "
                "or publish rejected affiliation decisions."
            ),
        ),
        lane(
            "domain_affiliation_engine",
            "Domain affiliation engine",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not represent clan-to-clan affiliation rows as a real domain-domain engine yet.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Engine boundary only. This does not create domain-domain "
                "affiliation records, domain hierarchy, child domains, parent "
                "domains, inherited policy, analytics rollups, or public proof."
            ),
        ),
        lane(
            "privacy_boundary",
            "Affiliation privacy boundary",
            "member_safe_projection",
            True,
            1,
            "Keep affiliate details admin-scoped until public-safe release rules exist.",
            route_suffix="/record-privacy-map",
            requires_admin=False,
            boundary=(
                "Privacy boundary only. This does not expose member lists, node "
                "rosters, private evidence, finance records, marketplace records, "
                "or affiliate private records."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_affiliations",
            "label": "Ask a Community Domain admin to review affiliation readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif linked_clan_id is None:
        primary_next_action = {
            "action_key": "review_social_bridge_before_affiliations",
            "label": "Review social Community bridge before affiliation readiness",
            "route_hint": f"/community-domains/{domain_id}/social-bridge",
            "requires_admin": True,
        }
    elif pending_count:
        primary_next_action = {
            "action_key": "review_pending_affiliation_requests",
            "label": "Review pending affiliation requests",
            "route_hint": f"/community-domains/{domain_id}/social-bridge",
            "requires_admin": True,
        }
    elif approved_count:
        primary_next_action = {
            "action_key": "review_affiliation_boundaries",
            "label": "Review parent and child affiliation boundaries",
            "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "prepare_affiliation_design",
            "label": "Prepare affiliation design before parent or child rollout",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }

    clan_ids = {
        int(row.parent_clan_id) for row in all_rows
    } | {int(row.affiliate_clan_id) for row in all_rows}
    clans_by_id: dict[int, Clan] = {}
    if clan_ids and can_admin:
        clans_by_id = {
            int(clan.id): clan
            for clan in db.query(Clan).filter(Clan.id.in_(clan_ids)).all()
        }

    def affiliation_payload(
        row: CommunityDomainAffiliation,
        *,
        direction: str,
    ) -> dict[str, Any]:
        parent = clans_by_id.get(int(row.parent_clan_id))
        affiliate = clans_by_id.get(int(row.affiliate_clan_id))
        return {
            "id": int(row.id),
            "direction": direction,
            "status": _clean_role(row.status, "pending"),
            "parent_clan_id": int(row.parent_clan_id),
            "affiliate_clan_id": int(row.affiliate_clan_id),
            "parent_name": parent.name if parent is not None else None,
            "affiliate_name": affiliate.name if affiliate is not None else None,
            "parent_community_code": (
                parent.community_code if parent is not None else None
            ),
            "affiliate_community_code": (
                affiliate.community_code if affiliate is not None else None
            ),
            "record_status": "read_only_existing_clan_affiliation",
            "domain_affiliation_status": "not_created_in_this_slice",
            "public_url_status": "not_published_in_this_slice",
            "member_transfer_status": "not_transferred_in_this_slice",
            "billing_status": "not_activated_in_this_slice",
            "boundary": (
                "Existing clan-affiliation row only. This does not create a "
                "Community Domain affiliation, parent domain, child domain, "
                "public URL, billing relationship, inherited policy, or member "
                "transfer."
            ),
        }

    flat_affiliations: list[dict[str, Any]] = []
    if can_admin:
        flat_affiliations = [
            *[
                affiliation_payload(row, direction="outbound_child")
                for row in outbound_rows
            ],
            *[
                affiliation_payload(row, direction="inbound_parent")
                for row in inbound_rows
            ],
        ]

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "linked_community": {
            "linked": bool(linked_clan_id is not None),
            "id": linked_clan_id if can_admin else None,
            "name": linked_clan.name if linked_clan is not None and can_admin else None,
            "community_code": (
                linked_clan.community_code
                if linked_clan is not None and can_admin
                else None
            ),
            "status": (
                linked_clan.status
                if linked_clan is not None and can_admin
                else ("hidden_for_member" if linked_clan is not None else "not_linked")
            ),
        },
        "summary": {
            "bridge_status": "linked" if linked_clan_id is not None else "not_linked",
            "domain_affiliation_engine_status": "clan_affiliation_projection_only",
            "domain_affiliation_records_created": 0,
            "parent_domain_records_created": 0,
            "child_domain_records_created": 0,
            "public_urls_published": 0,
            "members_transferred": 0,
            "billing_relationships_activated": 0,
            "outbound_affiliations": admin_count(len(outbound_rows)),
            "inbound_affiliations": admin_count(len(inbound_rows)),
            "approved_affiliations": admin_count(approved_count),
            "pending_affiliations": admin_count(pending_count),
            "rejected_affiliations": admin_count(rejected_count),
            "effective_child_links": admin_count(
                direction_counts["outbound_child_links"]
            ),
            "effective_parent_links": admin_count(
                direction_counts["inbound_parent_links"]
            ),
            "status_counts": status_counts if can_admin else None,
        },
        "lanes": lanes,
        "flat_affiliations": flat_affiliations,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain affiliation readiness is read-only parent/child "
            "affiliation planning. This endpoint projects existing clan-to-clan "
            "CommunityDomainAffiliation rows only. It does not create domain-domain "
            "affiliations, create parent Community Domains, create child Community "
            "Domains, approve or reject affiliation requests, set clan_id, copy or "
            "transfer members, inherit policy, activate billing, verify authority, "
            "publish public URLs, create marketplace activity, move money, issue "
            "TrustSlips, write Trust Passport entries, or expose private member, "
            "node, evidence, review, marketplace, finance, or affiliate records."
        ),
    }


def _community_domain_network_exchange_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    marketplace_role = _clean_role(template.get("marketplace_role"), "optional")
    verification_status = _clean_role(domain.verification_status, "unverified")
    public_profile_present = bool(_clean_str(domain.public_profile))

    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .filter(CommunityNode.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    active_evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )

    linked_clan: Optional[Clan] = None
    if domain.clan_id is not None:
        linked_clan = db.get(Clan, int(domain.clan_id))
    linked_clan_id = int(linked_clan.id) if linked_clan is not None else None
    linked_social_member_count = 0
    outbound_affiliation_count = 0
    inbound_affiliation_count = 0
    active_affiliation_count = 0
    pending_affiliation_count = 0

    if linked_clan_id is not None:
        linked_social_member_count = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == linked_clan_id)
            .count()
        )
        outbound_affiliations = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.parent_clan_id == linked_clan_id)
            .all()
        )
        inbound_affiliations = (
            db.query(CommunityDomainAffiliation)
            .filter(CommunityDomainAffiliation.affiliate_clan_id == linked_clan_id)
            .all()
        )
        outbound_affiliation_count = len(outbound_affiliations)
        inbound_affiliation_count = len(inbound_affiliations)
        all_affiliations = [*outbound_affiliations, *inbound_affiliations]
        active_affiliation_count = sum(
            1 for row in all_affiliations if _clean_role(row.status, "pending") == "approved"
        )
        pending_affiliation_count = sum(
            1 for row in all_affiliations if _clean_role(row.status, "pending") == "pending"
        )

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "internal_domain_anchor",
            "Internal domain anchor",
            "anchored" if active_member_count and active_node_count else "incomplete",
            bool(active_member_count and active_node_count),
            active_member_count,
            "Keep internal membership, branches, lines, departments, or committees clear before relating outward.",
            route_suffix="/operating-map",
            requires_admin=False,
            boundary=(
                "Internal anchor signal only. This does not create members, "
                "nodes, roles, or operating records."
            ),
        ),
        lane(
            "social_bridge_exchange",
            "Social Community bridge exchange",
            "linked" if linked_clan_id is not None else "not_linked",
            linked_clan_id is not None,
            admin_count(linked_social_member_count),
            "Use linked social Community context cautiously; it is not the same object as the paid Community Domain.",
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "Social bridge signal only. This does not create a social "
                "Community, link clan_id, copy members, or merge records."
            ),
        ),
        lane(
            "affiliation_exchange",
            "Affiliation exchange",
            (
                "clan_affiliations_visible"
                if linked_clan_id is not None
                and (outbound_affiliation_count or inbound_affiliation_count)
                else "not_domain_linked"
            ),
            False,
            admin_count(outbound_affiliation_count + inbound_affiliation_count),
            "Treat existing affiliations as clan-to-clan context until a domain exchange rail exists.",
            route_suffix="/social-bridge",
            requires_admin=True,
            boundary=(
                "Affiliation exchange boundary only. This does not create, "
                "approve, reject, apply, or expose affiliation records."
            ),
        ),
        lane(
            "marketplace_exchange_boundary",
            "Marketplace exchange boundary",
            f"template_{marketplace_role}",
            marketplace_role in {"core", "supported"},
            1 if marketplace_role in {"core", "supported"} else 0,
            "Keep trade, shops, demand, Spotlight, and vault activity inside existing Marketplace rails until a domain exchange bridge is designed.",
            route_suffix="/economic-participation",
            requires_admin=False,
            boundary=(
                "Marketplace exchange boundary only. This does not create shops, "
                "listings, demand, Spotlight, reposts, vault links, marketplace "
                "records, or public exposure."
            ),
        ),
        lane(
            "trust_evidence_exchange",
            "Trust evidence exchange",
            "evidence_present" if active_evidence_count else "not_recorded",
            bool(active_evidence_count),
            admin_count(active_evidence_count),
            "Use evidence as private governance metadata until public-safe proof release is deliberately built.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Trust evidence exchange signal only. This does not expose files, "
                "publish proof, issue credentials, issue TrustSlips, or write "
                "Trust Passport records."
            ),
        ),
        lane(
            "public_network_presence",
            "Public network presence",
            "profile_ready" if public_profile_present else "profile_needed",
            public_profile_present,
            1 if public_profile_present else 0,
            "Prepare public-safe institutional identity before outside network exposure.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Public presence signal only. This does not publish a public "
                "page, finalize public URL format, verify the domain, or create "
                "outward links."
            ),
        ),
        lane(
            "cross_domain_discovery_boundary",
            "Cross-domain discovery boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not expose one institution's members or internal units to another domain until privacy and permission rules are designed.",
            route_suffix="/network-presence",
            requires_admin=True,
            boundary=(
                "Cross-domain discovery boundary only. This does not create "
                "search, recommendations, public member directories, cross-silo "
                "discovery, or private member exposure."
            ),
        ),
        lane(
            "external_finance_boundary",
            "External finance boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not treat external support, contributions, settlement, dues, or payment rails as live.",
            route_suffix="/subscription-lifecycle",
            requires_admin=True,
            boundary=(
                "External finance boundary only. This does not create payment "
                "instructions, invoices, receipts, dues, contributions, ledger "
                "entries, payouts, loans, guarantees, or money movement."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_network_exchange",
            "label": "Ask a Community Domain admin to review network exchange readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not public_profile_present:
        primary_next_action = {
            "action_key": "prepare_public_safe_identity",
            "label": "Prepare public-safe identity before network exchange",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "prepare_authority_verification_for_exchange",
            "label": "Prepare authority verification before outside exchange",
            "route_hint": f"/community-domains/{domain_id}/verification-requirements",
            "requires_admin": True,
        }
    elif linked_clan_id is None:
        primary_next_action = {
            "action_key": "review_social_bridge_for_exchange",
            "label": "Review whether this domain needs a social Community bridge",
            "route_hint": f"/community-domains/{domain_id}/social-bridge",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_exchange_boundaries",
            "label": "Review Community Domain network exchange boundaries",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=domain_id),
        ),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "domain_status": _clean_role(domain.status, "draft"),
            "verification_status": verification_status,
            "marketplace_role": marketplace_role,
            "public_profile_present": public_profile_present,
            "linked_social_community": bool(linked_clan_id is not None),
            "linked_social_member_count": admin_count(linked_social_member_count),
            "outbound_affiliations": admin_count(outbound_affiliation_count),
            "inbound_affiliations": admin_count(inbound_affiliation_count),
            "active_affiliations": admin_count(active_affiliation_count),
            "pending_affiliations": admin_count(pending_affiliation_count),
            "active_member_count": int(active_member_count),
            "active_node_count": int(active_node_count),
            "active_policy_count": admin_count(active_policy_count),
            "active_evidence_count": admin_count(active_evidence_count),
            "domain_exchange_status": "not_connected_in_this_slice",
            "cross_domain_discovery_status": "not_connected_in_this_slice",
            "external_finance_status": "not_connected_in_this_slice",
        },
        "linked_social_community": {
            "id": linked_clan_id if can_admin else None,
            "name": linked_clan.name if linked_clan is not None and can_admin else None,
            "status": (
                linked_clan.status
                if linked_clan is not None and can_admin
                else ("hidden_for_member" if linked_clan is not None else "not_linked")
            ),
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain network exchange map is read-only outside-network "
            "planning. This endpoint does not create domain-to-domain exchange, "
            "cross-domain discovery, public member directories, public search, "
            "social Community links, affiliation decisions, marketplace records, "
            "shops, listings, demand, Spotlight, vault links, TrustSlips, Trust "
            "Passport entries, public proof, payment instructions, finance "
            "records, loans, guarantees, money movement, or private member, "
            "review, evidence, marketplace, or finance exposure."
        ),
    }


def _community_domain_record_privacy_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    public_profile_present = bool(_clean_str(domain.public_profile))

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    active_nodes = [
        node for node in nodes if _clean_role(node.status, "active") == "active"
    ]
    visibility_policy_counts: dict[str, int] = {}
    for node in active_nodes:
        policy_key = _clean_role(node.visibility_policy, "members")
        visibility_policy_counts[policy_key] = (
            visibility_policy_counts.get(policy_key, 0) + 1
        )

    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .count()
    )
    active_evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "public_identity_boundary",
            "Public identity boundary",
            "profile_ready" if public_profile_present else "profile_needed",
            public_profile_present,
            1 if public_profile_present else 0,
            "Keep public-facing identity separate from private member and evidence records.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Public identity boundary only. This does not publish a public "
                "page, finalize public URLs, verify authority, or expose private "
                "records."
            ),
        ),
        lane(
            "member_register_boundary",
            "Member register boundary",
            "members_present" if active_member_count else "empty",
            bool(active_member_count),
            admin_count(active_member_count),
            "Treat member lists as admin-controlled institutional records, not public directory data.",
            route_suffix="/members",
            requires_admin=True,
            boundary=(
                "Member register boundary only. This does not create, invite, "
                "approve, remove, expose, export, or publish member records."
            ),
        ),
        lane(
            "operating_unit_visibility",
            "Operating unit visibility",
            "policies_present" if active_nodes else "empty",
            bool(active_nodes),
            len(active_nodes),
            "Review node visibility policies before relying on branch, line, department, class, or committee records.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Operating-unit visibility signal only. This does not change "
                "node visibility, expose private node rosters, or publish the "
                "institutional hierarchy."
            ),
        ),
        lane(
            "governance_record_boundary",
            "Governance record boundary",
            "policy_backed" if active_policy_count else "policy_needed",
            bool(active_policy_count),
            admin_count(active_policy_count),
            "Use governance policy to decide which records need review before they become trusted.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Governance boundary only. This does not create policies, decide "
                "reviews, apply reviews, or expose private review payloads."
            ),
        ),
        lane(
            "review_payload_boundary",
            "Review payload boundary",
            "open_reviews" if open_review_count else "quiet",
            not bool(open_review_count),
            admin_count(review_count),
            "Keep action review notes, payloads, decisions, and comments private to authorized review flows.",
            route_suffix="/action-reviews",
            requires_admin=True,
            boundary=(
                "Review payload boundary only. This does not expose review "
                "payloads, comments, decisions, request notes, or reviewer data."
            ),
        ),
        lane(
            "evidence_storage_boundary",
            "Evidence storage boundary",
            "evidence_present" if active_evidence_count else "not_recorded",
            bool(active_evidence_count),
            admin_count(active_evidence_count),
            "Keep evidence files and storage metadata private until a public-safe proof release is built.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Evidence storage boundary only. This does not upload evidence, "
                "download files, expose storage keys, publish proof, issue "
                "TrustSlips, or write Trust Passport records."
            ),
        ),
        lane(
            "marketplace_finance_boundary",
            "Marketplace and finance boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Keep marketplace activity and finance records outside this privacy map until those bridges are deliberately built.",
            route_suffix="/economic-participation",
            requires_admin=True,
            boundary=(
                "Marketplace and finance boundary only. This does not expose "
                "shops, listings, demand, Spotlight, vaults, loans, guarantees, "
                "payments, ledgers, payouts, or private finance records."
            ),
        ),
        lane(
            "cross_domain_privacy_boundary",
            "Cross-domain privacy boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not let one institution inspect another institution's private members, records, evidence, or finance data.",
            route_suffix="/network-exchange-map",
            requires_admin=True,
            boundary=(
                "Cross-domain privacy boundary only. This does not create "
                "cross-domain discovery, public search, member directories, "
                "record sharing, or cross-silo exposure."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_record_privacy",
            "label": "Ask a Community Domain admin to review record privacy",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not public_profile_present:
        primary_next_action = {
            "action_key": "prepare_public_safe_identity",
            "label": "Prepare public-safe identity before exposing domain context",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }
    elif not active_policy_count:
        primary_next_action = {
            "action_key": "define_record_governance_policy",
            "label": "Define governance policy for sensitive records",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    elif open_review_count:
        primary_next_action = {
            "action_key": "review_open_private_record_decisions",
            "label": "Review open private-record decisions",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_record_privacy_boundaries",
            "label": "Review Community Domain record privacy boundaries",
            "route_hint": f"/community-domains/{domain_id}/evidence-map",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "public_profile_present": public_profile_present,
            "public_url_status": "open_product_decision",
            "active_node_count": int(len(active_nodes)),
            "visibility_policy_counts": visibility_policy_counts if can_admin else None,
            "active_member_count": admin_count(active_member_count),
            "active_policy_count": admin_count(active_policy_count),
            "review_record_count": admin_count(review_count),
            "open_review_count": admin_count(open_review_count),
            "active_evidence_count": admin_count(active_evidence_count),
            "marketplace_private_record_status": "not_exposed_in_this_slice",
            "finance_private_record_status": "not_connected_in_this_slice",
            "cross_domain_record_sharing_status": "not_connected_in_this_slice",
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain record privacy map is read-only privacy planning. "
            "This endpoint does not change permissions, create access-control "
            "rules, create members, expose member lists, expose node rosters, "
            "publish hierarchies, expose review payloads, expose evidence files, "
            "expose storage keys, publish proof, issue TrustSlips, write Trust "
            "Passport records, expose marketplace activity, expose finance "
            "records, create cross-domain discovery, create public search, create "
            "member directories, share records across institutions, or move money."
        ),
    }


def _community_domain_configuration_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    blueprint = _community_domain_template_operating_blueprint_payload(
        template=template
    )
    root_node = _find_root_node(db, community_domain_id=domain_id)
    public_profile_present = bool(_clean_str(domain.public_profile))
    module_keys = list(template.get("default_modules") or [])
    node_presets = list(blueprint.get("node_presets") or [])
    role_presets = list(blueprint.get("role_presets") or [])
    policy_presets = list(blueprint.get("policy_presets") or [])
    activity_lanes = list(blueprint.get("activity_lanes") or [])

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    active_nodes = [
        node for node in nodes if _clean_role(node.status, "active") == "active"
    ]
    active_non_root_nodes = [
        node for node in active_nodes if node.parent_node_id is not None
    ]
    observed_node_kinds = sorted(
        {
            _clean_role(node.node_kind, "administrative")
            for node in active_non_root_nodes
        }
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .count()
    )
    active_evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "template_preset",
            "Template preset",
            "selected",
            True,
            1,
            "Use the selected society-fit template as the configurable starting point.",
            route_suffix="/institutional-profile",
            requires_admin=False,
            boundary=(
                "Template preset signal only. This does not create a custom "
                "schema, custom tenant, or separate product fork."
            ),
        ),
        lane(
            "identity_configuration",
            "Identity configuration",
            "profile_ready" if public_profile_present else "profile_needed",
            public_profile_present,
            1 if public_profile_present else 0,
            "Keep name, public-safe profile, country, and region clear before wider rollout.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Identity configuration only. This does not verify authority, "
                "publish a public page, or finalize public URL format."
            ),
        ),
        lane(
            "structure_configuration",
            "Structure configuration",
            "configured" if active_non_root_nodes else "root_only",
            bool(active_non_root_nodes),
            len(active_non_root_nodes),
            "Adjust branches, lines, departments, classes, chapters, or committees using generic node records.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Structure configuration signal only. This does not create nodes, "
                "custom tables, custom hierarchy schemas, or separate domains."
            ),
        ),
        lane(
            "role_configuration",
            "Role configuration",
            "configured" if active_node_member_count else "presets_only",
            bool(active_node_member_count),
            int(active_node_member_count),
            "Use role presets and node placements before requesting new role language.",
            route_suffix="/roles",
            requires_admin=True,
            boundary=(
                "Role configuration signal only. This does not create roles, "
                "assign roles, grant permissions, or customize auth."
            ),
        ),
        lane(
            "governance_configuration",
            "Governance configuration",
            "policy_backed" if active_policy_count else "policy_needed",
            bool(active_policy_count),
            admin_count(active_policy_count),
            "Use policy presets for approvals, evidence, and local review before custom workflow work.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Governance configuration signal only. This does not create "
                "policy, decide reviews, apply reviews, or generate workflows."
            ),
        ),
        lane(
            "module_configuration",
            "Module configuration",
            "template_modules",
            bool(module_keys),
            len(module_keys),
            "Use template modules as package defaults; optional modules remain planning until activation is designed.",
            route_suffix="/service-settings",
            requires_admin=True,
            boundary=(
                "Module configuration signal only. This does not enable modules, "
                "persist settings, activate billing, or grant permissions."
            ),
        ),
        lane(
            "evidence_configuration",
            "Evidence configuration",
            "evidence_present" if active_evidence_count else "not_recorded",
            bool(active_evidence_count),
            admin_count(active_evidence_count),
            "Treat evidence as controlled metadata until evidence upload/release workflows are intentionally live.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Evidence configuration signal only. This does not upload files, "
                "expose storage keys, publish proof, issue TrustSlips, or write "
                "Trust Passport records."
            ),
        ),
        lane(
            "package_allowance_configuration",
            "Package allowance configuration",
            "pilot_allowances",
            True,
            1,
            "Use capacity planning for package allowances; live billing and entitlement enforcement are not connected here.",
            route_suffix="/capacity-plan",
            requires_admin=False,
            boundary=(
                "Package allowance signal only. This does not create custom "
                "billing packages, meter live usage, enforce limits, invoice, "
                "or activate subscriptions."
            ),
        ),
        lane(
            "custom_schema_boundary",
            "Custom schema boundary",
            "configuration_not_schema_fork",
            False,
            0,
            "Represent institutional differences through templates, nodes, roles, policies, modules, and evidence metadata first.",
            route_suffix="/institutional-profile",
            requires_admin=True,
            boundary=(
                "Custom schema boundary only. This does not create custom "
                "database tables, custom fields, custom tenants, per-client code, "
                "custom billing, custom permissions, or schema forks."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_configuration",
            "label": "Ask a Community Domain admin to review configuration",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not public_profile_present:
        primary_next_action = {
            "action_key": "configure_domain_identity",
            "label": "Configure public-safe Community Domain identity",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }
    elif not active_non_root_nodes:
        primary_next_action = {
            "action_key": "configure_operating_structure",
            "label": "Configure branches, departments, lines, or units",
            "route_hint": f"/community-domains/{domain_id}/rollout-tree",
            "requires_admin": True,
        }
    elif not active_policy_count:
        primary_next_action = {
            "action_key": "configure_governance_policy",
            "label": "Configure governance policy for this institution",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_configuration_boundaries",
            "label": "Review configuration boundaries",
            "route_hint": f"/community-domains/{domain_id}/institutional-profile",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": _clean_role(template.get("marketplace_role"), "optional"),
        },
        "blueprint": {
            "node_preset_count": len(node_presets),
            "role_preset_count": len(role_presets),
            "policy_preset_count": len(policy_presets),
            "activity_lane_count": len(activity_lanes),
            "default_modules": module_keys,
        },
        "summary": {
            "configuration_mode": "template_preset_configuration",
            "custom_schema_status": "not_connected_in_this_slice",
            "custom_tenant_status": "not_connected_in_this_slice",
            "custom_billing_status": "not_connected_in_this_slice",
            "custom_permission_status": "not_connected_in_this_slice",
            "public_profile_present": public_profile_present,
            "active_node_count": len(active_nodes),
            "active_operating_unit_count": len(active_non_root_nodes),
            "observed_node_kinds": observed_node_kinds if can_admin else None,
            "active_member_count": int(active_member_count),
            "active_node_member_count": int(active_node_member_count),
            "active_policy_count": admin_count(active_policy_count),
            "review_record_count": admin_count(review_count),
            "active_evidence_count": admin_count(active_evidence_count),
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain configuration map is read-only configuration "
            "planning. This endpoint does not create a custom schema, custom "
            "tenant, custom billing package, custom permission model, custom "
            "database table, custom field, per-client code fork, nodes, members, "
            "roles, policies, reviews, evidence, module settings, payments, "
            "entitlements, marketplace records, social Community links, TrustSlips, "
            "Trust Passport records, public proof, or private record exposure."
        ),
    }


def _community_domain_compliance_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    public_profile_present = bool(_clean_str(domain.public_profile))
    verification_status = _clean_role(domain.verification_status, "unverified")

    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .filter(CommunityNode.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(CommunityDomainActionReview.status.in_(("pending", "needs_changes")))
        .count()
    )
    active_evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "authority_verification",
            "Authority verification",
            "verified" if verification_status == "verified" else verification_status,
            verification_status == "verified",
            1 if verification_status == "verified" else 0,
            "Confirm the institution's authority record before treating the domain as formally verified.",
            route_suffix="/verification-requirements",
            requires_admin=True,
            boundary=(
                "Authority verification signal only. This does not verify legal "
                "authority, upload evidence, certify compliance, or create a "
                "Verified Community Domain."
            ),
        ),
        lane(
            "governance_controls",
            "Governance controls",
            "policy_backed" if active_policy_count else "policy_needed",
            bool(active_policy_count),
            admin_count(active_policy_count),
            "Keep approval, evidence, and decision policies visible before the institution relies on domain records.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Governance control signal only. This does not create policy, "
                "decide reviews, certify compliance, or replace institutional bylaws."
            ),
        ),
        lane(
            "record_privacy_controls",
            "Record privacy controls",
            "mapped",
            True,
            1,
            "Review which records stay public-safe, member-visible, admin-only, or unshared.",
            route_suffix="/record-privacy-map",
            requires_admin=False,
            boundary=(
                "Record privacy signal only. This does not change permissions, "
                "expose member lists, expose storage keys, or share records "
                "across institutions."
            ),
        ),
        lane(
            "billing_payment_boundary",
            "Billing and payment boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Keep subscription planning separate from invoices, receipts, payment instructions, and money movement.",
            route_suffix="/subscription-lifecycle",
            requires_admin=True,
            boundary=(
                "Billing boundary only. This does not create payment instructions, "
                "charge money, issue receipts, activate entitlements, or certify "
                "tax/payment compliance."
            ),
        ),
        lane(
            "public_claims_boundary",
            "Public claims boundary",
            "profile_ready" if public_profile_present else "profile_needed",
            public_profile_present,
            1 if public_profile_present else 0,
            "Keep public-facing identity claims small, clear, and safe until verification is complete.",
            route_suffix="/network-presence",
            requires_admin=False,
            boundary=(
                "Public claim signal only. This does not publish a legal notice, "
                "certify compliance, verify authority, or create public proof."
            ),
        ),
        lane(
            "marketplace_finance_boundary",
            "Marketplace and finance boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Treat economic participation as readiness planning until live marketplace, finance, and payment controls are intentionally connected.",
            route_suffix="/economic-participation",
            requires_admin=False,
            boundary=(
                "Marketplace finance boundary only. This does not create a "
                "marketplace, shop, listing, loan, ledger entry, payment, "
                "contribution, or financial compliance decision."
            ),
        ),
        lane(
            "cross_domain_sharing_boundary",
            "Cross-domain sharing boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Keep outside-network movement separate until domain-to-domain exchange rules are deliberately built.",
            route_suffix="/network-exchange-map",
            requires_admin=True,
            boundary=(
                "Cross-domain boundary only. This does not create domain-to-domain "
                "exchange, cross-silo discovery, shared directories, or share "
                "records across institutions."
            ),
        ),
        lane(
            "audit_trail",
            "Audit trail",
            "records_present" if review_count or active_evidence_count else "not_recorded",
            bool(review_count or active_evidence_count),
            admin_count(review_count + active_evidence_count),
            "Use review and evidence metadata as the current audit signal until a formal compliance engine exists.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Audit trail signal only. This does not expose private evidence, "
                "storage keys, member records, review payloads, legal advice, "
                "or compliance decisions."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_compliance_posture",
            "label": "Ask a Community Domain admin to review compliance posture",
            "route_hint": None,
            "requires_admin": True,
        }
    elif verification_status != "verified":
        primary_next_action = {
            "action_key": "review_authority_verification_requirements",
            "label": "Review authority verification requirements",
            "route_hint": f"/community-domains/{domain_id}/verification-requirements",
            "requires_admin": True,
        }
    elif not active_policy_count:
        primary_next_action = {
            "action_key": "review_governance_controls",
            "label": "Review governance controls",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    elif open_review_count:
        primary_next_action = {
            "action_key": "resolve_open_governance_reviews",
            "label": "Resolve open governance reviews",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_compliance_boundaries",
            "label": "Review compliance and risk boundaries",
            "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "domain_status": domain.status,
            "verification_status": verification_status,
            "public_profile_present": public_profile_present,
            "active_member_count": int(active_member_count),
            "active_node_count": int(active_node_count),
            "active_policy_count": admin_count(active_policy_count),
            "review_record_count": admin_count(review_count),
            "open_review_count": admin_count(open_review_count),
            "active_evidence_count": admin_count(active_evidence_count),
            "compliance_engine_status": "not_connected_in_this_slice",
            "legal_advice_status": "not_provided",
            "payment_compliance_status": "not_connected_in_this_slice",
            "cross_domain_record_sharing_status": "not_connected_in_this_slice",
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain compliance map is read-only compliance planning "
            "and risk posture mapping, not legal advice. This endpoint does not certify compliance, "
            "create a compliance decision, verify legal authority, upload "
            "evidence, expose storage keys, expose member lists, create policy, "
            "decide reviews, or create marketplace or finance records. It does not create payment instructions, "
            "move money, create invoices, "
            "activate subscriptions, share records across institutions, publish "
            "public proof, issue TrustSlips, write Trust Passport records, or "
            "expose private member/review/evidence/finance records."
        ),
    }


def _community_domain_appeal_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )
    comments_count = (
        db.query(CommunityDomainActionReviewComment)
        .filter(CommunityDomainActionReviewComment.community_domain_id == domain_id)
        .count()
    )
    evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )
    open_review_count = sum(
        1
        for review in reviews
        if _clean_role(review.status, "pending")
        in {"pending", "pending_review", "needs_changes"}
    )
    disputed_review_count = sum(
        1
        for review in reviews
        if _clean_role(review.status, "pending")
        in {"rejected", "cancelled", "needs_changes"}
    )

    review_action_counts: dict[str, int] = {}
    for review in reviews:
        action_key = _clean_role(review.action_key, "unknown")
        review_action_counts[action_key] = review_action_counts.get(action_key, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def action_count(*prefixes: str) -> int:
        return sum(
            count
            for action_key, count in review_action_counts.items()
            if any(action_key.startswith(prefix) for prefix in prefixes)
        )

    def lane(
        lane_key: str,
        label: str,
        signal_count: int,
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        status = "appeal_signal_present" if signal_count else "appeal_path_not_connected"
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": False,
            "signal_count": admin_count(signal_count),
            "appeal_engine_status": "not_connected_in_this_slice",
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "membership_appeals",
            "Membership appeals",
            action_count("domain_member.", "member.", "membership."),
            "Use current review notes as the signal, but do not treat rejected membership as appealable until an appeal path exists.",
            route_suffix="/action-reviews",
            requires_admin=True,
            boundary=(
                "Membership appeal readiness only. This does not reopen a rejected "
                "membership, approve a member, create an appeal, assign a mediator, "
                "or expose private member records."
            ),
        ),
        lane(
            "role_assignment_appeals",
            "Role assignment appeals",
            action_count("role.", "node_member.", "domain_role."),
            "Keep role and node placement disputes inside governance review until formal appeals are built.",
            route_suffix="/roles",
            requires_admin=True,
            boundary=(
                "Role appeal readiness only. This does not grant roles, change node "
                "placement, decide a dispute, or override Community Domain policy."
            ),
        ),
        lane(
            "evidence_disputes",
            "Evidence disputes",
            action_count("evidence.", "verification."),
            "Use evidence review records as the current dispute signal without calling them final proof.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Evidence dispute readiness only. This does not verify evidence, "
                "revoke evidence, publish evidence, issue credentials, issue "
                "TrustSlips, write Trust Passport entries, or expose storage keys."
            ),
        ),
        lane(
            "content_spotlight_appeals",
            "Content and spotlight appeals",
            action_count("spotlight.", "content.", "notice."),
            "Keep content or Spotlight blocks as governance signals until a fair appeal path exists.",
            route_suffix="/activity-map",
            requires_admin=True,
            boundary=(
                "Content appeal readiness only. This does not publish content, "
                "restore a blocked Spotlight, send notices, create marketplace "
                "records, or expose private activity."
            ),
        ),
        lane(
            "shop_vault_visibility_appeals",
            "Shop and vault visibility appeals",
            action_count("shop.", "vault."),
            "Keep shop and vault visibility disputes separate from public discovery and private document access.",
            route_suffix="/record-privacy-map",
            requires_admin=True,
            boundary=(
                "Shop and vault appeal readiness only. This does not grant shop "
                "visibility, create vault links, expose storage keys, reveal member "
                "lists, or share private documents."
            ),
        ),
        lane(
            "node_scope_appeals",
            "Node scope appeals",
            action_count("node.", "structure."),
            "Treat branch, class, committee, or line disputes as review signals until node-level appeals are real.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Node scope appeal readiness only. This does not move a node, "
                "split a hierarchy, create child Community Domains, transfer "
                "members, or change inheritance."
            ),
        ),
        lane(
            "payment_activity_appeals",
            "Paid activity appeals",
            action_count("paid_activity.", "finance.", "payment.", "dues."),
            "Keep dues, fees, contributions, or ROSCA disagreements away from money movement until payment appeals are deliberately built.",
            route_suffix="/node-paid-activity-map",
            requires_admin=True,
            boundary=(
                "Paid activity appeal readiness only. This does not reverse "
                "payments, create refunds, create receipts, write ledger entries, "
                "move money, create loans, or make finance decisions."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_appeal_readiness",
            "label": "Ask a Community Domain admin to review appeal readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif active_policy_count <= 0:
        primary_next_action = {
            "action_key": "add_governance_policy_before_appeals",
            "label": "Add governance policy before appeals",
            "route_hint": f"/community-domains/{domain_id}/policies",
            "requires_admin": True,
        }
    elif disputed_review_count:
        primary_next_action = {
            "action_key": "review_disputed_decision_signals",
            "label": "Review disputed decision signals",
            "route_hint": f"/community-domains/{domain_id}/action-reviews",
            "requires_admin": True,
        }
    elif open_review_count:
        primary_next_action = {
            "action_key": "resolve_open_reviews_before_appeals",
            "label": "Resolve open reviews before appeals",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "keep_appeal_path_planning_read_only",
            "label": "Keep appeal path planning read-only",
            "route_hint": f"/community-domains/{domain_id}/governance-model",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "active_member_count": int(active_member_count),
            "active_policy_count": admin_count(active_policy_count),
            "review_record_count": admin_count(len(reviews)),
            "open_review_count": admin_count(open_review_count),
            "disputed_review_signal_count": admin_count(disputed_review_count),
            "review_comment_count": admin_count(comments_count),
            "active_evidence_count": admin_count(evidence_count),
            "appeal_engine_status": "not_connected_in_this_slice",
            "appeal_records_created": 0,
            "mediator_assignment_status": "not_connected_in_this_slice",
            "appeal_decision_status": "not_connected_in_this_slice",
        },
        "lanes": lanes,
        "ready_total": 0,
        "blocked_lanes": [item["lane_key"] for item in lanes],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain appeal readiness is read-only fairness and dispute "
            "planning. It shows where existing reviews, comments, and evidence "
            "suggest future appeal paths may be needed, but it does not create "
            "appeals, reopen rejected membership, assign mediators, decide disputes, "
            "grant roles, verify or revoke evidence, publish content, grant shop or "
            "vault access, move nodes, reverse payments, move money, create loans, "
            "issue TrustSlips, write Trust Passport entries, share records across "
            "institutions, or expose private member/review/evidence/finance records."
        ),
    }


def _community_domain_institutional_profile_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    operating_blueprint = _community_domain_template_operating_blueprint_payload(
        template=template
    )
    module_keys = list(template.get("default_modules") or [])
    marketplace_role = _clean_role(template.get("marketplace_role"), "optional")
    node_presets = list(operating_blueprint.get("node_presets") or [])
    role_presets = list(operating_blueprint.get("role_presets") or [])
    policy_presets = list(operating_blueprint.get("policy_presets") or [])
    activity_lanes = list(operating_blueprint.get("activity_lanes") or [])

    all_node_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .count()
    )
    operating_unit_count = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .filter(CommunityNode.parent_node_id.isnot(None))
        .count()
    )
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    pending_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(CommunityDomainActionReview.status == "pending")
        .count()
    )

    domain_identity_ready = bool(
        _clean_str(domain.domain_name)
        and _clean_str(domain.display_name)
        and _clean_str(domain.domain_type)
    )
    public_profile_ready = bool(_clean_str(domain.public_profile))
    structure_ready = operating_unit_count > 0
    governance_ready = active_policy_count > 0
    authority_verified = _clean_role(domain.verification_status) in {
        "verified",
        "protected",
        "approved",
    }

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: int,
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": int(count),
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "institution_identity",
            "Institution identity",
            "identified" if domain_identity_ready else "incomplete",
            domain_identity_ready,
            1 if domain_identity_ready else 0,
            "Keep the institution name, type, and owner anchor clear before any public claim.",
            route_suffix="/operating-map",
            requires_admin=False,
            boundary=(
                "Identity profile only. This does not verify legal standing or "
                "publish a public Community Domain."
            ),
        ),
        lane(
            "public_profile",
            "Public-safe profile",
            "ready" if public_profile_ready else "missing",
            public_profile_ready,
            1 if public_profile_ready else 0,
            "Write a public-safe summary that explains the institution without exposing private records.",
            route_suffix="/network-presence",
            requires_admin=True,
            boundary=(
                "Public profile readiness only. This does not publish a URL, "
                "create outward links, or expose private member activity."
            ),
        ),
        lane(
            "structure_archetype",
            "Structure archetype",
            "modeled" if structure_ready else "root_only",
            structure_ready,
            operating_unit_count,
            "Model real branches, lines, classes, departments, chapters, or committees as operating units.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Structure archetype only. This does not create nodes, branches, "
                "departments, committees, or a separate Community Domain."
            ),
        ),
        lane(
            "governance_archetype",
            "Governance archetype",
            "policy_backed" if governance_ready else "preset_only",
            governance_ready,
            active_policy_count,
            "Add policies that match how this institution actually reviews decisions.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Governance profile only. This does not create policies, apply "
                "reviews, grant authority, or override platform rules."
            ),
        ),
        lane(
            "economic_posture",
            "Economic posture",
            f"template_{marketplace_role}",
            marketplace_role in {"core", "supported", "optional", "limited"},
            1,
            "Treat trade, shops, demand, welfare, or supplier activity according to the selected template.",
            route_suffix="/economic-participation",
            requires_admin=False,
            boundary=(
                "Economic posture only. This does not create marketplace "
                "activity, shops, listings, demand, payments, or finance records."
            ),
        ),
        lane(
            "authority_evidence",
            "Authority evidence",
            "verified" if authority_verified else "unverified",
            authority_verified,
            1 if authority_verified else 0,
            "Prepare authority evidence before calling the institution verified.",
            route_suffix="/verification-requirements",
            requires_admin=True,
            boundary=(
                "Authority profile only. This does not upload evidence, verify "
                "authority, issue credentials, or release proof."
            ),
        ),
        lane(
            "customization_boundary",
            "Customization boundary",
            "configuration_not_schema_fork",
            True,
            len(module_keys),
            "Use template modules and policies first; only design new schema when a real gap is proven.",
            route_suffix="/service-settings",
            requires_admin=True,
            boundary=(
                "Customization boundary only. This does not create a tenant "
                "schema fork, custom billing package, custom permissions, or "
                "private deployment."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_institutional_profile",
            "label": "Ask a Community Domain admin to review the institutional profile",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not public_profile_ready:
        primary_next_action = {
            "action_key": "complete_public_safe_profile",
            "label": "Complete the public-safe institutional profile",
            "route_hint": f"/community-domains/{domain_id}/network-presence",
            "requires_admin": True,
        }
    elif not structure_ready:
        primary_next_action = {
            "action_key": "model_first_operating_units",
            "label": "Model the first real operating units",
            "route_hint": f"/community-domains/{domain_id}/rollout-tree",
            "requires_admin": True,
        }
    elif not governance_ready:
        primary_next_action = {
            "action_key": "add_governance_policies",
            "label": "Add governance policies for real institutional decisions",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_institutional_profile",
            "label": "Review the Community Domain institutional profile",
            "route_hint": f"/community-domains/{domain_id}/dashboard",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "institutional_profile": {
            "domain_type": domain.domain_type,
            "template_key": template["template_key"],
            "template_label": template["label"],
            "template_summary": template["summary"],
            "marketplace_role": marketplace_role,
            "default_modules": module_keys,
            "typical_nodes": list(template.get("typical_nodes") or []),
            "activity_lanes": activity_lanes,
            "node_presets": node_presets,
            "role_presets": role_presets,
            "policy_presets": policy_presets,
            "uses_generic_fallback": bool(
                operating_blueprint.get("uses_generic_fallback")
            ),
        },
        "summary": {
            "domain_status": domain.status,
            "verification_status": domain.verification_status,
            "public_profile_ready": public_profile_ready,
            "root_node_ready": root_node is not None,
            "structure_ready": structure_ready,
            "governance_ready": governance_ready,
            "authority_verified": authority_verified,
            "total_node_count": int(all_node_count),
            "operating_unit_count": int(operating_unit_count),
            "active_member_count": int(active_member_count),
            "active_policy_count": int(active_policy_count) if can_admin else None,
            "pending_review_count": int(pending_review_count) if can_admin else None,
            "module_count": len(module_keys),
            "preset_node_kind_count": len(node_presets),
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain institutional profile is read-only package "
            "classification. This endpoint does not create a custom schema, "
            "custom tenant, custom billing package, nodes, members, policies, "
            "reviews, evidence, marketplace activity, shops, payments, finance "
            "records, social Community links, verification, activation, public "
            "publication, or private member/review/evidence exposure."
        ),
    }


def _community_domain_delegation_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    domain_memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    open_reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .all()
    )

    active_nodes = [
        node for node in nodes if _clean_role(node.status, "active") == "active"
    ]
    active_operating_nodes = [
        node for node in active_nodes if node.parent_node_id is not None
    ]
    domain_admin_count = sum(
        1
        for membership in domain_memberships
        if _clean_role(membership.role, "member") in DOMAIN_ADMIN_ROLES
    )
    node_admin_memberships = [
        membership
        for membership in node_memberships
        if _clean_role(membership.role, "member") in NODE_ADMIN_ROLES
    ]
    nodes_with_admin_ids = {
        int(membership.community_node_id) for membership in node_admin_memberships
    }
    domain_policy_count = sum(1 for policy in policies if policy.community_node_id is None)
    node_policy_ids = {
        int(policy.community_node_id)
        for policy in policies
        if policy.community_node_id is not None
    }
    inherited_nodes = [
        node
        for node in active_operating_nodes
        if bool(node.inherits_parent_policy)
    ]
    nodes_missing_admin = [
        node for node in active_operating_nodes if int(node.id) not in nodes_with_admin_ids
    ]
    nodes_missing_policy = [
        node
        for node in active_operating_nodes
        if int(node.id) not in node_policy_ids and not bool(node.inherits_parent_policy)
    ]
    nodes_using_inherited_policy = [
        node
        for node in active_operating_nodes
        if int(node.id) not in node_policy_ids and bool(node.inherits_parent_policy)
    ]

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def safe_admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    local_status = "not_needed_yet"
    local_ready = False
    if active_operating_nodes:
        if not nodes_missing_admin:
            local_status = "covered"
            local_ready = True
        elif len(nodes_missing_admin) < len(active_operating_nodes):
            local_status = "partial"
        else:
            local_status = "missing"

    policy_status = "missing"
    policy_ready = False
    if domain_policy_count > 0 and not nodes_missing_policy:
        policy_status = "covered_by_domain_or_local_policy"
        policy_ready = True
    elif domain_policy_count > 0:
        policy_status = "central_policy_with_local_gaps"
    elif node_policy_ids:
        policy_status = "local_policy_without_central_policy"

    lanes = [
        lane(
            "central_authority",
            "Central authority",
            "covered" if domain_admin_count > 0 else "missing",
            domain_admin_count > 0,
            safe_admin_count(domain_admin_count),
            "Keep at least one active owner or domain admin responsible for the whole institution.",
            route_suffix="/roles",
            requires_admin=True,
            boundary=(
                "Central authority count only. This does not assign owners, "
                "grant domain admin rights, verify legal authority, or expose "
                "private member records."
            ),
        ),
        lane(
            "local_delegation",
            "Local delegation",
            local_status,
            local_ready,
            safe_admin_count(len(nodes_with_admin_ids)),
            "Assign branch, line, department, chapter, or committee admins only through the existing membership tools.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Local delegation projection only. This does not assign local "
                "admins, create node memberships, grant permissions, or change "
                "node authority."
            ),
        ),
        lane(
            "policy_delegation",
            "Policy delegation",
            policy_status,
            policy_ready,
            safe_admin_count(len(policies)),
            "Use central policies, inherited policies, and local policies to match how decisions really move.",
            route_suffix="/policies",
            requires_admin=True,
            boundary=(
                "Policy delegation projection only. This does not create "
                "policies, apply reviews, decide reviews, or override platform "
                "rules."
            ),
        ),
        lane(
            "inheritance_model",
            "Policy inheritance model",
            "inheriting" if inherited_nodes else "local_only_or_root_only",
            bool(inherited_nodes or not active_operating_nodes),
            int(len(inherited_nodes)),
            "Use inherited policy for simple units and local policy where the unit has its own authority.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Inheritance model only. This does not change inheritance flags, "
                "create local override policies, or change node status."
            ),
        ),
        lane(
            "review_queue",
            "Delegated review queue",
            "open" if open_reviews else "clear",
            not bool(open_reviews),
            safe_admin_count(len(open_reviews)),
            "Review open governance requests before treating delegation as stable.",
            route_suffix="/action-reviews/reviewer-queue",
            requires_admin=True,
            boundary=(
                "Review queue projection only. This does not expose private "
                "review payloads, create decisions, apply decisions, or cancel "
                "reviews."
            ),
        ),
        lane(
            "authority_boundary",
            "Authority boundary",
            _clean_role(domain.verification_status, "unverified"),
            _clean_role(domain.verification_status, "unverified")
            in {"verified", "protected", "approved"},
            1
            if _clean_role(domain.verification_status, "unverified")
            in {"verified", "protected", "approved"}
            else 0,
            "Do not present internal delegation as verified institutional authority until authority evidence is approved.",
            route_suffix="/verification-requirements",
            requires_admin=True,
            boundary=(
                "Authority boundary only. This does not verify the institution, "
                "issue credentials, publish proof, or create legal standing."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_delegation",
            "label": "Ask a Community Domain admin to review delegation",
            "route_hint": None,
            "requires_admin": True,
        }
    elif domain_admin_count <= 0:
        primary_next_action = {
            "action_key": "assign_central_authority",
            "label": "Assign central Community Domain authority",
            "route_hint": f"/community-domains/{domain_id}/roles",
            "requires_admin": True,
        }
    elif active_operating_nodes and nodes_missing_admin:
        primary_next_action = {
            "action_key": "assign_local_admins",
            "label": "Assign local admins for operating units",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    elif not policy_ready:
        primary_next_action = {
            "action_key": "complete_policy_delegation",
            "label": "Complete central and local governance policy",
            "route_hint": f"/community-domains/{domain_id}/policies",
            "requires_admin": True,
        }
    elif open_reviews:
        primary_next_action = {
            "action_key": "review_open_delegated_decisions",
            "label": "Review open delegated decisions",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_governance_coverage",
            "label": "Review Community Domain governance coverage",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "active_node_count": int(len(active_nodes)),
            "active_operating_unit_count": int(len(active_operating_nodes)),
            "central_authority_count": safe_admin_count(domain_admin_count),
            "local_admin_assignment_count": safe_admin_count(
                len(node_admin_memberships)
            ),
            "operating_units_with_local_admin": safe_admin_count(
                len(nodes_with_admin_ids)
            ),
            "operating_units_missing_local_admin": safe_admin_count(
                len(nodes_missing_admin)
            ),
            "active_policy_count": safe_admin_count(len(policies)),
            "central_policy_count": safe_admin_count(domain_policy_count),
            "local_policy_count": safe_admin_count(len(node_policy_ids)),
            "operating_units_using_inherited_policy": int(
                len(nodes_using_inherited_policy)
            ),
            "operating_units_missing_policy": safe_admin_count(
                len(nodes_missing_policy)
            ),
            "open_review_count": safe_admin_count(len(open_reviews)),
            "verification_status": domain.verification_status,
        },
        "delegation_shape": {
            "central_authority_roles": sorted(DOMAIN_ADMIN_ROLES),
            "local_authority_roles": sorted(NODE_ADMIN_ROLES),
            "supports_domain_policy": True,
            "supports_node_policy": True,
            "supports_inherited_policy": True,
            "supports_required_role_review": True,
            "supports_multi_reviewer_review": True,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain delegation map is a read-only authority projection. "
            "This endpoint does not assign roles, create node memberships, create "
            "policies, create action reviews, decide reviews, apply reviews, "
            "change inheritance, verify legal or institutional authority, activate "
            "billing, create marketplace activity, create a social Community, "
            "publish proof, or expose private member/review/evidence records."
        ),
    }


def _community_domain_identity_context_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    membership: CommunityDomainMembership,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    user_id = int(current_user.id)
    db_user = db.get(User, user_id)
    gmfn_id = getattr(db_user, "gmfn_id", None)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.user_id == user_id)
        .order_by(
            CommunityNodeMembership.status.asc(),
            CommunityNodeMembership.role.asc(),
            CommunityNodeMembership.id.asc(),
        )
        .all()
    )
    active_node_memberships = [
        row
        for row in node_memberships
        if _clean_role(row.status, "inactive") == "active"
    ]
    active_domain_context_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.user_id == user_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_social_context_count = (
        db.query(ClanMembership)
        .filter(ClanMembership.user_id == user_id)
        .filter(ClanMembership.left_at.is_(None))
        .count()
    )
    linked_social_membership = None
    if domain.clan_id is not None:
        linked_social_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == int(domain.clan_id))
            .filter(ClanMembership.user_id == user_id)
            .filter(ClanMembership.left_at.is_(None))
            .first()
        )

    open_reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            (
                CommunityDomainActionReview.subject_user_id == user_id
            )
            | (
                (
                    CommunityDomainActionReview.target_type.in_(
                        ["domain_member", "member", "node_member"]
                    )
                )
                & (CommunityDomainActionReview.target_id == str(user_id))
            )
        )
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .all()
    )

    admin_assignment_count = 0
    role_counts: dict[str, int] = {}
    for row in active_node_memberships:
        role = _clean_role(row.role, "member")
        role_counts[role] = role_counts.get(role, 0) + 1
        if role in NODE_ADMIN_ROLES:
            admin_assignment_count += 1

    domain_role = _clean_role(membership.role, "member")
    domain_active = _clean_role(membership.status, "inactive") == "active"
    linked_social_state = (
        "not_linked_to_social_community"
        if domain.clan_id is None
        else (
            "member_of_linked_social_community"
            if linked_social_membership
            else "not_a_member_of_linked_social_community"
        )
    )

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: int,
        next_step: str,
        *,
        route_suffix: str,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": int(count),
            "route_hint": f"/community-domains/{domain_id}{route_suffix}",
            "requires_admin": False,
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "global_member_identity",
            "Global member identity",
            "present" if gmfn_id else "missing",
            bool(gmfn_id),
            1 if gmfn_id else 0,
            "Keep one member identity across Community Domains and social Communities.",
            route_suffix="/dashboard",
            boundary=(
                "Identity signal only. This does not issue, repair, merge, or "
                "rename a GSN/GMFN member ID."
            ),
        ),
        lane(
            "domain_membership",
            "Current Community Domain membership",
            "active" if domain_active else _clean_role(membership.status, "inactive"),
            domain_active,
            1 if domain_active else 0,
            "Use this domain role as the member's local institutional context, not as a new person.",
            route_suffix="/members",
            boundary=(
                "Membership signal only. This does not add, remove, approve, or "
                "change Community Domain membership."
            ),
        ),
        lane(
            "node_context",
            "Operating unit context",
            "placed" if active_node_memberships else "not_placed",
            bool(active_node_memberships),
            len(active_node_memberships),
            "Show where this same member belongs inside branches, lines, departments, classes, or committees.",
            route_suffix="/nodes/tree",
            boundary=(
                "Node context only. This does not place the member, assign roles, "
                "grant permissions, or expose other members."
            ),
        ),
        lane(
            "linked_social_context",
            "Linked social Community context",
            linked_social_state,
            bool(domain.clan_id is None or linked_social_membership),
            1 if linked_social_membership else 0,
            "Keep social Community membership separate from paid Community Domain membership.",
            route_suffix="/social-bridge",
            boundary=(
                "Social context only. This does not join a social Community, "
                "link records, copy members, or merge Community and Community "
                "Domain membership."
            ),
        ),
        lane(
            "open_member_reviews",
            "Open member reviews",
            "open" if open_reviews else "clear",
            not bool(open_reviews),
            len(open_reviews),
            "Resolve open reviews involving this member before treating the context as stable.",
            route_suffix="/action-reviews/my-requests",
            boundary=(
                "Review signal only. This does not expose private review "
                "payloads, decide reviews, apply reviews, or upload evidence."
            ),
        ),
    ]

    if not gmfn_id:
        primary_next_action = {
            "action_key": "confirm_global_member_id",
            "label": "Confirm this member has one stable GSN ID",
            "route_hint": None,
            "requires_admin": False,
        }
    elif not active_node_memberships:
        primary_next_action = {
            "action_key": "review_unit_context",
            "label": "Review where this member belongs inside the institution",
            "route_hint": f"/community-domains/{domain_id}/nodes/tree",
            "requires_admin": False,
        }
    elif open_reviews:
        primary_next_action = {
            "action_key": "review_member_requests",
            "label": "Review open requests involving this member",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/my-requests",
            "requires_admin": False,
        }
    else:
        primary_next_action = {
            "action_key": "review_member_context",
            "label": "Review your Community Domain identity context",
            "route_hint": f"/community-domains/{domain_id}/dashboard",
            "requires_admin": False,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "member_identity": {
            "user_id": user_id,
            "gsn_id": gmfn_id,
            "email": getattr(db_user, "email", None),
            "display_name": getattr(db_user, "display_name", None),
            "single_identity_rule": (
                "One global member identity can carry many Community Domain, "
                "social Community, marketplace, shop, finance, and trust contexts."
            ),
        },
        "current_domain_context": {
            "membership": _domain_member_payload(membership),
            "domain_role": domain_role,
            "domain_status": _clean_role(membership.status, "inactive"),
            "node_placements": [_node_member_payload(row) for row in node_memberships],
            "role_counts": role_counts,
            "admin_assignment_count": int(admin_assignment_count),
        },
        "context_counts": {
            "active_community_domain_contexts": int(active_domain_context_count),
            "active_social_community_contexts": int(active_social_context_count),
            "current_domain_node_placements": int(len(active_node_memberships)),
            "current_domain_open_member_reviews": int(len(open_reviews)),
        },
        "social_bridge": {
            "domain_has_linked_social_community": bool(domain.clan_id is not None),
            "member_in_linked_social_community": bool(linked_social_membership),
            "linked_social_state": linked_social_state,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain identity context is a read-only current-member "
            "projection. This endpoint does not issue a GSN/GMFN ID, merge "
            "identities, create users, create Community Domain memberships, join "
            "social Communities, link social Communities, copy members, create "
            "shops, move money, write Trust Passport entries, issue TrustSlips, "
            "create marketplace activity, verify authority, activate billing, or "
            "expose other members, other domain names, private finance records, "
            "private evidence, or private review payloads."
        ),
    }


def _community_domain_activity_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    template = _community_domain_template_for_key(
        domain.template_key or domain.domain_type
    )
    blueprint = _community_domain_template_operating_blueprint_payload(
        template=template
    )
    activity_lanes = list(blueprint.get("activity_lanes") or [])
    marketplace_role = _clean_role(template.get("marketplace_role"), "optional")
    root_node = _find_root_node(db, community_domain_id=domain_id)

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .all()
    )
    active_operating_nodes = [
        node
        for node in nodes
        if node.parent_node_id is not None
        and _clean_role(node.status, "active") == "active"
    ]
    active_member_count = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .count()
    )
    open_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .count()
    )
    evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "template_activity_lanes",
            "Template activity lanes",
            "mapped" if activity_lanes else "missing",
            bool(activity_lanes),
            len(activity_lanes),
            "Use the template lanes as planning language for the institution's real activities.",
            route_suffix="/institutional-profile",
            requires_admin=False,
            boundary=(
                "Template activity planning only. This does not create events, "
                "programmes, meetings, dues, contributions, attendance, or "
                "activity records."
            ),
        ),
        lane(
            "operating_unit_context",
            "Operating unit context",
            "mapped" if active_operating_nodes else "root_only",
            bool(active_operating_nodes),
            len(active_operating_nodes),
            "Map branches, lines, departments, chapters, classes, or committees before relying on activity tracking.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Operating-unit context only. This does not create nodes, "
                "branches, departments, classes, committees, or separate domains."
            ),
        ),
        lane(
            "activity_governance",
            "Activity governance",
            "policy_backed" if active_policy_count else "policy_needed",
            bool(active_policy_count),
            admin_count(active_policy_count),
            "Add policies for the activities that need approval, witness, or local responsibility.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Activity governance projection only. This does not create "
                "policy, assign reviewers, decide reviews, or grant authority."
            ),
        ),
        lane(
            "activity_evidence",
            "Activity evidence",
            "evidence_present" if evidence_count else "not_recorded",
            bool(evidence_count),
            admin_count(evidence_count),
            "Use action-review evidence for serious institutional activity until a dedicated activity ledger exists.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Activity evidence aggregate only. This does not upload files, "
                "expose storage keys, publish proof, issue TrustSlips, or write "
                "Trust Passport records."
            ),
        ),
        lane(
            "reviewed_activity_records",
            "Reviewed activity records",
            "records_present" if review_count else "not_recorded",
            bool(review_count),
            admin_count(review_count),
            "Treat action reviews as governance records, not as a full activity ledger.",
            route_suffix="/action-reviews/activity",
            requires_admin=True,
            boundary=(
                "Reviewed activity aggregate only. This does not expose private "
                "review payloads, comments, evidence, or decisions."
            ),
        ),
        lane(
            "marketplace_activity_boundary",
            "Marketplace activity boundary",
            f"template_{marketplace_role}",
            marketplace_role in {"core", "supported", "optional", "limited"},
            1,
            "Keep market-facing activity in the existing Marketplace flow until a domain bridge is deliberately designed.",
            route_suffix="/economic-participation",
            requires_admin=False,
            boundary=(
                "Marketplace activity boundary only. This does not create shops, "
                "listings, demand, Spotlight, vault links, marketplace records, "
                "or finance records."
            ),
        ),
        lane(
            "paid_activity_boundary",
            "Paid activity boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not treat dues, levies, paid events, travel fees, contributions, or subscriptions as live until payment rails exist.",
            route_suffix="/subscription-lifecycle",
            requires_admin=True,
            boundary=(
                "Paid activity boundary only. This does not create dues, levies, "
                "tickets, contributions, invoices, payment instructions, receipts, "
                "bank matches, ledger entries, payouts, or money movement."
            ),
        ),
        lane(
            "scheduled_activity_boundary",
            "Scheduled activity boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not present meetings, services, classes, programmes, or events as scheduled until a dedicated activity/event flow exists.",
            route_suffix="/service-settings",
            requires_admin=True,
            boundary=(
                "Scheduled activity boundary only. This does not create events, "
                "calendar entries, attendance, reminders, notifications, or "
                "programme records."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_activity_map",
            "label": "Ask a Community Domain admin to review the activity map",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not active_operating_nodes:
        primary_next_action = {
            "action_key": "map_operating_units_for_activity",
            "label": "Map operating units before activity tracking",
            "route_hint": f"/community-domains/{domain_id}/rollout-tree",
            "requires_admin": True,
        }
    elif not active_policy_count:
        primary_next_action = {
            "action_key": "add_activity_governance_policy",
            "label": "Add governance policy for important activities",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    elif open_review_count:
        primary_next_action = {
            "action_key": "review_open_activity_related_decisions",
            "label": "Review open activity-related governance decisions",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_activity_boundaries",
            "label": "Review Community Domain activity boundaries",
            "route_hint": f"/community-domains/{domain_id}/institutional-profile",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "template": {
            "template_key": template["template_key"],
            "domain_type": template["domain_type"],
            "label": template["label"],
            "marketplace_role": marketplace_role,
            "activity_lanes": activity_lanes,
            "default_modules": list(template.get("default_modules") or []),
        },
        "summary": {
            "activity_lane_count": len(activity_lanes),
            "active_operating_unit_count": len(active_operating_nodes),
            "active_member_count": int(active_member_count),
            "active_policy_count": admin_count(active_policy_count),
            "review_record_count": admin_count(review_count),
            "open_review_count": admin_count(open_review_count),
            "evidence_record_count": admin_count(evidence_count),
            "paid_activity_status": "not_connected_in_this_slice",
            "scheduled_activity_status": "not_connected_in_this_slice",
            "marketplace_metering_status": "not_metered_in_this_slice",
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain activity map is read-only operating-activity "
            "planning. This endpoint does not create activities, events, meetings, "
            "classes, services, programmes, attendance, dues, levies, travel "
            "fees, contributions, tickets, subscriptions, payment instructions, "
            "invoices, receipts, bank matches, ledger entries, payouts, money "
            "movement, marketplace records, shops, listings, demand, Spotlight, "
            "notifications, TrustSlips, Trust Passport entries, public proof, or "
            "private member/review/evidence/finance exposure."
        ),
    }


def _community_domain_activity_group_readiness_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == domain_id)
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.name.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    active_policies = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .all()
    )
    reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .all()
    )

    memberships_by_node: dict[int, list[CommunityNodeMembership]] = {}
    for membership in active_node_memberships:
        memberships_by_node.setdefault(int(membership.community_node_id), []).append(
            membership
        )

    policies_by_node: dict[Optional[int], list[CommunityDomainPolicy]] = {}
    for policy in active_policies:
        node_id = (
            int(policy.community_node_id)
            if policy.community_node_id is not None
            else None
        )
        policies_by_node.setdefault(node_id, []).append(policy)

    reviews_by_node: dict[Optional[int], int] = {}
    for review in reviews:
        node_id = (
            int(review.community_node_id)
            if review.community_node_id is not None
            else None
        )
        reviews_by_node[node_id] = reviews_by_node.get(node_id, 0) + 1

    def route_hint(suffix: str, *, requires_admin: bool = False) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def is_activity_group_candidate(node: CommunityNode) -> bool:
        if node.parent_node_id is None:
            return False
        text = " ".join(
            [
                _clean_role(node.node_type, ""),
                _clean_role(node.node_kind, ""),
                _clean_role(node.name, ""),
            ]
        )
        markers = {
            "activity_group",
            "group",
            "circle",
            "rosca",
            "contribution",
            "meeting",
            "project",
            "welfare",
            "team",
            "cluster",
        }
        return any(marker in text for marker in markers)

    def readiness_for(
        node: CommunityNode,
        *,
        local_member_count: int,
        local_facilitator_count: int,
        local_policy_count: int,
        review_count: int,
    ) -> tuple[str, str, bool]:
        if _clean_role(node.status, "active") != "active":
            return (
                "inactive",
                "Reactivate this operating unit before using it as an activity-group candidate.",
                False,
            )
        visibility = _clean_role(node.visibility_policy, "members")
        if visibility in {"public", "network", "external"}:
            return (
                "public_activity_group_review_needed",
                "Review public exposure before this group-like unit carries member activity.",
                False,
            )
        if local_facilitator_count <= 0:
            return (
                "needs_group_facilitator",
                "Assign a local facilitator or admin before this unit carries a small activity group.",
                False,
            )
        if local_member_count <= local_facilitator_count:
            return (
                "needs_group_members",
                "Place group members here before treating this as a real activity group.",
                False,
            )
        if local_policy_count <= 0:
            return (
                "needs_group_policy",
                "Add a local activity policy before this group carries ROSCA, meeting, welfare, or project work.",
                False,
            )
        if review_count <= 0:
            return (
                "needs_group_review_signal",
                "Record a reviewed activity signal before treating this group-like unit as ready.",
                False,
            )
        return (
            "node_like_group_ready_for_future_activity_group",
            "This node-like group has facilitator, members, policy, and reviewed activity signals for a future activity-group engine.",
            True,
        )

    candidate_nodes = [node for node in nodes if is_activity_group_candidate(node)]
    flat_groups: list[dict[str, Any]] = []
    status_counts: dict[str, int] = {}
    for node in candidate_nodes:
        node_id = int(node.id)
        local_memberships = memberships_by_node.get(node_id, [])
        local_facilitator_count = sum(
            1
            for row in local_memberships
            if _clean_role(row.role, "member") in NODE_ADMIN_ROLES
        )
        local_policy_count = len(policies_by_node.get(node_id, []))
        review_count = reviews_by_node.get(node_id, 0)
        readiness_status, next_step, planning_ready = readiness_for(
            node,
            local_member_count=len(local_memberships),
            local_facilitator_count=local_facilitator_count,
            local_policy_count=local_policy_count,
            review_count=review_count,
        )
        status_counts[readiness_status] = status_counts.get(readiness_status, 0) + 1
        if readiness_status == "public_activity_group_review_needed":
            admin_route = "/record-privacy-map"
        elif readiness_status == "needs_group_facilitator":
            admin_route = "/roles"
        elif readiness_status == "needs_group_members":
            admin_route = "/node-participation-map"
        elif readiness_status == "needs_group_policy":
            admin_route = "/policies"
        elif readiness_status == "needs_group_review_signal":
            admin_route = "/action-reviews/reviewer-queue"
        else:
            admin_route = f"/nodes/{node_id}/operating-summary"

        flat_groups.append(
            {
                "node": _node_payload(node),
                "activity_group_status": readiness_status,
                "ready_for_activity_group_planning": planning_ready,
                "activity_group_engine_status": "not_connected_in_this_slice",
                "visibility_policy": _clean_role(node.visibility_policy, "members"),
                "local_member_count": admin_count(len(local_memberships)),
                "local_facilitator_count": admin_count(local_facilitator_count),
                "local_policy_count": admin_count(local_policy_count),
                "review_record_count": admin_count(review_count),
                "activity_group_record_status": "not_created_in_this_slice",
                "rosca_cycle_status": "not_created_in_this_slice",
                "meeting_group_status": "not_created_in_this_slice",
                "project_group_status": "not_created_in_this_slice",
                "welfare_group_status": "not_created_in_this_slice",
                "attendance_status": "not_recorded_in_this_slice",
                "payment_status": "not_connected_in_this_slice",
                "route_hint": route_hint(f"/nodes/{node_id}/operating-summary"),
                "admin_action_route_hint": route_hint(
                    admin_route,
                    requires_admin=True,
                ),
                "next_step": next_step,
                "boundary": (
                    "Read-only activity-group readiness item. This does not "
                    "create CommunityActivityGroup records, ROSCA cycles, meeting "
                    "groups, project groups, welfare groups, attendance records, "
                    "payment instructions, ledger entries, notifications, "
                    "marketplace records, TrustSlips, Trust Passport entries, or "
                    "private member activity."
                ),
            }
        )

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_activity_groups",
            "label": "Ask a Community Domain admin to review activity groups",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not candidate_nodes:
        primary_next_action = {
            "action_key": "map_group_like_units_before_activity_groups",
            "label": "Map group-like units before activity-group planning",
            "route_hint": route_hint("/rollout-tree", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("public_activity_group_review_needed", 0):
        primary_next_action = {
            "action_key": "review_public_activity_group_exposure",
            "label": "Review public activity-group exposure",
            "route_hint": route_hint("/record-privacy-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_group_facilitator", 0):
        primary_next_action = {
            "action_key": "assign_activity_group_facilitators",
            "label": "Assign activity-group facilitators",
            "route_hint": route_hint("/roles", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_group_members", 0):
        primary_next_action = {
            "action_key": "place_activity_group_members",
            "label": "Place members in group-like units",
            "route_hint": route_hint("/node-participation-map", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_group_policy", 0):
        primary_next_action = {
            "action_key": "add_activity_group_policy",
            "label": "Add activity-group policy",
            "route_hint": route_hint("/policies", requires_admin=True),
            "requires_admin": True,
        }
    elif status_counts.get("needs_group_review_signal", 0):
        primary_next_action = {
            "action_key": "record_activity_group_review_signal",
            "label": "Record reviewed activity-group signal",
            "route_hint": route_hint(
                "/action-reviews/reviewer-queue",
                requires_admin=True,
            ),
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "keep_activity_group_planning_read_only",
            "label": "Keep activity-group planning read-only",
            "route_hint": route_hint("/activity-map"),
            "requires_admin": False,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "node_count": len(nodes),
            "activity_group_candidate_count": len(candidate_nodes),
            "activity_group_engine_status": "not_connected_in_this_slice",
            "activity_group_records_created": 0,
            "rosca_cycles_created": 0,
            "meeting_groups_created": 0,
            "project_groups_created": 0,
            "welfare_groups_created": 0,
            "active_node_memberships": admin_count(len(active_node_memberships)),
            "active_policies": admin_count(len(active_policies)),
            "review_records": admin_count(len(reviews)),
        },
        "flat_groups": flat_groups,
        "status_counts": status_counts,
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain activity-group readiness is read-only group planning. "
            "It identifies group-like CommunityNode records that may later become "
            "real CommunityActivityGroup records for ROSCA circles, meetings, "
            "project groups, welfare groups, or other small operating groups. It "
            "does not create activity groups, create ROSCA cycles, create meetings, "
            "record attendance, create payment instructions, write ledger entries, "
            "send notifications, create marketplace records, move money, issue "
            "TrustSlips, write Trust Passport entries, or expose private member "
            "activity."
        ),
    }


def _community_domain_member_verification_map_payload(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    can_admin: bool,
) -> dict[str, Any]:
    domain_id = int(domain.id)
    root_node = _find_root_node(db, community_domain_id=domain_id)
    active_members = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == domain_id)
        .filter(CommunityDomainMembership.status == "active")
        .all()
    )
    active_member_ids = {int(row.user_id) for row in active_members}
    active_node_memberships = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == domain_id)
        .filter(CommunityNodeMembership.status == "active")
        .all()
    )
    node_member_ids = {int(row.user_id) for row in active_node_memberships}

    member_role_counts: dict[str, int] = {}
    members_with_gsn_id = 0
    for row in active_members:
        role = _clean_role(row.role, "member")
        member_role_counts[role] = member_role_counts.get(role, 0) + 1
        if getattr(getattr(row, "user", None), "gmfn_id", None):
            members_with_gsn_id += 1

    node_role_counts: dict[str, int] = {}
    node_admin_assignment_count = 0
    for row in active_node_memberships:
        role = _clean_role(row.role, "member")
        node_role_counts[role] = node_role_counts.get(role, 0) + 1
        if role in NODE_ADMIN_ROLES:
            node_admin_assignment_count += 1

    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == domain_id)
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    member_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            (
                CommunityDomainActionReview.subject_user_id.isnot(None)
            )
            | (
                CommunityDomainActionReview.target_type.in_(
                    ["domain_member", "member", "node_member"]
                )
            )
        )
        .count()
    )
    open_member_review_count = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == domain_id)
        .filter(
            (
                CommunityDomainActionReview.subject_user_id.isnot(None)
            )
            | (
                CommunityDomainActionReview.target_type.in_(
                    ["domain_member", "member", "node_member"]
                )
            )
        )
        .filter(
            CommunityDomainActionReview.status.in_(
                ["pending", "pending_review", "needs_changes", "approved"]
            )
        )
        .count()
    )
    active_evidence_count = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.community_domain_id == domain_id)
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .count()
    )
    domain_admin_count = sum(
        1 for row in active_members if _clean_role(row.role, "member") in DOMAIN_ADMIN_ROLES
    )
    members_not_placed_count = max(len(active_member_ids - node_member_ids), 0)

    def route_hint(suffix: str, *, requires_admin: bool) -> Optional[str]:
        if requires_admin and not can_admin:
            return None
        return f"/community-domains/{domain_id}{suffix}"

    def admin_count(value: int) -> Optional[int]:
        return int(value) if can_admin else None

    def lane(
        lane_key: str,
        label: str,
        status: str,
        ready: bool,
        count: Optional[int],
        next_step: str,
        *,
        route_suffix: str,
        requires_admin: bool,
        boundary: str,
    ) -> dict[str, Any]:
        return {
            "lane_key": lane_key,
            "label": label,
            "status": status,
            "ready": bool(ready),
            "count": count,
            "route_hint": route_hint(route_suffix, requires_admin=requires_admin),
            "requires_admin": bool(requires_admin),
            "next_step": next_step,
            "boundary": boundary,
        }

    lanes = [
        lane(
            "membership_register",
            "Membership register",
            "present" if active_members else "empty",
            bool(active_members),
            len(active_members),
            "Keep the institutional membership register current before relying on verification signals.",
            route_suffix="/members",
            requires_admin=True,
            boundary=(
                "Membership register signal only. This does not invite, approve, "
                "remove, suspend, or change any member."
            ),
        ),
        lane(
            "global_identity_anchors",
            "Global identity anchors",
            "anchored" if members_with_gsn_id == len(active_members) and active_members else "incomplete",
            bool(active_members) and members_with_gsn_id == len(active_members),
            admin_count(members_with_gsn_id),
            "Confirm each institutional member carries one stable GSN/GMFN member ID.",
            route_suffix="/identity-context",
            requires_admin=True,
            boundary=(
                "Identity anchor aggregate only. This does not issue, repair, "
                "merge, rename, or verify a member ID."
            ),
        ),
        lane(
            "operating_unit_placement",
            "Operating unit placement",
            "placed" if not members_not_placed_count and active_members else "needs_placement",
            bool(active_members) and members_not_placed_count == 0,
            len(node_member_ids),
            "Place members into branches, lines, classes, departments, committees, or chapters where the institution needs local accountability.",
            route_suffix="/rollout-tree",
            requires_admin=False,
            boundary=(
                "Placement aggregate only. This does not place members, assign "
                "roles, or expose local member lists."
            ),
        ),
        lane(
            "role_appointments",
            "Role appointments",
            "admin_roles_present" if domain_admin_count or node_admin_assignment_count else "needs_admin_roles",
            bool(domain_admin_count or node_admin_assignment_count),
            admin_count(domain_admin_count + node_admin_assignment_count),
            "Record who can stand for the domain and who can stand for local units.",
            route_suffix="/delegation-map",
            requires_admin=True,
            boundary=(
                "Role appointment aggregate only. This does not appoint admins, "
                "grant permissions, or prove legal authority."
            ),
        ),
        lane(
            "governance_policy",
            "Governance policy",
            "policy_backed" if active_policy_count else "policy_needed",
            bool(active_policy_count),
            admin_count(active_policy_count),
            "Define what evidence or review is needed before a member claim becomes trusted.",
            route_suffix="/governance-coverage",
            requires_admin=True,
            boundary=(
                "Policy readiness only. This does not create policy, decide "
                "reviews, apply reviews, or verify members."
            ),
        ),
        lane(
            "member_review_evidence",
            "Member review evidence",
            "evidence_present" if active_evidence_count else "not_recorded",
            bool(active_evidence_count),
            admin_count(active_evidence_count),
            "Use action-review evidence as controlled metadata until a formal member credential flow exists.",
            route_suffix="/evidence-map",
            requires_admin=True,
            boundary=(
                "Evidence aggregate only. This does not upload files, expose "
                "storage keys, publish credentials, issue TrustSlips, or write "
                "Trust Passport entries."
            ),
        ),
        lane(
            "credential_boundary",
            "Credential boundary",
            "not_connected_in_this_slice",
            False,
            0,
            "Do not present Community Domain membership as a formal credential until credential issuance is deliberately built.",
            route_suffix="/trust-mobility",
            requires_admin=True,
            boundary=(
                "Credential boundary only. This does not issue badges, public "
                "credentials, certificates, TrustSlips, attestations, QR proof, "
                "or Trust Passport records."
            ),
        ),
    ]

    if not can_admin:
        primary_next_action = {
            "action_key": "ask_domain_admin_to_review_member_verification_map",
            "label": "Ask a Community Domain admin to review member verification readiness",
            "route_hint": None,
            "requires_admin": True,
        }
    elif not active_members:
        primary_next_action = {
            "action_key": "add_domain_members_before_verification",
            "label": "Add members before verification readiness can be mapped",
            "route_hint": f"/community-domains/{domain_id}/members",
            "requires_admin": True,
        }
    elif members_not_placed_count:
        primary_next_action = {
            "action_key": "place_members_into_operating_units",
            "label": "Place members into operating units",
            "route_hint": f"/community-domains/{domain_id}/rollout-tree",
            "requires_admin": True,
        }
    elif not active_policy_count:
        primary_next_action = {
            "action_key": "define_member_verification_policy",
            "label": "Define policy for member evidence and review",
            "route_hint": f"/community-domains/{domain_id}/governance-coverage",
            "requires_admin": True,
        }
    elif open_member_review_count:
        primary_next_action = {
            "action_key": "resolve_open_member_reviews",
            "label": "Resolve open member verification-related reviews",
            "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            "requires_admin": True,
        }
    else:
        primary_next_action = {
            "action_key": "review_member_verification_boundaries",
            "label": "Review member verification boundaries",
            "route_hint": f"/community-domains/{domain_id}/evidence-map",
            "requires_admin": True,
        }

    return {
        "community_domain": _domain_payload(domain, root_node=root_node),
        "viewer": {
            "user_id": int(current_user.id),
            "can_admin": bool(can_admin),
        },
        "summary": {
            "verification_status": domain.verification_status,
            "active_member_count": len(active_members),
            "members_with_gsn_id": admin_count(members_with_gsn_id),
            "members_without_unit_placement": admin_count(members_not_placed_count),
            "domain_admin_count": admin_count(domain_admin_count),
            "node_admin_assignment_count": admin_count(node_admin_assignment_count),
            "active_node_membership_count": len(active_node_memberships),
            "active_policy_count": admin_count(active_policy_count),
            "member_review_count": admin_count(member_review_count),
            "open_member_review_count": admin_count(open_member_review_count),
            "review_evidence_record_count": admin_count(active_evidence_count),
            "credential_issuance_status": "not_connected_in_this_slice",
        },
        "role_distribution": {
            "domain_roles": member_role_counts if can_admin else None,
            "node_roles": node_role_counts if can_admin else None,
        },
        "lanes": lanes,
        "ready_total": sum(1 for item in lanes if item["ready"]),
        "blocked_lanes": [item["lane_key"] for item in lanes if not item["ready"]],
        "primary_next_action": primary_next_action,
        "editable": False,
        "boundary": (
            "Community Domain member verification map is read-only readiness "
            "planning. This endpoint does not perform KYC, issue credentials, "
            "verify government identity, create or change members, place members "
            "in units, assign roles, grant permissions, create policy, decide "
            "reviews, upload evidence, expose storage keys, publish proof, issue "
            "TrustSlips, write Trust Passport entries, move money, or expose "
            "private member/review/evidence records."
        ),
    }


class CommunityDomainDraftIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    domain_name: str = Field(..., min_length=2, max_length=80)
    display_name: str = Field(..., min_length=2, max_length=160)
    domain_type: str = Field(default="generic_association", max_length=64)
    template_key: Optional[str] = Field(default=None, max_length=64)
    country: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=120)
    public_profile: Optional[str] = Field(default=None, max_length=1200)


class CommunityNodeCreateIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., min_length=2, max_length=160)
    parent_node_id: Optional[int] = Field(default=None, ge=1)
    node_type: str = Field(default="unit", max_length=64)
    node_kind: str = Field(default="administrative", max_length=64)
    description: Optional[str] = Field(default=None, max_length=1000)
    sort_order: int = Field(default=0, ge=0, le=100000)
    visibility_policy: str = Field(default="members", max_length=32)
    inherits_parent_policy: bool = True
    status: str = Field(default="active", max_length=24)


class CommunityNodeStatusUpdateIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: str = Field(..., max_length=24)
    status_note: Optional[str] = Field(default=None, max_length=1200)


class CommunityDomainMemberUpsertIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: int = Field(..., ge=1)
    role: str = Field(default="member", max_length=32)
    status: str = Field(default="active", max_length=24)
    title: Optional[str] = Field(default=None, max_length=120)


class CommunityDomainMembershipRequestIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    request_note: Optional[str] = Field(default=None, max_length=1200)
    title: Optional[str] = Field(default=None, max_length=120)


class CommunityNodeMemberUpsertIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: int = Field(..., ge=1)
    role: str = Field(default="member", max_length=32)
    status: str = Field(default="active", max_length=24)
    title: Optional[str] = Field(default=None, max_length=120)


class CommunityDomainPolicyUpsertIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    policy_key: str = Field(..., min_length=2, max_length=96)
    action_key: str = Field(..., min_length=2, max_length=96)
    community_node_id: Optional[int] = Field(default=None, ge=1)
    scope_type: str = Field(default="domain", max_length=24)
    review_mode: str = Field(default="domain_admin_review", max_length=48)
    required_role: Optional[str] = Field(default=None, max_length=48)
    status: str = Field(default="active", max_length=24)
    policy_summary: Optional[str] = Field(default=None, max_length=1200)
    config: Optional[dict[str, Any]] = None


class CommunityDomainActionReviewCreateIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    action_key: str = Field(..., min_length=2, max_length=96)
    community_node_id: Optional[int] = Field(default=None, ge=1)
    policy_id: Optional[int] = Field(default=None, ge=1)
    subject_user_id: Optional[int] = Field(default=None, ge=1)
    target_type: Optional[str] = Field(default=None, max_length=64)
    target_id: Optional[str] = Field(default=None, max_length=96)
    request_note: Optional[str] = Field(default=None, max_length=1200)
    payload: Optional[dict[str, Any]] = None


class CommunityDomainActionReviewDecisionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    decision: str = Field(..., pattern="^(approve|reject|needs_changes|recuse)$")
    decision_note: Optional[str] = Field(default=None, max_length=1200)


class CommunityDomainActionReviewCancelIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    cancel_note: Optional[str] = Field(default=None, max_length=1200)


class CommunityDomainActionReviewRevisionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    subject_user_id: Optional[int] = Field(default=None, ge=1)
    target_type: Optional[str] = Field(default=None, max_length=64)
    target_id: Optional[str] = Field(default=None, max_length=96)
    request_note: Optional[str] = Field(default=None, max_length=1200)
    payload: Optional[dict[str, Any]] = None


class CommunityDomainActionReviewCommentIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    body: str = Field(..., min_length=1, max_length=4000)


class CommunityDomainActionReviewEvidenceIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    evidence_type: str = Field(default="document", max_length=48)
    title: str = Field(..., min_length=2, max_length=160)
    description: Optional[str] = Field(default=None, max_length=1200)
    file_name: Optional[str] = Field(default=None, max_length=255)
    content_type: Optional[str] = Field(default=None, max_length=120)
    storage_key: Optional[str] = Field(default=None, max_length=512)
    external_reference: Optional[str] = Field(default=None, max_length=512)
    checksum: Optional[str] = Field(default=None, max_length=128)


def _get_domain_or_404(db: Session, community_domain_id: int) -> CommunityDomain:
    domain = db.get(CommunityDomain, int(community_domain_id))
    if domain is None:
        raise HTTPException(status_code=404, detail="Community Domain not found")
    return domain


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, int(user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_node_or_404(
    db: Session,
    *,
    community_domain_id: int,
    community_node_id: int,
) -> CommunityNode:
    node = (
        db.query(CommunityNode)
        .filter(CommunityNode.id == int(community_node_id))
        .filter(CommunityNode.community_domain_id == int(community_domain_id))
        .first()
    )
    if node is None:
        raise HTTPException(
            status_code=404,
            detail="Node was not found inside this Community Domain.",
        )
    return node


def _ensure_node_accepts_writes(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
) -> None:
    current: Optional[CommunityNode] = node
    while current is not None:
        if _clean_role(current.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_node_inactive",
                    "message": "This Community Domain node or one of its parent nodes is not active, so new structure, policies, placements, or action reviews cannot be added to it.",
                },
            )
        if current.parent_node_id is None:
            return
        current = (
            db.query(CommunityNode)
            .filter(CommunityNode.community_domain_id == int(domain.id))
            .filter(CommunityNode.id == int(current.parent_node_id))
            .first()
        )
    raise HTTPException(
        status_code=404,
        detail={
            "code": "community_domain_node_parent_missing",
            "message": "This Community Domain node points to a missing parent node.",
        },
    )


def _requested_node_status(payload: dict[str, Any]) -> str:
    return _clean_role(str(payload.get("new_status") or payload.get("status") or ""))


def _ensure_node_accepts_action_review_request(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    action_key: str,
    payload: dict[str, Any],
) -> None:
    if action_key == "node.status.update":
        requested_status = _requested_node_status(payload)
        if requested_status not in NODE_STATUS_VALUES:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "community_domain_node_status_invalid",
                    "message": "Node status must be active, inactive, or archived.",
                },
            )
        if (
            requested_status == "active"
            and _clean_role(node.status, "inactive") != "active"
            and node.parent_node_id is not None
        ):
            parent_node = _get_node_or_404(
                db,
                community_domain_id=int(domain.id),
                community_node_id=int(node.parent_node_id),
            )
            _ensure_node_accepts_writes(db, domain=domain, node=parent_node)
            return

    _ensure_node_accepts_writes(db, domain=domain, node=node)


def _ensure_node_status_review_target_matches(
    *,
    node: CommunityNode,
    target_type: Optional[str],
    target_id: Optional[str],
    review_payload: Optional[dict[str, Any]] = None,
) -> None:
    clean_target_type = _clean_role(target_type or "")
    if clean_target_type and clean_target_type != "community_node":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_node_status_target_mismatch",
                "message": "Node status reviews must target the same Community Domain node as their review scope.",
            },
        )
    clean_target_id = _clean_str(target_id)
    if clean_target_id:
        try:
            target_node_id = int(clean_target_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "invalid_action_review_payload",
                    "message": "Node status review target_id must be the Community Domain node id.",
                },
            ) from exc
        if target_node_id != int(node.id):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_node_status_target_mismatch",
                    "message": "Node status reviews must target the same Community Domain node as their review scope.",
                },
            )

    if review_payload is not None and review_payload.get("community_node_id") is not None:
        try:
            payload_node_id = int(review_payload.get("community_node_id") or 0)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "invalid_action_review_payload",
                    "message": "Node status review payload community_node_id must be the scoped node id.",
                },
            ) from exc
        if payload_node_id != int(node.id):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_node_status_target_mismatch",
                    "message": "Node status reviews must target the same Community Domain node as their review scope.",
                },
            )


def _normalize_node_status_review_payload(
    *,
    node: CommunityNode,
    review_payload: dict[str, Any],
    request_note: Optional[str],
    target_type: Optional[str],
    target_id: Optional[str],
) -> dict[str, Any]:
    _ensure_node_status_review_target_matches(
        node=node,
        target_type=target_type,
        target_id=target_id,
        review_payload=review_payload,
    )

    if node.parent_node_id is None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_root_node_status_immutable",
                "message": "The root Community Domain node is controlled by the domain lifecycle, not node status reviews.",
            },
        )
    requested_status = _requested_node_status(review_payload)
    if requested_status not in NODE_STATUS_VALUES:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_node_status_invalid",
                "message": "Node status must be active, inactive, or archived.",
            },
        )
    previous_status = _clean_role(node.status, "inactive")
    status_note = (
        _clean_str(
            str(review_payload.get("status_note") or review_payload.get("note") or "")
        )
        or _clean_str(request_note)
        or None
    )
    if previous_status != requested_status and not status_note:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_node_status_note_required",
                "message": "A status note is required when changing a Community Domain node status.",
            },
        )

    normalized_payload = dict(review_payload)
    normalized_payload.update(
        {
            "community_node_id": int(node.id),
            "previous_status": previous_status,
            "new_status": requested_status,
            "status_note": status_note,
        }
    )
    return normalized_payload


def _get_policy_or_404(
    db: Session,
    *,
    community_domain_id: int,
    policy_id: int,
) -> CommunityDomainPolicy:
    policy = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.id == int(policy_id))
        .filter(CommunityDomainPolicy.community_domain_id == int(community_domain_id))
        .first()
    )
    if policy is None:
        raise HTTPException(status_code=404, detail="Community Domain policy not found")
    return policy


def _get_action_review_or_404(
    db: Session,
    *,
    community_domain_id: int,
    review_id: int,
) -> CommunityDomainActionReview:
    row = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.id == int(review_id))
        .filter(CommunityDomainActionReview.community_domain_id == int(community_domain_id))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Community Domain action review not found")
    return row


def _required_review_approvals(row: CommunityDomainActionReview) -> int:
    policy = getattr(row, "policy", None)
    config = _json_load(getattr(policy, "config_json", None))
    raw_value = config.get("min_approvals", config.get("min_reviewers", 1))
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        value = 1
    return max(1, min(value, 25))


def _payload_int(payload: dict[str, Any], key: str) -> int:
    try:
        value = int(payload.get(key) or 0)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "invalid_action_review_payload",
                "message": f"Action review payload must include a valid {key}.",
            },
        ) from exc
    if value <= 0:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "invalid_action_review_payload",
                "message": f"Action review payload must include a valid {key}.",
            },
        )
    return value


def _ensure_member_action_review_target_matches(
    *,
    action_key: str,
    payload: dict[str, Any],
    target_type: Optional[str],
    target_id: Optional[str],
    subject_user_id: Optional[int] = None,
) -> None:
    expected_target_type: Optional[str] = None
    if action_key == "domain_member.upsert":
        expected_target_type = "domain_member"
    elif action_key in {"node_member.upsert", "node_member.role_change"}:
        expected_target_type = "node_member"

    if expected_target_type is None:
        return

    clean_target_type = _clean_role(target_type or "")
    if clean_target_type and clean_target_type != expected_target_type:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_member_action_target_mismatch",
                "message": "Member action reviews must target the same member named in their payload.",
            },
        )

    if payload.get("user_id") is None:
        return
    payload_user_id = _payload_int(payload, "user_id")
    if subject_user_id is not None and int(subject_user_id) != payload_user_id:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_member_action_target_mismatch",
                "message": "Member action reviews must target the same member named in their payload.",
            },
        )
    clean_target_id = _clean_str(target_id)
    if not clean_target_id:
        return
    try:
        target_user_id = int(clean_target_id)
    except (TypeError, ValueError):
        return
    if target_user_id != payload_user_id:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_member_action_target_mismatch",
                "message": "Member action reviews must target the same member named in their payload.",
            },
        )


def _domain_membership_for_user(
    db: Session,
    *,
    community_domain_id: int,
    user_id: int,
) -> Optional[CommunityDomainMembership]:
    return (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(community_domain_id))
        .filter(CommunityDomainMembership.user_id == int(user_id))
        .first()
    )


def _active_domain_membership_for_user(
    db: Session,
    *,
    community_domain_id: int,
    user_id: int,
) -> Optional[CommunityDomainMembership]:
    membership = _domain_membership_for_user(
        db,
        community_domain_id=int(community_domain_id),
        user_id=int(user_id),
    )
    if membership is None:
        return None
    if _clean_role(membership.status, "inactive") != "active":
        return None
    return membership


def _has_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> bool:
    if _clean_role(getattr(current_user, "role", "")) == "admin":
        return True
    if int(domain.owner_user_id) == int(current_user.id):
        return True

    membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    return membership is not None and _clean_role(membership.role) in DOMAIN_ADMIN_ROLES


def _require_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> None:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return
    raise HTTPException(
        status_code=403,
        detail="Only a Community Domain owner or domain admin can perform this action.",
    )


def _require_domain_member_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> None:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return
    membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    if membership is not None:
        return
    raise HTTPException(
        status_code=403,
        detail="Only active Community Domain members can view this domain.",
    )


def _active_node_membership_for_user(
    db: Session,
    *,
    domain: CommunityDomain,
    community_node_id: int,
    user_id: int,
) -> Optional[CommunityNodeMembership]:
    if (
        _active_domain_membership_for_user(
            db,
            community_domain_id=int(domain.id),
            user_id=int(user_id),
        )
        is None
    ):
        return None
    membership = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id == int(community_node_id))
        .filter(CommunityNodeMembership.user_id == int(user_id))
        .first()
    )
    if membership is None:
        return None
    if _clean_role(membership.status, "inactive") != "active":
        return None
    return membership


def _has_node_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    current_user: User,
) -> bool:
    membership = _active_node_membership_for_user(
        db,
        domain=domain,
        community_node_id=int(node.id),
        user_id=int(current_user.id),
    )
    return membership is not None and _clean_role(membership.role) in NODE_ADMIN_ROLES


def _descendant_node_ids(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    include_descendants: bool,
) -> list[int]:
    if not include_descendants:
        return [int(node.id)]

    path = _clean_str(node.path)
    if not path:
        return [int(node.id)]

    rows = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .filter(
            (CommunityNode.id == int(node.id))
            | (CommunityNode.path.like(f"{path}/%"))
        )
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    return [int(item.id) for item in rows]


def _node_lifecycle_impact_summary(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
) -> dict[str, Any]:
    node_scope_ids = _descendant_node_ids(
        db,
        domain=domain,
        node=node,
        include_descendants=True,
    )
    open_review_statuses = {"pending", "pending_review", "needs_changes", "approved"}
    open_reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
        .filter(CommunityDomainActionReview.status.in_(open_review_statuses))
        .all()
    )
    reviews_by_status: dict[str, int] = {}
    for review in open_reviews:
        status_key = _clean_role(review.status, "unknown")
        reviews_by_status[status_key] = reviews_by_status.get(status_key, 0) + 1

    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id.in_(node_scope_ids))
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.community_node_id.in_(node_scope_ids))
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    return {
        "node_scope_ids": node_scope_ids,
        "descendant_node_count": max(len(node_scope_ids) - 1, 0),
        "active_node_member_count": int(active_node_member_count),
        "active_policy_count": int(active_policy_count),
        "open_action_review_count": len(open_reviews),
        "open_action_reviews_by_status": reviews_by_status,
    }


def _node_inherits_policy_from_node(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    ancestor_node_id: int,
) -> bool:
    if int(node.id) == int(ancestor_node_id):
        return True

    current = node
    while current.parent_node_id is not None:
        if not bool(current.inherits_parent_policy):
            return False
        if int(current.parent_node_id) == int(ancestor_node_id):
            return True
        parent = (
            db.query(CommunityNode)
            .filter(CommunityNode.community_domain_id == int(domain.id))
            .filter(CommunityNode.id == int(current.parent_node_id))
            .first()
        )
        if parent is None:
            return False
        current = parent

    return False


def _policy_can_govern_node(
    db: Session,
    *,
    domain: CommunityDomain,
    policy: CommunityDomainPolicy,
    node: Optional[CommunityNode],
) -> bool:
    if policy.community_node_id is None:
        return True
    if node is None:
        return False
    return _node_inherits_policy_from_node(
        db,
        domain=domain,
        node=node,
        ancestor_node_id=int(policy.community_node_id),
    )


def _require_node_or_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    current_user: User,
) -> str:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return "domain_admin"
    if _has_node_admin_scope(db, domain=domain, node=node, current_user=current_user):
        return "node_admin"
    raise HTTPException(
        status_code=403,
        detail="Only a domain admin or node admin can manage this node.",
    )


def _require_policy_reviewer_role(
    db: Session,
    *,
    domain: CommunityDomain,
    node: Optional[CommunityNode],
    policy: Optional[CommunityDomainPolicy],
    current_user: User,
) -> None:
    required_role = _clean_str(getattr(policy, "required_role", None)).lower().replace(" ", "_")
    if not required_role:
        return
    if _clean_role(getattr(current_user, "role", "")) == "admin":
        return
    if int(domain.owner_user_id) == int(current_user.id) and required_role in {"owner", "domain_admin", "admin"}:
        return

    domain_membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    if domain_membership is not None and _clean_role(domain_membership.role) == required_role:
        return

    if node is not None:
        node_membership = _active_node_membership_for_user(
            db,
            domain=domain,
            community_node_id=int(node.id),
            user_id=int(current_user.id),
        )
        if node_membership is not None and _clean_role(node_membership.role) == required_role:
            return
        if (
            policy is not None
            and policy.community_node_id is not None
            and int(policy.community_node_id) != int(node.id)
            and _policy_can_govern_node(
                db,
                domain=domain,
                policy=policy,
                node=node,
            )
        ):
            policy_scope_membership = _active_node_membership_for_user(
                db,
                domain=domain,
                community_node_id=int(policy.community_node_id),
                user_id=int(current_user.id),
            )
            if (
                policy_scope_membership is not None
                and _clean_role(policy_scope_membership.role) == required_role
            ):
                return

    raise HTTPException(
        status_code=403,
        detail={
            "code": "community_domain_reviewer_role_required",
            "message": f"This review requires a reviewer with the {required_role} role.",
        },
    )


def _can_decide_action_review(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> bool:
    if _clean_role(row.status) not in {"pending", "pending_review"}:
        return False
    if int(row.requested_by_user_id) == int(current_user.id):
        return False

    try:
        node = _require_action_review_decider_scope(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )
        _require_policy_reviewer_role(
            db,
            domain=domain,
            node=node,
            policy=getattr(row, "policy", None),
            current_user=current_user,
        )
    except HTTPException:
        return False

    return True


def _has_user_decision(row: CommunityDomainActionReview, user_id: int) -> bool:
    return any(
        int(decision.decided_by_user_id) == int(user_id)
        for decision in (getattr(row, "decisions", []) or [])
    )


def _require_action_review_decider_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> Optional[CommunityNode]:
    if row.community_node_id is None:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)
        return None

    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(row.community_node_id),
    )
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return node

    try:
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        return node
    except HTTPException:
        policy = getattr(row, "policy", None)
        if (
            policy is None
            or policy.community_node_id is None
            or not _policy_can_govern_node(
                db,
                domain=domain,
                policy=policy,
                node=node,
            )
        ):
            raise

        policy_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(policy.community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=policy_node,
            current_user=current_user,
        )
        return node


def _require_action_review_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> tuple[Optional[CommunityNode], str]:
    if row.community_node_id is None:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)
        return None, "domain_admin"

    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(row.community_node_id),
    )
    try:
        actor_scope = _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        return node, actor_scope
    except HTTPException:
        policy = getattr(row, "policy", None)
        if (
            policy is None
            or policy.community_node_id is None
            or not _policy_can_govern_node(
                db,
                domain=domain,
                policy=policy,
                node=node,
            )
        ):
            raise

        policy_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(policy.community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=policy_node,
            current_user=current_user,
        )
        return node, "node_admin"


def _can_view_action_review(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> bool:
    if int(row.requested_by_user_id) == int(current_user.id):
        return True
    if _has_user_decision(row, int(current_user.id)):
        return True
    if (
        row.decided_by_user_id is not None
        and int(row.decided_by_user_id) == int(current_user.id)
    ):
        return True
    if (
        row.applied_by_user_id is not None
        and int(row.applied_by_user_id) == int(current_user.id)
    ):
        return True

    try:
        _require_action_review_admin_scope(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )
        return True
    except HTTPException:
        return _can_decide_action_review(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )


def _can_contribute_to_action_review(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> bool:
    if int(row.requested_by_user_id) == int(current_user.id):
        return True

    try:
        _require_action_review_admin_scope(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )
        return True
    except HTTPException:
        return _can_decide_action_review(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )


def _ensure_action_review_accepts_append(row: CommunityDomainActionReview) -> None:
    if _clean_role(row.status) in {"pending", "pending_review"}:
        return
    raise HTTPException(
        status_code=409,
        detail={
            "code": "community_domain_review_append_closed",
            "message": "Comments and evidence can only be added while this Community Domain action review is pending.",
        },
    )


def _find_root_node(db: Session, community_domain_id: int) -> Optional[CommunityNode]:
    return (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(community_domain_id))
        .filter(CommunityNode.parent_node_id.is_(None))
        .order_by(CommunityNode.depth.asc(), CommunityNode.id.asc())
        .first()
    )


def _matching_policy(
    db: Session,
    *,
    community_domain_id: int,
    action_key: str,
    community_node_id: Optional[int],
) -> Optional[CommunityDomainPolicy]:
    query = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(community_domain_id))
        .filter(CommunityDomainPolicy.action_key == _clean_role(action_key))
        .filter(CommunityDomainPolicy.status == "active")
    )
    if community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(community_domain_id),
            community_node_id=int(community_node_id),
        )
        node_policy = (
            query.filter(CommunityDomainPolicy.community_node_id == int(community_node_id))
            .order_by(CommunityDomainPolicy.id.desc())
            .first()
        )
        if node_policy is not None:
            return node_policy

        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent_policy = (
                query.filter(
                    CommunityDomainPolicy.community_node_id == int(current.parent_node_id)
                )
                .order_by(CommunityDomainPolicy.id.desc())
                .first()
            )
            if parent_policy is not None:
                return parent_policy
            parent = (
                db.query(CommunityNode)
                .filter(CommunityNode.community_domain_id == int(community_domain_id))
                .filter(CommunityNode.id == int(current.parent_node_id))
                .first()
            )
            if parent is None:
                break
            current = parent

    return (
        query.filter(CommunityDomainPolicy.community_node_id.is_(None))
        .order_by(CommunityDomainPolicy.id.desc())
        .first()
    )


@router.get("/availability", response_model=dict[str, Any])
def check_community_domain_availability(
    domain_name: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
):
    return _domain_available_payload(db, domain_name)


@router.get("/templates", response_model=dict[str, Any])
def list_community_domain_templates():
    return {
        "ok": True,
        "items": COMMUNITY_DOMAIN_TEMPLATE_PRESETS,
        "total": len(COMMUNITY_DOMAIN_TEMPLATE_PRESETS),
        "boundary": (
            "Templates are public presets for structure and module planning only. "
            "They do not create a Community Domain, activate billing, verify ownership, "
            "or create separate schemas for each society type."
        ),
    }


@router.get("/templates/{template_key}/operating-blueprint", response_model=dict[str, Any])
def get_community_domain_template_operating_blueprint(template_key: str):
    template = _community_domain_template_for_key_or_none(template_key)
    if template is None:
        raise HTTPException(
            status_code=404,
            detail="Community Domain template not found",
        )
    return {
        "ok": True,
        "operating_blueprint": _community_domain_template_operating_blueprint_payload(
            template=template,
        ),
    }


@router.post("/drafts", status_code=201, response_model=dict[str, Any])
def create_community_domain_draft(
    payload: CommunityDomainDraftIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    availability = _domain_available_payload(db, payload.domain_name)
    if not availability["available"]:
        raise HTTPException(
            status_code=409,
            detail={
                "code": availability["reason"],
                "message": "This Community Domain name is not available.",
                "availability": availability,
            },
        )

    domain_type = _clean_template_key(payload.domain_type, "generic_association")
    template_key = _clean_template_key(payload.template_key, domain_type)
    template = _community_domain_template_for_key_or_none(template_key)
    if template is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_template_not_supported",
                "message": (
                    "Choose a supported Community Domain template before "
                    "creating a draft."
                ),
                "template_key": template_key,
                "domain_type": domain_type,
            },
        )
    domain_type_template = _community_domain_template_for_key_or_none(domain_type)
    if domain_type_template is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_type_not_supported",
                "message": (
                    "Choose a supported Community Domain type before "
                    "creating a draft."
                ),
                "template_key": template_key,
                "domain_type": domain_type,
            },
        )
    if (
        domain_type_template is not None
        and domain_type_template["template_key"] != template["template_key"]
    ):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_template_mismatch",
                "message": (
                    "The Community Domain type and template must describe "
                    "the same approved institutional preset."
                ),
                "template_key": template_key,
                "domain_type": domain_type,
                "expected_template_key": domain_type_template["template_key"],
            },
        )

    domain = CommunityDomain(
        domain_name=availability["normalized_domain_name"],
        display_name=_clean_str(payload.display_name),
        domain_type=domain_type,
        template_key=template_key,
        owner_user_id=int(current_user.id),
        status="draft",
        verification_status="unverified",
        country=_clean_str(payload.country) or None,
        state=_clean_str(payload.state) or None,
        public_profile=_clean_str(payload.public_profile) or None,
    )
    db.add(domain)

    try:
        db.flush()
        root_node = CommunityNode(
            community_domain_id=int(domain.id),
            name=domain.display_name,
            node_type="root",
            node_kind="institution",
            path=f"/{int(domain.id)}",
            depth=0,
            visibility_policy="members",
            inherits_parent_policy=True,
            status="active",
        )
        db.add(root_node)
        db.add(
            CommunityDomainMembership(
                community_domain_id=int(domain.id),
                user_id=int(current_user.id),
                role="owner",
                status="active",
                title="Domain owner",
            )
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "domain_name_taken",
                "message": "This Community Domain name is already reserved.",
            },
        ) from exc

    db.refresh(domain)
    db.refresh(root_node)

    return {
        "ok": True,
        "community_domain": _domain_payload(domain, root_node=root_node),
    }


@router.post("/{community_domain_id}/package-quote", response_model=dict[str, Any])
def create_community_domain_package_quote(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "quote": _community_domain_package_quote_payload(domain),
        "boundary": (
            "Package quote only. This route does not create a payment instruction, "
            "record payment, activate billing, activate a Community Domain, or "
            "verify ownership."
        ),
    }


@router.get("/my", response_model=dict[str, Any])
def list_my_community_domains(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.user_id == int(current_user.id))
        .filter(CommunityDomainMembership.status == "active")
        .order_by(CommunityDomainMembership.id.desc())
        .all()
    )

    items: list[dict[str, Any]] = []
    seen_domain_ids: set[int] = set()
    for membership in memberships:
        domain_id = int(membership.community_domain_id)
        if domain_id in seen_domain_ids:
            continue
        seen_domain_ids.add(domain_id)

        domain = (
            db.query(CommunityDomain)
            .filter(CommunityDomain.id == domain_id)
            .first()
        )
        if domain is None:
            continue

        root_node = _find_root_node(db, community_domain_id=domain_id)
        can_admin = _has_domain_admin_scope(
            db,
            domain=domain,
            current_user=current_user,
        )
        items.append(
            {
                "community_domain": _domain_payload(domain, root_node=root_node),
                "membership": _domain_member_payload(membership),
                "viewer": {
                    "user_id": int(current_user.id),
                    "can_admin": bool(can_admin),
                },
                "dashboard_path": f"/app/community-domain/{domain_id}",
                "backend_dashboard_route": f"/community-domains/{domain_id}/dashboard",
            }
        )

    return {
        "ok": True,
        "items": items,
        "total": len(items),
        "boundary": (
            "Current user's active Community Domain memberships only. This does not "
            "expose private member lists, finance records, evidence attachments, "
            "payment instructions, activation authority, verification authority, "
            "or domains the current user does not actively belong to."
        ),
    }


@router.get("/lookup", response_model=dict[str, Any])
def lookup_community_domain_by_name(
    domain_name: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
):
    normalized = normalize_domain_name(domain_name)
    reason = _domain_name_unavailable_reason(normalized)
    if reason:
        raise HTTPException(
            status_code=422,
            detail={
                "code": reason,
                "message": "Enter a valid Community Domain name or code.",
                "normalized_domain_name": normalized,
            },
        )

    domain = (
        db.query(CommunityDomain)
        .filter(CommunityDomain.domain_name == normalized)
        .first()
    )
    if domain is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "community_domain_not_found",
                "message": "GSN could not find that Community Domain code.",
                "normalized_domain_name": normalized,
            },
        )

    return {
        "ok": True,
        "domain_name": domain_name,
        "normalized_domain_name": normalized,
        "community_domain": _public_domain_entry_payload(domain),
        "boundary": (
            "Lookup returns public-safe Community Domain identity and the next "
            "safe route only. It does not prove verification, expose private "
            "records, add membership, send notifications, or publish a final "
            "public proof page."
        ),
    }


@router.get("/{community_domain_id}", response_model=dict[str, Any])
def get_community_domain(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=int(domain.id)),
        ),
    }


@router.get("/{community_domain_id}/dashboard", response_model=dict[str, Any])
def get_community_domain_dashboard(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "dashboard": _community_domain_dashboard_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/operating-map", response_model=dict[str, Any])
def get_community_domain_operating_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "operating_map": _community_domain_operating_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/template-fit", response_model=dict[str, Any])
def get_community_domain_template_fit(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "template_fit": _community_domain_template_fit_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/setup-plan", response_model=dict[str, Any])
def get_community_domain_setup_plan(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "setup_plan": _community_domain_setup_plan_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/capacity-plan", response_model=dict[str, Any])
def get_community_domain_capacity_plan(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "capacity_plan": _community_domain_capacity_plan_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/rollout-plan", response_model=dict[str, Any])
def get_community_domain_rollout_plan(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "rollout_plan": _community_domain_rollout_plan_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/rollout-tree", response_model=dict[str, Any])
def get_community_domain_rollout_tree(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "rollout_tree": _community_domain_rollout_tree_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-autonomy-map", response_model=dict[str, Any])
def get_community_domain_node_autonomy_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_autonomy_map": _community_domain_node_autonomy_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-economic-map", response_model=dict[str, Any])
def get_community_domain_node_economic_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_economic_map": _community_domain_node_economic_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-activity-map", response_model=dict[str, Any])
def get_community_domain_node_activity_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_activity_map": _community_domain_node_activity_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-trust-map", response_model=dict[str, Any])
def get_community_domain_node_trust_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_trust_map": _community_domain_node_trust_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-participation-map", response_model=dict[str, Any])
def get_community_domain_node_participation_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_participation_map": _community_domain_node_participation_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-service-map", response_model=dict[str, Any])
def get_community_domain_node_service_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_service_map": _community_domain_node_service_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-privacy-map", response_model=dict[str, Any])
def get_community_domain_node_privacy_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_privacy_map": _community_domain_node_privacy_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-analytics-map", response_model=dict[str, Any])
def get_community_domain_node_analytics_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_analytics_map": _community_domain_node_analytics_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-domain-boundary-map", response_model=dict[str, Any])
def get_community_domain_node_domain_boundary_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_domain_boundary_map": _community_domain_node_domain_boundary_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-evidence-authority-map", response_model=dict[str, Any])
def get_community_domain_node_evidence_authority_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_evidence_authority_map": _community_domain_node_evidence_authority_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-communication-map", response_model=dict[str, Any])
def get_community_domain_node_communication_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_communication_map": _community_domain_node_communication_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-vault-map", response_model=dict[str, Any])
def get_community_domain_node_vault_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_vault_map": _community_domain_node_vault_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-scheduled-activity-map", response_model=dict[str, Any])
def get_community_domain_node_scheduled_activity_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_scheduled_activity_map": _community_domain_node_scheduled_activity_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/node-paid-activity-map", response_model=dict[str, Any])
def get_community_domain_node_paid_activity_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node_paid_activity_map": _community_domain_node_paid_activity_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/governance-coverage", response_model=dict[str, Any])
def get_community_domain_governance_coverage(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "governance_coverage": _community_domain_governance_coverage_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/analytics", response_model=dict[str, Any])
def get_community_domain_analytics(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "analytics": _community_domain_analytics_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/evidence-map", response_model=dict[str, Any])
def get_community_domain_evidence_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "evidence_map": _community_domain_evidence_map_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/evidence-record-readiness", response_model=dict[str, Any])
def get_community_domain_evidence_record_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "evidence_record_readiness": _community_domain_evidence_record_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/evidence-release-readiness", response_model=dict[str, Any])
def get_community_domain_evidence_release_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "evidence_release_readiness": _community_domain_evidence_release_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/trust-relay-readiness", response_model=dict[str, Any])
def get_community_domain_trust_relay_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "trust_relay_readiness": _community_domain_trust_relay_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/notification-scope-readiness", response_model=dict[str, Any])
def get_community_domain_notification_scope_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "notification_scope_readiness": _community_domain_notification_scope_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/trust-mobility", response_model=dict[str, Any])
def get_community_domain_trust_mobility(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "trust_mobility": _community_domain_trust_mobility_payload(
            db,
            domain=domain,
            current_user=current_user,
        ),
    }


@router.get("/{community_domain_id}/subscription-lifecycle", response_model=dict[str, Any])
def get_community_domain_subscription_lifecycle(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "subscription_lifecycle": _community_domain_subscription_lifecycle_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/social-bridge", response_model=dict[str, Any])
def get_community_domain_social_bridge(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "social_bridge": _community_domain_social_bridge_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/affiliation-readiness", response_model=dict[str, Any])
def get_community_domain_affiliation_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "affiliation_readiness": _community_domain_affiliation_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/institutional-profile", response_model=dict[str, Any])
def get_community_domain_institutional_profile(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "institutional_profile": _community_domain_institutional_profile_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/delegation-map", response_model=dict[str, Any])
def get_community_domain_delegation_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "delegation_map": _community_domain_delegation_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/identity-context", response_model=dict[str, Any])
def get_community_domain_identity_context(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(
        db,
        domain=domain,
        current_user=current_user,
    )
    membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    if membership is None:
        raise HTTPException(
            status_code=403,
            detail="Only active Community Domain members can view this domain.",
        )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "identity_context": _community_domain_identity_context_payload(
            db,
            domain=domain,
            current_user=current_user,
            membership=membership,
        ),
    }


@router.get("/{community_domain_id}/activity-map", response_model=dict[str, Any])
def get_community_domain_activity_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "activity_map": _community_domain_activity_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/activity-group-readiness", response_model=dict[str, Any])
def get_community_domain_activity_group_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "activity_group_readiness": _community_domain_activity_group_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/member-verification-map", response_model=dict[str, Any])
def get_community_domain_member_verification_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "member_verification_map": _community_domain_member_verification_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/network-exchange-map", response_model=dict[str, Any])
def get_community_domain_network_exchange_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "network_exchange_map": _community_domain_network_exchange_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/record-privacy-map", response_model=dict[str, Any])
def get_community_domain_record_privacy_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "record_privacy_map": _community_domain_record_privacy_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/configuration-map", response_model=dict[str, Any])
def get_community_domain_configuration_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "configuration_map": _community_domain_configuration_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/compliance-map", response_model=dict[str, Any])
def get_community_domain_compliance_map(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "compliance_map": _community_domain_compliance_map_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/appeal-readiness", response_model=dict[str, Any])
def get_community_domain_appeal_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "appeal_readiness": _community_domain_appeal_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/service-settings", response_model=dict[str, Any])
def list_community_domain_service_settings(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "service_settings": _community_domain_service_settings_payload(
            domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/module-scope-readiness", response_model=dict[str, Any])
def get_community_domain_module_scope_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "module_scope_readiness": _community_domain_module_scope_readiness_payload(
            db,
            domain=domain,
            current_user=current_user,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/economic-participation", response_model=dict[str, Any])
def get_community_domain_economic_participation(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "economic_participation": _community_domain_economic_participation_payload(
            db,
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/network-presence", response_model=dict[str, Any])
def get_community_domain_network_presence(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "network_presence": _community_domain_network_presence_payload(
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/roles", response_model=dict[str, Any])
def list_community_domain_roles(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "roles": _community_domain_role_projection_payload(
            db,
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/governance-model", response_model=dict[str, Any])
def get_community_domain_governance_model(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "governance_model": _community_domain_governance_model_payload(
            db,
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/readiness", response_model=dict[str, Any])
def get_community_domain_readiness(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "readiness": _community_domain_readiness_payload(
            db,
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/verification-requirements", response_model=dict[str, Any])
def get_community_domain_verification_requirements(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "verification_requirements": _community_domain_verification_requirements_payload(
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/activation-requirements", response_model=dict[str, Any])
def get_community_domain_activation_requirements(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "activation_requirements": _community_domain_activation_requirements_payload(
            db,
            domain=domain,
            can_admin=can_admin,
        ),
    }


@router.get("/{community_domain_id}/nodes", response_model=dict[str, Any])
def list_community_domain_nodes(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_node_payload(node) for node in nodes],
        "total": len(nodes),
        "boundary": (
            "Structure only. Nodes organize the institution but do not by "
            "themselves grant membership, payment rights, verification, or governance authority."
        ),
    }


@router.get("/{community_domain_id}/nodes/tree", response_model=dict[str, Any])
def list_community_domain_node_tree(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": _community_domain_node_tree_payload(nodes),
        "total": len(nodes),
        "boundary": (
            "Read-only structure tree. This does not create nodes, change "
            "parentage, assign members, grant roles, activate billing, verify "
            "a branch, or create a separate Community Domain."
        ),
    }


@router.get("/{community_domain_id}/nodes/{community_node_id}/operating-summary", response_model=dict[str, Any])
def get_community_domain_node_operating_summary(
    community_domain_id: int,
    community_node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    can_admin = _has_domain_admin_scope(
        db,
        domain=domain,
        current_user=current_user,
    ) or _has_node_admin_scope(
        db,
        domain=domain,
        node=node,
        current_user=current_user,
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id),
        "operating_summary": _community_domain_node_operating_summary_payload(
            db,
            domain=domain,
            node=node,
            can_admin=can_admin,
        ),
    }


@router.post("/{community_domain_id}/nodes", status_code=201, response_model=dict[str, Any])
def create_community_domain_node(
    community_domain_id: int,
    payload: CommunityNodeCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    parent_node: Optional[CommunityNode]
    if payload.parent_node_id is None:
        parent_node = _find_root_node(db, community_domain_id=int(domain.id))
        if parent_node is None:
            raise HTTPException(
                status_code=409,
                detail="Community Domain does not have a root node yet.",
            )
    else:
        parent_node = (
            db.query(CommunityNode)
            .filter(CommunityNode.id == int(payload.parent_node_id))
            .filter(CommunityNode.community_domain_id == int(domain.id))
            .first()
        )
        if parent_node is None:
            raise HTTPException(
                status_code=404,
                detail="Parent node was not found inside this Community Domain.",
            )
    _ensure_node_accepts_writes(db, domain=domain, node=parent_node)

    node = CommunityNode(
        community_domain_id=int(domain.id),
        parent_node_id=int(parent_node.id),
        name=_clean_str(payload.name),
        node_type=_clean_str(payload.node_type, "unit"),
        node_kind=_clean_str(payload.node_kind, "administrative"),
        depth=int(parent_node.depth or 0) + 1,
        description=_clean_str(payload.description) or None,
        sort_order=int(payload.sort_order or 0),
        visibility_policy=_clean_str(payload.visibility_policy, "members"),
        inherits_parent_policy=bool(payload.inherits_parent_policy),
        status=_clean_str(payload.status, "active"),
    )
    db.add(node)

    try:
        db.flush()
        parent_path = _clean_str(parent_node.path, f"/{int(domain.id)}")
        node.path = f"{parent_path}/{int(node.id)}"
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_node_name_exists",
                "message": "A node with this name already exists under the same parent.",
            },
        ) from exc

    db.refresh(node)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node": _node_payload(node),
        "boundary": (
            "Structure only. This node does not create a separate Community Domain, "
            "social Community, billing account, or verified branch."
        ),
    }


@router.get("/{community_domain_id}/nodes/{community_node_id}/status-impact", response_model=dict[str, Any])
def get_community_domain_node_status_impact(
    community_domain_id: int,
    community_node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    impact_summary = _node_lifecycle_impact_summary(db, domain=domain, node=node)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node": _node_payload(node),
        "current_status": _clean_role(node.status, "inactive"),
        "status_mutable": node.parent_node_id is not None,
        "impact_summary": impact_summary,
        "boundary": (
            "Read-only preview of the records currently sitting inside this "
            "node tree. It does not close, reopen, archive, notify, cancel "
            "reviews, remove members, or create a lifecycle record."
        ),
    }


@router.patch("/{community_domain_id}/nodes/{community_node_id}/status", response_model=dict[str, Any])
def update_community_domain_node_status(
    community_domain_id: int,
    community_node_id: int,
    payload: CommunityNodeStatusUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    if node.parent_node_id is None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_root_node_status_immutable",
                "message": "The root Community Domain node is controlled by the domain lifecycle, not the node status endpoint.",
            },
        )

    requested_status = _clean_role(payload.status, "active")
    if requested_status not in NODE_STATUS_VALUES:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_node_status_invalid",
                "message": "Node status must be active, inactive, or archived.",
            },
        )

    parent_node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(node.parent_node_id),
    )
    if requested_status == "active":
        _ensure_node_accepts_writes(db, domain=domain, node=parent_node)

    previous_status = _clean_role(node.status, "inactive")
    changed = previous_status != requested_status
    status_note = _clean_str(payload.status_note) or None
    if changed and not status_note:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_node_status_note_required",
                "message": "A status note is required when changing a Community Domain node status.",
            },
        )

    impact_summary = _node_lifecycle_impact_summary(db, domain=domain, node=node)
    node.status = requested_status
    lifecycle_record: Optional[CommunityDomainActionReview] = None
    if changed:
        now = datetime.now(timezone.utc)
        lifecycle_record = CommunityDomainActionReview(
            community_domain_id=int(domain.id),
            community_node_id=int(node.id),
            action_key="node.status.update",
            requested_by_user_id=int(current_user.id),
            applied_by_user_id=int(current_user.id),
            target_type="community_node",
            target_id=str(int(node.id)),
            status="applied",
            decision="applied",
            request_note=status_note,
            payload_json=_json_dump(
                {
                    "community_node_id": int(node.id),
                    "previous_status": previous_status,
                    "new_status": requested_status,
                    "status_note": status_note,
                    "impact_summary": impact_summary,
                }
            ),
            decided_at=now,
            applied_at=now,
        )
        db.add(lifecycle_record)
    db.add(node)
    db.commit()
    db.refresh(node)
    if lifecycle_record is not None:
        db.refresh(lifecycle_record)

    return {
        "ok": True,
        "changed": changed,
        "community_domain_id": int(domain.id),
        "previous_status": previous_status,
        "node": _node_payload(node),
        "descendant_count": impact_summary["descendant_node_count"],
        "impact_summary": impact_summary,
        "lifecycle_record": (
            _action_review_payload(lifecycle_record)
            if lifecycle_record is not None
            else None
        ),
        "boundary": (
            "Node status controls whether new structure, policies, placements, "
            "and node-scoped reviews can be added here. It does not delete "
            "descendants, remove members, cancel pending reviews, or change the "
            "Community Domain lifecycle. Actual status changes create an applied "
            "operational action record with an impact snapshot, but this is not "
            "an immutable audit ledger."
        ),
    }


@router.get("/{community_domain_id}/members", response_model=dict[str, Any])
def list_community_domain_members(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    rows = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .order_by(
            CommunityDomainMembership.status.asc(),
            CommunityDomainMembership.role.asc(),
            CommunityDomainMembership.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_domain_member_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Institutional membership only. This does not create a social Community "
            "membership, payment right, loan approval, or verified legal authority."
        ),
    }


@router.get("/{community_domain_id}/members/{user_id}/placement-summary", response_model=dict[str, Any])
def get_community_domain_member_placement_summary(
    community_domain_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    can_admin = _has_domain_admin_scope(db, domain=domain, current_user=current_user)
    self_view = int(user_id) == int(current_user.id)
    if not can_admin and not self_view:
        raise HTTPException(
            status_code=403,
            detail="Only a Community Domain admin can view another member placement summary.",
        )
    if not can_admin:
        _require_domain_member_scope(db, domain=domain, current_user=current_user)
    else:
        _get_user_or_404(db, user_id)

    membership = _domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(user_id),
    )
    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Community Domain member was not found.",
        )
    if _clean_role(membership.status, "inactive") != "active" and not can_admin:
        raise HTTPException(
            status_code=403,
            detail="Only active Community Domain members can view their placement summary.",
        )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "user_id": int(user_id),
        "placement_summary": _community_domain_member_placement_summary_payload(
            db,
            domain=domain,
            membership=membership,
            can_admin=can_admin,
            self_view=self_view,
        ),
    }


@router.post(
    "/{community_domain_id}/membership-requests",
    status_code=201,
    response_model=dict[str, Any],
)
def request_community_domain_membership(
    community_domain_id: int,
    payload: CommunityDomainMembershipRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    existing_membership = _domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    if (
        existing_membership is not None
        and _clean_role(existing_membership.status, "inactive") == "active"
    ):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_member_already_active",
                "message": "This account is already an active member of this Community Domain.",
            },
        )

    existing_request = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.action_key == "domain_member.upsert")
        .filter(CommunityDomainActionReview.subject_user_id == int(current_user.id))
        .filter(CommunityDomainActionReview.target_type == "domain_member")
        .filter(CommunityDomainActionReview.target_id == str(int(current_user.id)))
        .filter(CommunityDomainActionReview.status.in_(REVIEWER_QUEUE_PENDING_STATUSES))
        .order_by(
            CommunityDomainActionReview.created_at.desc(),
            CommunityDomainActionReview.id.desc(),
        )
        .first()
    )
    if existing_request is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_membership_request_pending",
                "message": "This account already has a pending Community Domain membership request.",
                "action_review": _action_review_payload(existing_request),
            },
        )

    policy = _matching_policy(
        db,
        community_domain_id=int(domain.id),
        action_key="domain_member.upsert",
        community_node_id=None,
    )
    request_payload = {
        "user_id": int(current_user.id),
        "role": "member",
        "status": "active",
    }
    title = _clean_str(payload.title)
    if title:
        request_payload["title"] = title

    row = CommunityDomainActionReview(
        community_domain_id=int(domain.id),
        policy_id=int(policy.id) if policy is not None else None,
        action_key="domain_member.upsert",
        requested_by_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        target_type="domain_member",
        target_id=str(int(current_user.id)),
        status="pending",
        request_note=_clean_str(payload.request_note) or None,
        payload_json=_json_dump(request_payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Membership request recorded as a Community Domain governance review. "
            "This does not add the member, place the member in a node, assign "
            "roles, grant permissions, activate billing, verify authority, send "
            "notifications, or expose private member records. An authorized "
            "Community Domain reviewer must approve and apply the review before "
            "membership changes."
        ),
    }


@router.get(
    "/{community_domain_id}/membership-requests/my",
    response_model=dict[str, Any],
)
def list_my_community_domain_membership_requests(
    community_domain_id: int,
    status: Optional[str] = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    query = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.action_key == "domain_member.upsert")
        .filter(CommunityDomainActionReview.requested_by_user_id == int(current_user.id))
        .filter(CommunityDomainActionReview.subject_user_id == int(current_user.id))
        .filter(CommunityDomainActionReview.target_type == "domain_member")
        .filter(CommunityDomainActionReview.target_id == str(int(current_user.id)))
    )
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.created_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Current user's own Community Domain membership requests only. "
            "This does not expose the reviewer queue, member lists, owner notes "
            "outside the review payload, private evidence, governance records, "
            "or grant membership."
        ),
    }


@router.post("/{community_domain_id}/members", status_code=201, response_model=dict[str, Any])
def upsert_community_domain_member(
    community_domain_id: int,
    payload: CommunityDomainMemberUpsertIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    _get_user_or_404(db, payload.user_id)
    requested_role = _clean_role(payload.role, "member")
    if requested_role == "owner" and int(payload.user_id) != int(domain.owner_user_id):
        raise HTTPException(
            status_code=403,
            detail="Only the recorded Community Domain owner can hold the owner role.",
        )
    if int(payload.user_id) == int(domain.owner_user_id) and requested_role != "owner":
        raise HTTPException(
            status_code=403,
            detail="The recorded Community Domain owner role cannot be reassigned here.",
        )

    membership = _domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(payload.user_id),
    )
    created = membership is None
    if membership is None:
        membership = CommunityDomainMembership(
            community_domain_id=int(domain.id),
            user_id=int(payload.user_id),
        )
        db.add(membership)

    membership.role = requested_role
    membership.status = _clean_str(payload.status, "active")
    membership.title = _clean_str(payload.title) or None

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_member_exists",
                "message": "This user is already a member of the Community Domain.",
            },
        ) from exc

    db.refresh(membership)
    return {
        "ok": True,
        "created": created,
        "community_domain_id": int(domain.id),
        "membership": _domain_member_payload(membership),
        "boundary": (
            "Institutional membership only. This does not create a social Community "
            "membership. Node placement, governance authority, billing authority, "
            "and verification require their own scoped records."
        ),
    }


@router.get("/{community_domain_id}/nodes/{community_node_id}/members", response_model=dict[str, Any])
def list_community_node_members(
    community_domain_id: int,
    community_node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    _require_node_or_domain_admin_scope(
        db,
        domain=domain,
        node=node,
        current_user=current_user,
    )

    rows = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id == int(node.id))
        .order_by(
            CommunityNodeMembership.status.asc(),
            CommunityNodeMembership.role.asc(),
            CommunityNodeMembership.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id),
        "items": [_node_member_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Node membership says where a domain member belongs. It does not by "
            "itself grant governance authority, payment authority, or verification."
        ),
    }


@router.post("/{community_domain_id}/nodes/{community_node_id}/members", status_code=201, response_model=dict[str, Any])
def upsert_community_node_member(
    community_domain_id: int,
    community_node_id: int,
    payload: CommunityNodeMemberUpsertIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    _ensure_node_accepts_writes(db, domain=domain, node=node)
    scope = _require_node_or_domain_admin_scope(
        db,
        domain=domain,
        node=node,
        current_user=current_user,
    )
    _get_user_or_404(db, payload.user_id)
    requested_role = _clean_role(payload.role, "member")
    if scope == "node_admin" and requested_role not in NODE_LOCAL_ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Node admins can assign local member roles only.",
        )

    domain_membership = _domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(payload.user_id),
    )
    if domain_membership is None or _clean_str(domain_membership.status).lower() != "active":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_membership_required",
                "message": "Add this user as an active Community Domain member before placing them in a node.",
            },
        )

    membership = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_node_id == int(node.id))
        .filter(CommunityNodeMembership.user_id == int(payload.user_id))
        .first()
    )
    created = membership is None
    if membership is None:
        membership = CommunityNodeMembership(
            community_domain_id=int(domain.id),
            community_node_id=int(node.id),
            user_id=int(payload.user_id),
        )
        db.add(membership)

    membership.role = requested_role
    membership.status = _clean_str(payload.status, "active")
    membership.title = _clean_str(payload.title) or None

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_node_member_exists",
                "message": "This user is already assigned to this Community Domain node.",
            },
        ) from exc

    db.refresh(membership)
    return {
        "ok": True,
        "created": created,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id),
        "membership": _node_member_payload(membership),
        "boundary": (
            "Node membership scopes belonging inside the institution. Governance "
            "powers still need a policy/action-review layer before delegation is complete."
        ),
    }


@router.get("/{community_domain_id}/policies", response_model=dict[str, Any])
def list_community_domain_policies(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    if community_node_id is not None:
        _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(community_node_id),
        )

    query = db.query(CommunityDomainPolicy).filter(
        CommunityDomainPolicy.community_domain_id == int(domain.id)
    )
    if community_node_id is not None:
        query = query.filter(CommunityDomainPolicy.community_node_id == int(community_node_id))

    rows = query.order_by(
        CommunityDomainPolicy.status.asc(),
        CommunityDomainPolicy.scope_type.asc(),
        CommunityDomainPolicy.action_key.asc(),
        CommunityDomainPolicy.id.asc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_policy_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Policies record how actions should be reviewed. They do not by "
            "themselves approve payment, verify ownership, or override platform rules."
        ),
    }


@router.post("/{community_domain_id}/policies", status_code=201, response_model=dict[str, Any])
def upsert_community_domain_policy(
    community_domain_id: int,
    payload: CommunityDomainPolicyUpsertIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    node_id: Optional[int] = None
    if payload.community_node_id is not None:
        policy_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(payload.community_node_id),
        )
        _ensure_node_accepts_writes(db, domain=domain, node=policy_node)
        node_id = int(policy_node.id)

    policy_key = _clean_role(payload.policy_key)
    policy = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.policy_key == policy_key)
        .first()
    )
    created = policy is None
    if policy is None:
        policy = CommunityDomainPolicy(
            community_domain_id=int(domain.id),
            policy_key=policy_key,
            created_by_user_id=int(current_user.id),
        )
        db.add(policy)

    policy.community_node_id = node_id
    policy.action_key = _clean_role(payload.action_key)
    policy.scope_type = _clean_role(payload.scope_type, "domain")
    policy.review_mode = _clean_role(payload.review_mode, "domain_admin_review")
    policy.required_role = _clean_role(payload.required_role) if payload.required_role else None
    policy.status = _clean_role(payload.status, "active")
    policy.policy_summary = _clean_str(payload.policy_summary) or None
    policy.config_json = _json_dump(payload.config)
    policy.updated_by_user_id = int(current_user.id)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_policy_exists",
                "message": "A policy with this key already exists in this Community Domain.",
            },
        ) from exc

    db.refresh(policy)
    return {
        "ok": True,
        "created": created,
        "community_domain_id": int(domain.id),
        "policy": _policy_payload(policy),
        "boundary": (
            "Policy recorded. This creates a review rule record, not automatic "
            "legal authority, payment approval, verification, or a vote result."
        ),
    }


@router.get("/{community_domain_id}/action-reviews", response_model=dict[str, Any])
def list_community_domain_action_reviews(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    include_descendants: bool = Query(default=False),
    status: Optional[str] = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    node_scope_ids: list[int] = []
    if community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        node_scope_ids = _descendant_node_ids(
            db,
            domain=domain,
            node=node,
            include_descendants=bool(include_descendants),
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.created_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id) if node is not None else None,
        "community_node_ids": node_scope_ids,
        "include_descendants": bool(include_descendants),
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Action reviews are decision records. They do not execute the requested "
            "business action until a later endpoint applies that decision."
        ),
    }


@router.post("/{community_domain_id}/action-reviews", status_code=201, response_model=dict[str, Any])
def create_community_domain_action_review(
    community_domain_id: int,
    payload: CommunityDomainActionReviewCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    node_id: Optional[int] = None
    node: Optional[CommunityNode] = None
    action_key = _clean_role(payload.action_key)
    review_payload = dict(payload.payload or {})
    if payload.community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(payload.community_node_id),
        )
        _ensure_node_accepts_action_review_request(
            db,
            domain=domain,
            node=node,
            action_key=action_key,
            payload=review_payload,
        )
        node_id = int(node.id)

    if payload.subject_user_id is not None:
        _get_user_or_404(db, payload.subject_user_id)

    policy: Optional[CommunityDomainPolicy] = None
    if payload.policy_id is not None:
        policy = _get_policy_or_404(
            db,
            community_domain_id=int(domain.id),
            policy_id=int(payload.policy_id),
        )
    else:
        policy = _matching_policy(
            db,
            community_domain_id=int(domain.id),
            action_key=payload.action_key,
            community_node_id=node_id,
        )

    if policy is not None:
        if _clean_role(policy.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_inactive",
                    "message": "This Community Domain policy is not active.",
                },
            )
        if _clean_role(policy.action_key) != action_key:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_action_mismatch",
                    "message": "This policy does not govern the requested action.",
                },
            )
        if not _policy_can_govern_node(
            db,
            domain=domain,
            policy=policy,
            node=node,
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_node_mismatch",
                    "message": "This policy belongs to a different Community Domain node.",
                },
            )

    if action_key == "node.status.update":
        if node is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_node_required",
                    "message": "This action must be scoped to a Community Domain node.",
                },
            )
        review_payload = _normalize_node_status_review_payload(
            node=node,
            review_payload=review_payload,
            request_note=payload.request_note,
            target_type=payload.target_type,
            target_id=payload.target_id,
        )
    _ensure_member_action_review_target_matches(
        action_key=action_key,
        payload=review_payload,
        target_type=payload.target_type,
        target_id=payload.target_id,
        subject_user_id=payload.subject_user_id,
    )

    row = CommunityDomainActionReview(
        community_domain_id=int(domain.id),
        community_node_id=node_id,
        policy_id=int(policy.id) if policy is not None else None,
        action_key=action_key,
        requested_by_user_id=int(current_user.id),
        subject_user_id=int(payload.subject_user_id) if payload.subject_user_id is not None else None,
        target_type=_clean_role(payload.target_type) if payload.target_type else None,
        target_id=_clean_str(payload.target_id) or None,
        status="pending",
        request_note=_clean_str(payload.request_note) or None,
        payload_json=_json_dump(review_payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Review requested. This records that an action needs decision; it does "
            "not perform the action, move money, verify identity, or change membership by itself."
        ),
    }


@router.get("/{community_domain_id}/action-reviews/my-requests", response_model=dict[str, Any])
def list_my_community_domain_action_reviews(
    community_domain_id: int,
    status: Optional[str] = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    query = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.requested_by_user_id == int(current_user.id))
    )
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.created_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "My requests only shows action reviews submitted by the current user. "
            "It does not expose the wider governance queue or admin review list."
        ),
    }


@router.get("/{community_domain_id}/action-reviews/reviewer-queue", response_model=dict[str, Any])
def list_community_domain_reviewer_queue(
    community_domain_id: int,
    include_decided: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    candidate_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.status.in_(["pending", "pending_review"]))
        .order_by(
            CommunityDomainActionReview.created_at.asc(),
            CommunityDomainActionReview.id.asc(),
        )
        .all()
    )

    rows = []
    for row in candidate_rows:
        if not include_decided and _has_user_decision(row, int(current_user.id)):
            continue
        if _can_decide_action_review(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        ):
            rows.append(row)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "include_decided": bool(include_decided),
        "boundary": (
            "Reviewer queue only lists pending reviews this user is currently "
            "allowed to decide. It does not assign reviewers or send notifications."
        ),
    }


@router.get("/{community_domain_id}/action-reviews/activity", response_model=dict[str, Any])
def list_community_domain_action_review_activity(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    include_descendants: bool = Query(default=False),
    status: Optional[str] = Query(default=None, max_length=24),
    event_type: Optional[str] = Query(default=None, max_length=48),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    node_scope_ids: list[int] = []
    if community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        node_scope_ids = _descendant_node_ids(
            db,
            domain=domain,
            node=node,
            include_descendants=bool(include_descendants),
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.updated_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()

    requested_event_type = _clean_role(event_type) if event_type else None
    activity_items: list[dict[str, Any]] = []
    for row in rows:
        for item in _action_review_activity_items(db, row):
            if requested_event_type and _clean_role(item["type"]) != requested_event_type:
                continue
            activity_items.append(item)

    activity_items.sort(
        key=lambda item: (
            item["sort_at"],
            -int(item["sort_order"]),
            int(item["sort_id"]),
        ),
        reverse=True,
    )
    activity_items = activity_items[: int(limit)]
    _strip_activity_sort_fields(activity_items)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id) if node is not None else None,
        "community_node_ids": node_scope_ids,
        "include_descendants": bool(include_descendants),
        "items": activity_items,
        "total": len(activity_items),
        "limit": int(limit),
        "event_type": requested_event_type,
        "boundary": (
            "Domain activity is a read-only operational feed for admins. It merges "
            "existing review creation, decisions, comments, evidence metadata, and "
            "terminal row status changes; it is not an immutable audit ledger, "
            "notification feed, TrustEvent stream, or action executor."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/summary",
    response_model=dict[str, Any],
)
def get_community_domain_action_review_summary(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    include_descendants: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    node_scope_ids: list[int] = []
    if community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        node_scope_ids = _descendant_node_ids(
            db,
            domain=domain,
            node=node,
            include_descendants=bool(include_descendants),
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(
            CommunityDomainActionReview.community_node_id.in_(node_scope_ids)
        )

    rows = query.all()
    by_status: dict[str, int] = {}
    by_action: dict[str, int] = {}
    by_node: dict[str, dict[str, Any]] = {}
    pending_statuses = {"pending", "pending_review"}
    approved_statuses = {"approved"}
    terminal_statuses = {"applied", "cancelled", "rejected"}

    for row in rows:
        status_key = _clean_role(row.status, "unknown")
        action_key = _clean_role(row.action_key, "unknown")
        by_status[status_key] = by_status.get(status_key, 0) + 1
        by_action[action_key] = by_action.get(action_key, 0) + 1

        node_key = (
            str(row.community_node_id)
            if row.community_node_id is not None
            else "domain"
        )
        if node_key not in by_node:
            row_node = getattr(row, "community_node", None)
            by_node[node_key] = {
                "community_node_id": (
                    int(row.community_node_id)
                    if row.community_node_id is not None
                    else None
                ),
                "community_node_name": getattr(row_node, "name", None),
                "total": 0,
                "by_status": {},
            }
        node_bucket = by_node[node_key]
        node_bucket["total"] += 1
        node_bucket["by_status"][status_key] = (
            node_bucket["by_status"].get(status_key, 0) + 1
        )

    attention_total = sum(by_status.get(status, 0) for status in pending_statuses)
    ready_to_apply_total = sum(by_status.get(status, 0) for status in approved_statuses)
    terminal_total = sum(by_status.get(status, 0) for status in terminal_statuses)
    by_node_items = sorted(
        by_node.values(),
        key=lambda item: (
            item["community_node_id"] is not None,
            item["community_node_name"] or "",
            item["community_node_id"] or 0,
        ),
    )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id) if node is not None else None,
        "community_node_ids": node_scope_ids,
        "include_descendants": bool(include_descendants),
        "total": len(rows),
        "attention_total": attention_total,
        "ready_to_apply_total": ready_to_apply_total,
        "terminal_total": terminal_total,
        "by_status": by_status,
        "by_action": by_action,
        "by_node": by_node_items,
        "boundary": (
            "Action review summary is a read-only dashboard count for admins. "
            "It does not decide, assign, notify, apply, verify evidence, or "
            "replace the detailed review/activity records."
        ),
    }


@router.get("/{community_domain_id}/action-reviews/{review_id}", response_model=dict[str, Any])
def get_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_action_review_not_visible",
                "message": "This action review is not visible to the current user.",
            },
        )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Action review detail is visible only to the requester, eligible "
            "reviewers, and scoped admins. It does not apply the requested action."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/comments",
    response_model=dict[str, Any],
)
def list_community_domain_action_review_comments(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_comments_not_visible",
                "message": "Only users who can view this action review can view its comments.",
            },
        )

    comments = (
        db.query(CommunityDomainActionReviewComment)
        .filter(CommunityDomainActionReviewComment.action_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReviewComment.created_at.asc(),
            CommunityDomainActionReviewComment.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "items": [_action_review_comment_payload(comment) for comment in comments],
        "total": len(comments),
        "boundary": (
            "Review comments are an append-only discussion trail. They do not "
            "decide, revise, reopen, cancel, or apply the action review."
        ),
    }


@router.post(
    "/{community_domain_id}/action-reviews/{review_id}/comments",
    status_code=201,
    response_model=dict[str, Any],
)
def create_community_domain_action_review_comment(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewCommentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_contribute_to_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_comment_forbidden",
                "message": "Only the requester or a current scoped reviewer/admin can comment on this action review.",
            },
        )
    _ensure_action_review_accepts_append(row)

    comment = CommunityDomainActionReviewComment(
        action_review_id=int(row.id),
        community_domain_id=int(domain.id),
        community_node_id=(
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        author_user_id=int(current_user.id),
        body=_clean_str(payload.body),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "comment": _action_review_comment_payload(comment),
        "boundary": (
            "Comment recorded. This does not decide, revise, reopen, cancel, "
            "or apply the action review."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/evidence",
    response_model=dict[str, Any],
)
def list_community_domain_action_review_evidence(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_evidence_not_visible",
                "message": "Only users who can view this action review can view its evidence.",
            },
        )

    evidence_items = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .order_by(
            CommunityDomainActionReviewEvidence.created_at.asc(),
            CommunityDomainActionReviewEvidence.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "items": [_action_review_evidence_payload(item) for item in evidence_items],
        "total": len(evidence_items),
        "boundary": (
            "Review evidence records metadata for documents or references supplied "
            "with a Community Domain action review. This endpoint does not upload, "
            "download, verify, or approve files."
        ),
    }


@router.post(
    "/{community_domain_id}/action-reviews/{review_id}/evidence",
    status_code=201,
    response_model=dict[str, Any],
)
def create_community_domain_action_review_evidence(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewEvidenceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_contribute_to_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_evidence_forbidden",
                "message": "Only the requester or a current scoped reviewer/admin can add evidence to this action review.",
            },
        )
    _ensure_action_review_accepts_append(row)

    evidence = CommunityDomainActionReviewEvidence(
        action_review_id=int(row.id),
        community_domain_id=int(domain.id),
        community_node_id=(
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        submitted_by_user_id=int(current_user.id),
        evidence_type=_clean_role(payload.evidence_type, "document"),
        title=_clean_str(payload.title),
        description=_clean_str(payload.description) or None,
        file_name=_clean_str(payload.file_name) or None,
        content_type=_clean_str(payload.content_type) or None,
        storage_key=_clean_str(payload.storage_key) or None,
        external_reference=_clean_str(payload.external_reference) or None,
        checksum=_clean_str(payload.checksum) or None,
        status="active",
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "evidence": _action_review_evidence_payload(evidence),
        "boundary": (
            "Evidence metadata recorded. This does not upload, download, verify, "
            "approve, revise, cancel, or apply the action review."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/activity",
    response_model=dict[str, Any],
)
def get_community_domain_action_review_activity(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_activity_not_visible",
                "message": "Only users who can view this action review can view its activity.",
            },
        )

    activity_items = _action_review_activity_items(db, row)
    activity_items.sort(
        key=lambda item: (item["sort_at"], item["sort_order"], item["sort_id"])
    )
    _strip_activity_sort_fields(activity_items)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "items": activity_items,
        "total": len(activity_items),
        "boundary": (
            "Activity is a read-only merged view of review creation, decisions, "
            "comments, evidence metadata, and row-level terminal status changes. "
            "It does not decide, revise, reopen, cancel, upload, verify, or apply anything."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/lineage",
    response_model=dict[str, Any],
)
def get_community_domain_action_review_lineage(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    ancestors: list[CommunityDomainActionReview] = []
    current = row
    seen_ids = {int(row.id)}
    while current.parent_review_id is not None and len(seen_ids) < 50:
        parent = _get_action_review_or_404(
            db,
            community_domain_id=int(domain.id),
            review_id=int(current.parent_review_id),
        )
        if int(parent.id) in seen_ids:
            break
        ancestors.append(parent)
        seen_ids.add(int(parent.id))
        current = parent

    lineage = list(reversed(ancestors)) + [row]
    current = row
    while len(seen_ids) < 50:
        child = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
            .filter(CommunityDomainActionReview.parent_review_id == int(current.id))
            .order_by(
                CommunityDomainActionReview.created_at.asc(),
                CommunityDomainActionReview.id.asc(),
            )
            .first()
        )
        if child is None or int(child.id) in seen_ids:
            break
        lineage.append(child)
        seen_ids.add(int(child.id))
        current = child

    if not any(
        _can_view_action_review(
            db,
            domain=domain,
            row=item,
            current_user=current_user,
        )
        for item in lineage
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_lineage_not_visible",
                "message": "Only users who can view a review in this chain can view its lineage.",
            },
        )

    root_review = lineage[0]
    latest_review = lineage[-1]
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "root_review_id": int(root_review.id),
        "latest_review_id": int(latest_review.id),
        "requested_review_id": int(row.id),
        "items": [_action_review_payload(item) for item in lineage],
        "total": len(lineage),
        "boundary": (
            "Lineage shows linked revisions for one Community Domain action "
            "review. It is a read-only history view and does not reopen, decide, "
            "or apply any review."
        ),
    }


@router.post(
    "/{community_domain_id}/action-reviews/{review_id}/revision",
    status_code=201,
    response_model=dict[str, Any],
)
def revise_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewRevisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    if int(row.requested_by_user_id) != int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_revision_forbidden",
                "message": "Only the original requester can revise this Community Domain action review.",
            },
        )

    current_status = _clean_role(row.status)
    if current_status not in {"cancelled", "rejected", "needs_changes"}:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_revisionable",
                "message": "Only cancelled, rejected, or needs-changes reviews can be revised.",
            },
        )

    existing_revision = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.parent_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReview.created_at.desc(),
            CommunityDomainActionReview.id.desc(),
        )
        .first()
    )
    if existing_revision is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_revision_exists",
                "message": (
                    "This Community Domain action review already has a revision. "
                    "Continue from the existing revision instead of creating a fork."
                ),
                "existing_action_review": _action_review_payload(existing_revision),
            },
        )

    fields_set = payload.model_fields_set
    action_key = _clean_role(row.action_key)
    revision_payload = (
        dict(payload.payload or {})
        if "payload" in fields_set
        else _json_load(row.payload_json)
    )

    node_id: Optional[int] = (
        int(row.community_node_id) if row.community_node_id is not None else None
    )
    node: Optional[CommunityNode] = None
    if node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=node_id,
        )

    policy: Optional[CommunityDomainPolicy] = getattr(row, "policy", None)
    if policy is None:
        policy = _matching_policy(
            db,
            community_domain_id=int(domain.id),
            action_key=action_key,
            community_node_id=node_id,
        )
    if policy is not None:
        if _clean_role(policy.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_inactive",
                    "message": "This Community Domain policy is not active.",
                },
            )
        if _clean_role(policy.action_key) != action_key:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_action_mismatch",
                    "message": "This policy does not govern the requested action.",
                },
            )
        if not _policy_can_govern_node(
            db,
            domain=domain,
            policy=policy,
            node=node,
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_node_mismatch",
                    "message": "This policy belongs to a different Community Domain node.",
                },
            )

    subject_user_id = (
        payload.subject_user_id
        if "subject_user_id" in fields_set
        else row.subject_user_id
    )
    if subject_user_id is not None:
        _get_user_or_404(db, int(subject_user_id))

    target_type = (
        _clean_role(payload.target_type)
        if "target_type" in fields_set and payload.target_type
        else row.target_type
    )
    target_id = (
        _clean_str(payload.target_id) or None
        if "target_id" in fields_set
        else row.target_id
    )
    request_note = (
        _clean_str(payload.request_note) or None
        if "request_note" in fields_set
        else row.request_note
    )

    if node_id is not None:
        _ensure_node_accepts_action_review_request(
            db,
            domain=domain,
            node=node,
            action_key=action_key,
            payload=revision_payload,
        )
    if action_key == "node.status.update":
        if node is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_node_required",
                    "message": "This action must be scoped to a Community Domain node.",
                },
            )
        revision_payload = _normalize_node_status_review_payload(
            node=node,
            review_payload=revision_payload,
            request_note=request_note,
            target_type=target_type,
            target_id=target_id,
        )
    _ensure_member_action_review_target_matches(
        action_key=action_key,
        payload=revision_payload,
        target_type=target_type,
        target_id=target_id,
        subject_user_id=(
            int(subject_user_id) if subject_user_id is not None else None
        ),
    )

    revision = CommunityDomainActionReview(
        community_domain_id=int(domain.id),
        community_node_id=node_id,
        policy_id=int(policy.id) if policy is not None else None,
        parent_review_id=int(row.id),
        action_key=action_key,
        requested_by_user_id=int(current_user.id),
        subject_user_id=int(subject_user_id) if subject_user_id is not None else None,
        target_type=target_type,
        target_id=target_id,
        status="pending",
        request_note=request_note,
        payload_json=_json_dump(revision_payload),
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "previous_action_review": _action_review_payload(row),
        "action_review": _action_review_payload(revision),
        "boundary": (
            "Revision created as a new pending review. The previous review remains "
            "unchanged for audit history; this does not apply the requested action."
        ),
    }


@router.post("/{community_domain_id}/action-reviews/{review_id}/cancel", response_model=dict[str, Any])
def cancel_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewCancelIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    is_requester = int(row.requested_by_user_id) == int(current_user.id)
    is_scoped_admin = False
    if not is_requester:
        try:
            _require_action_review_admin_scope(
                db,
                domain=domain,
                row=row,
                current_user=current_user,
            )
            is_scoped_admin = True
        except HTTPException:
            is_scoped_admin = False

    if not is_requester and not is_scoped_admin:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_cancel_forbidden",
                "message": "Only the requester or a scoped admin can cancel this action review.",
            },
        )

    if _clean_role(row.status) not in {"pending", "pending_review"}:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_cancellable",
                "message": "Only pending Community Domain action reviews can be cancelled.",
            },
        )

    row.status = "cancelled"
    row.decision = "cancel"
    row.decision_note = _clean_str(payload.cancel_note) or None
    row.decided_by_user_id = int(current_user.id)
    row.decided_at = datetime.now(timezone.utc)

    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Action review cancelled before approval/application. This does not "
            "delete the audit record or reverse any already-applied business action."
        ),
    }


@router.post("/{community_domain_id}/action-reviews/{review_id}/decision", response_model=dict[str, Any])
def decide_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    node = _require_action_review_decider_scope(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    )
    _require_policy_reviewer_role(
        db,
        domain=domain,
        node=node,
        policy=getattr(row, "policy", None),
        current_user=current_user,
    )

    if int(row.requested_by_user_id) == int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_self_decision_forbidden",
                "message": "The requester cannot decide their own Community Domain action review.",
            },
        )

    current_status = _clean_role(row.status)
    if current_status == "applied":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_already_applied",
                "message": "This Community Domain action review has already been applied.",
            },
        )
    if current_status not in {"pending", "pending_review"}:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_decidable",
                "message": "Only pending Community Domain action reviews can receive decisions.",
            },
        )

    decision = _clean_role(payload.decision)
    decision_row = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewDecision.decided_by_user_id == int(current_user.id))
        .first()
    )
    if decision_row is not None:
        if _clean_role(decision_row.decision) == "recuse":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_recusal_final",
                    "message": "This reviewer has already recused from this Community Domain action review.",
                },
            )
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_decision_already_recorded",
                "message": "This reviewer has already recorded a decision for this Community Domain action review.",
            },
        )
    row_payload = _json_load(row.payload_json)
    row_action_key = _clean_role(row.action_key)
    if decision == "approve" and node is not None:
        _ensure_node_accepts_action_review_request(
            db,
            domain=domain,
            node=node,
            action_key=row_action_key,
            payload=row_payload,
        )
        if row_action_key == "node.status.update":
            _ensure_node_status_review_target_matches(
                node=node,
                target_type=row.target_type,
                target_id=row.target_id,
                review_payload=row_payload,
            )
    if decision == "approve":
        _ensure_member_action_review_target_matches(
            action_key=row_action_key,
            payload=row_payload,
            target_type=row.target_type,
            target_id=row.target_id,
            subject_user_id=(
                int(row.subject_user_id) if row.subject_user_id is not None else None
            ),
        )

    decision_row = CommunityDomainActionReviewDecision(
        action_review_id=int(row.id),
        community_domain_id=int(domain.id),
        community_node_id=int(row.community_node_id) if row.community_node_id is not None else None,
        decided_by_user_id=int(current_user.id),
    )
    db.add(decision_row)

    decision_row.decision = decision
    decision_row.decision_note = _clean_str(payload.decision_note) or None
    db.flush()

    decision_rows = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .order_by(CommunityDomainActionReviewDecision.created_at.asc(), CommunityDomainActionReviewDecision.id.asc())
        .all()
    )
    approval_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "approve")
    rejection_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "reject")
    needs_changes_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "needs_changes")
    recusal_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "recuse")
    required_approvals = _required_review_approvals(row)

    row.decision = decision
    row.decision_note = _clean_str(payload.decision_note) or None
    row.decided_by_user_id = int(current_user.id)
    row.decided_at = datetime.now(timezone.utc)
    if rejection_count > 0:
        row.status = "rejected"
    elif needs_changes_count > 0:
        row.status = "needs_changes"
    elif approval_count >= required_approvals:
        row.status = "approved"
    else:
        row.status = "pending_review"

    db.add(row)
    db.commit()
    db.refresh(decision_row)
    db.refresh(row)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "decision_record": _action_review_decision_payload(decision_row),
        "approval_count": approval_count,
        "recusal_count": recusal_count,
        "required_approvals": required_approvals,
        "boundary": (
            "Decision recorded. The review becomes approved only when the policy's "
            "required approval count is satisfied. A recusal records a reviewer "
            "stepping aside; it does not approve, reject, or apply the action."
        ),
    }


@router.post("/{community_domain_id}/action-reviews/{review_id}/apply", response_model=dict[str, Any])
def apply_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    node, actor_scope = _require_action_review_admin_scope(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    )

    if int(row.requested_by_user_id) == int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_self_apply_forbidden",
                "message": "The requester cannot apply their own Community Domain action review.",
            },
        )

    if _clean_role(row.status) == "applied":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_already_applied",
                "message": "This Community Domain action review has already been applied.",
            },
        )
    if _clean_role(row.status) != "approved" or _clean_role(row.decision or "") != "approve":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_approved",
                "message": "Only approved Community Domain action reviews can be applied.",
            },
        )

    action_key = _clean_role(row.action_key)
    payload = _json_load(row.payload_json)
    applied: dict[str, Any]

    if action_key == "domain_member.upsert":
        _ensure_member_action_review_target_matches(
            action_key=action_key,
            payload=payload,
            target_type=row.target_type,
            target_id=row.target_id,
            subject_user_id=(
                int(row.subject_user_id) if row.subject_user_id is not None else None
            ),
        )
        user_id = _payload_int(payload, "user_id")
        _get_user_or_404(db, user_id)
        requested_role = _clean_role(str(payload.get("role") or "member"))
        if requested_role == "owner" and int(user_id) != int(domain.owner_user_id):
            raise HTTPException(
                status_code=403,
                detail="Only the recorded Community Domain owner can hold the owner role.",
            )
        if int(user_id) == int(domain.owner_user_id) and requested_role != "owner":
            raise HTTPException(
                status_code=403,
                detail="The recorded Community Domain owner role cannot be reassigned here.",
            )

        membership = _domain_membership_for_user(
            db,
            community_domain_id=int(domain.id),
            user_id=int(user_id),
        )
        created = membership is None
        if membership is None:
            membership = CommunityDomainMembership(
                community_domain_id=int(domain.id),
                user_id=int(user_id),
            )
            db.add(membership)

        membership.role = requested_role
        membership.status = _clean_str(str(payload.get("status") or "active"), "active")
        membership.title = _clean_str(str(payload.get("title") or "")) or None
        row.status = "applied"
        row.applied_by_user_id = int(current_user.id)
        row.applied_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
        db.refresh(membership)
        db.refresh(row)
        applied = {
            "type": "domain_member",
            "created": created,
            "membership": _domain_member_payload(membership),
        }
    elif action_key in {"node_member.upsert", "node_member.role_change"}:
        if node is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_node_required",
                    "message": "This action must be scoped to a Community Domain node.",
                },
            )
        _ensure_node_accepts_writes(db, domain=domain, node=node)
        _ensure_member_action_review_target_matches(
            action_key=action_key,
            payload=payload,
            target_type=row.target_type,
            target_id=row.target_id,
            subject_user_id=(
                int(row.subject_user_id) if row.subject_user_id is not None else None
            ),
        )
        user_id = _payload_int(payload, "user_id")
        _get_user_or_404(db, user_id)
        requested_role = _clean_role(str(payload.get("role") or "member"))
        if actor_scope == "node_admin" and requested_role not in NODE_LOCAL_ASSIGNABLE_ROLES:
            raise HTTPException(
                status_code=403,
                detail="Node admins can apply local member roles only.",
            )

        domain_membership = _domain_membership_for_user(
            db,
            community_domain_id=int(domain.id),
            user_id=int(user_id),
        )
        if domain_membership is None or _clean_role(domain_membership.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_membership_required",
                    "message": "Add this user as an active Community Domain member before placing them in a node.",
                },
            )

        membership = (
            db.query(CommunityNodeMembership)
            .filter(CommunityNodeMembership.community_node_id == int(node.id))
            .filter(CommunityNodeMembership.user_id == int(user_id))
            .first()
        )
        created = membership is None
        if membership is None:
            membership = CommunityNodeMembership(
                community_domain_id=int(domain.id),
                community_node_id=int(node.id),
                user_id=int(user_id),
            )
            db.add(membership)

        membership.role = requested_role
        membership.status = _clean_str(str(payload.get("status") or "active"), "active")
        membership.title = _clean_str(str(payload.get("title") or "")) or None
        row.status = "applied"
        row.applied_by_user_id = int(current_user.id)
        row.applied_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
        db.refresh(membership)
        db.refresh(row)
        applied = {
            "type": "node_member",
            "created": created,
            "membership": _node_member_payload(membership),
        }
    elif action_key == "node.status.update":
        if node is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_node_required",
                    "message": "This action must be scoped to a Community Domain node.",
                },
            )
        if actor_scope != "domain_admin":
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "community_domain_node_status_apply_domain_admin_required",
                    "message": "Only a Community Domain owner or domain admin can apply node status changes.",
                },
            )
        if node.parent_node_id is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_root_node_status_immutable",
                    "message": "The root Community Domain node is controlled by the domain lifecycle, not node status reviews.",
                },
            )
        _ensure_node_status_review_target_matches(
            node=node,
            target_type=row.target_type,
            target_id=row.target_id,
            review_payload=payload,
        )

        requested_status = _clean_role(
            str(payload.get("new_status") or payload.get("status") or "")
        )
        if requested_status not in NODE_STATUS_VALUES:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "community_domain_node_status_invalid",
                    "message": "Node status must be active, inactive, or archived.",
                },
            )

        parent_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(node.parent_node_id),
        )
        if requested_status == "active":
            _ensure_node_accepts_writes(db, domain=domain, node=parent_node)

        previous_status = _clean_role(node.status, "inactive")
        expected_previous_status = _clean_role(str(payload.get("previous_status") or ""))
        if expected_previous_status and expected_previous_status != previous_status:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_node_status_stale",
                    "message": "This node status review no longer matches the node's current status.",
                },
            )
        changed = previous_status != requested_status
        status_note = (
            _clean_str(str(payload.get("status_note") or payload.get("note") or ""))
            or _clean_str(row.request_note)
            or None
        )
        if changed and not status_note:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "community_domain_node_status_note_required",
                    "message": "A status note is required when changing a Community Domain node status.",
                },
            )

        impact_summary = _node_lifecycle_impact_summary(db, domain=domain, node=node)
        node.status = requested_status
        row.status = "applied"
        row.applied_by_user_id = int(current_user.id)
        row.applied_at = datetime.now(timezone.utc)
        row.payload_json = _json_dump(
            {
                **payload,
                "community_node_id": int(node.id),
                "previous_status": previous_status,
                "new_status": requested_status,
                "status_note": status_note,
                "impact_summary": impact_summary,
            }
        )
        db.add(node)
        db.add(row)
        db.commit()
        db.refresh(node)
        db.refresh(row)
        applied = {
            "type": "node_status",
            "changed": changed,
            "previous_status": previous_status,
            "node": _node_payload(node),
            "descendant_count": impact_summary["descendant_node_count"],
            "impact_summary": impact_summary,
        }
    else:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_action_not_applicable",
                "message": "This action review records a decision but is not yet wired to an apply handler.",
            },
        )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "applied": applied,
        "boundary": (
            "Approved review applied for this limited Community Domain action. "
            "Payment, verification, billing, Marketplace, and external legal effects are not applied here."
        ),
    }
