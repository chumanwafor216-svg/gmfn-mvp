import React from "react";
import { Link, type LinkProps, useLocation } from "react-router-dom";
import { brandStableTapTarget, stopActionTap } from "../styles/gmfnBrand";

type OriginLinkProps = Omit<LinkProps, "to"> & {
  to: string;
  preserveSearch?: boolean;
  preserveHash?: boolean;
};

function isExternalTarget(to: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(String(to || "").trim());
}

function mergeTarget(
  to: string,
  pathname: string,
  search: string,
  hash: string,
  preserveSearch: boolean,
  preserveHash: boolean
): string {
  const raw = String(to || "").trim();

  if (!raw) return pathname || "/";
  if (isExternalTarget(raw)) return raw;

  if (raw.startsWith("#")) {
    return `${pathname}${preserveSearch ? search : ""}${raw}`;
  }

  if (raw.startsWith("?")) {
    return `${pathname}${raw}${preserveHash ? hash : ""}`;
  }

  const hasOwnSearch = raw.includes("?");
  const hasOwnHash = raw.includes("#");

  let next = raw;

  if (preserveSearch && !hasOwnSearch && search) {
    next += search;
  }

  if (preserveHash && !hasOwnHash && hash) {
    next += hash;
  }

  return next;
}

function guardLinkTap(
  event: React.SyntheticEvent,
  handler?: (event: any) => void
) {
  stopActionTap(event);
  if (typeof handler === "function") {
    handler(event);
  }
}

export default function OriginLink(props: OriginLinkProps) {
  const {
    to,
    preserveSearch = false,
    preserveHash = false,
    state,
    children,
    ...rest
  } = props;

  const location = useLocation();
  const rawTo = String(to || "").trim();
  const baseStableStyle: React.CSSProperties = {
    ...brandStableTapTarget(),
  };
  const stableStyle =
    rest.style && typeof rest.style === "object"
      ? ({
          ...baseStableStyle,
          ...rest.style,
        } as React.CSSProperties)
      : baseStableStyle;

  if (isExternalTarget(rawTo)) {
    return (
      <a
        href={rawTo}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        style={stableStyle}
        onPointerDown={(event) => guardLinkTap(event, rest.onPointerDown)}
        onMouseDown={(event) => guardLinkTap(event, rest.onMouseDown)}
        onClick={(event) => guardLinkTap(event, rest.onClick)}
      >
        {children}
      </a>
    );
  }

  const nextTo = mergeTarget(
    rawTo,
    location.pathname,
    location.search,
    location.hash,
    preserveSearch,
    preserveHash
  );

  const nextState =
    state && typeof state === "object"
      ? {
          ...(state as Record<string, unknown>),
          originPath: `${location.pathname}${location.search}${location.hash}`,
        }
      : {
          originPath: `${location.pathname}${location.search}${location.hash}`,
        };

  return (
    <Link
      {...rest}
      to={nextTo}
      state={nextState}
      style={stableStyle}
      onPointerDown={(event) => guardLinkTap(event, rest.onPointerDown)}
      onMouseDown={(event) => guardLinkTap(event, rest.onMouseDown)}
      onClick={(event) => guardLinkTap(event, rest.onClick)}
    >
      {children}
    </Link>
  );
}
