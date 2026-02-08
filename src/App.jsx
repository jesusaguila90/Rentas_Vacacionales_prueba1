import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, Menu, User, Star, Heart, MapPin, 
  Umbrella, Home, Tent, Palmtree, Trash2, Plus, 
  Wifi, Car, Wind, Utensils, X, ChevronRight, MessageCircle, Save, Edit, LayoutDashboard,
  PlayCircle, Image as ImageIcon, Percent, HelpCircle, ExternalLink, LogIn
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, serverTimestamp 
} from 'firebase/firestore';

// =================================================================
// ⚠️ ZONA DE CONFIGURACIÓN - PEGA TUS DATOS DE FIREBASE AQUÍ ⚠️
// =================================================================
// Si dejas esto vacío, la app funcionará en "Modo Demo" (solo lectura).
// Cuando tengas tus claves de Firebase, pégalas dentro de las comillas.

const MY_FIREBASE_CONFIG = {
  apiKey: "",          
  authDomain: "",      
  projectId: "",       
  storageBucket: "",   
  messagingSenderId: "",
  appId: ""
};

// =================================================================

// Detectar configuración y modo
let firebaseConfig;
let appId;
let isDemoMode = false;

try {
  // Configuración automática (Modo Vercel/StackBlitz)
  if (MY_FIREBASE_CONFIG.apiKey === "") {
    isDemoMode = true; 
    console.warn("⚠️ MODO DEMO ACTIVADO: Faltan claves de Firebase");
  } else {
    firebaseConfig = MY_FIREBASE_CONFIG;
    appId = "default";
  }
} catch (e) {
  isDemoMode = true;
}

// Inicializar Firebase solo si hay configuración real
let app, auth, db;
if (!isDemoMode && firebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Error al iniciar Firebase", error);
    isDemoMode = true;
  }
}

// --- DATOS DE PRUEBA (MODO DEMO) ---
const DEMO_DATA = [
  {
    id: 'demo1',
    title: 'Villa Ejemplo (Modo Demo)',
    location: 'Mazatlán, Zona Dorada',
    price: 3500,
    originalPrice: 4500,
    category: 'alberca',
    description: 'Esta es una propiedad de prueba. Configura Firebase en el código para guardar tus datos reales y que se queden guardados.',
    imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1600&auto=format&fit=crop',
    media: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1600&auto=format&fit=crop'],
    amenities: ['Wifi', 'Alberca', 'Demo'],
    hostPhone: '521234567890'
  }
];

