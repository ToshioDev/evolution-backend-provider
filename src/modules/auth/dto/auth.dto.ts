export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  locationId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    locationId: string;
  };
}
