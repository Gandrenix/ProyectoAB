import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useDailyLogStore } from './store/useDailyLogStore';
import { logApi, foodApi, userApi } from './api/api';
import { Search, Trash2, ChevronLeft, ChevronRight, Calculator, Activity, Settings2, Info, User, AlertTriangle } from 'lucide-react';

const NUTRIENT_GROUPS = [
  { 
    title: 'Grasas Detalladas', 
    fields: [
      { key: 'saturatedFat', label: 'Sat.', unit: 'g' },
      { key: 'monounsaturatedFat', label: 'Mono.', unit: 'g' },
      { key: 'polyunsaturatedFat', label: 'Poli.', unit: 'g' },
      { key: 'cholesterol', label: 'Colest.', unit: 'mg' }
    ]
  },
  { 
    title: 'Fibra', 
    fields: [
      { key: 'solubleFiber', label: 'Soluble', unit: 'g' },
      { key: 'insolubleFiber', label: 'Insoluble', unit: 'g' },
      { key: 'totalFiber', label: 'Total', unit: 'g' }
    ]
  },
  { 
    title: 'Minerales', 
    fields: [
      { key: 'calcium', label: 'Calcio', unit: 'mg' },
      { key: 'phosphorus', label: 'Fósforo', unit: 'mg' },
      { key: 'sodium', label: 'Sodio', unit: 'mg' },
      { key: 'potassium', label: 'Potasio', unit: 'mg' },
      { key: 'magnesium', label: 'Magnesio', unit: 'mg' }
    ]
  },
  { 
    title: 'Oligoelementos', 
    fields: [
      { key: 'iron', label: 'Hierro', unit: 'mg' },
      { key: 'zinc', label: 'Zinc', unit: 'mg' },
      { key: 'copper', label: 'Cobre', unit: 'mg' },
      { key: 'manganese', label: 'Manganeso', unit: 'mg' },
      { key: 'selenium', label: 'Selenio', unit: 'mcg' }
    ]
  },
  { 
    title: 'Vitaminas', 
    fields: [
      { key: 'vitA', label: 'Vit. A', unit: 'mcg' },
      { key: 'vitC', label: 'Vit. C', unit: 'mg' },
      { key: 'vitD', label: 'Vit. D', unit: 'UI' },
      { key: 'vitE', label: 'Vit. E', unit: 'mg' },
      { key: 'vitK', label: 'Vit. K', unit: 'mcg' },
      { key: 'vitB1', label: 'B1', unit: 'mg' },
      { key: 'vitB2', label: 'B2', unit: 'mg' },
      { key: 'vitB3', label: 'B3', unit: 'mg' },
      { key: 'vitB5', label: 'B5', unit: 'mg' },
      { key: 'vitB6', label: 'B6', unit: 'mg' },
      { key: 'vitB9', label: 'B9', unit: 'mcg' },
      { key: 'vitB12', label: 'B12', unit: 'mcg' }
    ]
  }
];

