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
      title="Mở khóa chủ đề này"
      itemTitle={topicTitle}
      description="Nâng cấp BreadTrans Plus để học chủ đề từ vựng này."
    />
  );
};

export default PremiumVocabPaywallModal;
