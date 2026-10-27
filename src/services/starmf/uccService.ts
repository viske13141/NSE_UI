import { bsePost, bseGet } from './starmfApi';

export interface UCCListRequest {
  count_only: boolean;
  start: number;
  length: number;
  fields: string[];
  member?: {
    member_id?: string;
  };
  investor?: {
    client_code?: string;
  };
  filter_param?: Record<string, any>;
  ucc_status?: string;
}

export interface BankAccount {
  ifsc_code: string;
  bank_acc_num: string;
  bank_acc_type: string;
  account_owner: string;
}

export interface Holder {
  holder_rank: string;
  occ_code: string;
  auth_mode: string;
  is_pan_exempt: boolean;
  pan_exempt_category: string;
  is_pan_verified: boolean;
  identifier: Array<{
    identifier_type: string;
    identifier_number: string;
    is_active: boolean;
    expiry_date?: string;
  }>;
  kyc_type: string;
  person: {
    first_name: string;
    last_name: string;
    dob: string;
    gender: string;
  };
  contact: Array<{
    contact_number: string;
    email_address: string;
    is_foreign: boolean;
  }>;
}

export interface UCCData {
  member: {
    member_id: string;
  };
  investor: {
    client_code: string;
  };
  holding_nature: string;
  tax_status: string;
  tax_code: string;
  rdmp_idcw_pay_mode: string;
  is_client_physical: boolean | null;
  is_client_demat: boolean;
  is_nomination_opted: boolean;
  nomination_auth_mode: string;
  comm_mode: string;
  onboarding: string;
  ucc_status: string;
  holder: Holder[];
  comm_addr: {
    address_line_1: string;
  };
  bank_account: BankAccount[];
  depository: Array<{
    depository_code: string;
    dp_id: string;
    client_id: string;
    bank_acc_num: string;
    account_owner: string;
  }>;
}

export interface UCCListResponse {
  status: string;
  data: {
    count: number;
    lists: UCCData[];
  };
  messages: string[] | null;
}

// ─── Add UCC types ───────────────────────────────────────────────────────────
export interface NomineeGuardian {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  dob: string;
  is_pan_exempt: boolean;
  pan_exempt_category: string;
  identifier: Array<{ identifier_type: string; identifier_number: string }>;
}

export interface Nominee {
  person: { first_name: string; middle_name?: string; last_name?: string; dob: string };
  contact: { contact_number: string; country_code: string; whose_contact_number: string; email_address: string; whose_email_address: string; contact_type: string };
  comm_addr: { address_line_1: string; address_line_2?: string; address_line_3?: string; comm_mode: string; postalcode: string; country?: string; state?: string; City?: string };
  nomination_percent: string;
  nomination_relation: string;
  is_pan_exempt: boolean;
  pan_exempt_category: string;
  is_minor: boolean;
  identifier: Array<{ identifier_type: string; identifier_number: string }>;
  guardian?: NomineeGuardian;
}

export interface AddUCCHolder {
  holder_rank: string;
  occ_code: string;
  auth_mode: string;
  is_pan_exempt: boolean;
  pan_exempt_category: string;
  identifier: Array<{ identifier_type: string; identifier_number: string; expiry_date?: string }>;
  kyc_type: string;
  ckyc_number: string;
  person: { first_name: string; middle_name?: string; last_name?: string; dob: string; gender: string };
  contact: Array<{ contact_number: string; country_code: string; whose_contact_number: string; email_address: string; whose_email_address: string; contact_type: string }>;
  nomination?: Nominee[];
}

export interface FATCAEntry {
  HolderRank: string;
  place_of_birth: string;
  country_of_birth: string;
  client_name: string;
  investor_type: string;
  dob: string;
  father_name: string;
  spouse_name?: string;
  address_type: string;
  occ_code: string;
  occ_type: string;
  tax_status: string;
  identifier: { identifier_type: string; identifier_number: string };
  wealth_source: string;
  income_slab: string;
  net_worth: number;
  date_of_net_worth: string;
  politically_exposed: string;
  is_self_declared: boolean;
  data_source: string;
  tax_residency: Array<{ country: string; tax_id_no: string; tax_id_type: string }>;
}

