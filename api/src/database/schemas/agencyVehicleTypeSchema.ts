import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IAgencyVehicleType extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IAgencyVehicleTypeModel extends Model<IAgencyVehicleType> {
  findAllActive(): Promise<IAgencyVehicleType[]>;
}

const agencyVehicleTypeSchema = new Schema<IAgencyVehicleType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

agencyVehicleTypeSchema.index({ name: 1 }, { unique: true });
agencyVehicleTypeSchema.index({ isActive: 1 });

agencyVehicleTypeSchema.statics.findAllActive = function (this: IAgencyVehicleTypeModel) {
  return this.find({ isActive: true }).sort({ name: 1 });
};

const AgencyVehicleType = model<IAgencyVehicleType, IAgencyVehicleTypeModel>(
  'AgencyVehicleType',
  agencyVehicleTypeSchema
);

export default AgencyVehicleType;
