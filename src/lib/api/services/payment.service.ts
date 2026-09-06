import axiosClient from "../axiosClient";

export type PaymentStatus =
  | 'PENDING'
  | 'REPORTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'REVIEW_REQUIRED';

export interface ClassSummary {
  id: number;
  name: string;
  course: {
    id: number;
    title: string;
  };
}

export interface BankTransferInstructions {
  bin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountVnd: number;
  transferCode: string;
  vietQrUrl: string;
}

export interface StudentPayment {
  id: number;
  enrollmentId: number;
  amountVnd: number;
  transferCode: string;
  status: PaymentStatus;
  createdAt: string;
  reportedAt: string | null;
  confirmedAt: string | null;
  class: ClassSummary;
}

export interface StudentPaymentDetail extends StudentPayment {
  updatedAt: string;
  bankInstructions: BankTransferInstructions;
}

// =================== ADMIN INTERFACES ===================

export interface AdminPaymentFilterParams {
  status?: PaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminPaymentItem {
  id: number;
  enrollmentId: number;
  amountVnd: number;
  transferCode: string;
  status: PaymentStatus;
  createdAt: string;
  reportedAt: string | null;
  reviewedAt: string | null;
  confirmedAt: string | null;
  student: {
    id: number;
    email: string;
    fullName: string;
  };
  class: {
    id: number;
    name: string;
    tuitionFeeVnd: number;
    course: {
      id: number;
      title: string;
    };
  };
  reviewedBy: {
    id: number;
    email: string;
    fullName: string;
  } | null;
}

export interface PaginatedAdminPayments {
  items: AdminPaymentItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminPaymentDetail {
  id: number;
  enrollmentId: number;
  amountVnd: number;
  transferCode: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  reportedAt: string | null;
  reviewedAt: string | null;
  confirmedAt: string | null;
  adminNote: string | null;
  student: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
  };
  enrollment: {
    id: number;
    status: string;
    joinedAt: string;
  };
  class: {
    id: number;
    name: string;
    tuitionFeeVnd: number;
    course: {
      id: number;
      title: string;
    };
  };
  bankInstructions: BankTransferInstructions;
  reviewedBy: {
    id: number;
    email: string;
    fullName: string;
  } | null;
}

export interface RejectPaymentInput {
  reason: string;
}

export const paymentService = {
  // Student APIs
  getMyPayments: async (): Promise<StudentPayment[]> => {
    return await axiosClient.get("/payments/me");
  },

  getPaymentById: async (id: number): Promise<StudentPaymentDetail> => {
    return await axiosClient.get(`/payments/${id}`);
  },

  reportTransfer: async (id: number): Promise<StudentPaymentDetail> => {
    return await axiosClient.post(`/payments/${id}/report-transfer`);
  },

  // Admin APIs (/admin/payments)
  adminGetPayments: async (
    params?: AdminPaymentFilterParams,
  ): Promise<PaginatedAdminPayments> => {
    return await axiosClient.get("/admin/payments", { params });
  },

  adminGetPaymentDetail: async (id: number): Promise<AdminPaymentDetail> => {
    return await axiosClient.get(`/admin/payments/${id}`);
  },

  adminRejectPayment: async (
    id: number,
    data: RejectPaymentInput,
  ): Promise<AdminPaymentDetail> => {
    return await axiosClient.post(`/admin/payments/${id}/reject`, data);
  },
};
