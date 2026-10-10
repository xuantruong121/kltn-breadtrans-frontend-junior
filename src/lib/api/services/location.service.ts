import axiosClient from "../axiosClient";

export interface VietnamProvince {
  code: string;
  name: string;
  divisionType: string;
  codename: string;
  phoneCode?: number;
}

export interface VietnamWard {
  code: string;
  name: string;
  divisionType: string;
  codename: string;
  provinceCode: string;
}

export const locationService = {
  getProvinces: async (): Promise<VietnamProvince[]> => {
    return await axiosClient.get("/locations/vietnam/provinces");
  },

  getWards: async (provinceCode: string): Promise<VietnamWard[]> => {
    if (!provinceCode) return [];
    return await axiosClient.get(
      `/locations/vietnam/wards?provinceCode=${encodeURIComponent(provinceCode)}`
    );
  },
};
