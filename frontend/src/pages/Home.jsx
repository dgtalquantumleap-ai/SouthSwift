import { useState, useEffect } from 'react';
import { getListings } from '../utils/api';
import ListingCard from '../components/ListingCard';
import { Search, Shield, SlidersHorizontal } from 'lucide-react';

const G    = '#1B4332';
const GOLD = '#C8963C';

export default function Home() {
  const [listings,   setListings]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState({ city:'', state:'', min_price:'', max_price:'', bedrooms:'', swiftshield:'' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = (params = {}) => {
    setLoading(true);
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
    getListings({ ...activeFilters, limit: 12, ...params })
      .then(r => {
        setListings(r.data.listings);
        setPagination(r.data.pagination);
      })
      .catch(() => { setListings([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings({ page: 1 }); }, [filters]);

  const states = ['Lagos','Abuja','Rivers','Oyo','Kwara','Osun','Ekiti','Enugu','Kano','Kaduna'];

  return (
    <div style={s.page}>
      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroTag}>
            <Shield size={14} color={GOLD} />
            <span>SwiftShield Escrow Protected</span>
          </div>
          <h1 style={s.heroTitle}>
            Find Your Next Home.<br />
            <span style={{ color: GOLD }}>Protected From Day One.</span>
          </h1>
          <p style={s.heroSub}>
            Verified agents · Escrow payments · Free legal counsel · Across Nigeria
          </p>

          {/* Search bar */}
          <div style={s.searchBar}>
            <Search size={18} color="#999" />
            <input
              placeholder="Search by city e.g. Lagos, Ibadan, Ilorin..."
              style={s.searchInput}
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && fetchListings()}
            />
            <button style={s.searchBtn} onClick={fetchListings}>Search</button>
          </div>

          {/* Stats */}
          <div style={s.heroStats}>
            {[['🛡️','SwiftShield','Escrow every deal'],
              ['📋','SwiftDoc','Legal docs auto-generated'],
              ['⚖️','SwiftCounsel','Free property lawyers'],
              ['🔗','SwiftConnect','Monitored agent chat']].map(([icon,name,desc])=>(
              <div key={name} style={s.statItem}>
                <span style={s.statIcon}>{icon}</span>
                <div>
                  <div style={s.statName}>{name}</div>
                  <div style={s.statDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={s.filterBar}>
        <div style={s.filterInner}>
          <select style={s.select} value={filters.state} onChange={e => setFilters(f=>({...f,state:e.target.value}))}>
            <option value="">All States</option>
            {states.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <select style={s.select} value={filters.bedrooms} onChange={e => setFilters(f=>({...f,bedrooms:e.target.value}))}>
            <option value="">Any Bedrooms</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+ Beds</option>)}
          </select>
          <select style={s.select} value={filters.swiftshield} onChange={e => setFilters(f=>({...f,swiftshield:e.target.value}))}>
            <option value="">All Listings</option>
            <option value="true">SwiftShield Only</option>
          </select>
          <input style={s.priceInput} type="number" placeholder="Max Price (₦)" value={filters.max_price}
            onChange={e => setFilters(f=>({...f,max_price:e.target.value}))} />
          <button style={s.filterBtn} onClick={fetchListings}>Apply Filters</button>
          <button style={s.clearBtn} onClick={() => { setFilters({city:'',state:'',min_price:'',max_price:'',bedrooms:'',swiftshield:''}); }}>Clear</button>
        </div>
      </div>

      {/* LISTINGS GRID */}
      <div style={s.container}>
        <div style={s.resultsHeader}>
          <h2 style={s.resultsTitle}>
            {loading ? 'Loading...' : `${pagination.total} Properties Available`}
          </h2>
        </div>

        {loading ? (
          <div style={s.loading}>🛡️ Finding protected properties...</div>
        ) : listings.length === 0 ? (
          <div style={s.empty}>
            <Shield size={48} color="#DDD" />
            <p>No listings found. Try different filters.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

        {pagination.pages > 1 && (
          <div style={{display:'flex', justifyContent:'center', gap:8, marginTop:28}}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchListings({ page: pagination.page - 1 })}
              style={{padding:'8px 18px', borderRadius:8, border:'1px solid #DDD',
                      background:'white', cursor:'pointer', fontWeight:700,
                      opacity: pagination.page <= 1 ? 0.4 : 1}}
            >
              ← Previous
            </button>
            <span style={{padding:'8px 14px', fontSize:13, color:'#666'}}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} listings)
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchListings({ page: pagination.page + 1 })}
              style={{padding:'8px 18px', borderRadius:8, border:'1px solid #DDD',
                      background:'white', cursor:'pointer', fontWeight:700,
                      opacity: pagination.page >= pagination.pages ? 0.4 : 1}}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:         { fontFamily:'Arial,sans-serif' },
  hero:         { background:`linear-gradient(135deg, ${G} 0%, #0A1A0A 100%)`,
                  padding:'60px 20px 50px', color:'white' },
  heroInner:    { maxWidth:860, margin:'0 auto' },
  heroTag:      { display:'inline-flex', alignItems:'center', gap:6,
                  background:'rgba(200,150,60,0.15)', border:'1px solid rgba(200,150,60,0.4)',
                  color:GOLD, fontSize:12, fontWeight:700, padding:'5px 14px',
                  borderRadius:20, marginBottom:18 },
  heroTitle:    { fontSize:42, fontWeight:900, margin:'0 0 14px', lineHeight:1.2,
                  fontFamily:'Georgia,serif' },
  heroSub:      { fontSize:16, color:'rgba(255,255,255,0.7)', marginBottom:30 },
  searchBar:    { display:'flex', alignItems:'center', background:'white', borderRadius:12,
                  padding:'8px 14px', gap:10, maxWidth:600, marginBottom:36,
                  boxShadow:'0 4px 20px rgba(0,0,0,0.2)' },
  searchInput:  { flex:1, border:'none', outline:'none', fontSize:14, color:'#333' },
  searchBtn:    { background:G, color:'white', border:'none', padding:'8px 20px',
                  borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 },
  heroStats:    { display:'flex', gap:24, flexWrap:'wrap' },
  statItem:     { display:'flex', alignItems:'center', gap:10 },
  statIcon:     { fontSize:22 },
  statName:     { fontSize:13, fontWeight:700, color:'white' },
  statDesc:     { fontSize:11, color:'rgba(255,255,255,0.5)' },
  filterBar:    { background:'white', borderBottom:'1px solid #E5E7EB',
                  padding:'12px 20px', position:'sticky', top:64, zIndex:90 },
  filterInner:  { maxWidth:1200, margin:'0 auto', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' },
  select:       { border:'1px solid #DDD', borderRadius:8, padding:'7px 12px',
                  fontSize:13, outline:'none', cursor:'pointer', background:'white' },
  priceInput:   { border:'1px solid #DDD', borderRadius:8, padding:'7px 12px',
                  fontSize:13, outline:'none', width:140 },
  filterBtn:    { background:G, color:'white', border:'none', padding:'8px 18px',
                  borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 },
  clearBtn:     { background:'transparent', color:'#666', border:'1px solid #DDD',
                  padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:13 },
  container:    { maxWidth:1200, margin:'0 auto', padding:'28px 20px' },
  resultsHeader:{ marginBottom:20 },
  resultsTitle: { fontSize:18, fontWeight:700, color:'#111', margin:0 },
  grid:         { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',
                  gap:22 },
  loading:      { textAlign:'center', padding:60, fontSize:16, color:G },
  empty:        { textAlign:'center', padding:60, color:'#999' },
};
