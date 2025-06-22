import mongoose from 'mongoose';

const excelFilesSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["processing", "completed", "error"],
    default: "processing"
  },
  type: {
    type: String,
    required: true
  },
  module: {
    type: String,
    enum: ["trucking", "shipchandler", "agency"],
    required: true
  },
  recordIds: [{
    type: String
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  fileSize: {
    type: Number,
    required: false
  },
  rowCount: {
    type: Number,
    required: false
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Índices
excelFilesSchema.index({ module: 1 });
excelFilesSchema.index({ status: 1 });
excelFilesSchema.index({ uploadedBy: 1 });
excelFilesSchema.index({ createdAt: -1 });

export default excelFilesSchema;