import { CHANGELOG_DATA } from "../data/changelogData";
import type { FetchEntry } from "../types";

export default function useChangelogData(): FetchEntry[] {
  return CHANGELOG_DATA as FetchEntry[];
}
