from __future__ import annotations

import os
from io import BytesIO
from html import escape
from textwrap import wrap
from typing import Any, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, Response
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from sqlalchemy.orm import Session

from app.db.models import MarketplaceProduct, MarketplaceShop, User
from app.deps import get_db

router = APIRouter(prefix="/share", tags=["share-preview"])

PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com"
PUBLIC_API_ORIGIN = "https://gmfn-api.onrender.com"
PUBLIC_VISIBILITY_MODES = ("community_visible", "public", "community")
CARD_WIDTH = 1200
CARD_HEIGHT = 630


def _safe_str(value: Any, default: str = "") -> str:
    text = str(value if value is not None else default).strip()
    return text or default


def _trim_origin(raw: str) -> str:
    return _safe_str(raw).rstrip("/")


def _is_private_host(host: str) -> bool:
    clean = _safe_str(host).lower()
    if clean in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        return True
    if clean.startswith("192.168.") or clean.startswith("10."):
        return True
    parts = clean.split(".")
    if len(parts) >= 2 and parts[0] == "172":
        try:
            second = int(parts[1])
        except ValueError:
            return False
        return 16 <= second <= 31
    return False


def _public_origin_from_env(keys: tuple[str, ...], fallback: str) -> str:
    for key in keys:
        raw = _trim_origin(os.getenv(key, ""))
        if not raw:
            continue
        try:
            from urllib.parse import urlparse

            parsed = urlparse(raw)
            if parsed.scheme not in {"http", "https"}:
                continue
            if _is_private_host(parsed.hostname or ""):
                continue
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
        except Exception:
            continue
    return fallback


def _public_frontend_origin() -> str:
    return _public_origin_from_env(
        ("FRONTEND_BASE_URL", "GMFN_FRONTEND_BASE_URL", "PUBLIC_FRONTEND_URL"),
        PUBLIC_FRONTEND_ORIGIN,
    )


def _public_api_origin(request: Request) -> str:
    configured = _public_origin_from_env(
        ("GMFN_API_BASE_URL", "PUBLIC_API_URL", "API_BASE_URL"),
        "",
    )
    if configured:
        return configured

    try:
        host = request.url.hostname or ""
        if not _is_private_host(host):
            return str(request.base_url).rstrip("/")
    except Exception:
        pass

    return PUBLIC_API_ORIGIN


def _identity_candidates(identity_key: str) -> list[str]:
    raw = _safe_str(identity_key).upper()
    if not raw:
        return []

    candidates = [raw]
    if raw.startswith("GSN-U-"):
        candidates.append(f"GMFN-U-{raw[6:]}")
    elif raw.startswith("GMFN-U-"):
        candidates.append(f"GSN-U-{raw[7:]}")

    deduped: list[str] = []
    for item in candidates:
        if item and item not in deduped:
            deduped.append(item)
    return deduped


def _get_share_owner(db: Session, gmfn_id: str) -> Optional[User]:
    candidates = _identity_candidates(gmfn_id)
    if not candidates:
        return None
    return (
        db.query(User)
        .filter(User.gmfn_id.in_(candidates))
        .order_by(User.id.asc())
        .first()
    )


def _get_share_shop(db: Session, owner: User) -> Optional[MarketplaceShop]:
    return (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.owner_user_id == int(owner.id))
        .filter(MarketplaceShop.is_active.is_(True))
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .first()
    )


