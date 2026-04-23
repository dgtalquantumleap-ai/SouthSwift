import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Shield, Home, LogOut, LayoutDashboard, PlusCircle, Settings } from 'lucide-react';

const G    = '#1B4332';
const GOLD = '#C8963C';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav style={s.nav}>
      <Link to="/" style={s.brand}>
        <Shield size={22} color={GOLD} strokeWidth={2.5} />
        <span style={s.brandText}>South<span style={{ color: GOLD }}>Swift</span></span>
      </Link>

      <div style={s.links}>
        <Link to="/listings" style={s.link}><Home size={15} /> Listings</Link>

        {user ? (
          <>
            <Link to="/dashboard" style={s.link}><LayoutDashboard size={15} /> Dashboard</Link>
            {['agent','admin'].includes(user.role) && (
              <Link to="/create-listing" style={{ ...s.link, ...s.btnGold }}>
                <PlusCircle size={15} /> Add Listing
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin" style={s.link}><Settings size={15} /> Admin</Link>
            )}
            <div style={s.userBadge}>
              <span style={s.roleTag}>{user.role}</span>
              <span style={s.userName}>{user.full_name?.split(' ')[0]}</span>
            </div>
            <button onClick={handleLogout} style={s.logoutBtn}>
              <LogOut size={14} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    style={s.link}>Login</Link>
            <Link to="/register" style={s.btnGreen}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const s = {
  nav:      { position:'fixed', top:0, left:0, right:0, zIndex:100, background:G,
              height:64, display:'flex', alignItems:'center',
              justifyContent:'space-between', padding:'0 28px',
              boxShadow:'0 2px 12px rgba(0,0,0,0.2)' },
  brand:    { display:'flex', alignItems:'center', gap:8, textDecoration:'none' },
  brandText:{ fontSize:22, fontWeight:900, color:'white', fontFamily:'Georgia,serif' },
  links:    { display:'flex', alignItems:'center', gap:16 },
  link:     { display:'flex', alignItems:'center', gap:4, color:'#A8D5B5',
              textDecoration:'none', fontSize:13, fontWeight:600 },
  btnGold:  { background:GOLD, color:'white', padding:'6px 14px',
              borderRadius:20, fontSize:13, textDecoration:'none' },
  btnGreen: { background:'white', color:G, padding:'7px 18px', borderRadius:20,
              fontSize:13, fontWeight:700, textDecoration:'none' },
  userBadge:{ display:'flex', alignItems:'center', gap:6 },
  roleTag:  { background:'rgba(200,150,60,0.2)', color:GOLD, fontSize:10,
              fontWeight:700, padding:'2px 8px', borderRadius:10,
              textTransform:'uppercase', letterSpacing:1 },
  userName: { color:'white', fontSize:13, fontWeight:600 },
  logoutBtn:{ display:'flex', alignItems:'center', gap:4, background:'transparent',
              border:'1px solid rgba(255,255,255,0.2)', color:'#A8D5B5',
              padding:'5px 12px', borderRadius:8, cursor:'pointer', fontSize:12 },
};
