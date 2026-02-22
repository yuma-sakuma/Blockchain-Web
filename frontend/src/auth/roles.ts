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

// Mock Address Mapping for Prototype w/o Backend
export const MOCK_ADDRESS_ROLE_MAP: Record<string, UserRole> = {
  // Manufacturer (Deployer)
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266': UserRole.MANUFACTURER, // Hardhat Account #0
  '0x25597A530F44782098D7C8D11502f901878De243': UserRole.MANUFACTURER, // Demo Address 1

  // Dealer
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8': UserRole.DEALER, // Hardhat Account #1
  
  // DLT
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': UserRole.DLT_OFFICER, // Hardhat Account #2

  // Consumer
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906': UserRole.CONSUMER, // Hardhat Account #3

   // Finance
   '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65': UserRole.LENDER, // Hardhat Account #4

  // Insurance
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc': UserRole.INSURER, // Hardhat Account #5

  // Service Center
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9': UserRole.SERVICE_PROVIDER, // Hardhat Account #6

  // Inspector
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955': UserRole.INSPECTOR, // Hardhat Account #7
};