const CATEGORIES = [
  { id: 'todos', label: 'Todos', icon: Home },
  { id: 'playa', label: 'Playa', icon: Umbrella },
  { id: 'alberca', label: 'Alberca', icon: Palmtree },
  { id: 'cabana', label: 'Cabaña', icon: Tent },
  { id: 'lujo', label: 'Lujo', icon: Star },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({
    title: '', location: '', price: '', originalPrice: '', category: 'playa',
    description: '', mediaUrls: '', amenities: 'Wifi, Aire Acondicionado', hostPhone: '521234567890'
  });

  // Efecto de Carga Inicial
  useEffect(() => {
    if (isDemoMode) {
      setProperties(DEMO_DATA);
      setLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Efecto de Lectura de Datos
  useEffect(() => {
    if (isDemoMode || !user) return;
    
    // Intentar leer de la base de datos pública
    try {
      const collRef = collection(db, 'artifacts', appId, 'public', 'data', 'rentals');
      const unsubscribe = onSnapshot(collRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProperties(data);
        setLoading(false);
      }, (error) => {
        console.error("Error leyendo datos (posiblemente permisos o config):", error);
        setProperties(DEMO_DATA); // Fallback a demo si falla la DB
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      setProperties(DEMO_DATA);
      setLoading(false);
    }
  }, [user]);

  // Guardar / Crear
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    if (isDemoMode) { 
      alert("MODO DEMO: Estás viendo una demostración. Para guardar cambios reales, necesitas configurar las claves de Firebase en el código."); 
      closeForm(); 
      return; 
    }
    if (!user) return;

    try {
      const mediaArray = formData.mediaUrls.split('\n').map(url => url.trim()).filter(u => u.length > 0);
      const data = {
        title: formData.title, location: formData.location, price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
        category: formData.category, description: formData.description, media: mediaArray,
        imageUrl: mediaArray[0] || '', amenities: formData.amenities.split(',').map(i => i.trim()),
        hostPhone: formData.hostPhone, updatedAt: serverTimestamp()
      };
      
      const collRef = collection(db, 'artifacts', appId, 'public', 'data', 'rentals');

      if (editingId) { 
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rentals', editingId), data); 
      } else { 
        await addDoc(collRef, { ...data, createdAt: serverTimestamp() }); 
      }
      closeForm();
    } catch (error) { 
      alert("Error al guardar. Verifica tu conexión o permisos."); 
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (isDemoMode) { alert("Modo Demo: No se puede borrar."); return; }
    if (confirm('¿Borrar permanentemente?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rentals', id));
    }
  };

  const closeForm = () => {
    setIsFormOpen(false); setEditingId(null);
    setFormData({ title: '', location: '', price: '', originalPrice: '', category: 'playa', description: '', mediaUrls: '', amenities: 'Wifi', hostPhone: '521234567890' });
  };
  
  const handleEditClick = (prop) => {
      if(isDemoMode) { alert("Modo Demo: No editable"); return; }
      setFormData({
          title: prop.title, location: prop.location, price: prop.price, originalPrice: prop.originalPrice || '',
          category: prop.category, description: prop.description, mediaUrls: prop.media ? prop.media.join('\n') : prop.imageUrl,
          amenities: prop.amenities.join(', '), hostPhone: prop.hostPhone || '521234567890'
      });
      setEditingId(prop.id); setIsFormOpen(true);
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-[#FF385C] font-bold">Cargando tu App...</div>;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-20 sm:pb-0">
      {isDemoMode && isAdminMode && <div className="bg-orange-100 text-orange-800 p-2 text-center text-xs font-bold fixed top-0 w-full z-50">MODO DEMO: Configura Firebase en App.jsx para activar base de datos real.</div>}
      
      {isAdminMode ? (
        <AdminDashboard properties={properties} onDelete={handleDelete} onEdit={handleEditClick} isFormOpen={isFormOpen} setIsFormOpen={setIsFormOpen} closeForm={closeForm} formData={formData} setFormData={setFormData} onSave={handleSaveProperty} editingId={editingId} setIsAdminMode={setIsAdminMode} />
      ) : (
        <ClientView properties={properties} setIsAdminMode={setIsAdminMode} />
      )}
    </div>
  );
}

// --- COMPONENTES VISUALES ---

const Navbar = () => (
  <nav className="fixed top-0 w-full bg-white z-40 border-b border-gray-200 h-16 sm:h-20 flex items-center shadow-sm px-4 justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
        <Globe className="text-[#FF385C]" size={28} />
        <h1 className="text-[#FF385C] font-bold text-lg hidden sm:block">MisRentas</h1>
      </div>
      <div className="border rounded-full shadow-sm py-2 px-4 flex gap-3 text-sm font-medium items-center hover:shadow-md transition cursor-pointer">
        <span className="hidden sm:block">Cualquier lugar</span>
        <span className="border-l pl-3 ml-1 hidden sm:block text-gray-500 font-normal">Cualquier semana</span>
        <div className="bg-[#FF385C] rounded-full p-2 text-white"><Search size={14} /></div>
      </div>
  </nav>
);

const Categories = ({ selected, onSelect }) => (
  <div className="fixed top-16 sm:top-20 w-full bg-white z-30 pt-3 pb-2 shadow-sm overflow-x-auto">
    <div className="flex gap-6 px-4 min-w-max">
      {CATEGORIES.map(c => (
        <button key={c.id} onClick={() => onSelect(c.id)} className={`flex flex-col items-center gap-1 pb-2 border-b-2 transition ${selected === c.id ? 'border-black text-black' : 'border-transparent text-gray-500'}`}>
          <c.icon size={24}/>
          <span className="text-xs">{c.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const MobileBottomNav = ({ setIsAdminMode }) => (
  <div className="sm:hidden fixed bottom-0 w-full bg-white border-t py-2 px-6 flex justify-between z-40 pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
     <div className="flex flex-col items-center text-[#FF385C]"><Search size={24}/><span className="text-[10px]">Explorar</span></div>
     <div className="flex flex-col items-center text-gray-400"><Heart size={24}/><span className="text-[10px]">Favoritos</span></div>
     <div className="flex flex-col items-center text-gray-400 cursor-pointer" onClick={() => setIsAdminMode(true)}><User size={24}/><span className="text-[10px]">Admin</span></div>
  </div>
);

const MediaItem = ({ src, className, controls = true }) => {
  const [err, setErr] = useState(false);
  if (!src || err) return <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-400`}><ImageIcon size={24} /></div>;
  if (src.toLowerCase().endsWith('.mp4')) return <div className={`relative bg-black ${className}`}><video src={src} className="w-full h-full object-cover" controls={controls} playsInline muted={!controls} onError={() => setErr(true)} /></div>;
  return <img src={src} alt="Propiedad" className={className} onError={() => setErr(true)} loading="lazy" />;
};

const ListingCard = ({ data, onClick }) => (
  <div className="cursor-pointer group flex flex-col gap-2" onClick={() => onClick(data)}>
    <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden relative">
      <MediaItem src={data.media?.[0] || data.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" controls={false} />
      {data.originalPrice > data.price && <div className="absolute top-2 left-2 bg-[#FF385C] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">OFERTA</div>}
      <Heart className="absolute top-2 right-2 text-white/70 hover:text-white" fill="rgba(0,0,0,0.3)"/>
    </div>
    <div className="flex justify-between font-bold text-sm mt-1">
      <span>{data.location}</span>
      <div className="flex items-center gap-1 font-light"><Star size={12}/> 4.9</div>
    </div>
    <p className="text-gray-500 text-sm truncate">{data.title}</p>
    <div className="flex items-center gap-2 mt-1">
      {data.originalPrice && <span className="text-xs text-gray-400 line-through">${data.originalPrice}</span>}
      <span className="font-bold text-gray-900">${data.price} <span className="font-normal text-sm text-gray-500">noche</span></span>
    </div>
  </div>
);

const Modal = ({ data, onClose }) => {
  if (!data) return null;
  const link = `https://wa.me/${data.hostPhone}?text=${encodeURIComponent(`Hola, me interesa reservar: ${data.title}`)}`;
  const media = data.media && data.media.length ? data.media : [data.imageUrl];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full h-[100dvh] sm:h-[85vh] sm:max-w-5xl sm:rounded-2xl flex flex-col sm:flex-row overflow-hidden animate-in slide-in-from-bottom-5 duration-300 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 left-4 z-20 bg-white/90 rounded-full p-2 hover:bg-gray-100 shadow-lg"><X size={20}/></button>
        <div className="w-full h-[40vh] sm:w-1/2 sm:h-full bg-black overflow-y-auto snap-y snap-mandatory scrollbar-hide">
          {media.map((u,i)=><div key={i} className="w-full h-full snap-start relative"><MediaItem src={u} className="w-full h-full object-contain sm:object-cover"/></div>)}
          {media.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{media.length} fotos</div>}
        </div>
        <div className="flex-1 p-5 overflow-y-auto bg-white rounded-t-3xl sm:rounded-none -mt-4 sm:mt-0 relative z-10 flex flex-col">
           <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden"></div>
           <h2 className="text-2xl font-bold mb-2 leading-tight">{data.title}</h2>
           <p className="text-gray-500 mb-4 flex items-center gap-1 text-sm"><MapPin size={16}/> {data.location}</p>
           <div className="py-4 border-y border-gray-100 mb-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white"><User size={20}/></div>
               <div><p className="font-bold text-sm">Anfitrión: Tu Negocio</p><p className="text-xs text-gray-500">Superanfitrión</p></div>
             </div>
           </div>
           <p className="text-gray-700 text-sm mb-6 flex-1 whitespace-pre-line leading-relaxed">{data.description}</p>
           <h3 className="font-bold mb-2 text-sm">Lo que ofrece</h3>
           <div className="grid grid-cols-2 gap-2 mb-6">
             {data.amenities.map((a,i)=><div key={i} className="text-sm text-gray-600 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>{a}</div>)}
           </div>
           <div className="border-t pt-4 flex items-center justify-between mt-auto">
             <div><span className="text-xl font-bold text-gray-900">${data.price}</span> <span className="text-sm text-gray-500">noche</span></div>
             <a href={link} target="_blank" className="bg-[#E51D53] hover:bg-[#d41b4d] text-white py-3 px-8 rounded-xl font-bold flex gap-2 items-center shadow-lg active:scale-95 transition">
               <MessageCircle size={18} fill="white"/> Reservar
             </a>
           </div>
        </div>
      </div>
    </div>
  );
};

const ClientView = ({ properties, setIsAdminMode }) => {
  const [cat, setCat] = useState('todos'); const [sel, setSel] = useState(null);
  const filt = properties.filter(p => cat === 'todos' ? true : p.category === cat);
  return (
    <>
      <Navbar />
      <Categories selected={cat} onSelect={setCat} />
      <main className="max-w-7xl mx-auto px-4 pt-36 pb-24 sm:pb-10">
        {filt.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filt.map(i => <ListingCard key={i.id} data={i} onClick={setSel} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">No hay propiedades en esta categoría.</div>
        )}
      </main>
      <MobileBottomNav setIsAdminMode={setIsAdminMode} />
      <Modal data={sel} onClose={() => setSel(null)} />
    </>
  );
};

const AdminDashboard = ({ properties, onDelete, onEdit, isFormOpen, setIsFormOpen, closeForm, formData, setFormData, onSave, editingId, setIsAdminMode }) => (
  <div className="max-w-4xl mx-auto p-4 pb-24 pt-8">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4">
      <div><h1 className="text-2xl font-bold">Panel de Control</h1><p className="text-gray-500 text-sm">Administra tus propiedades</p></div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button onClick={()=>setIsAdminMode(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 flex items-center justify-center gap-2"><Globe size={18}/> Ver Web</button>
        <button onClick={()=>setIsFormOpen(true)} className="flex-1 px-4 py-2 bg-[#FF385C] text-white rounded-xl hover:bg-[#d93250] font-bold flex items-center justify-center gap-2"><Plus size={18}/> Agregar</button>
      </div>
    </div>

    {isFormOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
        <div className="bg-white p-6 rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
          <div className="flex justify-between mb-6 border-b pb-4">
            <h2 className="font-bold text-xl">{editingId?'Editar Propiedad':'Nueva Propiedad'}</h2>
            <button onClick={closeForm} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
          </div>
          <form onSubmit={onSave} className="flex flex-col gap-4 pb-10">
            <div><label className="text-sm font-bold block mb-1">Título</label><input placeholder="Ej: Villa frente al mar" required className="border p-3 rounded-xl w-full focus:ring-2 focus:ring-black outline-none" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})}/></div>
            <div className="flex gap-3">
              <div className="w-1/2"><label className="text-sm font-bold block mb-1">Precio (Oferta)</label><input type="number" placeholder="3500" required className="border p-3 rounded-xl w-full font-bold text-green-700" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})}/></div>
              <div className="w-1/2"><label className="text-sm font-bold block mb-1">Precio Normal</label><input type="number" placeholder="5000" className="border p-3 rounded-xl w-full text-gray-500" value={formData.originalPrice} onChange={e=>setFormData({...formData, originalPrice: e.target.value})}/></div>
            </div>
            <div className="flex gap-3">
               <div className="w-1/2">
                 <label className="text-sm font-bold block mb-1">Categoría</label>
                 <select className="border p-3 rounded-xl w-full bg-white" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                   {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                 </select>
               </div>
               <div className="w-1/2"><label className="text-sm font-bold block mb-1">Ubicación</label><input placeholder="Mazatlán" required className="border p-3 rounded-xl w-full" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})}/></div>
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Fotos y Videos (Enlaces Directos)</label>
              <p className="text-xs text-gray-500 mb-2">Pega un enlace por línea (jpg, png, mp4)</p>
              <textarea placeholder="https://..." required className="border p-3 rounded-xl h-32 w-full font-mono text-sm" value={formData.mediaUrls} onChange={e=>setFormData({...formData, mediaUrls: e.target.value})}/>
            </div>
            <div><label className="text-sm font-bold block mb-1">Descripción</label><textarea placeholder="Descripción detallada..." required className="border p-3 rounded-xl w-full h-24" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})}/></div>
            <div><label className="text-sm font-bold block mb-1">WhatsApp (con lada)</label><input placeholder="526691234567" required className="border p-3 rounded-xl w-full" value={formData.hostPhone} onChange={e=>setFormData({...formData, hostPhone: e.target.value})}/></div>
            
            <div className="mt-4 pt-4 border-t flex gap-3 justify-end">
               <button type="button" onClick={closeForm} className="px-5 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100">Cancelar</button>
               <button className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800">{editingId ? 'Guardar Cambios' : 'Publicar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    <div className="grid gap-3">
      {properties.length === 0 && <div className="text-center py-10 text-gray-500 border-2 border-dashed rounded-xl">No hay propiedades. Agrega la primera.</div>}
      {properties.map(p=>(
        <div key={p.id} className="flex gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm items-center hover:shadow-md transition">
          <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
             <MediaItem src={p.media?.[0]} className="w-full h-full object-cover" controls={false}/>
             {p.originalPrice > p.price && <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></div>}
          </div>
          <div className="flex-1 min-w-0">
             <h3 className="font-bold text-gray-900 truncate">{p.title}</h3>
             <p className="text-sm text-gray-500 truncate">{p.location}</p>
             <p className="font-bold text-green-700 text-sm">${p.price}</p>
          </div>
          <div className="flex gap-2">
             <button onClick={()=>onEdit(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={18}/></button>
             <button onClick={()=>onDelete(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);