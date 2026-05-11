import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, BadgeCheck } from "lucide-react";
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type Review = {
  id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  church_name: string;
  city: string | null;
  country: string | null;
  rating: number;
  text: string;
  language: string;
};

type Fallback = {
  reviewer_name: string;
  reviewer_role: string | null;
  church_name: string;
  city: string | null;
  country: string | null;
  rating: number;
  text: string;
  isFallback?: boolean;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

function ReviewCard({ r }: { r: Review | Fallback }) {
  const subtitle = [r.reviewer_role, r.church_name].filter(Boolean).join(" · ");
  const location = [r.city, r.country].filter(Boolean).join(", ");
  const isVerified = !(r as Fallback).isFallback;
  return (
    <Card className="relative overflow-hidden border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-xl h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
      <CardContent className="pt-7 sm:pt-8 px-5 sm:px-6 h-full flex flex-col">
        <div className="flex justify-center mb-4">
          {[...Array(r.rating)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6 italic text-center leading-relaxed flex-1">
          "{r.text}"
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
            {initials(r.reviewer_name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate flex items-center gap-1">
              {r.reviewer_name}
              {isVerified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
            {location && (
              <p className="text-[11px] text-muted-foreground/80 truncate">{location}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TestimonialsSection() {
  const { t, language } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("client_reviews")
        .select("id, reviewer_name, reviewer_role, church_name, city, country, rating, text, language")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(24);
      if (!cancelled && data) setReviews(data as Review[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo<(Review | Fallback)[]>(() => {
    if (reviews.length === 0) {
      return [
        {
          reviewer_name: t("commercial.testimonial1Name"),
          reviewer_role: null,
          church_name: t("commercial.testimonial1Church"),
          city: null, country: null, rating: 5,
          text: t("commercial.testimonial1Text"),
          isFallback: true,
        },
        {
          reviewer_name: t("commercial.testimonial2Name"),
          reviewer_role: null,
          church_name: t("commercial.testimonial2Church"),
          city: null, country: null, rating: 5,
          text: t("commercial.testimonial2Text"),
          isFallback: true,
        },
        {
          reviewer_name: t("commercial.testimonial3Name"),
          reviewer_role: null,
          church_name: t("commercial.testimonial3Church"),
          city: null, country: null, rating: 5,
          text: t("commercial.testimonial3Text"),
          isFallback: true,
        },
      ];
    }
    // Prefer current-language reviews first, then fill with others
    const sameLang = reviews.filter((r) => r.language === language);
    const others = reviews.filter((r) => r.language !== language);
    return [...sameLang, ...others];
  }, [reviews, language, t]);

  const useCarousel = items.length > 6;

  return (
    <section id="testimonials" className="py-16 sm:py-20 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <Badge className="mb-4 px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary/10 text-secondary border-secondary/20 text-xs sm:text-sm">
            <Heart className="w-3 h-3 mr-2" />
            {t("commercial.testimonialsBadge")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            {t("commercial.testimonialsTitle")}
          </h2>
        </div>

        {useCarousel ? (
          <Carousel
            opts={{ align: "start", loop: true }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]}
            className="max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-4">
              {items.map((r, i) => (
                <CarouselItem
                  key={(r as Review).id ?? `fb-${i}`}
                  className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                >
                  <div className="h-full p-1">
                    <ReviewCard r={r} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {items.map((r, i) => (
              <ReviewCard key={(r as Review).id ?? `fb-${i}`} r={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
