import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  fullname: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
