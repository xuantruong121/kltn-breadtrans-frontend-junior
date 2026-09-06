import axiosClient from "../axiosClient";

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
  status: 'PENDING' | 'REPORTED' | 'CONFIRMED' | 'REJECTED' | 'REVIEW_REQUIRED';
  createdAt: string;
  reportedAt: string | null;
  confirmedAt: string | null;
  class: ClassSummary;
}

export interface StudentPaymentDetail extends StudentPayment {
  updatedAt: string;
  bankInstructions: BankTransferInstructions;
}

export const paymentService = {
  getMyPayments: async (): Promise<StudentPayment[]> => {
    return await axiosClient.get("/payments/me");
  },

  getPaymentById: async (id: number): Promise<StudentPaymentDetail> => {
    return await axiosClient.get(`/payments/${id}`);
  },

  reportTransfer: async (id: number): Promise<StudentPaymentDetail> => {
    return await axiosClient.post(`/payments/${id}/report-transfer`);
  },
};
