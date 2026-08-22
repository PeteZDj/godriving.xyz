// Types mirroring the GoDriving API.

export interface School {
  id: number;
  name: string;
  country: string;
  city: string;
  description: string;
  phone: string;
  email: string;
  website?: string;
  logo: string;
  rating: number;
  price_from: number | null;
  verified: boolean;
  featured: boolean;
}

export interface LeaderboardEntry {
  name: string;
  city?: string;
  country?: string;
  score: number;
  level?: number;
}

export interface PublicStats {
  learners: number;
  schools: number;
  gamesPlayed: number;
}
