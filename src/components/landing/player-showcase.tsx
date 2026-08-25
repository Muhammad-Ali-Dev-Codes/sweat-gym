"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Check, ChevronRight, Flame, Play, Timer, Zap } from "lucide-react";

const POINTS = [
  "Automatic set and rest sequencing",
  "Cinematic full-screen exercise view",
  "Up-next preview so you're never surprised",
  "One-tap completion with instant stats",
];

const floatSlow = {
  y: [0, -10, 0],
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
};
const floatFast = {
  y: [0, -8, 0],
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const, delay: 0.6 },
};

export function PlayerShowcase() {
  return (
    <section
      aria-label="Workout player"
      className="titan-hero relative overflow-hidden"
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-[30rem] rounded-full bg-orange-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-24 size-[28rem] rounded-full bg-energy/10 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* Copy */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold uppercase tracking-[0.3em] text-energy"
          >
            The player
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl"
          >
            Press play.
            <br />
            <span className="text-zinc-400">We handle the rest.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mt-6 max-w-md text-base leading-relaxed text-zinc-400"
          >
            Sets, reps, and rest are sequenced automatically. A big rest timer
            keeps you honest — and finishing updates your streak, calories,
            and reports instantly.
          </motion.p>

          <ul className="mt-9 space-y-4">
            {POINTS.map((point, i) => (
              <motion.li
                key={point}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.22 + i * 0.07 }}
                className="flex items-center gap-3.5 text-sm font-semibold text-zinc-200"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Check
                    className="size-3.5 text-energy"
                    strokeWidth={3}
                    aria-hidden
                  />
                </span>
                {point}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Mockup stage */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-sm"
        >
          {/* Glow behind phone */}
          <div
            aria-hidden
            className="absolute inset-x-8 -inset-y-6 rounded-[3rem] bg-gradient-to-b from-white/12 to-transparent blur-2xl"
          />

          {/* Phone frame */}
          <div className="relative rounded-[2.2rem] border border-white/15 bg-black/60 p-2.5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[1.7rem] bg-[#101010]">
              {/* App header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Exercise 3 of 8
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold tabular-nums text-zinc-300">
                  <Flame className="size-3 text-energy" aria-hidden />
                  128 kcal
                </span>
              </div>

              {/* Progress */}
              <div className="px-5">
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: "12%" }}
                    whileInView={{ width: "38%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, delay: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-energy to-amber-300"
                  />
                </div>
              </div>

              {/* Media */}
              <div className="relative mx-5 mt-4 aspect-[16/10] overflow-hidden rounded-2xl">
                <Image
                  src="/images/player-pushups.jpg"
                  alt="Athlete performing push-ups"
                  fill
                  sizes="(max-width: 1024px) 90vw, 380px"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                />
                <motion.span
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-1/2 left-1/2 grid size-13 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-2xl backdrop-blur"
                >
                  <Play className="ml-0.5 size-5 fill-black text-black" aria-hidden />
                </motion.span>
                <span className="absolute bottom-2.5 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  Set 2 of 4
                </span>
              </div>

              {/* Title + tiles */}
              <div className="px-5 pt-4 pb-5">
                <h3 className="text-xl font-extrabold text-white">Push-Ups</h3>

                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-white/8 bg-white/5 p-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                      Reps
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-white">
                      14
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/5 p-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                      Rest
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-white">
                      45<span className="ml-0.5 text-xs text-zinc-500">s</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-full bg-white p-1 pl-5">
                  <span className="text-[13px] font-extrabold text-black">
                    Complete Set
                  </span>
                  <span className="grid size-9 place-items-center rounded-full bg-black">
                    <ChevronRight className="size-4.5 text-white" aria-hidden />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating chip — rest timer */}
          <motion.div
            animate={floatSlow}
            className="absolute -top-7 -right-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-[#161616]/95 px-4 py-3 shadow-2xl backdrop-blur sm:-right-10"
          >
            <span className="relative grid size-11 place-items-center">
              <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
                <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <motion.circle
                  cx="22"
                  cy="22"
                  r="19"
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={119.4}
                  strokeDashoffset="30"
                  animate={{ strokeDashoffset: [30, 90, 30] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </svg>
              <Timer className="size-4.5 text-energy" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-extrabold tabular-nums text-white">0:45</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Rest timer
              </p>
            </div>
          </motion.div>

          {/* Floating chip — up next */}
          <motion.div
            animate={floatFast}
            className="absolute -bottom-7 -left-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-[#161616]/95 px-4 py-3 shadow-2xl backdrop-blur sm:-left-10"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-white/8 text-zinc-200">
              <Zap className="size-4.5" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Up next
              </p>
              <p className="text-sm font-extrabold text-white">Bodyweight Squats</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
