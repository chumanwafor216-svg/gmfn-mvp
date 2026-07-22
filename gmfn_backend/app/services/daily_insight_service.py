from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import (
    MarketWisdomEntry,
    MarketWisdomExposure,
    MarketWisdomGenerationRun,
    MarketWisdomSource,
    User,
)


MARKET_WISDOM_STATUSES = {
    "draft",
    "generated",
    "review_required",
    "approved",
    "rejected",
    "retired",
}

MARKET_WISDOM_SOURCE_TYPES = {
    "named_source",
    "research_field",
    "general_practical_wisdom",
}

MARKET_WISDOM_EXPOSURE_ACTIONS = {
    "shown": "shown_at",
    "opened": "opened_at",
    "dismissed": "dismissed_at",
    "acted_on": "acted_on_at",
}

PROHIBITED_MARKERS = {
    "revenge",
    "humiliate",
    "humiliation",
    "coerce",
    "coercion",
    "deceive",
    "deception",
    "dominate",
    "blacklist",
    "exploit",
    "discriminate",
    "surveillance",
    "psychological pressure",
    "predatory",
}

CHARACTER_JUDGEMENT_MARKERS = {
    "dishonest person",
    "weak person",
    "irresponsible person",
    "dangerous person",
    "untrustworthy person",
    "bad character",
}

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "before",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "with",
    "when",
    "your",
}

LEGACY_INSIGHTS: List[str] = [
    "Trust builds faster than capital.",
    "Save before spending.",
    "Consistency builds credibility.",
    "Profit is what you keep, not what you sell.",
    "Your reputation is financial capital.",
    "Reliable traders separate profit from working capital.",
    "Small daily savings become large future capital.",
    "Your reputation travels faster than your goods.",
    "Strong traders build relationships, not only sales.",
    "Repaying early increases your trust strength.",
    "A disciplined trader always knows today's balance.",
    "Growth comes from reinvesting profits.",
    "The market rewards reliability.",
    "Trust attracts opportunity.",
    "People support traders who honour commitments.",
]

SEED_WISDOM_ENTRIES: List[Dict[str, Any]] = [
    {
        "public_id": "MW-SEED-TRUST-001",
        "title": "Make Trust Readable",
        "principle": "Trust becomes more useful when the behaviour behind it can be checked.",
        "short_message": "Before value moves, make the trust record easy to read.",
        "explanation": "A calm visible record reduces guessing and helps people decide with less fear.",
        "business_application": "Use identity, delivery, payment, and follow-up records before a trade decision.",
        "community_application": "Let community evidence support a decision without turning it into gossip.",
        "leadership_application": "Ask for evidence and context before approving risk for others.",
        "action_prompt": "Check the visible GSN record before the next commitment.",
        "warning": "A visible record supports judgement; it is not a guarantee.",
        "when_to_apply": "Use before trade, support, verification, or release decisions.",
        "when_not_to_apply": "Do not use it to shame, rank, or label a person.",
        "category": "Trust",
        "subcategory": "evidence",
        "behaviour_tags": ["verification", "visible-record", "decision-support"],
        "context_tags": ["trade", "support", "community"],
        "audience_tags": ["member", "merchant", "leader"],
        "related_gsn_modules": ["TrustSlip", "Trust Passport", "Marketplace"],
        "source_type": "research_field",
        "source_title": "trust research",
        "source_note": "General source context only; wording is original GSN guidance.",
        "evidence_level": "practical",
        "confidence_level": "medium",
    },
    {
        "public_id": "MW-SEED-FINANCE-001",
        "title": "Keep Promises Small Enough To Keep",
        "principle": "A commitment becomes stronger when it fits the capacity of the person making it.",
        "short_message": "Choose the promise you can keep repeatedly.",
        "explanation": "Steady follow-through is more useful than an impressive promise that fails under pressure.",
        "business_application": "Set stock, delivery, and payment commitments around real cash and time limits.",
        "community_application": "Support members with plans that can survive ordinary life pressure.",
        "leadership_application": "Approve commitments that have room for follow-through, not only ambition.",
        "action_prompt": "Review the next promise and reduce it if the evidence is thin.",
        "warning": "Do not use commitment records as public punishment.",
        "when_to_apply": "Use before savings, repayment, support, or business targets.",
        "when_not_to_apply": "Do not apply when an emergency requires human discretion.",
        "category": "Finance",
        "subcategory": "commitment-discipline",
        "behaviour_tags": ["repayment", "savings", "overcommitment"],
        "context_tags": ["loan", "support", "focus-commitment"],
        "audience_tags": ["member", "borrower", "supporter"],
        "related_gsn_modules": ["Loans", "Focus Commitments", "Community Finance"],
        "source_type": "general_practical_wisdom",
        "source_title": "financial management practice",
        "source_note": "General practical wisdom, expressed in original GSN wording.",
        "evidence_level": "practical",
        "confidence_level": "medium",
    },
    {
        "public_id": "MW-SEED-MERCHANT-001",
        "title": "Response Is Part Of Delivery",
        "principle": "Customers trust a merchant more when silence does not hide the state of the order.",
        "short_message": "A clear update can protect trust before a delay becomes conflict.",
        "explanation": "Many disputes begin when people cannot tell whether a promise is still being handled.",
        "business_application": "Send a simple update when stock, dispatch, repair, or pickup timing changes.",
        "community_application": "Let community commerce reward clear follow-up instead of loud claims.",
        "leadership_application": "Review repeated silence as a process signal, not as a character label.",
        "action_prompt": "Send one clear update before the next customer asks twice.",
        "warning": "An update does not excuse repeated failure; it only keeps the record honest.",
        "when_to_apply": "Use when delivery, pickup, payment, or order response is delayed.",
        "when_not_to_apply": "Do not use vague updates to hide a known problem.",
        "category": "Customer behaviour",
        "subcategory": "merchant-response",
        "behaviour_tags": ["late-delivery", "unresponsiveness", "customer-update"],
        "context_tags": ["shop", "marketplace", "delivery"],
        "audience_tags": ["merchant", "seller", "leader"],
        "related_gsn_modules": ["Marketplace", "Shop Diaries", "Spotlight"],
        "source_type": "general_practical_wisdom",
        "source_title": "common business practice",
        "source_note": "General practical wisdom, expressed in original GSN wording.",
        "evidence_level": "practical",
        "confidence_level": "medium",
    },
    {
        "public_id": "MW-SEED-GOVERNANCE-001",
        "title": "Separate Review From Rumour",
        "principle": "A community decision is safer when the review path is visible and the private details stay protected.",
        "short_message": "Use a review record before a concern becomes public noise.",
        "explanation": "Good governance gives people a path to raise concerns without turning every issue into exposure.",
        "business_application": "Keep complaints attached to records, timelines, and resolution steps.",
        "community_application": "Protect members by separating evidence review from public accusation.",
        "leadership_application": "Make the next review step clear, owned, and time-bound.",
        "action_prompt": "Move the concern into the correct review path.",
        "warning": "Do not publish private behavioural data to force compliance.",
        "when_to_apply": "Use for complaints, delayed approvals, disputes, or repeated unresolved issues.",
        "when_not_to_apply": "Do not use when there is immediate safety risk requiring direct human intervention.",
        "category": "Governance",
        "subcategory": "review-boundary",
        "behaviour_tags": ["dispute", "delayed-decision", "review"],
        "context_tags": ["community", "admin", "governance"],
        "audience_tags": ["leader", "admin", "member"],
        "related_gsn_modules": ["Community Domain", "Admin", "Trust Events"],
        "source_type": "research_field",
        "source_title": "governance research",
        "source_note": "General source context only; wording is original GSN guidance.",
        "evidence_level": "practical",
        "confidence_level": "medium",
    },
    {
        "public_id": "MW-SEED-NEGOTIATION-001",
        "title": "Clarify Before You Push",
        "principle": "A difficult decision improves when people first clarify what each side is actually asking for.",
        "short_message": "Ask for the real request before you answer the pressure.",
        "explanation": "Clarifying the request can reduce conflict, reveal timing problems, and prevent a rushed promise.",
        "business_application": "Before agreeing to price, credit, delivery, or discount pressure, restate the request plainly.",
        "community_application": "Help members separate need, timing, and responsibility before support is approved.",
        "leadership_application": "Slow the decision enough to name the request, the evidence, and the next owner.",
        "action_prompt": "Restate the request in one sentence before deciding.",
        "warning": "Clarifying is not delaying; use it to make the next action cleaner.",
        "when_to_apply": "Use during negotiation, support requests, complaints, or pressure to decide quickly.",
        "when_not_to_apply": "Do not use questions to trap, embarrass, or manipulate another person.",
        "category": "Negotiation",
        "subcategory": "clarity",
        "behaviour_tags": ["pressure", "support-request", "decision"],
        "context_tags": ["trade", "loan", "governance"],
        "audience_tags": ["merchant", "leader", "member"],
        "related_gsn_modules": ["Loans", "Marketplace", "Community Home"],
        "source_type": "research_field",
        "source_title": "negotiation research",
        "source_note": "General source context only; wording is original GSN guidance.",
        "evidence_level": "practical",
        "confidence_level": "medium",
    },
    {
        "public_id": "MW-SEED-INNOVATION-001",
        "title": "Evidence Before Expansion",
        "principle": "A product becomes stronger when each new feature is tied to real evidence of need.",
        "short_message": "Do not expand faster than the evidence can explain.",
        "explanation": "New features can make a system heavier if they are not connected to repeated user need.",
        "business_application": "Before adding a new offer, check whether customers repeated the problem and acted on the solution.",
        "community_application": "Let community needs shape the next tool instead of adding every possible tool at once.",
        "leadership_application": "Approve expansion when the evidence shows pull, not only imagination.",
        "action_prompt": "Name the evidence behind the next feature before building it.",
        "warning": "Useful complexity still becomes harmful when it arrives before users can absorb it.",
        "when_to_apply": "Use before feature expansion, pilot scope changes, or heavy workflow additions.",
        "when_not_to_apply": "Do not use it to block urgent fixes that protect trust or safety.",
        "category": "Innovation",
        "subcategory": "evidence-before-expansion",
        "behaviour_tags": ["feature-expansion", "customer-discovery", "pilot"],
        "context_tags": ["founder", "product", "business"],
        "audience_tags": ["founder", "leader", "admin"],
        "related_gsn_modules": ["Dashboard", "Protocol Status", "Pilot Readiness"],
        "source_type": "research_field",
        "source_title": "lean startup and product discovery practice",
        "source_note": "General source context only; wording is original GSN guidance.",
        "evidence_level": "practical",
        "confidence_level": "medium",
    },
]

