# Project Walkthrough: Blockchain VIN Setup

This guide provides step-by-step instructions to set up and run the Blockchain VIN project from scratch.

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Ganache** (UI or CLI) - For local blockchain
- **MySQL** (Server & Workbench) - For the backend database

---

## 🚀 Step 1: Smart Contracts Setup

1. **Install Dependencies**:
   ```bash
   cd smart-contracts
   npm install
   ```

2. **Environment Configuration**:
   
     ```bash
     cp .env.example .env
     ```
   - Open [.env] and fill in the **Private Keys** from your Ganache instance. 
     > [!IMPORTANT]
     > Ensure the `DEPLOYER_PRIVATE_KEY` is the first account in Ganache as it will pay for refinements.

3. **Compile & Deploy**:
   - Compile the contracts:
     ```bash
     npx hardhat compile
     ```
   - Deploy to Ganache:
     ```bash
     npx hardhat run scripts/deploy.ts --network ganache
     ```
     > [!TIP]
     > The deployment script is "smart" — it will automatically update the [.env] files in both the `backend` and `frontend` folders with the new contract addresses.

---

## ⚙️ Step 2: Backend Setup (NestJS)

1. **Install Dependencies**:
   ```bash
   cd ../backend
   npm install
   ```

2. **Database Configuration**:
   - Copy [.env.example] to [.env]:
     ```bash
     cp .env.example .env
     ```
   - Ensure your MySQL credentials (`DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`) are correct.
   - Create the database `blockchain_vin` in your MySQL server if it doesn't exist.

3. **Run Migrations**:
   ```bash
   npm run migration:run
   ```

4. **Start the Server**:
   ```bash
   npm run start:dev
   ```

---

## 💻 Step 3: Frontend Setup (Vite)

1. **Install Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

2. **Run the Application**:
   - The [.env] file should already be updated with role addresses by the smart-contracts deploy script.
   - Start the development server:
     ```bash
     npm run dev
     ```

---

## ✅ Summary of Roles
Once the system is running, the following roles are configured in the system:
- **Manufacturer**: Mints new vehicle NFTs.
- **Dealer**: Handles sales and transfers.
- **DLT Officer**: Registers vehicles and plates.
- **Service Provider**: Adds service logs to the lifecycle.
- **Consumer/Lender/Insurer**: Interacts with liens and consents.

Enjoy building!
