import { AppDataSource } from './data-source';
import * as fs from 'fs';
import * as path from 'path';

async function exportSampleData() {
  try {
    console.log('🚀 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected.');

    const sampleDir = path.join(__dirname, 'samples');
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir);
    }

    const entities = AppDataSource.entityMetadatas;

    for (const entity of entities) {
      const entityName = entity.name;
      const tableName = entity.tableName;
      const repository = AppDataSource.getRepository(entity.target);

      console.log(`📦 Exporting 10 records from ${entityName} (${tableName})...`);
      
      const data = await repository.find({
        take: 10,
      });

      const filePath = path.join(sampleDir, `${tableName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      console.log(`💾 Saved ${data.length} records to ${tableName}.json`);
    }

    await AppDataSource.destroy();
    console.log('🏁 Export completed successfully.');
  } catch (error) {
    console.error('❌ Error during export:', error);
    process.exit(1);
  }
}

exportSampleData();
