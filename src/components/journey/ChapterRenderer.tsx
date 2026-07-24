import type { Chapter } from "@/data/biographyData";
import JourneyHero from "./chapters/JourneyHero";
import CardsChapter from "./chapters/CardsChapter";
import TimelineChapter from "./chapters/TimelineChapter";
import NationalGridChapter from "./chapters/NationalGridChapter";
import HighlightsChapter from "./chapters/HighlightsChapter";
import LadderChapter from "./chapters/LadderChapter";
import AcademyChapter from "./chapters/AcademyChapter";
import ClubChapter from "./chapters/ClubChapter";
import RoadmapChapter from "./chapters/RoadmapChapter";
import UnifiedChapter from "./chapters/UnifiedChapter";
import FinalLapChapter from "./chapters/FinalLapChapter";

/** Maps a chapter's `variant` to its section component. */
export default function ChapterRenderer({ chapter }: { chapter: Chapter }) {
  switch (chapter.variant) {
    case "hero":
      return <JourneyHero chapter={chapter} />;
    case "cards":
      return <CardsChapter chapter={chapter} />;
    case "timeline":
      return <TimelineChapter chapter={chapter} />;
    case "nationalGrid":
      return <NationalGridChapter chapter={chapter} />;
    case "highlights":
      return <HighlightsChapter chapter={chapter} />;
    case "ladder":
      return <LadderChapter chapter={chapter} />;
    case "academy":
      return <AcademyChapter chapter={chapter} />;
    case "club":
      return <ClubChapter chapter={chapter} />;
    case "roadmap":
      return <RoadmapChapter chapter={chapter} />;
    case "unified":
      return <UnifiedChapter chapter={chapter} />;
    case "finalLap":
      return <FinalLapChapter chapter={chapter} />;
    default:
      return null;
  }
}
