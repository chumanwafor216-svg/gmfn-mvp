export type ActionResponseTone = "success" | "error" | "info";

export type ActionResponse = {
  tone: ActionResponseTone;
  text: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export function buildActionBlockedMessage(args: {
  actionLabel: string;
  missing?: Array<string | null | undefined | false>;
  firstStep?: string;
  retryStep?: string;
  fallback?: string;
}): string {
  const actionLabel = clean(args.actionLabel) || "This action";
  const missing = (args.missing || []).map(clean).filter(Boolean);

  if (!missing.length) {
    return (
      clean(args.fallback) ||
      `${actionLabel} cannot continue yet. Check the last step, then try again.`
    );
  }

  const missingText = missing.join(", ");
  const firstStep = clean(args.firstStep);
  const retryStep = clean(args.retryStep);

  if (firstStep) {
    return `${actionLabel} is not ready yet. First ${firstStep}. Still needed: ${missingText}.`;
  }

  if (retryStep) {
    return `${actionLabel} is not ready yet. GSN still needs: ${missingText}. ${retryStep}`;
  }

  return `${actionLabel} is not ready yet. GSN still needs: ${missingText}.`;
}

export function buildActionSuccessMessage(args: {
  prefix?: string;
  message?: string;
  nextStep?: string;
}): string {
  const prefix = clean(args.prefix) || "Done.";
  const message = clean(args.message);
  const nextStep = clean(args.nextStep);

  return [prefix, message, nextStep].filter(Boolean).join(" ");
}
