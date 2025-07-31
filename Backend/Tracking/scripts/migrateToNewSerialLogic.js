/**
 * Migration Script: Old Serial Logic to New Serial Logic
 * 
 * This script helps migrate from the current serial number logic to the new logic.
 * It can be run safely on the production database.
 * 
 * Usage:
 * node scripts/migrateToNewSerialLogic.js [--dry-run] [--backup]
 */

const { collection, doc, getDocs, updateDoc, writeBatch } = require('firebase/firestore');
const { firestoreDb } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

class SerialLogicMigration {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.createBackup = options.backup || false;
    this.backupPath = path.join(__dirname, '../backups');
    
    console.log('🔄 Serial Logic Migration Tool');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log(`Backup: ${this.createBackup ? 'ENABLED' : 'DISABLED'}`);
  }
  
  /**
   * Run the migration process
   */
  async migrate() {
    try {
      console.log('\n🚀 Starting migration process...');
      
      // Step 1: Load current stops data
      const stops = await this.loadCurrentStops();
      console.log(`📍 Loaded ${stops.length} stops from database`);
      
      // Step 2: Create backup if requested
      if (this.createBackup) {
        await this.createDataBackup(stops);
      }
      
      // Step 3: Analyze current state
      const analysis = this.analyzeCurrentState(stops);
      this.printAnalysis(analysis);
      
      // Step 4: Prepare migration plan
      const migrationPlan = this.prepareMigrationPlan(stops);
      this.printMigrationPlan(migrationPlan);
      
      // Step 5: Execute migration (if not dry run)
      if (!this.dryRun) {
        await this.executeMigration(migrationPlan);
      } else {
        console.log('\n✅ DRY RUN COMPLETED - No changes made to database');
      }
      
      console.log('\n🎉 Migration process completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }
  
  /**
   * Load current stops data from Firestore
   */
  async loadCurrentStops() {
    try {
      const route2Ref = collection(firestoreDb, 'Route2');
      const querySnapshot = await getDocs(route2Ref);
      
      const stops = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.Latitude && data.Longitude) {
          stops.push({
            id: doc.id,
            ...data,
            serialNumber: data.serialNumber || 0,
            reached: data.reached || false
          });
        }
      });
      
      return stops.sort((a, b) => a.serialNumber - b.serialNumber);
    } catch (error) {
      console.error('Error loading stops:', error);
      throw error;
    }
  }
  
  /**
   * Create backup of current data
   */
  async createDataBackup(stops) {
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `stops-backup-${timestamp}.json`);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        totalStops: stops.length,
        stops: stops
      };
      
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`💾 Backup created: ${backupFile}`);
      
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }
  
  /**
   * Analyze current state of the database
   */
  analyzeCurrentState(stops) {
    const reachedStops = stops.filter(s => s.reached);
    const unreachedStops = stops.filter(s => !s.reached);
    
    // Find highest serial number
    const maxSerial = Math.max(...stops.map(s => s.serialNumber));
    const highestSerialStops = stops.filter(s => s.serialNumber === maxSerial);
    
    // Find gaps in serial numbers
    const serialNumbers = stops.map(s => s.serialNumber).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < maxSerial; i++) {
      if (!serialNumbers.includes(i)) {
        gaps.push(i);
      }
    }
    
    return {
      totalStops: stops.length,
      reachedStops: reachedStops.length,
      unreachedStops: unreachedStops.length,
      maxSerialNumber: maxSerial,
      highestSerialStops: highestSerialStops,
      serialGaps: gaps,
      duplicateSerials: this.findDuplicateSerials(stops)
    };
  }
  
  /**
   * Find duplicate serial numbers
   */
  findDuplicateSerials(stops) {
    const serialCounts = {};
    stops.forEach(stop => {
      serialCounts[stop.serialNumber] = (serialCounts[stop.serialNumber] || 0) + 1;
    });
    
    return Object.entries(serialCounts)
      .filter(([serial, count]) => count > 1)
      .map(([serial, count]) => ({ serial: parseInt(serial), count }));
  }
  
  /**
   * Print analysis results
   */
  printAnalysis(analysis) {
    console.log('\n📊 CURRENT STATE ANALYSIS:');
    console.log(`Total Stops: ${analysis.totalStops}`);
    console.log(`Reached Stops: ${analysis.reachedStops}`);
    console.log(`Unreached Stops: ${analysis.unreachedStops}`);
    console.log(`Max Serial Number: ${analysis.maxSerialNumber}`);
    console.log(`Highest Serial Stops: ${analysis.highestSerialStops.map(s => s.id).join(', ')}`);
    
    if (analysis.serialGaps.length > 0) {
      console.log(`⚠️ Serial Number Gaps: ${analysis.serialGaps.join(', ')}`);
    }
    
    if (analysis.duplicateSerials.length > 0) {
      console.log(`⚠️ Duplicate Serial Numbers:`);
      analysis.duplicateSerials.forEach(dup => {
        console.log(`  Serial ${dup.serial}: ${dup.count} stops`);
      });
    }
  }
  
  /**
   * Prepare migration plan
   */
  prepareMigrationPlan(stops) {
    const plan = {
      operations: [],
      summary: {
        stopsToUpdate: 0,
        batchCount: 0
      }
    };
    
    // Sort stops by current serial number (descending for reverse order)
    const sortedStops = [...stops].sort((a, b) => b.serialNumber - a.serialNumber);
    
    // Assign new serial numbers
    let newSerial = 1;
    sortedStops.forEach((stop, index) => {
      const newSerialNumber = newSerial++;
      
      // Only add to plan if serial number needs to change
      if (stop.serialNumber !== newSerialNumber) {
        plan.operations.push({
          stopId: stop.id,
          currentSerial: stop.serialNumber,
          newSerial: newSerialNumber,
          reached: stop.reached
        });
      }
    });
    
    plan.summary.stopsToUpdate = plan.operations.length;
    plan.summary.batchCount = Math.ceil(plan.operations.length / 500); // Firestore batch limit
    
    return plan;
  }
  
  /**
   * Print migration plan
   */
  printMigrationPlan(plan) {
    console.log('\n📋 MIGRATION PLAN:');
    console.log(`Stops to Update: ${plan.summary.stopsToUpdate}`);
    console.log(`Batch Operations: ${plan.summary.batchCount}`);
    
    if (plan.operations.length > 0) {
      console.log('\nSample Updates:');
      plan.operations.slice(0, 5).forEach(op => {
        console.log(`  ${op.stopId}: ${op.currentSerial} → ${op.newSerial} ${op.reached ? '(reached)' : '(unreached)'}`);
      });
      
      if (plan.operations.length > 5) {
        console.log(`  ... and ${plan.operations.length - 5} more`);
      }
    }
  }
  
  /**
   * Execute the migration
   */
  async executeMigration(plan) {
    if (plan.operations.length === 0) {
      console.log('\n✅ No updates needed - database is already in correct state');
      return;
    }
    
    console.log('\n🔄 Executing migration...');
    
    try {
      // Process operations in batches
      const batchSize = 500;
      let processedCount = 0;
      
      for (let i = 0; i < plan.operations.length; i += batchSize) {
        const batch = writeBatch(firestoreDb);
        const batchOps = plan.operations.slice(i, i + batchSize);
        
        batchOps.forEach(op => {
          const stopRef = doc(firestoreDb, 'Route2', op.stopId);
          batch.update(stopRef, {
            serialNumber: op.newSerial,
            migrationTimestamp: new Date().toISOString(),
            migrationVersion: '2.0.0'
          });
        });
        
        await batch.commit();
        processedCount += batchOps.length;
        
        console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${plan.summary.batchCount} (${processedCount}/${plan.operations.length} stops)`);
      }
      
      console.log('\n🎉 Migration executed successfully!');
      console.log(`Updated ${processedCount} stops with new serial numbers`);
      
    } catch (error) {
      console.error('Error executing migration:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup')
  };
  
  const migration = new SerialLogicMigration(options);
  
  migration.migrate()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = SerialLogicMigration;