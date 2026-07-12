import { buildWhatsAppChatUrl } from "./whatsappLinks";

export const GSN_SIGN_IN_SUPPORT_WHATSAPP_NUMBER = "+44 7903 165266";
export const GSN_SIGN_IN_SUPPORT_EMAIL = "support_gsn@GMFN-GSN.uk.co";

export const GSN_SIGN_IN_SUPPORT_MESSAGE =
  "Hello GSN support. I need help signing in. My GSN ID is: . Phone on account: . Community: . Error shown: .";

export function signInSupportWhatsAppUrl(): string {
  return buildWhatsAppChatUrl(
    GSN_SIGN_IN_SUPPORT_WHATSAPP_NUMBER,
    GSN_SIGN_IN_SUPPORT_MESSAGE
  );
}

export function signInSupportEmailUrl(): string {
  return `mailto:${GSN_SIGN_IN_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "GSN sign-in help"
  )}&body=${encodeURIComponent(
    `${GSN_SIGN_IN_SUPPORT_MESSAGE}\n\nPlease do not include your password in this message.`
  )}`;
}
