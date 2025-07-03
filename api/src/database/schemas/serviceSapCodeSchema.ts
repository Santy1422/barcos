import mongoose from 'mongoose';

const serviceSapCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  module: { type: String, enum: ['trucking', 'agency', 'shipchandler', 'all'], default: 'all' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ServiceSapCode', serviceSapCodeSchema); 