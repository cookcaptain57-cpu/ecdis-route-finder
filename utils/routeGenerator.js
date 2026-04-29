export const generateSmartRoute = (start, end) => {
  const waypoints = [];
  const steps = 20;

  for (let i = 0; i <= steps; i++) {
    const lat =
      start.lat + ((end.lat - start.lat) * i) / steps;

    const lon =
      start.lon + ((end.lon - start.lon) * i) / steps;

    waypoints.push({ lat, lon });
  }

  return waypoints;
};
