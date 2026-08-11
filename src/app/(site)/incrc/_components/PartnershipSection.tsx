import { Reveal } from "@/components/ui/Reveal";
import { INCRC } from "../_data/incrc";

/** How the championship came about: the signing, in three photographs. */
export function PartnershipSection() {
  const { partnership } = INCRC;

  return (
    <section id="partnership" className="shell py-16 sm:py-20">
      <Reveal>
        <span className="pill-label">{partnership.kicker}</span>
        <h2 className="headline mt-4 text-[clamp(1.6rem,3.4vw,2.5rem)]">{partnership.title}</h2>
        <p className="body-copy mt-4 max-w-2xl">{partnership.text}</p>
      </Reveal>

      <ul className="mt-9 grid gap-4 sm:grid-cols-3">
        {partnership.shots.map((shot, index) => (
          <Reveal key={shot.image} delay={index * 0.06}>
            <li>
              <figure className="group overflow-hidden rounded-panel border border-line">
                <img
                  src={shot.image}
                  alt={shot.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </figure>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
