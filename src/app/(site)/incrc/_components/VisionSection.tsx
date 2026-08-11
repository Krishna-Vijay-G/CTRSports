import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { INCRC } from "../_data/incrc";

/** What the championship is for, in four cards. */
export function VisionSection() {
  return (
    <section id="vision" className="shell py-16 sm:py-20">
      <SectionHeading label="Our vision" title="A new era of Indian motorsport" />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INCRC.vision.map((item, index) => (
          <Reveal key={item.label} delay={index * 0.06} className="flex">
            <li className="panel-card flex w-full flex-col p-6">
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-ink"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-base font-bold leading-snug text-fg">
                {item.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.description}</p>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
