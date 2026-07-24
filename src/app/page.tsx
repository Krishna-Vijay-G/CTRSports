import { biography } from "@/data/biographyData";
import ScrollProgressBar from "@/components/journey/ScrollProgressBar";
import JourneyMarquee from "@/components/journey/JourneyMarquee";
import JourneyNav from "@/components/journey/JourneyNav";
import ProgressRail from "@/components/journey/ProgressRail";
import ChapterRenderer from "@/components/journey/ChapterRenderer";
import StatsBand from "@/components/journey/StatsBand";
import JourneyFooter from "@/components/journey/JourneyFooter";

export default function JourneyPage() {
  const { chapters } = biography;
  const [hero, ...rest] = chapters;

  return (
    <>
      <ScrollProgressBar />
      <JourneyMarquee text={biography.marquee} />
      <JourneyNav chapters={chapters} />
      <ProgressRail chapters={chapters} />

      <main>
        <ChapterRenderer chapter={hero} />
        <StatsBand />
        {rest.map((chapter) => (
          <ChapterRenderer key={chapter.id} chapter={chapter} />
        ))}
      </main>

      <JourneyFooter />
    </>
  );
}
