import mongoose from 'mongoose';

const serviceSapCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  module: { type: String, enum: ['trucking', 'agency', 'shipchandler', 'ptyss', 'all'], default: 'all' },
  active: { type: Boolean, default: true },

  // SAP Parameters
  profitCenter: { type: String, default: '' },
  activity: { type: String, default: '' },
  pillar: { type: String, default: '' },
  buCountry: { type: String, default: 'PA' },
  serviceCountry: { type: String, default: 'PA' },
  clientType: { type: String, default: '' },
  baseUnitMeasure: { type: String, default: 'EA' },
  incomeRebateCode: { type: String, default: 'I' }
}, { timestamps: true });

export default mongoose.model('ServiceSapCode', serviceSapCodeSchema); 