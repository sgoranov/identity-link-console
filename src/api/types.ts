export interface Group {
  id: string;
  name: string;
  isSystem?: boolean;
}

export interface QueryResponse<T> {
  response: {
    result: T[];
    hasMore: boolean;
  };
}

export type QueryPayload = {
  type: string;
  alias?: string;
  limit?: number;
  offset?: number;
  orderBy?: Record<string, 'asc' | 'desc' | 'ASC' | 'DESC'>;
  parameters?: Record<string, string | number | boolean>;
  joins?: Record<string, string>;
  query?: string;
};