export interface AddUCCPayload {
  investor: { client_code: string };
  is_multi_ucc: boolean;
  parent_client_code: string;
  pms_client: boolean;
  pms_code?: string;
  holding_nature: string;
  tax_code: string;
  rdmp_idcw_pay_mode: string;
  is_client_physical: boolean;
  is_client_demat: boolean;
  is_nomination_opted: boolean;
  nominee_soa: boolean;
  nomination_auth_mode: string;
  comm_mode: string;
  onboarding: string;
  holder: AddUCCHolder[];
  comm_addr: { address_line_1: string; address_line_2?: string; address_line_3?: string; comm_mode: string; postalcode: string; address_id: number };
  bank_account: BankAccount[];
  fatca: FATCAEntry[];
  identifiers: Array<{ identifier_type: string; issue_date?: string; expiry_date?: string; file_name: string; file_size: number; file_blob: string; additional_info: null }>;
}

// ─── Update UCC types ────────────────────────────────────────────────────────
export interface UpdateUccResponse {
  status: string;
  data?: any;
  messages?: string[] | null;
}

export interface BankAccountWithProof extends BankAccount {
  identifier?: {
    add: Array<{
      identifier_type: string;
      file_name: string;
      file_size: number;
      file_blob: string;
      additional_info: null;
    }>;
  };
}

export interface UccAddress {
  address_line_1: string;
  address_line_2?: string;
  address_line_3?: string;
  postalcode: string;
}

export async function updateUccBankAccount(
  clientCode: string,
  memberId = '',
  options: { addAccounts?: BankAccountWithProof[]; deleteAccounts?: BankAccountWithProof[] }
): Promise<UpdateUccResponse> {
  const bank_account: Record<string, BankAccountWithProof[]> = {};
  if (options.addAccounts?.length)    bank_account.add    = options.addAccounts;
  if (options.deleteAccounts?.length) bank_account.delete = options.deleteAccounts;
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      bank_account,
    },
  });
  return data;
}

// ─── FATCA / Profile update types ────────────────────────────────────────────
export interface FatcaDeclaration {
  dob: string;
  clientName: string;
  pan: string;
  placeOfBirth?: string;
  countryOfBirth?: string;
}

export interface FullFatcaDeclaration {
  holderRank: string;
  placeOfBirth: string;
  countryOfBirth: string;
  clientName: string;
  investorType: string;
  dob: string;
  fatherName: string;
  spouseName?: string;
  addressType: string;
  occCode: string;
  occType: string;
  taxStatus: string;
  pan: string;
  corporateServiceSector?: string;
  wealthSource: string;
  incomeSlab: string;
  netWorth: number;
  dateOfNetWorth: string;
  politicallyExposed: string;
  isSelfDeclared: boolean;
  dataSource: string;
  taxResidency: Array<{ country: string; tax_id_no: string; tax_id_type: string }>;
}

export interface HolderDetail {
  holderRank: string;
  occCode: string;
  isPanExempt: boolean;
  kycType: string;
  pan: string;
  contact: { contactNumber: string; countryCode: string; whoseContactNumber: string; emailAddress: string; whoseEmailAddress: string; contactType: string };
  person: { firstName: string; middleName?: string; lastName?: string; dob: string; gender: string };
}

// ─── Person / Contact / Identifier / DP types ─────────────────────────────────────────
export type IdentifierEntry =
  | { identifier_type: 'aof' | 'aof_ria'; issue_date?: string; expiry_date?: string; file_name: string; file_size: number; file_blob?: string }
  | { identifier_type: 'elog'; identifier_number: string }
  | { identifier_type: string; identifier_number?: string; file_name?: string; file_size?: number; file_blob?: string; additional_info?: null };

export interface DepositoryEntry {
  depository_code: 'NSDL' | 'CDSL';
  dp_id: string;
  client_id: string;
  cmbp_id?: string;
  bank_account: string;
  account_owner: string;
  identifier?: { add: Array<{ identifier_type: string; identifier_number?: string; file_name: string; file_size: number; file_blob?: string; additional_info: null }> };
}

export async function updateUccStatus(
  clientCode: string,
  memberId = '',
  options: { isClientDemat: boolean; isClientPhysical: boolean; depository?: DepositoryEntry }
): Promise<UpdateUccResponse> {
  const payload: Record<string, any> = {
    member: { member_id: memberId },
    investor: { client_code: clientCode },
    is_client_demat: options.isClientDemat,
    is_client_physical: options.isClientPhysical,
  };
  if (options.isClientDemat && options.depository) {
    payload.depository = { add: [options.depository] };
  }
  const { data } = await bsePost('/v2/update_ucc', { data: payload });
  return data;
}

