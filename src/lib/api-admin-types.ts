// Row shapes for the developer API tables. Kept hand-written because the
// generated Supabase types don't include these tables yet.
export type ApiKeyRow = {
  id: string;
  key: string;
  label: string;
  owner_name: string | null;
  rate_limit_per_hour: number;
  request_count: number;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
};

export type ApiEndpointRow = {
  id: string;
  slug: string;
  description: string | null;
  upstream_url: string;
  upstream_header_name: string | null;
  upstream_header_value: string | null;
  request_count: number;
  active: boolean;
  created_at: string;
};

export type ApiRequestLogRow = {
  id: string;
  path: string;
  status: number | null;
  api_key_id: string | null;
  created_at: string;
};
