import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addUcc, AddUCCPayload } from '@/services/starmf/uccService';
import { ChevronRight, ChevronLeft, CheckCircle2, RefreshCw, User, Phone, Building2, FileText, Eye, EyeOff } from 'lucide-react';

// ─── Masking helpers ──────────────────────────────────────────────────────────
const maskPAN = (pan: string) => pan.length >= 10 ? `${pan.slice(0, 2)}${'*'.repeat(6)}${pan.slice(-2)}` : pan;
const maskAccNo = (acc: string) => acc.length > 4 ? `${'*'.repeat(acc.length - 4)}${acc.slice(-4)}` : acc;
const MaskedInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { maskFn?: (v: string) => string }> = ({ maskFn: _maskFn, value, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        value={value}
        className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] transition-all bg-white font-mono tracking-wider"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

// ─── BSE Enums ────────────────────────────────────────────────────────────────
const OCC_CODES = [
  { value: '01', label: 'Business' },
  { value: '02', label: 'Service' },
  { value: '03', label: 'Professional' },
  { value: '04', label: 'Agriculture' },
  { value: '05', label: 'Retired' },
  { value: '06', label: 'Housewife' },
  { value: '07', label: 'Student' },
  { value: '08', label: 'Others' },
];

const INCOME_SLABS = [
  { value: '31', label: 'Below ₹1 Lakh' },
  { value: '32', label: '₹1–5 Lakh' },
  { value: '33', label: '₹5–10 Lakh' },
  { value: '34', label: '₹10–25 Lakh' },
  { value: '35', label: '₹25 Lakh–1 Cr' },
  { value: '36', label: 'Above ₹1 Cr' },
];

const BANK_ACC_TYPES = [
  { value: 'SB', label: 'Savings' },
  { value: 'CA', label: 'Current' },
  { value: 'NRE', label: 'NRE' },
  { value: 'NRO', label: 'NRO' },
];

const WEALTH_SOURCES = [
  { value: '1', label: 'Salary' },
  { value: '2', label: 'Business Income' },
  { value: '3', label: 'Gift' },
  { value: '4', label: 'Ancestral Property' },
  { value: '5', label: 'Rental Income' },
  { value: '6', label: 'Prize Money' },
  { value: '7', label: 'Royalty' },
  { value: '8', label: 'Others' },
];

// ─── Form state shape ─────────────────────────────────────────────────────────
interface FormData {
  // Step 1 — Personal
  clientCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  pan: string;
  occCode: string;
  kycType: string;
  // Step 2 — Contact & Address
  mobile: string;
  email: string;
  address1: string;
  address2: string;
  address3: string;
  pincode: string;
  // Step 3 — Bank
  ifsc: string;
  accountNumber: string;
  accountType: string;
  // Step 4 — FATCA
  birthPlace: string;
  fatherName: string;
  spouseName: string;
  incomeSlab: string;
  netWorth: string;
  netWorthDate: string;
  wealthSource: string;
  politicallyExposed: string;
}

const INIT: FormData = {
  clientCode: '', firstName: '', middleName: '', lastName: '',
  dob: '', gender: 'M', pan: '', occCode: '02', kycType: 'K',
  mobile: '', email: '', address1: '', address2: '', address3: '', pincode: '',
  ifsc: '', accountNumber: '', accountType: 'SB',
  birthPlace: '', fatherName: '', spouseName: '',
  incomeSlab: '31', netWorth: '', netWorthDate: '', wealthSource: '1', politicallyExposed: 'N',
};

// ─── Shared input components ──────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
    {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] transition-all bg-white"
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] transition-all bg-white"
  />
);

