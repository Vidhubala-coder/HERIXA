import Monument from '../models/monument';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface CandidateQuery {
  latitude?: number;
  longitude?: number;
  limit?: number;
}

/**
 * Calculate distance between two GPS coordinates in kilometers using the Haversine formula.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Dynamic candidate retrieval service.
 * Fetches monuments from MongoDB, calculates GPS distances, and orders them.
 */
export const retrieveCandidates = async (query: CandidateQuery = {}): Promise<any[]> => {
  const { latitude, longitude, limit = 10 } = query;

  // Retrieve monuments with fields relevant to visual/architectural recognition
  const monuments = await Monument.find({}, {
    _id: 1,
    name: 1,
    alternativeNames: 1,
    location: 1,
    state: 1,
    district: 1,
    monumentType: 1,
    historicalPeriod: 1,
    constructionPeriod: 1,
    architecturalStyle: 1,
    builder: 1,
    dynasty: 1,
    ruler: 1,
    architect: 1,
    origin: 1,
    shortHistory: 1,
    structuralFeatures: 1,
    architecturalDescription: 1,
    gopuram: 1,
    vimana: 1,
    mandapa: 1,
    pillars: 1,
    sculptures: 1,
    inscriptions: 1,
    engineeringFeatures: 1,
    recognitionProfile: 1,
    recognitionImages: 1,
    referenceImages: 1,
    latitude: 1,
    longitude: 1
  }).lean();

  if (monuments.length === 0) {
    return [];
  }

  const hasGPS = latitude !== undefined && longitude !== undefined;

  // Map and calculate distance if GPS is available
  const candidates = monuments.map((monument: any) => {
    let distanceKm: number | null = null;
    let proximity = 'unknown proximity';

    if (hasGPS && monument.latitude !== undefined && monument.longitude !== undefined) {
      distanceKm = calculateDistance(latitude!, longitude!, monument.latitude, monument.longitude);
      
      // Categorize proximity
      if (distanceKm < 5) {
        proximity = 'immediate (within 5 km)';
      } else if (distanceKm < 50) {
        proximity = 'close (within 50 km)';
      } else if (distanceKm < 500) {
        proximity = 'regional (within 500 km)';
      } else {
        proximity = 'distant (more than 500 km)';
      }
    }

    return {
      ...monument,
      distanceKm,
      proximity
    };
  });

  // Sort: closest first if GPS is available
  if (hasGPS) {
    candidates.sort((a, b) => {
      const distA = a.distanceKm !== null ? a.distanceKm : Infinity;
      const distB = b.distanceKm !== null ? b.distanceKm : Infinity;
      return distA - distB;
    });
  }

  // Return the candidates up to the requested limit
  return candidates.slice(0, limit);
};
