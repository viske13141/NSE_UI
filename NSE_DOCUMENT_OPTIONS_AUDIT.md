# NSE form option audit

Source: `NSE_MF_WebfileStructure.pdf`. The application uses the supplied document's codes, including its older names and spellings. `src/data/nseDocumentMasters.json` records the source page ranges for 21 tables.

## Client Master

- Tax status: 59 options, pages 22–24.
- Occupation: 8 options, page 24. Codes remain `01` through `08`.
- Holding nature and PAN exempt category: page 24–25; shared options are available for additional registration fields.
- Account types: `SB`, `CB`, `NE`, `NO`, page 25.
- Nominee relationships: 22 options. Guardian relationships have a separate list (`06`, `13`, `23`), pages 25–26.
- Email/mobile declarations: 9 options, page 26.
- States: 37 options, pages 60–61. Countries: 243 options, pages 61–70.
- Existing gender, payment, communication, KYC, onboarding, nomination and identity dropdowns retain the field-table values.

Client registration uses dropdowns for every implemented field backed by these tables. Nominee country fields store country names; the client Country field stores the numeric country code. UCC registration maps resident India code `101` to `country: "INDIA"`, as required by the registration endpoint. Review displays descriptions with codes. Registration validation rejects unlisted master values.

## FATCA

Individual, common/entity and repeated UBO/tax-residence fields use the corresponding FATCA tables:

- Countries/nationality (252), wealth sources (8), tax statuses (60), occupations (14), income ranges (6), UBO codes (14), identification types (19), states (37), exemptions (14), GIIN exemptions (14), active NFE subcategories (6): pages 34–50.
- Corporate services, declaration source, address type, occupation type, PEP flags, FFI classification, GIIN status, exchange, UBO/SMO and yes/no declarations use values from the field table, pages 27–33.
- Code values are validated before request construction, including additional tax residences and UBOs.

These lists are deliberately separate from Client Master. India is `101` in Client Master and `IN` in FATCA. Bihar is `BH` in Client Master and `BR` in FATCA. Tax code `75` also has different descriptions in the two tables.

## Other screens and limits

- Nominee folio updates now offer the documented nominee relationship list and country names. The one-character NFT guardian relationship field remains a code input: the PDF does not establish a compatible one-character mapping to the two-character Client Master guardian codes.
- Bank updates and mandate forms already restrict account types. Bank update labels now expand NRE/NRO descriptions.
- SIP/XSIP cancellations already offer the 13 documented reasons and conditional Other text (pages 87, 93–94).
- The complete NFE Category table is referenced but absent from the supplied PDF. That field stays an explicit code entry rather than inventing options.
- AMC, scheme, folio, settlement and registration identifiers depend on live masters or investor records; static choices are not fabricated from this PDF.
- Registration now submits through the existing authenticated `/ucc/register` endpoint. The supported profile is a resident adult individual (tax status `01`, country `101`), single holding, physical account, one savings/current bank, and one adult nominee or an authenticated nomination opt-out. Other profiles need additional forms and are blocked from this submission flow.
- The request builder supplies the declared single/physical/PAN-not-exempt/default-bank flags, converts the holder date to `DD/MM/YYYY`, maps nominee identity and pincode to the API field names, and excludes account confirmation and response-only fields. Aadhaar-updated status is collected explicitly. PDF column 176 (nominee opt-out reference) uses the UCC schema's supported additional properties.
- Submission requires review and fresh consent, blocks duplicate clicks, and reports success only for a matching client, confirmed registration status and nonzero registration ID. Unknown outcomes are not retried automatically. A Client Registration Report shortcut is provided. Registration does not imply verified KYC, FATCA or approved bank details; NSE performs its final eligibility checks.

## Buy and systematic-plan registration

- Buy order entry (pages 57–58): Fresh/Additional purchase and CDSL `C`, NSDL `N`, Physical `P` choices are shared document constants. Existing folio, amount, EUIN, review and payment checks remain in place.
- SIP (page 84), XSIP (page 89) and STP (page 108): Weekly, Monthly, Quarterly, Semi-annually, Annually and Daily. Request values retain `SEMI-ANNUALLY` and `ANNUALLY`. Removed unsupported Fortnightly choices and the XSIP fallback that validated Fortnightly as Weekly.
- SWP (page 110): Daily, Weekly, Monthly and Quarterly only. Removed the extra annual, semiannual and fortnightly options.
- STP (page 108): transaction modes are `C`, `N`, `P`, with client depository matching, rather than generic `D`. Fresh/Additional is now selectable rather than always Additional.
- SWP continues to use its own documented `D`/`P` modes. Its review now shows Withdrawal and no destination scheme; this also removes an undefined variable copied from STP.
- XSIP still requires an approved mandate for the investor and checks its debit limit. Daily plans retain their conditional end-date behavior. First-order-today choices retain explicit review and consent.
- Scheme-specific frequency availability, due dates, gaps, installment minima/maxima and increments need the current NSE scheme masters and provider validation. This audit does not claim a successful live registration, debit, payment or allotment.

### SIP investor step (pages 83–85)

- The member code is populated from the selected client when available and validated as up to 20 digits. Physical clients stored as `P` are recognized, and known CDSL/NSDL modes are populated with incompatible depositories disabled.
- Existing folio accepts the documented 20 characters. An optional API mandate ID accepts up to 13 digits; its label states that approval/ownership must be checked by NSE rather than claiming the typed ID has already been verified. XSIP's approved-mandate selection remains a separate requirement.
- EUIN is conditional on declaration `Y`. First-order-today is included in review and consent.
- Optional primary-holder mobile/email, SIP remarks, sub-broker code and ARN are collected, reviewed and included in the request. Contact information is populated from the selected client when available.
- The generated SIP internal reference is limited to 10 characters and kept separate from the API member reference. Rolling frequency and active status retain their documented fixed values. DPC is `N` for physical and `Y` for demat.
- The investor lookup and live KYC check remain prerequisites in this application. A Client Master KYC label alone does not establish verified KYC, and an unknown bank approval status is not treated as active.

### Switch order investor step (pages 59–60)

- CDSL `C`, NSDL `N`, Physical `P` modes are populated from the selected investor when known; incompatible depositories are disabled and validated. The destination list excludes the source scheme and schemes outside the supplied source AMC.
- Physical switches accept either an amount or units. All-units selection clears and disables both inputs. Demat requires units, blank amount and all-units `N`.
- Folio, remarks, mobile and email enforce their 15/200/10/50-character limits. The application requires a physical source folio. Contact details are populated from Client Master when present and remain editable.
- Optional sub-broker code (15) and ARN (20) are collected and reviewed; both require the documented ARN prefix.
- KYC and an active bank remain application prerequisites. EUIN remains conditional on declaration `Y`. Submission requires review and consent, and both NSE switch-out and switch-in order IDs must be returned before acceptance is reported. Order acceptance does not confirm execution/allotment.
- An all-units order is recorded and displayed as All units rather than a zero-amount transfer. Reserved fillers remain blank. The PDF does not specify allowed values for Switch Buy/Sell Type, so its existing blank request value is retained rather than inventing a dropdown.

## Full document coverage review

See [confirmed gaps](docs/nse-audit/FINDINGS.md) and the [201-page coverage index](docs/nse-audit/PAGE_COVERAGE.md). Configured option tables do not imply all profiles, fields or report columns are implemented.
