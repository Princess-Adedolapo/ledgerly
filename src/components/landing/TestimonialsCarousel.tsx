import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatarUrl: string;
  avatarInitials: string;
  rating: number;
  quote: string;
  highlight: string;
}

const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 't1',
    name: 'Sarah Jenkins',
    role: 'Brand Designer & Strategist',
    company: 'Studio Jenkins',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    avatarInitials: 'SJ',
    rating: 5,
    quote: 'Ledgerly cut my admin time in half and made my client onboarding look 10x more professional. Sending instant payment links right after a kick-off call has been a game-changer.',
    highlight: 'Saved 8 hrs/week',
  },
  {
    id: 't2',
    name: 'David Chen',
    role: 'Full-Stack Developer',
    company: 'ChenTech Consulting',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    avatarInitials: 'DC',
    rating: 5,
    quote: 'Having contacts, active project milestones, and invoices under one roof eliminated the chaos of switching between Notion, Stripe, and email threads. I get paid 3x faster now.',
    highlight: '3x Faster Payments',
  },
  {
    id: 't3',
    name: 'Maya Patel',
    role: 'Content Marketing Lead',
    company: 'Growth Craft Media',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    avatarInitials: 'MP',
    rating: 5,
    quote: "My clients constantly compliment the portal transparency. No more 'what's the status?' emails. Everything they need is live and updated in real-time.",
    highlight: 'Zero Status Emails',
  },
  {
    id: 't4',
    name: 'Alex Rivera',
    role: 'UX/UI Consultant',
    company: 'Rivera Design Co.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    avatarInitials: 'AR',
    rating: 5,
    quote: 'The multi-currency invoicing and automatic FX conversion turned complex international client billing into a single click. Truly indispensable for global freelancers.',
    highlight: 'Global Invoicing',
  },
  {
    id: 't5',
    name: 'Elena Rostova',
    role: 'Operations Lead',
    company: 'Apex Advisory',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    avatarInitials: 'ER',
    rating: 5,
    quote: 'Managing client tags, active deal milestones, and WhatsApp payment reminders in one place boosted our on-time collection rate to 98%.',
    highlight: '98% On-Time Payments',
  },
];

const easeOut = [0.22, 1, 0.36, 1] as const;

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const total = TESTIMONIALS_DATA.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Compute 3 items for rendering in sliding frame
  const visibleTestimonials = [
    TESTIMONIALS_DATA[currentIndex],
    TESTIMONIALS_DATA[(currentIndex + 1) % total],
    TESTIMONIALS_DATA[(currentIndex + 2) % total],
  ];

  return (
    <div
      className="relative max-w-6xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Header / Navigation Controls */}
      <div className="flex items-center justify-between mb-6 px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-950/80 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
            {currentIndex + 1} of {total} Stories
          </span>
          <span className="hidden sm:inline text-xs text-muted font-medium">
            (Auto-playing • Hover to pause)
          </span>
        </div>

        {/* Previous / Next Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous testimonial"
            className="p-2.5 rounded-xl border border-hairline bg-panel hover:bg-white dark:hover:bg-slate-800 text-ink shadow-sm hover:shadow-md transition-all active:scale-95 group"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next testimonial"
            className="p-2.5 rounded-xl border border-hairline bg-panel hover:bg-white dark:hover:bg-slate-800 text-ink shadow-sm hover:shadow-md transition-all active:scale-95 group"
          >
            <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Testimonials Cards Slider Track */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {visibleTestimonials.map((t, idx) => {
          const isLgHidden = idx === 2; // Hide 3rd card on md, show on lg
          const isMdHidden = idx === 1; // Show 1 card on sm, 2 cards on md, 3 on lg

          return (
            <AnimatePresence mode="popLayout" key={`${t.id}-${currentIndex}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.45, ease: easeOut }}
                className={`rounded-3xl border border-hairline bg-panel p-6 sm:p-7 shadow-soft flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-lift group relative overflow-hidden ${
                  isLgHidden ? 'hidden lg:flex' : isMdHidden ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Subtle top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500/0 via-purple-500/40 to-violet-500/0 group-hover:via-purple-500 transition-all duration-500" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-accent-soft text-accent border border-accent/20">
                      {t.highlight}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-ink-soft dark:text-slate-200 font-normal italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                {/* Profile Photo & Author Info */}
                <div className="mt-6 pt-5 border-t border-hairline flex items-center gap-3.5">
                  {!imageErrors[t.id] ? (
                    <img
                      src={t.avatarUrl}
                      alt={t.name}
                      onError={() => handleImageError(t.id)}
                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-200 dark:border-purple-800 shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white font-bold text-sm shadow-md">
                      {t.avatarInitials}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {t.name}
                    </h4>
                    <p className="text-xs text-muted font-medium">
                      {t.role} • <span className="text-slate-500 dark:text-slate-400">{t.company}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>

      {/* Indicator Dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {TESTIMONIALS_DATA.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to testimonial ${idx + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              currentIndex === idx
                ? 'w-8 bg-purple-600 dark:bg-purple-400 shadow-sm'
                : 'w-2.5 bg-purple-200 dark:bg-purple-900/60 hover:bg-purple-300 dark:hover:bg-purple-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
