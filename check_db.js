require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const Form = require('./backend/models/Form.model');
    const User = require('./backend/models/User.model');
    const Response = require('./backend/models/Response.model');
    
    const forms = await Form.find().lean();
    const users = await User.find().lean();
    const responses = await Response.find().lean();
    
    console.log('\n📊 Database Statistics:');
    console.log(`  Forms: ${forms.length}`);
    console.log(`  Users: ${users.length}`);
    console.log(`  Responses: ${responses.length}`);
    
    if (forms.length > 0) {
      console.log('\n📋 First Form:');
      console.log(`  ID: ${forms[0]._id}`);
      console.log(`  Owner: ${forms[0].owner} (type: ${typeof forms[0].owner})`);
      console.log(`  Title: ${forms[0].title}`);
      console.log(`  Status: ${forms[0].status}`);
    }
    
    if (users.length > 0) {
      console.log('\n👤 First User:');
      console.log(`  ID: ${users[0]._id}`);
      console.log(`  Name: ${users[0].name}`);
      console.log(`  Email: ${users[0].email}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

connectDB();
