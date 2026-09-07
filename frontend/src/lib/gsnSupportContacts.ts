import { buildWhatsAppChatUrl } from "./whatsappLinks";

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

export const GSN_SIGN_IN_SUPPORT_WHATSAPP_NUMBER = "+44 7903 165266";
export const GSN_SIGN_IN_SUPPORT_EMAIL = "support_gsn@GMFN-GSN.uk.co";

export const GSN_SIGN_IN_SUPPORT_MESSAGE =
  "Hello GSN support. I need help signing in. My GSN ID is: . Phone on account: . Community: . Error shown: .";

export function buildSignInSupportMessage(details?: {
  gmfn_id?: string | null;
  phone_e164?: string | null;
  community?: string | null;
  error?: string | null;
}): string {
  if (!details) return GSN_SIGN_IN_SUPPORT_MESSAGE;

  const gsnId = cleanText(details.gmfn_id);
  const phone = cleanText(details.phone_e164);
  const community = cleanText(details.community);
  const error = cleanText(details.error);

  return [
    "Hello GSN support. I need help signing in.",
    `My GSN ID is: ${gsnId}.`,
    `Phone on account: ${phone}.`,
    `Community: ${community}.`,
    `Error shown: ${error}.`,
    "Please do not include or ask for any password.",
  ].join(" ");
}

export function signInSupportWhatsAppUrl(message = GSN_SIGN_IN_SUPPORT_MESSAGE): string {
  return buildWhatsAppChatUrl(
    GSN_SIGN_IN_SUPPORT_WHATSAPP_NUMBER,
    message
  );
}

export function signInSupportEmailUrl(message = GSN_SIGN_IN_SUPPORT_MESSAGE): string {
  return `mailto:${GSN_SIGN_IN_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "GSN sign-in help"
  )}&body=${encodeURIComponent(
    `${message}\n\nPlease do not include your password in this message.`
  )}`;
}