def _get_share_product(
    db: Session,
    *,
    owner: User,
    product_id: Optional[int],
) -> Optional[MarketplaceProduct]:
    if not product_id:
        return None
    return (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .filter(MarketplaceProduct.seller_user_id == int(owner.id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode.in_(PUBLIC_VISIBILITY_MODES))
        .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
        .first()
    )


def _shop_frontend_url(
    gmfn_id: str,
    *,
    product_id: Optional[int] = None,
    block: Optional[int] = None,
) -> str:
    base = _public_frontend_origin()
    path = f"/shop/{quote(_safe_str(gmfn_id), safe='')}"
    if product_id:
        path += f"?product_id={quote(str(product_id), safe='')}"
    if block:
        path += f"#shop-block-{int(block)}"
    elif product_id:
        path += f"#product-{quote(str(product_id), safe='')}"
    else:
        path += "#shop-diaries"
    return f"{base}{path}"


def _vault_request_frontend_url(gmfn_id: str) -> str:
    base = _public_frontend_origin()
    path = f"/shop/{quote(_safe_str(gmfn_id), safe='')}#private-vault"
    return f"{base}{path}"


def _share_card_url(
    request: Request,
    gmfn_id: str,
    *,
    product_id: Optional[int] = None,
    block: Optional[int] = None,
) -> str:
    base = _public_api_origin(request)
    path = f"/share/shop/{quote(_safe_str(gmfn_id), safe='')}/card.png"
    query: list[str] = []
    if product_id:
        query.append(f"product_id={quote(str(product_id), safe='')}")
    if block:
        query.append(f"block={quote(str(block), safe='')}")
    return f"{base}{path}{'?' + '&'.join(query) if query else ''}"


def _vault_request_card_url(request: Request, gmfn_id: str) -> str:
    base = _public_api_origin(request)
    path = f"/share/vault-request/{quote(_safe_str(gmfn_id), safe='')}/card.png"
    return f"{base}{path}"


def _share_page_url(
    request: Request,
    gmfn_id: str,
    *,
    product_id: Optional[int] = None,
    block: Optional[int] = None,
) -> str:
    base = _public_api_origin(request)
    path = f"/share/shop/{quote(_safe_str(gmfn_id), safe='')}"
    query: list[str] = []
    if product_id:
        query.append(f"product_id={quote(str(product_id), safe='')}")
    if block:
        query.append(f"block={quote(str(block), safe='')}")
    return f"{base}{path}{'?' + '&'.join(query) if query else ''}"


def _vault_request_page_url(request: Request, gmfn_id: str) -> str:
    base = _public_api_origin(request)
    path = f"/share/vault-request/{quote(_safe_str(gmfn_id), safe='')}"
    return f"{base}{path}"


def _money_text(product: Optional[MarketplaceProduct]) -> str:
    if product is None:
        return ""
    amount = _safe_str(getattr(product, "price", ""))
    currency = _safe_str(getattr(product, "currency", "NGN"), "NGN")
    if not amount:
        return "Price on request"

    unit = currency.upper()
    if unit in {"GBP", "GDP", "POUND", "POUNDS"}:
        return f"GBP {amount}"
    if unit in {"USD", "$"}:
        return f"USD {amount}"
    if unit in {"EUR"}:
        return f"EUR {amount}"
    if unit in {"NGN"}:
        return f"NGN {amount}"
    return f"{amount} {unit}".strip()


def _preview_payload(
    db: Session,
    *,
    gmfn_id: str,
    product_id: Optional[int],
) -> dict[str, str]:
    owner = _get_share_owner(db, gmfn_id)
    shop = _get_share_shop(db, owner) if owner else None
    product = _get_share_product(db, owner=owner, product_id=product_id) if owner else None

    owner_id = _safe_str(getattr(owner, "gmfn_id", None), _safe_str(gmfn_id).upper())
    shop_name = _safe_str(getattr(shop, "name", None), "GSN public shop")
    owner_name = _safe_str(getattr(owner, "display_name", None), "GSN member")
    shop_description = _safe_str(
        getattr(shop, "description", None),
        "Open this public shop on GSN.",
    )
    product_title = _safe_str(getattr(product, "name", None))
    product_description = _safe_str(getattr(product, "description", None))
    product_line = product_title or product_description or "Public shop diary"

    title = (
        f"{product_line} | {shop_name}"
        if product is not None
        else f"{shop_name} | GSN public shop"
    )
    description = (
        "GSN public shop item. Tap to open product."
        if product is not None
        else "GSN public shop. Tap to open shop."
    )

    return {
        "gmfn_id": owner_id,
        "owner_name": owner_name,
        "shop_name": shop_name,
        "product_line": product_line,
        "trust_line": "Public shop record - Tap to open",
        "title": title,
        "description": description,
        "price": _money_text(product),
    }


def _vault_request_payload(db: Session, *, gmfn_id: str) -> dict[str, str]:
    payload = _preview_payload(db, gmfn_id=gmfn_id, product_id=None)
    shop_name = payload["shop_name"]
    payload.update(
        {
            "product_line": "Private Vault request",
            "trust_line": "Owner-issued private link only",
            "title": f"{shop_name} | GSN Private Vault",
            "description": "Request owner-issued access to selected private Vault offers.",
            "price": "",
        }
    )
    return payload


def _svg_text_lines(text: str, *, max_chars: int, max_lines: int) -> list[str]:
    clean = " ".join(_safe_str(text).split())
    lines = wrap(clean, width=max_chars, break_long_words=False, break_on_hyphens=False)
    if len(lines) <= max_lines:
        return lines or [""]
    return [*lines[: max_lines - 1], f"{lines[max_lines - 1].rstrip()}..."]


def _font(size: int, *, bold: bool = False) -> ImageFont.ImageFont:
    names = (
        ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf")
        if bold
        else ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf")
    )
    roots = (
        "",
        "C:/Windows/Fonts/",
        "/usr/share/fonts/truetype/dejavu/",
        "/usr/share/fonts/truetype/liberation2/",
        "/usr/share/fonts/truetype/msttcorefonts/",
    )
    for root in roots:
        for name in names:
            try:
                return ImageFont.truetype(f"{root}{name}", size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> float:
    try:
        return float(draw.textlength(text, font=font))
    except Exception:
        return float(draw.textbbox((0, 0), text, font=font)[2])


def _png_text_lines(
    text: str,
    *,
    draw: ImageDraw.ImageDraw,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    clean = " ".join(_safe_str(text).split())
    if not clean:
        return [""]

    lines: list[str] = []
    current = ""
    for word in clean.split(" "):
        candidate = f"{current} {word}".strip()
        if not current or _text_width(draw, candidate, font) <= max_width:
            current = candidate
            continue
        lines.append(current)
        current = word
        if len(lines) >= max_lines:
            break

    if len(lines) < max_lines and current:
        lines.append(current)

    if len(lines) > max_lines:
        lines = lines[:max_lines]

    if _text_width(draw, lines[-1], font) > max_width:
        line = lines[-1]
        while line and _text_width(draw, f"{line}...", font) > max_width:
            line = line[:-1].rstrip()
        lines[-1] = f"{line}..." if line else "..."
    elif len(clean.split(" ")) > len(" ".join(lines).split(" ")):
        line = lines[-1]
        while line and _text_width(draw, f"{line}...", font) > max_width:
            line = line[:-1].rstrip()
        lines[-1] = f"{line}..." if line else "..."

    return lines or [""]


def _draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    *,
    x: int,
    y: int,
    font: ImageFont.ImageFont,
    fill: str,
    gap: int,
) -> int:
    current_y = y
    for line in lines:
        draw.text((x, current_y), line, font=font, fill=fill)
        bbox = draw.textbbox((x, current_y), line or "Ag", font=font)
        current_y += max(1, bbox[3] - bbox[1]) + gap
    return current_y


def _gradient_card(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, "#061827")
    pixels = image.load()
    for y in range(height):
        ratio = y / max(1, height - 1)
        r = int(6 + ratio * 5)
        g = int(24 + ratio * 21)
        b = int(39 + ratio * 35)
        for x in range(width):
            pixels[x, y] = (r, g, b, 255)
    return image


def _draw_share_card_png(
    payload: dict[str, str],
    *,
    target_url: str,
    block: Optional[int],
    eyebrow: str = "PUBLIC SHOP",
    block_label_override: str = "",
) -> bytes:
    image = Image.new("RGBA", (CARD_WIDTH, CARD_HEIGHT), "#F7FAFF")
    draw = ImageDraw.Draw(image)

    shadow = Image.new("RGBA", (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((48, 56, 1152, 598), radius=42, fill=(0, 0, 0, 78))
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    card_box = (44, 42, 1156, 588)
    card = _gradient_card((card_box[2] - card_box[0], card_box[3] - card_box[1]))
    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card.size[0], card.size[1]), radius=42, fill=255)
    image.paste(card, card_box[:2], mask)
    draw = ImageDraw.Draw(image)

    # Subtle institutional watermark pattern: shield outlines stay quiet behind content.
    for x, y, scale in ((824, 146, 0.86), (930, 396, 1.12), (654, 462, 0.68)):
        w = int(118 * scale)
        h = int(142 * scale)
        points = [
            (x, y),
            (x + w, y + int(44 * scale)),
            (x + w, y + int(90 * scale)),
            (x + int(82 * scale), y + h),
            (x + int(36 * scale), y + h),
            (x, y + int(90 * scale)),
        ]
        draw.line([*points, points[0]], fill=(255, 255, 255, 6), width=max(2, int(3 * scale)))

    draw.rounded_rectangle((94, 82, 246, 138), radius=28, fill="#F7FAFF")

    font_label = _font(20, bold=True)
    font_badge = _font(25, bold=True)
    font_trusted = _font(24, bold=True)
    font_price = _font(32, bold=True)
    font_title = _font(60, bold=True)
    font_market = _font(36, bold=True)
    font_trust = _font(27, bold=True)
    font_chip = _font(24, bold=True)
    font_cta = _font(28, bold=True)

    draw.text((130, 100), "GSN", font=font_badge, fill="#D6AA45")
    draw.text((272, 100), eyebrow, font=font_trusted, fill="#F7FAFF")

    price = payload["price"]
    if price:
        draw.rounded_rectangle((918, 82, 1096, 144), radius=31, fill="#F2C766")
        price_width = _text_width(draw, price, font_price)
        draw.text((918 + (178 - price_width) / 2, 96), price, font=font_price, fill="#07172C")

    product_lines = _png_text_lines(
        payload["product_line"],
        draw=draw,
        font=font_title,
        max_width=690,
        max_lines=2,
    )
    after_title = _draw_lines(draw, product_lines, x=96, y=186, font=font_title, fill="#FFFFFF", gap=8)

    market_lines = _png_text_lines(
        payload["shop_name"],
        draw=draw,
        font=font_market,
        max_width=680,
        max_lines=2,
    )
    after_market = _draw_lines(draw, market_lines, x=100, y=after_title + 10, font=font_market, fill="#D8E7F5", gap=5)

    trust_lines = _png_text_lines(
        payload.get("trust_line", "Public shop record - Tap to open"),
        draw=draw,
        font=font_trust,
        max_width=680,
        max_lines=1,
    )
    _draw_lines(draw, trust_lines, x=100, y=after_market + 20, font=font_trust, fill="#F2CF77", gap=0)

    cta_center = (936, 326)
    draw.ellipse((882, 272, 990, 380), fill="#D6AA45")
    draw.line((916, 326, 954, 326), fill="#07172C", width=9)
    draw.line((940, 310, 960, 326, 940, 342), fill="#07172C", width=9, joint="curve")
    draw.ellipse((914, 298, 926, 310), fill="#07172C")
    draw.line((920, 310, 920, 348), fill="#07172C", width=7)
    cta_text = "TAP TO OPEN"
    cta_width = _text_width(draw, cta_text, font_cta)
    draw.text((cta_center[0] - cta_width / 2, 410), cta_text, font=font_cta, fill="#FFFFFF")

    block_label = block_label_override or (f"Block {int(block)}" if block else "Public shop")
    chip_y = 502
    block_width = int(_text_width(draw, block_label, font_chip)) + 62
    block_right = 94 + max(146, block_width)
    draw.rounded_rectangle((94, chip_y, block_right, chip_y + 56), radius=28, fill="#F7FAFF")
    draw.text((124, chip_y + 15), block_label, font=font_chip, fill="#07172C")
    gmfn_text = payload["gmfn_id"]
    gmfn_width = int(_text_width(draw, gmfn_text, font_chip))
    gmfn_left = block_right + 26
    draw.rounded_rectangle((gmfn_left, chip_y, gmfn_left + 60 + gmfn_width, chip_y + 56), radius=28, fill="#0B2D4A", outline="#D6AA45", width=2)
    draw.text((gmfn_left + 30, chip_y + 15), gmfn_text, font=font_chip, fill="#F2CF77")

    out = BytesIO()
    image.convert("RGB").save(out, format="PNG", optimize=True)
    return out.getvalue()


@router.get("/vault-request/{gmfn_id}", response_class=HTMLResponse)
def public_vault_request_share_preview(
    gmfn_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> HTMLResponse:
    payload = _vault_request_payload(db, gmfn_id=gmfn_id)
    target_url = _vault_request_frontend_url(payload["gmfn_id"])
    share_url = _vault_request_page_url(request, payload["gmfn_id"])
    image_url = _vault_request_card_url(request, payload["gmfn_id"])
    title = escape(payload["title"])
    description = escape(payload["description"])
    target = escape(target_url, quote=True)

    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content="{description}" />
    <link rel="canonical" href="{escape(share_url, quote=True)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Global Support Network" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:url" content="{escape(share_url, quote=True)}" />
    <meta property="og:image" content="{escape(image_url, quote=True)}" />
    <meta property="og:image:secure_url" content="{escape(image_url, quote=True)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="GSN Private Vault request poster" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{description}" />
    <meta name="twitter:image" content="{escape(image_url, quote=True)}" />
    <meta http-equiv="refresh" content="1;url={target}" />
    <style>
      body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; background: #061827; color: #fff; font-family: Arial, sans-serif; }}
      main {{ max-width: 620px; margin: 24px; padding: 28px; border-radius: 28px; background: #fff; color: #07172C; }}
      a {{ color: #0B4EA2; font-weight: 800; }}
    </style>
  </head>
  <body>
    <main>
      <p>Opening the GSN Private Vault request...</p>
      <p><a href="{target}">Open Vault request now</a></p>
    </main>
  </body>
</html>"""
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/vault-request/{gmfn_id}/card.png")
def public_vault_request_share_card_png(
    gmfn_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Response:
    payload = _vault_request_payload(db, gmfn_id=gmfn_id)
    target_url = _vault_request_frontend_url(payload["gmfn_id"])
    png = _draw_share_card_png(
        payload,
        target_url=target_url,
        block=None,
        eyebrow="PRIVATE VAULT",
        block_label_override="Vault request",
    )
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/shop/{gmfn_id}", response_class=HTMLResponse)
def public_shop_share_preview(
    gmfn_id: str,
    request: Request,
    product_id: Optional[int] = Query(default=None),
    block: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    payload = _preview_payload(db, gmfn_id=gmfn_id, product_id=product_id)
    target_url = _shop_frontend_url(payload["gmfn_id"], product_id=product_id, block=block)
    share_url = _share_page_url(request, payload["gmfn_id"], product_id=product_id, block=block)
    image_url = _share_card_url(request, payload["gmfn_id"], product_id=product_id, block=block)
    title = escape(payload["title"])
    description = escape(payload["description"])
    target = escape(target_url, quote=True)

    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content="{description}" />
    <link rel="canonical" href="{escape(share_url, quote=True)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Global Support Network" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:url" content="{escape(share_url, quote=True)}" />
    <meta property="og:image" content="{escape(image_url, quote=True)}" />
    <meta property="og:image:secure_url" content="{escape(image_url, quote=True)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="GSN public shop poster" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{description}" />
    <meta name="twitter:image" content="{escape(image_url, quote=True)}" />
    <meta http-equiv="refresh" content="1;url={target}" />
    <style>
      body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; background: #061827; color: #fff; font-family: Arial, sans-serif; }}
      main {{ max-width: 620px; margin: 24px; padding: 28px; border-radius: 28px; background: #fff; color: #07172C; }}
      a {{ color: #0B4EA2; font-weight: 800; }}
    </style>
  </head>
  <body>
    <main>
      <p>Opening the GSN public shop...</p>
      <p><a href="{target}">Open shop now</a></p>
    </main>
  </body>
</html>"""
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/shop/{gmfn_id}/card.png")
def public_shop_share_card_png(
    gmfn_id: str,
    request: Request,
    product_id: Optional[int] = Query(default=None),
    block: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> Response:
    payload = _preview_payload(db, gmfn_id=gmfn_id, product_id=product_id)
    target_url = _shop_frontend_url(payload["gmfn_id"], product_id=product_id, block=block)
    png = _draw_share_card_png(payload, target_url=target_url, block=block)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/shop/{gmfn_id}/card.svg")
def public_shop_share_card(
    gmfn_id: str,
    request: Request,
    product_id: Optional[int] = Query(default=None),
    block: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> Response:
    payload = _preview_payload(db, gmfn_id=gmfn_id, product_id=product_id)
    title_lines = _svg_text_lines(payload["shop_name"], max_chars=26, max_lines=2)
    product_lines = _svg_text_lines(payload["product_line"], max_chars=34, max_lines=2)
    desc_lines = _svg_text_lines(payload["description"], max_chars=58, max_lines=3)
    price = payload["price"]
    block_label = f"Block {int(block)}" if block else "Public shop"

    def tspans(lines: list[str], *, x: int, y: int, size: int, color: str, weight: int = 800, gap: int = 1) -> str:
        out = []
        for index, line in enumerate(lines):
            out.append(
                f'<text x="{x}" y="{y + index * int(size * (1.15 + gap * 0.02))}" '
                f'fill="{color}" font-size="{size}" font-weight="{weight}" '
                f'font-family="Arial, sans-serif">{escape(line)}</text>'
            )
        return "\n".join(out)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#061827"/>
      <stop offset="58%" stop-color="#08233A"/>
      <stop offset="100%" stop-color="#0B2D4A"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFE28A"/>
      <stop offset="65%" stop-color="#D6AA45"/>
      <stop offset="100%" stop-color="#B78321"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#F7FAFF"/>
  <rect x="42" y="42" width="1116" height="546" rx="42" fill="url(#bg)" filter="url(#shadow)"/>
  <circle cx="992" cy="130" r="120" fill="#FFFFFF" opacity="0.05"/>
  <circle cx="1044" cy="500" r="156" fill="#D6AA45" opacity="0.08"/>
  <rect x="94" y="88" width="168" height="62" rx="31" fill="#FFFFFF" opacity="0.10"/>
  <text x="130" y="129" fill="#F2CF77" font-size="26" font-weight="950" font-family="Arial, sans-serif">GSN</text>
  <text x="284" y="127" fill="#D8E7F5" font-size="20" font-weight="900" letter-spacing="4" font-family="Arial, sans-serif">GLOBAL SUPPORT NETWORK</text>
  <rect x="94" y="178" width="90" height="90" rx="26" fill="#FFFFFF" opacity="0.10" stroke="#D6AA45" stroke-opacity="0.55" stroke-width="3"/>
  <path d="M139 205 L166 217 V236 C166 253 154 265 139 270 C124 265 112 253 112 236 V217 Z" fill="none" stroke="#F2CF77" stroke-width="7" stroke-linejoin="round"/>
  <path d="M126 238 L136 248 L154 225" fill="none" stroke="#F2CF77" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  {tspans(title_lines, x=214, y=218, size=48, color="#FFFFFF", weight=950)}
  <text x="94" y="326" fill="#F2CF77" font-size="22" font-weight="950" letter-spacing="3" font-family="Arial, sans-serif">{escape(block_label.upper())}</text>
  {tspans(product_lines, x=94, y=382, size=34, color="#FFFFFF", weight=950)}
  {tspans(desc_lines, x=94, y=450, size=23, color="#D8E7F5", weight=750)}
  <rect x="94" y="512" width="146" height="56" rx="28" fill="#FFFFFF"/>
  <text x="124" y="548" fill="#07172C" font-size="22" font-weight="950" font-family="Arial, sans-serif">{escape(block_label)}</text>
  <rect x="266" y="512" width="266" height="56" rx="28" fill="#0B2D4A" stroke="#D6AA45" stroke-width="2"/>
  <text x="296" y="548" fill="#F2CF77" font-size="22" font-weight="950" font-family="Arial, sans-serif">{escape(payload["gmfn_id"])}</text>
  <circle cx="954" cy="400" r="62" fill="url(#gold)"/>
  <text x="860" y="510" fill="#FFFFFF" font-size="30" font-weight="950" font-family="Arial, sans-serif">TAP TO OPEN</text>
  {f'<rect x="910" y="305" width="196" height="76" rx="38" fill="url(#gold)"/>' if price else ''}
  {f'<text x="934" y="356" fill="#07172C" font-size="24" font-weight="950" font-family="Arial, sans-serif">{escape(price)}</text>' if price else ''}
</svg>"""

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=300"},
    )