PILOT_WISDOM_DOMAIN_SEEDS: List[Dict[str, Any]] = [
    {
        "code": "TRUST",
        "category": "Trust",
        "subcategory": "visible-evidence",
        "scenario": "trust decision",
        "business_area": "trade check",
        "community_area": "member support",
        "leadership_area": "risk review",
        "module": "TrustSlip",
        "source_title": "trust and cooperation practice",
        "behaviour_tags": ["verification", "visible-record", "decision-support"],
        "context_tags": ["trust", "trade", "community"],
        "audience_tags": ["member", "merchant", "leader"],
        "related_gsn_modules": ["TrustSlip", "Trust Passport", "Trust Events"],
    },
    {
        "code": "REPAYMENT",
        "category": "Repayment",
        "subcategory": "repayment-discipline",
        "scenario": "repayment plan",
        "business_area": "loan support",
        "community_area": "contribution circle",
        "leadership_area": "repayment review",
        "module": "Loans",
        "source_title": "repayment discipline practice",
        "behaviour_tags": ["repayment", "follow-through", "support"],
        "context_tags": ["loan", "finance", "community"],
        "audience_tags": ["borrower", "supporter", "leader"],
        "related_gsn_modules": ["Loans", "Community Finance", "Focus Commitments"],
    },
    {
        "code": "SAVINGS",
        "category": "Savings",
        "subcategory": "capital-habit",
        "scenario": "savings habit",
        "business_area": "working capital",
        "community_area": "rotating contribution",
        "leadership_area": "member readiness",
        "module": "Community Finance",
        "source_title": "small business cash discipline",
        "behaviour_tags": ["savings", "capital", "discipline"],
        "context_tags": ["finance", "rosca", "member-readiness"],
        "audience_tags": ["member", "merchant", "leader"],
        "related_gsn_modules": ["Community Finance", "ROSCA", "Dashboard"],
    },
    {
        "code": "MERCHANT",
        "category": "Merchant behaviour",
        "subcategory": "shop-reliability",
        "scenario": "shop promise",
        "business_area": "customer order",
        "community_area": "trusted commerce",
        "leadership_area": "merchant oversight",
        "module": "Marketplace",
        "source_title": "merchant reliability practice",
        "behaviour_tags": ["shop", "customer-update", "delivery"],
        "context_tags": ["marketplace", "shop", "trade"],
        "audience_tags": ["merchant", "seller", "leader"],
        "related_gsn_modules": ["Marketplace", "Shop Diaries", "Spotlight"],
    },
    {
        "code": "DELIVERY",
        "category": "Delivery",
        "subcategory": "order-follow-through",
        "scenario": "delivery commitment",
        "business_area": "pickup or dispatch",
        "community_area": "buyer confidence",
        "leadership_area": "service review",
        "module": "Shop Diaries",
        "source_title": "delivery and service operations practice",
        "behaviour_tags": ["delivery", "timeline", "service"],
        "context_tags": ["shop", "service", "marketplace"],
        "audience_tags": ["merchant", "member", "leader"],
        "related_gsn_modules": ["Shop Diaries", "Marketplace", "Trust Events"],
    },
    {
        "code": "DEMAND",
        "category": "Demand",
        "subcategory": "request-clarity",
        "scenario": "demand request",
        "business_area": "buyer request",
        "community_area": "shared opportunity",
        "leadership_area": "market signal review",
        "module": "Demand Box",
        "source_title": "market demand discovery practice",
        "behaviour_tags": ["demand", "request", "opportunity"],
        "context_tags": ["marketplace", "buyer", "opportunity"],
        "audience_tags": ["member", "merchant", "leader"],
        "related_gsn_modules": ["Demand Box", "Marketplace", "Community Home"],
    },
    {
        "code": "SPOTLIGHT",
        "category": "Spotlight",
        "subcategory": "visibility-discipline",
        "scenario": "visibility request",
        "business_area": "promotion",
        "community_area": "community attention",
        "leadership_area": "spotlight review",
        "module": "Spotlight",
        "source_title": "responsible promotion practice",
        "behaviour_tags": ["spotlight", "visibility", "evidence"],
        "context_tags": ["marketing", "shop", "community"],
        "audience_tags": ["merchant", "leader", "admin"],
        "related_gsn_modules": ["Spotlight", "Marketplace", "Shop Control"],
    },
    {
        "code": "GOVERNANCE",
        "category": "Governance",
        "subcategory": "decision-boundary",
        "scenario": "governance decision",
        "business_area": "admin action",
        "community_area": "member confidence",
        "leadership_area": "approval path",
        "module": "Admin",
        "source_title": "community governance practice",
        "behaviour_tags": ["review", "approval", "responsibility"],
        "context_tags": ["governance", "admin", "community"],
        "audience_tags": ["leader", "admin", "member"],
        "related_gsn_modules": ["Admin", "Community Domain", "Trust Events"],
    },
    {
        "code": "ONBOARDING",
        "category": "Onboarding",
        "subcategory": "entry-readiness",
        "scenario": "member entry",
        "business_area": "first setup",
        "community_area": "welcome path",
        "leadership_area": "membership review",
        "module": "Entry",
        "source_title": "membership onboarding practice",
        "behaviour_tags": ["entry", "membership", "setup"],
        "context_tags": ["onboarding", "community", "identity"],
        "audience_tags": ["new-member", "leader", "admin"],
        "related_gsn_modules": ["Entry", "Community Home", "Profile"],
    },
    {
        "code": "IDENTITY",
        "category": "Identity",
        "subcategory": "identity-evidence",
        "scenario": "identity record",
        "business_area": "verified contact",
        "community_area": "member recognition",
        "leadership_area": "identity review",
        "module": "CCI",
        "source_title": "identity and verification practice",
        "behaviour_tags": ["identity", "verification", "profile"],
        "context_tags": ["identity", "trust", "membership"],
        "audience_tags": ["member", "leader", "admin"],
        "related_gsn_modules": ["CCI", "Profile", "Trust Passport"],
    },
    {
        "code": "SUPPORT",
        "category": "Support",
        "subcategory": "support-readiness",
        "scenario": "support request",
        "business_area": "help request",
        "community_area": "mutual support",
        "leadership_area": "support approval",
        "module": "Community Home",
        "source_title": "mutual aid and support practice",
        "behaviour_tags": ["support", "request", "follow-up"],
        "context_tags": ["community", "loan", "member"],
        "audience_tags": ["member", "supporter", "leader"],
        "related_gsn_modules": ["Community Home", "Loans", "Focus Commitments"],
    },
    {
        "code": "DISPUTE",
        "category": "Dispute resolution",
        "subcategory": "repair-path",
        "scenario": "dispute record",
        "business_area": "customer concern",
        "community_area": "relationship repair",
        "leadership_area": "resolution review",
        "module": "Trust Events",
        "source_title": "conflict resolution practice",
        "behaviour_tags": ["dispute", "repair", "resolution"],
        "context_tags": ["trade", "governance", "trust"],
        "audience_tags": ["member", "merchant", "leader"],
        "related_gsn_modules": ["Trust Events", "Marketplace", "Admin"],
    },
]

