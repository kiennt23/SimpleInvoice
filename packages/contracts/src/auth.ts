export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly fullname: string;
};

export type LoginRequest = {
  readonly email: string;
  readonly password: string;
};

export type AuthResponse = {
  readonly user: AuthUser;
};
