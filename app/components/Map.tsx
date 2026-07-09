'use client';

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useState, useEffect } from 'react';
import { Sauna } from './Chat';

export default function MapComponent({ saunas }: { saunas: Sauna[] }) {
  const [center, setCenter] = useState({ lat: 33.5902, lng: 130.4075 }); // Default: Fukuoka
  const [zoom, setZoom] = useState(8); // Broad enough to see Kyushu

  useEffect(() => {
    if (saunas && saunas.length > 0) {
      if (saunas[0].location) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCenter(saunas[0].location);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setZoom(12);
      }
    }
  }, [saunas]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: 33.5902, lng: 130.4075 }}
          center={center}
          defaultZoom={8}
          zoom={zoom}
          mapId="DEMO_MAP_ID"
          onCenterChanged={(e) => setCenter(e.detail.center)}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
        >
          {saunas.map((sauna, index) => (
            <AdvancedMarker 
              key={sauna.id || index} 
              position={sauna.location}
              title={sauna.name}
            >
              <Pin background={"#059669"} borderColor={"#047857"} glyphColor={"#ffffff"} />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
