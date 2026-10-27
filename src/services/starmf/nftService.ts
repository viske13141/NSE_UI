import { bsePost, bseGet } from './starmfApi';

// ─── Types ────────────────────────────────────────────────────────────────────
export type NftRta = 'kfin' | 'cams';

// nct_type differs per RTA per transaction type
const NCT_TYPE: Record<NftRta, Record<'bank' | 'nominee' | 'contact', string>> = {
  kfin: { bank: 'NCTCF04', nominee: 'NCTCF02', contact: 'NCTCF03' },
  cams: { bank: 'COM',     nominee: 'NOM',      contact: 'COC'     },
};

export interface NftEnvelope {
  userId: string;
  memberCode: string;
  password: string;   // ⚠️ RTA-level credential — never log this payload
  amc: string;
  rta: NftRta;
  memberId: string;
  clientCode: string;
  entityType?: string;
  refId?: number;
}

// ─── Bank Account Change ──────────────────────────────────────────────────────
export interface NftBankInfo {
  folio_no: string;
  nct_type?: string;       // auto-set from rta
  pb_act_no: string;       // primary bank account number
  pb_hld_nam: string;      // primary holder name
  pb_ifsc_cd: string;
  pb_act_ty: string;       // SB / CA
  pb_nam: string;          // bank name
  pb_br_nam: string;       // branch name
  twofa_auth?: string;     // e.g. 'B'
  nom_opt?: string;        // 'Y' | 'N'
  doc_type?: string;       // 'E' = electronic
  // up to 5 alternate accounts (ab1_* … ab5_*)
  [key: string]: string | undefined;
}

export async function nftBankAccountChange(
  envelope: NftEnvelope,
  bankInfo: NftBankInfo[],
  image: string           // base64 PNG signature/proof
) {
  const info = bankInfo.map(b => ({ ...b, nct_type: b.nct_type ?? NCT_TYPE[envelope.rta].bank }));
  const { data } = await bsePost('/nft_bank_account_change', {
    data: {
      user_id:     envelope.userId,
      member_code: envelope.memberCode,
      password:    envelope.password,
      amc:         envelope.amc,
      rta:         envelope.rta,
      member_id:   envelope.memberId,
      client_code: envelope.clientCode,
      entity_type: envelope.entityType ?? 'UCC',
      ref_id:      envelope.refId ?? 0,
      bank_change_info: info,
      image,
    },
  });
  return data;
}

// ─── Nominee Change ───────────────────────────────────────────────────────────
export interface NftNomineeEntry {
  name: string;
  relation: string;
  percent: string;        // must sum to 100 across all nominees
  pan?: string;
  isMinor: boolean;
  dob?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPan?: string;
}

export interface NftNomineeInfo {
  folio_no: string;
  nct_type?: string;
  nominees: [NftNomineeEntry, NftNomineeEntry?, NftNomineeEntry?]; // 1–3
  j1_email?: string;
  j1_mobile?: string;
}

function flattenNominees(info: NftNomineeInfo): Record<string, string> {
  const flat: Record<string, string> = {
    folio_no: info.folio_no,
    nct_type: info.nct_type ?? '',
    ...(info.j1_email  ? { j1_email:  info.j1_email  } : {}),
    ...(info.j1_mobile ? { j1_mobile: info.j1_mobile } : {}),
  };
  info.nominees.forEach((n, i) => {
    if (!n) return;
    const p = `nom${i + 1}_`;
    flat[`${p}name`]  = n.name;
    flat[`${p}rela`]  = n.relation;
    flat[`${p}per`]   = n.percent;
    flat[`${p}pan`]   = n.pan ?? '';
    flat[`${p}min_f`] = n.isMinor ? 'Y' : 'N';
    flat[`${p}dob`]   = n.dob ?? '';
    flat[`${p}guard`] = n.isMinor ? (n.guardianName ?? '') : '';
    flat[`${p}grela`] = n.isMinor ? (n.guardianRelation ?? '') : '';
    flat[`${p}gpan`]  = n.isMinor ? (n.guardianPan ?? '') : '';
  });
  return flat;
}

export async function nftNomineeChange(
  envelope: NftEnvelope,
  nomineeInfo: NftNomineeInfo[]
) {
  const info = nomineeInfo.map(n => ({
    ...flattenNominees(n),
    nct_type: n.nct_type ?? NCT_TYPE[envelope.rta].nominee,
  }));
  const { data } = await bsePost('/nft_nominee_change', {
    data: {
      user_id:     envelope.userId,
      member_code: envelope.memberCode,
      password:    envelope.password,
      amc:         envelope.amc,
      rta:         envelope.rta,
      member_id:   envelope.memberId,
      client_code: envelope.clientCode,
      entity_type: envelope.entityType ?? 'UCC',
      ref_id:      envelope.refId ?? 0,
      nominee_change_info: info,
    },
  });
  return data;
}

// ─── Contact Change ───────────────────────────────────────────────────────────
export interface NftContactInfo {
  folio_no: string;
  nct_type?: string;
  email: string;
  mobile_no: string;
  ph_ema_dec: string;   // declaration code e.g. 'SE' (Self)
  ph_mob_dec: string;
  j1_email?: string;
  j1_mobile?: string;
  j1_ema_dec?: string;
  j1_mob_dec?: string;
  j2_email?: string;
  j2_mobile?: string;
  j2_ema_dec?: string;
  j2_mob_dec?: string;
}

export async function nftContactChange(
  envelope: NftEnvelope,
  contactInfo: NftContactInfo[],
  image: string           // base64 PNG
) {
  const info = contactInfo.map(c => ({ ...c, nct_type: c.nct_type ?? NCT_TYPE[envelope.rta].contact }));
  const { data } = await bsePost('/nft_contact_change', {
    data: {
      user_id:     envelope.userId,
      member_code: envelope.memberCode,
      password:    envelope.password,
      amc:         envelope.amc,
      rta:         envelope.rta,
      member_id:   envelope.memberId,
      client_code: envelope.clientCode,
      entity_type: envelope.entityType ?? 'UCC',
      ref_id:      envelope.refId ?? 0,
      contact_info: info,
      image,
    },
  });
  return data;
}
