import { Schema, model, Document, Types } from 'mongoose';

export interface ITimelineEvent {
  year: string;
  event: string;
}

export interface IStructuredTimelineEvent {
  year: string;
  title: string;
  description: string;
  significance?: string;
}

export interface IStructuredHistoricalEvent {
  period: string;
  title: string;
  description: string;
}

export interface IHistorySection {
  id?: string;
  title: string;
  content: string;
  images?: string[];
  imageUrls?: string[];
  order: number;
}

export interface IMonumentImage {
  id?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  imageType: 'historical' | 'archival' | 'modern' | 'architecture' | 'sculpture' | 'inscription' | 'restoration';
  source?: string;
  sourceUrl?: string;
  photographer?: string;
  year?: string;
  license?: string;
  credit?: string;
  verificationStatus?: 'unverified' | 'source-listed' | 'admin-verified';
}

export type RecognitionFeatureType =
  | 'monument'
  | 'temple'
  | 'fort'
  | 'palace'
  | 'archaeological-site'
  | 'cave'
  | 'gopuram'
  | 'vimana'
  | 'mandapa'
  | 'pillar'
  | 'sculpture'
  | 'statue'
  | 'inscription'
  | 'entrance'
  | 'doorway'
  | 'dome'
  | 'corridor'
  | 'wall'
  | 'tower'
  | 'ceiling'
  | 'carving'
  | 'architectural-detail'
  | 'interior'
  | 'exterior'
  | 'unknown';

export interface IRecognitionImage {
  id?: string;
  _id?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  viewType:
    | 'front'
    | 'rear'
    | 'left'
    | 'right'
    | 'side'
    | 'entrance'
    | 'gopuram'
    | 'vimana'
    | 'mandapa'
    | 'pillar'
    | 'sculpture'
    | 'inscription'
    | 'interior'
    | 'exterior'
    | 'wide-view'
    | 'detail'
    | 'other';
  featureType?: RecognitionFeatureType;
  title?: string;
  description?: string;
  source?: string;
  sourceUrl?: string;
  photographer?: string;
  year?: string;
  license?: string;
  credit?: string;
  verificationStatus?: 'unverified' | 'source-listed' | 'admin-verified';
}


export interface IReferenceSource {
  provider: string;
  collectionUrl: string;
}

export interface IReferenceImage {
  filename: string;
  localPath: string;
  viewType: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
}

export interface IMonument extends Document {
  historySections?: IHistorySection[];
  historicalImages?: IMonumentImage[];
  modernImages?: IMonumentImage[];
  architectureImages?: IMonumentImage[];
  restorationImages?: IMonumentImage[];
  sculptureImages?: IMonumentImage[];
  inscriptionImages?: IMonumentImage[];
  name: string;
  slug: string;
  location: string;
  state: string;
  country: string;
  category: 'Temples' | 'Sculptures' | 'Forts' | 'Artifacts' | 'Historical Sites';
  period: string;
  dynasty: string;
  description: string;
  historicalBackground: string;
  historicalSignificance: string;
  architecture: string;
  culturalSignificance: string;
  preservationStatus: string;
  interestingFacts: string[];
  images: string[];
  imageUrl?: string;
  image?: string;
  galleryImages: string[];
  featured: boolean;
  latitude?: number;
  longitude?: number;
  timeline: ITimelineEvent[];
  arEnabled?: boolean;
  recognitionImageUrl?: string;
  referenceSources?: IReferenceSource[];
  referenceImages?: IReferenceImage[];

  imageSource?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  imageAttribution?: string;

  
  // Basic Information
  district?: string;
  coordinates?: { latitude: number; longitude: number };
  monumentType?: string;
  historicalPeriod?: string;
  constructionYear?: string;
  constructionPeriod?: string;
  ruler?: string;
  builder?: string;
  architect?: string;
  alternativeNames?: string[];
  localNames?: string[];
  historicalNames?: string[];

  // History
  shortHistory?: string;
  fullHistory?: string;
  originStory?: string;
  constructionHistory?: string;
  importantRulers?: string[];
  dynastyHistory?: string;
  historicalTimeline?: IStructuredTimelineEvent[];
  historicalEvents?: IStructuredHistoricalEvent[];
  origin?: string;
  constructionDate?: string;
  originalPurpose?: string;
  whyItWasBuilt?: string;
  historicalDevelopment?: string;
  historicalChanges?: string;
  historicalPersonalities?: string[];