const App: React.FC = () => {
  const { selectedDate, setSelectedDate, userId, userProfile, setUserProfile, targets, setTargets } = useDailyLogStore();
  const [summary, setSummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [inputType, setInputType] = useState<'GRAMS' | 'HOUSEHOLD'>('HOUSEHOLD');
  const [inputAmount, setInputAmount] = useState<string>('1');
  const [mealType, setMealType] = useState('Desayuno');
  const [customMealType, setCustomMealType] = useState('');
  const [isCustomMeal, setIsCustomMeal] = useState(false);

  // Formulario de perfil
  const [profileForm, setProfileForm] = useState({
    age: 10,
    gender: 'M',
    weight: 32,
    activityLevel: 'MODERADA'
  });

  const fetchSummary = async () => {
    try {
      console.log(`[Frontend] Fetching summary for date: ${selectedDate}, userId: ${userId}`);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await logApi.getSummary(userId, dateStr);
      console.log(`[Frontend] Received summary response:`, res.data);
      setSummary(res.data);
      if (res.data.user) setUserProfile(res.data.user);
      if (res.data.targets) setTargets(res.data.targets);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedDate, userId]);

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        age: userProfile.age,
        gender: userProfile.gender,
        weight: userProfile.weight,
        activityLevel: userProfile.activityLevel
      });
    }
  }, [userProfile]);

  const handleUpdateProfile = async () => {
    try {
      console.log(`[Frontend] Updating profile with data:`, profileForm);
      await userApi.updateUser(userId, profileForm);
      console.log(`[Frontend] Profile update successful. Refetching summary...`);
      setShowProfileModal(false);
      fetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      const res = await foodApi.search(q);
      setSearchResults(res.data);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddEntry = async () => {
    try {
      const amountNum = Number(inputAmount) || 0;
      if (amountNum <= 0) return;

      const finalMealType = isCustomMeal && customMealType.trim() !== '' ? customMealType.trim() : mealType;

      await logApi.addEntry({
        date: format(selectedDate, 'yyyy-MM-dd'),
        userId,
        foodId: selectedFood.id,
        mealType: finalMealType,
        inputType,
        inputAmount: amountNum,
      });
      setShowModal(false);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setCustomMealType('');
      setIsCustomMeal(false);
      fetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await logApi.deleteEntry(id);
      fetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const calculatePreview = (field: string) => {
    if (!selectedFood) return 0;
    const amountNum = Number(inputAmount) || 0;
    const baseValue = selectedFood[field] || 0;
    const factor = inputType === 'HOUSEHOLD' 
      ? amountNum 
      : amountNum / selectedFood.baseAmount;
    return baseValue * factor;
  };

  const ProgressBar = ({ label, current, bounds, unit }: any) => {
    let percentage = 0;
    let color = 'bg-slate-700';
    let targetDisplay = 'Sin Meta';

    if (bounds) {
       const rda = bounds.rda || bounds.ai || bounds.target || 0;
       const amdrMin = bounds.amdr_min || 0;
       const amdrMax = bounds.amdr_max || 0;
       const ul = bounds.ul || 0;
       
       let target = amdrMin > 0 ? amdrMin : rda;
       let limit = amdrMax > 0 ? amdrMax : ul;

       let maxScale = 0;
       if (target > 0) maxScale = limit > 0 ? limit : target * 1.2;
       else if (limit > 0) maxScale = limit;
       
       if (maxScale > 0) {
          percentage = Math.min((current / maxScale) * 100, 100);
          
          if (amdrMin > 0 && amdrMax > 0) targetDisplay = `/ ${amdrMin.toFixed(0)}-${amdrMax.toFixed(0)}${unit}`;
          else if (target > 0) targetDisplay = `/ ${target.toFixed(target < 1 ? 2 : 0)}${unit}`;
          else if (limit > 0) targetDisplay = `< ${limit.toFixed(limit < 1 ? 2 : 0)}${unit}`;

          if (target > 0) {
             if (amdrMin > 0 || amdrMax > 0) {
                 if (rda > 0 && current < rda) color = 'bg-rose-500'; 
                 else if (current >= rda && current < amdrMin) color = 'bg-amber-500'; 
                 else if (current >= amdrMin && current <= (limit > 0 ? limit : Infinity)) color = 'bg-emerald-500'; 
                 else if (limit > 0 && current > limit) color = 'bg-rose-600'; 
                 else color = 'bg-emerald-500';
             } else {
                 if (current < target) color = current >= target * 0.8 ? 'bg-amber-500' : 'bg-rose-500';
                 else color = (limit > 0 && current > limit) ? 'bg-rose-600' : 'bg-emerald-500';
             }
          } else if (limit > 0) {
             if (current > limit) color = 'bg-rose-600';
             else if (current > limit * 0.8) color = 'bg-amber-500';
             else color = 'bg-emerald-500';
          }
       }
    }

    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-200">
            {current?.toFixed(current < 1 && current > 0 ? 2 : 1)}{unit}
            {targetDisplay !== 'Sin Meta' && <span className="ml-1 opacity-70 text-slate-400">{targetDisplay}</span>}
          </span>
        </div>
        {targetDisplay !== 'Sin Meta' && (
          <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30 relative">
            <div
              className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  // Compute alerts dynamically
  const activeTargets = summary?.targets || targets;
  const criticalAlerts: string[] = [];

  if (summary?.totals && activeTargets) {
    for (const group of NUTRIENT_GROUPS) {
      for (const field of group.fields) {
        const bounds = activeTargets[field.key];
        const current = summary.totals[field.key] || 0;
        if (bounds) {
          const rda = bounds.rda || bounds.ai || 0;
          const ul = bounds.ul || 0;
          if (ul > 0 && current > ul) {
            criticalAlerts.push(`Exceso crítico de ${field.label} (supera límite superior)`);
          } else if (rda > 0 && current < rda * 0.3) {
            criticalAlerts.push(`Déficit importante de ${field.label} (< 30% del requerimiento)`);
          }
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 transition-colors duration-500">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Activity className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">NutriTrack <span className="text-emerald-400">Pro</span></h1>
            <p className="text-slate-400 text-sm">Control Nutricional UIS - Alta Precisión</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 shadow-inner">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-lg transition-all active:scale-90 text-emerald-400">
              <ChevronLeft size={22} />
            </button>
            <span className="font-bold px-4 min-w-[140px] text-center text-slate-200">
              {format(selectedDate, 'PPP')}
            </span>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-lg transition-all active:scale-90 text-emerald-400">
              <ChevronRight size={22} />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="p-3 bg-slate-800 border border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400 rounded-xl transition-all"
              title="Perfil Nutricional"
            >
              <User size={22} />
            </button>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-3 rounded-xl border transition-all ${showAdvanced ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              title="Modo Avanzado"
            >
              <Settings2 size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Izquierdo: Resumen */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calculator size={80} />
            </div>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-200">
              Resumen del Día
            </h2>
            
            <div className="space-y-5 relative z-10">
              {/* Alertas Dinámicas de Exceso o Déficit */}
              {criticalAlerts.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                  <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                  <div className="space-y-1">
                    {criticalAlerts.slice(0, 2).map((alert, idx) => (
                      <p key={idx} className="text-[10px] text-amber-200 font-bold uppercase leading-tight">
                        {alert}
                      </p>
                    ))}
                    {criticalAlerts.length > 2 && (
                      <p className="text-[10px] text-amber-500/70 font-bold uppercase leading-tight">+ {criticalAlerts.length - 2} alertas más</p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
                <ProgressBar 
                  label="Energía" 
                  current={summary?.totals?.kcal || 0} 
                  bounds={activeTargets?.kcal} 
                  unit=" kcal" 
                />
              </div>
              
              <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-700/30 space-y-4">
                <ProgressBar 
                  label="Proteína" 
                  current={summary?.totals?.protein || 0} 
                  bounds={activeTargets?.protein} 
                  unit="g" 
                />
                <ProgressBar 
                  label="Carbohidratos" 
                  current={summary?.totals?.carbs || 0} 
                  bounds={activeTargets?.carbs} 
                  unit="g" 
                />
                <ProgressBar 
                  label="Grasas" 
                  current={summary?.totals?.fat || 0} 
                  bounds={activeTargets?.fat} 
                  unit="g" 
                />
              </div>

              {showAdvanced && (
                <div className="pt-4 mt-4 border-t border-slate-700 space-y-6 animate-in slide-in-from-top-4 duration-300 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                  {NUTRIENT_GROUPS.map(group => (
                    <div key={group.title} className="bg-slate-900/30 p-5 rounded-2xl border border-slate-700/30">
                      <h3 className="text-[10px] uppercase font-black text-emerald-500/70 mb-4 tracking-widest">{group.title}</h3>
                      <div className="space-y-4">
                        {group.fields.map(f => (
                          <ProgressBar 
                            key={f.key}
                            label={f.label}
                            current={summary?.totals?.[f.key] || 0}
                            bounds={activeTargets?.[f.key]}
                            unit={` ${f.unit}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className="relative group">
            <div className="flex items-center bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-3 group-focus-within:border-emerald-500/50 group-focus-within:ring-4 ring-emerald-500/10 transition-all shadow-lg">
              <Search className="text-slate-500 group-focus-within:text-emerald-400" size={20} />
              <input
                type="text"
                placeholder="¿Qué comiste hoy?"
                className="bg-transparent border-none focus:outline-none ml-3 w-full text-slate-100 placeholder:text-slate-600 font-medium text-lg"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-20 max-h-80 overflow-y-auto overflow-x-hidden backdrop-blur-xl divide-y divide-slate-700/50">
                {searchResults.map((food: any) => (
                  <button
                    key={food.id}
                    className="w-full text-left p-4 hover:bg-slate-750 transition-colors group/item flex justify-between items-center"
                    onClick={() => {
                      setSelectedFood(food);
                      setShowModal(true);
                    }}
                  >
                    <div className="flex-1 pr-4">
                      <div className="font-bold text-slate-200 group-hover/item:text-emerald-400 transition-colors">{food.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">{food.group} • {food.baseAmount}g = {food.kcal} kcal</div>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg text-slate-400 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all">
                      <Trash2 size={16} className="rotate-45" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Lado Derecho: Timeline */}
        <section className="lg:col-span-8">
          <div className="bg-slate-800 rounded-[2rem] border border-slate-700 overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
            <div className="p-8 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-2xl font-black text-white tracking-tight">Registro Cronológico</h2>
              <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
                {summary?.entries?.length || 0} Alimentos
              </div>
            </div>
            
            <div className="flex-1 p-2 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {summary?.entries?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50 p-12">
                  <Info size={48} />
                  <p className="text-center font-medium max-w-[200px]">Tu diario está vacío. Busca un alimento para comenzar.</p>
                </div>
              ) : (
                <div className="grid gap-6 p-2">
                  {Array.from(new Set(['Desayuno', 'Almuerzo', 'Cena', ...Object.keys(
                    summary?.entries?.reduce((acc: any, e: any) => { acc[e.mealType || 'Almuerzo'] = true; return acc; }, {}) || {}
                  )])).map((mealName: any) => {
                    const mealEntries = summary?.entries?.filter((e: any) => (e.mealType || 'Almuerzo') === mealName) || [];
                    if (mealEntries.length === 0 && !['Desayuno', 'Almuerzo', 'Cena'].includes(mealName)) return null;

                    return (
                      <div key={mealName} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-black text-emerald-500/80 uppercase tracking-widest">{mealName}</h3>
                          <div className="h-px flex-1 bg-slate-700/50"></div>
                        </div>
                        {mealEntries.length === 0 ? (
                          <div className="text-xs text-slate-500 italic pl-4">Sin registros</div>
                        ) : (
                          <div className="grid gap-2">
                            {mealEntries.map((entry: any) => (
                              <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-slate-750/50 rounded-2xl transition-all group relative border border-transparent hover:border-slate-600/50">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-100 text-lg leading-tight">{entry.food.name}</h3>
                                    <span className="text-[10px] text-slate-500 font-black px-1.5 py-0.5 rounded bg-slate-900 uppercase">{entry.food.group}</span>
                                  </div>
                                  <div className="text-sm text-slate-400 mt-1 font-medium">
                                    {entry.inputAmount} <span className="text-slate-500 text-xs font-bold uppercase">{entry.inputType === 'HOUSEHOLD' ? entry.food.householdMeasure : 'gramos'}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-8">
                                  <div className="text-right">
                                    <div className="text-xl font-black text-emerald-400 leading-none">{entry.calculated.kcal.toFixed(0)}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">kcal</div>
                                  </div>

                                  <div className="hidden md:flex gap-4 border-l border-slate-700 pl-8">
                                    <div className="text-center min-w-[40px]">
                                      <div className="text-xs font-bold text-blue-400">{entry.calculated.protein.toFixed(1)}g</div>
                                      <div className="text-[8px] text-slate-600 font-black uppercase">Prot</div>
                                    </div>
                                    <div className="text-center min-w-[40px]">
                                      <div className="text-xs font-bold text-amber-400">{entry.calculated.carbs.toFixed(1)}g</div>
                                      <div className="text-[8px] text-slate-600 font-black uppercase:">Carb</div>
                                    </div>
                                    <div className="text-center min-w-[40px]">
                                      <div className="text-xs font-bold text-rose-400">{entry.calculated.fat.toFixed(1)}g</div>
                                      <div className="text-[8px] text-slate-600 font-black uppercase">Gras</div>
                                    </div>
                                  </div>

                                  <button 
                                    onClick={() => handleDelete(entry.id)}
                                    className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modal de Perfil */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-700 bg-gradient-to-br from-emerald-500/20 to-transparent">
              <h2 className="text-2xl font-black text-white">Configurar Perfil</h2>
              <p className="text-slate-400 text-sm mt-1 text-balance">Personaliza tus metas nutricionales según tu edad y condición.</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Edad</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({...profileForm, age: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Género</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                  >
                    <option value="M">Hombre</option>
                    <option value="F">Mujer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Peso (kg)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                  value={profileForm.weight}
                  onChange={(e) => setProfileForm({...profileForm, weight: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Actividad Física</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                  value={profileForm.activityLevel}
                  onChange={(e) => setProfileForm({...profileForm, activityLevel: e.target.value})}
                >
                  <option value="LIGERA">Ligera</option>
                  <option value="MODERADA">Moderada</option>
                  <option value="VIGOROSA">Vigorosa</option>
                </select>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-3">
              <button 
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateProfile}
                className="flex-[2] py-3 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-400 transition-all uppercase tracking-wider"
              >
                Guardar Perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Moderno de Porción */}
      {showModal && selectedFood && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-700 bg-gradient-to-br from-emerald-500/20 to-transparent relative shrink-0">
              <div className="bg-emerald-500 w-12 h-1 rounded-full mb-4 opacity-50"></div>
              <h2 className="text-3xl font-black text-white leading-tight">{selectedFood.name}</h2>
              <p className="text-emerald-400/80 text-sm font-bold uppercase tracking-widest mt-1">{selectedFood.group} • {selectedFood.baseAmount}g Base</p>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-700 shadow-inner shrink-0">
                <button
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inputType === 'HOUSEHOLD' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setInputType('HOUSEHOLD')}
                >
                  Medida Casera
                </button>
                <button
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inputType === 'GRAMS' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setInputType('GRAMS')}
                >
                  Gramos
                </button>
              </div>

              <div className="space-y-4 shrink-0">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Tiempo de Comida</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Desayuno', 'Almuerzo', 'Cena', 'Otro'].map(m => (
                    <button
                      key={m}
                      className={`py-3 rounded-xl text-xs font-bold uppercase transition-all ${(!isCustomMeal && mealType === m) || (m === 'Otro' && isCustomMeal) ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      onClick={() => {
                        if (m === 'Otro') setIsCustomMeal(true);
                        else {
                          setIsCustomMeal(false);
                          setMealType(m);
                        }
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {isCustomMeal && (
                  <input
                    type="text"
                    placeholder="Ej. Media mañana, Snack, Postre"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all mt-2"
                    value={customMealType}
                    onChange={(e) => setCustomMealType(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-4 shrink-0 mt-6">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {inputType === 'HOUSEHOLD' ? 'Cantidad de raciones' : 'Peso exacto'}
                  </label>
                  <span className="text-[10px] font-bold text-slate-600 italic">
                    {inputType === 'HOUSEHOLD' ? `Base: ${selectedFood.householdMeasure}` : 'Unidad: gramos'}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-5xl font-black text-center text-emerald-400 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-700/50 text-center">
                  <div className="text-4xl font-black text-white leading-none">
                    {calculatePreview('kcal').toFixed(0)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Calorías Totales</div>
                </div>
                <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-700/50 text-center">
                  <div className="text-4xl font-black text-white leading-none">
                    {calculatePreview('protein').toFixed(1)}<span className="text-sm">g</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Proteína Neta</div>
                </div>
              </div>

              {/* Vista previa de micros en el modal */}
              <div className="pt-4 border-t border-slate-700">
                <h3 className="text-[10px] uppercase font-black text-slate-500 mb-4 tracking-widest">Aporte Nutricional Detallado</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span className="text-slate-500">Carbohidratos</span>
                    <span className="font-bold text-slate-300">{calculatePreview('carbs').toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span className="text-slate-500">Grasas</span>
                    <span className="font-bold text-slate-300">{calculatePreview('fat').toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span className="text-slate-500">Hierro</span>
                    <span className="font-bold text-slate-300">{calculatePreview('iron').toFixed(2)}mg</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span className="text-slate-500">Calcio</span>
                    <span className="font-bold text-slate-300">{calculatePreview('calcium').toFixed(1)}mg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 flex gap-4 shrink-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700">
              <button
                className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-2xl font-bold transition-all active:scale-95"
                onClick={() => setShowModal(false)}
              >
                CERRAR
              </button>
              <button
                className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all active:scale-95 uppercase tracking-wider"
                onClick={handleAddEntry}
              >
                Añadir al Diario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
