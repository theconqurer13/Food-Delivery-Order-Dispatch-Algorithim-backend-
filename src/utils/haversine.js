/**
 * Haversine formula to calculate distance between two lat/lng points
 * Returns distance in kilometers
 * 
 * Formula: d = 2r × arcsin(√(sin²((lat2-lat1)/2) + cos(lat1)×cos(lat2)×sin²((lng2-lng1)/2)))
 * where r = Earth's radius (6371 km)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  
  // Convert degrees to radians
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return parseFloat(distance.toFixed(2));
}

/**
 * Convert degrees to radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bounding box for radius search
 * Returns {minLat, maxLat, minLng, maxLng}
 * Used to limit SQL query before applying Haversine
 */
function getBoundingBox(lat, lng, radiusKm) {
  const latDelta = radiusKm / 111; // 1 degree lat ≈ 111 km
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta
  };
}

/**
 * Check if a point is within a certain radius of another point
 */
function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm) {
  const distance = haversineDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusKm;
}

module.exports = {
  haversineDistance,
  getBoundingBox,
  isWithinRadius,
  toRad
};