PILOT_WISDOM_MOVE_SEEDS: List[Dict[str, Any]] = [
    {
        "code": "RECORD",
        "title": "Write The Record First",
        "focus": "record",
        "principle": "A {scenario} improves when the record is written before memory starts doing the work.",
        "short_message": "Write the {scenario} record before the next promise is added.",
        "explanation": "A simple record gives {business_area}, {community_area}, and {leadership_area} the same starting point.",
        "business_application": "Attach the date, person, amount, item, or next step to the {business_area} before moving forward.",
        "community_application": "Let the {community_area} see the agreed fact without exposing private details.",
        "leadership_application": "Use the {leadership_area} to ask what is recorded, not who can speak loudest.",
        "action_prompt": "Add one missing record to {module} before the next action.",
        "warning": "A record helps judgement; it does not replace human review.",
        "when_to_apply": "Use when facts may be forgotten, retold, or mixed with emotion.",
        "when_not_to_apply": "Do not record private details that the decision does not need.",
        "move_tags": ["record", "evidence", "memory"],
    },
    {
        "code": "CAPACITY",
        "title": "Match The Promise To Capacity",
        "focus": "capacity",
        "principle": "A {scenario} is stronger when the promise matches the capacity that can actually carry it.",
        "short_message": "Reduce the {scenario} promise until it fits real capacity.",
        "explanation": "Reliable movement usually comes from a clear fit between intention, time, cash, and support.",
        "business_application": "Size the {business_area} around available stock, cash, time, and ordinary pressure.",
        "community_application": "Help the {community_area} support a promise that can survive the week.",
        "leadership_application": "Use the {leadership_area} to check capacity before approving commitment.",
        "action_prompt": "Name the capacity limit before expanding the next promise.",
        "warning": "Ambition is useful only when it is carried by a workable plan.",
        "when_to_apply": "Use before borrowing, accepting orders, joining contributions, or setting deadlines.",
        "when_not_to_apply": "Do not use capacity language to dismiss a member who needs guidance.",
        "move_tags": ["capacity", "planning", "commitment"],
    },
    {
        "code": "UPDATE",
        "title": "Update Before Silence Grows",
        "focus": "update",
        "principle": "A {scenario} loses less trust when people receive a clear update before silence becomes the story.",
        "short_message": "Send one honest {scenario} update before people have to chase.",
        "explanation": "A timely update protects attention, reduces guessing, and gives the next action a place to land.",
        "business_application": "Tell the {business_area} what changed, what is still true, and what happens next.",
        "community_application": "Let the {community_area} see progress without turning delay into public noise.",
        "leadership_application": "Use the {leadership_area} to separate a late update from repeated avoidance.",
        "action_prompt": "Send the next update through {module}.",
        "warning": "An update must be specific enough to be useful.",
        "when_to_apply": "Use when timing, stock, evidence, payment, or approval has changed.",
        "when_not_to_apply": "Do not use vague updates to hide a known unresolved issue.",
        "move_tags": ["update", "timing", "follow-up"],
    },
    {
        "code": "TIMING",
        "title": "Choose The Right Moment",
        "focus": "timing",
        "principle": "A {scenario} works better when the next step respects timing instead of forcing speed.",
        "short_message": "Let the {scenario} timing match the evidence available now.",
        "explanation": "Some decisions fail because they are too early, not because the idea is wrong.",
        "business_application": "Move the {business_area} when the buyer, seller, stock, or payment state is clear.",
        "community_application": "Help the {community_area} avoid rushing a promise that needs one more fact.",
        "leadership_application": "Use the {leadership_area} to decide whether to act now, wait, or request evidence.",
        "action_prompt": "Mark the next step as now, later, or waiting for evidence.",
        "warning": "Waiting should have an owner and a time, or it becomes drift.",
        "when_to_apply": "Use when urgency is high but the decision still needs a clean next step.",
        "when_not_to_apply": "Do not delay urgent safety, care, or protection decisions.",
        "move_tags": ["timing", "decision", "evidence"],
    },
    {
        "code": "REVIEW",
        "title": "Review The Pattern",
        "focus": "pattern",
        "principle": "A {scenario} becomes easier to improve when repeated behaviour is reviewed as a pattern.",
        "short_message": "Look for the {scenario} pattern before judging the latest event.",
        "explanation": "One event may be noise; a pattern can show where process, support, or repair is needed.",
        "business_application": "Compare the {business_area} with earlier dates, updates, and outcomes.",
        "community_application": "Let the {community_area} learn from the pattern without labelling the person.",
        "leadership_application": "Use the {leadership_area} to decide whether the pattern needs guidance or a boundary.",
        "action_prompt": "Review the last three related records in {module}.",
        "warning": "A pattern describes behaviour; it is not a character label.",
        "when_to_apply": "Use when the same issue appears more than once.",
        "when_not_to_apply": "Do not stretch a pattern from thin or unrelated evidence.",
        "move_tags": ["pattern", "review", "behaviour"],
    },
    {
        "code": "SMALL",
        "title": "Make The Next Step Small",
        "focus": "small-step",
        "principle": "A {scenario} gains momentum when the next step is small enough to finish today.",
        "short_message": "Choose one small {scenario} action that can be completed today.",
        "explanation": "Small finished steps create cleaner evidence than large plans that never move.",
        "business_application": "Turn the {business_area} into one message, record, delivery, payment, or confirmation.",
        "community_application": "Help the {community_area} support progress that can be seen quickly.",
        "leadership_application": "Use the {leadership_area} to assign the smallest useful next owner.",
        "action_prompt": "Create one small next step in {module}.",
        "warning": "Small steps still need to point toward the real problem.",
        "when_to_apply": "Use when a member is stuck, overloaded, or avoiding a large task.",
        "when_not_to_apply": "Do not shrink a decision that needs a firm boundary.",
        "move_tags": ["small-step", "progress", "focus"],
    },
    {
        "code": "BOUNDARY",
        "title": "Set A Clean Boundary",
        "focus": "boundary",
        "principle": "A {scenario} protects trust when the boundary is clear before more value is committed.",
        "short_message": "Name the {scenario} boundary before adding more support.",
        "explanation": "A boundary can protect relationships by making the next acceptable action visible.",
        "business_application": "State the limit for the {business_area}: amount, time, item, access, or evidence.",
        "community_application": "Let the {community_area} understand the rule without exposing private detail.",
        "leadership_application": "Use the {leadership_area} to make the boundary fair, specific, and reviewable.",
        "action_prompt": "Write the boundary and the review point in {module}.",
        "warning": "A boundary should guide conduct, not punish identity.",
        "when_to_apply": "Use when extra value, access, support, or visibility could increase risk.",
        "when_not_to_apply": "Do not use a boundary to avoid a necessary conversation.",
        "move_tags": ["boundary", "risk", "review"],
    },
    {
        "code": "FOLLOWUP",
        "title": "Close The Loop",
        "focus": "follow-up",
        "principle": "A {scenario} strengthens trust when the final follow-up is not left floating.",
        "short_message": "Close the {scenario} loop so the record knows what happened.",
        "explanation": "Completion becomes useful evidence when the result, delay, or next owner is recorded.",
        "business_application": "Confirm whether the {business_area} finished, changed, or needs another step.",
        "community_application": "Let the {community_area} see the outcome without chasing old uncertainty.",
        "leadership_application": "Use the {leadership_area} to keep unresolved items from becoming invisible.",
        "action_prompt": "Add the outcome note in {module}.",
        "warning": "A loop is not closed until the result is clear enough for the next person.",
        "when_to_apply": "Use after payment, delivery, support, approval, review, or repair.",
        "when_not_to_apply": "Do not mark closed when the affected person has not received the needed update.",
        "move_tags": ["follow-up", "outcome", "closure"],
    },
    {
        "code": "REPAIR",
        "title": "Repair Early",
        "focus": "repair",
        "principle": "A {scenario} recovers faster when repair begins before the issue becomes part of community memory.",
        "short_message": "Start the {scenario} repair while the facts are still fresh.",
        "explanation": "Early repair can turn an issue into a useful record instead of a lasting distrust signal.",
        "business_application": "Offer the {business_area} a clear correction, timeline, replacement, or next review.",
        "community_application": "Help the {community_area} protect relationship value while facts are checked.",
        "leadership_application": "Use the {leadership_area} to track repair without turning it into public blame.",
        "action_prompt": "Record the repair step and owner in {module}.",
        "warning": "Repair requires action; explanation alone is not enough.",
        "when_to_apply": "Use after missed timing, wrong item, unclear support, or a broken expectation.",
        "when_not_to_apply": "Do not use repair language to erase evidence that still matters.",
        "move_tags": ["repair", "resolution", "relationship"],
    },
    {
        "code": "NEXT",
        "title": "Make The Next Owner Visible",
        "focus": "next-owner",
        "principle": "A {scenario} moves with less confusion when the next owner is visible.",
        "short_message": "Name who owns the next {scenario} step.",
        "explanation": "Trust improves when responsibility is specific enough for action, not just intention.",
        "business_application": "Attach the {business_area} to one person, one time, and one expected result.",
        "community_application": "Let the {community_area} know where progress should come from next.",
        "leadership_application": "Use the {leadership_area} to prevent shared responsibility from becoming no responsibility.",
        "action_prompt": "Assign the next owner in {module}.",
        "warning": "Ownership should clarify responsibility, not isolate blame.",
        "when_to_apply": "Use when many people know the issue but nobody owns the next action.",
        "when_not_to_apply": "Do not assign ownership to someone without the authority or information to act.",
        "move_tags": ["owner", "responsibility", "next-step"],
    },
]


