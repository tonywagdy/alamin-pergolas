import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  LogIn, 
  LogOut, 
  ImagePlus, 
  Upload, 
  Users, 
  Phone, 
  MessageCircle, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Loader2, 
  Sparkles, 
  ArrowLeftRight, 
  RotateCcw, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw,
  ArrowRight,
  Eye,
  Check,
  AlertTriangle,
  AlertCircle,
  X
} from 'lucide-react';
import { compressImage, compressDataUrl, CompressionResult } from '../utils/imageCompressor';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  addDoc, 
  setDoc,
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { Lead, Project } from '../types';
import { BEFORE_AFTER_ITEMS, PROJECTS, LOGO_URL, PHONE_NUMBER_INTL } from '../data';

const AUTHORIZED_ADMIN_EMAIL = 'twagdy067@gmail.com';

const CATEGORIES = [
  "الكل",
  "برجولات حدائق",
  "برجولات روف",
  "أسقف ديكورية",
  "أعمال خشبية",
  "ديكورات خشبية"
];

interface AdminPortalProps {
  onBackToPublicSite: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToPublicSite }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leads' | 'gallery' | 'beforeAfter'>('leads');

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<'all' | 'new' | 'contacted' | 'closed'>('all');

  // Gallery state
  const [firestoreProjects, setFirestoreProjects] = useState<Project[]>([]);
  const [deletedStaticIds, setDeletedStaticIds] = useState<number[]>([]);
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('الكل');
  
  // Gallery Upload form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('برجولات حدائق');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSizeKb: number;
    compressedSizeKb: number;
    savingsPercent: number;
  } | null>(null);

  // Before & After management states
  const [baTitle, setBaTitle] = useState(BEFORE_AFTER_ITEMS[0].title);
  const [baBeforeImage, setBaBeforeImage] = useState(BEFORE_AFTER_ITEMS[0].beforeImage);
  const [baAfterImage, setBaAfterImage] = useState(BEFORE_AFTER_ITEMS[0].afterImage);
  const [baBeforeBlob, setBaBeforeBlob] = useState<Blob | null>(null);
  const [baAfterBlob, setBaAfterBlob] = useState<Blob | null>(null);
  const [baDirty, setBaDirty] = useState(false);
  const baDirtyRef = useRef(false);
  baDirtyRef.current = baDirty;

  const [isSavingBA, setIsSavingBA] = useState(false);
  const [isCompressingBA, setIsCompressingBA] = useState<'before' | 'after' | null>(null);
  const [baSuccessMsg, setBaSuccessMsg] = useState('');
  
  // Interactive test slider state
  const [testSliderPos, setTestSliderPos] = useState(50);
  const testSliderRef = useRef<HTMLDivElement>(null);

  // In-App Action Confirmations & Toasts (Replaces window.confirm/alert for 100% iframe reliability)
  const [leadIdPendingDelete, setLeadIdPendingDelete] = useState<string | null>(null);
  const [galleryItemPendingDelete, setGalleryItemPendingDelete] = useState<string | number | null>(null);
  const [showResetBAConfirm, setShowResetBAConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthLoading(false);
      if (currentUser) {
        if (currentUser.email === AUTHORIZED_ADMIN_EMAIL) {
          setUser(currentUser);
          setAuthError(null);
        } else {
          setUser(null);
          setAuthError(`عذراً، البريد (${currentUser.email}) غير مصرح له بالدخول. الدخول مقتصر على حساب الإدارة المعتمد.`);
          signOut(auth);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (!user) return;

    // 1. Leads listener
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      const items: Lead[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      }));

      try {
        const stored = localStorage.getItem('alamin_local_leads');
        if (stored) {
          const localItems: Lead[] = JSON.parse(stored);
          const merged = [...items];
          localItems.forEach(local => {
            if (!merged.some(m => m.phone === local.phone && m.name === local.name)) {
              merged.push(local);
            }
          });
          setLeads(merged);
          return;
        }
      } catch (e) {}

      setLeads(items);
    }, (error) => {
      console.warn("Leads fetch notice:", error);
      try {
        const stored = localStorage.getItem('alamin_local_leads');
        if (stored) setLeads(JSON.parse(stored));
      } catch (e) {}
    });

    // 2. Gallery listener
    const qGallery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubGallery = onSnapshot(qGallery, (snapshot) => {
      const items: Project[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
        isFirestore: true
      }));
      setFirestoreProjects(items);
    }, (err) => console.warn("Gallery error:", err));

    // 3. Deleted static items listener
    const qDeleted = query(collection(db, 'deleted_static_images'));
    const unsubDeleted = onSnapshot(qDeleted, (snapshot) => {
      setDeletedStaticIds(snapshot.docs.map(docSnap => Number(docSnap.id)));
    }, (err) => console.warn("Deleted images error:", err));

    // 4. Before & After listeners (main, before, after)
    const unsubBAMain = onSnapshot(doc(db, 'before_after', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (!baDirtyRef.current) {
          if (data.title) setBaTitle(data.title);
          if (data.beforeImage) setBaBeforeImage(data.beforeImage);
          if (data.afterImage) setBaAfterImage(data.afterImage);
        }
      } else {
        try {
          const cached = localStorage.getItem('alamin_before_after');
          if (cached && !baDirtyRef.current) {
            const parsed = JSON.parse(cached);
            if (parsed.beforeImage) setBaBeforeImage(parsed.beforeImage);
            if (parsed.afterImage) setBaAfterImage(parsed.afterImage);
            if (parsed.title) setBaTitle(parsed.title);
          }
        } catch (e) {}
      }
    }, (err) => console.warn("BA main fetch error:", err));

    const unsubBABefore = onSnapshot(doc(db, 'before_after', 'before'), (snapshot) => {
      if (snapshot.exists() && !baDirtyRef.current) {
        const data = snapshot.data();
        if (data && data.image) {
          setBaBeforeImage(data.image);
        }
      }
    }, (err) => console.warn("BA before fetch error:", err));

    const unsubBAAfter = onSnapshot(doc(db, 'before_after', 'after'), (snapshot) => {
      if (snapshot.exists() && !baDirtyRef.current) {
        const data = snapshot.data();
        if (data && data.image) {
          setBaAfterImage(data.image);
        }
      }
    }, (err) => console.warn("BA after fetch error:", err));

    return () => {
      unsubLeads();
      unsubGallery();
      unsubDeleted();
      unsubBAMain();
      unsubBABefore();
      unsubBAAfter();
    };
  }, [user]);

  // Auth Handlers
  const handleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== AUTHORIZED_ADMIN_EMAIL) {
        setAuthError(`الحساب (${result.user.email}) ليس الحساب المعتمد للإدارة (${AUTHORIZED_ADMIN_EMAIL}).`);
        await signOut(auth);
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      setAuthError(error.message || "فشل تسجيل الدخول. يرجى المحاولة مجدداً.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Lead Actions
  const handleUpdateLeadStatus = async (leadId: string, newStatus: 'new' | 'contacted' | 'closed') => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
    } catch (error) {
      console.warn("Update lead status notice:", error);
    }
  };

  const handleConfirmDeleteLead = async (leadId: string) => {
    // 1. Optimistic removal: immediate UI response
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setLeadIdPendingDelete(null);
    showToast("تم حذف طلب العميل بنجاح", "success");

    // 2. Remove from LocalStorage
    try {
      const stored = localStorage.getItem('alamin_local_leads');
      if (stored) {
        const localItems = JSON.parse(stored).filter((l: any) => l.id !== leadId);
        localStorage.setItem('alamin_local_leads', JSON.stringify(localItems));
      }
    } catch (e) {
      console.warn("LocalStorage lead delete notice:", e);
    }

    // 3. Delete from Firestore if exists
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      console.warn("Delete lead Firestore notice:", error);
    }
  };

  // Gallery Actions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsCompressing(true);
    setCompressionInfo(null);

    try {
      const result: CompressionResult = await compressImage(file, 1280, 0.8);
      setCompressedDataUrl(result.dataUrl);
      setCompressedBlob(result.blob);
      const savings = Math.max(0, Math.round(((result.originalSizeKb - result.compressedSizeKb) / result.originalSizeKb) * 100));
      setCompressionInfo({
        originalSizeKb: result.originalSizeKb,
        compressedSizeKb: result.compressedSizeKb,
        savingsPercent: savings,
      });
    } catch (err) {
      console.warn("Client compression warning, will use direct fallback:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || (!selectedFile && !compressedDataUrl)) return;

    setIsUploading(true);
    setUploadStatusText('جاري تجهيز الصورة...');

    try {
      let finalImageUrl = compressedDataUrl;
      let blobToUpload = compressedBlob;

      if (!finalImageUrl && selectedFile) {
        setUploadStatusText('جاري ضغط وتقليل حجم الصورة...');
        const res = await compressImage(selectedFile, 1280, 0.8);
        finalImageUrl = res.dataUrl;
        blobToUpload = res.blob;
      }

      if (storage && blobToUpload) {
        try {
          setUploadStatusText('جاري رفع الصورة للسيرفر...');
          const uploadPromise = (async () => {
            const fileName = `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, fileName);
            const uploadResult = await uploadBytes(storageRef, blobToUpload);
            return await getDownloadURL(uploadResult.ref);
          })();

          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Storage upload timeout')), 3500)
          );

          finalImageUrl = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (storageErr) {
          console.warn("Storage upload fallback directly to Firestore:", storageErr);
        }
      }

      setUploadStatusText('جاري الحفظ في المعرض...');
      await addDoc(collection(db, 'gallery'), {
        title: title.trim(),
        category,
        image: finalImageUrl || previewUrl,
        createdAt: serverTimestamp()
      });

      setTitle('');
      setSelectedFile(null);
      setPreviewUrl('');
      setCompressedDataUrl('');
      setCompressedBlob(null);
      setCompressionInfo(null);
      showToast("تمت إضافة المشروع للمعرض بنجاح وبسرعة فائقة!", "success");
    } catch (error: any) {
      console.error("Upload error:", error);
      showToast(`حدث خطأ أثناء الرفع والحفظ: ${error?.message || 'يرجى المحاولة مرة أخرى'}`, "error");
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  const handleConfirmDeleteGalleryItem = async (id: string | number, isFirestore?: boolean) => {
    setGalleryItemPendingDelete(null);
    if (isFirestore) {
      setFirestoreProjects(prev => prev.filter(p => p.id !== id));
    } else {
      setDeletedStaticIds(prev => [...prev, Number(id)]);
    }
    showToast("تم حذف المشروع من المعرض بنجاح!", "success");

    try {
      if (isFirestore) {
        await deleteDoc(doc(db, 'gallery', id as string));
      } else {
        await setDoc(doc(db, 'deleted_static_images', id.toString()), { 
          deleted: true,
          deletedAt: new Date()
        });
      }
    } catch (error) {
      console.error("Delete gallery item error:", error);
      showToast("تعذر حذف المشروع من السيرفر", "error");
    }
  };

  // Before / After Actions
  const handleSelectBAFile = async (e: React.ChangeEvent<HTMLInputElement>, side: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingBA(side);
    setBaSuccessMsg('');
    try {
      // High-efficiency web compression: 1080px max, 0.78 quality, max 300,000 characters (~220 KB)
      const res: CompressionResult = await compressImage(file, 1080, 0.78, 300000);
      if (side === 'before') {
        setBaBeforeImage(res.dataUrl);
        setBaBeforeBlob(res.blob);
      } else {
        setBaAfterImage(res.dataUrl);
        setBaAfterBlob(res.blob);
      }
      setBaDirty(true);
    } catch (err) {
      console.warn("Client compression notice, attempting fallback:", err);
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          try {
            const compressed = await compressDataUrl(reader.result, 1080, 0.78, 300000);
            if (side === 'before') {
              setBaBeforeImage(compressed.dataUrl);
              setBaBeforeBlob(compressed.blob);
            } else {
              setBaAfterImage(compressed.dataUrl);
              setBaAfterBlob(compressed.blob);
            }
          } catch {
            if (side === 'before') setBaBeforeImage(reader.result as string);
            else setBaAfterImage(reader.result as string);
          }
          setBaDirty(true);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingBA(null);
    }
  };

  const handleSaveBeforeAfter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baBeforeImage || !baAfterImage) {
      showToast("يرجى التأكد من وجود صورة للمكان قبل العمل وصورة بعد التركيب", "error");
      return;
    }

    if (!auth.currentUser) {
      showToast("انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول بحساب المدير أولاً", "error");
      return;
    }

    setIsSavingBA(true);
    setBaSuccessMsg('');

    try {
      // 1. Strict compression check: ensure both images are lightweight (<= 300,000 characters)
      const beforeCompressed = await compressDataUrl(baBeforeImage, 1080, 0.78, 300000);
      const afterCompressed = await compressDataUrl(baAfterImage, 1080, 0.78, 300000);

      let finalBefore = beforeCompressed.dataUrl;
      let finalAfter = afterCompressed.dataUrl;
      const beforeBlob = baBeforeBlob || beforeCompressed.blob;
      const afterBlob = baAfterBlob || afterCompressed.blob;

      // 2. Upload to Firebase Storage if available (provides instant CDN URL)
      if (storage) {
        try {
          const uploadTasks: Promise<void>[] = [];
          if (beforeBlob && beforeBlob.size > 0 && finalBefore.startsWith('data:')) {
            uploadTasks.push((async () => {
              const storageRef = ref(storage, `before_after/before_${Date.now()}.webp`);
              const res = await uploadBytes(storageRef, beforeBlob);
              finalBefore = await getDownloadURL(res.ref);
            })());
          }
          if (afterBlob && afterBlob.size > 0 && finalAfter.startsWith('data:')) {
            uploadTasks.push((async () => {
              const storageRef = ref(storage, `before_after/after_${Date.now()}.webp`);
              const res = await uploadBytes(storageRef, afterBlob);
              finalAfter = await getDownloadURL(res.ref);
            })());
          }

          if (uploadTasks.length > 0) {
            await Promise.race([
              Promise.all(uploadTasks),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Storage upload timeout')), 3500))
            ]);
          }
        } catch (storageErr) {
          console.warn("Storage upload notice (falling back directly to Firestore):", storageErr);
        }
      }

      const cleanTitle = baTitle.trim() || BEFORE_AFTER_ITEMS[0].title;

      // 3. Save to Firestore main document (primary source of truth)
      await setDoc(doc(db, 'before_after', 'main'), {
        beforeImage: finalBefore,
        afterImage: finalAfter,
        title: cleanTitle,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Sync sub-documents for redundancy and high-speed multi-device delivery
      try {
        await Promise.all([
          setDoc(doc(db, 'before_after', 'before'), {
            image: finalBefore,
            updatedAt: serverTimestamp()
          }, { merge: true }),
          setDoc(doc(db, 'before_after', 'after'), {
            image: finalAfter,
            updatedAt: serverTimestamp()
          }, { merge: true })
        ]);
      } catch (subErr) {
        console.warn("Sub-doc sync notice:", subErr);
      }

      // 4. Update local states & cache now that cloud Firestore is safely committed
      setBaBeforeImage(finalBefore);
      setBaAfterImage(finalAfter);
      setBaDirty(false);

      try {
        localStorage.setItem('alamin_before_after', JSON.stringify({
          beforeImage: finalBefore,
          afterImage: finalAfter,
          title: cleanTitle
        }));
      } catch (e) {}

      setBaSuccessMsg("تم حفظ صور قبل وبعد بنجاح وتم نشرها على كافة الأجهزة والموقع فوراً!");
      showToast("تم حفظ صور قبل وبعد وتحديث الموقع بنجاح!", "success");
    } catch (error: any) {
      console.error("Firestore before/after save error:", error);
      showToast(`تعذر حفظ الصور في السيرفر: ${error?.message || 'يرجى مراجعة اتصال الإنترنت'}`, "error");
    } finally {
      setIsSavingBA(false);
    }
  };

  const handleConfirmResetBeforeAfter = async () => {
    setShowResetBAConfirm(false);
    setIsSavingBA(true);
    const defaultData = {
      beforeImage: BEFORE_AFTER_ITEMS[0].beforeImage,
      afterImage: BEFORE_AFTER_ITEMS[0].afterImage,
      title: BEFORE_AFTER_ITEMS[0].title
    };

    setBaBeforeImage(defaultData.beforeImage);
    setBaAfterImage(defaultData.afterImage);
    setBaTitle(defaultData.title);
    setBaDirty(false);

    try {
      localStorage.setItem('alamin_before_after', JSON.stringify(defaultData));
      await Promise.all([
        setDoc(doc(db, 'before_after', 'main'), {
          ...defaultData,
          updatedAt: serverTimestamp()
        }, { merge: true }),
        setDoc(doc(db, 'before_after', 'before'), {
          image: defaultData.beforeImage,
          updatedAt: serverTimestamp()
        }, { merge: true }),
        setDoc(doc(db, 'before_after', 'after'), {
          image: defaultData.afterImage,
          updatedAt: serverTimestamp()
        }, { merge: true })
      ]);
      showToast("تمت استعادة الصور الأصلية بنجاح ونشرها!", "success");
    } catch (e: any) {
      console.warn("Reset notice:", e);
      showToast("تمت استعادة الصور الأصلية محلياً", "success");
    } finally {
      setIsSavingBA(false);
    }
  };

  // Slider Test handler
  const updateTestPosition = useCallback((clientX: number) => {
    if (!testSliderRef.current) return;
    const rect = testSliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setTestSliderPos(position);
  }, []);

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
    const matchesSearch = !leadSearch.trim() || 
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone.includes(leadSearch) ||
      (l.service && l.service.toLowerCase().includes(leadSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Combined Projects
  const allProjects: Project[] = [
    ...firestoreProjects,
    ...PROJECTS.filter(p => !deletedStaticIds.includes(Number(p.id))).map(p => ({ ...p, isFirestore: false }))
  ];

  const filteredProjects = galleryCategoryFilter === 'الكل'
    ? allProjects
    : allProjects.filter(p => p.category === galleryCategoryFilter);

  // Unread new leads count
  const newLeadsCount = leads.filter(l => l.status === 'new').length;

  // -------------------------------------------------------------
  // VIEW 1: LOADING STATE
  // -------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
        <p className="text-sm text-slate-300 font-bold">جاري التحقق من هوية الأمان...</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: UNHEALTHY / UNAUTHENTICATED LOGIN GATE
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" dir="rtl">
        {/* Top Minimal Bar */}
        <header className="p-6 border-b border-slate-800/80 flex items-center justify-between max-w-6xl w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl">
              <img src={LOGO_URL} alt="الأمين للبرجولات" className="h-9 w-auto" />
            </div>
            <div>
              <span className="font-black text-base sm:text-lg block text-white">الأمين للبرجولات</span>
              <span className="text-[11px] text-amber-400 font-semibold tracking-wide">بوابة الإدارة المركزية</span>
            </div>
          </div>

          <button
            onClick={onBackToPublicSite}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <span>العودة للموقع الرئيسي</span>
            <ArrowRight size={14} />
          </button>
        </header>

        {/* Center Login Box */}
        <div className="max-w-md w-full mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
          >
            {/* Top Accent Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-[#143d6a]" />

            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock size={30} />
            </div>

            <h1 className="text-2xl font-black text-center text-white mb-2">تسجيل دخول الإدارة</h1>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              منطقة آمنة ومحمية مخصصة لإدارة طلبات العملاء، معرض الأعمال، وتحديثات صور قبل وبعد.
            </p>

            {authError && (
              <div className="mb-6 p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-300 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl mb-6 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck size={14} />
                <span>حماية مشددة عبر Google Identity</span>
              </div>
              <p className="text-slate-400 leading-normal">
                الوصول مسموح حصرياً للمدير المعتمد:
                <strong className="block text-slate-200 mt-0.5 font-mono text-xs">{AUTHORIZED_ADMIN_EMAIL}</strong>
              </p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 py-3.5 px-5 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>تسجيل الدخول بحساب Google</span>
            </button>

            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
              <button
                onClick={onBackToPublicSite}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                الرجوع لتصفح الموقع كزائر
              </button>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center text-xs text-slate-600 border-t border-slate-900">
          شركة الأمين للبرجولات © {new Date().getFullYear()} — لوحة التحكم الآمنة
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: FULL STANDALONE ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col" dir="rtl">
      {/* Top Application Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Brand & Status */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-2 rounded-xl shadow-xs">
              <img src={LOGO_URL} alt="الأمين" className="h-8 w-auto" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg text-white">لوحة تحكم الأمين</span>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  متصل ومؤمّن
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden md:block">
                مرحباً بك، <strong className="text-slate-200">{user.email}</strong>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToPublicSite}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="تصفح الموقع الرئيسي"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">معاينة الموقع</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-950/50 hover:bg-red-900/80 border border-red-800/60 text-red-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تسجيل الخروج من لوحة التحكم"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-800/80 gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'leads'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Users size={16} />
            <span>طلبات واستفسارات العملاء</span>
            {newLeadsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'leads' ? "bg-slate-950 text-amber-400" : "bg-amber-500 text-slate-950"
              }`}>
                {newLeadsCount} جديد
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gallery'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ImagePlus size={16} />
            <span>معرض المشروعات والأعمال</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'gallery' ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-400"
            }`}>
              {allProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('beforeAfter')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'beforeAfter'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ArrowLeftRight size={16} />
            <span>صور قبل وبعد التركيب</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-bold">
              <span>إجمالي الطلبات</span>
              <Users size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{leads.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">من طلبات الموقع المباشرة</div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 bg-amber-500/5">
            <div className="flex items-center justify-between text-amber-400 text-xs mb-2 font-bold">
              <span>طلبات جديدة بانتظار الرد</span>
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">{newLeadsCount}</div>
            <div className="text-[11px] text-amber-400/80 mt-1">تحتاج متابعة هاتفية أو واتساب</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-bold">
              <span>مشروعات المعرض</span>
              <ImagePlus size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{allProjects.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">معروضة للزوار بالفلترة</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-bold">
              <span>مقارنة قبل وبعد</span>
              <Sparkles size={16} className="text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">نشط ومحدث</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{baTitle}</div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 1: LEADS MANAGEMENT */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="ابحث بالاسم، الهاتف، أو الخدمة..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setLeadStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'all'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  الكل ({leads.length})
                </button>
                <button
                  onClick={() => setLeadStatusFilter('new')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'new'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  جديدة ({leads.filter(l => l.status === 'new').length})
                </button>
                <button
                  onClick={() => setLeadStatusFilter('contacted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'contacted'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  تم التواصل ({leads.filter(l => l.status === 'contacted').length})
                </button>
                <button
                  onClick={() => setLeadStatusFilter('closed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    leadStatusFilter === 'closed'
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  مكتملة ({leads.filter(l => l.status === 'closed').length})
                </button>
              </div>
            </div>

            {/* Leads List */}
            {filteredLeads.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Users size={40} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300 mb-1">لا توجد طلبات مطابقة</h3>
                <p className="text-xs text-slate-500">
                  {leadSearch ? "جرب البحث بكلمات أخرى" : "ستظهر هنا كافة طلبات المعاينة والاستفسارات التي يرسلها العملاء"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => {
                  const waReplyText = `أهلاً بك أستاذ ${lead.name}، معك م/ شركة الأمين للبرجولات بخصوص طلبك (${lead.service}). يشرفنا خدمتك وتحديد موعد المعاينة.`;
                  const waUrl = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waReplyText)}`;

                  return (
                    <div 
                      key={lead.id}
                      className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                        lead.status === 'new'
                          ? "border-amber-500/50 shadow-lg shadow-amber-500/5 bg-amber-500/[0.02]"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header: Name + Status badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-base text-white">{lead.name}</h4>
                            <span className="text-xs text-amber-400 font-bold block mt-0.5">
                              {lead.service || "برجولة خشبية"}
                            </span>
                          </div>

                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                              lead.status === 'new'
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : lead.status === 'contacted'
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            }`}
                          >
                            <option value="new" className="bg-slate-900 text-white">جديد (لم يتم الرد)</option>
                            <option value="contacted" className="bg-slate-900 text-white">تم التواصل</option>
                            <option value="closed" className="bg-slate-900 text-white">مكتمل ومغلق</option>
                          </select>
                        </div>

                        {/* Customer Phone */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <span className="text-slate-400">رقم الهاتف:</span>
                          <span className="font-mono font-bold text-slate-200" dir="ltr">{lead.phone}</span>
                        </div>

                        {/* Customer Message */}
                        {lead.message && (
                          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
                            <span className="text-slate-500 block text-[10px] mb-1 font-bold">ملاحظات العميل:</span>
                            {lead.message}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>
                            {lead.createdAt?.toDate 
                              ? lead.createdAt.toDate().toLocaleString('ar-EG') 
                              : typeof lead.createdAt === 'string' 
                              ? new Date(lead.createdAt).toLocaleString('ar-EG')
                              : 'الآن'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons & In-Card Deletion Confirmation */}
                      {leadIdPendingDelete === lead.id ? (
                        <div className="pt-3 mt-3 border-t border-red-900/60 flex flex-col gap-2 bg-red-950/40 p-3 rounded-xl border border-red-900/50">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-200">
                            <AlertCircle size={15} className="text-red-400 shrink-0" />
                            <span>تأكيد حذف طلب {lead.name} نهائياً؟</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteLead(lead.id)}
                              className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all flex-1 cursor-pointer shadow-md shadow-red-950"
                            >
                              <Trash2 size={13} />
                              <span>نعم، حذف نهائي</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLeadIdPendingDelete(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-3 rounded-lg text-xs font-bold transition-all flex-1 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <a
                              href={`tel:${lead.phone}`}
                              className="bg-[#143d6a] hover:bg-[#1a4f8a] text-white p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors flex-1"
                              title="اتصال هاتفي مباشر"
                            >
                              <Phone size={14} />
                              <span>اتصال</span>
                            </a>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors flex-1"
                              title="رد فوري عبر واتساب"
                            >
                              <MessageCircle size={14} />
                              <span>واتساب</span>
                            </a>
                          </div>

                          <button
                            type="button"
                            onClick={() => setLeadIdPendingDelete(lead.id)}
                            className="bg-red-950/40 hover:bg-red-900/60 text-red-400 p-2.5 rounded-xl transition-colors cursor-pointer border border-red-900/40 hover:border-red-600/60"
                            title="حذف هذا الطلب"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 2: GALLERY & PROJECTS MANAGEMENT */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            
            {/* Upload Section Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">إضافة مشروع جديد للمعرض</h3>
                  <p className="text-xs text-slate-400">يتم ضغط الصورة تلقائياً للحفاظ على سرعة تصفح الموقع والظهور الفوري للعملاء.</p>
                </div>
              </div>

              <form onSubmit={handleUploadImage} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">عنوان ووصف المشروع *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: برجولة حديقة مودرن خشب عزيزي مع دهانات عازلة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">تصنيف العمل في المعرض *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none cursor-pointer"
                    >
                      <option value="برجولات حدائق">برجولات حدائق وفلل</option>
                      <option value="برجولات روف">برجولات روف وأسطح</option>
                      <option value="أسقف ديكورية">أسقف ديكورية وتجاليد</option>
                      <option value="أعمال خشبية">أعمال خشبية وبوابات</option>
                      <option value="ديكورات خشبية">ديكورات وجلسات خشبية</option>
                    </select>
                  </div>
                </div>

                {/* File Drop & Compression Box */}
                <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 bg-slate-950/50 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="admin-gallery-file"
                  />
                  <label htmlFor="admin-gallery-file" className="cursor-pointer flex flex-col items-center">
                    {previewUrl ? (
                      <div className="space-y-3">
                        <div className="max-w-sm mx-auto h-48 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
                          <img src={previewUrl} alt="معاينة" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-amber-400 font-bold underline inline-block">تغيير الصورة المحددة</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                          <ImagePlus size={26} />
                        </div>
                        <span className="text-sm font-bold text-white mb-1">اضغط هنا لاختيار صورة المشروع من جهازك</span>
                        <span className="text-xs text-slate-500">يدعم JPG, PNG, WEBP — يتم الضغط التلقائي السريع</span>
                      </>
                    )}
                  </label>

                  {/* Compression Feedback */}
                  {isCompressing && (
                    <div className="mt-3 text-xs text-amber-400 flex items-center justify-center gap-1.5 font-bold">
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري ضغط الصورة بالذكاء لتسريع الموقع...</span>
                    </div>
                  )}

                  {compressionInfo && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-bold">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>تم ضغط الحجم بنجاح: وفرت {compressionInfo.savingsPercent}% من المساحة</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUploading || isCompressing || !title.trim() || !previewUrl}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{uploadStatusText || 'جاري النشر...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>حفظ ونشر المشروع في المعرض فوراً</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Manage Existing Projects Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-lg text-white">المشروعات الحالية بالمعرض ({filteredProjects.length})</h3>
                  <p className="text-xs text-slate-400">يمكنك حذف أي صورة ترغب بإزالتها من المعرض بنقرة واحدة.</p>
                </div>

                {/* Category Filter */}
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGalleryCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        galleryCategoryFilter === cat
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-amber-400 px-2.5 py-1 rounded-lg">
                        {project.category}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-relaxed">
                        {project.title}
                      </p>

                      {galleryItemPendingDelete === project.id ? (
                        <div className="bg-red-950/90 border border-red-800/80 rounded-xl p-2.5 flex flex-col gap-2">
                          <span className="text-[11px] text-red-200 font-bold text-center">تأكيد حذف هذا المشروع؟</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteGalleryItem(project.id, project.isFirestore)}
                              className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-1.5 px-2 rounded-lg text-[11px] font-bold flex-1 cursor-pointer"
                            >
                              نعم، احذف
                            </button>
                            <button
                              type="button"
                              onClick={() => setGalleryItemPendingDelete(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex-1 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGalleryItemPendingDelete(project.id)}
                          className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>حذف من المعرض</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 3: BEFORE & AFTER MANAGEMENT */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'beforeAfter' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">إدارة صور مقارنة قبل وبعد</h3>
                  <p className="text-xs text-slate-400">عدل صورة المكان قبل البدء وصورة النتيجة بعد التركيب لاطلاع الزوار على جودة التنفيذ.</p>
                </div>
              </div>

              <form onSubmit={handleSaveBeforeAfter} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">عنوان التحول *</label>
                  <input
                    type="text"
                    value={baTitle}
                    onChange={(e) => {
                      setBaTitle(e.target.value);
                      setBaDirty(true);
                    }}
                    placeholder="مثال: تحويل روف خرساني إلى واحة استجمام فندقية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Upload Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Upload */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                        صورة قبل العمل
                      </span>
                      {isCompressingBA === 'before' && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" /> جاري الضغط...
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                      <img src={baBeforeImage} alt="قبل العمل" className="w-full h-full object-cover" />
                    </div>

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSelectBAFile(e, 'before')}
                        disabled={isSavingBA || isCompressingBA !== null}
                        className="w-full text-xs text-slate-400 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-amber-500 hover:file:text-slate-950 file:cursor-pointer cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* After Upload */}
                  <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 bg-amber-500/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                        <Sparkles size={14} />
                        صورة بعد التركيب
                      </span>
                      {isCompressingBA === 'after' && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" /> جاري الضغط...
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-amber-500/30">
                      <img src={baAfterImage} alt="بعد التركيب" className="w-full h-full object-cover" />
                    </div>

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSelectBAFile(e, 'after')}
                        disabled={isSavingBA || isCompressingBA !== null}
                        className="w-full text-xs text-slate-400 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {baSuccessMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs font-bold text-center">
                    {baSuccessMsg}
                  </div>
                )}

                {/* Save & Reset Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingBA || isCompressingBA !== null}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    {isSavingBA ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جاري الحفظ وتحديث الموقع...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>حفظ ونشر التعديلات فوراً على الموقع</span>
                      </>
                    )}
                  </button>

                  {showResetBAConfirm ? (
                    <div className="bg-slate-800 border border-amber-500/40 rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-xs text-slate-200 font-bold">استعادة الصور الأصلية؟</span>
                      <button
                        type="button"
                        onClick={handleConfirmResetBeforeAfter}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetBAConfirm(false)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowResetBAConfirm(true)}
                      disabled={isSavingBA}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 px-5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>استعادة الصور الأصلية</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Eye size={16} className="text-amber-400" />
                  <span>معاينة حية وتجربة السلايدر التفاعلي كما سيظهر للعميل</span>
                </h4>
                <span className="text-[11px] text-slate-400">اسحب المؤشر للمقارنة</span>
              </div>

              <div 
                ref={testSliderRef}
                onMouseMove={(e) => updateTestPosition(e.clientX)}
                onTouchMove={(e) => e.touches[0] && updateTestPosition(e.touches[0].clientX)}
                className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden select-none cursor-ew-resize border border-slate-800 shadow-2xl"
              >
                {/* AFTER Image (Background) */}
                <img
                  src={baAfterImage}
                  alt="بعد التركيب"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* BEFORE Image (Clipped Overlay) */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - testSliderPos}% 0 0)` }}
                >
                  <img
                    src={baBeforeImage}
                    alt="قبل العمل"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <span className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    قبل العمل
                  </span>
                </div>

                <span className="absolute top-4 left-4 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-lg">
                  بعد التركيب ✨
                </span>

                {/* Slider Handle Divider */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl pointer-events-none"
                  style={{ left: `${testSliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-slate-900 rounded-full shadow-2xl flex items-center justify-center border-2 border-amber-500">
                    <ArrowLeftRight size={14} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Floating In-App Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold ${
              toastMessage.type === 'error'
                ? "bg-red-950/95 border-red-800 text-red-200 shadow-red-950/60"
                : "bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50"
            } backdrop-blur-xl`}>
              {toastMessage.type === 'error' ? (
                <AlertCircle size={18} className="text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
              <button 
                type="button"
                onClick={() => setToastMessage(null)}
                className="mr-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        بوابة الإدارة المركزية والآمنة — شركة الأمين لتصميم وتصنيع البرجولات © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
