// Keep in sync with saas backend
export interface UserResponse {
  email: string;
  first_name: string;
  last_name: string;
  subscriber_tier: string;
  stripe_customer_id: string;
}
