import type {
  CSSProperties,
  Dispatch,
  ReactNode,
  SetStateAction,
  SyntheticEvent,
} from "react";
import type { Location, NavigateFunction } from "react-router-dom";
import type { GsnIconName } from "../../components/GsnLegacyIcon";

export type ShopControlNoticeTone = "success" | "error" | "info";
export type ShopControlSpotlightPriorityMode = "free" | "paid";
export type ShopControlSpotlightFlowStep = "setup" | "upload" | "preview";
export type ShopControlSpotlightMediaChoice = "image" | "video" | "both";

export type ShopControlSpotlightStepBadge = {
  key: ShopControlSpotlightFlowStep;
  label: string;
};

export type ShopControlSpotlightShop = {
  id: number;
  clan_id?: number | null;
  owner_user_id?: number | null;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  shop_product_slots_free?: number | null;
  shop_product_slots_extra?: number | null;
  shop_product_slots_total?: number | null;
};

export type ShopControlSpotlightBroadcast = {
  id: number;
  shop_id?: number | null;
  message?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  priority_mode?: string | null;
  visibility_scope?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export type ShopControlSpotlightFeedback = {
  tone: ShopControlNoticeTone;
  text: string;
} | null;

export type ShopControlSpotlightRoutes = {
  subscriptionSpotlight: string;
};

export type ShopControlSpotlightWorkflowProps = {
  isCompact: boolean;
  pageCard: (bg?: string) => CSSProperties;
  spotlightLaneIcon: GsnIconName;
  sectionLabel: () => CSSProperties;
  spotlightPortalTitle: string;
  helperText: () => CSSProperties;
  spotlightPortalSubtitle: string;
  spotlightStepBadges: ShopControlSpotlightStepBadge[];
  spotlightFlowStep: ShopControlSpotlightFlowStep;
  badge: (primary?: boolean) => CSSProperties;
  communityName: string;
  spotlightFeatureOff: boolean;
  noticeCard: (tone: ShopControlNoticeTone) => CSSProperties;
  spotlightFeatureOffText: string;
  marketplaceShopsFeatureOff: boolean;
  shop: ShopControlSpotlightShop | null;
  marketplaceShopsFeatureOffText: string;
  currentActiveSpotlight: ShopControlSpotlightBroadcast | null;
  firstTruthy: (...values: unknown[]) => string;
  spotlightPublishFeedback: ShopControlSpotlightFeedback;
  innerCard: (bg?: string) => CSSProperties;
  labelWithIcon: (
    name: GsnIconName,
    label: ReactNode,
    color?: string
  ) => ReactNode;
  shopName: string;
  setShopName: Dispatch<SetStateAction<string>>;
  inputStyle: () => CSSProperties;
  whatsApp: string;
  setWhatsApp: Dispatch<SetStateAction<string>>;
  telegramHandle: string;
  setTelegramHandle: Dispatch<SetStateAction<string>>;
  shopDescription: string;
  setShopDescription: Dispatch<SetStateAction<string>>;
  textAreaStyle: () => CSSProperties;
  controlGrid: (isCompact: boolean, minWidth?: number) => CSSProperties;
  ensureSpotlightShopRecord: () => Promise<ShopControlSpotlightShop | null>;
  creatingSpotlightShop: boolean;
  collapseSpotlightTools: (event?: SyntheticEvent<HTMLElement>) => void;
  controlIconTile: (
    name: GsnIconName,
    active?: boolean,
    size?: number
  ) => ReactNode;
  spotlightPriorityMode: ShopControlSpotlightPriorityMode;
  setSpotlightPriorityMode: Dispatch<SetStateAction<ShopControlSpotlightPriorityMode>>;
  navigate: NavigateFunction;
  routes: ShopControlSpotlightRoutes;
  location: Location;
  spotlightMediaChoice: ShopControlSpotlightMediaChoice;
  setSpotlightMediaChoice: Dispatch<SetStateAction<ShopControlSpotlightMediaChoice>>;
  inlineIcon: (name: GsnIconName, color?: string, size?: number) => ReactNode;
  spotlightProductName: string;
  setSpotlightProductName: Dispatch<SetStateAction<string>>;
  spotlightPriceNote: string;
  setSpotlightPriceNote: Dispatch<SetStateAction<string>>;
  spotlightMessage: string;
  setSpotlightMessage: Dispatch<SetStateAction<string>>;
  preparingSpotlightImage: boolean;
  creatingSpotlight: boolean;
  showNotice: (tone: ShopControlNoticeTone, text: string) => void;
  spotlightImageInputKey: number;
  handleSpotlightImagePicked: (file: File | null) => Promise<void>;
  spotlightImageFile: File | null;
  formatFileSize: (bytes: number) => string;
  preparingSpotlightVideo: boolean;
  spotlightVideoInputKey: number;
  handleSpotlightVideoPicked: (file: File | null) => Promise<void>;
  spotlightVideoFile: File | null;
  spotlightVideoDurationSeconds: number | null;
  spotlightCanContinueToPreview: boolean;
  setSpotlightFlowStep: Dispatch<SetStateAction<ShopControlSpotlightFlowStep>>;
  spotlightImagePreviewUrl: string;
  spotlightVideoPreviewUrl: string;
  spotlightPilotMaxVideoSeconds: number;
  spotlightPreviewMessage: string;
  spotlightPreviewHasPicture: boolean;
  spotlightPreviewHasVideo: boolean;
  handleCreateSpotlight: () => Promise<void>;
  shopActionsLocked: boolean;
};