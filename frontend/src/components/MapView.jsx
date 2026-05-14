import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

const DAVIS_CENTER = [38.5449, -121.7405];

const defaultIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
        <path d="M17 0C7.6 0 0 7.4 0 16.6 0 28.1 17 44 17 44s17-15.9 17-27.4C34 7.4 26.4 0 17 0z" fill="#1F1F1F"/>
        <circle cx="17" cy="16.5" r="6" fill="#fff"/>
      </svg>`
    ),
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
});

const activeIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 34 44">
        <path d="M17 0C7.6 0 0 7.4 0 16.6 0 28.1 17 44 17 44s17-15.9 17-27.4C34 7.4 26.4 0 17 0z" fill="#5F6C40"/>
        <circle cx="17" cy="16.5" r="6" fill="#fff"/>
      </svg>`
    ),
  iconSize: [40, 52],
  iconAnchor: [20, 52],
  popupAnchor: [0, -48],
});

function PanTo({ listing }) {
  const map = useMap();
  useEffect(() => {
    if (listing) {
      map.flyTo([listing.location.lat, listing.location.lng], 14, { duration: 0.6 });
    }
  }, [listing, map]);
  return null;
}

export default function MapView({ listings, highlightedId, onPinClick }) {
  const active = listings.find((l) => l._id === highlightedId);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={DAVIS_CENTER}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {listings.map((l) => (
          <Marker
            key={l._id}
            position={[l.location.lat, l.location.lng]}
            icon={l._id === highlightedId ? activeIcon : defaultIcon}
            eventHandlers={{
              click: () => onPinClick?.(l._id),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{l.name}</div>
                <div className="text-ink-500">{l.address}</div>
                <div className="mt-1">
                  ${l.priceMin.toLocaleString()}+ / month
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <PanTo listing={active} />
      </MapContainer>
    </div>
  );
}
