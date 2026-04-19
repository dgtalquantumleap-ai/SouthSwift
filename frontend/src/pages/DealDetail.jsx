import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getDeal, confirmMoveIn, raiseDispute,
  createListing, getDashboard, getPendingAgents,
  verifyAgent, getAllDeals, getAllUsers, getAllListings, releaseFunds,
  getAgent
} from '../utils/api';
import { useAuth } from '../App';
import { Shield, CheckCircle, AlertTriangle, FileText, MessageSquare } from 'lucide-react';

const G = '#1B4332'; const GOLD = '#C8963C';

// ── DEAL DETAIL ──────────────────────────────────────────────────────────────
export function DealDetail() {
  const { id }          = useParams();
  const { user }        = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setL] = useState(true);
  const [reason, setR]  = useState('');

  useEffect(() => {
    getDeal(id).then(r=>setDeal(r.data)).finally(()=>setL(false));
  }, [id]);

  const handleConfirm = async () => {
    try {
      await confirmMoveIn(id);
      toast.success('Move-in confirmed! Funds are being released. 🎉');
      getDeal(id).then(r=>setDeal(r.data));
    } catch(err) { toast.error(err.response?.data?.error||'Failed.'); }
  };

  const handleDispute = async () => {
    if (!reason.trim()) { toast.error('Please describe the issue.'); return; }
    try {
      await raiseDispute(id, reason);
      toast.success('Dispute raised. SouthSwift will review within 24 hours.');
      getDeal(id).then(r=>setDeal(r.data));
    } catch(err) { toast.error(err.response?.data?.error||'Failed.'); }
  };

  if (loading) return <div style={ps.loading}>🛡️ Loading deal...</div>;
  if (!deal)   return <div style={ps.loading}>Deal not found.</div>;

  const isTenant = deal.tenant_id === user?.id;
  const canConfirm = isTenant && ['escrow_held','docs_generated'].includes(deal.status);

  return (
    <div style={ps.page}>
      <div style={ps.container}>
        <div style={ps.dealHeader}>
          <Shield size={24} color={GOLD}/>
          <div>
            <h1 style={ps.dealTitle}>{deal.listing_title}</h1>
            <div style={ps.dealSub}>{deal.city}, {deal.state}</div>
          </div>
          <div style={{...ps.statusBig, background:deal.status==='completed'?'#DCFCE7':'#FEF3C7', color:deal.status==='completed'?'#166534':'#92400E'}}>
            {deal.status.replace(/_/g,' ').toUpperCase()}
          </div>
        </div>

        <div style={ps.layout}>
          <div style={ps.left}>
            <div style={ps.infoCard}>
              <h3 style={ps.cardTitle}>Deal Breakdown</h3>
              {[['Rent Amount',`₦${Number(deal.rent_amount).toLocaleString()}`],
                ['SwiftShield Fee (Tenant 2%)',`₦${Number(deal.service_fee_tenant).toLocaleString()}`],
                ['Total Paid',`₦${Number(deal.total_paid).toLocaleString()}`],
                ['Lease Duration',`${deal.lease_duration_months} months`],
                ['Move-in Date', deal.move_in_date ? new Date(deal.move_in_date).toLocaleDateString('en-NG') : 'Not set'],
                ['Deal ID', deal.id.slice(0,8)+'...'],
                ['Paystack Ref', deal.paystack_reference||'Pending'],
              ].map(([k,v])=>(
                <div key={k} style={ps.row}>
                  <span style={ps.rowK}>{k}</span>
                  <span style={ps.rowV}>{v}</span>
                </div>
              ))}
            </div>

            <div style={ps.infoCard}>
              <h3 style={ps.cardTitle}>Parties</h3>
              {[['Tenant', deal.tenant_name, deal.tenant_phone],
                ['Agent',  deal.agent_name,  deal.agent_phone]].map(([role,name,phone])=>(
                <div key={role} style={ps.party}>
                  <div style={ps.partyRole}>{role}</div>
                  <div style={ps.partyName}>{name}</div>
                  <div style={ps.partyPhone}>{phone}</div>
                </div>
              ))}
            </div>

            {deal.swiftdoc_url && (
              <div style={ps.infoCard}>
                <h3 style={ps.cardTitle}><FileText size={15}/> SwiftDoc — Tenancy Agreement</h3>
                <a href={deal.swiftdoc_url} target="_blank" rel="noreferrer" style={ps.docLink}>
                  📄 Download Your SwiftDoc Agreement
                </a>
              </div>
            )}
          </div>

          <div style={ps.right}>
            {/* SwiftShield Progress */}
            <div style={ps.progressCard}>
              <h3 style={ps.cardTitle}>SwiftShield Progress</h3>
              {['initiated','escrow_held','docs_generated','completed'].map((step,i)=>{
                const steps = ['initiated','escrow_held','docs_generated','completed'];
                const curIdx = steps.indexOf(deal.status);
                const done = i <= curIdx;
                const labels = ['Deal Initiated','Funds in Escrow','Docs Generated','Completed'];
                return (
                  <div key={step} style={ps.step}>
                    <div style={{...ps.dot, background:done?'#22C55E':'#DDD'}}>{done?'✓':''}</div>
                    <span style={{...ps.stepLabel, color:done?'#111':'#999', fontWeight:done?700:400}}>{labels[i]}</span>
                  </div>
                );
              })}
            </div>

            {canConfirm && (
              <div style={ps.actionCard}>
                <h3 style={{...ps.cardTitle, color:'#166534'}}>✅ Ready to Move In?</h3>
                <p style={ps.actionDesc}>Once you confirm, funds will be released to your landlord and the deal will be complete.</p>
                <button onClick={handleConfirm} style={ps.confirmBtn}>
                  Confirm Move-In & Release Funds
                </button>
              </div>
            )}

            {isTenant && !['completed','disputed','cancelled'].includes(deal.status) && (
              <div style={ps.disputeCard}>
                <h3 style={{...ps.cardTitle, color:'#DC2626'}}><AlertTriangle size={15}/> Raise a Dispute</h3>
                <textarea style={ps.textarea} placeholder="Describe the issue in detail..." value={reason} onChange={e=>setR(e.target.value)} />
                <button onClick={handleDispute} style={ps.disputeBtn}>Raise Dispute with SouthSwift</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CREATE LISTING ───────────────────────────────────────────────────────────
export function CreateListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', property_type:'apartment',
    bedrooms:1, bathrooms:1, rent_price:'', rent_period:'yearly',
    address:'', city:'', state:'', amenities:'' });
  const [loading, setL] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setL(true);
    try {
      const data = { ...form, amenities: form.amenities ? form.amenities.split(',').map(a=>a.trim()) : [] };
      const res = await createListing(data);
      toast.success('Listing created! 🏠');
      navigate(`/listings/${res.data.id}`);
    } catch(err) { toast.error(err.response?.data?.error||'Failed to create listing.'); }
    setL(false);
  };

  return (
    <div style={ps.page}>
      <div style={{...ps.container, maxWidth:640}}>
        <h1 style={ps.pageTitle}>Add New Listing</h1>
        <form onSubmit={submit} style={ps.form}>
          {[['Property Title *','text','title','3-Bedroom Flat in Lekki Phase 1'],
            ['Full Address *','text','address','12 Admiralty Way, Lekki'],
            ['City *','text','city','Lagos'],
            ['Rent Price (₦) *','number','rent_price','800000'],
            ['Description','text','description','Spacious apartment with 24hr power...'],
            ['Amenities (comma separated)','text','amenities','Generator, Swimming Pool, Gym'],
          ].map(([lbl,type,key,ph])=>(
            <div key={key}>
              <label style={ps.label}>{lbl}</label>
              <input style={ps.input} type={type} value={form[key]} placeholder={ph}
                onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
            </div>
          ))}
          <div style={ps.row2}>
            <div style={{flex:1}}>
              <label style={ps.label}>State *</label>
              <select style={ps.input} value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))}>
                <option value="">Select</option>
                {['Lagos','Abuja','Rivers','Oyo','Kwara','Osun','Ekiti','Enugu'].map(st=><option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={ps.label}>Type</label>
              <select style={ps.input} value={form.property_type} onChange={e=>setForm(f=>({...f,property_type:e.target.value}))}>
                {['apartment','house','room','duplex','bungalow','studio'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={ps.row2}>
            <div style={{flex:1}}>
              <label style={ps.label}>Bedrooms</label>
              <select style={ps.input} value={form.bedrooms} onChange={e=>setForm(f=>({...f,bedrooms:Number(e.target.value)}))}>
                {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={ps.label}>Rent Period</label>
              <select style={ps.input} value={form.rent_period} onChange={e=>setForm(f=>({...f,rent_period:e.target.value}))}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <button style={{...ps.confirmBtn, opacity:loading?0.7:1}} disabled={loading}>
            {loading?'Creating...':'🏠 Create Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── ADMIN PANEL ──────────────────────────────────────────────────────────────
export function AdminPanel() {
  const [tab, setTab]     = useState('dashboard');
  const [stats, setStats] = useState({});
  const [agents, setAgents] = useState([]);
  const [deals, setDeals]   = useState([]);

  useEffect(() => {
    getDashboard().then(r=>setStats(r.data)).catch(()=>{});
    getPendingAgents().then(r=>setAgents(r.data)).catch(()=>{});
    getAllDeals().then(r=>setDeals(r.data)).catch(()=>{});
  }, []);

  const handleVerify = async (userId, action) => {
    try {
      await verifyAgent(userId, action);
      toast.success(`Agent ${action}d`);
      getPendingAgents().then(r=>setAgents(r.data));
    } catch(err) { toast.error('Failed'); }
  };

  return (
    <div style={ps.page}>
      <div style={ps.container}>
        <h1 style={ps.pageTitle}>🛡️ SouthSwift Admin</h1>
        <div style={ps.tabs}>
          {['dashboard','agents','deals'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{...ps.tab, ...(tab===t?ps.tabA:{})}}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {tab==='dashboard' && (
          <div style={ps.statsGrid}>
            {[['👥',stats.total_users,'Total Users'],['🏠',stats.total_listings,'Listings'],
              ['✅',stats.completed_deals,'Completed Deals'],['🛡️',stats.verified_agents,'Verified Agents'],
              ['₦',`${Number(stats.total_revenue_ngn||0).toLocaleString()}`,'Total Revenue']].map(([icon,num,label])=>(
              <div key={label} style={ps.aStat}>
                <div style={ps.aStatIcon}>{icon}</div>
                <div style={ps.aStatNum}>{num}</div>
                <div style={ps.aStatLabel}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {tab==='agents' && (
          <div>
            <h3 style={{color:G, marginBottom:16}}>Pending Agent Verifications ({agents.length})</h3>
            {agents.length===0
              ? <p style={{color:'#888'}}>No pending verifications.</p>
              : agents.map(a=>(
                <div key={a.id} style={ps.agentRow}>
                  <div style={ps.agentAvatar}>{a.full_name[0]}</div>
                  <div style={{flex:1}}>
                    <div style={ps.agentName}>{a.full_name}</div>
                    <div style={ps.agentDetail}>{a.email} · {a.phone} · NIN: {a.nin}</div>
                    {a.agency_name && <div style={ps.agentDetail}>Agency: {a.agency_name}</div>}
                    {a.bio && <div style={ps.agentDetail}>{a.bio}</div>}
                  </div>
                  <div style={ps.agentBtns}>
                    <button onClick={()=>handleVerify(a.id,'verify')} style={ps.verBtn}>✓ Verify</button>
                    <button onClick={()=>handleVerify(a.id,'reject')} style={ps.rejBtn}>✗ Reject</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab==='deals' && (
          <div>
            <h3 style={{color:G, marginBottom:16}}>All Deals ({deals.length})</h3>
            {deals.map(d=>(
              <div key={d.id} style={ps.dealRowA}>
                <div style={{flex:2}}>
                  <div style={ps.agentName}>{d.listing_title} — {d.city}</div>
                  <div style={ps.agentDetail}>Tenant: {d.tenant_name} · Agent: {d.agent_name}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700, color:G}}>₦{Number(d.rent_amount).toLocaleString()}</div>
                  <div style={{fontSize:11, color:'#888'}}>{d.status}</div>
                  {d.status==='escrow_held' && (
                    <button onClick={async()=>{await releaseFunds(d.id);toast.success('Funds released');}} style={ps.relBtn}>Release Funds</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AGENT PROFILE ────────────────────────────────────────────────────────────
export function AgentProfile() {
  const { id }          = useParams();
  const [agent, setAgent] = useState(null);

  useEffect(() => { getAgent(id).then(r=>setAgent(r.data)).catch(()=>{}); }, [id]);
  if (!agent) return <div style={ps.loading}>Loading...</div>;

  return (
    <div style={ps.page}>
      <div style={{...ps.container, maxWidth:680}}>
        <div style={ps.agentHero}>
          <div style={{...ps.agentAvatar, width:72, height:72, fontSize:28}}>{agent.full_name[0]}</div>
          <div>
            <h1 style={ps.pageTitle}>{agent.full_name}</h1>
            {agent.agency_name && <div style={{color:GOLD, fontWeight:600}}>{agent.agency_name}</div>}
            {agent.verification_status==='verified' && <div style={{color:'#22C55E', fontWeight:700, fontSize:13}}><CheckCircle size={13}/> SouthSwift Verified Agent</div>}
            <div style={ps.agentDetail}>⭐ {agent.rating||'0.0'} · {agent.total_deals||0} completed deals · {agent.city}, {agent.state}</div>
          </div>
        </div>
        {agent.bio && <div style={ps.agentBio}>{agent.bio}</div>}
      </div>
    </div>
  );
}

const ps = {
  page:       { fontFamily:'Arial,sans-serif', minHeight:'80vh', background:'#F8FAF8' },
  container:  { maxWidth:1000, margin:'0 auto', padding:'28px 20px' },
  loading:    { textAlign:'center', padding:80, fontSize:16, color:G },
  dealHeader: { display:'flex', alignItems:'center', gap:14, background:'white', borderRadius:14,
                padding:'20px 24px', marginBottom:24, border:'1px solid #E5E7EB', flexWrap:'wrap' },
  dealTitle:  { fontSize:20, fontWeight:800, color:'#111', margin:0 },
  dealSub:    { fontSize:13, color:'#888' },
  statusBig:  { padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:700, marginLeft:'auto' },
  layout:     { display:'flex', gap:22, alignItems:'flex-start', flexWrap:'wrap' },
  left:       { flex:1.5, minWidth:280 },
  right:      { flex:1, minWidth:260 },
  infoCard:   { background:'white', borderRadius:12, padding:'18px 20px', marginBottom:16, border:'1px solid #E5E7EB' },
  cardTitle:  { display:'flex', alignItems:'center', gap:6, fontSize:15, fontWeight:700, color:G, margin:'0 0 14px' },
  row:        { display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F3F4F6' },
  rowK:       { fontSize:12, color:'#888' },
  rowV:       { fontSize:13, fontWeight:600, color:'#111' },
  party:      { marginBottom:14, paddingBottom:14, borderBottom:'1px solid #F3F4F6' },
  partyRole:  { fontSize:10, fontWeight:700, color:GOLD, textTransform:'uppercase', letterSpacing:1 },
  partyName:  { fontSize:14, fontWeight:700, color:'#111' },
  partyPhone: { fontSize:12, color:'#888' },
  docLink:    { display:'inline-block', background:'#F0F9F0', color:G, padding:'10px 16px',
                borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:13, marginTop:4 },
  progressCard:{ background:'white', borderRadius:12, padding:'18px 20px', marginBottom:16, border:'1px solid #E5E7EB' },
  step:       { display:'flex', alignItems:'center', gap:10, marginBottom:12 },
  dot:        { width:22, height:22, borderRadius:'50%', color:'white', fontSize:11, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  stepLabel:  { fontSize:13 },
  actionCard: { background:'#F0FDF4', borderRadius:12, padding:'18px 20px', border:'1px solid #BBF7D0', marginBottom:16 },
  actionDesc: { fontSize:12.5, color:'#166534', marginBottom:14 },
  confirmBtn: { width:'100%', background:G, color:'white', border:'none', padding:'12px',
                borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14 },
  disputeCard:{ background:'#FFF7F7', borderRadius:12, padding:'18px 20px', border:'1px solid #FECACA' },
  textarea:   { width:'100%', border:'1px solid #FECACA', borderRadius:8, padding:'10px',
                fontSize:13, height:80, boxSizing:'border-box', resize:'vertical', marginBottom:10 },
  disputeBtn: { width:'100%', background:'#DC2626', color:'white', border:'none', padding:'11px',
                borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13 },
  form:       { background:'white', borderRadius:14, padding:'28px', border:'1px solid #E5E7EB' },
  pageTitle:  { fontSize:24, fontWeight:800, color:'#111', margin:'0 0 20px' },
  label:      { display:'block', fontSize:12, fontWeight:700, color:'#444', marginBottom:5, marginTop:14 },
  input:      { width:'100%', border:'1px solid #DDD', borderRadius:8, padding:'10px 12px',
                fontSize:13, boxSizing:'border-box', outline:'none' },
  row2:       { display:'flex', gap:14 },
  tabs:       { display:'flex', gap:6, marginBottom:22 },
  tab:        { background:'transparent', border:'1px solid #DDD', padding:'8px 18px', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666' },
  tabA:       { background:G, color:'white', border:`1px solid ${G}` },
  statsGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14 },
  aStat:      { background:'white', borderRadius:12, padding:'20px', textAlign:'center', border:'1px solid #E5E7EB' },
  aStatIcon:  { fontSize:24, marginBottom:6 },
  aStatNum:   { fontSize:24, fontWeight:900, color:G },
  aStatLabel: { fontSize:11, color:'#888', marginTop:3 },
  agentRow:   { display:'flex', gap:14, background:'white', borderRadius:10, padding:'16px 18px',
                marginBottom:10, border:'1px solid #E5E7EB', alignItems:'center' },
  dealRowA:   { display:'flex', justifyContent:'space-between', background:'white', borderRadius:10,
                padding:'14px 18px', marginBottom:10, border:'1px solid #E5E7EB' },
  agentAvatar:{ width:44, height:44, borderRadius:'50%', background:G, color:'white',
                display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 },
  agentName:  { fontWeight:700, fontSize:14, color:'#111' },
  agentDetail:{ fontSize:12, color:'#888', marginTop:2 },
  agentBtns:  { display:'flex', gap:8, flexShrink:0 },
  verBtn:     { background:'#DCFCE7', color:'#166534', border:'none', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 },
  rejBtn:     { background:'#FEE2E2', color:'#DC2626', border:'none', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 },
  relBtn:     { background:GOLD, color:'white', border:'none', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, marginTop:4 },
  agentHero:  { display:'flex', gap:20, alignItems:'center', background:'white', borderRadius:14, padding:'24px', border:'1px solid #E5E7EB', marginBottom:20 },
  agentBio:   { background:'white', borderRadius:12, padding:'20px', border:'1px solid #E5E7EB', fontSize:14, color:'#444', lineHeight:1.7 },
};

export default DealDetail;
