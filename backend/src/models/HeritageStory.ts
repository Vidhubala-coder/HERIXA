import { Schema, model, Document, Types } from 'mongoose';

export type StoryLanguage = 'en' | 'ta' | 'hi';
export type StoryStatus = 'DRAFT' | 'REVIEW' | 'SCRIPT_READY' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'UNPUBLISHED' | 'FAILED';
export type FactClassification = 'VERIFIED_FACT' | 'TRADITIONAL_ACCOUNT' | 'INTERPRETATION' | 'UNVERIFIED';

export interface IStoryItem {
  id?: string;
  text: string;
  classification: FactClassification;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceOrganization?: string;
  lastVerifiedAt?: Date;
}

export interface IStorySection {
  historicalBackground?: IStoryItem[];
  construction?: IStoryItem[];
  architecture?: IStoryItem[];
  specialFeatures?: IStoryItem[];
  culturalSignificance?: IStoryItem[];
  storiesAndLegends?: IStoryItem[];
  historicalTimeline?: IStoryItem[];
  visitorContext?: IStoryItem[];
}

export interface IStorySource {
  url: string;
  title: string;
  organization: string;
  sourceType: 'OFFICIAL' | 'GOVERNMENT' | 'ARCHAEOLOGY' | 'TOURISM' | 'UNESCO' | 'ACADEMIC' | 'INSTITUTIONAL' | 'TRUSTED_SECONDARY' | 'OTHER';
  retrievedAt: Date;
  status?: string;
}

export interface IStoryScene {
  sceneNumber: number;
  title: string;
  narration: string;
  duration: number; // in seconds
  visualDescription?: string;
  caption?: string;
  sourceReferences?: string[];
  visualAsset?: string;
}

export interface IHeritageStory extends Document {
  monumentId: Types.ObjectId;
  monumentSlug: string;
  language: StoryLanguage;
  status: StoryStatus;
  storyVersion: number;
  generationId?: string;

  title: string;
  shortIntroduction: string;
  duration: number; // total duration in seconds
  thumbnailUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  subtitlesUrl?: string;

  sections: IStorySection;
  sources: IStorySource[];
  script?: string;
  scenes?: IStoryScene[];

  errorMessage?: string;
  lastVerifiedAt?: Date;
  publishedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StoryItemSchema = new Schema<IStoryItem>({
  text: { type: String, required: true },
  classification: {
    type: String,
    enum: ['VERIFIED_FACT', 'TRADITIONAL_ACCOUNT', 'INTERPRETATION', 'UNVERIFIED'],
    default: 'UNVERIFIED'
  },
  sourceUrl: { type: String },
  sourceTitle: { type: String },
  sourceOrganization: { type: String },
  lastVerifiedAt: { type: Date }
});

const StorySectionSchema = new Schema<IStorySection>({
  historicalBackground: [StoryItemSchema],
  construction: [StoryItemSchema],
  architecture: [StoryItemSchema],
  specialFeatures: [StoryItemSchema],
  culturalSignificance: [StoryItemSchema],
  storiesAndLegends: [StoryItemSchema],
  historicalTimeline: [StoryItemSchema],
  visitorContext: [StoryItemSchema]
}, { _id: false });

const StorySourceSchema = new Schema<IStorySource>({
  url: { type: String, required: true },
  title: { type: String, required: true },
  organization: { type: String, required: true },
  sourceType: {
    type: String,
    enum: ['OFFICIAL', 'GOVERNMENT', 'ARCHAEOLOGY', 'TOURISM', 'UNESCO', 'ACADEMIC', 'INSTITUTIONAL', 'TRUSTED_SECONDARY', 'OTHER'],
    default: 'OFFICIAL'
  },
  retrievedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' }
});

const StorySceneSchema = new Schema<IStoryScene>({
  sceneNumber: { type: Number, required: true },
  title: { type: String, required: true },
  narration: { type: String, required: true },
  duration: { type: Number, required: true, default: 10 },
  visualDescription: { type: String },
  caption: { type: String },
  sourceReferences: [{ type: String }],
  visualAsset: { type: String }
}, { _id: false });

const HeritageStorySchema = new Schema<IHeritageStory>(
  {
    monumentId: { type: Schema.Types.ObjectId, ref: 'Monument', required: true },
    monumentSlug: { type: String, required: true },
    language: { type: String, enum: ['en', 'ta', 'hi'], default: 'en' },
    status: {
      type: String,
      enum: ['DRAFT', 'REVIEW', 'SCRIPT_READY', 'PROCESSING', 'READY', 'PUBLISHED', 'UNPUBLISHED', 'FAILED'],
      default: 'DRAFT'
    },
    storyVersion: { type: Number, default: 1 },
    generationId: { type: String },

    title: { type: String, required: true, default: 'Heritage Story' },
    shortIntroduction: { type: String, required: true, default: '' },
    duration: { type: Number, default: 0 },
    thumbnailUrl: { type: String },
    videoUrl: { type: String },
    audioUrl: { type: String },
    subtitlesUrl: { type: String },

    sections: { type: StorySectionSchema, default: {} },
    sources: [StorySourceSchema],
    script: { type: String },
    scenes: [StorySceneSchema],

    errorMessage: { type: String },
    lastVerifiedAt: { type: Date },
    publishedAt: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  {
    timestamps: true
  }
);

// Compound unique index for monumentId + language
HeritageStorySchema.index({ monumentId: 1, language: 1 }, { unique: true });

export const HeritageStory = model<IHeritageStory>('HeritageStory', HeritageStorySchema);