  // Architecture
  buildingMaterials?: string;
  structuralFeatures?: string;
  architecturalStyle?: string;
  vimanaDetails?: string;
  gopuramDetails?: string;
  mandapaDetails?: string;
  sculptureDetails?: string;
  pillarDetails?: string;
  ceilingDetails?: string;
  inscriptionDetails?: string;
  engineeringFeatures?: string;
  architectureDescription?: string;
  layout?: string;
  entrance?: string;
  gopuram?: string;
  vimana?: string;
  mandapa?: string;
  pillars?: string;
  sculptures?: string;
  materials?: string;
  uniqueArchitecturalFeatures?: string;

  // Cultural Importance
  culturalImportance?: string;
  religiousImportance?: string;
  socialImportance?: string;
  artisticImportance?: string;
  culturalPractices?: string;
  traditionalPractices?: string;
  festivals?: string[];
  rituals?: string[];

  // Legends and Stories
  legends?: string[];
  mythology?: string;
  localStories?: string[];
  interestingStories?: string[];
  mythologicalStories?: string[];
  localTraditions?: string[];

  // Preservation
  preservationHistory?: string;
  restorationHistory?: string;
  damageHistory?: string;
  conservationEfforts?: string;
  currentCondition?: string;
  conservationAuthority?: string;

  // Heritage Status
  heritageStatus?: string;
  unescoStatus?: string;
  unescoYear?: string;
  heritageRecognition?: string;
  protectedStatus?: string;

  // Visitor Information
  dressCode?: string;
  visitorGuidelines?: string;
  howToReach?: string;
  visitingInformation?: string;
  openingHours?: string;
  bestTimeToVisit?: string;
  entryFee?: string;
  nearbyPlaces?: string[];
  openingInformation?: string;
  dressGuidelines?: string;
  photographyRules?: string;
  accessibility?: string;

  // Educational Information
  didYouKnow?: string[];
  importantFacts?: string[];
  quizTopics?: string[];
  architecturalHighlights?: string[];
  historicalHighlights?: string[];

  // Recognition Profile
  recognitionProfile?: {
    frontView?: string[];
    backView?: string[];
    leftView?: string[];
    rightView?: string[];
    entrance?: string[];
    gopuram?: string[];
    vimana?: string[];
    mandapa?: string[];
    pillars?: string[];
    sculptures?: string[];
    inscriptions?: string[];
    corridors?: string[];
    surroundingArea?: string[];
    otherFeatures?: string[];

    // Extended Profile fields
    distinctiveFeatures?: string[];
    architecturalIdentifiers?: string[];
    visualLandmarks?: string[];
    commonViewpoints?: string[];
    entranceDescription?: string;
    gopuramDescription?: string;
    vimanaDescription?: string;
    mandapaDescription?: string;
    sculptureIdentifiers?: string[];
    inscriptionIdentifiers?: string[];
    surroundingArchitecture?: string[];
    materials?: string[];
    colorsAndTextures?: string[];
    structuralRelationships?: string[];
    recognitionNotes?: string;
  };

  recognitionImages?: IRecognitionImage[];

  // Keep existing fields
  rulers?: string[];
  materialsUsed?: string[];
  inscriptions?: string[];
  videos?: string[];
  audioGuide?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimelineEventSchema = new Schema<ITimelineEvent>({
  year: { type: String, required: true },
  event: { type: String, required: true },
}, { _id: false });

const StructuredTimelineEventSchema = new Schema<IStructuredTimelineEvent>({
  year: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  significance: { type: String }
}, { _id: false });

const StructuredHistoricalEventSchema = new Schema<IStructuredHistoricalEvent>({
  period: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const HistorySectionSchema = new Schema<IHistorySection>({
  id: { type: String, default: () => new Types.ObjectId().toString() },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  images: { type: [String], default: [] },
  imageUrls: { type: [String], default: [] },
  order: { type: Number, required: true, default: 0 }
}, { _id: false });

const MonumentImageSchema = new Schema<IMonumentImage>({
  id: { type: String, default: () => new Types.ObjectId().toString() },
  imageUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  title: { type: String },
  description: { type: String },
  imageType: { 
    type: String, 
    required: true,
    enum: ['historical', 'archival', 'modern', 'architecture', 'sculpture', 'inscription', 'restoration']
  },
  source: { type: String },
  sourceUrl: { type: String },
  photographer: { type: String },
  year: { type: String },
  license: { type: String },
  credit: { type: String },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'source-listed', 'admin-verified'],
    default: 'unverified'
  }
}, { _id: false });

const RecognitionImageSchema = new Schema<IRecognitionImage>({
  id: { type: String, default: () => new Types.ObjectId().toString() },
  imageUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  viewType: {
    type: String,
    required: true,
    enum: [
      'front', 'rear', 'left', 'right', 'side', 'entrance', 'gopuram',
      'vimana', 'mandapa', 'pillar', 'sculpture', 'inscription', 'interior',
      'exterior', 'wide-view', 'detail', 'other'
    ]
  },
  featureType: {
    type: String,
    enum: [
      'monument', 'temple', 'fort', 'palace', 'archaeological-site', 'cave',
      'gopuram', 'vimana', 'mandapa', 'pillar', 'sculpture', 'statue', 'inscription',
      'entrance', 'doorway', 'dome', 'corridor', 'wall', 'tower', 'ceiling',
      'carving', 'architectural-detail', 'interior', 'exterior', 'unknown'
    ],
    default: 'unknown'
  },
  title: { type: String },
  description: { type: String },
  source: { type: String },
  sourceUrl: { type: String },
  photographer: { type: String },
  year: { type: String },
  license: { type: String },
  credit: { type: String },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'source-listed', 'admin-verified'],
    default: 'unverified'
  }
}, { _id: false });