def _pilot_wisdom_entry(domain: Dict[str, Any], move: Dict[str, Any]) -> Dict[str, Any]:
    values = {**domain, **move}
    return {
        "public_id": f"MW-PILOT-{domain['code']}-{move['code']}",
        "title": f"{move['title']} In {domain['category']}",
        "principle": move["principle"].format(**values),
        "short_message": move["short_message"].format(**values),
        "explanation": move["explanation"].format(**values),
        "business_application": move["business_application"].format(**values),
        "community_application": move["community_application"].format(**values),
        "leadership_application": move["leadership_application"].format(**values),
        "action_prompt": move["action_prompt"].format(**values),
        "warning": move["warning"],
        "when_to_apply": move["when_to_apply"],
        "when_not_to_apply": move["when_not_to_apply"],
        "category": domain["category"],
        "subcategory": f"{domain['subcategory']}-{move['focus']}",
        "behaviour_tags": [*domain["behaviour_tags"], *move["move_tags"]],
        "context_tags": domain["context_tags"],
        "audience_tags": domain["audience_tags"],
        "related_gsn_modules": domain["related_gsn_modules"],
        "source_type": "general_practical_wisdom",
        "source_title": domain["source_title"],
        "source_note": "Curated pilot Market Wisdom library; wording is original GSN guidance.",
        "evidence_level": "practical",
        "confidence_level": "medium",
        "ethical_risk_level": "low",
        "sensitivity_level": "low",
    }


