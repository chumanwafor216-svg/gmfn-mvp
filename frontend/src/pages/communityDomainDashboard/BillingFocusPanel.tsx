import React, { lazy, Suspense, useMemo } from "react";
import type {
  BillingAccountTaskKey,
  BillingPaymentGroupKey,
  BillingPaymentGroupOption,
  BillingPaymentTaskKey,
  BillingTaskKey,
  BillingTaskOption,
  BillingTaskPanelsData,
} from "./BillingTaskPanelsTypes";

const CommunityDomainBillingReadinessPanels = lazy(
  () => import("./BillingReadinessPanels")
);
const CommunityDomainBillingTaskPanels = lazy(() => import("./BillingTaskPanels"));

type BillingReadinessPanelProps = React.ComponentProps<
  typeof CommunityDomainBillingReadinessPanels
>;

export const BILLING_PAYMENT_TASK_OPTIONS: Array<
  BillingTaskOption<BillingPaymentTaskKey>
> = [
  {
    key: "reference",
    label: "Reference",
    note: "Review the current payment reference before creating a new code.",
  },
  {
    key: "generate",
    label: "Generate code",
    note: "Create the domain payment instruction only when the payer is ready.",
  },
  {
    key: "credit_link",
    label: "Credit link",
    note: "Match the payment code to the official GSN community.",
  },
  {
    key: "pay_account",
    label: "Pay account",
    note: "Check the official GSN account before money leaves the payer.",
  },
  {
    key: "proof",
    label: "Proof",
    note: "Upload payment proof after the bank or provider step is complete.",
  },
];

export const BILLING_TASK_OPTIONS: Array<BillingTaskOption<BillingTaskKey>> = [
  {
    key: "payment_code",
    label: "Code & proof",
    note: "Generate or review one payment code, then handle proof after payment.",
  },
  {
    key: "account",
    label: "Pay-in account",
    note: "Review the official account before anyone sends money.",
  },
  {
    key: "steps",
    label: "Steps",
    note: "Read the payment sequence without opening account or proof tools.",
  },
  {
    key: "readiness",
    label: "Readiness",
    note: "Use this only when billing needs investigation.",
  },
];

export const BILLING_PAYMENT_GROUP_OPTIONS: BillingPaymentGroupOption[] = [
  {
    key: "code",
    label: "Code",
    note: "Reference review and code generation.",
    defaultTask: "reference",
    taskKeys: ["reference", "generate"],
  },
  {
    key: "settlement",
    label: "Settlement",
    note: "Credit identity and official pay account.",
    defaultTask: "credit_link",
    taskKeys: ["credit_link", "pay_account"],
  },
  {
    key: "proof",
    label: "Proof",
    note: "Payment proof upload and review.",
    defaultTask: "proof",
    taskKeys: ["proof"],
  },
];

export const BILLING_ACCOUNT_TASK_OPTIONS: Array<
  BillingTaskOption<BillingAccountTaskKey>
> = [
  {
    key: "summary",
    label: "Summary",
    note: "Review the saved pay-in account before anyone sends money.",
  },
  {
    key: "setup",
    label: "Setup",
    note: "Open account setup only for the GSN platform admin editing step.",
  },
];

type ComputedBillingTaskPanelKey =
  | "activeBillingAccountTaskOption"
  | "activeBillingPaymentGroup"
  | "activeBillingPaymentGroupOption"
  | "activeBillingPaymentGroupTasks"
  | "activeBillingPaymentTaskOption"
  | "activeBillingTaskOption"
  | "BILLING_ACCOUNT_TASK_OPTIONS"
  | "BILLING_PAYMENT_GROUP_OPTIONS"
  | "BILLING_TASK_OPTIONS"
  | "subscriptionStatusMode";

type BillingFocusPanelData = Omit<BillingTaskPanelsData, ComputedBillingTaskPanelKey> &
  BillingReadinessPanelProps;

type BillingFocusPanelProps = {
  data: BillingFocusPanelData;
};

export default function BillingFocusPanel({ data }: BillingFocusPanelProps) {
  const activeBillingTaskOption =
    BILLING_TASK_OPTIONS.find((task) => task.key === data.activeBillingTask) ||
    BILLING_TASK_OPTIONS[0];
  const activeBillingAccountTaskOption =
    BILLING_ACCOUNT_TASK_OPTIONS.find(
      (task) => task.key === data.activeBillingAccountTask
    ) || BILLING_ACCOUNT_TASK_OPTIONS[0];
  const activeBillingPaymentGroup = useMemo<BillingPaymentGroupKey>(() => {
    if (data.activeBillingPaymentTask === "proof") {
      return "proof";
    }
    if (
      data.activeBillingPaymentTask === "credit_link" ||
      data.activeBillingPaymentTask === "pay_account"
    ) {
      return "settlement";
    }
    return "code";
  }, [data.activeBillingPaymentTask]);
  const activeBillingPaymentGroupOption =
    BILLING_PAYMENT_GROUP_OPTIONS.find(
      (group) => group.key === activeBillingPaymentGroup
    ) || BILLING_PAYMENT_GROUP_OPTIONS[0];
  const activeBillingPaymentTaskOption =
    BILLING_PAYMENT_TASK_OPTIONS.find(
      (task) => task.key === data.activeBillingPaymentTask
    ) || BILLING_PAYMENT_TASK_OPTIONS[0];
  const activeBillingPaymentGroupTasks = BILLING_PAYMENT_TASK_OPTIONS.filter((task) =>
    activeBillingPaymentGroupOption.taskKeys.includes(task.key)
  );
  const subscriptionStatusMode = data.activeBillingTask === "readiness";

  return (
    <>
      <Suspense
        fallback={
          <div style={{ ...data.softCard(), display: "grid", gap: 8 }}>
            <div style={data.sectionLabel()}>Billing</div>
            <div style={{ ...data.helperText(), marginTop: 2 }}>
              Loading billing job controls...
            </div>
          </div>
        }
      >
        <CommunityDomainBillingTaskPanels
          data={{
            ...data,
            activeBillingAccountTaskOption,
            activeBillingPaymentGroup,
            activeBillingPaymentGroupOption,
            activeBillingPaymentGroupTasks,
            activeBillingPaymentTaskOption,
            activeBillingTaskOption,
            BILLING_ACCOUNT_TASK_OPTIONS,
            BILLING_PAYMENT_GROUP_OPTIONS,
            BILLING_TASK_OPTIONS,
            subscriptionStatusMode,
          }}
        />
      </Suspense>

      {data.activeBillingTask === "readiness" ? (
        <div style={data.softCard()}>
          <div style={data.sectionLabel()}>Subscription readiness</div>
          <div style={{ ...data.helperText(), marginTop: 7 }}>
            Lifecycle and package capacity stay here. Payment code, account, proof,
            and steps stay behind Change billing job.
          </div>
          <div style={{ marginTop: 12 }}>
            <Suspense
              fallback={
                <div style={{ ...data.helperText(), marginTop: 4 }}>
                  Loading billing readiness panels...
                </div>
              }
            >
              <CommunityDomainBillingReadinessPanels
                subscriptionLifecycle={data.subscriptionLifecycle}
                capacityPlan={data.capacityPlan}
              />
            </Suspense>
          </div>
        </div>
      ) : null}
    </>
  );
}
