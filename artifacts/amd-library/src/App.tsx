import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  useAddFavorite,
  useCreateBook,
  useDeleteBook,
  useGetAccountLibrary,
  useGetAdminOverview,
  useGetBook,
  useGetLibraryOverview,
  useListBooks,
  useRemoveFavorite,
  useUpdateBook,
  useUpdateReadingProgress,
  getGetAccountLibraryQueryKey,
  getGetAdminOverviewQueryKey,
  getGetBookQueryKey,
  getGetLibraryOverviewQueryKey,
  getListBooksQueryKey,
} from '@workspace/api-client-react';
import type { Book, BookInput, BookSectionInput, BookUpdate, ListBooksParams } from '@workspace/api-client-react';
import {
  ArrowDownToLine, ArrowLeft, ArrowUpLeft, BookOpen, Bookmark, Check, ChevronDown, ChevronLeft,
  CircleAlert, FileText, Filter, Heart, LibraryBig, List, LogIn, LogOut, Menu, Plus, Search,
  Settings2, ShieldCheck, Users, X,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useRoute } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d9a644',
    colorForeground: '#eee9dc',
    colorMutedForeground: '#a8a8a4',
    colorDanger: '#e37972',
    colorBackground: '#18202b',
    colorInput: '#101722',
    colorInputForeground: '#eee9dc',
    colorNeutral: '#384454',
    fontFamily: 'Tajawal',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#18202b] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#384454]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#eee9dc] font-bold',
    headerSubtitle: 'text-[#b3b6b8]',
    socialButtonsBlockButtonText: 'text-[#eee9dc]',
    formFieldLabel: 'text-[#d8d6cc]',
    footerActionLink: 'text-[#e0b257]',
    footerActionText: 'text-[#aeb2b6]',
    dividerText: 'text-[#9da4aa]',
    identityPreviewEditButton: 'text-[#e0b257]',
    formFieldSuccessText: 'text-[#b8d6bc]',
    alertText: 'text-[#eee9dc]',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-[#384454] bg-[#121a25] hover:bg-[#202a38]',
    formButtonPrimary: 'bg-[#d9a644] text-[#161c24] hover:bg-[#e6b955]',
    formFieldInput: 'border-[#384454] bg-[#101722] text-[#eee9dc]',
    footerAction: 'border-[#384454]',
    dividerLine: 'bg-[#384454]',
    alert: 'border-[#384454] bg-[#222c38]',
    otpCodeFieldInput: 'border-[#384454] bg-[#101722] text-[#eee9dc]',
    formFieldRow: 'text-[#d8d6cc]',
    main: 'bg-transparent',
  },
};

