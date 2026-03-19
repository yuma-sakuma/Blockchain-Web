const axios = require('axios');

async function testCreate() {
  try {
    // 1. Get a vehicle
    const res = await axios.get('http://localhost:3000/api/vehicles');
    const vehicle = res.data[0];
    if (!vehicle) {
      console.log('No vehicles found');
      return;
    }
    console.log(`Using vehicle: ${vehicle.tokenId} (${vehicle.vinNumber})`);

    // 2. DLT Registration
    const res1 = await axios.post('http://localhost:3000/api/events', {
      type: 'DLT_REGISTRATION_UPDATED',
      tokenId: vehicle.tokenId,
      actor: 'DLT:System',
      payload: { status: 'registered', bookNo: 'TEST-123' },
    });
    console.log('Reg updated:', res1.data.type);

    // 3. Plate Event
    const res2 = await axios.post('http://localhost:3000/api/events', {
      type: 'PLATE_EVENT_RECORDED',
      tokenId: vehicle.tokenId,
      actor: 'DLT:System',
      payload: { action: 'issue', plateNo: '9กข-9999', province: 'Bangkok' },
    });
    console.log('Plate updated:', res2.data.type);

    // 4. Verify in DB
    const res3 = await axios.get(`http://localhost:3000/api/vehicles/${vehicle.tokenId}`);
    console.log('Final Vehicle Plate Records:', res3.data.plateRecords);
    console.log('Final Vehicle Spec JSON Plate:', res3.data.specJson.plateNo);

  } catch(e) { 
      console.error(e.response?.data || e.message); 
  }
}
testCreate();
