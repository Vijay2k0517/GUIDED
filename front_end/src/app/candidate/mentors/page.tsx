/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Mentor Discovery Page
 * ─────────────────────────────────────────────────────────────
 *  Displays the full catalogue of verified mentors with:
 *    • Free-text search (name / role / company)
 *    • Domain, price-range, and experience filters
 *    • Loading skeleton while data is fetched
 *    • Empty-state with a "Clear Filters" action
 *
 *  Mentors are fetched once from the backend (`getMentors`)
 *  and filtered entirely on the client side.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star, Search, SlidersHorizontal, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getMentors } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";
import { useAuth }    from "@/lib/auth-context";


/* ════════════════════════════════════════════════════════════
 *  LOCAL TYPES
 * ════════════════════════════════════════════════════════════ */

interface Mentor {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  experience: number;
  domain: string;
  pricePerSession: number;
  available: boolean;
  rating: number;
  sessions: number;
  bio: string;
}


/* ════════════════════════════════════════════════════════════
 *  MENTOR DISCOVERY PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function MentorDiscoveryPage() {
  const { user } = useAuth();

  /* ── Filter / search state ── */
  const [allMentors, setAllMentors]           = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery]         = useState("");
  const [domainFilter, setDomainFilter]       = useState("all");
  const [priceFilter, setPriceFilter]         = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [isLoading, setIsLoading]             = useState(true);


  /* ────────────────────────────────────────────────────────
   *  Fetch mentor catalogue on mount
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const res = await getMentors();
      if (res?.mentors && res.mentors.length > 0) {
        setAllMentors(res.mentors as Mentor[]);
      }
      setIsLoading(false);
    }
    load();
  }, []);


  /* ────────────────────────────────────────────────────────
   *  Derived values — unique domains + filtered list
   * ──────────────────────────────────────────────────────── */
  const domains = [...new Set(allMentors.map((m) => m.domain))];

  const filtered = allMentors.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDomain =
      domainFilter === "all" || m.domain === domainFilter;

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "under-6000" && m.pricePerSession < 6000) ||
      (priceFilter === "6000-10000" &&
        m.pricePerSession >= 6000 &&
        m.pricePerSession <= 10000) ||
      (priceFilter === "over-10000" && m.pricePerSession > 10000);

    const matchesExperience =
      experienceFilter === "all" ||
      (experienceFilter === "5+"  && m.experience >= 5)  ||
      (experienceFilter === "8+"  && m.experience >= 8)  ||
      (experienceFilter === "10+" && m.experience >= 10);

    return matchesSearch && matchesDomain && matchesPrice && matchesExperience;
  });

  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["candidate"]}>
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Find Your Mentor
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse verified mentors matched to your career goals. Every mentor
            is vetted for real experience.
          </p>
        </div>

        {/* ── Filter toolbar ── */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or company..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Price</SelectItem>
                <SelectItem value="under-6000">Under ₹6,000</SelectItem>
                <SelectItem value="6000-10000">₹6,000 - ₹10,000</SelectItem>
                <SelectItem value="over-10000">₹10,000+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Experience</SelectItem>
                <SelectItem value="5+">5+ years</SelectItem>
                <SelectItem value="8+">8+ years</SelectItem>
                <SelectItem value="10+">10+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6 text-sm text-muted-foreground">
          {isLoading ? "Loading mentors..." : `${filtered.length} mentor${filtered.length !== 1 ? "s" : ""} found`}
        </div>

        {/* ── Mentor grid / skeleton / empty state ── */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-4 h-8 rounded bg-muted" />
                <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <SlidersHorizontal className="h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No mentors found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters to see more results.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setDomainFilter("all");
                setPriceFilter("all");
                setExperienceFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
    </RouteGuard>
  );
}

/* ════════════════════════════════════════════════════════════
 *  MENTOR CARD SUB-COMPONENT
 * ════════════════════════════════════════════════════════════ */

/** Individual mentor card with avatar, bio, stats, and pricing. */
function MentorCard({ mentor }: { mentor: Mentor }) {
  return (
    <div className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary/20">
      {/* ── Header: avatar + name + availability badge ── */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {mentor.avatar}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{mentor.name}</h3>
            {mentor.available ? (
              <Badge
                variant="secondary"
                className="shrink-0 bg-green-50 text-green-700 text-xs"
              >
                Available
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-xs">
                Waitlist
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {mentor.role} at {mentor.company}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {mentor.bio}
      </p>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {mentor.rating}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {mentor.sessions} sessions
        </span>
        <span>{mentor.experience} yrs exp</span>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <div>
          <span className="text-lg font-bold">₹{mentor.pricePerSession.toLocaleString("en-IN")}</span>
          <span className="text-sm text-muted-foreground"> / session</span>
        </div>
        <Button size="sm" asChild>
          <Link href={`/candidate/checkout?mentor=${mentor.id}`}>
            Select Mentor
          </Link>
        </Button>
      </div>
    </div>
  );
}
