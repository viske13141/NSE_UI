import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NSEButton } from '@/components/nse/NSEPresentation';

interface Props {
  onRegister: () => void;
  onCancel: () => void;
}

export default function RegistrationPromptDialog({ onRegister, onCancel }: Props) {
  return (
    <Dialog open onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Investor Registration</DialogTitle>
          <DialogDescription>
            To continue with your investment, please complete your investor details and registration.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <NSEButton
            onClick={onRegister}
            className="w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1B3F96]"
          >
            Complete Registration
          </NSEButton>
          <NSEButton
            onClick={onCancel}
            className="w-full rounded-lg border border-[#102B78] px-4 py-2.5 text-sm font-semibold text-[#102B78] hover:bg-blue-50"
          >
            Cancel
          </NSEButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
