import axiosClient from "../axiosClient";

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  profile?: {
    id: number;
    fullName: string;
    avatarUrl?: string;
    bio?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: string;
  };
  stats?: {
    totalBanhRan: number;
    [key: string]: any;
  };
}

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    return await axiosClient.get("/users/profile");
  },
};