export async function updateUccHoldingNature(
  clientCode: string,
  memberId = '',
  options: { holdingNature: 'JO' | 'AS' | 'SI'; newHolder: HolderDetail; fatca: FullFatcaDeclaration; deleteHolderRank?: string }
): Promise<UpdateUccResponse> {
  // Delegates to updateUccProfile — same payload shape, different intent
  return updateUccProfile(clientCode, memberId, {
    holdingNature: options.holdingNature,
    holder: options.newHolder,
    fatca: options.fatca,
    deleteHolderRank: options.deleteHolderRank,
  });
}

export async function updateUccPerson(
  clientCode: string,
  memberId = '',
  holderRank: string,
  person: { firstName: string; middleName?: string; lastName: string; dob: string },
  pan: { identifierType: string; identifierNumber: string }
): Promise<UpdateUccResponse> {
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      holder: {
        add: [{
          holder_rank: holderRank,
          is_pan_exempt: false,
          identifier: { identifier_type: pan.identifierType, identifier_number: pan.identifierNumber },
          person: {
            first_name: person.firstName,
            middle_name: person.middleName ?? '',
            last_name: person.lastName,
            dob: person.dob,
          },
        }],
      },
    },
  });
  return data;
}

export async function updateUccContact(
  clientCode: string,
  memberId = '',
  holderRank: string,
  contact: { contactNumber: string; countryCode: string; whoseContactNumber: string; emailAddress: string; whoseEmailAddress: string; extension?: string; faxNo?: string; contactType: string }
): Promise<UpdateUccResponse> {
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member_code: { member_id: memberId },  // BSE uses member_code here
      investor: { client_code: clientCode },
      holder: {
        add: [{
          holder_rank: holderRank,
          occ_code: '02',
          is_pan_exempt: false,
          kyc_type: 'B',
          contact: [{
            contact_number: contact.contactNumber,
            country_code: contact.countryCode,
            whose_contact_number: contact.whoseContactNumber,
            email_address: contact.emailAddress,
            whose_email_address: contact.whoseEmailAddress,
            contact_type: contact.contactType,
            ...(contact.extension ? { extension: contact.extension } : {}),
            ...(contact.faxNo     ? { fax_no: contact.faxNo }         : {}),
          }],
        }],
      },
    },
  });
  return data;
}

export async function updateUccIdentifier(
  clientCode: string,
  memberId = '',
  options: { add?: IdentifierEntry[]; delete?: IdentifierEntry[] }
): Promise<UpdateUccResponse> {
  const identifier: Record<string, IdentifierEntry[]> = {};
  if (options.add?.length)    identifier.add    = options.add;
  if (options.delete?.length) identifier.delete = options.delete;
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      identifier,
    },
  });
  return data;
}

export async function updateUccDpDetails(
  clientCode: string,
  memberId = '',
  options: { add?: DepositoryEntry[]; delete?: DepositoryEntry[] }
): Promise<UpdateUccResponse> {
  const depository: Record<string, DepositoryEntry[]> = {};
  if (options.add?.length)    depository.add    = options.add;
  if (options.delete?.length) depository.delete = options.delete;
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      depository,
    },
  });
  return data;
}

export async function updateUccFatca(
  clientCode: string,
  memberId = '',
  holderRank: string,
  fatca: FatcaDeclaration
): Promise<UpdateUccResponse> {
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      holder: {
        add: [{
          holder_rank: holderRank,
          is_pan_exempt: false,
          identifier: { identifier_type: 'pan', identifier_number: fatca.pan },
          person: { first_name: fatca.clientName, dob: fatca.dob },
        }],
      },
      fatca: {
        add: [{
          HolderRank: holderRank,   // BSE uses PascalCase here — intentional
          dob: fatca.dob,
          client_name: fatca.clientName,
          identifier: { identifier_type: 'pan', identifier_number: fatca.pan },
        }],
      },
    },
  });
  return data;
}