SEED_WISDOM_ENTRIES.extend(
    _pilot_wisdom_entry(domain, move)
    for domain in PILOT_WISDOM_DOMAIN_SEEDS
    for move in PILOT_WISDOM_MOVE_SEEDS
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any) -> str:
    return str(value or "").strip()


def _safe_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [_safe_str(item) for item in value if _safe_str(item)]
    if isinstance(value, tuple) or isinstance(value, set):
        return [_safe_str(item) for item in value if _safe_str(item)]
    text = _safe_str(value)
    if not text:
        return []
    return [part.strip() for part in re.split(r"[,|]", text) if part.strip()]


def _json_list(value: Any) -> str:
    return json.dumps(_safe_list(value), ensure_ascii=True, sort_keys=True)


def _read_json_list(value: Any) -> List[str]:
    text = _safe_str(value)
    if not text:
        return []
    try:
        raw = json.loads(text)
    except Exception:
        return []
    return _safe_list(raw)


def _normalise_text(value: Any) -> str:
    text = _safe_str(value).lower()
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _combined_entry_text(payload: Dict[str, Any]) -> str:
    parts = [
        payload.get("title"),
        payload.get("principle"),
        payload.get("short_message"),
        payload.get("explanation"),
        payload.get("business_application"),
        payload.get("community_application"),
        payload.get("leadership_application"),
        payload.get("action_prompt"),
        payload.get("warning"),
    ]
    return " ".join(_safe_str(part) for part in parts if _safe_str(part))


def originality_hash_for_payload(payload: Dict[str, Any]) -> str:
    normalised = _normalise_text(
        " ".join(
            [
                _safe_str(payload.get("principle")),
                _safe_str(payload.get("short_message")),
                _safe_str(payload.get("action_prompt")),
            ]
        )
    )
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


def semantic_fingerprint_for_payload(payload: Dict[str, Any]) -> str:
    words = [
        word
        for word in _normalise_text(_combined_entry_text(payload)).split()
        if len(word) > 2 and word not in STOP_WORDS
    ]
    return " ".join(sorted(set(words)))


def semantic_similarity(left: str, right: str) -> float:
    left_set = {word for word in _safe_str(left).split() if word}
    right_set = {word for word in _safe_str(right).split() if word}
    if not left_set or not right_set:
        return 0.0
    return len(left_set & right_set) / float(len(left_set | right_set))


