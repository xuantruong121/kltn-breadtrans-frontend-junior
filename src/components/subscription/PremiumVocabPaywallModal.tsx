"use client";

import React from "react";
import { PremiumContentPaywallModal } from "./PremiumContentPaywallModal";

export interface PremiumVocabPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle?: string;
}

export const PremiumVocabPaywallModal: React.FC<PremiumVocabPaywallModalProps> = ({
  isOpen,
  onClose,
  topicTitle,
}) => {
  return (
    <PremiumContentPaywallModal
      isOpen={isOpen}
      onClose={onClose}
      skillType="VOCABULARY"
      title="Mở khóa chủ đề Premium"
      itemTitle={topicTitle}
      description="Nâng cấp BreadTrans Plus để truy cập chủ đề từ vựng Premium."
    />
  );
};

export default PremiumVocabPaywallModal;
