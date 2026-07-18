"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Invalidate size after mount so tiles paint correctly in flex layouts / PDF capture. */
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
}

/** Locked Leaflet map — DOM tiles (img) so modern-screenshot / pdf export can capture them. */
export default function ProjectLocationMap({ lat, lng }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      dragging={false}
      zoomControl={false}
      attributionControl={false}
      keyboard={false}
      className="h-full w-full z-0"
      style={{ pointerEvents: "none", height: "100%", width: "100%" }}
    >
      <MapInvalidateSize />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        crossOrigin="anonymous"
      />
      <Marker position={[lat, lng]} icon={markerIcon} />
    </MapContainer>
  );
}
