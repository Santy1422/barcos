const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function updateInvoiceDate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const invoicesCollection = db.collection('invoices');
    
    // Find invoices that match the pattern
    const invoices = await invoicesCollection.find({ 
      invoiceNumber: { $regex: /6-2026/i },
      module: 'trucking'
    }).toArray();
    
    console.log('Found', invoices.length, 'invoices matching 6-2026');
    
    for (const inv of invoices) {
      console.log('  -', inv.invoiceNumber, '| Date:', inv.issueDate, '| Status:', inv.status);
    }
    
    // Find the AUTH one specifically
    const authInvoice = invoices.find(i => i.invoiceNumber.includes('AUTH'));
    
    if (authInvoice) {
      console.log('\nUpdating AUTH invoice:', authInvoice.invoiceNumber);
      
      // Update the date to February 12, 2026 (DD/MM/YYYY format: 12/02/2026)
      const newDate = new Date('2026-02-12T00:00:00.000Z');
      
      const result = await invoicesCollection.updateOne(
        { _id: authInvoice._id },
        { $set: { issueDate: newDate, dueDate: newDate } }
      );
      
      console.log('Updated:', result.modifiedCount, 'document(s)');
      console.log('New date:', newDate.toISOString());
    } else {
      console.log('No AUTH invoice found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateInvoiceDate();
