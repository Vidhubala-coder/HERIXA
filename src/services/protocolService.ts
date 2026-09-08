import { apiFetch } from './api';

export type ProtocolItemClassification = 'VERIFIED' | 'GENERAL_GUIDANCE' | 'UNVERIFIED';

export interface ProtocolItem {
  id?: string;
  text: string;
  classification: ProtocolItemClassification;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceOrganization?: string;
  referenceSnippet?: string;
  lastVerifiedAt?: string;
}

export interface ProtocolSource {
  id?: string;
  url: string;
  title: string;
  organization: string;
  sourceType: 'Official Government' | 'Temple Authority' | 'Heritage Trust' | 'Verified Institutional' | 'Secondary Reference';
  retrievedAt: string;
  status: 'Verified' | 'Pending Review' | 'Rejected';
  notes?: string;
}

export interface ProtocolSections {
  beforeVisit: ProtocolItem[];
  entryGuidelines: ProtocolItem[];
  dressGuidance: ProtocolItem[];
  traditionalPractices: ProtocolItem[];
  photography: ProtocolItem[];
  dos: ProtocolItem[];
  donts: ProtocolItem[];
  respectfulBehaviour: ProtocolItem[];
  accessibility: ProtocolItem[];
  restrictions: ProtocolItem[];
  visitorNotes: ProtocolItem[];
}

export interface HeritageProtocolData {
  _id?: string;
  monumentId: string;
  monumentSlug: string;
  language: 'en' | 'ta' | 'hi';
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  sections: ProtocolSections;
  sources: ProtocolSource[];
  lastVerifiedAt?: string;
  publishedAt?: string;
}

export interface PublicProtocolResponse {
  success: boolean;
  data: HeritageProtocolData | null;
  isVerified: boolean;
  status: string;
  message?: string;
  language?: string;
  monument?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Fetch public published protocol for a monument
export const getPublicProtocol = async (
  monumentId: string,
  lang: 'en' | 'ta' | 'hi' = 'en'
): Promise<PublicProtocolResponse> => {
  return await apiFetch(`/api/monuments/${monumentId}/protocol?lang=${lang}`, {
    method: 'GET'
  });
};

// Fetch full protocol (including draft) for admin
export const getAdminProtocol = async (
  monumentId: string,
  lang: 'en' | 'ta' | 'hi' = 'en'
): Promise<{ success: boolean; data: HeritageProtocolData }> => {
  return await apiFetch(`/api/admin/monuments/${monumentId}/protocol?lang=${lang}`, {
    method: 'GET'
  });
};

// Save draft protocol in admin
export const updateAdminProtocol = async (
  monumentId: string,
  payload: { sections: ProtocolSections; sources: ProtocolSource[]; language?: string }
): Promise<{ success: boolean; message: string; data: HeritageProtocolData }> => {
  return await apiFetch(`/api/admin/monuments/${monumentId}/protocol`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

// Trigger AI source content extraction in admin
export const generateProtocolFromSource = async (
  monumentId: string,
  sourceUrl: string,
  sourceType: string = 'Official Government',
  language: string = 'en'
): Promise<{ success: boolean; message: string; data: HeritageProtocolData }> => {
  return await apiFetch(`/api/admin/monuments/${monumentId}/protocol/generate`, {
    method: 'POST',
    body: JSON.stringify({ sourceUrl, sourceType, language })
  });
};

// Publish or unpublish protocol in admin
export const publishProtocol = async (
  monumentId: string,
  action: 'publish' | 'unpublish' = 'publish',
  language: string = 'en'
): Promise<{ success: boolean; message: string; data: HeritageProtocolData }> => {
  return await apiFetch(`/api/admin/monuments/${monumentId}/protocol/publish`, {
    method: 'POST',
    body: JSON.stringify({ action, language })
  });
};
