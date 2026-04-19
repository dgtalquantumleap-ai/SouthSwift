import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getListing, initiateDeal } from '../utils/api';
import { useAuth } from '../App';
import { Shield, MapPin, Bed, Bath, CheckCircle, Phone, Mail, AlertTriangle } from 'lucide-react';

const G = '#1B4332'; const GOLD = '#C8963C';

export default function ListingDetail() {
  const { id }                 = useParams();
  const { user }               = useAuth();
  const navigate               = useNavigate();
  const [listing, setListing]  = useState(null);
  const [loading, setLoading]  = useState(true);
  const [dealing, setDealing]  = useState(false);
  const [moveIn,  setMoveIn]   = useState('');

  useEffect(() => {
    getListing(id)
      .then(r => setListing(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDeal = async () => {
    if (!user) { toast.error('Please login to initiate a deal.'); return navigate('/login'); }
    if (!moveIn) { toast.error('Please select a move-in date.'); return; }
    setDealing(true);
    try {
      const res = await initiateDeal({ listing_id: id, move_in_date: moveIn, lease_duration_months: 12 });
      toast.success('SwiftShield escrow initiated! Redirecting to payment...');
      setTimeout(() => window.open(res.data.payment_url, '_blank'), 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate deal.');
    }
    setDealing(false);
  };

  if (loading) return <div style={s.loading}>🛡️ Loading property...</div>;
  if (!listing) return <div style={s.loading}>Property not found.</div>;

  const fee = Math.round(listing.rent_price * 0.02);
  const total = listing.rent_price + fee;

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Images */}
        <div style={s.imgGrid}>
          <img src={listing.images?.[0]||'https://via.placeholder.com/800x400?text=SouthSwift+Property'}
            alt={listing.title} style={s.mainImg}
            onError={e=>{e.target.src='https://via.placeholder.com/800x400?text=SouthSwift';}} />
        </div>

        <div style={s.layout}>
          {/* LEFT — details */}
          <div style={s.left}>
            <div style={s.topRow}>
              <div>
                <h1 style={s.title}>{listing.title}</h1>
                <div style={s.loc}><MapPin size={14} color={GOLD}/> {listing.address}, {listing.city}, {listing.state}</div>
              </div>
              <div style={s.price}>
                ₦{Number(listing.rent_price).toLocaleString()}
                <span style={s.per}>/{listing.rent_period==='monthly'?'month':'year'}</span>
              </div>
            </div>

            <div style={s.specs}>
              <div style={s.spec}><Bed size={16}/> {listing.bedrooms} Bedrooms</div>
              <div style={s.spec}><Bath size={16}/> {listing.bathrooms} Bathrooms</div>
              <div style={s.spec}>🏠 {listing.property_type}</div>
            </div>

            {listing.is_swiftshield && (
              <div style={s.shieldBanner}>
                <Shield size={20} color={GOLD}/>
                <div>
                  <div style={s.shieldTitle}>SwiftShield Protected</div>
                  <div style={s.shieldSub}>Your payment is held in escrow until you confirm a safe move-in.</div>
                </div>
              </div>
            )}

            <div style={s.section}>
              <h3 style={s.sectionTitle}>Description</h3>
              <p style={s.desc}>{listing.description || 'No description provided.'}</p>
            </div>

            {listing.amenities?.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Amenities</h3>
                <div style={s.amenities}>
                  {listing.amenities.map(a=><span key={a} style={s.amenity}>{a}</span>)}
                </div>
              </div>
            )}

            {/* Agent Card */}
            <div style={s.agentCard}>
              <div style={s.agentAvatar}>{listing.agent_name?.[0]||'A'}</div>
              <div style={s.agentInfo}>
                <div style={s.agentName}>
                  {listing.agent_name}
                  {listing.verification_status==='verified' && <CheckCircle size={14} color="#22C55E"/>}
                </div>
                {listing.verification_status==='verified' && <div style={s.verBadge}>✓ SouthSwift Verified Agent</div>}
                <div style={s.agentStats}>⭐ {listing.agent_rating||'0.0'} · {listing.total_deals||0} deals</div>
                {listing.agency_name && <div style={s.agency}>{listing.agency_name}</div>}
              </div>
            </div>
          </div>

          {/* RIGHT — SwiftShield deal box */}
          <div style={s.dealBox}>
            <div style={s.dealHeader}>
              <Shield size={18} color={GOLD}/>
              <span>SwiftShield Protected Deal</span>
            </div>

            <div style={s.breakdown}>
              <div style={s.bRow}><span>Rent</span><span>₦{Number(listing.rent_price).toLocaleString()}</span></div>
              <div style={s.bRow}><span>SwiftShield fee (2%)</span><span>₦{fee.toLocaleString()}</span></div>
              <div style={{...s.bRow, fontWeight:700, borderTop:'2px solid #EEE', paddingTop:8, marginTop:4}}>
                <span>You pay</span><span style={{color:G}}>₦{total.toLocaleString()}</span>
              </div>
              <div style={s.bNote}>Landlord pays 2% on their end. SouthSwift fee total: 4%.</div>
            </div>

            <label style={s.label}>Move-in Date</label>
            <input type="date" style={s.dateInput} value={moveIn}
              min={new Date().toISOString().split('T')[0]}
              onChange={e=>setMoveIn(e.target.value)} />

            <button onClick={handleDeal} disabled={dealing||!listing.is_available} style={{
              ...s.dealBtn,
              opacity: dealing||!listing.is_available ? 0.6 : 1,
              cursor:  dealing||!listing.is_available ? 'default' : 'pointer',
            }}>
              {!listing.is_available ? 'Property No Longer Available'
               : dealing ? 'Initiating SwiftShield...'
               : '🛡️ Secure This Deal with SwiftShield'}
            </button>

            <div style={s.guarantees}>
              {['Funds held securely until move-in confirmed',
                'Auto-generated SwiftDoc legal agreement',
                'Free SwiftCounsel legal support',
                'Full dispute resolution if issues arise'].map(g=>(
                <div key={g} style={s.guarantee}><CheckCircle size={12} color="#22C55E"/>{g}</div>
              ))}
            </div>

            <div style={s.contactBox}>
              <div style={s.contactTitle}>Contact Agent via SwiftConnect</div>
              <a href={`tel:${listing.agent_phone}`} style={s.contactLink}><Phone size={13}/> {listing.agent_phone}</a>
              <a href={`mailto:${listing.agent_email}`} style={s.contactLink}><Mail size={13}/> {listing.agent_email}</a>
              <div style={s.contactNote}>All communications are monitored and logged by SouthSwift.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { fontFamily:'Arial,sans-serif', background:'#F8FAF8' },
  loading:    { textAlign:'center', padding:80, fontSize:16, color:G },
  container:  { maxWidth:1100, margin:'0 auto', padding:'28px 20px' },
  imgGrid:    { borderRadius:14, overflow:'hidden', marginBottom:28, height:380 },
  mainImg:    { width:'100%', height:'100%', objectFit:'cover' },
  layout:     { display:'flex', gap:28, alignItems:'flex-start', flexWrap:'wrap' },
  left:       { flex:1.5, minWidth:300 },
  topRow:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 },
  title:      { fontSize:24, fontWeight:800, color:'#111', margin:'0 0 6px' },
  loc:        { display:'flex', alignItems:'center', gap:5, color:'#666', fontSize:13 },
  price:      { fontSize:26, fontWeight:900, color:G, textAlign:'right' },
  per:        { fontSize:14, fontWeight:400, color:'#888' },
  specs:      { display:'flex', gap:18, marginBottom:20 },
  spec:       { display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#555', fontWeight:600 },
  shieldBanner:{ display:'flex', gap:12, background:'#0D2A0D', borderRadius:10,
                 padding:'14px 18px', marginBottom:20, alignItems:'flex-start' },
  shieldTitle:{ color:'white', fontWeight:700, fontSize:14 },
  shieldSub:  { color:'#A8D5B5', fontSize:12, marginTop:3 },
  section:    { marginBottom:20 },
  sectionTitle:{ fontSize:16, fontWeight:700, color:'#111', marginBottom:10 },
  desc:       { fontSize:13.5, color:'#555', lineHeight:1.7 },
  amenities:  { display:'flex', flexWrap:'wrap', gap:8 },
  amenity:    { background:'#F0F9F0', color:G, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600 },
  agentCard:  { display:'flex', gap:14, background:'white', border:'1px solid #E5E7EB',
                borderRadius:12, padding:'16px 18px', alignItems:'center' },
  agentAvatar:{ width:48, height:48, borderRadius:'50%', background:G, color:'white',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, flexShrink:0 },
  agentInfo:  { flex:1 },
  agentName:  { display:'flex', alignItems:'center', gap:6, fontWeight:700, fontSize:15, color:'#111' },
  verBadge:   { color:'#22C55E', fontSize:11, fontWeight:700 },
  agentStats: { fontSize:12, color:'#888', marginTop:3 },
  agency:     { fontSize:12, color:'#666' },

  dealBox:    { width:310, background:'white', borderRadius:16, border:`2px solid ${G}`,
                padding:'20px', position:'sticky', top:90, boxShadow:'0 4px 24px rgba(0,0,0,0.1)', flexShrink:0 },
  dealHeader: { display:'flex', alignItems:'center', gap:8, color:G, fontWeight:700,
                fontSize:15, marginBottom:18, paddingBottom:12, borderBottom:'2px solid #EEE' },
  breakdown:  { marginBottom:16 },
  bRow:       { display:'flex', justifyContent:'space-between', fontSize:13, color:'#333', marginBottom:6 },
  bNote:      { fontSize:11, color:'#999', marginTop:6 },
  label:      { display:'block', fontSize:12, fontWeight:700, color:'#444', marginBottom:5 },
  dateInput:  { width:'100%', border:'1px solid #DDD', borderRadius:8, padding:'9px 12px',
                fontSize:13, boxSizing:'border-box', marginBottom:16 },
  dealBtn:    { width:'100%', background:G, color:'white', border:'none', padding:'13px',
                borderRadius:10, fontWeight:700, fontSize:14, marginBottom:14 },
  guarantees: { marginBottom:16 },
  guarantee:  { display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'#555', marginBottom:5 },
  contactBox: { background:'#F8FAF8', borderRadius:10, padding:'12px 14px' },
  contactTitle:{ fontWeight:700, fontSize:12, color:'#444', marginBottom:8 },
  contactLink:{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:G,
                textDecoration:'none', marginBottom:5 },
  contactNote:{ fontSize:10.5, color:'#999', marginTop:6 },
};
