const { ethers } = require("ethers");
const path = require("path");

// 1. นำเข้าไฟล์ ABI ทุกตัวที่เรามีในโปรเจค
const artifactsPath = "../../smart-contracts/artifacts/contracts";
const abis = {
    "VehicleRegistry": require(path.resolve(__dirname, `${artifactsPath}/VehicleRegistry.sol/VehicleRegistry.json`)).abi,
    "VehicleNFT": require(path.resolve(__dirname, `${artifactsPath}/VehicleNFT.sol/VehicleNFT.json`)).abi,
    "VehicleLifecycle": require(path.resolve(__dirname, `${artifactsPath}/VehicleLifecycle.sol/VehicleLifecycle.json`)).abi,
    "VehicleLien": require(path.resolve(__dirname, `${artifactsPath}/VehicleLien.sol/VehicleLien.json`)).abi,
    "VehicleConsent": require(path.resolve(__dirname, `${artifactsPath}/VehicleConsent.sol/VehicleConsent.json`)).abi
};

// 2. สร้าง Interface แยกตามแต่ละ Contract
const interfaces = {};
for (const [name, abi] of Object.entries(abis)) {
    interfaces[name] = new ethers.Interface(abi);
}

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

async function getDecodedBlockData(blockNumber) {
    const block = await provider.getBlock(blockNumber, true);
    
    console.log("Block Number:", block.number);
    console.log("===========================================\n");

    block.prefetchedTransactions.forEach((tx, index) => {
        console.log(`--- Transaction #${index + 1} ---`);
        console.log("Tx Hash :", tx.hash);
        
        const rawData = tx.data;
        console.log("Raw Data:", rawData.substring(0, 50) + "... (ย่อให้สั้นลง)");
        
        if (rawData !== "0x" && rawData !== "0x0" && rawData.length > 2) {
            let decoded = null;
            let contractName = "";

            // 3. วนลูปทดสอบถอดรหัสด้วย ABI ทุกตัว
            for (const [name, iface] of Object.entries(interfaces)) {
                try {
                    const result = iface.parseTransaction({ data: rawData, value: tx.value });
                    if (result) {
                        decoded = result;
                        contractName = name;
                        break; // เจอแล้ว หยุดหา
                    }
                } catch (e) {
                    // ข้ามอันที่พัง
                }
            }
            
            if (decoded) {
                console.log(`\n[ ✅ ถอดรหัสสำเร็จ! Transaction นี้ส่งหาสัญญา: ${contractName} ]`);
                console.log("ชื่อฟังก์ชันที่ถูกเรียก (Function Name):", decoded.name);
                console.log("ข้อมูลที่ส่งไป (Arguments) : ");
                
                // วนลูปเพื่อดึง "ชื่อตัวแปร", "ชนิดข้อมูล", และ "ค่าที่ส่ง" มาโชว์ให้ชัดเจน
                decoded.fragment.inputs.forEach((input, i) => {
                    const argName = input.name || `ตัวแปรที่ ${i + 1}`;
                    const argType = input.type;
                    const argValue = decoded.args[i].toString();
                    
                    console.log(`   🔸 ${argName} (${argType}): ${argValue}`);
                });
            } else {
                console.log("\n[ ❌ ถอดรหัสไม่ได้: ABI ของเราทั้งหมดไม่ตรงกับ Function Selector ในนี้ ]");
            }
        } else {
            console.log("\n[ ข้อมูลดิบว่างเปล่า: อาจจะเป็นแค่การโอน ETH ธรรมดา ]");
        }
        console.log(`\n===========================================`);
    });
}

// ใส่เลขบล็อกที่คุณต้องการดู
getDecodedBlockData(813);
