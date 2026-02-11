export interface House {
  id: string;
  url: string;
  title: string;
  price: number;
  location: string;
  distanceMinutes?: number; // Distance from target address
  
  // Required criteria
  bedrooms: number;
  livingAreaM2?: number;
  garageM2?: number;
  landM2?: number;
  
  // Nice to have
  hasPool?: boolean;
  hasView?: boolean;
  isTreed?: boolean; // arboré
  southFacing?: boolean;
  noVisAVis?: boolean;
  estimatedWorkCost?: number; // €
  
  // Metadata
  source: 'leboncoin' | 'seloger' | 'pap' | 'bienici' | 'ouestfrance' | 'other';
  images: string[];
  description?: string;
  addedAt: string; // ISO date
  
  // Review status
  status: 'pending' | 'ok' | 'ko';
  notes?: string;
}

export interface HouseData {
  lastUpdated: string;
  targetAddress: string;
  criteria: {
    maxPrice: number;
    minBedrooms: number;
    minLivingAreaM2: number;
    minGarageM2: number;
    minLandM2: number;
    maxDistanceMinutes: number;
    maxWorkCost: number;
  };
  houses: House[];
}
