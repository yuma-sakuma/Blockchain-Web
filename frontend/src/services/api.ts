export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = API_BASE_URL;

export const checkBackendStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/status`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const repairRegistry = async () => {
  const response = await fetch(`${API_URL}/status/repair-registry`);
  if (!response.ok) throw new Error('Failed to repair registry');
  return response.json();
};

export const getVehicles = async () => {
  const response = await fetch(`${API_URL}/vehicles`);
  if (!response.ok) throw new Error('Failed to fetch vehicles');
  return response.json();
};

export const getEvents = async () => {
  const response = await fetch(`${API_URL}/events`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
};

export const createEvent = async (eventData: any) => {
  const response = await fetch(`${API_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) throw new Error('Failed to create event');
  return response.json();
};

export const checkVinExists = async (vin: string): Promise<{ exists: boolean }> => {
  const response = await fetch(`${API_URL}/vehicles/check-vin?vin=${encodeURIComponent(vin)}`);
  if (!response.ok) throw new Error('Failed to check VIN');
  return response.json();
};

export const checkPlateExists = async (plateNo: string): Promise<{ exists: boolean }> => {
  const response = await fetch(`${API_URL}/events/check-plate?plateNo=${encodeURIComponent(plateNo)}`);
  if (!response.ok) throw new Error('Failed to check plate');
  return response.json();
};

export const uploadFile = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/files/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload file');
  return response.json();
};

