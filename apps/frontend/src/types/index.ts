export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Website {
  website_url: string; // Acts as ID
  owner_id: number;
  is_public: boolean;
}

export interface Analytics {
  id: number;
  website_url: string;
  ping5: number | null;
  checked_at: string;
}