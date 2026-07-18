"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type LocationMapPickerProps = {
  country: string;
  city: string;
  onPinDrop: (lat: number, lng: number, subMarket?: string) => void;
  onGeocodingChange?: (isGeocoding: boolean) => void;
  savedPin?: { lat: number; lng: number } | null;
};

function MapController({ country, city }: { country: string; city: string }) {
  const map = useMap();

  useEffect(() => {
    if (!country || !city) return;

    const fetchCoordinates = async () => {
      try {
        const query = encodeURIComponent(`${city}, ${country}`);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon) && map && map.getContainer()) {
            // Defer to next frame to ensure DOM is fully ready
            requestAnimationFrame(() => {
              map.invalidateSize(); // Recalculate container dimensions
              map.flyTo([lat, lon], 11, { duration: 1.5 });
            });
          }
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
      }
    };

    fetchCoordinates();
  }, [country, city, map]);

  return null;
}

function MapClickHandler({
  onPinDrop,
  onGeocodingChange,
}: {
  onPinDrop: (lat: number, lng: number, subMarket?: string) => void;
  onGeocodingChange?: (isGeocoding: boolean) => void;
}) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      let subMarket = "";

      onGeocodingChange?.(true);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
        );
        const data = await res.json();
        const addr = data.address || {};
        subMarket =
          addr.neighbourhood ||
          addr.suburb ||
          addr.city_district ||
          addr.quarter ||
          addr.hamlet ||
          addr.city ||
          "";
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
      }

      onGeocodingChange?.(false);

      onPinDrop(lat, lng, subMarket);
    },
  });
  return null;
}

export default function LocationMapPicker({
  country,
  city,
  onPinDrop,
  onGeocodingChange,
  savedPin,
}: LocationMapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => setMounted(true), []);

  const handleGeocodingChange = (geocoding: boolean) => {
    setIsGeocoding(geocoding);
    onGeocodingChange?.(geocoding);
  };

  // Initialize map center when mounted
  useEffect(() => {
    if (mounted && !mapCenter) {
      // Default center if no pin and no geocoding yet
      setMapCenter({ lat: 25.2048, lng: 55.2708 });
    }
  }, [mounted, mapCenter]);

  if (!mounted || !mapCenter) return <div className="h-[300px] w-full rounded-lg bg-slate-800 animate-pulse" />;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          Refine Location (Optional)
        </label>
        <span className="text-xs text-slate-500">Click map to drop pin</span>
      </div>
      <div className="h-[300px] w-full rounded-lg border border-slate-700 overflow-hidden z-0">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* This component handles auto-centering when country/city changes */}
          <MapController country={country} city={city} />

          <MapClickHandler
            onPinDrop={onPinDrop}
            onGeocodingChange={handleGeocodingChange}
          />
          {savedPin && (
            <CircleMarker
              center={[savedPin.lat, savedPin.lng]}
              radius={8}
              fillColor="#10b981"
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>Target Location</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between">
        {savedPin && (
          <p className="text-xs text-emerald-400 font-mono">
            Coordinates: {savedPin.lat.toFixed(4)}, {savedPin.lng.toFixed(4)}
          </p>
        )}
        {isGeocoding && (
          <p className="text-xs text-amber-400 animate-pulse flex items-center gap-2">
            <span className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            Locating neighborhood...
          </p>
        )}
      </div>
    </div>
  );
}
