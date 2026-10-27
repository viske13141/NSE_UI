import { bsePost, bseGet } from './starmfApi';

export interface KycLinkRequest {
  clientCode: string;
  memberCode: string;
  event?: string;
}

export interface KycLinkResponse {
  status: string;
  data?: { link?: string; [key: string]: any };
  messages?: string[] | null;
}

export async function getKycLink(requests: KycLinkRequest[]): Promise<KycLinkResponse> {
  const { data } = await bsePost('/v2/get_kyc_link', {
    data: requests.map(r => ({
      event: r.event ?? 'ucc_kyc_pending',
      investor: { client_code: r.clientCode },
      member_code: r.memberCode,
    })),
  });
  return data;
}
