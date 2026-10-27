import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Treemap from "@/components/space/Treemap.vue";
import { i18n } from "@/i18n";
import type { SpaceEntry } from "@/types/mole";

const GIB = 1024 ** 3;
const entries: SpaceEntry[] = [
  { name: "Home", path: "/Users/ray", size: 129.4 * GIB, is_dir: true, scan_status: "complete" },
  { name: "Applications", path: "/Applications", size: 42.2 * GIB, is_dir: true, scan_status: "complete" },
  { name: "System Library", path: "/Library", size: 2.3 * GIB, is_dir: true, scan_status: "complete" },
];

describe("Treemap", () => {
  const wrapper = mount(Treemap, {
    props: { entries, total: 173.9 * GIB },
    global: { plugins: [i18n] },
  });

  it("gives every tile a real area", () => {
    const tiles = wrapper.findAll(".tile-fill");
    expect(tiles).toHaveLength(entries.length);
    for (const tile of tiles) {
      expect(Number(tile.attributes("width"))).toBeGreaterThan(1);
      expect(Number(tile.attributes("height"))).toBeGreaterThan(1);
    }
  });

  it("keeps the clip rects usable for labels", () => {
    const clips = wrapper.findAll("clipPath rect");
    expect(clips.length).toBeGreaterThan(0);
    for (const clip of clips) {
      expect(Number(clip.attributes("width"))).toBeGreaterThan(0);
    }
  });
});
