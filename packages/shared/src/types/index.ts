export interface JwtPayload {
  sub: string;
  org: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  children: TreeNode[];
  depth: number;
}
