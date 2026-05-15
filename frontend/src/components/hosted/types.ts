import { Stack } from "../../lib/stacks";

export type BillingInterval = "monthly" | "yearly";

// Keep in sync with saas backend
export interface UserResponse {
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscriber_tier: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_lookup_key: string | null;
  billing_interval: BillingInterval | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface PortalSessionResponse {
  url: string;
}

export interface CreatePortalSessionRequest {
  action: "manage" | "change_tier" | "cancel";
  target_tier?: "hobby" | "pro";
}

export interface CreditsUsage {
  total_monthly_credits: number;
  used_monthly_credits: number;
}

export interface ProjectHistoryGeneration {
  id: string;
  date_created: string;
  completion: string;
  stack: Stack | null;
  generation_group_id: string | null;
}

export interface ProjectHistoryProject {
  id: string;
  generation_group_id: string | null;
  date_created: string;
  generations: ProjectHistoryGeneration[];
}

export interface ProjectHistoryResponse {
  projects?: ProjectHistoryProject[];
  generations: ProjectHistoryGeneration[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DeleteGenerationsResponse {
  deleted_ids: string[];
  deleted_count: number;
}