type SectionDraft = { title: string; description: string; pageNumber: string };

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="العودة إلى عَمْد">
      <span className="brand-mark font-amiri">ع</span>
      <span className="brand-copy"><strong className="font-amiri">عَمْد</strong><small>مكتبة العلوم الشرعية</small></span>
    </Link>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const [location] = useLocation();
  const nav = [
    { href: '/', label: 'الرئيسية' },
    { href: '/catalog', label: 'فهرس الكتب' },
    ...(isSignedIn ? [{ href: '/my-library', label: 'مكتبتي' }] : []),
    ...(isSignedIn ? [{ href: '/admin', label: 'الإدارة' }] : []),
  ];
  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <Brand />
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
          {nav.map(item => <Link key={item.href} href={item.href} className={location === item.href ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          {isSignedIn ? (
            <>
              <Link href="/my-library" className="account-pill"><span className="account-initial">{user?.firstName?.slice(0, 1) ?? 'ق'}</span><span>{user?.firstName ?? 'حسابي'}</span></Link>
              <button className="icon-button logout-button" type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut size={17} /></button>
            </>
          ) : <Link href="/sign-in" className="quiet-button login-link"><LogIn size={16} /> دخول</Link>}
          <button className="icon-button menu-toggle" onClick={() => setMenuOpen(v => !v)} type="button" aria-label="فتح القائمة" aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><Brand /><p>عَمْد — قراءة راسخة، وعلمٌ يُنتفع به.</p><Link href="/catalog">تصفّح المكتبة <ArrowLeft size={14} /></Link></div></footer>;
}

function PageFrame({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><div className="app-shell" dir="rtl"><Header />{children}{footer && <Footer />}</div></ErrorBoundary>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading fade-up"><div><span className="eyebrow">{eyebrow}</span><h1 className="font-amiri">{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return <div className="book-grid" aria-label="جارٍ تحميل الكتب">{Array.from({ length: count }, (_, i) => <div className="skeleton-book" key={i}><div className="skeleton-cover" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>;
}

function QueryError({ retry, message = 'تعذّر تحميل المحتوى الآن.' }: { retry: () => void; message?: string }) {
  return <div className="state-panel"><CircleAlert size={24} /><strong>{message}</strong><button className="quiet-button" onClick={retry} type="button">إعادة المحاولة</button></div>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="state-panel empty-state"><span className="empty-icon"><BookOpen size={22} /></span><strong>{title}</strong><p>{detail}</p>{action}</div>;
}

function Cover({ book, compact = false }: { book: Book; compact?: boolean }) {
  return <div className={`book-cover ${compact ? 'cover-compact' : ''} ${book.coverUrl ? 'has-image' : ''}`} style={book.coverUrl ? { backgroundImage: `linear-gradient(180deg,rgba(12,18,28,.06),rgba(12,18,28,.78)),url("${book.coverUrl}")` } : undefined}>
    {!book.coverUrl && <><span className="cover-art font-amiri">عَمْد</span><div className="cover-title font-amiri">{book.title}</div><div className="cover-author">{book.author}</div><small className="cover-imprint">مكتبة العلوم الشرعية</small></>}
  </div>;
}

function FavoriteButton({ book, initialFavorite = false }: { book: Book; initialFavorite?: boolean }) {
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const add = useAddFavorite();
  const remove = useRemoveFavorite();
  const busy = add.isPending || remove.isPending;
  const toggle = () => {
    if (!isSignedIn) { setLocation('/sign-in'); return; }
    const mutation = initialFavorite ? remove : add;
    mutation.mutate({ bookId: book.id }, {
      onSuccess: () => client.invalidateQueries({ queryKey: getGetAccountLibraryQueryKey() }),
    });
  };
  return <button className={`favorite-button ${initialFavorite ? 'is-favorite' : ''}`} type="button" onClick={toggle} disabled={busy} aria-label={initialFavorite ? 'إزالة من مكتبتي' : 'إضافة إلى مكتبتي'} title={initialFavorite ? 'إزالة من مكتبتي' : 'حفظ في مكتبتي'}><Heart size={17} fill={initialFavorite ? 'currentColor' : 'none'} /></button>;
}

function BookCard({ book, favoriteIds = [] }: { book: Book; favoriteIds?: number[] }) {
  return <article className="book-card fade-up" data-testid={`card-book-${book.id}`}>
    <Link href={`/books/${book.id}`} className="cover-link" aria-label={`تفاصيل ${book.title}`}><Cover book={book} /></Link>
    <div className="book-card-info">
      <div className="card-meta"><span>{book.category}</span>{book.publishedYear && <span>{book.publishedYear}</span>}</div>
      <Link href={`/books/${book.id}`} className="card-title font-amiri">{book.title}</Link>
      <p className="card-author">{book.author}</p>
      <div className="card-bottom"><Link href={`/books/${book.id}`} className="text-link">التفاصيل <ArrowLeft size={14} /></Link><FavoriteButton book={book} initialFavorite={favoriteIds.includes(book.id)} /></div>
    </div>
  </article>;
}

function Home() {
  const { data, isLoading, isError, refetch } = useGetLibraryOverview();
  const { isSignedIn } = useUser();
  const { data: account } = useGetAccountLibrary({ query: { queryKey: getGetAccountLibraryQueryKey(), enabled: Boolean(isSignedIn) } });
  const favoriteIds = account?.favorites.map(book => book.id) ?? [];
  const books = data?.featuredBooks ?? [];
  const recents = data?.recentBooks ?? [];
  const categories = data?.categoryCounts ?? [];
  return <PageFrame>
    <main>
      <section className="hero">
        <div className="hero-ornament ornament" aria-hidden="true"><span className="font-amiri">عَمْد</span></div>
        <div className="shell hero-content">
          <div className="hero-copy fade-up">
            <span className="hero-kicker"><span className="gold-dot" /> مكتبة رقمية للعلوم الشرعية</span>
            <h1 className="font-amiri">رفيقٌ لرحلتك<br /><em>في طلب العلم</em></h1>
            <p>أمهات الكتب بين يديك؛ تصفّح فهارسها، اقرأ على مهل، واحتفظ بموضعك حيثما عدت.</p>
            <div className="hero-ctas"><Link href="/catalog" className="primary-button">ابدأ التصفّح <ArrowLeft size={17} /></Link><Link href="/my-library" className="outline-button">مكتبتي <Bookmark size={16} /></Link></div>
            <div className="hero-metrics"><div><strong>{data?.totalBooks ?? '—'}</strong><span>كتاباً في المكتبة</span></div><i /><div><strong>{data?.totalSections ?? '—'}</strong><span>باباً وفصلاً</span></div></div>
          </div>
          <div className="hero-stack fade-up delay-2" aria-hidden="true">
            <div className="stack-glow" />
            <div className="stack-book stack-back"><span className="font-amiri">أصول الفقه</span><small>من ذخائر التراث</small></div>
            <div className="stack-book stack-middle"><span className="font-amiri">رياض الصالحين</span><small>الإمام النووي</small></div>
            {books[0] && <div className="stack-book stack-front"><span className="stack-caption">مختار المكتبة</span><strong className="font-amiri">{books[0].title}</strong><small>{books[0].author}</small><span className="stack-edition">عَمْد · {books[0].publishedYear ?? 'طبعة رقمية'}</span></div>}
            {!books[0] && <div className="stack-book stack-front"><span className="stack-caption">مكتبة عَمْد</span><strong className="font-amiri">العلم ميراثٌ باقٍ</strong><small>أمهات المتون وشروحها</small><span className="stack-edition">عَمْد · مكتبة رقمية</span></div>}
          </div>
          <div className="hero-foot"><span>معرفةٌ تُطلب بعناية</span><span className="hero-foot-line" /><span>قراءةٌ بلا عجلة</span></div>
        </div>
      </section>
      <section className="shell home-section">
        <div className="section-title-row"><div><span className="eyebrow">مختارات المكتبة</span><h2 className="font-amiri">كتب تستحق أن تبدأ بها</h2><p>اختيارات قيّمة من رفوف عَمْد.</p></div><Link href="/catalog" className="text-link">كل الكتب <ArrowLeft size={15} /></Link></div>
        {isLoading ? <SkeletonGrid count={4} /> : isError ? <QueryError retry={() => void refetch()} /> : books.length ? <div className="book-grid">{books.slice(0, 4).map(book => <BookCard key={book.id} book={book} favoriteIds={favoriteIds} />)}</div> : <EmptyState title="تُرتّب المكتبة رفوفها" detail="لا توجد كتب مميزة حالياً، تفقّد فهرس المكتبة." action={<Link href="/catalog" className="text-link">فتح الفهرس <ArrowLeft size={15} /></Link>} />}
      </section>
      <section className="category-band">
        <div className="shell category-band-inner"><div className="category-intro"><span className="eyebrow">أبواب العلم</span><h2 className="font-amiri">تصفّح بحسب الفنّ</h2><p>لكل فنّ بابه، ولكل طالب علم وجهته.</p></div><div className="category-list">{categories.map((category, index) => <Link key={category.name} href={`/catalog?category=${encodeURIComponent(category.name)}`} className="category-row"><span className="category-number">٠{index + 1}</span><span className="category-name font-amiri">{category.name}</span><span className="category-count">{category.count} كتاب</span><ChevronLeft size={16} /></Link>)}{!categories.length && !isLoading && <Link href="/catalog" className="category-row"><span className="category-number">٠١</span><span className="category-name font-amiri">جميع العلوم</span><span className="category-count">استكشف الفهرس</span><ChevronLeft size={16} /></Link>}</div></div>
      </section>
      <section className="shell home-section recent-section">
        <div className="section-title-row"><div><span className="eyebrow">وصل حديثاً</span><h2 className="font-amiri">أضيف إلى الرفوف</h2></div><Link href="/catalog?sort=newest" className="text-link">الأحدث أولاً <ArrowLeft size={15} /></Link></div>
        {isLoading ? <SkeletonGrid count={3} /> : isError ? <QueryError retry={() => void refetch()} /> : recents.length ? <div className="book-grid recent-grid">{recents.slice(0, 3).map(book => <BookCard key={book.id} book={book} favoriteIds={favoriteIds} />)}</div> : <EmptyState title="لا توجد إضافات جديدة بعد" detail="عُد قريباً لاكتشاف ما يضاف إلى المكتبة." />}
      </section>
      <section className="reading-invitation"><div className="shell invitation-inner"><div><span className="eyebrow">رفيق القراءة</span><h2 className="font-amiri">حيث توقفت، ننتظرك.</h2><p>سجّل دخولك لتحفظ كتبك وموضع قراءتك، وتعود إليها في أي وقت.</p></div><Link href="/sign-up" className="outline-button">أنشئ حساباً <ArrowLeft size={16} /></Link></div></section>
    </main>
  </PageFrame>;
}

function Catalog() {
  const { isSignedIn } = useUser();
  const initialCategory = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('category') ?? '' : '';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<ListBooksParams['sort']>('newest');
  const debouncedSearch = useDebounced(search, 300);
  const queryParams = useMemo<ListBooksParams>(() => ({ q: debouncedSearch || undefined, category: category || undefined, sort, limit: 60 }), [debouncedSearch, category, sort]);
  const query = useListBooks(queryParams, { query: { queryKey: getListBooksQueryKey(queryParams) } });
  const { data: account } = useGetAccountLibrary({ query: { queryKey: getGetAccountLibraryQueryKey(), enabled: Boolean(isSignedIn) } });
  const favorites = account?.favorites.map(book => book.id) ?? [];
  const categories = query.data?.categories ?? [];
  const results = query.data?.items ?? [];
  return <PageFrame><main className="shell content-page">
    <PageHeading eyebrow="فهرس عَمْد" title="مكتبةٌ تُقرأ على مهل" description="ابحث في عناوين الكتب ومؤلفيها، أو اختر الفن الذي تريد." />
    <div className="catalog-controls">
      <label className="search-field"><Search size={19} /><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن كتاب أو مؤلف..." aria-label="ابحث عن كتاب أو مؤلف" data-testid="input-catalog-search" /><kbd>⌘ K</kbd></label>
      <label className="select-control"><Filter size={16} /><select value={category} onChange={e => setCategory(e.target.value)} aria-label="تصفية حسب الفن" data-testid="select-category"><option value="">جميع الفنون</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
      <label className="select-control"><Settings2 size={16} /><select value={sort} onChange={e => setSort(e.target.value as ListBooksParams['sort'])} aria-label="ترتيب الكتب" data-testid="select-sort"><option value="newest">الأحدث</option><option value="title">ترتيب العنوان</option><option value="popular">الأكثر قراءة</option></select><ChevronDown size={14} /></label>
    </div>
    <div className="results-summary"><span>{query.data?.total ?? 0} كتاب</span>{category && <button type="button" onClick={() => setCategory('')} className="filter-chip">{category}<X size={13} /></button>}</div>
    {query.isLoading ? <SkeletonGrid count={8} /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : results.length ? <div className="book-grid catalog-grid">{results.map(book => <BookCard key={book.id} book={book} favoriteIds={favorites} />)}</div> : <EmptyState title="لم نعثر على كتاب بهذا الوصف" detail="جرّب كلمات بحث أخرى أو أزل المرشّح الحالي." action={<button className="quiet-button" onClick={() => { setSearch(''); setCategory(''); }} type="button">مسح البحث</button>} />}
  </main></PageFrame>;
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return debounced;
}

function BookDetailPage() {
  const [, params] = useRoute<{ bookId: string }>('/books/:bookId');
  const bookId = Number(params?.bookId);
  const query = useGetBook(bookId, { query: { queryKey: getGetBookQueryKey(bookId), enabled: Number.isFinite(bookId) && bookId > 0 } });
  const { isSignedIn } = useUser();
  const account = useGetAccountLibrary({ query: { queryKey: getGetAccountLibraryQueryKey(), enabled: Boolean(isSignedIn) } });
  if (query.isLoading) return <PageFrame><main className="shell content-page"><SkeletonGrid count={1} /></main></PageFrame>;
  if (query.isError || !query.data) return <PageFrame><main className="shell content-page"><QueryError retry={() => void query.refetch()} message="تعذّر العثور على هذا الكتاب." /></main></PageFrame>;
  const { book, sections } = query.data;
  const favorite = account.data?.favorites.some(item => item.id === book.id) ?? false;
  return <PageFrame><main className="shell content-page">
    <Link href="/catalog" className="back-link"><ArrowUpLeft size={16} /> العودة إلى الفهرس</Link>
    <section className="detail-hero surface">
      <div className="detail-cover"><Cover book={book} /></div>
      <div className="detail-copy"><span className="eyebrow">{book.category}</span><h1 className="font-amiri">{book.title}</h1><p className="detail-author">{book.author}{book.publishedYear ? ` · ${book.publishedYear}` : ''}</p><p className="detail-description">{book.description}</p><div className="detail-stats"><span><List size={16} /> {sections.length} باباً في الفهرس</span><span><FileText size={16} /> {book.status === 'published' ? 'متاح للقراءة' : 'مسودة'}</span></div><div className="detail-actions">{book.readerUrl ? <Link href={`/read/${book.id}`} className="primary-button"><BookOpen size={17} /> ابدأ القراءة</Link> : <button className="primary-button disabled" disabled><BookOpen size={17} /> القراءة غير متاحة</button>}{book.downloadUrl && <a href={book.downloadUrl} target="_blank" rel="noreferrer" className="outline-button"><ArrowDownToLine size={17} /> تحميل الكتاب</a>}<FavoriteButton book={book} initialFavorite={favorite} /></div></div>
    </section>
    <section className="toc-section"><div className="section-title-row"><div><span className="eyebrow">دليل القراءة</span><h2 className="font-amiri">فهرس الكتاب</h2><p>انتقل إلى الباب الذي تريد قراءته.</p></div><span className="toc-total">{sections.length} باب</span></div>
      {sections.length ? <div className="toc-list">{sections.map((section, index) => <a key={section.id} href={book.readerUrl ? `${book.readerUrl}#page=${section.pageNumber ?? 1}` : undefined} target={book.readerUrl ? '_blank' : undefined} rel="noreferrer" className="toc-row"><span className="toc-index">{String(index + 1).padStart(2, '0')}</span><span className="toc-main"><strong className="font-amiri">{section.title}</strong>{section.description && <small>{section.description}</small>}</span><span className="toc-page">{section.pageNumber ? `ص ${section.pageNumber}` : '—'}</span><ChevronLeft size={17} /></a>)}</div> : <EmptyState title="لا يتوفر فهرس لهذا الكتاب بعد" detail="ستظهر الأبواب هنا عند إضافتها." />}
    </section>
  </main></PageFrame>;
}

function Reader() {
  const [, params] = useRoute<{ bookId: string }>('/read/:bookId');
  const bookId = Number(params?.bookId);
  const query = useGetBook(bookId, { query: { queryKey: getGetBookQueryKey(bookId), enabled: Number.isFinite(bookId) && bookId > 0 } });
  const { isSignedIn } = useUser();
  const accountQuery = useGetAccountLibrary({ query: { queryKey: getGetAccountLibraryQueryKey(), enabled: Boolean(isSignedIn) } });
  const saveProgress = useUpdateReadingProgress();
  const [page, setPage] = useState('');
  const [percent, setPercent] = useState(0);
  const initialized = useRef<number | null>(null);
  const progress = accountQuery.data?.progress.find(item => item.bookId === bookId);
  useEffect(() => {
    if (progress && initialized.current !== bookId) {
      initialized.current = bookId;
      setPage(progress.pageNumber?.toString() ?? '');
      setPercent(progress.progressPercent);
    }
  }, [bookId, progress]);
  if (query.isLoading) return <PageFrame><main className="shell content-page"><div className="reader-loading"><div className="skeleton-line" /><div className="reader-skeleton" /></div></main></PageFrame>;
  if (query.isError || !query.data) return <PageFrame><main className="shell content-page"><QueryError retry={() => void query.refetch()} message="تعذّر فتح هذا الكتاب." /></main></PageFrame>;
  const { book } = query.data;
  if (!book.readerUrl) return <PageFrame><main className="shell content-page"><EmptyState title="النسخة المقروءة غير متاحة" detail="يمكنك العودة إلى تفاصيل الكتاب للاطلاع على معلوماته." action={<Link href={`/books/${book.id}`} className="text-link">تفاصيل الكتاب <ArrowLeft size={14} /></Link>} /></main></PageFrame>;
  const save = (event: FormEvent) => {
    event.preventDefault();
    saveProgress.mutate({ bookId, data: { pageNumber: page ? Math.max(0, Number(page)) : null, progressPercent: Math.min(100, Math.max(0, Number(percent))) } }, {
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getGetAccountLibraryQueryKey() }); },
    });
  };
  return <PageFrame footer={false}><main className="reader-page">
    <div className="reader-top"><Link href={`/books/${book.id}`} className="back-link"><ArrowLeft size={16} /> تفاصيل الكتاب</Link><div className="reader-bookname"><span>{book.category}</span><strong className="font-amiri">{book.title}</strong></div>{book.downloadUrl ? <a className="reader-download" href={book.downloadUrl} target="_blank" rel="noreferrer"><ArrowDownToLine size={16} /> تحميل</a> : <span />}</div>
    <div className="reader-workspace"><div className="reader-document"><iframe title={`قارئ ${book.title}`} src={book.readerUrl} allow="fullscreen" /></div>
      <aside className="reader-side surface"><span className="eyebrow">موضع القراءة</span><h2 className="font-amiri">{book.title}</h2><p>{book.author}</p><form onSubmit={save} className="progress-form"><label>رقم الصفحة<input type="number" min="0" inputMode="numeric" value={page} onChange={e => setPage(e.target.value)} placeholder="مثال: ١٢٨" /></label><label>نسبة الإنجاز <strong>{percent}%</strong><input type="range" min="0" max="100" value={percent} onChange={e => setPercent(Number(e.target.value))} /></label><button className="primary-button full-button" type="submit" disabled={saveProgress.isPending}>{saveProgress.isPending ? 'جارٍ الحفظ...' : saveProgress.isSuccess ? <><Check size={16} /> حُفظ موضعك</> : <><Bookmark size={16} /> حفظ موضع القراءة</>}</button>{saveProgress.isError && <small className="form-error">تعذّر حفظ التقدّم. حاول مرة أخرى.</small>}</form><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><small className="progress-caption">{progress ? `آخر حفظ: ${new Date(progress.updatedAt).toLocaleDateString('ar')}` : 'احفظ تقدّمك لتعود إليه لاحقاً.'}</small><Link href={`/books/${book.id}`} className="reader-index"><List size={16} /> فهرس الكتاب</Link></aside>
    </div>
  </main></PageFrame>;
}