const Row: React.FC<{ children: React.ReactNode; cols?: number }> = ({ children, cols = 2 }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-4`}>{children}</div>
);

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Personal',        icon: <User className="w-4 h-4" /> },
  { id: 2, label: 'Contact',         icon: <Phone className="w-4 h-4" /> },
  { id: 3, label: 'Bank',            icon: <Building2 className="w-4 h-4" /> },
  { id: 4, label: 'FATCA',           icon: <FileText className="w-4 h-4" /> },
  { id: 5, label: 'Review',          icon: <Eye className="w-4 h-4" /> },
];

// ─── Step components ──────────────────────────────────────────────────────────
const Step1: React.FC<{ f: FormData; set: (k: keyof FormData, v: string) => void }> = ({ f, set }) => (
  <div className="space-y-4">
    <Row>
      <div>
        <Label required>Client Code (UCC)</Label>
        <Input value={f.clientCode} onChange={e => set('clientCode', e.target.value)} placeholder="e.g. MYUCC001" />
      </div>
      <div>
        <Label required>PAN</Label>
        <MaskedInput
          maskFn={maskPAN}
          value={f.pan}
          onChange={e => set('pan', e.target.value.toUpperCase())}
          placeholder="ABCDE1234F"
          maxLength={10}
        />
      </div>
    </Row>
    <Row cols={3}>
      <div>
        <Label required>First Name</Label>
        <Input value={f.firstName} onChange={e => set('firstName', e.target.value.toUpperCase())} placeholder="ANKUR" />
      </div>
      <div>
        <Label>Middle Name</Label>
        <Input value={f.middleName} onChange={e => set('middleName', e.target.value.toUpperCase())} placeholder="Optional" />
      </div>
      <div>
        <Label>Last Name</Label>
        <Input value={f.lastName} onChange={e => set('lastName', e.target.value.toUpperCase())} placeholder="GOEL" />
      </div>
    </Row>
    <Row>
      <div>
        <Label required>Date of Birth</Label>
        <Input type="date" value={f.dob} onChange={e => set('dob', e.target.value)} />
      </div>
      <div>
        <Label required>Gender</Label>
        <Select value={f.gender} onChange={e => set('gender', e.target.value)}>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="T">Transgender</option>
        </Select>
      </div>
    </Row>
    <Row>
      <div>
        <Label required>Occupation</Label>
        <Select value={f.occCode} onChange={e => set('occCode', e.target.value)}>
          {OCC_CODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>
      <div>
        <Label required>KYC Type</Label>
        <Select value={f.kycType} onChange={e => set('kycType', e.target.value)}>
          <option value="K">KYC Verified</option>
          <option value="E">eKYC</option>
          <option value="C">CKYC</option>
        </Select>
      </div>
    </Row>
  </div>
);

const Step2: React.FC<{ f: FormData; set: (k: keyof FormData, v: string) => void }> = ({ f, set }) => (
  <div className="space-y-4">
    <Row>
      <div>
        <Label required>Mobile</Label>
        <Input value={f.mobile} onChange={e => set('mobile', e.target.value)} placeholder="9876543210" maxLength={10} />
      </div>
      <div>
        <Label required>Email</Label>
        <Input type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="investor@example.com" />
      </div>
    </Row>
    <div>
      <Label required>Address Line 1</Label>
      <Input value={f.address1} onChange={e => set('address1', e.target.value)} placeholder="Flat No. 102, ABC Apartments" />
    </div>
    <div>
      <Label>Address Line 2</Label>
      <Input value={f.address2} onChange={e => set('address2', e.target.value)} placeholder="Street / Area" />
    </div>
    <div>
      <Label>Address Line 3</Label>
      <Input value={f.address3} onChange={e => set('address3', e.target.value)} placeholder="City, State" />
    </div>
    <div className="max-w-xs">
      <Label required>PIN Code</Label>
      <Input value={f.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400010" maxLength={6} />
    </div>
  </div>
);

const Step3: React.FC<{ f: FormData; set: (k: keyof FormData, v: string) => void }> = ({ f, set }) => (
  <div className="space-y-4">
    <Row>
      <div>
        <Label required>IFSC Code</Label>
        <Input value={f.ifsc} onChange={e => set('ifsc', e.target.value.toUpperCase())} placeholder="ICIC0000001" maxLength={11} />
      </div>
      <div>
        <Label required>Account Type</Label>
        <Select value={f.accountType} onChange={e => set('accountType', e.target.value)}>
          {BANK_ACC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>
    </Row>
    <div>
      <Label required>Account Number</Label>
      <MaskedInput
        maskFn={maskAccNo}
        value={f.accountNumber}
        onChange={e => set('accountNumber', e.target.value)}
        placeholder="001234567890123"
      />
    </div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
      Bank account will be used for redemption payouts and mandate registration.
    </div>
  </div>
);

const Step4: React.FC<{ f: FormData; set: (k: keyof FormData, v: string) => void }> = ({ f, set }) => (
  <div className="space-y-4">
    <Row>
      <div>
        <Label required>Place of Birth</Label>
        <Input value={f.birthPlace} onChange={e => set('birthPlace', e.target.value)} placeholder="Mumbai" />
      </div>
      <div>
        <Label required>Father's Name</Label>
        <Input value={f.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="RAMESH GOEL" />
      </div>
    </Row>
    <Row>
      <div>
        <Label>Spouse Name</Label>
        <Input value={f.spouseName} onChange={e => set('spouseName', e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <Label required>Wealth Source</Label>
        <Select value={f.wealthSource} onChange={e => set('wealthSource', e.target.value)}>
          {WEALTH_SOURCES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </Select>
      </div>
    </Row>
    <Row>
      <div>
        <Label required>Annual Income</Label>
        <Select value={f.incomeSlab} onChange={e => set('incomeSlab', e.target.value)}>
          {INCOME_SLABS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>
      <div>
        <Label required>Politically Exposed</Label>
        <Select value={f.politicallyExposed} onChange={e => set('politicallyExposed', e.target.value)}>
          <option value="N">No</option>
          <option value="Y">Yes</option>
          <option value="R">Related to PEP</option>
        </Select>
      </div>
    </Row>
    <Row>
      <div>
        <Label required>Net Worth (₹)</Label>
        <Input type="number" value={f.netWorth} onChange={e => set('netWorth', e.target.value)} placeholder="125000" />
      </div>
      <div>
        <Label required>Net Worth Date</Label>
        <Input type="date" value={f.netWorthDate} onChange={e => set('netWorthDate', e.target.value)} />
      </div>
    </Row>
  </div>
);

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-xs font-semibold text-gray-800 text-right max-w-[60%] truncate">{value || '—'}</span>
  </div>
);

const ReviewSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-gray-50 rounded-xl p-4">
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
    {children}
  </div>
);

const Step5: React.FC<{ f: FormData }> = ({ f }) => (
  <div className="space-y-3">
    <ReviewSection title="Personal">
      <ReviewRow label="Client Code" value={f.clientCode} />
      <ReviewRow label="Name" value={`${f.firstName} ${f.middleName} ${f.lastName}`.trim()} />
      <ReviewRow label="PAN" value={maskPAN(f.pan)} />
      <ReviewRow label="DOB" value={f.dob} />
      <ReviewRow label="Gender" value={f.gender === 'M' ? 'Male' : f.gender === 'F' ? 'Female' : 'Transgender'} />
      <ReviewRow label="Occupation" value={OCC_CODES.find(o => o.value === f.occCode)?.label ?? f.occCode} />
    </ReviewSection>
    <ReviewSection title="Contact & Address">
      <ReviewRow label="Mobile" value={f.mobile} />
      <ReviewRow label="Email" value={f.email} />
      <ReviewRow label="Address" value={[f.address1, f.address2, f.address3].filter(Boolean).join(', ')} />
      <ReviewRow label="PIN Code" value={f.pincode} />
    </ReviewSection>
    <ReviewSection title="Bank">
      <ReviewRow label="IFSC" value={f.ifsc} />
      <ReviewRow label="Account No." value={maskAccNo(f.accountNumber)} />
      <ReviewRow label="Account Type" value={BANK_ACC_TYPES.find(t => t.value === f.accountType)?.label ?? f.accountType} />
    </ReviewSection>
    <ReviewSection title="FATCA">
      <ReviewRow label="Place of Birth" value={f.birthPlace} />
      <ReviewRow label="Father's Name" value={f.fatherName} />
      <ReviewRow label="Income Slab" value={INCOME_SLABS.find(s => s.value === f.incomeSlab)?.label ?? f.incomeSlab} />
      <ReviewRow label="Net Worth" value={f.netWorth ? `₹${Number(f.netWorth).toLocaleString('en-IN')}` : ''} />
      <ReviewRow label="Politically Exposed" value={f.politicallyExposed === 'N' ? 'No' : f.politicallyExposed === 'Y' ? 'Yes' : 'Related to PEP'} />
    </ReviewSection>
  </div>
);

// ─── Validation per step ──────────────────────────────────────────────────────
function validate(step: number, f: FormData): string {
  if (step === 1) {
    if (!f.clientCode.trim()) return 'Client Code is required.';
    if (!f.pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]$/)) return 'Enter a valid PAN (e.g. ABCDE1234F).';
    if (!f.firstName.trim()) return 'First Name is required.';
    if (!f.dob) return 'Date of Birth is required.';
  }
  if (step === 2) {
    if (!f.mobile.match(/^\d{10}$/)) return 'Enter a valid 10-digit mobile number.';
    if (!f.email.includes('@')) return 'Enter a valid email address.';
    if (!f.address1.trim()) return 'Address Line 1 is required.';
    if (!f.pincode.match(/^\d{6}$/)) return 'Enter a valid 6-digit PIN code.';
  }
  if (step === 3) {
    if (!f.ifsc.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) return 'Enter a valid IFSC code.';
    if (!f.accountNumber.trim()) return 'Account Number is required.';
  }
  if (step === 4) {
    if (!f.birthPlace.trim()) return 'Place of Birth is required.';
    if (!f.fatherName.trim()) return "Father's Name is required.";
    if (!f.netWorth || isNaN(Number(f.netWorth))) return 'Enter a valid Net Worth.';
    if (!f.netWorthDate) return 'Net Worth Date is required.';
  }
  return '';
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AddUCCPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState<FormData>(INIT);
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ clientCode: string } | null>(null);

  const set = (k: keyof FormData, v: string) => { setForm(f => ({ ...f, [k]: v })); setErr(''); };

  const next = () => {
    const e = validate(step, form);
    if (e) { setErr(e); return; }
    setErr('');
    setStep(s => s + 1);
  };

  const back = () => { setErr(''); setStep(s => s - 1); };

  const submit = async () => {
    setLoading(true);
    setErr('');
    try {
      const payload: AddUCCPayload = {
        investor: { client_code: form.clientCode },
        is_multi_ucc: false,
        parent_client_code: '',
        pms_client: false,
        holding_nature: 'SI',
        tax_code: '01',
        rdmp_idcw_pay_mode: '01',
        is_client_physical: true,
        is_client_demat: false,
        is_nomination_opted: false,
        nominee_soa: false,
        nomination_auth_mode: 'O',
        comm_mode: 'E',
        onboarding: 'Z',
        holder: [{
          holder_rank: '1',
          occ_code: form.occCode,
          auth_mode: 'M',
          is_pan_exempt: false,
          pan_exempt_category: '',
          identifier: [{ identifier_type: 'pan', identifier_number: form.pan }],
          kyc_type: form.kycType,
          ckyc_number: '',
          person: { first_name: form.firstName, middle_name: form.middleName, last_name: form.lastName, dob: form.dob, gender: form.gender },
          contact: [{ contact_number: form.mobile, country_code: '91', whose_contact_number: 'SE', email_address: form.email, whose_email_address: 'SE', contact_type: 'PR' }],
          nomination: [],
        }],
        comm_addr: { address_line_1: form.address1, address_line_2: form.address2, address_line_3: form.address3, comm_mode: 'E', postalcode: form.pincode, address_id: 0 },
        bank_account: [{ ifsc_code: form.ifsc, bank_acc_num: form.accountNumber, bank_acc_type: form.accountType, account_owner: 'SELF' }],
        fatca: [{
          HolderRank: '1',
          place_of_birth: form.birthPlace,
          country_of_birth: 'IND',
          client_name: `${form.firstName} ${form.lastName}`.trim(),
          investor_type: 'Individual',
          dob: form.dob,
          father_name: form.fatherName,
          spouse_name: form.spouseName,
          address_type: '1',
          occ_code: form.occCode,
          occ_type: 'B',
          tax_status: 'Individual',
          identifier: { identifier_type: 'pan', identifier_number: form.pan },
          wealth_source: form.wealthSource,
          income_slab: form.incomeSlab,
          net_worth: Number(form.netWorth),
          date_of_net_worth: form.netWorthDate,
          politically_exposed: form.politicallyExposed,
          is_self_declared: true,
          data_source: 'P',
          tax_residency: [{ country: 'IND', tax_id_no: form.pan, tax_id_type: 'A' }],
        }],
        identifiers: [],
      };
      const res = await addUcc(payload);
      setSuccess({ clientCode: res.clientCode });
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to register UCC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">UCC Registered!</p>
          <p className="text-sm text-gray-500">
            Client code <span className="font-mono font-bold text-gray-800">{success.clientCode}</span> has been submitted to BSE StAR MF.
          </p>
          <button
            onClick={() => navigate('/bse-dashboard')}
            className="w-full bg-[#00b386] hover:bg-[#009e78] text-white text-sm font-bold py-3 rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/bse-dashboard')} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="font-bold text-gray-900 text-sm">Register New Investor (UCC)</p>
          <span className="ml-auto text-xs text-gray-400">Step {step} of {STEPS.length}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                step === s.id
                  ? 'bg-[#00b386] text-white'
                  : step > s.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${step > s.id ? 'bg-emerald-300' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="font-bold text-gray-900 mb-5">
            {STEPS[step - 1].label === 'Review' ? 'Review & Submit' : `${STEPS[step - 1].label} Details`}
          </p>

          {step === 1 && <Step1 f={form} set={set} />}
          {step === 2 && <Step2 f={form} set={set} />}
          {step === 3 && <Step3 f={form} set={set} />}
          {step === 4 && <Step4 f={form} set={set} />}
          {step === 5 && <Step5 f={form} />}

          {/* Error */}
          {err && (
            <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700 font-medium">
              {err}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={back}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length ? (
              <button
                onClick={next}
                className="ml-auto flex items-center gap-1.5 bg-[#00b386] hover:bg-[#009e78] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="ml-auto flex items-center gap-2 bg-[#00b386] hover:bg-[#009e78] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit to BSE'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUCCPage;
