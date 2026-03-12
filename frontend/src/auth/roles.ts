
export enum UserRole {
  MANUFACTURER = 'MANUFACTURER',
  DEALER = 'DEALER',
  CONSUMER = 'CONSUMER',
  DLT_OFFICER = 'DLT_OFFICER',
  LENDER = 'LENDER', // Finance
  INSURER = 'INSURER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  INSPECTOR = 'INSPECTOR',
}

export const RolePermissions = {
  [UserRole.MANUFACTURER]: ['/manufacturer'],
  [UserRole.DEALER]: ['/dealer'],
  [UserRole.CONSUMER]: ['/consumer'],
  [UserRole.DLT_OFFICER]: ['/dlt'],
  [UserRole.LENDER]: ['/finance'],
  [UserRole.INSURER]: ['/insurance'],
  [UserRole.SERVICE_PROVIDER]: ['/service'],
  [UserRole.INSPECTOR]: ['/inspection'],
};

export const RoleNames = {
  [UserRole.MANUFACTURER]: 'Manufacturer',
  [UserRole.DEALER]: 'Dealer',
  [UserRole.CONSUMER]: 'Consumer',
  [UserRole.DLT_OFFICER]: 'DLT Officer',
  [UserRole.LENDER]: 'Finance / Lender',
  [UserRole.INSURER]: 'Insurer',
  [UserRole.SERVICE_PROVIDER]: 'Service Center',
  [UserRole.INSPECTOR]: 'Inspection Center (Tor-Ror-Or)',
};

// Real Address Mapping for Roles via Environment Variables
const buildRoleMap = (): Record<string, UserRole> => {
  const map: Record<string, UserRole> = {};
  
  const addIfValid = (address: string | undefined, role: UserRole) => {
    if (address && address.trim() !== '') {
      map[address.toLowerCase()] = role;
    }
  };

  addIfValid(import.meta.env.VITE_MANUFACTURER_ADDRESS, UserRole.MANUFACTURER);
  addIfValid(import.meta.env.VITE_DEALER_ADDRESS, UserRole.DEALER);
  addIfValid(import.meta.env.VITE_DLT_OFFICER_ADDRESS, UserRole.DLT_OFFICER);
  addIfValid(import.meta.env.VITE_CONSUMER_ADDRESS, UserRole.CONSUMER);
  addIfValid(import.meta.env.VITE_LENDER_ADDRESS, UserRole.LENDER);
  addIfValid(import.meta.env.VITE_INSURER_ADDRESS, UserRole.INSURER);
  addIfValid(import.meta.env.VITE_SERVICE_PROVIDER_ADDRESS, UserRole.SERVICE_PROVIDER);
  addIfValid(import.meta.env.VITE_INSPECTOR_ADDRESS, UserRole.INSPECTOR);

  return map;
};

export const REAL_ADDRESS_ROLE_MAP = buildRoleMap();
