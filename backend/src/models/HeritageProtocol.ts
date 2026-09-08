import { Schema, model, Document, Types } from 'mongoose';

export type ProtocolItemClassification = 'VERIFIED' | 'GENERAL_GUIDANCE' | 'UNVERIFIED';

export interface IProtocolItem {
  id?: string;
  text: string;
  classification: ProtocolItemClassification;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceOrganization?: string;
  referenceSnippet?: string;
  lastVerifiedAt?: Date;
}

export interface IProtocolSource {
  id?: string;
  url: string;
  title: string;
  organization: string;
  sourceType: 'Official Government' | 'Temple Authority' | 'Heritage Trust' | 'Verified Institutional' | 'Secondary Reference';
  retrievedAt: Date;
  status: 'Verified' | 'Pending Review' | 'Rejected';
  notes?: string;
}

export interface IProtocolSections {
  beforeVisit: IProtocolItem[];
  entryGuidelines: IProtocolItem[];
  dressGuidance: IProtocolItem[];
  traditionalPractices: IProtocolItem[];
  photography: IProtocolItem[];
  dos: IProtocolItem[];
  donts: IProtocolItem[];
  respectfulBehaviour: IProtocolItem[];
  accessibility: IProtocolItem[];
  restrictions: IProtocolItem[];
  visitorNotes: IProtocolItem[];
}

export interface IHeritageProtocol extends Document {
  monumentId: Types.ObjectId;
  monumentSlug: string;
  language: 'en' | 'ta' | 'hi';
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  sections: IProtocolSections;
  sources: IProtocolSource[];
  lastVerifiedAt?: Date;
  publishedAt?: Date;
  lastUpdatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProtocolItemSchema = new Schema<IProtocolItem>(
  {
    id: { type: String, default: () => new Types.ObjectId().toString() },
    text: { type: String, required: true },
    classification: {
      type: String,
      enum: ['VERIFIED', 'GENERAL_GUIDANCE', 'UNVERIFIED'],
      default: 'GENERAL_GUIDANCE',
      required: true
    },
    sourceUrl: { type: String },
    sourceTitle: { type: String },
    sourceOrganization: { type: String },
    referenceSnippet: { type: String },
    lastVerifiedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ProtocolSourceSchema = new Schema<IProtocolSource>(
  {
    id: { type: String, default: () => new Types.ObjectId().toString() },
    url: { type: String, required: true },
    title: { type: String, required: true },
    organization: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ['Official Government', 'Temple Authority', 'Heritage Trust', 'Verified Institutional', 'Secondary Reference'],
      default: 'Official Government'
    },
    retrievedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Verified', 'Pending Review', 'Rejected'],
      default: 'Verified'
    },
    notes: { type: String }
  },
  { _id: false }
);

const HeritageProtocolSchema = new Schema<IHeritageProtocol>(
  {
    monumentId: { type: Schema.Types.ObjectId, ref: 'Monument', required: true, index: true },
    monumentSlug: { type: String, required: true, index: true },
    language: { type: String, enum: ['en', 'ta', 'hi'], default: 'en', required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'], default: 'DRAFT', required: true },
    sections: {
      beforeVisit: { type: [ProtocolItemSchema], default: [] },
      entryGuidelines: { type: [ProtocolItemSchema], default: [] },
      dressGuidance: { type: [ProtocolItemSchema], default: [] },
      traditionalPractices: { type: [ProtocolItemSchema], default: [] },
      photography: { type: [ProtocolItemSchema], default: [] },
      dos: { type: [ProtocolItemSchema], default: [] },
      donts: { type: [ProtocolItemSchema], default: [] },
      respectfulBehaviour: { type: [ProtocolItemSchema], default: [] },
      accessibility: { type: [ProtocolItemSchema], default: [] },
      restrictions: { type: [ProtocolItemSchema], default: [] },
      visitorNotes: { type: [ProtocolItemSchema], default: [] }
    },
    sources: { type: [ProtocolSourceSchema], default: [] },
    lastVerifiedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    lastUpdatedBy: { type: String }
  },
  { timestamps: true }
);

// Compound index for monumentId + language
HeritageProtocolSchema.index({ monumentId: 1, language: 1 }, { unique: true });
HeritageProtocolSchema.index({ monumentSlug: 1, language: 1 });

export default model<IHeritageProtocol>('HeritageProtocol', HeritageProtocolSchema);
