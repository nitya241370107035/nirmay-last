import { Facility } from '../types';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates straight-line distance in kilometers between two lat/lng coordinates
 * using the Haversine formula. Purely mathematical (0 network requests).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}

/**
 * Request user's current GPS position via browser Geolocation API.
 * Resolves to { latitude, longitude } or null if permission denied / unavailable / timed out.
 */
export function getUserLocation(): Promise<UserCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation API is not supported by this browser.');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.warn('Geolocation error or permission denied:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 mins
      }
    );
  });
}

/**
 * Augment facilities with distance in km (if user location provided) and return sorted array.
 * If userLocation is provided, sorted ascending by distance.
 * If userLocation is null/undefined, keeps original or alphabetical order with distanceKm = undefined.
 */
export function getSortedFacilities(
  facilities: Facility[],
  userLocation?: UserCoordinates | null
): Facility[] {
  if (!userLocation) {
    return facilities.map((f) => ({ ...f, distanceKm: undefined }));
  }

  const facilitiesWithDistance = facilities.map((f) => {
    const dist = calculateHaversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      f.latitude,
      f.longitude
    );
    return {
      ...f,
      distanceKm: dist
    };
  });

  return facilitiesWithDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}
