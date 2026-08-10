import React from 'react';
import { Family, Patient } from '../../types';
import { FamilySelectionScreen } from './FamilySelectionScreen';

interface SelectFamilyScreenProps {
  onSelectFamily: (family: Family, members: Patient[]) => void;
  onBackToHome?: () => void;
  onEnterHealthWorkerMode?: () => void;
}

export const SelectFamilyScreen: React.FC<SelectFamilyScreenProps> = ({
  onSelectFamily,
  onEnterHealthWorkerMode = () => {}
}) => {
  return (
    <FamilySelectionScreen
      onSelectFamily={onSelectFamily}
      onEnterHealthWorkerMode={onEnterHealthWorkerMode}
    />
  );
};
