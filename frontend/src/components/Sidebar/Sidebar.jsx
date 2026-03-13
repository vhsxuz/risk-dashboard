import React, { useState } from 'react';
import { Search, MapPin, Waves, Activity, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

const Sidebar = ({ 
  activeLayers, 
  setActiveLayers, 
  layerOpacities, 
  setLayerOpacities,
  riskData,
  onLocationSearch,
  onCoordSearch,
  onSuggestionClick,
  searchQuery,
  setSearchQuery,
  suggestions,
  isSearching,
  searchError,
  identifyPoint,
  isLoadingRisk
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('location');
  const [coords, setCoords] = useState({ lat: '', lon: '' });

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpacityChange = (key, val) => {
    setLayerOpacities(prev => ({ ...prev, [key]: parseFloat(val) / 100 }));
  };

  const getRiskBadgeClass = (risk) => {
    const r = String(risk).toLowerCase();
    if (r.includes('tinggi') && !r.includes('sangat')) return 'risk-tinggi';
    if (r.includes('sangat tinggi')) return 'risk-sangat-tinggi';
    if (r.includes('sedang')) return 'risk-sedang';
    if (r.includes('rendah')) return 'risk-rendah';
    if (r.includes('aman')) return 'risk-aman';
    return 'risk-unknown';
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
            <h1>Prisma Risk Validator</h1>
          </div>
          <p>Interactive visualization of BNPB disaster risk imagery layers across Indonesia.</p>
        </div>

        <div className="sidebar-body">
          <section>
            <span className="section-label">Find Location</span>
            <div className="search-tabs">
              <button 
                className={`search-tab ${activeTab === 'location' ? 'active' : ''}`}
                onClick={() => setActiveTab('location')}
              >
                <Search size={14} /> Location
              </button>
              <button 
                className={`search-tab ${activeTab === 'coords' ? 'active' : ''}`}
                onClick={() => setActiveTab('coords')}
              >
                <MapPin size={14} /> Coordinates
              </button>
            </div>

            {activeTab === 'location' ? (
              <div className="animate-fade" style={{ position: 'relative' }}>
                <div className="search-input-wrapper">
                  <input 
                    className="search-input" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city, address, place…"
                  />
                  {searchQuery && (
                    <button 
                      className="clear-search-btn"
                      onClick={() => {
                        setSearchQuery('');
                        onSuggestionClick(null); // Optional: clear marker too if desired, usually just clear text
                      }}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {isSearching && (
                  <div className="suggestions-list" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.75rem' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Searching...
                  </div>
                )}
                
                

                {!isSearching && searchError && (
                  <div className="suggestions-list" style={{ padding: '12px', color: '#ef4444', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {searchError}
                  </div>
                )}

                {suggestions.length > 0 && !isSearching && (
                  <div className="suggestions-list">
                    {suggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className="suggestion-item"
                        onClick={() => onSuggestionClick(suggestion)}
                      >
                        <MapPin size={12} style={{ color: '#60a5fa' }} />
                        <span>{suggestion.text || suggestion.address}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  className="primary-button"
                  onClick={() => onLocationSearch(searchQuery)}
                >
                  Search
                </button>
              </div>
            ) : (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <span className="section-label" style={{ marginBottom: '4px' }}>Lat</span>
                    <input 
                      className="search-input" 
                      type="number" 
                      value={coords.lat}
                      onChange={(e) => setCoords(prev => ({ ...prev, lat: e.target.value }))}
                      placeholder="-6.20"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="section-label" style={{ marginBottom: '4px' }}>Lon</span>
                    <input 
                      className="search-input" 
                      type="number" 
                      value={coords.lon}
                      onChange={(e) => setCoords(prev => ({ ...prev, lon: e.target.value }))}
                      placeholder="106.84"
                    />
                  </div>
                </div>
                <button 
                  className="primary-button"
                  onClick={() => onCoordSearch(coords.lat, coords.lon)}
                >
                  Go to Location
                </button>
              </div>
            )}
          </section>

          <section>
            <span className="section-label">Layers</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <LayerCard 
                id="banjir"
                name="Bahaya Banjir"
                desc="Flood risk index"
                icon={<Waves size={18} color="white" />}
                iconBg="linear-gradient(135deg, #1e40af, #3b82f6)"
                active={activeLayers.banjir}
                opacity={layerOpacities.banjir * 100}
                onToggle={() => toggleLayer('banjir')}
                onOpacityChange={(val) => handleOpacityChange('banjir', val)}
              />
              <LayerCard 
                id="gempa"
                name="Bahaya Gempa Bumi"
                desc="Earthquake hazard"
                icon={<Activity size={18} color="white" />}
                iconBg="linear-gradient(135deg, #b91c1c, #ef4444)"
                active={activeLayers.gempa}
                opacity={layerOpacities.gempa * 100}
                onToggle={() => toggleLayer('gempa')}
                onOpacityChange={(val) => handleOpacityChange('gempa', val)}
              />
              <LayerCard 
                id="likuifikasi"
                name="Bahaya Likuifikasi"
                desc="Liquefaction risk"
                icon={<AlertTriangle size={18} color="white" />}
                iconBg="linear-gradient(135deg, #b45309, #f59e0b)"
                active={activeLayers.likuifikasi}
                opacity={layerOpacities.likuifikasi * 100}
                onToggle={() => toggleLayer('likuifikasi')}
                onOpacityChange={(val) => handleOpacityChange('likuifikasi', val)}
              />
              <LayerCard 
                id="kriminalitas"
                name="Indeks Kriminalitas"
                desc="Crime index by province"
                icon={<ShieldAlert size={18} color="white" />}
                iconBg="linear-gradient(135deg, #6d28d9, #a78bfa)"
                active={activeLayers.kriminalitas}
                opacity={layerOpacities.kriminalitas * 100}
                onToggle={() => toggleLayer('kriminalitas')}
                onOpacityChange={(val) => handleOpacityChange('kriminalitas', val)}
              />
            </div>
          </section>

          <section>
            <span className="section-label">Identify Result</span>
            <div className="identify-card">
               <div className="identify-coords">
                  <span>LAT: {identifyPoint.lat || '—'}</span>
                  <span>LON: {identifyPoint.lon || '—'}</span>
               </div>
               
               <div className="risk-rows">
                  <RiskRow label="🌊 Banjir" value={riskData.banjir} badgeClass={getRiskBadgeClass(riskData.banjir)} loading={isLoadingRisk} />
                  <RiskRow label="🔴 Gempa" value={riskData.gempa} badgeClass={getRiskBadgeClass(riskData.gempa)} loading={isLoadingRisk} />
                  <RiskRow label="⚠️ Likuifikasi" value={riskData.likuifikasi} badgeClass={getRiskBadgeClass(riskData.likuifikasi)} loading={isLoadingRisk} />
                  <RiskRow label="🚨 Kriminalitas" value={riskData.kriminalitas} badgeClass={getRiskBadgeClass(riskData.kriminalitas)} loading={isLoadingRisk} />
               </div>

               {!identifyPoint.lat && (
                 <p style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
                   Click map to identify risk
                 </p>
               )}
            </div>
          </section>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', color: '#475569', textAlign: 'center' }}>
          Data source: BNPB InaRISK • ArcGIS JS SDK 4.29
        </div>
      </aside>

      <button 
        className={`sidebar-toggle-btn ${collapsed ? 'collapsed' : ''}`} 
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </>
  );
};

const LayerCard = ({ name, desc, icon, iconBg, active, opacity, onToggle, onOpacityChange }) => (
  <div className={`layer-card ${active ? 'active' : ''}`} onClick={onToggle}>
    <div className="layer-card-main">
      <div className="layer-icon-box" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="layer-info">
        <div className="layer-name">{name}</div>
        <div className="layer-desc">{desc}</div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <label className="toggle-switch">
          <input type="checkbox" checked={active} onChange={onToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>
    </div>
    {active && (
      <div className="opacity-control" onClick={(e) => e.stopPropagation()}>
        <span className="opacity-label">Opacity</span>
        <input 
          type="range" 
          className="range-slider"
          min="0" max="100" 
          value={opacity}
          onChange={(e) => onOpacityChange(e.target.value)}
        />
      </div>
    )}
  </div>
);

const RiskRow = ({ label, value, badgeClass, loading }) => (
  <div className="risk-row">
    <span className="risk-label">{label}</span>
      {loading ? (
        <Loader2 size={12} className="animate-spin" style={{ color: '#60a5fa' }} />
      ) : (
        <span className={`risk-badge ${badgeClass}`}>
          {value || 'N/A'}
        </span>
      )}
  </div>
);

export default Sidebar;
