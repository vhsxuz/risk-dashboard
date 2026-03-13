import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import MapComponent from './components/Map/MapComponent';
import Sidebar from './components/Sidebar/Sidebar';
import Point from '@arcgis/core/geometry/Point';
import { suggestLocations, addressToLocations } from '@arcgis/core/rest/locator';
import { useDebounce } from './hooks/useDebounce';

const LAYER_CONFIG = {
  banjir: {
    url: "/api/v1/risk/proxy/inarisk/INDEKS_BAHAYA_BANJIR/ImageServer",
    title: "Bahaya Banjir (Flood Risk)",
    type: "imagery"
  },
  gempa: {
    url: "/api/v1/risk/proxy/inarisk/layer_bahaya_gempabumi_klasifikasi_PVMBG/ImageServer",
    title: "Bahaya Gempa Bumi (Earthquake)",
    type: "imagery"
  },
  likuifikasi: {
    url: "/api/v1/risk/proxy/inarisk/INDEKS_BAHAYA_LIKUEFAKSI/ImageServer",
    title: "Bahaya Likuifikasi (Liquefaction)",
    type: "imagery"
  },
  kriminalitas: {
    url: "/api/v1/risk/proxy-crime/Indonesia_Crime_Map/FeatureServer/0",
    title: "Indeks Kriminalitas (Criminality Index)",
    type: "feature"
  }
};

// Use the backend proxy for geocoding to inject credentials
const GEOCODE_URL = "/api/v1/risk/proxy-geocode";

function App() {
  const [activeLayers, setActiveLayers] = useState({
    banjir: true,
    gempa: true,
    likuifikasi: true,
    kriminalitas: true
  });

  const [layerOpacities, setLayerOpacities] = useState({
    banjir: 0.7,
    gempa: 0.7,
    likuifikasi: 0.7,
    kriminalitas: 0.85
  });

  const [identifyPoint, setIdentifyPoint] = useState({ lat: null, lon: null });
  const [riskData, setRiskData] = useState({
    banjir: 'Click map',
    gempa: 'Click map',
    likuifikasi: 'Click map',
    kriminalitas: 'Click map'
  });
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const viewRef = useRef(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    if (debouncedSearchQuery && debouncedSearchQuery.length > 2) {
      handleSuggestions(debouncedSearchQuery);
    } else {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
    }
  }, [debouncedSearchQuery]);

  const handleSuggestions = async (query) => {
    setIsSearching(true);
    setSearchError(null);
    console.log("Searching for:", query);
    try {
      // Try suggestions first
      const results = await suggestLocations(GEOCODE_URL, {
        text: query,
        maxSuggestions: 6
      });
      
      console.log("Suggest results:", results);
      
      if (results && results.length > 0) {
        setSuggestions(results);
      } else {
        // Fallback: perform a full location search
        const locations = await addressToLocations(GEOCODE_URL, {
          address: { SingleLine: query },
          maxLocations: 6,
          outFields: ["Match_addr"]
        });
        
        if (locations && locations.length > 0) {
          setSuggestions(locations.map(loc => ({ 
            text: loc.address, 
            magicKey: loc.attributes?.magicKey || null,
            isLocation: true 
          })));
        } else {
          setSearchError("No results found for '" + query + "'");
          setSuggestions([]);
        }
      }
    } catch (error) {
      console.error("Suggestion error:", error);
      setSearchError("Search details: " + (error.message || "Request failed"));
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const identifyAtPoint = useCallback(async (mapPoint) => {
    const lat = Math.round(mapPoint.latitude * 10000) / 10000;
    const lon = Math.round(mapPoint.longitude * 10000) / 10000;

    setIdentifyPoint({ lat, lon });
    setIsLoadingRisk(true);

    try {
      const response = await axios.post('/api/v1/risk', { latitude: lat, longitude: lon });
      const data = response.data;

      setRiskData({
        banjir: data.risiko_banjir || 'No Data',
        gempa: data.risiko_gempa || 'No Data',
        likuifikasi: data.risiko_likuifikasi || 'No Data',
        kriminalitas: data.risiko_kriminalitas || 'No Data'
      });
    } catch (error) {
      console.error("Identify error:", error);
      setRiskData({
        banjir: 'Error',
        gempa: 'Error',
        likuifikasi: 'Error',
        kriminalitas: 'Error'
      });
    } finally {
      setIsLoadingRisk(false);
    }
  }, []);

  const handleLocationSearch = async (query) => {
    if (!query) return;
    setIsSearching(true);
    setSearchError(null);
    console.log("Performing full search for:", query);
    try {
      const results = await addressToLocations(GEOCODE_URL, {
        address: { SingleLine: query },
        maxLocations: 6,
        outFields: ["Match_addr", "City", "Region"]
      });

      console.log("Full search results:", results);

      if (results && results.length > 0) {
        if (results.length === 1) {
          const point = results[0].location;
          viewRef.current.goTo({ target: point, zoom: 12 }, { duration: 1200 });
          identifyAtPoint(point);
          setSuggestions([]);
        } else {
          setSuggestions(results.map(loc => ({ 
            text: loc.address, 
            magicKey: loc.attributes?.magicKey || null,
            isLocation: true 
          })));
        }
      } else {
        setSearchError("No results found for '" + query + "' on ArcGIS World Geocoding.");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Geocoding failed: " + (error.message || "Check network/API key"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (!suggestion) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    const queryText = suggestion.text || suggestion.address;
    skipSearchRef.current = true;
    setSearchQuery(queryText);
    setSuggestions([]);
    setSearchError(null);
    try {
      const results = await addressToLocations(GEOCODE_URL, {
        address: { SingleLine: queryText },
        magicKey: suggestion.magicKey,
        maxLocations: 1,
        outFields: ["*"]
      });

      if (results.length > 0) {
        const point = results[0].location;
        viewRef.current.goTo({ target: point, zoom: 12 }, { duration: 1200 });
        identifyAtPoint(point);
      }
    } catch (error) {
      console.error("Suggestion selection error:", error);
    }
  };

  const handleCoordSearch = (lat, lon) => {
    if (!lat || !lon) return;
    const point = new Point({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
    viewRef.current.goTo({ target: point, zoom: 12 }, { duration: 1200 });
    identifyAtPoint(point);
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeLayers={activeLayers}
        setActiveLayers={setActiveLayers}
        layerOpacities={layerOpacities}
        setLayerOpacities={setLayerOpacities}
        riskData={riskData}
        onLocationSearch={handleLocationSearch}
        onCoordSearch={handleCoordSearch}
        onSuggestionClick={handleSuggestionClick}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        suggestions={suggestions}
        isSearching={isSearching}
        searchError={searchError}
        identifyPoint={identifyPoint}
        isLoadingRisk={isLoadingRisk}
      />
      <main className="flex-1 relative">
        <MapComponent 
          layerConfigs={LAYER_CONFIG}
          activeLayers={activeLayers}
          layerOpacities={layerOpacities}
          onMapClick={identifyAtPoint}
          viewRef={viewRef}
          identifyPoint={identifyPoint}
        />
      </main>
    </div>
  );
}

export default App;
