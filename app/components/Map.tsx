'use client';

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useState, useEffect } from 'react';
import { Sauna } from './Chat';

export default function MapComponent({ saunas }: { saunas: Sauna[] }) {
  const [center, setCenter] = useState({ lat: 33.5902, lng: 130.4075 }); // Default: Fukuoka
  const [zoom, setZoom] = useState(8); // Broad enough to see Kyushu
  const [selectedSauna, setSelectedSauna] = useState<Sauna | null>(null);

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
              onClick={() => setSelectedSauna(sauna)}
            >
              <Pin background={"#059669"} borderColor={"#047857"} glyphColor={"#ffffff"} />
            </AdvancedMarker>
          ))}

          {selectedSauna && (
            <InfoWindow
              position={selectedSauna.location}
              onCloseClick={() => setSelectedSauna(null)}
            >
              <div className="p-1 max-w-[200px] text-gray-800">
                <h3 className="font-bold text-base mb-1">{selectedSauna.name}</h3>
                {!!selectedSauna.rating && (
                  <p className="text-sm">⭐️ {String(selectedSauna.rating)}</p>
                )}
                {!!selectedSauna.water_temp && (
                  <p className="text-sm">💧 水風呂: {String(selectedSauna.water_temp)}℃</p>
                )}
                {!!selectedSauna.features && Array.isArray(selectedSauna.features) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedSauna.features.map((f: string, i: number) => (
                      <span key={i} className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
