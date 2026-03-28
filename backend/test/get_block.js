const { ethers } = require("ethers");
// เชื่อมต่อกับ Ganache RPC
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

async function getBlockData(blockNumber) {
    // ใส่พารามิเตอร์ตัวที่สองเป็น true เพื่อดึงข้อมูล Transaction แบบละเอียดมาด้วย
    const block = await provider.getBlock(blockNumber, true);
    
    console.log("Block Number:", block.number);
    console.log("จำนวน Transaction ในบล็อกนี้:", block.prefetchedTransactions.length);
    
    // ดูข้อมูลแต่ละ Transaction แบบละเอียดที่สุด (โชว์ทุก Field ที่ดึงได้)
    block.prefetchedTransactions.forEach((tx, index) => {
        console.log(`\n===========================================`);
        console.log(`           Transaction #${index + 1}`);
        console.log(`===========================================`);
        
        // 1. ข้อมูลพื้นฐานของการส่ง
        console.log("[ Basic Info ]");
        console.log("Tx Hash        :", tx.hash);
        console.log("From (Sender)  :", tx.from);
        console.log("To (Receiver)  :", tx.to); // จะเป็น null ถ้ายิงคำสั่งเพื่อ Deploy Smart Contract
        console.log("Value          :", ethers.formatEther(tx.value || 0), "ETH");
        console.log("Nonce          :", tx.nonce); // จำนวนครั้งที่กระเป๋าใบนี้เคยทำธุรกรรม (นับตั้งแต่ 0)
        console.log("Network ChainID:", tx.chainId ? Number(tx.chainId) : "N/A");
        
        // 2. ข้อมูลเกี่ยวกับตำแหน่งในระบบบล็อก
        console.log("\n[ Block Context ]");
        console.log("Block Number   :", tx.blockNumber);
        console.log("Block Hash     :", tx.blockHash);
        console.log("Tx Index       :", tx.index); // ลำดับของรอบการรันในบล็อกนั้นๆ
        
        // 3. ข้อมูล Gas (ค่าธรรมเนียมเบื้องต้น)
        console.log("\n[ Gas & Fees ]");
        console.log("Gas Limit      :", tx.gasLimit ? tx.gasLimit.toString() : "N/A");
        console.log("Gas Price      :", tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") + " Gwei" : "N/A");
        
        // (ส่วนนี้อาจจะมีหรือไม่มี ขึ้นอยู่กับว่าเป็น Tx แบบเก่า หรือแบบ EIP-1559 แบบใหม่)
        if (tx.maxFeePerGas) {
            console.log("Max Fee / Gas  :", ethers.formatUnits(tx.maxFeePerGas, "gwei") + " Gwei");
        }
        if (tx.maxPriorityFeePerGas) {
            console.log("Max Priority   :", ethers.formatUnits(tx.maxPriorityFeePerGas, "gwei") + " Gwei");
        }

        // 4. ลายเซ็นดิจิทัล (Digital Signature r, s, v) พิสูจน์ว่ามาจากเจ้าของกระเป๋าตัวจริง
        console.log("\n[ Digital Signature ]");
        if (tx.signature) {
            console.log("Signature 'v'  :", tx.signature.v);
            console.log("Signature 'r'  :", tx.signature.r);
            console.log("Signature 's'  :", tx.signature.s);
        } else {
            console.log("Signature      : Not Found");
        }

        // 5. ข้อมูลที่ยิงเข้าหา Smart Contract (Data Payload)
        console.log("\n[ Smart Contract Data ]");
        console.log("Raw Data       :", tx.data); 
        
        console.log(`===========================================\n`);
    });
}

getBlockData(815);