export async function updateUccProfile(
  clientCode: string,
  memberId = '',
  profile: {
    holdingNature?: 'SI' | 'JO' | 'AS';
    holder: HolderDetail;
    fatca: FullFatcaDeclaration;
    deleteHolderRank?: string;
  }
): Promise<UpdateUccResponse> {
  const holderAdd = [{
    holder_rank: profile.holder.holderRank,
    occ_code: profile.holder.occCode,
    is_pan_exempt: profile.holder.isPanExempt,
    kyc_type: profile.holder.kycType,
    identifier: { add: [{ identifier_type: 'pan', identifier_type_id: 2, identifier_number: profile.holder.pan }] },
    contact: [{
      contact_number: profile.holder.contact.contactNumber,
      country_code: profile.holder.contact.countryCode,
      whose_contact_number: profile.holder.contact.whoseContactNumber,
      email_address: profile.holder.contact.emailAddress,
      whose_email_address: profile.holder.contact.whoseEmailAddress,
      contact_type: profile.holder.contact.contactType,
    }],
    person: {
      first_name: profile.holder.person.firstName,
      middle_name: profile.holder.person.middleName ?? '',
      last_name: profile.holder.person.lastName ?? '',
      dob: profile.holder.person.dob,
      gender: profile.holder.person.gender,
    },
  }];

  const f = profile.fatca;
  const fatcaAdd = [{
    holder_rank: f.holderRank,   // lowercase in full-profile variant
    place_of_birth: f.placeOfBirth,
    country_of_birth: f.countryOfBirth,
    client_name: f.clientName,
    investor_type: f.investorType,
    dob: f.dob,
    father_name: f.fatherName,
    spouse_name: f.spouseName ?? '',
    address_type: f.addressType,
    occ_code: f.occCode,
    occ_type: f.occType,
    tax_status: f.taxStatus,
    identifier: { identifier_type: 'pan', identifier_number: f.pan },
    ...(f.corporateServiceSector ? { corporate_service_sector: f.corporateServiceSector } : {}),
    wealth_source: f.wealthSource,
    income_slab: f.incomeSlab,
    net_worth: f.netWorth,
    date_of_net_worth: f.dateOfNetWorth,
    politically_exposed: f.politicallyExposed,
    is_self_declared: f.isSelfDeclared,
    data_source: f.dataSource,
    tax_residency: f.taxResidency,
  }];

  const payload: Record<string, any> = {
    member: { member_id: memberId },
    investor: { client_code: clientCode },
    holder: {
      add: holderAdd,
      ...(profile.deleteHolderRank ? { delete: [{ holder_rank: profile.deleteHolderRank }] } : {}),
    },
    fatca: {
      add: fatcaAdd,
      ...(profile.deleteHolderRank ? { delete: [{ holder_rank: profile.deleteHolderRank }] } : {}),
    },
  };

  if (profile.holdingNature) payload.holding_nature = profile.holdingNature;

  const { data } = await bsePost('/v2/update_ucc', { data: payload });
  return data;
}

export async function updateUccNominee(
  clientCode: string,
  memberId = '',
  nominees: NomineeInput[]
): Promise<UpdateUccResponse> {
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member_code: { member_id: memberId },
      investor: { client_code: clientCode },
      holder: {
        add: nominees.map(n => ({
          holder_rank: n.holderRank,
          occ_code: n.occCode,
          is_pan_exempt: n.isPanExempt,
          kyc_type: n.kycType,
          nominee_soa: n.nomineeSoa,
          nomination: [{
            person: {
              first_name: n.person.firstName,
              middle_name: n.person.middleName ?? '',
              last_name: n.person.lastName,
              dob: n.person.dob,
            },
            contact: {
              contact_number: n.contact.contactNumber,
              country_code: n.contact.countryCode,
              whose_contact_number: n.contact.whoseContactNumber,
              email_address: n.contact.emailAddress,
              whose_email_address: n.contact.whoseEmailAddress,
              contact_type: n.contact.contactType,
            },
            comm_addr: {
              address_line_1: n.commAddr.addressLine1,
              address_line_2: n.commAddr.addressLine2 ?? '',
              address_line_3: n.commAddr.addressLine3 ?? '',
              comm_mode: n.commAddr.commMode,
              postalcode: n.commAddr.postalCode,
              country: n.commAddr.country,
              state: n.commAddr.state,
              City: n.commAddr.city,   // BSE schema uses capital C
            },
            nomination_percent: n.nominationPercent,
            nomination_relation: n.nominationRelation,
            is_pan_exempt: n.isPanExempt,
            pan_exempt_category: n.panExemptCategory ?? '',
            is_minor: n.isMinor,
            identifier: n.identifier.map(id => ({
              identifier_type: id.identifierType,
              identifier_number: id.identifierNumber,
            })),
            ...(n.isMinor && n.guardian ? {
              guardian: {
                first_name: n.guardian.firstName,
                middle_name: n.guardian.middleName ?? '',
                last_name: n.guardian.lastName ?? '',
                dob: n.guardian.dob ?? '',
                is_pan_exempt: n.guardian.isPanExempt,
                pan_exempt_category: n.guardian.panExemptCategory ?? '',
                identifier: n.guardian.identifier.map(id => ({
                  identifier_type: id.identifierType,
                  identifier_number: id.identifierNumber,
                })),
              },
            } : {}),
          }],
        })),
      },
    },
  });
  return data;
}

