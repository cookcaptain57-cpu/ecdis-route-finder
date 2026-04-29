import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RouteMap({ waypoints }) {
  return (
    <MapContainer
      center={[20, 70]}
      zoom={4}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {waypoints.length > 0 && (
        <Polyline
          positions={waypoints.map((p) => [p.lat, p.lon])}
          color="cyan"
        />
      )}
    </MapContainer>
  );
}
