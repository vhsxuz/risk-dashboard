import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import ImageryLayer from '@arcgis/core/layers/ImageryLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Zoom from '@arcgis/core/widgets/Zoom';
import Legend from '@arcgis/core/widgets/Legend';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';

// Import CSS for ArcGIS
import '@arcgis/core/assets/esri/themes/dark/main.css';

import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';

const MapComponent = ({ 
  layerConfigs, 
  onMapClick, 
  activeLayers, 
  layerOpacities,
  viewRef,
  identifyPoint
}) => {
  const mapDiv = useRef(null);
  const layersRef = useRef({});
  const markerLayerRef = useRef(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    // Initialize Map
    const map = new Map({
      basemap: "dark-gray-vector"
    });

    // Initialize View
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [118, -2.5],
      zoom: 5,
      ui: { components: [] },
      padding: { left: 340 } // Space for sidebar
    });

    viewRef.current = view;

    // Add Widgets
    view.ui.add(new Zoom({ view }), "top-right");
    view.ui.add(new Legend({ view, style: { type: "card", layout: "side-by-side" } }), "bottom-right");
    view.ui.add(new ScaleBar({ view, unit: "metric", style: "line" }), "bottom-left");

    // Initialize Layers
    Object.keys(layerConfigs).forEach(key => {
      const cfg = layerConfigs[key];
      let layer;
      
      if (cfg.type === 'feature') {
        const crimeRenderer = {
          type: "unique-value",
          field: "dominant",
          defaultSymbol: {
            type: "simple-fill",
            color: [160, 160, 160, 0.45],
            outline: { color: [255, 255, 255, 0.6], width: 0.5 }
          },
          uniqueValueInfos: [
            { value: "Property", label: "Property Crime", symbol: { type: "simple-fill", color: [239, 68, 68, 0.45], outline: { color: [239, 68, 68, 0.85], width: 1.5 } } },
            { value: "Physical", label: "Physical Crime", symbol: { type: "simple-fill", color: [59, 130, 246, 0.45], outline: { color: [59, 130, 246, 0.85], width: 1.5 } } },
            { value: "Narcotics", label: "Narcotics", symbol: { type: "simple-fill", color: [34, 197, 94, 0.45], outline: { color: [34, 197, 94, 0.85], width: 1.5 } } },
            { value: "Fraud/Corruption", label: "Fraud / Corruption", symbol: { type: "simple-fill", color: [168, 85, 247, 0.45], outline: { color: [168, 85, 247, 0.85], width: 1.5 } } }
          ],
          visualVariables: [{
            type: "opacity",
            field: "total_crim",
            stops: [
              { value: 688, opacity: 0.20 },
              { value: 5000, opacity: 0.45 },
              { value: 15000, opacity: 0.70 },
              { value: 32232, opacity: 0.92 }
            ]
          }]
        };

        layer = new FeatureLayer({
          url: cfg.url,
          title: cfg.title,
          opacity: layerOpacities[key] || 0.85,
          visible: activeLayers[key],
          renderer: crimeRenderer
        });
      } else {
        layer = new ImageryLayer({
          url: cfg.url,
          title: cfg.title,
          opacity: layerOpacities[key] || 0.7,
          visible: activeLayers[key]
        });
      }
      
      layersRef.current[key] = layer;
      map.add(layer);
    });

    // Marker Layer - Add LAST to stay on top
    const markerLayer = new GraphicsLayer({
      title: "Selection Marker",
      listMode: "hide"
    });
    map.add(markerLayer);
    markerLayerRef.current = markerLayer;

    // Handle Clicks
    view.on("click", (event) => {
      onMapClick(event.mapPoint);
    });

    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, []);

  // Sync reactive state to ArcGIS Objects
  useEffect(() => {
    Object.keys(layersRef.current).forEach(key => {
      const layer = layersRef.current[key];
      if (layer) {
        layer.visible = activeLayers[key];
        layer.opacity = layerOpacities[key];
      }
    });
  }, [activeLayers, layerOpacities]);

  // Sync Marker
  useEffect(() => {
    if (!markerLayerRef.current) return;
    markerLayerRef.current.removeAll();

    if (identifyPoint.lat && identifyPoint.lon) {
      const point = new Point({
        latitude: identifyPoint.lat,
        longitude: identifyPoint.lon
      });

      const graphic = new Graphic({
        geometry: point,
        symbol: {
          type: "simple-marker",
          style: "circle",
          color: [59, 130, 246, 0.5],
          size: "24px",
          outline: {
            color: [255, 255, 255, 0.9],
            width: 2
          }
        }
      });

      // Add a core point
      const coreGraphic = new Graphic({
        geometry: point,
        symbol: {
          type: "simple-marker",
          style: "circle",
          color: [59, 130, 246, 1],
          size: "10px",
          outline: {
            color: [255, 255, 255, 1],
            width: 1.5
          }
        }
      });

      markerLayerRef.current.addMany([graphic, coreGraphic]);
    }
  }, [identifyPoint]);

  return <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />;
};

export default MapComponent;
