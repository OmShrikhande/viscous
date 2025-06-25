const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Starting export script...');
console.log('Current directory:', __dirname);

// Create exports directory if it doesn't exist
const exportsDir = path.join(__dirname, 'exports');
console.log('Exports directory path:', exportsDir);

try {
  if (!fs.existsSync(exportsDir)) {
    console.log('Creating exports directory...');
    fs.mkdirSync(exportsDir);
    console.log('Exports directory created successfully');
  } else {
    console.log('Exports directory already exists');
  }
} catch (err) {
  console.error('Error creating exports directory:', err);
}

console.log('MongoDB URI:', process.env.MONGO_URI);

// Connect to MongoDB Atlas using the connection string from .env
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB Atlas');
  
  try {
    // Get all collection names from the database
    console.log('Getting collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Found collections:', collections.map(c => c.name));
    
    // Export data from each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Exporting collection: ${collectionName}`);
      
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      console.log(`Found ${data.length} documents in ${collectionName}`);
      
      const filePath = path.join(exportsDir, `${collectionName}.json`);
      console.log(`Writing to file: ${filePath}`);
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Exported ${data.length} documents from ${collectionName} to ${filePath}`);
    }
    
    console.log('Export completed successfully!');
  } catch (error) {
    console.error('Export error:', error);
  } finally {
    console.log('Disconnecting from MongoDB');
    mongoose.disconnect();
  }
})
.catch(err => {
  console.error('MongoDB Atlas connection error:', err);
});