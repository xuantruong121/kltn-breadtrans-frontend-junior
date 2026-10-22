import axiosClient from '../axiosClient';

export interface AdminMarketProduct {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  rarity: string;
  price: number;
  imageUrl: string | null;
  order: number;
  stock: number;
  purchaseCount: number;
  isActive: boolean;
  fulfillmentType: 'DIGITAL' | 'PHYSICAL';
  available: boolean;
  createdAt: string;
  updatedAt: string;
  hasHistory?: boolean;
  redemptionCount?: number;
}

export interface CreateMarketProductPayload {
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  rarity?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  order?: number;
  isActive?: boolean;
  fulfillmentType?: 'DIGITAL' | 'PHYSICAL';
}

export interface UpdateMarketProductPayload {
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  rarity?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  order?: number;
  isActive?: boolean;
  fulfillmentType?: 'DIGITAL' | 'PHYSICAL';
}

export interface AdminMarketProductQueryParams {
  search?: string;
  isActive?: string;
  category?: string;
  fulfillmentType?: string;
  page?: number;
  limit?: number;
}

export interface AdminMarketOrder {
  id: number;
  userId: number;
  studentName: string;
  items: Array<{
    productId?: number;
    id?: number;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalBanh: number;
  totalK?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'refunded';
  paidAtCheckout?: boolean;
  balanceAtCheckout?: number;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reason?: string | null;
  createdAt: string;
  user?: {
    id: number;
    email: string;
    profile?: {
      fullName?: string;
    };
  };
  physicalRedemptions?: Array<{
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    status: string;
    recipientName: string;
    phone: string;
    formattedAddress: string;
  }>;
}

export const adminMarketService = {
  async getProducts(params?: AdminMarketProductQueryParams) {
    const res: any = await axiosClient.get('/market/admin/products', { params });
    return res?.data !== undefined ? res.data : res;
  },

  async getProductById(id: number): Promise<AdminMarketProduct> {
    const res: any = await axiosClient.get(`/market/admin/products/${id}`);
    return res?.data !== undefined ? res.data : res;
  },

  async createProduct(payload: CreateMarketProductPayload): Promise<AdminMarketProduct> {
    const res: any = await axiosClient.post('/market/admin/products', payload);
    return res?.data !== undefined ? res.data : res;
  },

  async updateProduct(id: number, payload: UpdateMarketProductPayload): Promise<AdminMarketProduct> {
    const res: any = await axiosClient.patch(`/market/admin/products/${id}`, payload);
    return res?.data !== undefined ? res.data : res;
  },

  async toggleProductActive(id: number, isActive?: boolean): Promise<AdminMarketProduct> {
    const res: any = await axiosClient.patch(`/market/admin/products/${id}/toggle-active`, { isActive });
    return res?.data !== undefined ? res.data : res;
  },

  async deleteProduct(id: number): Promise<{ success: boolean; message: string }> {
    const res: any = await axiosClient.delete(`/market/admin/products/${id}`);
    return res?.data !== undefined ? res.data : res;
  },

  async getOrders(params?: { status?: string; search?: string }): Promise<AdminMarketOrder[]> {
    const res: any = await axiosClient.get('/market/orders', { params });
    return Array.isArray(res) ? res : res?.data || [];
  },

  async reviewOrder(
    id: number,
    status: 'approved' | 'rejected',
    reason?: string,
  ): Promise<AdminMarketOrder> {
    const res: any = await axiosClient.patch(`/market/orders/${id}/review`, { status, reason });
    return res?.data !== undefined ? res.data : res;
  },

  async markFulfillmentFailed(id: number, reason: string): Promise<AdminMarketOrder> {
    const res: any = await axiosClient.patch(`/market/orders/${id}/mark-fulfillment-failed`, { reason });
    return res?.data !== undefined ? res.data : res;
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res: any = await axiosClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res?.url || res?.data?.url || '';
  },
};
