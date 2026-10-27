require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:8081',
  nse: {
    baseUrl:  process.env.NSE_BASE_URL  || 'http://165.22.218.229',
    username: process.env.NSE_USERNAME,
    password: process.env.NSE_PASSWORD,
  },
  kycHub: {
    baseUrl: process.env.KYC_HUB_BASE_URL,
    token:   process.env.KYC_HUB_TOKEN,
  },
  rkyc: {
    baseUrl: process.env.RKYC_BASE_URL || 'https://api.cra.in.kychub.com',
    token:   process.env.RKYC_TOKEN,
  },
  investwell: {
    baseUrl:  process.env.INVESTWELL_BASE_URL  || 'https://lendrixventech.investwell.app/api',
    authName: process.env.INVESTWELL_AUTHNAME  || 'LendrixApi',
    password: process.env.INVESTWELL_PASSWORD  || 'Deepak6543',
  },
  starmf: {
    baseUrl:  process.env.STARMF_BASE_URL  || 'https://starmfv2demo.bseindia.com/api',
    username: process.env.STARMF_USERNAME,
    password: process.env.STARMF_PASSWORD,
  },
};