def _today_seed(day: Optional[datetime] = None) -> int:
    target = day or _now()
    today = target.astimezone(timezone.utc).strftime("%Y-%m-%d")
    digest = hashlib.sha256(today.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _legacy_daily_market_wisdom() -> Dict[str, str]:
    idx = _today_seed() % len(LEGACY_INSIGHTS)
    return {
        "date": _now().strftime("%Y-%m-%d"),
        "text": LEGACY_INSIGHTS[idx],
        "source": "GSN Market Wisdom",
    }


def _source_attribution(entry: MarketWisdomEntry) -> str:
    source_type = _safe_str(entry.source_type)
    title = _safe_str(entry.source_title)
    author = _safe_str(entry.source_author)

    if source_type == "named_source" and title and author:
        return f"Inspired by {title}, {author}"
    if source_type == "named_source" and title:
        return f"Source context: {title}"
    if source_type == "research_field" and title:
        return f"Source context: {title}"
    if title:
        return f"Source context: {title}"
    return "Source context: General practical wisdom"


def public_market_wisdom_entry(entry: MarketWisdomEntry, *, why_selected: Optional[str] = None) -> Dict[str, Any]:
    attribution = _source_attribution(entry)
    text = _safe_str(entry.short_message) or _safe_str(entry.principle)
    return {
        "public_id": entry.public_id,
        "title": entry.title,
        "principle": entry.principle,
        "short_message": text,
        "text": text,
        "explanation": entry.explanation,
        "why_it_may_matter_now": why_selected or entry.when_to_apply,
        "action_prompt": entry.action_prompt,
        "warning": entry.warning,
        "category": entry.category,
        "subcategory": entry.subcategory,
        "source_attribution": attribution,
        "source": attribution,
        "confidence_level": entry.confidence_level,
        "evidence_level": entry.evidence_level,
        "market_wisdom_entry": True,
    }


def admin_market_wisdom_entry(entry: MarketWisdomEntry) -> Dict[str, Any]:
    data = public_market_wisdom_entry(entry)
    data.update(
        {
            "id": entry.id,
            "business_application": entry.business_application,
            "community_application": entry.community_application,
            "leadership_application": entry.leadership_application,
            "when_to_apply": entry.when_to_apply,
            "when_not_to_apply": entry.when_not_to_apply,
            "behaviour_tags": _read_json_list(entry.behaviour_tags_json),
            "context_tags": _read_json_list(entry.context_tags_json),
            "audience_tags": _read_json_list(entry.audience_tags_json),
            "related_gsn_modules": _read_json_list(entry.related_gsn_modules_json),
            "source_type": entry.source_type,
            "source_title": entry.source_title,
            "source_author": entry.source_author,
            "source_year": entry.source_year,
            "source_url": entry.source_url,
            "source_note": entry.source_note,
            "ethical_risk_level": entry.ethical_risk_level,
            "sensitivity_level": entry.sensitivity_level,
            "originality_hash": entry.originality_hash,
            "semantic_fingerprint": entry.semantic_fingerprint,
            "generation_method": entry.generation_method,
            "generation_reason": entry.generation_reason,
            "validation": _safe_json_dict(entry.validation_json),
            "generated_at": entry.generated_at.isoformat() if entry.generated_at else None,
            "reviewed_at": entry.reviewed_at.isoformat() if entry.reviewed_at else None,
            "approved_at": entry.approved_at.isoformat() if entry.approved_at else None,
            "status": entry.status,
            "version": entry.version,
            "language": entry.language,
            "created_by": entry.created_by,
            "reviewed_by": entry.reviewed_by,
        }
    )
    return data


def _safe_json_dict(value: Any) -> Dict[str, Any]:
    text = _safe_str(value)
    if not text:
        return {}
    try:
        raw = json.loads(text)
    except Exception:
        return {}
    return raw if isinstance(raw, dict) else {}


def _find_or_create_source(db: Session, payload: Dict[str, Any]) -> Optional[MarketWisdomSource]:
    source_type = _safe_str(payload.get("source_type")) or "general_practical_wisdom"
    source_title = _safe_str(payload.get("source_title"))
    source_author = _safe_str(payload.get("source_author"))
    if not source_title and source_type == "general_practical_wisdom":
        source_title = "General practical wisdom"

    source = (
        db.query(MarketWisdomSource)
        .filter(MarketWisdomSource.source_type == source_type)
        .filter(MarketWisdomSource.source_title == (source_title or None))
        .filter(MarketWisdomSource.source_author == (source_author or None))
        .first()
    )
    if source:
        return source

    source = MarketWisdomSource(
        source_type=source_type,
        source_title=source_title or None,
        source_author=source_author or None,
        source_year=_safe_str(payload.get("source_year")) or None,
        source_url=_safe_str(payload.get("source_url")) or None,
        source_note=_safe_str(payload.get("source_note")) or None,
    )
    db.add(source)
    db.flush()
    return source


def validate_market_wisdom_payload(
    db: Session,
    payload: Dict[str, Any],
    *,
    exclude_public_id: Optional[str] = None,
) -> Dict[str, Any]:
    source_type = _safe_str(payload.get("source_type")) or "general_practical_wisdom"
    if source_type not in MARKET_WISDOM_SOURCE_TYPES:
        return {"ok": False, "reason": "Invalid source_type.", "status": "rejected"}

    if source_type == "named_source" and (
        not _safe_str(payload.get("source_title")) or not _safe_str(payload.get("source_author"))
    ):
        return {
            "ok": False,
            "reason": "Named source entries require source_title and source_author.",
            "status": "rejected",
        }

    source_url = _safe_str(payload.get("source_url"))
    if source_url and not source_url.startswith(("https://", "http://")):
        return {"ok": False, "reason": "source_url must be a verified URL or omitted.", "status": "rejected"}

    required_fields = ["title", "principle", "short_message", "category"]
    missing = [field for field in required_fields if not _safe_str(payload.get(field))]
    if missing:
        return {"ok": False, "reason": f"Missing required fields: {', '.join(missing)}.", "status": "rejected"}

    combined = _normalise_text(_combined_entry_text(payload))
    blocked = sorted(marker for marker in PROHIBITED_MARKERS if marker in combined)
    character_judgement = sorted(marker for marker in CHARACTER_JUDGEMENT_MARKERS if marker in combined)
    if blocked:
        return {
            "ok": False,
            "reason": "Wisdom entry contains prohibited manipulation or harm language.",
            "status": "rejected",
            "blocked_terms": blocked,
        }
    if character_judgement:
        return {
            "ok": False,
            "reason": "Wisdom entry judges character instead of describing behaviour.",
            "status": "rejected",
            "blocked_terms": character_judgement,
        }

    originality_hash = originality_hash_for_payload(payload)
    fingerprint = semantic_fingerprint_for_payload(payload)

    existing_q = db.query(MarketWisdomEntry)
    if exclude_public_id:
        existing_q = existing_q.filter(MarketWisdomEntry.public_id != exclude_public_id)

    exact_duplicate = existing_q.filter(MarketWisdomEntry.originality_hash == originality_hash).first()
    if exact_duplicate:
        return {
            "ok": False,
            "reason": "Exact duplicate wisdom principle.",
            "status": "rejected",
            "duplicate_public_id": exact_duplicate.public_id,
            "originality_hash": originality_hash,
            "semantic_fingerprint": fingerprint,
        }

    similar_entries: List[Dict[str, Any]] = []
    for entry in existing_q.limit(500).all():
        score = semantic_similarity(fingerprint, entry.semantic_fingerprint)
        if score >= 0.62:
            similar_entries.append(
                {
                    "public_id": entry.public_id,
                    "title": entry.title,
                    "similarity": round(score, 4),
                }
            )

    suggested_status = _safe_str(payload.get("status")) or "generated"
    if suggested_status not in MARKET_WISDOM_STATUSES:
        suggested_status = "generated"
    trusted_seed = _safe_str(payload.get("generation_method")) == "seeded_governed_library"
    if similar_entries and suggested_status == "approved" and not trusted_seed:
        suggested_status = "review_required"

    return {
        "ok": True,
        "status": suggested_status,
        "originality_hash": originality_hash,
        "semantic_fingerprint": fingerprint,
        "similar_entries": sorted(similar_entries, key=lambda item: item["similarity"], reverse=True)[:5],
        "requires_review": bool(similar_entries),
    }


def create_market_wisdom_entry(
    db: Session,
    payload: Dict[str, Any],
    *,
    actor: Optional[User] = None,
) -> MarketWisdomEntry:
    validation = validate_market_wisdom_payload(db, payload)
    if not validation.get("ok"):
        raise ValueError(_safe_str(validation.get("reason")) or "Wisdom entry failed validation.")

    source = _find_or_create_source(db, payload)
    status = _safe_str(validation.get("status")) or "generated"
    now = _now()
    entry = MarketWisdomEntry(
        public_id=_safe_str(payload.get("public_id")) or _public_id_for_payload(payload),
        title=_safe_str(payload.get("title")),
        principle=_safe_str(payload.get("principle")),
        short_message=_safe_str(payload.get("short_message")),
        explanation=_safe_str(payload.get("explanation")) or None,
        business_application=_safe_str(payload.get("business_application")) or None,
        community_application=_safe_str(payload.get("community_application")) or None,
        leadership_application=_safe_str(payload.get("leadership_application")) or None,
        action_prompt=_safe_str(payload.get("action_prompt")) or None,
        warning=_safe_str(payload.get("warning")) or None,
        when_to_apply=_safe_str(payload.get("when_to_apply")) or None,
        when_not_to_apply=_safe_str(payload.get("when_not_to_apply")) or None,
        category=_safe_str(payload.get("category")) or "General",
        subcategory=_safe_str(payload.get("subcategory")) or None,
        behaviour_tags_json=_json_list(payload.get("behaviour_tags")),
        context_tags_json=_json_list(payload.get("context_tags")),
        audience_tags_json=_json_list(payload.get("audience_tags")),
        related_gsn_modules_json=_json_list(payload.get("related_gsn_modules")),
        source_id=getattr(source, "id", None),
        source_type=_safe_str(payload.get("source_type")) or "general_practical_wisdom",
        source_title=_safe_str(payload.get("source_title")) or None,
        source_author=_safe_str(payload.get("source_author")) or None,
        source_year=_safe_str(payload.get("source_year")) or None,
        source_url=_safe_str(payload.get("source_url")) or None,
        source_note=_safe_str(payload.get("source_note")) or None,
        evidence_level=_safe_str(payload.get("evidence_level")) or "practical",
        confidence_level=_safe_str(payload.get("confidence_level")) or "medium",
        ethical_risk_level=_safe_str(payload.get("ethical_risk_level")) or "low",
        sensitivity_level=_safe_str(payload.get("sensitivity_level")) or "low",
        originality_hash=_safe_str(validation.get("originality_hash")),
        semantic_fingerprint=_safe_str(validation.get("semantic_fingerprint")),
        generation_method=_safe_str(payload.get("generation_method")) or "admin_seeded",
        generation_reason=_safe_str(payload.get("generation_reason")) or None,
        validation_json=json.dumps(validation, ensure_ascii=True, sort_keys=True),
        generated_at=now if status in {"generated", "review_required", "approved"} else None,
        reviewed_at=now if status == "approved" else None,
        approved_at=now if status == "approved" else None,
        status=status,
        version=int(payload.get("version") or 1),
        language=_safe_str(payload.get("language")) or "en",
        created_by=getattr(actor, "id", None),
        reviewed_by=getattr(actor, "id", None) if status == "approved" else None,
        updated_at=now,
    )
    db.add(entry)
    db.flush()
    return entry


def _public_id_for_payload(payload: Dict[str, Any]) -> str:
    digest = originality_hash_for_payload(payload)[:12].upper()
    category = re.sub(r"[^A-Z0-9]+", "-", _safe_str(payload.get("category")).upper()).strip("-")
    return f"MW-{category or 'GENERAL'}-{digest}"


def ensure_seed_market_wisdom(db: Session) -> None:
    existing_public_ids = {
        str(row[0])
        for row in db.query(MarketWisdomEntry.public_id).all()
        if row[0]
    }
    missing_seed_payloads = [
        payload
        for payload in SEED_WISDOM_ENTRIES
        if _safe_str(payload.get("public_id")) not in existing_public_ids
    ]
    if not missing_seed_payloads:
        return

    approved_count = 0
    review_required_count = 0
    for payload in missing_seed_payloads:
        seeded = dict(payload)
        seeded["status"] = "approved"
        seeded["generation_method"] = "seeded_governed_library"
        seeded["generation_reason"] = "Curated governed Market Wisdom pilot library."
        entry = create_market_wisdom_entry(db, seeded)
        if entry.status == "approved":
            approved_count += 1
        if entry.status == "review_required":
            review_required_count += 1

    run = MarketWisdomGenerationRun(
        run_type="seed",
        category="pilot-library",
        requested_count=len(missing_seed_payloads),
        generated_count=len(missing_seed_payloads),
        approved_count=approved_count,
        review_required_count=review_required_count,
        rejected_count=0,
        stop_reason="Seeded missing curated entries only; no automatic generation run.",
        validation_summary_json=json.dumps(
            {
                "curated_pilot_library": True,
                "missing_seed_public_ids_only": True,
                "seed_entry_count": len(SEED_WISDOM_ENTRIES),
                "source_policy": "metadata_and_general_context_only",
            },
            ensure_ascii=True,
            sort_keys=True,
        ),
    )
    db.add(run)
    db.commit()


def get_daily_market_wisdom(db: Optional[Session] = None) -> Dict[str, Any]:
    if db is None:
        return _legacy_daily_market_wisdom()

    ensure_seed_market_wisdom(db)
    entries = (
        db.query(MarketWisdomEntry)
        .filter(MarketWisdomEntry.status == "approved")
        .filter(MarketWisdomEntry.language == "en")
        .order_by(MarketWisdomEntry.public_id.asc())
        .all()
    )
    if not entries:
        return _legacy_daily_market_wisdom()

    entry = entries[_today_seed() % len(entries)]
    public = public_market_wisdom_entry(entry)
    return {
        "date": _now().strftime("%Y-%m-%d"),
        "text": public["text"],
        "source": public["source"],
        **public,
    }


def list_market_wisdom_entries(
    db: Session,
    *,
    status: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 100,
) -> Dict[str, Any]:
    ensure_seed_market_wisdom(db)
    q = db.query(MarketWisdomEntry)
    if _safe_str(status):
        q = q.filter(MarketWisdomEntry.status == _safe_str(status))
    if _safe_str(category):
        q = q.filter(MarketWisdomEntry.category == _safe_str(category))
    if _safe_str(source):
        needle = f"%{_safe_str(source)}%"
        q = q.filter(or_(MarketWisdomEntry.source_title.ilike(needle), MarketWisdomEntry.source_author.ilike(needle)))

    items = q.order_by(MarketWisdomEntry.created_at.desc()).limit(max(1, min(int(limit or 100), 250))).all()
    return {"ok": True, "items": [admin_market_wisdom_entry(entry) for entry in items]}


def update_market_wisdom_entry(
    db: Session,
    public_id: str,
    payload: Dict[str, Any],
    *,
    actor: Optional[User] = None,
) -> MarketWisdomEntry:
    ensure_seed_market_wisdom(db)
    entry = db.query(MarketWisdomEntry).filter(MarketWisdomEntry.public_id == public_id).first()
    if not entry:
        raise LookupError("Market Wisdom entry not found.")

    editable_fields = {
        "title",
        "principle",
        "short_message",
        "explanation",
        "business_application",
        "community_application",
        "leadership_application",
        "action_prompt",
        "warning",
        "when_to_apply",
        "when_not_to_apply",
        "category",
        "subcategory",
        "source_type",
        "source_title",
        "source_author",
        "source_year",
        "source_url",
        "source_note",
        "evidence_level",
        "confidence_level",
        "ethical_risk_level",
        "sensitivity_level",
    }
    merged = admin_market_wisdom_entry(entry)
    for field in editable_fields:
        if field in payload:
            merged[field] = payload.get(field)
    for field in ("behaviour_tags", "context_tags", "audience_tags", "related_gsn_modules"):
        if field in payload:
            merged[field] = payload.get(field)

    validation = validate_market_wisdom_payload(db, merged, exclude_public_id=public_id)
    if not validation.get("ok"):
        raise ValueError(_safe_str(validation.get("reason")) or "Wisdom entry failed validation.")

    for field in editable_fields:
        if field in payload:
            setattr(entry, field, _safe_str(payload.get(field)) or None)
    for field, column in (
        ("behaviour_tags", "behaviour_tags_json"),
        ("context_tags", "context_tags_json"),
        ("audience_tags", "audience_tags_json"),
        ("related_gsn_modules", "related_gsn_modules_json"),
    ):
        if field in payload:
            setattr(entry, column, _json_list(payload.get(field)))

    if "status" in payload:
        status = _safe_str(payload.get("status"))
        if status not in MARKET_WISDOM_STATUSES:
            raise ValueError("Invalid Market Wisdom status.")
        entry.status = status
        entry.reviewed_at = _now()
        entry.reviewed_by = getattr(actor, "id", None)
        if status == "approved":
            entry.approved_at = _now()
        if status in {"rejected", "retired"}:
            entry.approved_at = None

    entry.originality_hash = _safe_str(validation.get("originality_hash"))
    entry.semantic_fingerprint = _safe_str(validation.get("semantic_fingerprint"))
    entry.validation_json = json.dumps(validation, ensure_ascii=True, sort_keys=True)
    entry.version = int(entry.version or 1) + 1
    entry.updated_at = _now()
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def recommend_market_wisdom(
    db: Session,
    *,
    user: Optional[User] = None,
    clan_id: Optional[int] = None,
    context: Optional[str] = None,
    signals: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    ensure_seed_market_wisdom(db)
    signal_terms = {_normalise_text(context)}
    for signal in signals or []:
        if _safe_str(signal):
            signal_terms.add(_normalise_text(signal))
    signal_terms = {term for term in signal_terms if term}

    cooldown_since = _now() - timedelta(days=7)
    exposed_ids: set[int] = set()
    if user is not None:
        rows = (
            db.query(MarketWisdomExposure.wisdom_entry_id)
            .filter(MarketWisdomExposure.user_id == getattr(user, "id", None))
            .filter(MarketWisdomExposure.shown_at >= cooldown_since)
            .all()
        )
        exposed_ids.update(int(row[0]) for row in rows if row[0])
    if clan_id:
        rows = (
            db.query(MarketWisdomExposure.wisdom_entry_id)
            .filter(MarketWisdomExposure.clan_id == int(clan_id))
            .filter(MarketWisdomExposure.shown_at >= cooldown_since)
            .all()
        )
        exposed_ids.update(int(row[0]) for row in rows if row[0])

    entries = (
        db.query(MarketWisdomEntry)
        .filter(MarketWisdomEntry.status == "approved")
        .filter(MarketWisdomEntry.language == "en")
        .all()
    )
    if not entries:
        return {"ok": True, "recommendation": get_daily_market_wisdom(db)}

    marketplace_request = any(
        term in {"marketplace", "market", "shop", "trade", "merchant", "demand", "spotlight"}
        for term in signal_terms
    )

    def score(entry: MarketWisdomEntry) -> int:
        value = 0
        behaviour_tags = _read_json_list(entry.behaviour_tags_json)
        context_tags = _read_json_list(entry.context_tags_json)
        related_modules = _read_json_list(entry.related_gsn_modules_json)
        exact_tags = {
            _normalise_text(item)
            for item in [*behaviour_tags, *context_tags, *related_modules]
            if _safe_str(item)
        }
        searchable = " ".join(
            [
                _safe_str(entry.category),
                _safe_str(entry.subcategory),
                " ".join(behaviour_tags),
                " ".join(context_tags),
                " ".join(related_modules),
                _safe_str(entry.title),
                _safe_str(entry.principle),
                _safe_str(entry.short_message),
                _safe_str(entry.explanation),
                _safe_str(entry.business_application),
                _safe_str(entry.community_application),
                _safe_str(entry.leadership_application),
                _safe_str(entry.action_prompt),
                _safe_str(entry.when_to_apply),
            ]
        ).lower()
        for term in signal_terms:
            for token in term.split():
                if len(token) > 2 and token in searchable:
                    value += 4
                if len(token) > 2 and token in exact_tags:
                    value += 10
        if marketplace_request:
            marketplace_markers = {
                "marketplace",
                "shop",
                "trade",
                "merchant",
                "buyer",
                "seller",
                "customer",
                "delivery",
                "demand",
                "spotlight",
                "marketing",
                "repost",
            }
            marketplace_overlap = {
                tag
                for tag in exact_tags
                for marker in marketplace_markers
                if marker in tag
            }
            category_text = _normalise_text(
                f"{entry.category} {entry.subcategory} {entry.title}"
            )
            if marketplace_overlap:
                value += 8 + (4 * min(len(marketplace_overlap), 4))
            if any(marker in category_text for marker in marketplace_markers):
                value += 8
        if entry.id in exposed_ids:
            value -= 20
        if _safe_str(entry.ethical_risk_level) == "low":
            value += 2
        return value

    ranked = sorted(entries, key=lambda item: (score(item), item.public_id), reverse=True)
    selected = ranked[0]
    why = "Selected from approved Market Wisdom entries."
    signal_basis = "inferred" if signal_terms else "general"
    if signal_terms:
        why = "Selected because the current context overlaps with approved behaviour and module tags."
    if selected.id in exposed_ids:
        why = "Selected as fallback after recent exposure cooldown reduced closer matches."

    return {
        "ok": True,
        "recommendation": public_market_wisdom_entry(selected, why_selected=why),
        "why_selected": why,
        "trigger_signal": sorted(signal_terms)[0] if signal_terms else "daily-general",
        "signal_basis": signal_basis,
        "confidence_level": selected.confidence_level,
        "recommended_next_action": selected.action_prompt,
        "policy": {
            "describes_behaviour_not_character": True,
            "no_social_scoring": True,
            "no_public_behavioural_surveillance": True,
            "cooldown_days": 7,
        },
    }


def record_market_wisdom_exposure(
    db: Session,
    *,
    public_id: str,
    action: str = "shown",
    user: Optional[User] = None,
    clan_id: Optional[int] = None,
    feedback: Optional[str] = None,
    outcome_signal: Optional[str] = None,
) -> Dict[str, Any]:
    ensure_seed_market_wisdom(db)
    entry = db.query(MarketWisdomEntry).filter(MarketWisdomEntry.public_id == public_id).first()
    if not entry:
        raise LookupError("Market Wisdom entry not found.")

    action_key = _safe_str(action) or "shown"
    timestamp_field = MARKET_WISDOM_EXPOSURE_ACTIONS.get(action_key)
    if not timestamp_field:
        raise ValueError("Invalid Market Wisdom exposure action.")

    exposure = MarketWisdomExposure(
        wisdom_entry_id=entry.id,
        user_id=getattr(user, "id", None),
        clan_id=int(clan_id) if clan_id else None,
        feedback=_safe_str(feedback) or None,
        outcome_signal=_safe_str(outcome_signal) or None,
    )
    setattr(exposure, timestamp_field, _now())
    db.add(exposure)
    db.commit()
    db.refresh(exposure)
    return {
        "ok": True,
        "exposure_id": exposure.id,
        "public_id": entry.public_id,
        "action": action_key,
        "feedback": exposure.feedback,
        "outcome_signal": exposure.outcome_signal,
    }
