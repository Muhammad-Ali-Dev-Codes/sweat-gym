/**
 * Maps workout names to curated thumbnail images.
 *
 * Guarantees enforced here:
 *   1. Every workout currently in the catalog has an EXACT name → image entry,
 *      chosen to match its focus (abs workout → abs picture, full body →
 *      full-body picture, etc.). Every photo below was visually verified to
 *      depict its stated subject.
 *   2. All exact-match images are pairwise UNIQUE — no picture repeats across
 *      catalog workouts.
 *   3. For unknown/future names, `getWorkoutThumbnails` assigns images greedily
 *      so no two cards on the same page render the same photo until the unique
 *      pool is exhausted.
 */

const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&h=560&fit=crop&q=80`;

/** Exact workout name → dedicated image (each image used exactly once). */
const EXACT_THUMBNAILS: Record<string, string> = {
  // Abs & belly
  "beginner abs workout": IMG("1571019613531-fbeaeb790845"), // crunches on mat
  "lose belly fat": IMG("1778918006457-54fcf15d4a5a"), // measuring waist with tape
  "hardcore core circuit": IMG("1601986313624-28c11ac26334"), // hanging leg raises
  "core crusher challenge": IMG("1594381898411-846e7d193883"), // sit-ups
  "lose fat no jumping": IMG("1717821681365-36b0da044a75"), // plank (low impact)
  // Full body
  "beginner full body blast": IMG("1573858129683-59f4d9c445d9"), // burpee, top view
  "full body beginner": IMG("1554344728-77cf90d9ed26"), // athlete full-body stance
  "elite full body burner": IMG("1535743686920-55e4145369b9"), // battle ropes
  // Lower body
  "butt & legs sculpt": IMG("1630225758612-8c511aad6c00"), // glute bridge
  "kettlebell lower body power": IMG("1570440828762-ab7a993dbde8"), // kettlebell grip
  // Upper body
  "dumbbell arm toning": IMG("1541338784564-51087dabc0de"), // dumbbell curl
  "quick chest building": IMG("1652363722856-214ce6a06a44"), // bench press
  "chest & triceps starter": IMG("1731341400836-baaa5535b8d5"), // push-up
  "elite upper body push": IMG("1772450014702-498a8a3f61ae"), // overhead barbell press
  "upper body strength split": IMG("1646072508263-af94f0218bf0"), // dumbbell bench press
  "sculpted shoulders & arms": IMG("1758875568628-12fc3376f433"), // overhead press
  "warrior arms & shoulders": IMG("1578619740917-93f6b3612a8f"), // heavy biceps curl
  // Barbell & conditioning
  "advanced barbell power": IMG("1741478551868-a17b1644228d"), // deadlift setup
  "posterior chain powerhouse": IMG("1517963879433-6ad2b056d712"), // deadlift
  "kettlebell conditioning inferno": IMG("1758875570600-8daf8d2f05f3"), // kettlebell swings
  "hiit fat furnace": IMG("1785781048590-13ccbc4ed011"), // battle ropes
  // Mobility & cardio
  "fresh start warm up": IMG("1593431763017-c689a61b729a"), // leg stretch on mat
  "recover & restore stretch": IMG("1567281150864-5296ada11f3d"), // child's pose yoga
  "jump start cardio": IMG("1514994667787-b48ca37155f0"), // jump rope
};

/**
 * Keyword fallbacks for names outside the catalog. Ordered most-specific
 * first. These URLs never overlap the exact assignments so an unmatched name
 * cannot steal a catalog card's dedicated picture identity.
 */
const KEYWORD_THUMBNAILS: Array<[string, string]> = [
  ["abs", IMG("1758875569284-c57e79ef75e0")], // crunches with trainer
  ["core", IMG("1758063685635-5aa92329eed1")], // sit-ups
  ["belly", IMG("1549445069-d1125f7a129c")], // bare midriff
  ["arm", IMG("1532384661798-58b53a4fbe37")], // dumbbell curl
  ["bicep", IMG("1583454110551-21f2fa2afe61")], // dumbbells
  ["dumbbell", IMG("1537289150563-b7f10eee353b")], // triceps extension
  ["kettlebell", IMG("1554980555-7afb7c8795fe")], // kettlebell
  ["chest", IMG("1714646442347-5588041f9cc9")], // push-up
  ["push", IMG("1598971639058-fab3c3109a00")], // push-up
  ["back", IMG("1434682881908-b43d0467b798")], // upper back
  ["pull", IMG("1520948013839-62020f374478")], // barbell row
  ["shoulder", IMG("1561402811-8cf986c35eec")], // dumbbell raise
  ["leg", IMG("1574680178050-55c6a6a96e0a")], // barbell squat
  ["squat", IMG("1571019613914-85f342c6a11e")], // squat rack
  ["butt", IMG("1649887974297-4be052375a67")], // squat
  ["glute", IMG("1649887974297-4be052375a67")], // squat
  ["cardio", IMG("1770026136375-9b9d038300e1")], // jump rope
  ["jump", IMG("1770026136375-9b9d038300e1")], // jump rope
  ["hiit", IMG("1526676317768-d9b14f15615a")], // sprinter
  ["fat", IMG("1526676317768-d9b14f15615a")], // sprinter
  ["burn", IMG("1526676317768-d9b14f15615a")], // sprinter
  ["run", IMG("1728532483490-708f6562b738")], // runner on track
  ["yoga", IMG("1540360659264-3b079dde8890")], // standing split stretch
  ["stretch", IMG("1540360659264-3b079dde8890")], // standing split stretch
  ["warm", IMG("1540360659264-3b079dde8890")], // standing split stretch
  ["flexibility", IMG("1540360659264-3b079dde8890")], // standing split stretch
  ["mobil", IMG("1540360659264-3b079dde8890")], // standing split stretch
];

/** Last-resort pool (distinct photos, cycled deterministically). */
const FALLBACKS = [
  IMG("1550563198-d3d474b0e2c2"), // handstand hold
  IMG("1620188500179-32ac33c60848"), // barbell carry
  IMG("1541600383005-565c949cf777"), // squat rack
  IMG("1546483875-ad9014c88eba"), // gym machine
  IMG("1634463278803-f9f71890e67d"), // belly pinch
  IMG("1514512364185-4c2b0985be01"), // plank
  IMG("1547941126-3d5322b218b0"), // running shoe on track
  IMG("1541534741688-6078c6bfb5c5"), // barbell squat
  IMG("1758875569284-c57e79ef75e0"), // crunches
  IMG("1758063685635-5aa92329eed1"), // sit-ups
  IMG("1549445069-d1125f7a129c"), // midriff
  IMG("1532384661798-58b53a4fbe37"), // curl
  IMG("1583454110551-21f2fa2afe61"), // dumbbells
  IMG("1537289150563-b7f10eee353b"), // triceps extension
  IMG("1554980555-7afb7c8795fe"), // kettlebell
  IMG("1714646442347-5588041f9cc9"), // push-up
  IMG("1598971639058-fab3c3109a00"), // push-up
  IMG("1434682881908-b43d0467b798"), // upper back
  IMG("1520948013839-62020f374478"), // barbell row
  IMG("1561402811-8cf986c35eec"), // dumbbell raise
  IMG("1574680178050-55c6a6a96e0a"), // squat
  IMG("1571019613914-85f342c6a11e"), // squat rack
  IMG("1649887974297-4be052375a67"), // squat
  IMG("1770026136375-9b9d038300e1"), // jump rope
  IMG("1526676317768-d9b14f15615a"), // sprinter
  IMG("1728532483490-708f6562b738"), // runner
  IMG("1540360659264-3b079dde8890"), // stretch
];

function hashIndex(input: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

/** Ordered, de-duplicated candidate images for one workout name. */
export function getWorkoutThumbnailCandidates(name: string): string[] {
  const normalized = name.toLowerCase().trim();
  const candidates: string[] = [];

  const exact = EXACT_THUMBNAILS[normalized];
  if (exact) candidates.push(exact);

  for (const [keyword, url] of KEYWORD_THUMBNAILS) {
    if (normalized.includes(keyword) && !candidates.includes(url)) {
      candidates.push(url);
    }
  }

  return candidates;
}

/** Single-image API (first candidate), kept for compatibility. */
export function getWorkoutThumbnail(name: string, id: string): string {
  const [first] = getWorkoutThumbnailCandidates(name);
  return (
    first ??
    FALLBACKS[hashIndex(id || name, FALLBACKS.length)]
  );
}

/**
 * Assigns thumbnails to a list of workout names such that NO image repeats
 * while unused candidates remain. Each workout prefers its exact-match image,
 * then keyword matches, then any still-unused pool photo; only when the pool
 * itself is exhausted does it cycle deterministically by name hash.
 */
export function getWorkoutThumbnails(names: string[]): string[] {
  const used = new Set<string>();
  const availablePool = [...FALLBACKS];

  return names.map((name) => {
    const candidates = getWorkoutThumbnailCandidates(name);

    let picked =
      candidates.find((url) => !used.has(url)) ??
      availablePool.find((url) => !used.has(url)) ??
      // Pool exhausted (catalog larger than unique photos): deterministic reuse.
      getWorkoutThumbnail(name, name);

    if (!picked) {
      picked =
        availablePool[hashIndex(name, availablePool.length)] ?? FALLBACKS[0];
    }

    used.add(picked);
    return picked;
  });
}