const ReferenceSourceSchema = new Schema<IReferenceSource>({
  provider: { type: String, required: true },
  collectionUrl: { type: String, required: true }
}, { _id: false });

const ReferenceImageSchema = new Schema<IReferenceImage>({
  filename: { type: String, required: true },
  localPath: { type: String, required: true },
  viewType: { type: String, required: true },
  source: { type: String, required: true },
  sourceUrl: { type: String },
  author: { type: String },
  license: { type: String },
  licenseUrl: { type: String }
}, { _id: false });

const MonumentSchema = new Schema<IMonument>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, index: true },
  location: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Temples', 'Sculptures', 'Forts', 'Artifacts', 'Historical Sites']
  },
  period: { type: String, required: true, trim: true },
  dynasty: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  historicalBackground: { type: String, required: true },
  historicalSignificance: { type: String, required: true },
  architecture: { type: String, required: true },
  culturalSignificance: { type: String, required: true },
  preservationStatus: { type: String, required: true },
  interestingFacts: { type: [String], required: true },
  images: { type: [String], required: true },
  imageUrl: { type: String, trim: true },
  image: { type: String, trim: true },
  galleryImages: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  latitude: { type: Number },
  longitude: { type: Number },
  timeline: { type: [TimelineEventSchema], required: true },
  arEnabled: { type: Boolean, default: false },
  recognitionImageUrl: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'recognitionImageUrl must be a valid URL'
    }
  },
  referenceSources: { type: [ReferenceSourceSchema], default: [] },
  referenceImages: { type: [ReferenceImageSchema], default: [] },

  imageSource: { type: String, trim: true },
  imageSourceUrl: { type: String, trim: true },
  imageLicense: { type: String, trim: true },
  imageAttribution: { type: String, trim: true },


  // Basic Information
  district: { type: String, trim: true },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  monumentType: { type: String, trim: true },
  historicalPeriod: { type: String, trim: true },
  constructionYear: { type: String, trim: true },
  constructionPeriod: { type: String, trim: true },
  ruler: { type: String, trim: true },
  builder: { type: String, trim: true },
  architect: { type: String, trim: true },
  alternativeNames: { type: [String], default: [] },
  localNames: { type: [String], default: [] },
  historicalNames: { type: [String], default: [] },

  // History
  shortHistory: { type: String },
  fullHistory: { type: String },
  originStory: { type: String },
  constructionHistory: { type: String },
  importantRulers: { type: [String], default: [] },
  dynastyHistory: { type: String },
  historicalTimeline: { type: [StructuredTimelineEventSchema], default: [] },
  historicalEvents: { type: [StructuredHistoricalEventSchema], default: [] },
  origin: { type: String },
  constructionDate: { type: String },
  originalPurpose: { type: String },
  whyItWasBuilt: { type: String },
  historicalDevelopment: { type: String },
  historicalChanges: { type: String },
  historicalPersonalities: { type: [String], default: [] },

  // Architecture
  buildingMaterials: { type: String },
  structuralFeatures: { type: String },
  architecturalStyle: { type: String },
  vimanaDetails: { type: String },
  gopuramDetails: { type: String },
  mandapaDetails: { type: String },
  sculptureDetails: { type: String },
  pillarDetails: { type: String },
  ceilingDetails: { type: String },
  inscriptionDetails: { type: String },
  engineeringFeatures: { type: String },
  architectureDescription: { type: String },
  layout: { type: String },
  entrance: { type: String },
  gopuram: { type: String },
  vimana: { type: String },
  mandapa: { type: String },
  pillars: { type: String },
  sculptures: { type: String },
  materials: { type: String },
  uniqueArchitecturalFeatures: { type: String },

  // Cultural Importance
  culturalImportance: { type: String },
  religiousImportance: { type: String },
  socialImportance: { type: String },
  artisticImportance: { type: String },
  culturalPractices: { type: String },
  traditionalPractices: { type: String },
  festivals: { type: [String], default: [] },
  rituals: { type: [String], default: [] },

  // Legends and Stories
  legends: { type: [String], default: [] },
  mythology: { type: String },
  localStories: { type: [String], default: [] },
  interestingStories: { type: [String], default: [] },
  mythologicalStories: { type: [String], default: [] },
  localTraditions: { type: [String], default: [] },

  // Preservation
  preservationHistory: { type: String },
  restorationHistory: { type: String },
  damageHistory: { type: String },
  conservationEfforts: { type: String },
  currentCondition: { type: String },
  conservationAuthority: { type: String },

  // Heritage Status
  heritageStatus: { type: String },
  unescoStatus: { type: String },
  unescoYear: { type: String },
  heritageRecognition: { type: String },
  protectedStatus: { type: String },

  // Visitor Information
  dressCode: { type: String },
  visitorGuidelines: { type: String },
  howToReach: { type: String },
  visitingInformation: { type: String },
  openingHours: { type: String },
  bestTimeToVisit: { type: String },
  entryFee: { type: String },
  nearbyPlaces: { type: [String], default: [] },
  openingInformation: { type: String },
  dressGuidelines: { type: String },
  photographyRules: { type: String },
  accessibility: { type: String },

  // Educational Information
  didYouKnow: { type: [String], default: [] },
  importantFacts: { type: [String], default: [] },
  quizTopics: { type: [String], default: [] },
  architecturalHighlights: { type: [String], default: [] },
  historicalHighlights: { type: [String], default: [] },

  // Recognition Profile
  recognitionProfile: {
    frontView: { type: [String], default: [] },
    backView: { type: [String], default: [] },
    leftView: { type: [String], default: [] },
    rightView: { type: [String], default: [] },
    entrance: { type: [String], default: [] },
    gopuram: { type: [String], default: [] },
    vimana: { type: [String], default: [] },
    mandapa: { type: [String], default: [] },
    pillars: { type: [String], default: [] },
    sculptures: { type: [String], default: [] },
    inscriptions: { type: [String], default: [] },
    corridors: { type: [String], default: [] },
    surroundingArea: { type: [String], default: [] },
    otherFeatures: { type: [String], default: [] },

    // Extended profile fields in Schema
    distinctiveFeatures: { type: [String], default: [] },
    architecturalIdentifiers: { type: [String], default: [] },
    visualLandmarks: { type: [String], default: [] },
    commonViewpoints: { type: [String], default: [] },
    entranceDescription: { type: String },
    gopuramDescription: { type: String },
    vimanaDescription: { type: String },
    mandapaDescription: { type: String },
    sculptureIdentifiers: { type: [String], default: [] },
    inscriptionIdentifiers: { type: [String], default: [] },
    surroundingArchitecture: { type: [String], default: [] },
    materials: { type: [String], default: [] },
    colorsAndTextures: { type: [String], default: [] },
    structuralRelationships: { type: [String], default: [] },
    recognitionNotes: { type: String }
  },

  recognitionImages: { type: [RecognitionImageSchema], default: [] },

  // Keep existing fields
  rulers: { type: [String], default: [] },
  materialsUsed: { type: [String], default: [] },
  inscriptions: { type: [String], default: [] },
  videos: { type: [String], default: [] },
  audioGuide: { type: String },
  historySections: { type: [HistorySectionSchema], default: [] },
  historicalImages: { type: [MonumentImageSchema], default: [] },
  modernImages: { type: [MonumentImageSchema], default: [] },
  architectureImages: { type: [MonumentImageSchema], default: [] },
  restorationImages: { type: [MonumentImageSchema], default: [] },
  sculptureImages: { type: [MonumentImageSchema], default: [] },
  inscriptionImages: { type: [MonumentImageSchema], default: [] },
}, {
  timestamps: true
});

export const Monument = model<IMonument>('Monument', MonumentSchema);
export default Monument;
