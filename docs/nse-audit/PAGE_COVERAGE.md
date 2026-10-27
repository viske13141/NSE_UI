# NSE PDF page coverage

Source review: 19 October 2026. All 201 pages are indexed, including tables that continue across pages. This is a section-level coverage assessment, not a claim that every field has passed verification. The JSON companion preserves each page text for follow-up field comparison.

## Status definitions

- **partial**: Implemented subset; see findings. Full document parity is not established.
- **mapped**: Related form and API wiring exist. This is not a field-by-field certification or live acceptance test.
- **report-review**: Related report UI exists. Complete PDF output-column coverage and provider payload equivalence remain unverified.
- **reference-ui**: Master/reference screen exists; raw supplied fields can be inspected. Completeness depends on provider data.
- **configured**: Document code tables configured; conditional profile support remains separate. See existing options audit.
- **missing**: Unavailable in navigation; no enabled implementation.
- **missing-entry**: Step-up reports exist, but new registration forces step_up_required=N.
- **mismatch**: Confirmed field-length or optional-field differences; see findings.
- **reference**: Document cover or contents; no application input required.

## Page index

| PDF page | Document sections | Assessment | Source |
| --- | --- | --- | --- |
| 1 | Cover and contents | reference |  |
| 2 | Cover and contents | reference |  |
| 3 | Cover and contents | reference |  |
| 4 | User Master | missing | [NSEWorkspaceSection](../../src/components/nse/NSEWorkspaceSection.tsx) |
| 5 | User Master | missing | [NSEWorkspaceSection](../../src/components/nse/NSEWorkspaceSection.tsx) |
| 6 | User Master; User Master Report | missing | [NSEWorkspaceSection](../../src/components/nse/NSEWorkspaceSection.tsx) |
| 7 | User Master Report; Rights Management; Client Master 183 columns | missing; partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx), [NSEWorkspaceSection](../../src/components/nse/NSEWorkspaceSection.tsx) |
| 8 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 9 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 10 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 11 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 12 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 13 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 14 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 15 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 16 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 17 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 18 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 19 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 20 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 21 | Client Master 183 columns | partial | [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 22 | Client Master 183 columns; Client code masters | configured; partial | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx), [NSEUccRegistration](../../src/components/nse/NSEUccRegistration.tsx) |
| 23 | Client code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 24 | Client code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 25 | Client code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 26 | Client code masters; Client bank upload; FATCA common upload | configured; mapped; partial | [NSEBankUpdate](../../src/components/nse/NSEBankUpdate.tsx), [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx), [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 27 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 28 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 29 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 30 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 31 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 32 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 33 | FATCA common upload | partial | [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 34 | FATCA common upload; FATCA code masters | configured; partial | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx), [NSEFatcaCommonUpload](../../src/components/nse/NSEFatcaCommonUpload.tsx) |
| 35 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 36 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 37 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 38 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 39 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 40 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 41 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 42 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 43 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 44 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 45 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 46 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 47 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 48 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 49 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 50 | FATCA code masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 51 | FATCA report | report-review | [NSEFatcaReport](../../src/components/nse/NSEFatcaReport.tsx) |
| 52 | FATCA report | report-review | [NSEFatcaReport](../../src/components/nse/NSEFatcaReport.tsx) |
| 53 | FATCA report | report-review | [NSEFatcaReport](../../src/components/nse/NSEFatcaReport.tsx) |
| 54 | FATCA report; AOF upload report | report-review | [NSEAofReport](../../src/components/nse/NSEAofReport.tsx), [NSEFatcaReport](../../src/components/nse/NSEFatcaReport.tsx) |
| 55 | AOF upload report; UTR upload | mapped; report-review | [NSEAofReport](../../src/components/nse/NSEAofReport.tsx), [NSEUtrUpdate](../../src/components/nse/NSEUtrUpdate.tsx) |
| 56 | UTR upload; Purchase and redemption order entry | mapped; partial | [NSEBuyFlow](../../src/components/nse/NSEBuyFlow.tsx), [NSEUtrUpdate](../../src/components/nse/NSEUtrUpdate.tsx) |
| 57 | Purchase and redemption order entry | partial | [NSEBuyFlow](../../src/components/nse/NSEBuyFlow.tsx) |
| 58 | Purchase and redemption order entry; Order cancellation | mapped; partial | [NSEBuyFlow](../../src/components/nse/NSEBuyFlow.tsx), [NSECancelOrder](../../src/components/nse/NSECancelOrder.tsx) |
| 59 | Order cancellation; Switch order entry | mapped; partial | [NSECancelOrder](../../src/components/nse/NSECancelOrder.tsx), [NSESwitchFlow](../../src/components/nse/NSESwitchFlow.tsx) |
| 60 | Switch order entry; Client state and country masters | configured; partial | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx), [NSESwitchFlow](../../src/components/nse/NSESwitchFlow.tsx) |
| 61 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 62 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 63 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 64 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 65 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 66 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 67 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 68 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 69 | Client state and country masters | configured | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx) |
| 70 | Client state and country masters; View order report | configured; report-review | [NSEDocumentInput](../../src/components/nse/NSEDocumentInput.tsx), [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 71 | View order report; Provisional order report | report-review | [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 72 | Provisional order report | report-review | [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 73 | Provisional order report; Order status report | report-review | [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 74 | Order status report | report-review | [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 75 | Order status report | report-review | [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 76 | Order status report; Switch order report | report-review | [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 77 | Switch order report; Settlement calendar; Demat scheme master | reference-ui; report-review | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx), [NSEOrderReports](../../src/components/nse/NSEOrderReports.tsx) |
| 78 | Demat scheme master | reference-ui | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx) |
| 79 | Demat scheme master; SIP scheme master | reference-ui | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx) |
| 80 | SIP scheme master | reference-ui | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx) |
| 81 | SIP scheme master; STP scheme master | reference-ui | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx) |
| 82 | STP scheme master; SWP scheme master | reference-ui | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx) |
| 83 | SWP scheme master; NAV master; SIP registration | partial; reference-ui | [NSEMasterPreview](../../src/components/nse/NSEMasterPreview.tsx), [NSESipFlow](../../src/components/nse/NSESipFlow.tsx) |
| 84 | SIP registration | partial | [NSESipFlow](../../src/components/nse/NSESipFlow.tsx) |
| 85 | SIP registration; SIP registration with step-up | missing-entry; partial | [NSESipFlow](../../src/components/nse/NSESipFlow.tsx) |
| 86 | SIP registration with step-up | missing-entry | [NSESipFlow](../../src/components/nse/NSESipFlow.tsx) |
| 87 | SIP registration with step-up; SIP cancellation and reasons | mapped; missing-entry | [NSECancelSip](../../src/components/nse/NSECancelSip.tsx), [NSESipFlow](../../src/components/nse/NSESipFlow.tsx) |
| 88 | Mandate registration; XSIP registration | partial | [NSEMandates](../../src/components/nse/NSEMandates.tsx), [NSEXsipFlow](../../src/components/nse/NSEXsipFlow.tsx) |
| 89 | XSIP registration | partial | [NSEXsipFlow](../../src/components/nse/NSEXsipFlow.tsx) |
| 90 | XSIP registration; XSIP registration with step-up | missing-entry; partial | [NSEXsipFlow](../../src/components/nse/NSEXsipFlow.tsx) |
| 91 | XSIP registration with step-up | missing-entry | [NSEXsipFlow](../../src/components/nse/NSEXsipFlow.tsx) |
| 92 | XSIP registration with step-up | missing-entry | [NSEXsipFlow](../../src/components/nse/NSEXsipFlow.tsx) |
| 93 | XSIP registration with step-up; XSIP and daily cancellation and reasons | mapped; missing-entry | [NSECancelDailyXsip](../../src/components/nse/NSECancelDailyXsip.tsx), [NSECancelXsip](../../src/components/nse/NSECancelXsip.tsx), [NSEXsipFlow](../../src/components/nse/NSEXsipFlow.tsx) |
| 94 | XSIP and daily cancellation and reasons; SIP to XSIP mapping; Mandate download | mapped; report-review | [NSECancelDailyXsip](../../src/components/nse/NSECancelDailyXsip.tsx), [NSECancelXsip](../../src/components/nse/NSECancelXsip.tsx), [NSEMandateCard](../../src/components/nse/NSEMandateCard.tsx), [NSESipMandateMapping](../../src/components/nse/NSESipMandateMapping.tsx) |
| 95 | Mandate download; SIP registration report | report-review | [NSEMandateCard](../../src/components/nse/NSEMandateCard.tsx), [NSESipReport](../../src/components/nse/NSESipReport.tsx) |
| 96 | SIP registration report | report-review | [NSESipReport](../../src/components/nse/NSESipReport.tsx) |
| 97 | SIP registration report; SIP cancellation report | report-review | [NSESipCancellations](../../src/components/nse/NSESipCancellations.tsx), [NSESipReport](../../src/components/nse/NSESipReport.tsx) |
| 98 | SIP cancellation report; SIP installments due | report-review | [NSESipCancellations](../../src/components/nse/NSESipCancellations.tsx), [NSESipInstallmentsDue](../../src/components/nse/NSESipInstallmentsDue.tsx) |
| 99 | SIP installments due; SIP matured report | report-review | [NSESipInstallmentsDue](../../src/components/nse/NSESipInstallmentsDue.tsx), [NSESipReport](../../src/components/nse/NSESipReport.tsx) |
| 100 | SIP matured report; SIP missed installments | report-review | [NSESipReport](../../src/components/nse/NSESipReport.tsx) |
| 101 | SIP missed installments; Mandate detail report | report-review | [NSEMandateCard](../../src/components/nse/NSEMandateCard.tsx), [NSESipReport](../../src/components/nse/NSESipReport.tsx) |
| 102 | Mandate detail report; XSIP registration report | report-review | [NSEMandateCard](../../src/components/nse/NSEMandateCard.tsx), [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 103 | XSIP registration report; XSIP cancellation report | report-review | [NSEXsipCancellations](../../src/components/nse/NSEXsipCancellations.tsx), [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 104 | XSIP cancellation report; XSIP matured report | report-review | [NSEXsipCancellations](../../src/components/nse/NSEXsipCancellations.tsx), [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 105 | XSIP matured report | report-review | [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 106 | XSIP matured report; XSIP installments due | report-review | [NSEXsipInstallmentsDue](../../src/components/nse/NSEXsipInstallmentsDue.tsx), [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 107 | XSIP installments due; XSIP missed installments | report-review | [NSEXsipInstallmentsDue](../../src/components/nse/NSEXsipInstallmentsDue.tsx), [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 108 | XSIP missed installments; STP registration | mismatch; report-review | [NSEStpFlow](../../src/components/nse/NSEStpFlow.tsx), [NSEXsipReport](../../src/components/nse/NSEXsipReport.tsx) |
| 109 | STP registration; STP cancellation; SWP registration | mapped; mismatch | [NSECancelStp](../../src/components/nse/NSECancelStp.tsx), [NSEStpFlow](../../src/components/nse/NSEStpFlow.tsx), [NSESwpFlow](../../src/components/nse/NSESwpFlow.tsx) |
| 110 | SWP registration; SWP cancellation; STP registration report | mapped; mismatch; report-review | [NSECancelSwp](../../src/components/nse/NSECancelSwp.tsx), [NSEStpReport](../../src/components/nse/NSEStpReport.tsx), [NSESwpFlow](../../src/components/nse/NSESwpFlow.tsx) |
| 111 | STP registration report | report-review | [NSEStpReport](../../src/components/nse/NSEStpReport.tsx) |
| 112 | STP registration report; STP cancellation report | report-review | [NSEStpCancellations](../../src/components/nse/NSEStpCancellations.tsx), [NSEStpReport](../../src/components/nse/NSEStpReport.tsx) |
| 113 | STP cancellation report; STP installments due | report-review | [NSEStpCancellations](../../src/components/nse/NSEStpCancellations.tsx), [NSEStpInstallmentsDue](../../src/components/nse/NSEStpInstallmentsDue.tsx) |
| 114 | STP installments due; STP matured report | report-review | [NSEStpInstallmentsDue](../../src/components/nse/NSEStpInstallmentsDue.tsx), [NSEStpReport](../../src/components/nse/NSEStpReport.tsx) |
| 115 | STP matured report; SWP registration report | report-review | [NSEStpReport](../../src/components/nse/NSEStpReport.tsx), [NSESwpReport](../../src/components/nse/NSESwpReport.tsx) |
| 116 | SWP registration report; SWP cancellation report | report-review | [NSESwpCancellations](../../src/components/nse/NSESwpCancellations.tsx), [NSESwpReport](../../src/components/nse/NSESwpReport.tsx) |
| 117 | SWP cancellation report; SWP matured report | report-review | [NSESwpCancellations](../../src/components/nse/NSESwpCancellations.tsx), [NSESwpReport](../../src/components/nse/NSESwpReport.tsx) |
| 118 | SWP matured report; SWP installments due | report-review | [NSESwpInstallmentsDue](../../src/components/nse/NSESwpInstallmentsDue.tsx), [NSESwpReport](../../src/components/nse/NSESwpReport.tsx) |
| 119 | SWP installments due; Allotment statement | report-review | [NSEAllotmentStatements](../../src/components/nse/NSEAllotmentStatements.tsx), [NSESwpInstallmentsDue](../../src/components/nse/NSESwpInstallmentsDue.tsx) |
| 120 | Allotment statement | report-review | [NSEAllotmentStatements](../../src/components/nse/NSEAllotmentStatements.tsx) |
| 121 | Allotment statement; Refund report | missing; report-review | [NSEAllotmentStatements](../../src/components/nse/NSEAllotmentStatements.tsx), [NSEWorkspaceSection](../../src/components/nse/NSEWorkspaceSection.tsx) |
| 122 | Refund report; Redemption statement | missing; report-review | [NSERedemptionStatements](../../src/components/nse/NSERedemptionStatements.tsx), [NSEWorkspaceSection](../../src/components/nse/NSEWorkspaceSection.tsx) |
| 123 | Redemption statement; Funds payout report | report-review | [NSEPayoutReport](../../src/components/nse/NSEPayoutReport.tsx), [NSERedemptionStatements](../../src/components/nse/NSERedemptionStatements.tsx) |
| 124 | Funds payout report | report-review | [NSEPayoutReport](../../src/components/nse/NSEPayoutReport.tsx) |
| 125 | Funds payout report; Delivery shortage report | report-review | [NSEDeliveryReport](../../src/components/nse/NSEDeliveryReport.tsx), [NSEPayoutReport](../../src/components/nse/NSEPayoutReport.tsx) |
| 126 | Delivery shortage report; Funds allocation report | report-review | [NSEDeliveryReport](../../src/components/nse/NSEDeliveryReport.tsx), [NSEFundAllocationReport](../../src/components/nse/NSEFundAllocationReport.tsx) |
| 127 | Funds allocation report; Age and bank report | report-review | [NSEFundAgeReport](../../src/components/nse/NSEFundAgeReport.tsx), [NSEFundAllocationReport](../../src/components/nse/NSEFundAllocationReport.tsx) |
| 128 | Age and bank report | report-review | [NSEFundAgeReport](../../src/components/nse/NSEFundAgeReport.tsx) |
| 129 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 130 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 131 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 132 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 133 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 134 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 135 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 136 | Client registration report | partial | [NSEClientDetail](../../src/components/nse/NSEClientDetail.tsx) |
| 137 | SIP XSIP top-up entry | mapped | [NSETopup](../../src/components/nse/NSETopup.tsx) |
| 138 | SIP XSIP top-up entry; Top-up report | mapped; report-review | [NSESipTopups](../../src/components/nse/NSESipTopups.tsx), [NSETopup](../../src/components/nse/NSETopup.tsx), [NSEXsipTopups](../../src/components/nse/NSEXsipTopups.tsx) |
| 139 | Top-up report; 2FA report | report-review | [NSESipTopups](../../src/components/nse/NSESipTopups.tsx), [NSETwoFaReport](../../src/components/nse/NSETwoFaReport.tsx), [NSEXsipTopups](../../src/components/nse/NSEXsipTopups.tsx) |
| 140 | 2FA report | report-review | [NSETwoFaReport](../../src/components/nse/NSETwoFaReport.tsx) |
| 141 | 2FA report; Client authorization report | report-review | [NSEClientAuthorization](../../src/components/nse/NSEClientAuthorization.tsx), [NSETwoFaReport](../../src/components/nse/NSETwoFaReport.tsx) |
| 142 | Client authorization report | report-review | [NSEClientAuthorization](../../src/components/nse/NSEClientAuthorization.tsx) |
| 143 | Client authorization report | report-review | [NSEClientAuthorization](../../src/components/nse/NSEClientAuthorization.tsx) |
| 144 | Client authorization report; Order lifecycle report | report-review | [NSEClientAuthorization](../../src/components/nse/NSEClientAuthorization.tsx), [NSELifecycleReport](../../src/components/nse/NSELifecycleReport.tsx) |
| 145 | Order lifecycle report | report-review | [NSELifecycleReport](../../src/components/nse/NSELifecycleReport.tsx) |
| 146 | Order lifecycle report | report-review | [NSELifecycleReport](../../src/components/nse/NSELifecycleReport.tsx) |
| 147 | Order lifecycle report; NFT nominee update 192 fields | partial; report-review | [NSELifecycleReport](../../src/components/nse/NSELifecycleReport.tsx), [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 148 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 149 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 150 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 151 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 152 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 153 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 154 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 155 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 156 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 157 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 158 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 159 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 160 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 161 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 162 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 163 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 164 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 165 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 166 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 167 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 168 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 169 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 170 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 171 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 172 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 173 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 174 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 175 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 176 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 177 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 178 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 179 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 180 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 181 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 182 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 183 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 184 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 185 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 186 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 187 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 188 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 189 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 190 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 191 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 192 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 193 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 194 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 195 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 196 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 197 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 198 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 199 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 200 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
| 201 | NFT nominee update 192 fields | partial | [NSENftUpdates](../../src/components/nse/NSENftUpdates.tsx) |
