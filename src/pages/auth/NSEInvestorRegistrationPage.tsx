import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import NSEClientDetail from '@/components/nse/NSEClientDetail';
import NSEUccRegistration from '@/components/nse/NSEUccRegistration';
import { isNSEConnected } from '@/services/nseAuth';

export default function NSEInvestorRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reportOpen, setReportOpen] = useState(false);

  // Support returning to the Mutual Funds journey after registration.
  // returnTo and pendingAction are passed via location state by MutualFundsDashboard.
  const locationState = location.state as { returnTo?: string; pendingAction?: unknown } | null;
  const returnTo = locationState?.returnTo || '/nse-dashboard';
  const pendingAction = locationState?.pendingAction;

  if (!isNSEConnected()) {
    return <Navigate to="/nse-login" replace state={{ from: '/investor-registration' }} />;
  }

  const handleClose = () => {
    navigate(returnTo, { state: pendingAction ? { pendingAction } : undefined });
  };

  return <>
    <NSEUccRegistration
      presentation="page"
      onClose={handleClose}
      onViewReport={() => setReportOpen(true)}
    />
    {reportOpen && <NSEClientDetail onClose={() => setReportOpen(false)} />}
  </>;
}