function LibraryPage() {
  const query = useGetAccountLibrary();
  const catalogParams: ListBooksParams = { limit: 100, sort: 'newest' };
  const catalogQuery = useListBooks(catalogParams, { query: { queryKey: getListBooksQueryKey(catalogParams) } });
  const favorites = query.data?.favorites ?? [];
  const progress = query.data?.progress ?? [];
  const booksById = new Map([...(catalogQuery.data?.items ?? []), ...favorites].map(book => [book.id, book]));
  const progressBooks = progress.map(item => ({ item, book: booksById.get(item.bookId) })).filter((entry): entry is { item: (typeof progress)[number]; book: Book } => Boolean(entry.book));
  return <PageFrame><main className="shell content-page">
    <PageHeading eyebrow="مساحتك الخاصة" title="مكتبتي" description="كتبك المحفوظة ومواضع قراءتك، في مكان واحد." />
    {query.isLoading ? <><div className="skeleton-line" /><SkeletonGrid count={3} /></> : query.isError ? <QueryError retry={() => void query.refetch()} message="سجّل الدخول لعرض مكتبتك الشخصية." /> : <>
      <section className="library-section"><div className="section-title-row"><div><span className="eyebrow">قراءة مستمرة</span><h2 className="font-amiri">تابع من حيث توقفت</h2></div><span className="toc-total">{progress.length} كتاب</span></div>
        {progressBooks.length ? <div className="progress-book-list">{progressBooks.map(({ book, item }) => <article key={item.bookId} className="progress-book surface"><Cover book={book} compact /><div className="progress-book-info"><span className="eyebrow">{book.category}</span><Link href={`/books/${book.id}`} className="font-amiri">{book.title}</Link><small>{item.pageNumber ? `وصلت إلى الصفحة ${item.pageNumber}` : 'تابع قراءتك'}</small><div className="progress-track"><span style={{ width: `${item.progressPercent}%` }} /></div></div><strong className="progress-value">{item.progressPercent}%</strong><Link href={`/read/${book.id}`} className="outline-button continue-button">متابعة القراءة <ArrowLeft size={15} /></Link></article>)}</div> : <EmptyState title="لم تبدأ قراءة بعد" detail="عندما تحفظ موضعك في كتاب، ستجده هنا." action={<Link href="/catalog" className="text-link">استكشف الكتب <ArrowLeft size={14} /></Link>} />}
      </section>
      <section className="library-section"><div className="section-title-row"><div><span className="eyebrow">على رفّك</span><h2 className="font-amiri">الكتب المحفوظة</h2></div><span className="toc-total">{favorites.length} كتاب</span></div>
        {favorites.length ? <div className="book-grid catalog-grid">{favorites.map(book => <BookCard key={book.id} book={book} favoriteIds={favorites.map(item => item.id)} />)}</div> : <EmptyState title="رفّك ما زال فارغاً" detail="احفظ الكتب التي تود العودة إليها." action={<Link href="/catalog" className="text-link">تصفّح الفهرس <ArrowLeft size={14} /></Link>} />}
      </section>
    </>}</main></PageFrame>;
}

