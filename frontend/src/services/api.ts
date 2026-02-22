const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

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

