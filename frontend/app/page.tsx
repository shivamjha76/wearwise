import Link from "next/link";

const steps = [
  ["01", "Build your profile", "Tell WearWise your preferences, fit, and style direction."],
  ["02", "Add your wardrobe", "Save the pieces you already own in one simple closet."],
  ["03", "Get styled", "Receive a thoughtful outfit and see what could complete it."],
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f7f7f5]">
      <section className="relative border-b border-[#e4e5e7] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#45546a]">Your personal style system</p>
            <h1 className="mt-5 text-5xl font-bold leading-[0.98] tracking-[-0.06em] text-[#111111] sm:text-6xl lg:text-7xl">Make more of<span className="block text-[#596573]">what you own.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600 sm:text-xl">WearWise turns your wardrobe into better outfit ideas and smarter next-purchase recommendations.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/profile" className="inline-flex h-13 items-center justify-center rounded-xl bg-[#171717] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-black">Build My Wardrobe <span className="ml-2">→</span></Link>
              <a href="#how-it-works" className="inline-flex h-13 items-center justify-center rounded-xl border border-[#d4d6da] bg-white px-6 py-3.5 text-base font-semibold text-black transition hover:bg-gray-50">See how it works</a>
            </div>
            <p className="mt-5 text-sm text-gray-500">Built around the wardrobe you already have.</p>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[#e9edf1] blur-3xl" />
            <div className="relative rounded-3xl border border-[#e2e4e7] bg-white p-4 shadow-[0_16px_45px_rgba(27,35,43,0.08)] sm:p-5">
              <div className="flex items-center justify-between border-b border-[#eceef0] pb-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Today&apos;s look</p><p className="mt-1 text-lg font-bold tracking-tight">Easy everyday</p></div>
                <span className="rounded-full bg-[#fff4d7] px-3 py-1.5 text-xs font-bold text-[#67521a]">98% match</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <OutfitPiece label="Top" name="White shirt" tone="bg-[#e9e6dd]" icon="♧" />
                <OutfitPiece label="Bottom" name="Blue jeans" tone="bg-[#dce5ec]" icon="▥" />
                <OutfitPiece label="Footwear" name="Black shoes" tone="bg-[#dcdcdc]" icon="◒" />
              </div>
              <div className="mt-4 rounded-2xl bg-[#f5f6f7] p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">✦</div><div><p className="text-sm font-bold">One smart addition</p><p className="mt-0.5 text-xs leading-5 text-gray-600">A black shirt unlocks 6 more outfit combinations.</p></div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl"><p className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#45546a]">How it works</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-black sm:text-4xl">A more useful way to get dressed.</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, description]) => <article key={number} className="rounded-2xl border border-[#e2e4e7] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)]"><p className="text-sm font-bold tracking-wide text-[#677485]">{number}</p><h3 className="mt-8 text-xl font-bold tracking-tight text-black">{title}</h3><p className="mt-3 leading-7 text-gray-600">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2e4e7] bg-white px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#45546a]">Less guessing, more wearing</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-black sm:text-4xl">Your clothes should work harder for you.</h2></div><div className="grid grid-cols-3 gap-6 text-center sm:gap-10"><Stat value="1" label="Wardrobe" /><Stat value="∞" label="Outfit ideas" /><Stat value="0" label="Guesswork" /></div></div></section>

      <section className="px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-6xl rounded-3xl bg-[#171717] px-6 py-12 text-center text-white sm:px-12 sm:py-16"><p className="text-[13px] font-bold uppercase tracking-[0.18em] text-gray-400">WearWise</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Start with what&apos;s already in your closet.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-gray-300">Build your style profile and let your wardrobe guide the next look.</p><Link href="/profile" className="mt-8 inline-flex rounded-xl bg-white px-6 py-3.5 font-semibold text-black transition hover:bg-gray-100">Get Started <span className="ml-2">→</span></Link></div></section>
    </main>
  );
}

function OutfitPiece({ label, name, tone, icon }: { label: string; name: string; tone: string; icon: string }) {
  return <div className="min-w-0"><div className={`flex aspect-[3/4] items-center justify-center rounded-2xl ${tone} text-4xl text-[#343434]`}>{icon}</div><p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-black">{name}</p></div>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-3xl font-bold tracking-tight text-black sm:text-4xl">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</p></div>;
}