function AdminPage() {
  const overview = useGetAdminOverview();
  const listParams: ListBooksParams = { limit: 100, sort: 'newest' };
  const booksQuery = useListBooks(listParams, { query: { queryKey: getListBooksQueryKey(listParams) } });
  const [editor, setEditor] = useState<Book | null | false>(false);
  const [notice, setNotice] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const create = useCreateBook();
  const update = useUpdateBook();
  const remove = useDeleteBook();
  const client = useQueryClient();
  const refreshAdmin = () => {
    void client.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
    void client.invalidateQueries({ queryKey: getListBooksQueryKey(listParams) });
    void client.invalidateQueries({ queryKey: getGetLibraryOverviewQueryKey() });
  };
  const deleteBook = (book: Book) => {
    if (!window.confirm(`هل تريد حذف «${book.title}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    remove.mutate({ bookId: book.id }, { onSuccess: () => { refreshAdmin(); setNotice('حُذف الكتاب بنجاح.'); }, onError: () => setDeleteError('تعذّر حذف الكتاب. تحقق من صلاحية الحساب ثم أعد المحاولة.') });
  };
  const submit = (payload: BookInput | BookUpdate, book: Book | null) => {
    if (book) {
      update.mutate({ bookId: book.id, data: payload as BookUpdate }, { onSuccess: () => { refreshAdmin(); setEditor(false); setNotice('حُدّث الكتاب وفهرسه.'); }, onError: () => setNotice('تعذّر تحديث الكتاب. راجع الحقول وحاول ثانية.') });
    } else {
      create.mutate({ data: payload as BookInput }, { onSuccess: () => { refreshAdmin(); setEditor(false); setNotice('أُضيف الكتاب إلى المكتبة.'); }, onError: () => setNotice('تعذّر إضافة الكتاب. راجع الحقول وحاول ثانية.') });
    }
  };
  const adminError = overview.isError;
  const adminStats = overview.data;
  const adminBooks = booksQuery.data?.items ?? [];
  return <PageFrame><main className="shell content-page admin-page">
    <PageHeading eyebrow="إدارة المكتبة" title="رفوف عَمْد" description="إدارة الكتب ومحتواها وفهارس الأبواب." action={<button className="primary-button" type="button" onClick={() => setEditor(null)}><Plus size={17} /> إضافة كتاب</button>} />
    {notice && <div className={`notice ${notice.includes('تعذّر') ? 'notice-error' : ''}`} role="status">{notice}<button onClick={() => setNotice('')} type="button" aria-label="إغلاق"><X size={15} /></button></div>}
    {overview.isLoading ? <div className="stats-grid">{Array.from({ length: 4 }, (_, i) => <div className="stat-skeleton" key={i} />)}</div> : adminError || !adminStats ? <div className="permission-note"><ShieldCheck size={19} /><div><strong>تعذّر تحميل لوحة الإدارة</strong><p>صلاحية الإدارة يتحقق منها الخادم. إذا كنت مسؤول المكتبة، سجّل الدخول بحساب مخوّل.</p><Link href="/sign-in" className="text-link">تسجيل الدخول <ArrowLeft size={14} /></Link></div></div> : <div className="stats-grid">{[
      ['إجمالي الكتب', adminStats.bookCount, <LibraryBig size={19} />],
      ['منشور', adminStats.publishedCount, <BookOpen size={19} />],
      ['مسودة', adminStats.draftCount, <FileText size={19} />],
      ['أبواب وفصول', adminStats.sectionCount, <List size={19} />],
      ['القرّاء', adminStats.readerCount, <Users size={19} />],
    ].map(([label, value, icon]) => <div className="stat-card surface" key={String(label)}><span className="stat-icon">{icon}</span><strong>{value}</strong><small>{label}</small></div>)}</div>}
    <section className="admin-catalog"><div className="section-title-row"><div><span className="eyebrow">الفهرس</span><h2 className="font-amiri">الكتب المسجّلة</h2></div><span className="toc-total">{booksQuery.data?.total ?? '—'} كتاب</span></div>
      {deleteError && <div className="notice notice-error">{deleteError}<button onClick={() => setDeleteError('')} type="button" aria-label="إغلاق"><X size={15} /></button></div>}
      {booksQuery.isLoading ? <div className="admin-list">{Array.from({ length: 4 }, (_, i) => <div className="admin-row-skeleton" key={i} />)}</div> : booksQuery.isError ? <QueryError retry={() => void booksQuery.refetch()} message="تعذّر جلب قائمة الكتب." /> : adminBooks.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>الكتاب</th><th>الفن</th><th>الأبواب</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{adminBooks.map(book => <tr key={book.id}><td><div className="admin-book-cell"><Cover book={book} compact /><span><strong className="font-amiri">{book.title}</strong><small>{book.author}</small></span></div></td><td>{book.category}</td><td>{book.sectionCount}</td><td><span className={`status-badge ${book.status}`}>{book.status === 'published' ? 'منشور' : 'مسودة'}</span></td><td><div className="table-actions"><button type="button" onClick={() => setEditor(book)}>تحرير</button><button type="button" className="delete-action" disabled={remove.isPending} onClick={() => deleteBook(book)}>حذف</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="لا توجد كتب في الفهرس بعد" detail="أضف الكتاب الأول مع بياناته وأبوابه." action={<button type="button" className="primary-button" onClick={() => setEditor(null)}><Plus size={16} /> إضافة كتاب</button>} />}
    </section>
  </main>{editor !== false && <BookEditor key={editor ? editor.id : 'new'} book={editor} busy={create.isPending || update.isPending} onClose={() => setEditor(false)} onSubmit={submit} />}</PageFrame>;
}

function BookEditor({ book, busy, onClose, onSubmit }: { book: Book | null; busy: boolean; onClose: () => void; onSubmit: (payload: BookInput | BookUpdate, book: Book | null) => void }) {
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [description, setDescription] = useState(book?.description ?? '');
  const [category, setCategory] = useState(book?.category ?? '');
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl ?? '');
  const [readerUrl, setReaderUrl] = useState(book?.readerUrl ?? '');
  const [downloadUrl, setDownloadUrl] = useState(book?.downloadUrl ?? '');
  const [publishedYear, setPublishedYear] = useState(book?.publishedYear?.toString() ?? '');
  const [status, setStatus] = useState<BookInput['status']>(book?.status ?? 'draft');
  const [featured, setFeatured] = useState(book?.featured ?? false);
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const sectionsInitialized = useRef(false);
  const detailQuery = useGetBook(book?.id ?? 0, { query: { queryKey: getGetBookQueryKey(book?.id ?? 0), enabled: Boolean(book?.id) } });
  useEffect(() => {
    if (book && detailQuery.data && !sectionsInitialized.current) {
      sectionsInitialized.current = true;
      setSections(detailQuery.data.sections.map(section => ({ title: section.title, description: section.description ?? '', pageNumber: section.pageNumber?.toString() ?? '' })));
    }
  }, [book, detailQuery.data]);
  const changeSection = (index: number, key: keyof SectionDraft, value: string) => setSections(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const sectionInputs: BookSectionInput[] = sections.filter(section => section.title.trim()).map(section => ({ title: section.title.trim(), description: section.description.trim() || null, pageNumber: section.pageNumber ? Number(section.pageNumber) : null }));
    const payload: BookInput = {
      title: title.trim(), author: author.trim(), description: description.trim(), category: category.trim(),
      coverUrl: coverUrl.trim() || null, readerUrl: readerUrl.trim() || null, downloadUrl: downloadUrl.trim() || null,
      publishedYear: publishedYear ? Number(publishedYear) : null, featured, status, sections: sectionInputs,
    };
    onSubmit(payload, book);
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="editor-modal surface" role="dialog" aria-modal="true" aria-labelledby="editor-title">
    <div className="editor-header"><div><span className="eyebrow">بيانات المكتبة</span><h2 id="editor-title" className="font-amiri">{book ? 'تحرير الكتاب' : 'إضافة كتاب جديد'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button></div>
    {book && detailQuery.isLoading ? <div className="editor-loading"><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line short" /></div> : <form className="editor-form" onSubmit={handleSubmit}>
      <div className="editor-fields"><label>عنوان الكتاب<input required value={title} onChange={e => setTitle(e.target.value)} /></label><label>المؤلف<input required value={author} onChange={e => setAuthor(e.target.value)} /></label><label>الفن / التصنيف<input required value={category} onChange={e => setCategory(e.target.value)} /></label><label>سنة النشر<input type="number" min="1" value={publishedYear} onChange={e => setPublishedYear(e.target.value)} /></label><label className="field-wide">وصف الكتاب<textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} /></label><label className="field-wide">رابط الغلاف<input type="url" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} dir="ltr" placeholder="https://..." /></label><label className="field-wide">رابط القارئ<input type="url" value={readerUrl} onChange={e => setReaderUrl(e.target.value)} dir="ltr" placeholder="https://..." /></label><label className="field-wide">رابط التحميل<input type="url" value={downloadUrl} onChange={e => setDownloadUrl(e.target.value)} dir="ltr" placeholder="https://..." /></label><label>حالة النشر<select value={status} onChange={e => setStatus(e.target.value as BookInput['status'])}><option value="draft">مسودة</option><option value="published">منشور</option></select></label><label className="check-label"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> كتاب مميز</label></div>
      <div className="section-editor"><div className="section-editor-head"><div><strong className="font-amiri">فهرس الأبواب</strong><small>أضف عناوين الفصول وأرقام صفحاتها.</small></div><button type="button" className="quiet-button" onClick={() => setSections(current => [...current, { title: '', description: '', pageNumber: '' }])}><Plus size={15} /> إضافة باب</button></div>
        {sections.map((section, index) => <div className="section-draft" key={index}><span className="section-draft-number">{String(index + 1).padStart(2, '0')}</span><input aria-label={`عنوان الباب ${index + 1}`} placeholder="عنوان الباب" value={section.title} onChange={e => changeSection(index, 'title', e.target.value)} /><input aria-label={`الوصف ${index + 1}`} placeholder="وصف مختصر (اختياري)" value={section.description} onChange={e => changeSection(index, 'description', e.target.value)} /><input aria-label={`رقم الصفحة ${index + 1}`} type="number" min="1" placeholder="الصفحة" value={section.pageNumber} onChange={e => changeSection(index, 'pageNumber', e.target.value)} /><button type="button" className="remove-section" aria-label="حذف الباب" onClick={() => setSections(current => current.filter((_, i) => i !== index))}><X size={16} /></button></div>)}
        {!sections.length && <small className="empty-sections">لم يُضف فهرس بعد.</small>}
      </div>
      {detailQuery.isError && <p className="form-error">تعذّر تحميل أبواب الكتاب. أعد فتح النموذج للمحاولة.</p>}
      <div className="editor-actions"><button type="button" className="outline-button" onClick={onClose}>إلغاء</button><button type="submit" className="primary-button" disabled={busy || (book !== null && (detailQuery.isLoading || detailQuery.isError))}>{busy ? 'جارٍ الحفظ...' : <><Check size={16} /> {book ? 'حفظ التعديلات' : 'إضافة إلى المكتبة'}</>}</button></div>
    </form>}
  </section></div>;
}

function HomeRedirect() { return <><Show when="signed-out"><Home /></Show><Show when="signed-in"><Home /></Show></>; }
function SignInPage() { return <div className="auth-page" dir="rtl"><div className="auth-brand"><Brand /><p>أهلاً بعودتك إلى رفوف عَمْد.</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>; }
function SignUpPage() { return <div className="auth-page" dir="rtl"><div className="auth-brand"><Brand /><p>ابدأ رحلتك في طلب العلم.</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>; }

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function RouterContent() {
  const [, setLocation] = useLocation();
  return <RoutedErrorBoundary><ClerkCacheInvalidator /><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/catalog" component={Catalog} />
    <Route path="/books/:bookId" component={BookDetailPage} />
    <Route path="/read/:bookId" component={Reader} />
    <Route path="/my-library"><Show when="signed-in"><LibraryPage /></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></Route>
    <Route path="/admin" component={AdminPage} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'مرحباً بعودتك', subtitle: 'سجّل الدخول إلى مكتبتك' } }, signUp: { start: { title: 'أنشئ حسابك', subtitle: 'ابدأ رحلتك في طلب العلم' } } }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}
  ><RouterContent /></ClerkProvider>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><ClerkRoutes /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