export interface NomineeInput {
  holderRank: string;
  occCode: string;
  isPanExempt: boolean;
  kycType: string;
  nomineeSoa: boolean;
  person: { firstName: string; middleName?: string; lastName: string; dob: string };
  contact: { contactNumber: string; countryCode: string; whoseContactNumber: string; emailAddress: string; whoseEmailAddress: string; contactType: string };
  commAddr: { addressLine1: string; addressLine2?: string; addressLine3?: string; commMode: string; postalCode: string; country: string; state: string; city: string };
  nominationPercent: string;
  nominationRelation: string;
  panExemptCategory?: string;
  isMinor: boolean;
  identifier: { identifierType: string; identifierNumber: string }[];
  guardian?: { firstName: string; middleName?: string; lastName?: string; dob?: string; isPanExempt: boolean; panExemptCategory?: string; identifier: { identifierType: string; identifierNumber: string }[] };
}

export async function updateUccAddress(
  clientCode: string,
  memberId = '',
  addressType: 'communication' | 'foreign',
  address: UccAddress
): Promise<UpdateUccResponse> {
  const addrKey = addressType === 'communication' ? 'comm_addr' : 'foreign_addr';
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      [addrKey]: {
        address_line_1: address.address_line_1,
        address_line_2: address.address_line_2 ?? '',
        address_line_3: address.address_line_3 ?? '',
        postalcode: address.postalcode,
      },
    },
  });
  return data;
}

export async function deactivateUcc(clientCode: string, memberId = '', parentClientCode = ''): Promise<any> {
  const { data } = await bsePost('/v2/update_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
      parent_client_code: parentClientCode,
      ucc_status: 'INACTIVE',
    },
  });
  return data?.data;
}

export async function getUcc(clientCode: string, memberId = ''): Promise<any> {
  const { data } = await bsePost('/v2/get_ucc', {
    data: {
      member: { member_id: memberId },
      investor: { client_code: clientCode },
    },
  });
  return data?.data;
}

export async function addUcc(payload: AddUCCPayload): Promise<{ clientCode: string; uccMakerId: string | number }> {
  const { data } = await bsePost('/v2/add_ucc', { data: payload });
  return {
    clientCode: data?.data?.client_code,
    uccMakerId: data?.data?.id,
  };
}

export async function getUCCList(params: Partial<UCCListRequest> = {}): Promise<UCCListResponse> {
  const payload: UCCListRequest = {
    count_only: params.count_only ?? false,
    start: params.start ?? 0,
    length: params.length ?? 10000000,
    fields: params.fields ?? ['ALL'],
    member: params.member ?? {},
    investor: params.investor ?? {},
    filter_param: params.filter_param ?? {},
    ucc_status: params.ucc_status ?? 'ACTIVE',
  };

  try {
    const { data } = await bsePost('/v2/list_ucc', { data: payload });
    return data;
  } catch (err) {
    throw err;
  }
}

export async function getActiveUCCList(): Promise<UCCData[]> {
  try {
    const response = await getUCCList({
      ucc_status: 'ACTIVE',
    });

    if (response.status === 'success' && response.data?.lists) {
      return response.data.lists;
    }

    return [];
  } catch (err) {
    return [];
  }
}

export function extractBankAccounts(uccData: UCCData[]): BankAccount[] {
  const bankAccounts: BankAccount[] = [];

  uccData.forEach((ucc) => {
    if (ucc.bank_account && Array.isArray(ucc.bank_account)) {
      bankAccounts.push(...ucc.bank_account);
    }
  });

  return bankAccounts;
}

export function extractInvestorInfo(uccData: UCCData[]) {
  if (!uccData || uccData.length === 0) {
    return null;
  }

  const firstUCC = uccData[0];
  const firstHolder = firstUCC.holder?.[0];

  return {
    clientCode: firstUCC.investor?.client_code,
    memberId: firstUCC.member?.member_id,
    uccStatus: firstUCC.ucc_status,
    holdingNature: firstUCC.holding_nature,
    taxStatus: firstUCC.tax_status,
    isDematAccount: firstUCC.is_client_demat,
    holderName: firstHolder?.person
      ? `${firstHolder.person.first_name} ${firstHolder.person.last_name}`
      : '',
    holderPAN: firstHolder?.identifier?.find((id) => id.identifier_type === 'pan')?.identifier_number,
    bankAccounts: firstUCC.bank_account || [],
  };
}
