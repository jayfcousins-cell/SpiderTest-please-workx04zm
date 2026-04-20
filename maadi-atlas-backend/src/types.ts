export type Area =
  | 'Old Maadi'
  | 'Maadi Degla'
  | 'Maadi Sarayat'
  | 'Zahraa El Maadi'
  | 'New Maadi';

export type Listing = 'rent' | 'sale';

export type Feature = 'garden' | 'rooftop' | 'ground';

export type Source = 'propertyfinder' | 'nawy' | 'aqarmap' | 'olx' | 'manual';

export type AnchorKey =
  | 'school216'
  | 'fablab'
  | 'maadiClub'
  | 'wadiDegla'
  | 'garden';

export type Distances = Record<AnchorKey, number>;

export type Property = {
  id: string;
  source: Source;
  sourceUrl: string;
  title: string;
  street: string;
  area: Area;
  listing: Listing;
  price: string;
  priceValue: number;
  beds: number;
  baths: number;
  sqm: number;
  features: Feature[];
  distances: Distances;
  traffic: number;
  trafficNote: string;
  note: string;
  tone: Feature;
  lat: number;
  lng: number;
  updatedAt: string;
};

export type RawListing = {
  source: Source;
  sourceUrl: string;
  title: string;
  area: Area;
  street: string;
  listing: Listing;
  priceEgp: number;
  beds: number;
  baths: number;
  sqm: number;
  description: string;
  // Optional pre-resolved coordinates (manual imports can supply them).
  lat?: number;
  lng?: number;
};

export type ListingsResponse = {
  listings: Property[];
  updatedAt: string;
  sources: Source[];
};
