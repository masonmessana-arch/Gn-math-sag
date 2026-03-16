export interface Zone {
  id: number;
  name: string;
  url: string;
  cover: string;
  author: string;
  authorLink?: string;
  featured?: boolean;
  special?: string[];
}

export type SortOption = 'name' | 'id' | 'popular' | 'trendingDay' | 'trendingWeek' | 'trendingMonth';

export interface PopularityData {
  [id: number]: number;
}

export interface PopularityMap {
  year: PopularityData;
  month: PopularityData;
  week: PopularityData;
  day: PopularityData;
}
